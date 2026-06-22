/**
 * Cross-database support helpers.
 *
 * The application can run on PostgreSQL, MySQL/MariaDB or SQLite. The choice is
 * driven by the `DB_TYPE` environment variable. Because the per-tenant content
 * layer is written in hand-rolled, PostgreSQL-flavoured SQL, this module
 * centralises the small dialect differences (placeholders, identifier quoting,
 * JSON access and a couple of functions) so the feature services can stay
 * database-agnostic.
 */

export type DbType = 'postgres' | 'mysql' | 'sqlite';

/**
 * Resolves the configured database engine from the environment.
 *
 * Defaults to `postgres` to preserve the original behaviour. `mariadb` is
 * treated as `mysql` and `better-sqlite3` as `sqlite`.
 */
export const getDbType = (): DbType => {
  const value = (process.env.DB_TYPE ?? 'postgres').toLowerCase();
  if (value === 'mysql' || value === 'mariadb') return 'mysql';
  if (value === 'sqlite' || value === 'better-sqlite3') return 'sqlite';
  return 'postgres';
};

/**
 * Physical column types used when creating the per-tenant tables.
 *
 * Each engine gets the closest native equivalent. UUID primary keys are stored
 * as `varchar(36)` outside PostgreSQL since the application always supplies the
 * id (generated via `crypto.randomUUID()`), so no database-side UUID function is
 * required.
 */
export const getColumnTypes = (dbType: DbType) => {
  switch (dbType) {
    case 'mysql':
      return {
        id: 'varchar(36)',
        json: 'json',
        timestamp: 'datetime',
        timestampDefault: 'DEFAULT CURRENT_TIMESTAMP',
        boolean: 'tinyint(1)',
        integer: 'int',
      };
    case 'sqlite':
      return {
        id: 'varchar(36)',
        json: 'text',
        timestamp: 'datetime',
        timestampDefault: 'DEFAULT CURRENT_TIMESTAMP',
        boolean: 'integer',
        integer: 'integer',
      };
    case 'postgres':
    default:
      return {
        id: 'uuid',
        json: 'jsonb',
        timestamp: 'timestamptz',
        timestampDefault: 'DEFAULT now()',
        boolean: 'boolean',
        integer: 'integer',
      };
  }
};

/**
 * Translates a PostgreSQL-flavoured statement (already rewritten to use the
 * tenant's physical table names) into the dialect of the active engine.
 *
 * Handles:
 *  - `$1, $2 …` positional placeholders → `?` (MySQL/SQLite), re-ordering the
 *    bound parameters to match their order of appearance.
 *  - double-quoted identifiers → backticks for MySQL.
 *  - the `column->>'key'` JSON accessor → `JSON_UNQUOTE(JSON_EXTRACT(...))`
 *    (MySQL) / `json_extract(...)` (SQLite).
 *  - `now()` → `CURRENT_TIMESTAMP`.
 *
 * PostgreSQL statements are returned unchanged.
 */
export const translateQuery = (
  sql: string,
  params: unknown[] | undefined,
  dbType: DbType,
): { sql: string; params: unknown[] } => {
  if (dbType === 'postgres') {
    return { sql, params: params ?? [] };
  }

  let translated = sql;

  // JSON accessor: e.fields->>'title'
  translated = translated.replace(
    /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*->>\s*'([^']+)'/g,
    (_match, column: string, key: string) =>
      dbType === 'mysql'
        ? `JSON_UNQUOTE(JSON_EXTRACT(${column}, '$.${key}'))`
        : `json_extract(${column}, '$.${key}')`,
  );

  // now() is PostgreSQL/MySQL only; CURRENT_TIMESTAMP works everywhere.
  translated = translated.replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP');

  // Positional placeholders → ?, preserving evaluation order and reuse.
  let outParams = params ?? [];
  if (params && params.length > 0) {
    const reordered: unknown[] = [];
    translated = translated.replace(/\$(\d+)/g, (_match, index: string) => {
      reordered.push(params[Number(index) - 1]);
      return '?';
    });
    outParams = reordered;
  }

  // MySQL uses backticks for identifiers; the raw SQL only ever double-quotes
  // identifiers (string literals use single quotes), so this is safe.
  if (dbType === 'mysql') {
    translated = translated.replace(/"/g, '`');
  }

  return { sql: translated, params: outParams.map(normalizeParam) };
};

/**
 * Coerces parameter values into types the MySQL/SQLite drivers accept.
 * Booleans become 0/1 (better-sqlite3 rejects booleans) and `undefined`
 * becomes `null`.
 */
const normalizeParam = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
};
