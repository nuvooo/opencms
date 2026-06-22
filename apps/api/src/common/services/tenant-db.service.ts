import {
  DbType,
  buildConnectionOptions,
  getColumnTypes,
  getDbType,
  translateQuery,
} from '@/common/database';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource, DataSourceOptions } from 'typeorm';

const SCHEMA_NAME_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

/**
 * The logical tables that make up a tenant's content store. Each tenant gets a
 * physical table per entry named `<prefix>_<base>` (e.g. `tenant_acme_entry`).
 */
const TENANT_TABLES = [
  'content_type',
  'entry',
  'relation',
  'tenant_locale',
] as const;

/**
 * Manages per-tenant content storage across PostgreSQL, MySQL and SQLite.
 *
 * The original design relied on a PostgreSQL schema per tenant. Since neither
 * MySQL nor SQLite have comparable lightweight schemas, tenants are now isolated
 * by a table-name prefix (the value historically called `schemaName`, e.g.
 * `tenant_acme`). The feature services keep writing PostgreSQL-flavoured SQL;
 * {@link withTenantDb} rewrites the table names to the tenant's physical tables
 * and {@link translateQuery} adapts the statement to the active dialect.
 */
@Injectable()
export class TenantDbService implements OnModuleInit, OnModuleDestroy {
  private dataSource!: DataSource;
  private dbType: DbType = 'postgres';
  private readonly logger = new Logger(TenantDbService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      this.dbType = getDbType();
      this.dataSource = new DataSource({
        ...buildConnectionOptions(this.config),
        synchronize: false,
        logging: false,
      } as DataSourceOptions);
      this.logger.log(`Initializing TenantDb DataSource (${this.dbType})...`);
      await this.dataSource.initialize();
      this.logger.log('TenantDb DataSource initialized');

      await this.ensureExistingTenantTables();
      await this.migrateSharedTables();
    } catch (error) {
      this.logger.error(
        `Failed to initialize TenantDb DataSource: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  /** Quotes an identifier for the active dialect. */
  private qid(name: string): string {
    return this.dbType === 'mysql' ? `\`${name}\`` : `"${name}"`;
  }

  /** Positional placeholder for the active dialect. */
  private ph(index: number): string {
    return this.dbType === 'postgres' ? `$${index}` : '?';
  }

  private get falseLit(): string {
    return this.dbType === 'postgres' ? 'false' : '0';
  }

  private get trueLit(): string {
    return this.dbType === 'postgres' ? 'true' : '1';
  }

  /**
   * Ensures every known tenant's tables exist. Runs on boot and is idempotent
   * (all statements use IF NOT EXISTS), so it doubles as a forward migration for
   * tenants created before a table was added.
   */
  private async ensureExistingTenantTables(): Promise<void> {
    try {
      const tenants: { schema_name: string }[] = await this.dataSource.query(
        `SELECT schema_name FROM ${this.qid('tenant')}`,
      );
      for (const tenant of tenants) {
        await this.createTenantSchema(tenant.schema_name);
      }
      if (tenants.length > 0) {
        this.logger.log(`Ensured tables for ${tenants.length} tenant(s)`);
      }
    } catch {
      this.logger.warn('No tenant table found yet — skipping tenant migration');
    }
  }

  /**
   * Best-effort additive migrations for the shared (non-tenant) tables.
   *
   * Production runs with TypeORM `synchronize: false`, so additive columns must
   * be applied explicitly. The statements are wrapped individually because
   * MySQL/SQLite do not support `ADD COLUMN IF NOT EXISTS`; re-running them on an
   * up-to-date database simply throws and is ignored.
   */
  private async migrateSharedTables(): Promise<void> {
    const types = getColumnTypes(this.dbType);
    const statements = [
      `ALTER TABLE ${this.qid('otp')} ADD COLUMN ${this.qid('email')} varchar(255)`,
      `ALTER TABLE ${this.qid('tenant')} ADD COLUMN ${this.qid('is_template')} ${types.boolean} NOT NULL DEFAULT ${this.falseLit}`,
    ];
    for (const statement of statements) {
      try {
        await this.dataSource.query(statement);
      } catch {
        // Column already exists — nothing to do.
      }
    }
  }

  private validateSchemaName(name: string): void {
    if (!SCHEMA_NAME_REGEX.test(name)) {
      throw new Error(
        `Invalid schema name: "${name}". Must match /^[a-z][a-z0-9_]{0,62}$/`,
      );
    }
  }

  /**
   * Creates (idempotently) the physical tables backing a tenant.
   *
   * Despite the name kept for API compatibility, this no longer creates a
   * database schema; it provisions the tenant's prefixed tables.
   */
  async createTenantSchema(prefix: string): Promise<void> {
    this.validateSchemaName(prefix);
    const types = getColumnTypes(this.dbType);
    const table = (base: string) => this.qid(`${prefix}_${base}`);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${table('content_type')} (
        ${this.qid('id')} ${types.id} PRIMARY KEY,
        ${this.qid('name')} varchar(100) NOT NULL,
        ${this.qid('slug')} varchar(100) NOT NULL UNIQUE,
        ${this.qid('description')} varchar(500),
        ${this.qid('fields')} ${types.json} NOT NULL,
        ${this.qid('created_at')} ${types.timestamp} ${types.timestampDefault} NOT NULL,
        ${this.qid('updated_at')} ${types.timestamp} ${types.timestampDefault} NOT NULL
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${table('entry')} (
        ${this.qid('id')} ${types.id} PRIMARY KEY,
        ${this.qid('content_type_slug')} varchar(100) NOT NULL,
        ${this.qid('fields')} ${types.json} NOT NULL,
        ${this.qid('locale')} varchar(10) NOT NULL DEFAULT 'en',
        ${this.qid('status')} varchar(20) NOT NULL DEFAULT 'draft',
        ${this.qid('published_at')} ${types.timestamp},
        ${this.qid('created_at')} ${types.timestamp} ${types.timestampDefault} NOT NULL,
        ${this.qid('updated_at')} ${types.timestamp} ${types.timestampDefault} NOT NULL,
        ${this.qid('locale_group_id')} ${types.id}
      )
    `);

    await this.createIndexSafely(
      `idx_${prefix}_entry_ct_slug`,
      table('entry'),
      this.qid('content_type_slug'),
    );

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${table('relation')} (
        ${this.qid('id')} ${types.id} PRIMARY KEY,
        ${this.qid('entry_id')} ${types.id} NOT NULL,
        ${this.qid('field_name')} varchar(255) NOT NULL,
        ${this.qid('related_entry_id')} ${types.id} NOT NULL,
        ${this.qid('sort_order')} ${types.integer} DEFAULT 0,
        UNIQUE (${this.qid('entry_id')}, ${this.qid('field_name')}, ${this.qid('related_entry_id')}),
        FOREIGN KEY (${this.qid('entry_id')}) REFERENCES ${table('entry')}(${this.qid('id')}) ON DELETE CASCADE,
        FOREIGN KEY (${this.qid('related_entry_id')}) REFERENCES ${table('entry')}(${this.qid('id')}) ON DELETE CASCADE
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${table('tenant_locale')} (
        ${this.qid('id')} ${types.id} PRIMARY KEY,
        ${this.qid('code')} varchar(10) NOT NULL UNIQUE,
        ${this.qid('name')} varchar(100) NOT NULL,
        ${this.qid('is_default')} ${types.boolean} DEFAULT ${this.falseLit}
      )
    `);

    await this.ensureDefaultLocale(prefix);
  }

  /**
   * MySQL does not support `CREATE INDEX IF NOT EXISTS`, so attempt creation and
   * ignore the "already exists" error to keep the call idempotent everywhere.
   */
  private async createIndexSafely(
    indexName: string,
    table: string,
    column: string,
  ): Promise<void> {
    const ifNotExists = this.dbType === 'mysql' ? '' : 'IF NOT EXISTS ';
    try {
      await this.dataSource.query(
        `CREATE INDEX ${ifNotExists}${this.qid(indexName)} ON ${table} (${column})`,
      );
    } catch {
      // Index already exists.
    }
  }

  /** Inserts the default English locale if the tenant has none. */
  private async ensureDefaultLocale(prefix: string): Promise<void> {
    const table = this.qid(`${prefix}_tenant_locale`);
    const existing: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM ${table} WHERE ${this.qid('code')} = ${this.ph(1)}`,
      ['en'],
    );
    if (existing.length === 0) {
      await this.dataSource.query(
        `INSERT INTO ${table} (${this.qid('id')}, ${this.qid('code')}, ${this.qid('name')}, ${this.qid('is_default')}) VALUES (${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.trueLit})`,
        [randomUUID(), 'en', 'English'],
      );
    }
  }

  /**
   * Copies content type definitions from one tenant to another, skipping slugs
   * that already exist in the target. Re-implemented row-by-row (instead of
   * `INSERT … SELECT … ON CONFLICT`) so it works across all dialects.
   */
  async copyContentTypes(fromPrefix: string, toPrefix: string): Promise<void> {
    this.validateSchemaName(fromPrefix);
    this.validateSchemaName(toPrefix);

    const fromTable = this.qid(`${fromPrefix}_content_type`);
    const toTable = this.qid(`${toPrefix}_content_type`);

    const sources: {
      name: string;
      slug: string;
      description: string | null;
      fields: unknown;
    }[] = await this.dataSource.query(
      `SELECT ${this.qid('name')}, ${this.qid('slug')}, ${this.qid('description')}, ${this.qid('fields')} FROM ${fromTable}`,
    );

    const existing: { slug: string }[] = await this.dataSource.query(
      `SELECT ${this.qid('slug')} FROM ${toTable}`,
    );
    const existingSlugs = new Set(existing.map((row) => row.slug));

    for (const source of sources) {
      if (existingSlugs.has(source.slug)) continue;
      const fields =
        typeof source.fields === 'string'
          ? source.fields
          : JSON.stringify(source.fields ?? []);
      await this.dataSource.query(
        `INSERT INTO ${toTable} (${this.qid('id')}, ${this.qid('name')}, ${this.qid('slug')}, ${this.qid('description')}, ${this.qid('fields')}, ${this.qid('created_at')}, ${this.qid('updated_at')}) VALUES (${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)}, ${this.ph(5)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [randomUUID(), source.name, source.slug, source.description, fields],
      );
    }
  }

  /** Drops all physical tables belonging to a tenant. */
  async dropTenantSchema(prefix: string): Promise<void> {
    this.validateSchemaName(prefix);
    // Drop relation first (it references entry), then the rest.
    for (const base of [...TENANT_TABLES].reverse()) {
      await this.dataSource.query(
        `DROP TABLE IF EXISTS ${this.qid(`${prefix}_${base}`)}`,
      );
    }
  }

  /**
   * Resolves a tenant's prefix from its id, throwing if it does not exist.
   * Exposed so callers (e.g. the GraphQL resolver) don't reach into internals.
   */
  async getSchemaNameByTenantId(tenantId: string): Promise<string> {
    const rows: { schema_name: string }[] = await this.dataSource.query(
      `SELECT schema_name FROM ${this.qid('tenant')} WHERE ${this.qid('id')} = ${this.ph(1)}`,
      [tenantId],
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Tenant not found');
    }
    return rows[0].schema_name;
  }

  /**
   * Runs a callback with a tenant-scoped query function. The callback writes
   * PostgreSQL-flavoured SQL using the logical table names (`"entry"`,
   * `"content_type"`, …); they are rewritten to the tenant's physical tables and
   * translated to the active dialect before execution.
   */
  async withTenantDb<T>(
    prefix: string,
    fn: (query: (sql: string, params?: unknown[]) => Promise<T>) => Promise<T>,
  ): Promise<T> {
    this.validateSchemaName(prefix);
    if (!this.dataSource?.isInitialized) {
      throw new Error('TenantDb DataSource not initialized');
    }
    return fn(async (sql: string, params?: unknown[]) => {
      let rewritten = sql;
      for (const base of TENANT_TABLES) {
        rewritten = rewritten.replaceAll(`"${base}"`, `"${prefix}_${base}"`);
      }
      const { sql: finalSql, params: finalParams } = translateQuery(
        rewritten,
        params,
        this.dbType,
      );
      const result = await this.dataSource.query(finalSql, finalParams);
      return this.parseJsonRows(result) as T;
    });
  }

  /**
   * Outside PostgreSQL the `fields` JSON column may come back as a string;
   * parse it so callers always receive an object/array, matching the original
   * `jsonb` behaviour.
   */
  private parseJsonRows(result: unknown): unknown {
    if (this.dbType === 'postgres' || !Array.isArray(result)) {
      return result;
    }
    return result.map((row) => {
      if (
        row &&
        typeof row === 'object' &&
        typeof (row as { fields?: unknown }).fields === 'string'
      ) {
        try {
          return {
            ...row,
            fields: JSON.parse((row as { fields: string }).fields),
          };
        } catch {
          return row;
        }
      }
      return row;
    });
  }
}
