import { Tenant } from '@/tenants/tenant.entity';
import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { firstValueFrom, of } from 'rxjs';
import { Repository } from 'typeorm';
import { TenantInterceptor } from './tenant.interceptor';

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;
  let tenantRepo: jest.Mocked<Pick<Repository<Tenant>, 'findOneBy'>>;

  const buildContext = (headers: Record<string, string>) => {
    const request: any = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  const next: CallHandler = { handle: jest.fn(() => of('handled')) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantInterceptor,
        {
          provide: getRepositoryToken(Tenant),
          useValue: { findOneBy: jest.fn() },
        },
      ],
    }).compile();

    interceptor = module.get(TenantInterceptor);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    (next.handle as jest.Mock).mockClear();
  });

  it('throws when x-tenant-id header is missing', async () => {
    const { context } = buildContext({});
    await expect(interceptor.intercept(context, next)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('throws when the tenant does not exist', async () => {
    tenantRepo.findOneBy.mockResolvedValue(null);
    const { context } = buildContext({ 'x-tenant-id': 'unknown-id' });
    await expect(interceptor.intercept(context, next)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('resolves the tenant and attaches the full entity to the request', async () => {
    const tenant = {
      id: 'tenant-1',
      slug: 'acme',
      schemaName: 'tenant_acme',
    } as Tenant;
    tenantRepo.findOneBy.mockResolvedValue(tenant);
    const { context, request } = buildContext({ 'x-tenant-id': 'tenant-1' });

    const result$ = await interceptor.intercept(context, next);
    await expect(firstValueFrom(result$)).resolves.toBe('handled');

    expect(tenantRepo.findOneBy).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(request.tenant).toBe(tenant);
    expect(next.handle).toHaveBeenCalledTimes(1);
  });
});
