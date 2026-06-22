import { Tenant } from '@/tenants/tenant.entity';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';

/**
 * Resolves the tenant for the current request from the `x-tenant-id` header and
 * attaches the full {@link Tenant} entity to `request.tenant`.
 *
 * Fails closed: a request without a valid tenant header is rejected instead of
 * silently falling back to a shared schema, which would break tenant isolation.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] as string | undefined;

    if (!tenantId) {
      throw new NotFoundException('x-tenant-id header required');
    }

    const tenant = await this.tenantRepo.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    request.tenant = tenant;

    return next.handle();
  }
}
