import { getColumnTypes, getDbType, translateQuery } from './db-types';

describe('getDbType', () => {
  afterEach(() => {
    delete process.env.DB_TYPE;
  });

  it('defaults to postgres', () => {
    delete process.env.DB_TYPE;
    expect(getDbType()).toBe('postgres');
  });

  it('maps mariadb to mysql and better-sqlite3 to sqlite', () => {
    process.env.DB_TYPE = 'mariadb';
    expect(getDbType()).toBe('mysql');
    process.env.DB_TYPE = 'better-sqlite3';
    expect(getDbType()).toBe('sqlite');
  });
});

describe('translateQuery', () => {
  it('leaves postgres statements untouched', () => {
    const sql = `SELECT * FROM "entry" WHERE id = $1`;
    const result = translateQuery(sql, ['x'], 'postgres');
    expect(result.sql).toBe(sql);
    expect(result.params).toEqual(['x']);
  });

  it('converts placeholders, identifiers, json and now() for mysql', () => {
    const result = translateQuery(
      `UPDATE "entry" SET "updated_at" = now() WHERE "id" = $1 AND fields->>'title' = $2`,
      ['id-1', 'Hello'],
      'mysql',
    );
    expect(result.sql).toBe(
      'UPDATE `entry` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = ? AND ' +
        "JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) = ?",
    );
    expect(result.params).toEqual(['id-1', 'Hello']);
  });

  it('uses json_extract and keeps double quotes for sqlite, coercing booleans', () => {
    const result = translateQuery(
      `INSERT INTO "tenant_locale" ("is_default") VALUES ($1)`,
      [false],
      'sqlite',
    );
    expect(result.sql).toBe(
      'INSERT INTO "tenant_locale" ("is_default") VALUES (?)',
    );
    expect(result.params).toEqual([0]);
  });

  it('reorders parameters by placeholder position', () => {
    const result = translateQuery(
      `DELETE FROM "relation" WHERE entry_id = $2 OR related_entry_id = $1`,
      ['a', 'b'],
      'sqlite',
    );
    expect(result.sql).toBe(
      'DELETE FROM "relation" WHERE entry_id = ? OR related_entry_id = ?',
    );
    expect(result.params).toEqual(['b', 'a']);
  });
});

describe('getColumnTypes', () => {
  it('returns dialect-appropriate column types', () => {
    expect(getColumnTypes('postgres').json).toBe('jsonb');
    expect(getColumnTypes('mysql').json).toBe('json');
    expect(getColumnTypes('sqlite').json).toBe('text');
    expect(getColumnTypes('postgres').id).toBe('uuid');
    expect(getColumnTypes('mysql').id).toBe('varchar(36)');
  });
});
