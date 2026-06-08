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

    const schemaName = `tenant_${dto.slug.replace(/[^a-z0-9]/g, '_')}`;
    await this.tenantDb.createTenantSchema(schemaName);

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
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    await this.tenantDb.dropTenantSchema(tenant.schemaName);
    await this.tenantRepo.remove(tenant);
  }
}
