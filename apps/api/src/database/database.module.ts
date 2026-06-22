/**
 * Database module for configuring TypeORM in a NestJS application.
 *
 * The engine (PostgreSQL, MySQL/MariaDB or SQLite) is selected via the `DB_TYPE`
 * environment variable. Connection settings are loaded from environment
 * variables via ConfigService. Supports entity autoloading; synchronization is
 * disabled in production.
 */
import { buildConnectionOptions } from '@/common/database';
import { Env } from '@/common/utils';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * DatabaseModule class that imports TypeOrmModule with async configuration.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) =>
        ({
          ...buildConnectionOptions(config),
          autoLoadEntities: true,
          synchronize: config.get('NODE_ENV') !== 'production',
          retryAttempts: 0,
        }) as TypeOrmModuleOptions,
    }),
  ],
})
export class DatabaseModule {}
