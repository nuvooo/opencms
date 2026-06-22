# Per-App 80% Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise and enforce test coverage to at least 80% (`lines`, `statements`, `functions`, `branches`) for `apps/api` and `apps/web` independently.

**Architecture:** Keep existing Jest (API) and Vitest (Web) stacks, then incrementally add deterministic tests in high-branch logic modules before enabling hard thresholds. Configure per-app coverage commands so coverage checks remain explicit and CI-friendly. Avoid broad refactors; only add minimal seams/mocks needed for reliable testing.

**Tech Stack:** NestJS + Jest (`ts-jest`), Next.js + Vitest + Testing Library, pnpm workspaces, Turborepo

---

## File Structure and Responsibilities

- `apps/api/jest.config.ts` - enforce API coverage thresholds for all 4 metrics.
- `apps/api/src/locale/locale.service.spec.ts` (create) - unit tests for locale service create/update/find/remove paths.
- `apps/api/src/features/api-token/api-token.service.spec.ts` (create) - unit tests for API token lifecycle and validation branches.
- `apps/web/vitest.config.ts` (create) - explicit Vitest setup, JS DOM environment, and 80% coverage thresholds.
- `apps/web/vitest.setup.ts` (create) - shared test setup (`@testing-library/jest-dom`).
- `apps/web/package.json` - add `test:cov` script using Vitest coverage mode.
- `package.json` - add root scripts: `test:cov:api`, `test:cov:web`, `test:cov`.
- `apps/web/lib/auth/jwt-callback.test.ts` (create) - branch tests for `update` / `signIn` / passthrough token logic.
- `apps/web/lib/auth/session-callback.test.ts` (create) - token->session mapping and passthrough coverage.
- `apps/web/lib/auth/is-authorized.test.ts` (create) - redirect/allow rules for auth guard logic.
- `apps/web/lib/device.test.ts` (create) - `getLocationFromIp` and `getDeviceInfo` branch coverage with deterministic mocks.

---

### Task 1: Configure coverage guardrails per app

**Files:**

- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Modify: `apps/api/jest.config.ts`
- Modify: `apps/web/package.json`
- Modify: `package.json`

- [ ] **Step 1: Write the failing config-first checks (TDD guardrails)**

```bash
pnpm --filter=web test -- --coverage
```

Expected: FAIL or partial output indicating missing explicit Vitest coverage configuration and/or inconsistent coverage output.

- [ ] **Step 2: Add explicit Vitest config with 80% thresholds**

```ts
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'app/**/*.ts',
        'app/**/*.tsx',
        'components/**/*.ts',
        'components/**/*.tsx',
        'lib/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
```

- [ ] **Step 3: Add shared web test setup file**

```ts
// apps/web/vitest.setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Enforce API thresholds in Jest config**

```ts
// apps/api/jest.config.ts
export default {
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 80,
    },
  },
};
```

- [ ] **Step 5: Add per-app and root coverage scripts**

```json
// apps/web/package.json (scripts excerpt)
{
  "scripts": {
    "test": "vitest run",
    "test:cov": "vitest run --coverage"
  }
}
```

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "test:cov:api": "pnpm --filter=api test:cov",
    "test:cov:web": "pnpm --filter=web test:cov",
    "test:cov": "pnpm test:cov:api && pnpm test:cov:web"
  }
}
```

- [ ] **Step 6: Run config smoke checks**

```bash
pnpm --filter=api test:cov
```

Expected: likely FAIL on thresholds (this is acceptable now), but config loads and coverage summary prints.

```bash
pnpm --filter=web test:cov
```

Expected: likely FAIL on thresholds (acceptable now), but Vitest runs with jsdom and coverage reporters.

- [ ] **Step 7: Commit Task 1**

```bash
git add apps/api/jest.config.ts apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/package.json package.json
git commit -m "test: add per-app 80 percent coverage guardrails"
```

---

### Task 2: Raise API coverage with LocaleService branch tests

**Files:**

- Create: `apps/api/src/locale/locale.service.spec.ts`
- Test: `apps/api/src/locale/locale.service.ts`

- [ ] **Step 1: Write failing tests for locale service branches**

```ts
// apps/api/src/locale/locale.service.spec.ts
import { TenantDbService } from '@/common/services';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let service: LocaleService;
  const tenantDb = { withTenantDb: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocaleService,
        { provide: TenantDbService, useValue: tenantDb },
      ],
    }).compile();
    service = module.get(LocaleService);
  });

  it('create() resets defaults when dto.is_default is true', async () => {
    tenantDb.withTenantDb
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([
        { id: '1', code: 'en', name: 'English', is_default: true },
      ]);

    const result = await service.create('tenant_a', {
      code: 'en',
      name: 'English',
      is_default: true,
    });

    expect(tenantDb.withTenantDb).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('1');
  });

  it('findOne() throws NotFoundException when no locale exists', async () => {
    tenantDb.withTenantDb.mockResolvedValueOnce([]);
    await expect(service.findOne('tenant_a', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update() returns existing locale when dto has no defined fields', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: '1',
      code: 'en',
      name: 'English',
      is_default: false,
    } as any);

    const result = await service.update('tenant_a', '1', {
      code: undefined,
      name: undefined,
      is_default: undefined,
    });

    expect(result.id).toBe('1');
    expect(tenantDb.withTenantDb).not.toHaveBeenCalled();
  });

  it('remove() throws when trying to delete default locale', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: '1', is_default: true } as any);
    await expect(service.remove('tenant_a', '1')).rejects.toThrow(
      'Cannot delete the default locale',
    );
  });
});
```

- [ ] **Step 2: Run single spec to verify expected fail**

Run: `pnpm --filter=api test -- locale.service.spec.ts --runInBand`
Expected: FAIL first due to call ordering/expectation gaps; adjust assertions until tests encode real behavior.

- [ ] **Step 3: Finalize spec implementation until green**

```ts
// keep the same file, add missing branch tests if needed:
// - create() without default flag
// - update() with is_default true triggers reset
// - remove() success path issues delete query
```

- [ ] **Step 4: Run locale spec and full API test suite**

Run: `pnpm --filter=api test -- locale.service.spec.ts --runInBand`
Expected: PASS

Run: `pnpm --filter=api test`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/api/src/locale/locale.service.spec.ts
git commit -m "test(api): add locale service branch coverage"
```

---

### Task 3: Raise API coverage with ApiTokenService tests

**Files:**

- Create: `apps/api/src/features/api-token/api-token.service.spec.ts`
- Test: `apps/api/src/features/api-token/api-token.service.ts`

- [ ] **Step 1: Write failing tests for token lifecycle and validation paths**

```ts
// apps/api/src/features/api-token/api-token.service.spec.ts
import * as utils from '@/common/utils';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiToken } from './entities/api-token.entity';
import { ApiTokenService } from './api-token.service';

describe('ApiTokenService', () => {
  let service: ApiTokenService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokenService,
        { provide: getRepositoryToken(ApiToken), useValue: repo },
      ],
    }).compile();
    service = module.get(ApiTokenService);
  });

  it('create() returns plain token once and stores derived metadata', async () => {
    repo.create.mockImplementation((input: any) => ({
      id: 'id_1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...input,
    }));
    repo.save.mockResolvedValue(undefined);

    const result = await service.create('user_1', {
      name: 'CLI',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    expect(result.name).toBe('CLI');
    expect(result.token).toHaveLength(64);
    expect(result.lastChars).toBe(result.token.slice(-4));
  });

  it('remove() throws when token does not belong to user', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove('missing', 'user_1')).rejects.toThrow(
      'Token not found',
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('validateToken() skips expired tokens and returns sanitized user for valid token', async () => {
    const validateSpy = jest.spyOn(utils, 'validateString');
    repo.find.mockResolvedValue([
      {
        token: 'expired',
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        user: { id: 'u1', email: 'a@b.com', password: 'secret' },
      },
      {
        token: 'active',
        expiresAt: new Date('2999-01-01T00:00:00.000Z'),
        user: { id: 'u2', email: 'u2@b.com', password: 'secret2' },
      },
    ]);
    validateSpy.mockResolvedValueOnce(true as never);

    const result = await service.validateToken('raw-token');

    expect(result).toEqual({ id: 'u2', email: 'u2@b.com' });
    expect((result as any).password).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run single spec to verify expected fail**

Run: `pnpm --filter=api test -- api-token.service.spec.ts --runInBand`
Expected: FAIL initially due to mock typing/order details.

- [ ] **Step 3: Make tests deterministic and pass**

```ts
// refine the same spec:
// - use jest.spyOn(utils, 'validateString').mockResolvedValue(...) per token order
// - add explicit assertion that expired token is skipped (validateString called once)
// - add validateToken() null-path test when no token matches
```

- [ ] **Step 4: Run targeted and full API coverage**

Run: `pnpm --filter=api test -- api-token.service.spec.ts --runInBand`
Expected: PASS

Run: `pnpm --filter=api test:cov`
Expected: PASS with API metrics >=80 for all four metrics.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/api/src/features/api-token/api-token.service.spec.ts
git commit -m "test(api): cover api token service branches"
```

---

### Task 4: Raise Web coverage with auth helper tests

**Files:**

- Create: `apps/web/lib/auth/jwt-callback.test.ts`
- Create: `apps/web/lib/auth/session-callback.test.ts`
- Create: `apps/web/lib/auth/is-authorized.test.ts`
- Test: `apps/web/lib/auth/jwt-callback.ts`
- Test: `apps/web/lib/auth/session-callback.ts`
- Test: `apps/web/lib/auth/is-authorized.ts`

- [ ] **Step 1: Write failing tests for `jwtCallback` branches**

```ts
// apps/web/lib/auth/jwt-callback.test.ts
import { describe, expect, it } from 'vitest';
import { jwtCallback } from './jwt-callback';

describe('jwtCallback', () => {
  it('merges token.user with session.user on update trigger', () => {
    const token: any = { user: { id: '1', email: 'old@mail.com' } };
    const session: any = { user: { email: 'new@mail.com', username: 'neo' } };

    const result = jwtCallback({
      token,
      user: {} as any,
      trigger: 'update',
      session,
    });
    expect(result.user.email).toBe('new@mail.com');
    expect(result.user.username).toBe('neo');
  });

  it('maps user payload on signIn trigger', () => {
    const token: any = {};
    const user: any = {
      id: '2',
      email: 'u@x.dev',
      username: 'u2',
      isEmailVerified: true,
      emailVerifiedAt: null,
      createdAt: 'c',
      updatedAt: 'u',
      profile: {},
      tokens: [],
    };
    const result = jwtCallback({
      token,
      user,
      trigger: 'signIn',
      session: { user: {} } as any,
    });
    expect(result.user.id).toBe('2');
    expect(result.user.email).toBe('u@x.dev');
  });

  it('returns original token for unknown trigger', () => {
    const token: any = { keep: true };
    const result = jwtCallback({
      token,
      user: null as any,
      trigger: undefined as any,
      session: { user: {} } as any,
    });
    expect(result).toEqual(token);
  });
});
```

- [ ] **Step 2: Write failing tests for `sessionCallback` and `isAuthorized`**

```ts
// apps/web/lib/auth/session-callback.test.ts
import { describe, expect, it } from 'vitest';
import { sessionCallback } from './session-callback';

describe('sessionCallback', () => {
  it('maps token.user fields into session.user', () => {
    const session: any = { user: { id: 's' } };
    const token: any = {
      user: {
        id: '1',
        email: 'x@y.z',
        username: 'x',
        isEmailVerified: true,
        emailVerifiedAt: null,
        createdAt: 'c',
        updatedAt: 'u',
        profile: {},
        tokens: [],
      },
    };
    const result = sessionCallback({ session, token });
    expect(result.user.id).toBe('1');
    expect(result.user.email).toBe('x@y.z');
  });

  it('returns existing session when token is falsy', () => {
    const session: any = { user: { id: 's' } };
    const result = sessionCallback({ session, token: null as any });
    expect(result).toBe(session);
  });
});
```

```ts
// apps/web/lib/auth/is-authorized.test.ts
import { describe, expect, it } from 'vitest';
import { isAuthorized } from './is-authorized';

const req = (pathname: string) =>
  ({
    nextUrl: new URL(`http://localhost${pathname}`),
  }) as any;

describe('isAuthorized', () => {
  it('allows assets without auth', () => {
    expect(isAuthorized({ request: req('/assets/logo.png'), auth: null })).toBe(
      true,
    );
  });

  it('redirects unauthenticated user from protected path to sign-in', () => {
    const res = isAuthorized({ request: req('/'), auth: null }) as Response;
    expect(res.headers.get('location')).toContain('/auth/sign-in');
  });

  it('redirects authenticated but unverified user to confirm-email', () => {
    const auth: any = { user: { isEmailVerified: false } };
    const res = isAuthorized({ request: req('/admin'), auth }) as Response;
    expect(res.headers.get('location')).toContain('/auth/confirm-email');
  });

  it('redirects verified user away from auth pages to home', () => {
    const auth: any = { user: { isEmailVerified: true } };
    const res = isAuthorized({
      request: req('/auth/sign-in'),
      auth,
    }) as Response;
    expect(res.headers.get('location')).toBe('http://localhost/');
  });
});
```

- [ ] **Step 3: Run specific tests and fix import/mocking issues**

Run: `pnpm --filter=web test -- lib/auth/jwt-callback.test.ts lib/auth/session-callback.test.ts lib/auth/is-authorized.test.ts`
Expected: FAIL initially, then PASS after adjusting request/auth fixture shapes.

- [ ] **Step 4: Re-run all web tests**

Run: `pnpm --filter=web test`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/web/lib/auth/jwt-callback.test.ts apps/web/lib/auth/session-callback.test.ts apps/web/lib/auth/is-authorized.test.ts
git commit -m "test(web): cover auth callback and authorization branches"
```

---

### Task 5: Raise Web coverage with device utility tests

**Files:**

- Create: `apps/web/lib/device.test.ts`
- Test: `apps/web/lib/device.ts`

- [ ] **Step 1: Write failing tests for getLocationFromIp and getDeviceInfo**

```ts
// apps/web/lib/device.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((k: string) =>
      k === 'user-agent' ? 'Mozilla/5.0 (iPhone)' : null,
    ),
  })),
}));

import { getDeviceInfo, getLocationFromIp } from './device';

describe('device utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unknown location when ipinfo response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(getLocationFromIp()).resolves.toEqual({
      ip: 'unknown',
      location: 'unknown',
    });
  });

  it('returns ip and city/region when ipinfo succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ip: '1.2.3.4', city: 'Yangon', region: 'MM' }),
      }),
    );
    await expect(getLocationFromIp()).resolves.toEqual({
      ip: '1.2.3.4',
      location: 'Yangon/MM',
    });
  });

  it('builds device info from headers + location', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ip: '8.8.8.8', city: 'NY', region: 'US' }),
      }),
    );
    const result = await getDeviceInfo();
    expect(result.ip).toBe('8.8.8.8');
    expect(result.location).toBe('NY/US');
    expect(result.userAgent).toContain('Mozilla');
  });
});
```

- [ ] **Step 2: Run targeted web tests and fix any environment mismatch**

Run: `pnpm --filter=web test -- lib/device.test.ts`
Expected: FAIL first if `fetch`/headers mocks are incomplete; then PASS once fixture shape matches usage.

- [ ] **Step 3: Run web coverage with thresholds**

Run: `pnpm --filter=web test:cov`
Expected: PASS with all four metrics >=80.

- [ ] **Step 4: Commit Task 5**

```bash
git add apps/web/lib/device.test.ts
git commit -m "test(web): add deterministic device utility coverage"
```

---

### Task 6: Final verification and enforcement proof

**Files:**

- Modify (if needed): `apps/api/jest.config.ts`
- Modify (if needed): `apps/web/vitest.config.ts`

- [ ] **Step 1: Run full per-app coverage commands from root**

Run: `pnpm test:cov:api`
Expected: PASS with `lines/statements/functions/branches >= 80%`.

Run: `pnpm test:cov:web`
Expected: PASS with `lines/statements/functions/branches >= 80%`.

- [ ] **Step 2: Run aggregate coverage command**

Run: `pnpm test:cov`
Expected: PASS (both apps complete successfully in sequence).

- [ ] **Step 3: Verify guardrails actually enforce failures**

```bash
# Temporary local check (do not commit):
# set one threshold to 99 in apps/web/vitest.config.ts and run pnpm test:cov:web
# restore threshold back to 80 immediately after check
```

Expected: FAIL at 99 and PASS again at 80, proving threshold enforcement is active.

- [ ] **Step 4: Commit final adjustments**

```bash
git add apps/api/jest.config.ts apps/web/vitest.config.ts apps/web/package.json package.json
git commit -m "chore(test): enforce and verify 80 percent per-app coverage"
```

---

## Self-Review (Plan vs Spec)

- Spec coverage check: covered per-app thresholding, deterministic tests, branch-focused expansion, scripts, and verification.
- Placeholder scan: no TBD/TODO placeholders remain; each task has explicit files, commands, and code.
- Type consistency check: all referenced functions and file paths map to existing modules (`LocaleService`, `ApiTokenService`, `jwtCallback`, `sessionCallback`, `isAuthorized`, `getDeviceInfo`, `getLocationFromIp`).
