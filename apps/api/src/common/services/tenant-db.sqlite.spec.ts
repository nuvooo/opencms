import { ConfigService } from '@nestjs/config';
import { TenantDbService } from './tenant-db.service';

/**
 * End-to-end integration test of the cross-dialect tenant layer against an
 * in-memory SQLite database. Exercises DDL creation, the $n→? / quote / JSON
 * translation, boolean binding and JSON round-tripping.
 */
describe('TenantDbService on SQLite (smoke)', () => {
  let service: TenantDbService;
  const prefix = 'tenant_smoke';

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_DATABASE = ':memory:';
    const config = {
      get: (key: string) =>
        (({ DB_DATABASE: ':memory:' }) as Record<string, string>)[key],
    } as unknown as ConfigService;
    service = new TenantDbService(config);
    await service.onModuleInit();
    await service.createTenantSchema(prefix);
  });

  afterAll(async () => {
    await service.onModuleDestroy();
    delete process.env.DB_TYPE;
    delete process.env.DB_DATABASE;
  });

  it('creates and reads a content type (JSON round-trips to an array)', async () => {
    const id = 'a1111111-1111-1111-1111-111111111111';
    await service.withTenantDb(prefix, (query) =>
      query(
        `INSERT INTO "content_type" (id, name, slug, description, fields) VALUES ($1, $2, $3, $4, $5)`,
        [id, 'Post', 'post', null, JSON.stringify([{ name: 'title' }])],
      ),
    );

    const rows = await service.withTenantDb<any[]>(prefix, (query) =>
      query(`SELECT * FROM "content_type" WHERE id = $1`, [id]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe('post');
    expect(Array.isArray(rows[0].fields)).toBe(true);
    expect(rows[0].fields[0].name).toBe('title');
  });

  it('inserts an entry and queries the JSON title via the ->> accessor', async () => {
    const entryId = 'b2222222-2222-2222-2222-222222222222';
    await service.withTenantDb(prefix, (query) =>
      query(
        `INSERT INTO "entry" (id, content_type_slug, fields, locale, status, locale_group_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entryId,
          'post',
          JSON.stringify({ title: 'Hello' }),
          'en',
          'draft',
          null,
        ],
      ),
    );

    const related = 'c3333333-3333-3333-3333-333333333333';
    await service.withTenantDb(prefix, (query) =>
      query(
        `INSERT INTO "entry" (id, content_type_slug, fields, locale, status, locale_group_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          related,
          'post',
          JSON.stringify({ title: 'World' }),
          'en',
          'draft',
          null,
        ],
      ),
    );

    await service.withTenantDb(prefix, (query) =>
      query(
        `INSERT INTO "relation" (id, entry_id, field_name, related_entry_id, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        ['d4444444-4444-4444-4444-444444444444', entryId, 'links', related, 0],
      ),
    );

    const rows = await service.withTenantDb<any[]>(prefix, (query) =>
      query(
        `SELECT r.related_entry_id, e.fields->>'title' AS display
         FROM "relation" r
         JOIN "entry" e ON e.id = r.related_entry_id
         WHERE r.entry_id = $1 AND r.field_name = $2
         ORDER BY r.sort_order`,
        [entryId, 'links'],
      ),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].display).toBe('World');
  });

  it('handles boolean params on a default locale (seeded en) plus a new one', async () => {
    const seeded = await service.withTenantDb<any[]>(prefix, (query) =>
      query(`SELECT * FROM "tenant_locale" WHERE code = $1`, ['en']),
    );
    expect(seeded).toHaveLength(1);

    await service.withTenantDb(prefix, (query) =>
      query(
        `INSERT INTO "tenant_locale" (id, code, name, is_default) VALUES ($1, $2, $3, $4)`,
        ['e5555555-5555-5555-5555-555555555555', 'de', 'Deutsch', false],
      ),
    );

    const all = await service.withTenantDb<any[]>(prefix, (query) =>
      query(`SELECT * FROM "tenant_locale" ORDER BY code`),
    );
    expect(all.map((l) => l.code)).toEqual(['de', 'en']);
  });
});
