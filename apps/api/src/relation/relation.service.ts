import { TenantDbService } from '@/common/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RelationService {
  constructor(private tenantDb: TenantDbService) {}

  async setRelations(
    schemaName: string,
    entryId: string,
    fieldName: string,
    relatedEntryIds: string[],
  ) {
    await this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 AND field_name = $2`,
        [entryId, fieldName],
      );
      for (let i = 0; i < relatedEntryIds.length; i++) {
        await query(
          `INSERT INTO "relation" (entry_id, field_name, related_entry_id, sort_order) VALUES ($1, $2, $3, $4)`,
          [entryId, fieldName, relatedEntryIds[i], i],
        );
      }
    });
  }

  async getRelations(schemaName: string, entryId: string, fieldName: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      const rows = await query(
        `SELECT r.related_entry_id, r.sort_order, e.fields->>'title' AS display
         FROM "relation" r
         JOIN "entry" e ON e.id = r.related_entry_id
         WHERE r.entry_id = $1 AND r.field_name = $2
         ORDER BY r.sort_order`,
        [entryId, fieldName],
      );
      return rows;
    });
  }

  async getRelatedEntries(schemaName: string, entryId: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      const rows = await query(
        `SELECT r.entry_id, r.field_name, e.content_type_slug, e.fields->>'title' AS display
         FROM "relation" r
         JOIN "entry" e ON e.id = r.entry_id
         WHERE r.related_entry_id = $1
         ORDER BY r.field_name, r.sort_order`,
        [entryId],
      );
      return rows;
    });
  }

  async deleteEntryRelations(schemaName: string, entryId: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 OR related_entry_id = $2`,
        [entryId, entryId],
      );
    });
  }
}
