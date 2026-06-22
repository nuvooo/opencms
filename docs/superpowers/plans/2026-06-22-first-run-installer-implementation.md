# First-Run Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time `/setup` installer that validates DB credentials, writes allowed `.env` keys safely, creates the first admin user, and permanently blocks re-running setup.

**Architecture:** Implement a new API `setup` feature module with singleton setup state, lock semantics, DB preflight, and bootstrap orchestration. Add an env writer utility that updates only allowlisted keys and performs atomic replace with backup. Implement a Next.js `/setup` wizard + route guards that redirect users to `/setup` before initialization and to `/auth/sign-in` after success.

**Tech Stack:** NestJS (Fastify), TypeORM, class-validator, Jest, Next.js App Router, next-safe-action, Zod, Vitest.

---

## File Structure

- `apps/api/src/features/setup/entities/setup-state.entity.ts` - singleton setup state row (`is_initialized`, `setup_in_progress`, timestamps).
- `apps/api/src/features/setup/dto/*.ts` - request DTOs for status/validate/bootstrap payload validation.
- `apps/api/src/features/setup/setup.constants.ts` - one source of truth for env allowlist and singleton key.
- `apps/api/src/features/setup/setup-env.service.ts` - `.env` parser/serializer + backup + atomic replace.
- `apps/api/src/features/setup/setup.service.ts` - status lookup, lock management, DB preflight, bootstrap orchestration.
- `apps/api/src/features/setup/setup.controller.ts` - public setup endpoints and response contracts.
- `apps/api/src/features/setup/setup.module.ts` - feature wiring for controller/services/repositories.
- `apps/api/src/features/setup/setup.controller.spec.ts` - controller behavior and status code tests.
- `apps/api/src/features/setup/setup.service.spec.ts` - lock/error/happy path bootstrap tests.
- `apps/api/src/features/setup/setup-env.service.spec.ts` - allowlist/backup/atomic write tests.
- `apps/api/src/app.module.ts` - import `SetupModule`.
- `apps/api/src/features/users/entities/user.entity.ts` - add `role` column so “first admin” is persisted.
- `apps/api/src/features/auth/auth.service.ts` - include `role` in JWT payload and default role on register.
- `apps/api/src/features/auth/dto/create-user.dto.ts` - optional role field for internal service usage.
- `apps/web/server/setup.schema.ts` - Zod schemas for setup API contracts.
- `apps/web/server/setup.server.ts` - server actions for status, validate DB, bootstrap.
- `apps/web/components/setup/setup-wizard.tsx` - client wizard UI and step flow.
- `apps/web/app/setup/page.tsx` - setup page entry + initialized redirect.
- `apps/web/app/auth/sign-in/page.tsx` - redirect to `/setup` when uninitialized.
- `apps/web/app/admin/layout.tsx` - gate admin routes to `/setup` while uninitialized.
- `apps/web/types/type.d.ts` - add `role` to NextAuth user type.
- `apps/web/components/setup/setup-wizard.test.tsx` - wizard navigation/validation/error/success tests.
- `apps/web/app/setup/page.test.tsx` - initialized guard behavior tests.
- `apps/api/test/setup.e2e-spec.ts` - API-level setup flow smoke test.

---

### Task 1: Build setup state model and env writer (TDD first)

**Files:**

- Create: `apps/api/src/features/setup/entities/setup-state.entity.ts`
- Create: `apps/api/src/features/setup/setup.constants.ts`
- Create: `apps/api/src/features/setup/setup-env.service.ts`
- Create: `apps/api/src/features/setup/setup-env.service.spec.ts`

- [ ] **Step 1: Write failing env writer tests**

```ts
// apps/api/src/features/setup/setup-env.service.spec.ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SetupEnvService } from './setup-env.service';

describe('SetupEnvService', () => {
  it('updates only allowlisted keys and preserves unknown keys', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');
    writeFileSync(
      envPath,
      'ALLOW_CORS_URL=http://old\nDB_HOST=old-host\nKEEP_ME=1\n',
      'utf-8',
    );

    const service = new SetupEnvService(envPath);
    service.writeAllowlisted({
      ALLOW_CORS_URL: 'http://localhost:3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'password',
      DB_NAME: 'cms',
      DB_SSL: 'false',
      AUTH_SECRET: 'secret123456',
      AUTH_URL: 'http://localhost:3000',
    });

    const updated = readFileSync(envPath, 'utf-8');
    expect(updated).toContain('ALLOW_CORS_URL=http://localhost:3000');
    expect(updated).toContain('DB_HOST=localhost');
    expect(updated).toContain('KEEP_ME=1');

    rmSync(root, { recursive: true, force: true });
  });

  it('creates a .env.bak backup before replacing .env', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');
    writeFileSync(envPath, 'DB_HOST=old\n', 'utf-8');

    const service = new SetupEnvService(envPath);
    service.writeAllowlisted({ DB_HOST: 'new-host' });

    const backup = readFileSync(join(root, '.env.bak'), 'utf-8');
    expect(backup).toContain('DB_HOST=old');

    rmSync(root, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter api test -- setup-env.service.spec.ts --runInBand`
Expected: FAIL with module/file-not-found for new setup env files.

- [ ] **Step 3: Implement setup constants + state entity + env service**

```ts
// apps/api/src/features/setup/setup.constants.ts
export const SETUP_STATE_ID = 'singleton';

export const SETUP_ENV_ALLOWLIST = [
  'ALLOW_CORS_URL',
  'AUTH_SECRET',
  'AUTH_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_SSL',
] as const;

export type SetupEnvKey = (typeof SETUP_ENV_ALLOWLIST)[number];
```

```ts
// apps/api/src/features/setup/entities/setup-state.entity.ts
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'setup_state' })
export class SetupState {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id: string;

  @Column({ type: 'boolean', default: false })
  is_initialized: boolean;

  @Column({ type: 'boolean', default: false })
  setup_in_progress: boolean;

  @Column({ type: 'timestamp', nullable: true })
  initialized_at: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
```

```ts
// apps/api/src/features/setup/setup-env.service.ts
import { Injectable } from '@nestjs/common';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { SETUP_ENV_ALLOWLIST, type SetupEnvKey } from './setup.constants';

@Injectable()
export class SetupEnvService {
  constructor(private readonly envPath: string = join(process.cwd(), '.env')) {}

  writeAllowlisted(values: Partial<Record<SetupEnvKey, string>>): void {
    const current = existsSync(this.envPath)
      ? readFileSync(this.envPath, 'utf-8')
      : '';
    const parsed = this.parseEnv(current);

    for (const key of SETUP_ENV_ALLOWLIST) {
      const incoming = values[key];
      if (typeof incoming === 'string') {
        parsed.set(key, incoming);
      }
    }

    const serialized = Array.from(parsed.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
      .concat('\n');

    const dir = dirname(this.envPath);
    const tmpPath = join(dir, '.env.tmp');
    const backupPath = join(dir, '.env.bak');

    if (existsSync(this.envPath)) {
      copyFileSync(this.envPath, backupPath);
    }

    writeFileSync(tmpPath, serialized, 'utf-8');
    renameSync(tmpPath, this.envPath);
  }

  private parseEnv(content: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      map.set(key, value);
    }
    return map;
  }
}
```

- [ ] **Step 4: Run env writer tests to pass**

Run: `pnpm --filter api test -- setup-env.service.spec.ts --runInBand`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/setup/entities/setup-state.entity.ts apps/api/src/features/setup/setup.constants.ts apps/api/src/features/setup/setup-env.service.ts apps/api/src/features/setup/setup-env.service.spec.ts
git commit -m "feat(setup): add setup state entity and env writer"
```

### Task 2: Implement setup service (status, lock, DB validate, bootstrap)

**Files:**

- Create: `apps/api/src/features/setup/dto/setup-status.response.ts`
- Create: `apps/api/src/features/setup/dto/validate-db.dto.ts`
- Create: `apps/api/src/features/setup/dto/bootstrap-setup.dto.ts`
- Create: `apps/api/src/features/setup/setup.service.ts`
- Create: `apps/api/src/features/setup/setup.service.spec.ts`
- Modify: `apps/api/src/features/users/entities/user.entity.ts`
- Modify: `apps/api/src/features/auth/auth.service.ts`
- Modify: `apps/api/src/features/auth/dto/create-user.dto.ts`

- [ ] **Step 1: Write failing setup service tests**

```ts
// apps/api/src/features/setup/setup.service.spec.ts
import { ConflictException, LockedException } from '@nestjs/common';
import { SetupService } from './setup.service';

describe('SetupService', () => {
  it('returns initialized/inProgress status', async () => {
    const service = new SetupService(
      /* mocked deps */ {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service as any, 'getOrCreateState').mockResolvedValue({
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
    });

    await expect(service.getStatus()).resolves.toEqual({
      initialized: false,
      inProgress: false,
    });
  });

  it('throws 409 when bootstrap called after initialization', async () => {
    const service = new SetupService(
      /* mocked deps */ {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service as any, 'getOrCreateState').mockResolvedValue({
      id: 'singleton',
      is_initialized: true,
      setup_in_progress: false,
    });

    await expect(service.bootstrap({} as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws 423 when bootstrap is already in progress', async () => {
    const service = new SetupService(
      /* mocked deps */ {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service as any, 'getOrCreateState').mockResolvedValue({
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: true,
    });

    await expect(service.bootstrap({} as any)).rejects.toBeInstanceOf(
      LockedException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter api test -- setup.service.spec.ts --runInBand`
Expected: FAIL with missing DTO/service modules.

- [ ] **Step 3: Implement setup DTOs and setup service orchestration**

```ts
// apps/api/src/features/setup/dto/validate-db.dto.ts
import { IsBoolean, IsNumberString, IsString, IsUrl } from 'class-validator';

export class ValidateDbDto {
  @IsString()
  host: string;

  @IsNumberString()
  port: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @IsBoolean()
  ssl: boolean;
}
```

```ts
// apps/api/src/features/setup/dto/bootstrap-setup.dto.ts
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ValidateDbDto } from './validate-db.dto';

class SetupAppDto {
  @IsString()
  allowCorsUrl: string;

  @IsString()
  authSecret: string;

  @IsOptional()
  @IsString()
  authUrl?: string;
}

class SetupAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class BootstrapSetupDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SetupAppDto)
  app: SetupAppDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ValidateDbDto)
  database: ValidateDbDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SetupAdminDto)
  admin: SetupAdminDto;
}
```

```ts
// apps/api/src/features/setup/setup.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  LockedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from 'pg';
import { Repository } from 'typeorm';
import { SetupState } from './entities/setup-state.entity';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SETUP_STATE_ID } from './setup.constants';
import { SetupEnvService } from './setup-env.service';
import { User } from '@/features/users/entities/user.entity';
import { Profile } from '@/features/users/entities/profile.entity';
import { TransactionService } from '@/database';

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(SetupState)
    private readonly stateRepo: Repository<SetupState>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tx: TransactionService,
    private readonly envService: SetupEnvService,
  ) {}

  async getStatus() {
    const state = await this.getOrCreateState();
    return {
      initialized: state.is_initialized,
      inProgress: state.setup_in_progress,
    };
  }

  async validateDatabase(dto: ValidateDbDto): Promise<void> {
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

  async bootstrap(dto: BootstrapSetupDto): Promise<void> {
    const state = await this.getOrCreateState();

    if (state.is_initialized) {
      throw new ConflictException('Already initialized');
    }
    if (state.setup_in_progress) {
      throw new LockedException('Setup in progress');
    }

    state.setup_in_progress = true;
    await this.stateRepo.save(state);

    try {
      await this.validateDatabase(dto.database);

      this.envService.writeAllowlisted({
        ALLOW_CORS_URL: dto.app.allowCorsUrl,
        AUTH_SECRET: dto.app.authSecret,
        AUTH_URL: dto.app.authUrl,
        DB_HOST: dto.database.host,
        DB_PORT: dto.database.port,
        DB_USERNAME: dto.database.username,
        DB_PASSWORD: dto.database.password,
        DB_NAME: dto.database.name,
        DB_SSL: String(dto.database.ssl),
      });

      await this.createAdmin(dto.admin.email, dto.admin.password);

      state.is_initialized = true;
      state.setup_in_progress = false;
      state.initialized_at = new Date();
      await this.stateRepo.save(state);
    } catch (error) {
      state.setup_in_progress = false;
      await this.stateRepo.save(state);
      throw error;
    }
  }

  private async createAdmin(email: string, password: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Admin email already exists');
    }

    await this.tx.runInTransaction(async (manager) => {
      const user = manager.create(User, {
        email,
        password,
        role: 'ADMIN',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });
      await manager.insert(User, user);

      const profile = manager.create(Profile, {
        user_id: user.id,
        name: email.split('@')[0],
      });
      await manager.insert(Profile, profile);
    });
  }

  private async getOrCreateState(): Promise<SetupState> {
    const existing = await this.stateRepo.findOne({
      where: { id: SETUP_STATE_ID },
    });
    if (existing) return existing;

    const state = this.stateRepo.create({
      id: SETUP_STATE_ID,
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    });
    return this.stateRepo.save(state);
  }
}
```

```ts
// apps/api/src/features/users/entities/user.entity.ts (new column)
import { roleSchema, type Role } from '@/common/constants';

@Column({ type: 'enum', enum: roleSchema.options, default: 'USER' })
role: Role;
```

```ts
// apps/api/src/features/auth/auth.service.ts (token payload + register default)
this.jwtService.signAsync(
  {
    username: user.username,
    email: user.email,
    id: user.id,
    role: user.role,
  },
  {
    secret: this.config.get('ACCESS_TOKEN_SECRET'),
    expiresIn: this.config.get('ACCESS_TOKEN_EXPIRATION'),
  },
);

const user = manager.create(User, { ...createUserDto, role: 'USER' });
```

```ts
// apps/api/src/features/auth/dto/create-user.dto.ts
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

@IsOptional()
@IsIn(['ADMIN', 'USER'])
role?: 'ADMIN' | 'USER';
```

- [ ] **Step 4: Run service tests to pass**

Run: `pnpm --filter api test -- setup.service.spec.ts --runInBand`
Expected: PASS for status + lock semantics tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/setup/dto apps/api/src/features/setup/setup.service.ts apps/api/src/features/setup/setup.service.spec.ts apps/api/src/features/users/entities/user.entity.ts apps/api/src/features/auth/auth.service.ts apps/api/src/features/auth/dto/create-user.dto.ts
git commit -m "feat(setup): add setup bootstrap orchestration with admin creation"
```

### Task 3: Expose public setup endpoints and wire API module

**Files:**

- Create: `apps/api/src/features/setup/setup.controller.ts`
- Create: `apps/api/src/features/setup/setup.controller.spec.ts`
- Create: `apps/api/src/features/setup/setup.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing controller tests**

```ts
// apps/api/src/features/setup/setup.controller.spec.ts
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '@/common/decorators';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

describe('SetupController', () => {
  it('returns setup status', async () => {
    const module = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: SetupService,
          useValue: {
            getStatus: jest
              .fn()
              .mockResolvedValue({ initialized: false, inProgress: false }),
            validateDatabase: jest.fn(),
            bootstrap: jest.fn(),
          },
        },
      ],
    }).compile();

    const controller = module.get(SetupController);
    await expect(controller.status()).resolves.toEqual({
      initialized: false,
      inProgress: false,
    });
  });

  it('marks setup endpoints as public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.status),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.validateDb),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.bootstrap),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter api test -- setup.controller.spec.ts --runInBand`
Expected: FAIL with missing controller/module symbols.

- [ ] **Step 3: Implement controller/module and app wiring**

```ts
// apps/api/src/features/setup/setup.controller.ts
import { Public } from '@/common/decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  status() {
    return this.setupService.getStatus();
  }

  @Public()
  @Post('validate-db')
  async validateDb(@Body() dto: ValidateDbDto) {
    await this.setupService.validateDatabase(dto);
    return { ok: true };
  }

  @Public()
  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapSetupDto) {
    await this.setupService.bootstrap(dto);
    return { message: 'Installation completed' };
  }
}
```

```ts
// apps/api/src/features/setup/setup.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from '@/database';
import { User } from '@/features/users/entities/user.entity';
import { SetupState } from './entities/setup-state.entity';
import { SetupController } from './setup.controller';
import { SetupEnvService } from './setup-env.service';
import { SetupService } from './setup.service';

@Module({
  imports: [TypeOrmModule.forFeature([SetupState, User])],
  controllers: [SetupController],
  providers: [SetupService, SetupEnvService, TransactionService],
})
export class SetupModule {}
```

```ts
// apps/api/src/app.module.ts (imports)
import { SetupModule } from './features/setup/setup.module';

imports: [
  // existing modules...
  PluginModule,
  SetupModule,
],
```

- [ ] **Step 4: Run API tests for setup feature**

Run: `pnpm --filter api test -- setup-env.service.spec.ts setup.service.spec.ts setup.controller.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/setup/setup.controller.ts apps/api/src/features/setup/setup.controller.spec.ts apps/api/src/features/setup/setup.module.ts apps/api/src/app.module.ts
git commit -m "feat(setup): expose setup status validate and bootstrap endpoints"
```

### Task 4: Add web setup schemas, server actions, and route guards

**Files:**

- Create: `apps/web/server/setup.schema.ts`
- Create: `apps/web/server/setup.server.ts`
- Modify: `apps/web/app/setup/page.tsx`
- Modify: `apps/web/app/auth/sign-in/page.tsx`
- Modify: `apps/web/app/admin/layout.tsx`
- Modify: `apps/web/types/type.d.ts`

- [ ] **Step 1: Write failing server-action and guard tests**

```ts
// apps/web/app/setup/page.test.tsx
import Page from '@/app/setup/page';
import { getSetupStatus } from '@/server/setup.server';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/server/setup.server', () => ({
  getSetupStatus: vi.fn(),
}));

describe('setup page guard', () => {
  it('renders setup page when uninitialized', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      initialized: false,
      inProgress: false,
    });

    render(await Page());
    expect(screen.getByText(/one-time setup/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter web test -- app/setup/page.test.tsx`
Expected: FAIL due to missing setup page/server files.

- [ ] **Step 3: Implement setup schemas/actions and route gating**

```ts
// apps/web/server/setup.schema.ts
import { z } from 'zod';

export const SetupStatusSchema = z.object({
  initialized: z.boolean(),
  inProgress: z.boolean(),
});

export const ValidateDbInputSchema = z.object({
  host: z.string().min(1),
  port: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  ssl: z.boolean(),
});

export const BootstrapSetupInputSchema = z.object({
  app: z.object({
    allowCorsUrl: z.string().url(),
    authSecret: z.string().min(10),
    authUrl: z.string().url().optional(),
  }),
  database: ValidateDbInputSchema,
  admin: z.object({
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/\d/)
      .regex(/[!@#$%^&*(),.?":{}|<>]/),
  }),
});

export type SetupStatus = z.infer<typeof SetupStatusSchema>;
```

```ts
// apps/web/server/setup.server.ts
'use server';

import { safeAction, safeFetch } from '@/lib';
import { DefaultReturnSchema } from '@/types/default.type';
import {
  BootstrapSetupInputSchema,
  SetupStatusSchema,
  ValidateDbInputSchema,
} from './setup.schema';

export const getSetupStatus = async () => {
  const [error, data] = await safeFetch(SetupStatusSchema, '/setup/status', {
    cache: 'no-store',
  });
  if (error) throw new Error(error);
  return data;
};

export const validateSetupDb = safeAction
  .schema(ValidateDbInputSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(
      DefaultReturnSchema.or(SetupStatusSchema),
      '/setup/validate-db',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
        cache: 'no-store',
      },
    );
    if (error) throw new Error(error);
    return { ok: true };
  });

export const bootstrapSetup = safeAction
  .schema(BootstrapSetupInputSchema)
  .action(async ({ parsedInput }) => {
    const [error, data] = await safeFetch(
      DefaultReturnSchema,
      '/setup/bootstrap',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
        cache: 'no-store',
      },
    );
    if (error) throw new Error(error);
    return data;
  });
```

```tsx
// apps/web/app/setup/page.tsx
import SetupWizard from '@/components/setup/setup-wizard';
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const SetupPage = async () => {
  const status = await getSetupStatus();
  if (status.initialized) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="container py-10">
      <SetupWizard />
    </div>
  );
};

export default SetupPage;
```

```tsx
// apps/web/app/auth/sign-in/page.tsx
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const Page = async () => {
  const status = await getSetupStatus();
  if (!status.initialized) redirect('/setup');

  return (
    <div className="min-h-dvh flex justify-center items-center container">
      <SignInForm />
    </div>
  );
};
```

```tsx
// apps/web/app/admin/layout.tsx
import { getSetupStatus } from '@/server/setup.server';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const status = await getSetupStatus();
  if (!status.initialized) redirect('/setup');

  const session = await auth();
  if (!session) redirect('/auth/sign-in');
  // existing content...
};
```

```ts
// apps/web/types/type.d.ts
interface User {
  // existing fields...
  role: 'ADMIN' | 'USER';
}
```

- [ ] **Step 4: Run web typecheck and test**

Run: `pnpm --filter web exec tsc --noEmit; if ($?) { pnpm --filter web test -- app/setup/page.test.tsx }`
Expected: typecheck PASS and setup page test PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/server/setup.schema.ts apps/web/server/setup.server.ts apps/web/app/setup/page.tsx apps/web/app/auth/sign-in/page.tsx apps/web/app/admin/layout.tsx apps/web/types/type.d.ts apps/web/app/setup/page.test.tsx
git commit -m "feat(setup): add web setup status actions and route guards"
```

### Task 5: Implement setup wizard UI and error mapping

**Files:**

- Create: `apps/web/components/setup/setup-wizard.tsx`
- Create: `apps/web/components/setup/setup-wizard.test.tsx`

- [ ] **Step 1: Write failing wizard tests**

```tsx
// apps/web/components/setup/setup-wizard.test.tsx
import SetupWizard from '@/components/setup/setup-wizard';
import { bootstrapSetup, validateSetupDb } from '@/server/setup.server';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/server/setup.server', () => ({
  validateSetupDb: vi.fn(),
  bootstrapSetup: vi.fn(),
}));

describe('SetupWizard', () => {
  it('shows one-time warning and progresses steps', async () => {
    render(<SetupWizard />);
    expect(screen.getByText(/only be run once/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/database settings/i)).toBeDefined();
  });

  it('shows backend validation error when DB preflight fails', async () => {
    vi.mocked(validateSetupDb).mockReturnValue({
      execute: vi.fn(),
      result: { serverError: 'Database connection failed' },
    } as any);

    render(<SetupWizard />);
    expect(screen.getByText(/database connection failed/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter web test -- components/setup/setup-wizard.test.tsx`
Expected: FAIL with missing wizard component.

- [ ] **Step 3: Implement wizard component with 5 steps**

```tsx
// apps/web/components/setup/setup-wizard.tsx
'use client';

import { bootstrapSetup, validateSetupDb } from '@/server/setup.server';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 0 | 1 | 2 | 3 | 4;

const SetupWizard = () => {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState({
    app: { allowCorsUrl: 'http://localhost:3000', authSecret: '', authUrl: '' },
    database: {
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: '',
      name: '',
      ssl: false,
    },
    admin: { email: '', password: '' },
  });
  const router = useRouter();

  const validateDbAction = useAction(validateSetupDb);
  const bootstrapAction = useAction(bootstrapSetup, {
    onSuccess: () => setStep(4),
  });

  const error =
    validateDbAction.result.serverError ?? bootstrapAction.result.serverError;

  const canSubmitBootstrap = useMemo(() => {
    return !!form.admin.email && !!form.admin.password && !!form.app.authSecret;
  }, [form]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">CMS Setup</h1>
      <p className="text-sm text-muted-foreground">
        This installer can only be run once.
      </p>

      {step === 0 && (
        <div className="space-y-4">
          <p>Welcome. We will configure database + first admin account.</p>
          <button onClick={() => setStep(1)}>Continue</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2>Database settings</h2>
          <button
            onClick={() => validateDbAction.execute(form.database)}
            disabled={validateDbAction.isExecuting}
          >
            Validate connection
          </button>
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2>First admin account</h2>
          <button onClick={() => setStep(3)}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2>Review</h2>
          <button
            onClick={() => bootstrapAction.execute(form)}
            disabled={!canSubmitBootstrap || bootstrapAction.isExecuting}
          >
            Install
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2>Installation completed</h2>
          <button onClick={() => router.push('/auth/sign-in')}>
            Go to sign-in
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SetupWizard;
```

- [ ] **Step 4: Run wizard tests**

Run: `pnpm --filter web test -- components/setup/setup-wizard.test.tsx app/setup/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/setup/setup-wizard.tsx apps/web/components/setup/setup-wizard.test.tsx
git commit -m "feat(setup): add first-run setup wizard flow"
```

### Task 6: Add API e2e smoke and full verification

**Files:**

- Create: `apps/api/test/setup.e2e-spec.ts`
- Modify: `apps/api/test/jest-e2e.json` (only if pattern update is required)

- [ ] **Step 1: Write failing setup e2e smoke test**

```ts
// apps/api/test/setup.e2e-spec.ts
import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('Setup (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('GET /setup/status returns shape', async () => {
    const res = await request(app.getHttpServer()).get('/setup/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('initialized');
    expect(res.body).toHaveProperty('inProgress');
  });
});
```

- [ ] **Step 2: Run e2e test to verify failure**

Run: `pnpm --filter api test:e2e -- setup.e2e-spec.ts`
Expected: FAIL before setup routes are fully wired into e2e runtime.

- [ ] **Step 3: Fix e2e bootstrap/wiring issues if needed**

```ts
// apps/api/test/jest-e2e.json (if necessary)
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

- [ ] **Step 4: Run full verification suite**

Run: `pnpm --filter api test -- setup-env.service.spec.ts setup.service.spec.ts setup.controller.spec.ts --runInBand; if ($?) { pnpm --filter web test -- components/setup/setup-wizard.test.tsx app/setup/page.test.tsx }; if ($?) { pnpm --filter api exec tsc --noEmit }; if ($?) { pnpm --filter web exec tsc --noEmit }`
Expected: all tests PASS and both typechecks PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/setup.e2e-spec.ts apps/api/test/jest-e2e.json
git commit -m "test(setup): add setup endpoint e2e smoke and verify suite"
```

---

## Implementation Notes (Do Not Skip)

- Do not log secrets from setup payload (`authSecret`, `DB_PASSWORD`, admin password).
- Keep `.env` write path fixed (default `apps/api/.env` when running API package; no user-controlled path).
- Return exact error semantics:
  - already initialized -> `409 Already initialized`
  - setup lock held -> `423 Setup in progress`
  - DB connection issue -> `400 Database connection failed`
- Maintain one-way lock behavior: once `is_initialized=true`, all setup mutations remain blocked.
- Ensure fallback behavior when bootstrap fails after env write: reset `setup_in_progress` to false and preserve retry path.

## Manual QA Checklist

- Start API + web with fresh DB and `is_initialized=false`.
- Open `/setup` and complete wizard.
- Confirm `.env` updated with allowlist keys and `.env.bak` created.
- Confirm sign-in works with created admin credentials.
- Confirm `/setup` redirects to `/auth/sign-in` after success.
- Confirm `POST /setup/bootstrap` now returns `409`.

## Spec Coverage Self-Review

- One-time `/setup` wizard: covered by Tasks 4-5.
- Setup API (`status`, `validate-db`, `bootstrap`): covered by Tasks 2-3.
- Lock semantics (`423`) and post-init hard block (`409`): covered by Task 2 tests.
- `.env` allowlist + backup + atomic replace: covered by Task 1.
- First admin creation: covered by Task 2 (`createAdmin`) and role persistence.
- Tests for API, web, e2e smoke: covered by Task 6.
