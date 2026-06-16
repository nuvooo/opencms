import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

const SCHEMA_NAME_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

@Injectable()
export class TenantDbService implements OnModuleInit, OnModuleDestroy {
  private dataSource!: DataSource;
  private readonly logger = new Logger(TenantDbService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      this.dataSource = new DataSource({
        type: 'postgres',
        host: this.config.get('DB_HOST'),
        port: Number(this.config.get('DB_PORT')),
        username: this.config.get('DB_USERNAME'),
        password: this.config.get('DB_PASSWORD'),
        database: this.config.get('DB_NAME'),
        synchronize: false,
        logging: false,
      });
      this.logger.log('Initializing TenantDb DataSource...');
      await this.dataSource.initialize();
      this.logger.log('TenantDb DataSource initialized');

      await this.migrateExistingTenants();
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

  private async migrateExistingTenants(): Promise<void> {
    try {
      const tenants: { schema_name: string }[] = await this.dataSource.query(
        `SELECT schema_name FROM public.tenant`,
      );
      await this.dataSource.query(
        `ALTER TABLE public.tenant ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false`,
      );
      for (const t of tenants) {
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS "${t.schema_name}"."relation" (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            entry_id uuid NOT NULL REFERENCES "${t.schema_name}"."entry"("id") ON DELETE CASCADE,
            field_name varchar(255) NOT NULL,
            related_entry_id uuid NOT NULL REFERENCES "${t.schema_name}"."entry"("id") ON DELETE CASCADE,
            sort_order integer DEFAULT 0,
            UNIQUE(entry_id, field_name, related_entry_id)
          )
        `);

        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS "${t.schema_name}"."tenant_locale" (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            code varchar(10) NOT NULL UNIQUE,
            name varchar(100) NOT NULL,
            is_default boolean DEFAULT false
          )
        `);

        await this.dataSource.query(`
          INSERT INTO "${t.schema_name}"."tenant_locale" (code, name, is_default)
          SELECT 'en', 'English', true
          WHERE NOT EXISTS (SELECT 1 FROM "${t.schema_name}"."tenant_locale" WHERE code = 'en')
        `);

        await this.dataSource.query(`
          ALTER TABLE "${t.schema_name}"."entry" ADD COLUMN IF NOT EXISTS locale_group_id uuid
        `);
      }
      if (tenants.length > 0) {
        this.logger.log(
          `Migrated ${tenants.length} existing tenant(s) with relation table`,
        );
      }
    } catch {
      this.logger.warn('No tenants table found yet — skipping migration');
    }
  }

  private validateSchemaName(name: string): void {
    if (!SCHEMA_NAME_REGEX.test(name)) {
      throw new Error(
        `Invalid schema name: "${name}". Must match /^[a-z][a-z0-9_]{0,62}$/`,
      );
    }
  }

  async createTenantSchema(schemaName: string): Promise<void> {
    this.validateSchemaName(schemaName);

    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."content_type" (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(100) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        description varchar(500),
        fields jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."entry" (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        content_type_slug varchar(100) NOT NULL,
        fields jsonb NOT NULL DEFAULT '{}',
        locale varchar(10) DEFAULT 'en' NOT NULL,
        status varchar(20) DEFAULT 'draft' NOT NULL,
        published_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_entry_ct_slug
      ON "${schemaName}"."entry" ("content_type_slug")
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."relation" (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        entry_id uuid NOT NULL REFERENCES "${schemaName}"."entry"("id") ON DELETE CASCADE,
        field_name varchar(255) NOT NULL,
        related_entry_id uuid NOT NULL REFERENCES "${schemaName}"."entry"("id") ON DELETE CASCADE,
        sort_order integer DEFAULT 0,
        UNIQUE(entry_id, field_name, related_entry_id)
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."tenant_locale" (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        code varchar(10) NOT NULL UNIQUE,
        name varchar(100) NOT NULL,
        is_default boolean DEFAULT false
      )
    `);

    await this.dataSource.query(`
      INSERT INTO "${schemaName}"."tenant_locale" (code, name, is_default)
      SELECT 'en', 'English', true
      WHERE NOT EXISTS (SELECT 1 FROM "${schemaName}"."tenant_locale" WHERE code = 'en')
    `);

    await this.dataSource.query(`
      ALTER TABLE "${schemaName}"."entry" ADD COLUMN IF NOT EXISTS locale_group_id uuid
    `);
  }

  async copyContentTypes(fromSchema: string, toSchema: string): Promise<void> {
    this.validateSchemaName(fromSchema);
    this.validateSchemaName(toSchema);
    await this.dataSource.query(`
      INSERT INTO "${toSchema}"."content_type" (id, name, slug, description, fields, created_at, updated_at)
      SELECT gen_random_uuid(), name, slug, description, fields, now(), now()
      FROM "${fromSchema}"."content_type"
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  async dropTenantSchema(schemaName: string): Promise<void> {
    this.validateSchemaName(schemaName);
    await this.dataSource.query(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
  }

  async withTenantDb<T>(
    schemaName: string,
    fn: (query: (sql: string, params?: unknown[]) => Promise<T>) => Promise<T>,
  ): Promise<T> {
    this.validateSchemaName(schemaName);
    if (!this.dataSource?.isInitialized) {
      throw new Error('TenantDb DataSource not initialized');
    }
    return fn((sql: string, params?: unknown[]) =>
      this.dataSource.query(
        sql
          .replaceAll('"content_type"', `"${schemaName}"."content_type"`)
          .replaceAll('"entry"', `"${schemaName}"."entry"`)
          .replaceAll('"relation"', `"${schemaName}"."relation"`)
          .replaceAll('"tenant_locale"', `"${schemaName}"."tenant_locale"`),
        params,
      ),
    );
  }
}
