import { TenantDbService } from '@/common/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContentTypeDto } from './dto/create-content-type.dto';
import { UpdateContentTypeDto } from './dto/update-content-type.dto';

@Injectable()
export class ContentTypesService {
  constructor(private tenantDb: TenantDbService) {}

  async create(schemaName: string, dto: CreateContentTypeDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');

    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `INSERT INTO "content_type" (id, name, slug, description, fields) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
        [
          dto.name,
          slug,
          dto.description || null,
          JSON.stringify(dto.fields || []),
        ],
      ),
    );

    return rows[0];
  }

  async findAll(schemaName: string) {
    return this.tenantDb.withTenantDb<any[]>(schemaName, (query) =>
      query(`SELECT * FROM "content_type" ORDER BY created_at DESC`),
    );
  }

  async findOne(schemaName: string, id: string) {
    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(`SELECT * FROM "content_type" WHERE id = $1`, [id]),
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Content type not found');
    }

    return rows[0];
  }

  async update(schemaName: string, id: string, dto: UpdateContentTypeDto) {
    await this.findOne(schemaName, id);

    const entries = Object.entries(dto).filter(([_, v]) => v !== undefined);

    if (entries.length === 0) {
      return this.findOne(schemaName, id);
    }

    const setClauses = entries.map(([key], i) => {
      if (key === 'fields') return `"fields" = $${i + 1}`;
      return `"${key}" = $${i + 1}`;
    });

    const values = entries.map(([key, v]) => {
      if (key === 'fields' && v) return JSON.stringify(v);
      return v;
    });

    setClauses.push(`"updated_at" = now()`);

    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `UPDATE "content_type" SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING *`,
        [...values, id],
      ),
    );

    return rows[0];
  }

  async remove(schemaName: string, id: string) {
    await this.findOne(schemaName, id);

    await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(`DELETE FROM "content_type" WHERE id = $1`, [id]),
    );
  }
}
