import { TenantDbService } from '@/common/services';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  let service: TenantsService;

  const mockTenantRepo = {
    findOneBy: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockTenantDb = {
    createTenantSchema: jest.fn(),
    copyContentTypes: jest.fn(),
    dropTenantSchema: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepo,
        },
        {
          provide: TenantDbService,
          useValue: mockTenantDb,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    const dto = {
      name: 'Acme Corp',
      slug: 'acme-corp',
      locales: ['en'],
      isTemplate: false,
    };

    const expectedSchema = 'tenant_acme_corp';

    it('copies content types from the template when a template tenant exists', async () => {
      const template = {
        id: 't1',
        schemaName: 'tenant_template',
        isTemplate: true,
      } as Tenant;

      // create() calls findOneBy twice:
      //   1st: { slug: dto.slug }   — slug conflict check  → null (no conflict)
      //   2nd: { isTemplate: true } — template lookup      → template
      mockTenantRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(template);

      mockTenantRepo.create.mockImplementation(
        (input: Partial<Tenant>) => input,
      );
      mockTenantRepo.save.mockImplementation((input: Partial<Tenant>) =>
        Promise.resolve(input),
      );
      mockTenantDb.createTenantSchema.mockResolvedValue(undefined);
      mockTenantDb.copyContentTypes.mockResolvedValue(undefined);

      await service.create(dto as any);

      expect(mockTenantDb.createTenantSchema).toHaveBeenCalledWith(
        expectedSchema,
      );
      expect(mockTenantDb.copyContentTypes).toHaveBeenCalledWith(
        'tenant_template',
        expectedSchema,
      );
      expect(mockTenantRepo.save).toHaveBeenCalled();
    });

    it('does NOT copy content types when no template tenant exists', async () => {
      // 1st findOneBy (slug check) → null, 2nd findOneBy (template) → null
      mockTenantRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockTenantRepo.create.mockImplementation(
        (input: Partial<Tenant>) => input,
      );
      mockTenantRepo.save.mockImplementation((input: Partial<Tenant>) =>
        Promise.resolve(input),
      );
      mockTenantDb.createTenantSchema.mockResolvedValue(undefined);

      await service.create(dto as any);

      expect(mockTenantDb.createTenantSchema).toHaveBeenCalledWith(
        expectedSchema,
      );
      expect(mockTenantDb.copyContentTypes).not.toHaveBeenCalled();
      expect(mockTenantRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when the slug already exists', async () => {
      mockTenantRepo.findOneBy.mockResolvedValueOnce({
        id: 'existing',
      } as Tenant);

      await expect(service.create(dto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTenantDb.createTenantSchema).not.toHaveBeenCalled();
    });
  });
});
