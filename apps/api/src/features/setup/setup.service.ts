import { ApiToken } from '@/features/api-token/entities/api-token.entity';
import { Otp } from '@/features/auth/entities/otp.entity';
import { Session } from '@/features/auth/entities/session.entity';
import { Media } from '@/features/media/entities/media.entity';
import { PluginState } from '@/features/plugin/entities/plugin-state.entity';
import { Profile } from '@/features/users/entities/profile.entity';
import { User } from '@/features/users/entities/user.entity';
import { Tenant } from '@/tenants/tenant.entity';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Client } from 'pg';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { SetupStatusResponse } from './dto/setup-status.response';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SetupState } from './entities/setup-state.entity';
import { SetupCompletionSignal } from './setup-completion.signal';
import { SetupEnvService } from './setup-env.service';
import { isSetupComplete } from './setup-env.util';

export class LockedException extends HttpException {
  constructor(message: string) {
    super(message, 423);
  }
}

/**
 * Entities the installer materialises into the freshly chosen database via
 * `synchronize`. Per-tenant content tables are created on demand elsewhere
 * (hand-rolled SQL) and are intentionally excluded here.
 */
const SCHEMA_ENTITIES = [
  User,
  Profile,
  Session,
  Otp,
  ApiToken,
  Media,
  PluginState,
  SetupState,
  Tenant,
];

/**
 * Drives the first-run installer. Deliberately free of any injected
 * repository/connection so it can run inside the lightweight installer
 * application that boots *without* a database. The database is only contacted
 * through short-lived clients/DataSources built from the wizard's own input.
 */
@Injectable()
export class SetupService {
  private inProgress = false;

  constructor(
    private readonly envService: SetupEnvService,
    private readonly completion: SetupCompletionSignal,
  ) {}

  getStatus(): SetupStatusResponse {
    return { initialized: isSetupComplete(), inProgress: this.inProgress };
  }

  async validateDatabase(dto: ValidateDbDto): Promise<void> {
    const type = dto.type ?? 'postgres';

    if (type === 'sqlite') {
      return this.validateSqlite(dto);
    }
    if (type === 'mysql') {
      return this.validateMysql(dto);
    }
    return this.validatePostgres(dto);
  }

  private async validatePostgres(dto: ValidateDbDto): Promise<void> {
    const client = new Client({
      host: dto.host,
      port: Number(dto.port),
      user: dto.username,
      password: dto.password,
      database: dto.name,
      ssl: dto.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } catch {
      throw new BadRequestException('Database connection failed');
    } finally {
      await client.end().catch(() => null);
    }
  }

  private async validateMysql(dto: ValidateDbDto): Promise<void> {
    try {
      // Imported lazily so the driver is only required when MySQL is selected.
      const mysql = (await import(
        'mysql2/promise'
      )) as typeof import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: dto.host,
        port: Number(dto.port),
        user: dto.username,
        password: dto.password,
        database: dto.name,
        ssl: dto.ssl ? { rejectUnauthorized: false } : undefined,
      });
      try {
        await connection.query('SELECT 1');
      } finally {
        await connection.end();
      }
    } catch {
      throw new BadRequestException('Database connection failed');
    }
  }

  private async validateSqlite(dto: ValidateDbDto): Promise<void> {
    const file = dto.database ?? dto.name ?? './data/cms.sqlite';
    try {
      // The file itself is created on first connection; we only need to make
      // sure its parent directory exists and is writable.
      await mkdir(dirname(resolve(file)), { recursive: true });
    } catch {
      throw new BadRequestException(
        'SQLite database directory is not writable',
      );
    }
  }

  async bootstrap(dto: BootstrapSetupDto): Promise<void> {
    if (isSetupComplete()) {
      throw new ConflictException('Already initialized');
    }
    if (this.inProgress) {
      throw new LockedException('Setup in progress');
    }

    this.inProgress = true;
    let dataSource: DataSource | undefined;

    try {
      await this.validateDatabase(dto.database);

      // Build the schema in the chosen database, then seed the admin account.
      dataSource = new DataSource(this.buildDataSourceOptions(dto.database));
      await dataSource.initialize();
      await this.createAdmin(dataSource, dto.admin.email, dto.admin.password);

      const db = dto.database;
      this.envService.writeAllowlisted({
        ALLOW_CORS_URL: dto.app.allowCorsUrl,
        AUTH_SECRET: dto.app.authSecret,
        AUTH_URL: dto.app.authUrl,
        DB_TYPE: db.type ?? 'postgres',
        DB_HOST: db.host,
        DB_PORT: db.port,
        DB_USERNAME: db.username,
        DB_PASSWORD: db.password,
        DB_NAME: db.name,
        DB_DATABASE: db.database,
        DB_SSL: db.ssl === undefined ? undefined : String(db.ssl),
        SETUP_COMPLETE: 'true',
      });

      this.inProgress = false;
      this.completion.complete();
    } catch (error) {
      this.inProgress = false;
      throw error;
    } finally {
      if (dataSource?.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  /**
   * Translates the wizard's database input into TypeORM connection options with
   * `synchronize` enabled so the installer can create the schema from scratch.
   */
  private buildDataSourceOptions(dto: ValidateDbDto): DataSourceOptions {
    const type = dto.type ?? 'postgres';

    if (type === 'sqlite') {
      return {
        type: 'better-sqlite3',
        database: dto.database ?? dto.name ?? './data/cms.sqlite',
        entities: SCHEMA_ENTITIES,
        synchronize: true,
      };
    }

    if (type === 'mysql') {
      return {
        type: 'mysql',
        host: dto.host,
        port: Number(dto.port),
        username: dto.username,
        password: dto.password,
        database: dto.name,
        entities: SCHEMA_ENTITIES,
        synchronize: true,
      };
    }

    return {
      type: 'postgres',
      host: dto.host,
      port: Number(dto.port),
      username: dto.username,
      password: dto.password,
      database: dto.name,
      ssl: dto.ssl ? { rejectUnauthorized: false } : false,
      entities: SCHEMA_ENTITIES,
      synchronize: true,
    };
  }

  private async createAdmin(
    dataSource: DataSource,
    email: string,
    password: string,
  ): Promise<void> {
    await dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(User, { where: { email } });
      if (existing) {
        throw new ConflictException('Admin email already exists');
      }

      const user = manager.create(User, {
        email,
        password,
        role: 'ADMIN',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });
      const savedUser = await manager.save(User, user);

      const profile = manager.create(Profile, {
        user_id: savedUser.id,
        name: email.split('@')[0],
      });
      await manager.save(Profile, profile);
    });
  }
}
