import { TenantDbService } from '@/common/services';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    private tenantDb: TenantDbService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.tenantRepo.findOneBy({ slug: dto.slug });
    if (existing) throw new ConflictException('Slug already exists');

    const template = await this.tenantRepo.findOneBy({ isTemplate: true });

    if (dto.isTemplate === true) {
      await this.tenantRepo.update({ isTemplate: true }, { isTemplate: false });
    }

    const schemaName = `tenant_${dto.slug.replace(/[^a-z0-9]/g, '_')}`;
    await this.tenantDb.createTenantSchema(schemaName);

    if (template) {
      await this.tenantDb.copyContentTypes(template.schemaName, schemaName);
    }

    const tenant = this.tenantRepo.create({ ...dto, schemaName });
    return this.tenantRepo.save(tenant);
  }

  async findAll() {
    return this.tenantRepo.find();
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepo.findOneBy({ id });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    if (dto.isTemplate === true) {
      return this.tenantRepo.manager.transaction(async (em) => {
        await em.update(Tenant, { isTemplate: true }, { isTemplate: false });
        Object.assign(tenant, dto);
        return em.save(Tenant, tenant);
      });
    }
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    await this.tenantDb.dropTenantSchema(tenant.schemaName);
    await this.tenantRepo.remove(tenant);
  }
}
