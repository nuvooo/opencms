import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantDbService implements OnModuleInit, OnModuleDestroy {
  private dataSource: DataSource;

  constructor(private config: ConfigService<any>) {
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
  }

  async onModuleInit() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async onModuleDestroy() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async createTenantSchema(schemaName: string): Promise<void> {
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
      CREATE INDEX IF NOT EXISTS idx_"${schemaName}"_entry_ct_slug
      ON "${schemaName}"."entry" ("content_type_slug")
    `);
  }

  async dropTenantSchema(schemaName: string): Promise<void> {
    await this.dataSource.query(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
  }

  async withTenantDb<T>(
    schemaName: string,
    fn: (query: (sql: string, params?: unknown[]) => Promise<T>) => Promise<T>,
  ): Promise<T> {
    await this.dataSource.query(`SET search_path TO "${schemaName}"`);
    return fn((sql: string, params?: unknown[]) =>
      this.dataSource.query(sql, params),
    );
  }
}
