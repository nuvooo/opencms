import { TenantDbService } from '@/common/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';

@Injectable()
export class LocaleService {
  constructor(private tenantDb: TenantDbService) {}

  async create(schemaName: string, dto: CreateLocaleDto) {
    if (dto.is_default) {
      await this.tenantDb.withTenantDb(schemaName, (query) =>
        query(`UPDATE "tenant_locale" SET is_default = false`),
      );
    }

    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `INSERT INTO "tenant_locale" (code, name, is_default) VALUES ($1, $2, $3) RETURNING *`,
        [dto.code, dto.name, dto.is_default || false],
      ),
    );

    return rows[0];
  }

  async findAll(schemaName: string) {
    return this.tenantDb.withTenantDb<any[]>(schemaName, (query) =>
      query(`SELECT * FROM "tenant_locale" ORDER BY is_default DESC, name ASC`),
    );
  }

  async findOne(schemaName: string, id: string) {
    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(`SELECT * FROM "tenant_locale" WHERE id = $1`, [id]),
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Locale not found');
    }

    return rows[0];
  }

  async update(schemaName: string, id: string, dto: UpdateLocaleDto) {
    await this.findOne(schemaName, id);

    if (dto.is_default) {
      await this.tenantDb.withTenantDb(schemaName, (query) =>
        query(`UPDATE "tenant_locale" SET is_default = false`),
      );
    }

    const entries = Object.entries(dto).filter(([_, v]) => v !== undefined);

    if (entries.length === 0) {
      return this.findOne(schemaName, id);
    }

    const setClauses = entries.map(([key], i) => `"${key}" = $${i + 1}`);
    const values = entries.map(([_, v]) => v);

    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `UPDATE "tenant_locale" SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING *`,
        [...values, id],
      ),
    );

    return rows[0];
  }

  async remove(schemaName: string, id: string) {
    const locale = await this.findOne(schemaName, id);

    if (locale.is_default) {
      throw new Error('Cannot delete the default locale');
    }

    await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(`DELETE FROM "tenant_locale" WHERE id = $1`, [id]),
    );
  }
}
