import { TenantDbService } from '@/common/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Injectable()
export class EntriesService {
  constructor(private tenantDb: TenantDbService) {}

  async create(schemaName: string, dto: CreateEntryDto) {
    const id = randomUUID();
    await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `INSERT INTO "entry" (id, content_type_slug, fields, locale, status, locale_group_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          dto.content_type_slug,
          JSON.stringify(dto.fields),
          dto.locale || 'en',
          dto.status || 'draft',
          dto.locale_group_id || null,
        ],
      ),
    );

    return this.findOne(schemaName, id);
  }

  async findAll(
    schemaName: string,
    queryParams: {
      content_type_slug?: string;
      locale?: string;
      status?: string;
      locale_group_id?: string;
      limit?: number;
      offset?: number;
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

    if (queryParams.locale_group_id) {
      conditions.push(`"locale_group_id" = $${paramIndex++}`);
      values.push(queryParams.locale_group_id);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Bound the result set so a large tenant can't return its entire entry
    // table on a single list call. Default 50, hard cap 100.
    const limit = Math.min(Math.max(queryParams.limit ?? 50, 1), 100);
    const offset = Math.max(queryParams.offset ?? 0, 0);
    const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    return this.tenantDb.withTenantDb<any[]>(schemaName, (query) =>
      query(
        `SELECT * FROM "entry" ${whereClause} ORDER BY created_at DESC ${limitClause}`,
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

    await this.tenantDb.withTenantDb(schemaName, (query) =>
      query(
        `UPDATE "entry" SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1}`,
        [...values, id],
      ),
    );

    return this.findOne(schemaName, id);
  }

  async remove(schemaName: string, id: string) {
    await this.findOne(schemaName, id);

    await this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 OR related_entry_id = $2`,
        [id, id],
      );
      await query(`DELETE FROM "entry" WHERE id = $1`, [id]);
    });
  }
}
