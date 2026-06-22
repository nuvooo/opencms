# Plugin Core/User Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace seeded in-memory plugin definitions with filesystem-driven core/user plugins, including install, rescan, and uninstall lifecycle while keeping core plugins immutable.

**Architecture:** The API becomes the source of truth by scanning `apps/api/core/plugins` and `apps/api/plugins` manifest folders into a registry. Core plugins are marked by source and are always enabled, undeletable, and untoggleable. The web admin plugin page consumes new lifecycle endpoints and separates system plugins from installed user plugins.

**Tech Stack:** NestJS (Fastify), TypeScript, Jest, Next.js App Router, Zod, Vitest, shadcn UI.

---

## File Structure

- `apps/api/src/features/plugin/plugin-loader.service.ts` - filesystem scanner + manifest validation.
- `apps/api/src/features/plugin/plugin.registry.types.ts` - shared API plugin contracts.
- `apps/api/src/features/plugin/plugin-registry.service.ts` - in-memory registry hydrated from loader + lifecycle operations.
- `apps/api/src/features/plugin/plugin.controller.ts` - list/install/rescan/delete endpoints.
- `apps/api/src/features/plugin/plugin.module.ts` - DI wiring for loader + registry.
- `apps/api/src/features/plugin/plugin-loader.service.spec.ts` - loader behavior tests.
- `apps/api/src/features/plugin/plugin-registry.service.spec.ts` - immutability/lifecycle tests.
- `apps/api/src/features/plugin/plugin.controller.spec.ts` - endpoint behavior tests.
- `apps/api/core/plugins/**/manifest.json` - system plugins as individual manifests.
- `apps/web/server/plugin.schema.ts` - new `source` metadata in client contract.
- `apps/web/server/plugin.server.ts` - server actions for install/rescan/delete.
- `apps/web/app/admin/plugins/page.tsx` - grouped UI + install/delete/rescan actions.
- `apps/web/lib/plugin/types.ts` - frontend plugin type alignment.

---

### Task 1: Add API plugin contracts and filesystem loader

**Files:**

- Create: `apps/api/src/features/plugin/plugin.registry.types.ts`
- Create: `apps/api/src/features/plugin/plugin-loader.service.ts`
- Create: `apps/api/src/features/plugin/plugin-loader.service.spec.ts`

- [ ] **Step 1: Write the failing loader tests**

```ts
// apps/api/src/features/plugin/plugin-loader.service.spec.ts
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PluginLoaderService } from './plugin-loader.service';

describe('PluginLoaderService', () => {
  it('loads core and user manifests and tags source', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));
    mkdirSync(join(root, 'core/plugins/dashboard'), { recursive: true });
    mkdirSync(join(root, 'plugins/seo-tools'), { recursive: true });

    writeFileSync(
      join(root, 'core/plugins/dashboard/manifest.json'),
      JSON.stringify({
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core dashboard',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [
          { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
        ],
      }),
    );

    writeFileSync(
      join(root, 'plugins/seo-tools/manifest.json'),
      JSON.stringify({
        id: 'seo-tools',
        name: 'SEO Tools',
        description: 'User plugin',
        version: '0.1.0',
        icon: 'WandSparkles',
        navItems: [{ path: '/admin/seo', label: 'SEO', icon: 'WandSparkles' }],
      }),
    );

    const loader = new PluginLoaderService(root);
    const plugins = loader.loadAll();

    expect(plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dashboard',
          source: 'core',
          isSystem: true,
          enabled: true,
        }),
        expect.objectContaining({
          id: 'seo-tools',
          source: 'user',
          isSystem: false,
        }),
      ]),
    );

    rmSync(root, { recursive: true, force: true });
  });

  it('ignores user plugin ids that collide with core plugins', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));
    mkdirSync(join(root, 'core/plugins/media'), { recursive: true });
    mkdirSync(join(root, 'plugins/media'), { recursive: true });

    const manifest = {
      id: 'media',
      name: 'Media',
      description: 'Media plugin',
      version: '1.0.0',
      icon: 'ImageIcon',
      navItems: [{ path: '/admin/media', label: 'Media', icon: 'ImageIcon' }],
    };

    writeFileSync(
      join(root, 'core/plugins/media/manifest.json'),
      JSON.stringify(manifest),
    );
    writeFileSync(
      join(root, 'plugins/media/manifest.json'),
      JSON.stringify(manifest),
    );

    const loader = new PluginLoaderService(root);
    const plugins = loader.loadAll();

    expect(plugins.filter((plugin) => plugin.id === 'media')).toHaveLength(1);
    expect(plugins.find((plugin) => plugin.id === 'media')?.source).toBe(
      'core',
    );

    rmSync(root, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter api test -- plugin-loader.service.spec.ts --runInBand`
Expected: FAIL with module/file-not-found errors for the new loader/types files.

- [ ] **Step 3: Implement plugin contracts**

```ts
// apps/api/src/features/plugin/plugin.registry.types.ts
export type PluginSource = 'core' | 'user';

export interface PluginNavItem {
  path: string;
  label: string;
  icon: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  navItems: PluginNavItem[];
}

export interface PluginDescriptor extends PluginManifest {
  source: PluginSource;
  isSystem: boolean;
  enabled: boolean;
}
```

- [ ] **Step 4: Implement plugin loader service**

```ts
// apps/api/src/features/plugin/plugin-loader.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import {
  PluginDescriptor,
  PluginManifest,
  PluginSource,
} from './plugin.registry.types';

const PluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  icon: z.string().min(1),
  navItems: z.array(
    z.object({
      path: z.string().min(1),
      label: z.string().min(1),
      icon: z.string().min(1),
    }),
  ),
});

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);

  constructor(private readonly rootDir: string = process.cwd()) {}

  loadAll(): PluginDescriptor[] {
    const core = this.loadFromSource(
      'core',
      join(this.rootDir, 'apps/api/core/plugins'),
    );
    const coreIds = new Set(core.map((plugin) => plugin.id));
    const user = this.loadFromSource(
      'user',
      join(this.rootDir, 'apps/api/plugins'),
    ).filter((plugin) => {
      if (coreIds.has(plugin.id)) {
        this.logger.warn(
          `Ignoring user plugin with reserved core id: ${plugin.id}`,
        );
        return false;
      }
      return true;
    });

    return [...core, ...user];
  }

  private loadFromSource(
    source: PluginSource,
    baseDir: string,
  ): PluginDescriptor[] {
    if (!existsSync(baseDir)) return [];

    return readdirSync(baseDir)
      .map((folder) => join(baseDir, folder, 'manifest.json'))
      .filter((path) => existsSync(path))
      .map((manifestPath) => this.readManifest(manifestPath, source));
  }

  private readManifest(
    manifestPath: string,
    source: PluginSource,
  ): PluginDescriptor {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const manifest: PluginManifest = PluginManifestSchema.parse(raw);

    return {
      ...manifest,
      source,
      isSystem: source === 'core',
      enabled: true,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter api test -- plugin-loader.service.spec.ts --runInBand`
Expected: PASS, both loader test cases green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/plugin/plugin.registry.types.ts apps/api/src/features/plugin/plugin-loader.service.ts apps/api/src/features/plugin/plugin-loader.service.spec.ts
git commit -m "feat(api): add filesystem plugin loader contracts"
```

---

### Task 2: Refactor registry to loader-backed lifecycle with core immutability

**Files:**

- Modify: `apps/api/src/features/plugin/plugin-registry.service.ts`
- Create: `apps/api/src/features/plugin/plugin-registry.service.spec.ts`

- [ ] **Step 1: Write failing registry tests**

```ts
// apps/api/src/features/plugin/plugin-registry.service.spec.ts
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginRegistryService', () => {
  const loaderStub = {
    loadAll: jest.fn(),
  } as unknown as PluginLoaderService;

  beforeEach(() => {
    (loaderStub.loadAll as jest.Mock).mockReset();
  });

  it('hydrates plugins from loader on bootstrap', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [],
        source: 'core',
        isSystem: true,
        enabled: true,
      },
    ]);

    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get('dashboard')?.isSystem).toBe(true);
  });

  it('rejects delete for core plugins', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [],
        source: 'core',
        isSystem: true,
        enabled: true,
      },
    ]);

    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(() => registry.assertRemovable('dashboard')).toThrow(
      ForbiddenException,
    );
  });

  it('throws for unknown plugin id on delete precheck', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([]);
    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(() => registry.assertRemovable('missing')).toThrow(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter api test -- plugin-registry.service.spec.ts --runInBand`
Expected: FAIL because registry service does not yet use loader-based APIs.

- [ ] **Step 3: Implement loader-backed registry**

```ts
// apps/api/src/features/plugin/plugin-registry.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginDescriptor } from './plugin.registry.types';

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private plugins = new Map<string, PluginDescriptor>();

  constructor(private readonly loader: PluginLoaderService) {}

  onModuleInit(): void {
    this.rescan();
  }

  rescan(): PluginDescriptor[] {
    const loaded = this.loader.loadAll();
    this.plugins = new Map(loaded.map((plugin) => [plugin.id, plugin]));
    return this.getAll();
  }

  getAll(): PluginDescriptor[] {
    return Array.from(this.plugins.values());
  }

  get(id: string): PluginDescriptor | undefined {
    return this.plugins.get(id);
  }

  assertRemovable(id: string): PluginDescriptor {
    const plugin = this.get(id);
    if (!plugin) throw new BadRequestException('Plugin not found');
    if (plugin.source === 'core')
      throw new ForbiddenException('System plugins cannot be deleted');
    return plugin;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter api test -- plugin-registry.service.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/plugin/plugin-registry.service.ts apps/api/src/features/plugin/plugin-registry.service.spec.ts
git commit -m "refactor(api): hydrate plugin registry from filesystem loader"
```

---

### Task 3: Add install/rescan/delete endpoints and remove toggle endpoint

**Files:**

- Modify: `apps/api/src/features/plugin/plugin.controller.ts`
- Modify: `apps/api/src/features/plugin/plugin.module.ts`
- Create: `apps/api/src/features/plugin/plugin-files.service.ts`
- Create: `apps/api/src/features/plugin/plugin.controller.spec.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add ZIP dependency for extraction**

Run: `pnpm --filter api add adm-zip`
Expected: package installed in `apps/api/package.json`.

- [ ] **Step 2: Write failing controller tests for lifecycle routes**

```ts
// apps/api/src/features/plugin/plugin.controller.spec.ts
import { Test } from '@nestjs/testing';
import { PluginController } from './plugin.controller';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginFilesService } from './plugin-files.service';

describe('PluginController', () => {
  it('returns plugins list', async () => {
    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: { getAll: () => [{ id: 'dashboard' }] },
        },
        {
          provide: PluginFilesService,
          useValue: { installFromZip: jest.fn(), uninstall: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    expect(controller.findAll()).toEqual({
      message: 'Plugins fetched successfully',
      data: [{ id: 'dashboard' }],
    });
  });

  it('rescans plugins', async () => {
    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: { rescan: () => [{ id: 'dashboard' }] },
        },
        {
          provide: PluginFilesService,
          useValue: { installFromZip: jest.fn(), uninstall: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    expect(controller.rescan()).toEqual({
      message: 'Plugins rescanned successfully',
      data: [{ id: 'dashboard' }],
    });
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter api test -- plugin.controller.spec.ts --runInBand`
Expected: FAIL because new services/routes are not implemented.

- [ ] **Step 4: Implement plugin file lifecycle service**

```ts
// apps/api/src/features/plugin/plugin-files.service.ts
import { Injectable } from '@nestjs/common';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const UploadManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  icon: z.string().min(1),
  navItems: z.array(
    z.object({ path: z.string(), label: z.string(), icon: z.string() }),
  ),
});

@Injectable()
export class PluginFilesService {
  private readonly userPluginsDir = join(process.cwd(), 'apps/api/plugins');

  installFromZip(file: MemoryStorageFile): string {
    const zip = new AdmZip(file.buffer);
    const manifestEntry = zip
      .getEntries()
      .find((entry) => entry.entryName.endsWith('manifest.json'));
    if (!manifestEntry)
      throw new Error('Invalid plugin package: manifest.json missing');

    const manifest = UploadManifestSchema.parse(
      JSON.parse(manifestEntry.getData().toString('utf-8')),
    );
    const target = join(this.userPluginsDir, manifest.id);

    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const relative = entry.entryName.includes('/')
        ? entry.entryName.split('/').slice(1).join('/')
        : entry.entryName;
      if (!relative) continue;
      const outPath = join(target, relative);
      mkdirSync(join(outPath, '..'), { recursive: true });
      writeFileSync(outPath, entry.getData());
    }

    if (!existsSync(join(target, 'manifest.json')))
      throw new Error('Invalid plugin package: root manifest missing');
    return manifest.id;
  }

  uninstall(id: string): void {
    rmSync(join(this.userPluginsDir, id), { recursive: true, force: true });
  }
}
```

- [ ] **Step 5: Implement controller/module updates**

```ts
// apps/api/src/features/plugin/plugin.controller.ts
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, MemoryStorageFile } from '@blazity/nest-file-fastify';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PluginFilesService } from './plugin-files.service';
import { PluginRegistryService } from './plugin-registry.service';

@ApiTags('plugins')
@ApiBearerAuth()
@Controller('plugins')
export class PluginController {
  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly pluginFiles: PluginFilesService,
  ) {}

  @Get()
  findAll() {
    return {
      message: 'Plugins fetched successfully',
      data: this.pluginRegistry.getAll(),
    };
  }

  @Post('install')
  @UseInterceptors(FileInterceptor('file'))
  install(@UploadedFile() file: MemoryStorageFile) {
    const id = this.pluginFiles.installFromZip(file);
    const data = this.pluginRegistry.rescan();
    return { message: `Plugin ${id} installed successfully`, data };
  }

  @Post('rescan')
  rescan() {
    return {
      message: 'Plugins rescanned successfully',
      data: this.pluginRegistry.rescan(),
    };
  }

  @Delete(':id')
  uninstall(@Param('id') id: string) {
    this.pluginRegistry.assertRemovable(id);
    this.pluginFiles.uninstall(id);
    const data = this.pluginRegistry.rescan();
    return { message: 'Plugin removed successfully', data };
  }
}
```

```ts
// apps/api/src/features/plugin/plugin.module.ts
import { Global, Module } from '@nestjs/common';
import { PluginController } from './plugin.controller';
import { PluginFilesService } from './plugin-files.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';

@Global()
@Module({
  controllers: [PluginController],
  providers: [PluginRegistryService, PluginLoaderService, PluginFilesService],
  exports: [PluginRegistryService],
})
export class PluginModule {}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter api test -- plugin.controller.spec.ts --runInBand`
Expected: PASS.

Run: `pnpm --filter api exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/src/features/plugin/plugin.controller.ts apps/api/src/features/plugin/plugin.module.ts apps/api/src/features/plugin/plugin-files.service.ts apps/api/src/features/plugin/plugin.controller.spec.ts
git commit -m "feat(api): add plugin install rescan uninstall endpoints"
```

---

### Task 4: Move seeded plugins into `core/plugins` manifests and remove seeder

**Files:**

- Delete: `apps/api/src/features/plugin/plugin-seeder.ts`
- Modify: `apps/api/src/features/plugin/plugin.module.ts`
- Create: `apps/api/core/plugins/dashboard/manifest.json`
- Create: `apps/api/core/plugins/entries/manifest.json`
- Create: `apps/api/core/plugins/content-types/manifest.json`
- Create: `apps/api/core/plugins/media/manifest.json`
- Create: `apps/api/core/plugins/locales/manifest.json`
- Create: `apps/api/core/plugins/tenants/manifest.json`
- Create: `apps/api/core/plugins/plugins/manifest.json`
- Create: `apps/api/core/plugins/api-tokens/manifest.json`

- [ ] **Step 1: Write one failing integration-ish test for bootstrap load**

```ts
// append to apps/api/src/features/plugin/plugin-registry.service.spec.ts
it('loads built-in dashboard plugin from core manifests', () => {
  const loader = {
    loadAll: () => [
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'CMS overview and statistics.',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [
          { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
        ],
        source: 'core' as const,
        isSystem: true,
        enabled: true,
      },
    ],
  } as any;

  const registry = new PluginRegistryService(loader);
  registry.onModuleInit();
  expect(registry.get('dashboard')).toBeDefined();
});
```

- [ ] **Step 2: Add core manifests**

```json
// apps/api/core/plugins/dashboard/manifest.json
{
  "id": "dashboard",
  "name": "Dashboard",
  "description": "CMS overview and statistics.",
  "version": "1.0.0",
  "icon": "LayoutDashboard",
  "navItems": [
    { "path": "/admin", "label": "Dashboard", "icon": "LayoutDashboard" }
  ]
}
```

```json
// apps/api/core/plugins/entries/manifest.json
{
  "id": "entries",
  "name": "Entries",
  "description": "Manage content entries.",
  "version": "1.0.0",
  "icon": "FileText",
  "navItems": [
    { "path": "/admin/entries", "label": "Entries", "icon": "FileText" }
  ]
}
```

```json
// apps/api/core/plugins/content-types/manifest.json
{
  "id": "content-types",
  "name": "Content Types",
  "description": "Define content schemas.",
  "version": "1.0.0",
  "icon": "FileType",
  "navItems": [
    {
      "path": "/admin/content-types",
      "label": "Content Types",
      "icon": "FileType"
    }
  ]
}
```

```json
// apps/api/core/plugins/media/manifest.json
{
  "id": "media",
  "name": "Media",
  "description": "Upload and manage media files.",
  "version": "1.0.0",
  "icon": "ImageIcon",
  "navItems": [
    { "path": "/admin/media", "label": "Media", "icon": "ImageIcon" }
  ]
}
```

```json
// apps/api/core/plugins/locales/manifest.json
{
  "id": "locales",
  "name": "Locales",
  "description": "Manage languages.",
  "version": "1.0.0",
  "icon": "Languages",
  "navItems": [
    { "path": "/admin/locales", "label": "Locales", "icon": "Languages" }
  ]
}
```

```json
// apps/api/core/plugins/tenants/manifest.json
{
  "id": "tenants",
  "name": "Tenants",
  "description": "Manage multi-tenant environments.",
  "version": "1.0.0",
  "icon": "Building2",
  "navItems": [
    { "path": "/admin/tenants", "label": "Tenants", "icon": "Building2" }
  ]
}
```

```json
// apps/api/core/plugins/plugins/manifest.json
{
  "id": "plugins",
  "name": "Plugins",
  "description": "Manage system plugins and marketplace.",
  "version": "1.0.0",
  "icon": "Puzzle",
  "navItems": [
    { "path": "/admin/plugins", "label": "Plugins", "icon": "Puzzle" }
  ]
}
```

```json
// apps/api/core/plugins/api-tokens/manifest.json
{
  "id": "api-tokens",
  "name": "API Tokens",
  "description": "Manage API tokens for programmatic access.",
  "version": "1.0.0",
  "icon": "KeyRound",
  "navItems": [
    { "path": "/admin/api-tokens", "label": "API Tokens", "icon": "KeyRound" }
  ]
}
```

- [ ] **Step 3: Remove seeder from module and codebase**

```ts
// apps/api/src/features/plugin/plugin.module.ts
@Module({
  controllers: [PluginController],
  providers: [PluginRegistryService, PluginLoaderService, PluginFilesService],
  exports: [PluginRegistryService],
})
export class PluginModule {}
```

Delete file:

```text
apps/api/src/features/plugin/plugin-seeder.ts
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter api test -- plugin-loader.service.spec.ts plugin-registry.service.spec.ts --runInBand`
Expected: PASS.

Run: `pnpm --filter api exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/core/plugins apps/api/src/features/plugin/plugin.module.ts apps/api/src/features/plugin/plugin-registry.service.spec.ts
git rm apps/api/src/features/plugin/plugin-seeder.ts
git commit -m "refactor(api): move system plugins into core manifest folders"
```

---

### Task 5: Update web plugin contracts and server actions for lifecycle endpoints

**Files:**

- Modify: `apps/web/server/plugin.schema.ts`
- Modify: `apps/web/server/plugin.server.ts`
- Modify: `apps/web/lib/plugin/types.ts`

- [ ] **Step 1: Write failing web unit tests for new server actions**

```ts
// append to apps/web/lib/safeFetch.test.ts
import { describe, expect, it } from 'vitest';

describe('plugin schema contract', () => {
  it('accepts plugin source metadata', async () => {
    const { PluginDescriptorSchema } = await import('@/server/plugin.schema');
    const parsed = PluginDescriptorSchema.parse({
      id: 'dashboard',
      name: 'Dashboard',
      description: 'CMS overview and statistics.',
      version: '1.0.0',
      icon: 'LayoutDashboard',
      source: 'core',
      isSystem: true,
      enabled: true,
      navItems: [],
    });
    expect(parsed.source).toBe('core');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter web test -- safeFetch.test.ts`
Expected: FAIL because `source` does not exist in plugin schema yet.

- [ ] **Step 3: Extend plugin schema/types**

```ts
// apps/web/server/plugin.schema.ts
export const PluginDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  icon: z.string(),
  source: z.enum(['core', 'user']),
  isSystem: z.boolean(),
  enabled: z.boolean(),
  navItems: z.array(PluginNavItemSchema),
});
```

```ts
// apps/web/lib/plugin/types.ts
export interface PluginDescriptor {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  source: 'core' | 'user';
  isSystem: boolean;
  enabled: boolean;
  navItems: PluginNavItem[];
}
```

- [ ] **Step 4: Replace toggle action with install/rescan/delete actions**

```ts
// apps/web/server/plugin.server.ts
const PluginsResponseSchema = z.object({
  data: z.array(PluginDescriptorSchema),
});

export const installPlugin = async (
  formData: FormData,
): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    '/plugins/install',
    {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const rescanPlugins = async (): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    '/plugins/rescan',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const uninstallPlugin = async (
  id: string,
): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    `/plugins/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter web test -- safeFetch.test.ts`
Expected: PASS.

Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/server/plugin.schema.ts apps/web/server/plugin.server.ts apps/web/lib/plugin/types.ts apps/web/lib/safeFetch.test.ts
git commit -m "feat(web): align plugin server actions with lifecycle endpoints"
```

---

### Task 6: Redesign admin plugin page for system/user grouping and lifecycle actions

**Files:**

- Modify: `apps/web/app/admin/plugins/page.tsx`

- [ ] **Step 1: Write failing component test for system/user action visibility**

```tsx
// create apps/web/app/admin/plugins/page.test.tsx
import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Admin Plugins Page', () => {
  it('shows delete button only for user plugins', async () => {
    render(<Page />);
    expect(await screen.findByText('Plugins')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter web test -- app/admin/plugins/page.test.tsx`
Expected: FAIL until action injection/mocks are added during implementation.

- [ ] **Step 3: Implement grouped UI and lifecycle handlers**

```tsx
// apps/web/app/admin/plugins/page.tsx (core changes)
import {
  getPlugins,
  installPlugin,
  rescanPlugins,
  uninstallPlugin,
} from '@/server/plugin.server';

const [uploading, setUploading] = useState(false);

const systemPlugins = plugins.filter((plugin) => plugin.source === 'core');
const userPlugins = plugins.filter((plugin) => plugin.source === 'user');

const handleInstall = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const body = new FormData();
  body.append('file', file);
  setUploading(true);
  try {
    const next = await installPlugin(body);
    setPlugins(next);
    toast.success('Plugin installed');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Install failed');
  } finally {
    setUploading(false);
  }
};

const handleRescan = async () => {
  const next = await rescanPlugins();
  setPlugins(next);
};

const handleDelete = async (id: string) => {
  const next = await uninstallPlugin(id);
  setPlugins(next);
};
```

- [ ] **Step 4: Render explicit sections**

```tsx
// apps/web/app/admin/plugins/page.tsx (render structure)
<div className="flex items-center gap-2">
  <Button onClick={handleRescan} variant="outline">Rescan</Button>
  <label className="inline-flex items-center gap-2 text-sm">
    <input type="file" accept=".zip" onChange={handleInstall} disabled={uploading} />
  </label>
</div>

<section className="space-y-3">
  <h2 className="text-xl font-semibold">System Plugins</h2>
  {systemPlugins.map((plugin) => (
    <Card key={plugin.id}>
      <CardHeader>
        <CardTitle>{plugin.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="outline">System</Badge>
      </CardContent>
    </Card>
  ))}
</section>

<section className="space-y-3">
  <h2 className="text-xl font-semibold">Installed Plugins</h2>
  {userPlugins.map((plugin) => (
    <Card key={plugin.id}>
      <CardHeader>
        <CardTitle>{plugin.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" size="sm" onClick={() => handleDelete(plugin.id)}>
          Delete
        </Button>
      </CardContent>
    </Card>
  ))}
</section>
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter web test -- app/admin/plugins/page.test.tsx`
Expected: PASS.

Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/plugins/page.tsx apps/web/app/admin/plugins/page.test.tsx
git commit -m "feat(web): add grouped plugin lifecycle admin UI"
```

---

### Task 7: Full verification across API and Web

**Files:**

- Modify: none
- Test: `apps/api/src/features/plugin/*.spec.ts`
- Test: `apps/web/lib/safeFetch.test.ts`
- Test: `apps/web/app/admin/plugins/page.test.tsx`

- [ ] **Step 1: Run plugin API tests**

Run: `pnpm --filter api test -- plugin-loader.service.spec.ts plugin-registry.service.spec.ts plugin.controller.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 2: Run API typecheck**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run web tests**

Run: `pnpm --filter web test -- safeFetch.test.ts app/admin/plugins/page.test.tsx`
Expected: PASS.

- [ ] **Step 4: Run web typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Final commit for any verification fixes**

```bash
git add -A
git commit -m "test: verify plugin core-user lifecycle behavior end-to-end"
```

---

## Spec Coverage Check

- Core plugins loaded individually from `apps/api/core/plugins` -> Task 1 + Task 4.
- User plugins loaded individually from `apps/api/plugins` -> Task 1.
- Install via ZIP and manual copy + rescan -> Task 3 + Task 6.
- User uninstall removes code only -> Task 3.
- System plugins not deletable/disableable -> Task 2 + Task 3 + Task 6.
- UI separation for system vs installed -> Task 6.
- Automated tests for loader/lifecycle/UI behavior -> Tasks 1, 2, 3, 6, 7.
