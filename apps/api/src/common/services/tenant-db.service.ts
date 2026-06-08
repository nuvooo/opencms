import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

const SCHEMA_NAME_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

@Injectable()
export class TenantDbService implements OnModuleInit, OnModuleDestroy {
  private dataSource!: DataSource;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
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
    await this.dataSource.initialize();
  }

  async onModuleDestroy() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
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
    return fn((sql: string, params?: unknown[]) =>
      this.dataSource.query(
        sql.replaceAll('"content_type"', `"${schemaName}"."content_type"`),
        params,
      ),
    );
  }
}
