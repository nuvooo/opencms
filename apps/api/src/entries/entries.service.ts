import { TenantDbService } from '@/common/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Injectable()
export class EntriesService {
  constructor(private tenantDb: TenantDbService) {}

  async create(schemaName: string, dto: CreateEntryDto) {
    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `INSERT INTO "entry" (id, content_type_slug, fields, locale, status) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
        [
          dto.content_type_slug,
          JSON.stringify(dto.fields),
          dto.locale || 'en',
          dto.status || 'draft',
        ],
      ),
    );

    return rows[0];
  }

  async findAll(
    schemaName: string,
    queryParams: {
      content_type_slug?: string;
      locale?: string;
      status?: string;
    },
  ) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (queryParams.content_type_slug) {
      conditions.push(`"content_type_slug" = $${paramIndex++}`);
      values.push(queryParams.content_type_slug);
    }

    if (queryParams.locale) {
      conditions.push(`"locale" = $${paramIndex++}`);
      values.push(queryParams.locale);
    }

    if (queryParams.status) {
      conditions.push(`"status" = $${paramIndex++}`);
      values.push(queryParams.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantDb.withTenantDb<any[]>(schemaName, (query) =>
      query(
        `SELECT * FROM "entry" ${whereClause} ORDER BY created_at DESC`,
        values,
      ),
    );
  }

  async findOne(schemaName: string, id: string) {
    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(`SELECT * FROM "entry" WHERE id = $1`, [id]),
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Entry not found');
    }

    return rows[0];
  }

  async update(schemaName: string, id: string, dto: UpdateEntryDto) {
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
      if ((key === 'fields' || typeof v === 'object') && v !== null)
        return JSON.stringify(v);
      return v;
    });

    setClauses.push(`"updated_at" = now()`);

    const rows: any[] = await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `UPDATE "entry" SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING *`,
        [...values, id],
      ),
    );

    return rows[0];
  }

  async remove(schemaName: string, id: string) {
    await this.findOne(schemaName, id);

    await this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 OR related_entry_id = $2`,
        [id, id],
      );
      await query(`DELETE FROM "entry" WHERE id = $3`, [id]);
    });
  }
}
