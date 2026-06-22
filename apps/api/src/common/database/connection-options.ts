import type { Env } from '@/common/utils';
import type { ConfigService } from '@nestjs/config';
import { getDbType } from './db-types';

/**
 * Driver-specific connection options shared by the main TypeORM connection
 * (DatabaseModule) and the raw per-tenant DataSource (TenantDbService).
 *
 * For SQLite only a file path is required; the relational engines use the
 * host/port/credentials block. The `type` is narrowed to the concrete TypeORM
 * driver name (`better-sqlite3` for SQLite).
 */
export const buildConnectionOptions = (config: ConfigService<Env>) => {
  const dbType = getDbType();

  if (dbType === 'sqlite') {
    return {
      type: 'better-sqlite3' as const,
      database: config.get('DB_DATABASE') ?? './data/cms.sqlite',
    };
  }

  return {
    type: dbType,
    host: config.get('DB_HOST'),
    port: Number(config.get('DB_PORT')),
    username: config.get('DB_USERNAME'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    ...(dbType === 'postgres'
      ? { ssl: config.get('DB_SSL') ? { rejectUnauthorized: false } : false }
      : {}),
  };
};
