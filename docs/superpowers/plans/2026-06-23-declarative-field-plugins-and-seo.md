# Declarative Field Plugins + SEO Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic, declarative field-plugin engine to OpenCMS and ship an SEO plugin that injects SEO fields into selected content types.

**Architecture:** A plugin manifest gains an optional `fieldGroup` declaration. A new Core service (`PluginFieldService`) injects/removes those declared fields into `content_type.fields` per tenant, tagging each injected field with `source`/`locked` so it is identifiable, non-destructively removable, and protected in the field editor. Generic tenant-scoped endpoints under `/api/plugins/:id/field-targets` and a generic admin page (reached via the plugin's nav item, `/admin/seo` for SEO) drive the selection. The SEO plugin itself is a manifest-only package.

**Tech Stack:** NestJS 11 (Fastify, TypeORM, Zod, Jest) on the API; Next.js 15 / React 19 / Zod / Vitest / shadcn on the web.

---

## File Structure

**API (`apps/api`)**

- Modify `src/features/plugin/plugin.registry.types.ts` — add `PluginManifestField`, `PluginFieldGroup`; add optional `fieldGroup` to `PluginManifest`.
- Modify `src/features/plugin/plugin-loader.service.ts` — extend `PluginManifestSchema` with optional `fieldGroup`.
- Modify `src/features/plugin/plugin-files.service.ts` — extend `UploadManifestSchema` with optional `fieldGroup`.
- Create `src/features/plugin/plugin-field.service.ts` — the injection engine.
- Create `src/features/plugin/plugin-field.service.spec.ts` — engine tests.
- Create `src/features/plugin/dto/apply-field-target.dto.ts` — request body DTO.
- Create `src/features/plugin/plugin-field.controller.ts` — generic tenant-scoped endpoints.
- Modify `src/content-types/content-types.module.ts` — export `ContentTypesService`.
- Modify `src/features/plugin/plugin.module.ts` — import `ContentTypesModule`, register service + controller.

**Web (`apps/web`)**

- Modify `types/content-type.type.ts` — add `source`/`locked` to `FieldOptionsSchema`.
- Create `server/plugin-field.server.ts` — server actions `getFieldTargets`, `setFieldTarget`.
- Create `app/admin/seo/page.tsx` — generic field-group manager page (wired for `seo`).
- Create `app/admin/seo/page.test.tsx` — page test.
- Modify `app/admin/content-types/[id]/edit/page.tsx` — protect `locked` fields from edit/remove.

**Plugin package (repo root)**

- Create `plugins/seo/manifest.json` — the SEO plugin manifest with the full field group.

**Docs**

- Modify `docs/plugin-development.md` — document the `fieldGroup` manifest extension.

---

## Task 1: Manifest types + loader schema accept `fieldGroup`

**Files:**

- Modify: `apps/api/src/features/plugin/plugin.registry.types.ts`
- Modify: `apps/api/src/features/plugin/plugin-loader.service.ts`
- Test: `apps/api/src/features/plugin/plugin-loader.service.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/features/plugin/plugin-loader.service.spec.ts`:

```ts
import { PluginLoaderService } from './plugin-loader.service';

// Access the private Zod schema via a tiny manifest round-trip: we validate the
// loader accepts a manifest WITH a fieldGroup and one WITHOUT it.
describe('PluginManifestSchema (via loader)', () => {
  const validBase = {
    id: 'seo',
    name: 'SEO',
    description: 'SEO fields',
    version: '1.0.0',
    icon: 'FileText',
    navItems: [{ path: '/admin/seo', label: 'SEO', icon: 'FileText' }],
  };

  // The schema is module-private; re-import it through a test-only export.
  const { PluginManifestSchema } = require('./plugin-loader.service');

  it('accepts a manifest without a fieldGroup (backward compatible)', () => {
    expect(() => PluginManifestSchema.parse(validBase)).not.toThrow();
  });

  it('accepts a manifest with a valid fieldGroup', () => {
    const withGroup = {
      ...validBase,
      fieldGroup: {
        key: 'seo',
        label: 'SEO',
        fields: [
          {
            name: 'seo_meta_title',
            type: 'text',
            label: 'Meta Title',
            options: { source: 'seo', locked: true },
          },
        ],
      },
    };
    const parsed = PluginManifestSchema.parse(withGroup);
    expect(parsed.fieldGroup.fields[0].name).toBe('seo_meta_title');
  });

  it('rejects a fieldGroup whose field name is not prefixed with the key', () => {
    const bad = {
      ...validBase,
      fieldGroup: {
        key: 'seo',
        label: 'SEO',
        fields: [{ name: 'meta_title', type: 'text' }],
      },
    };
    expect(() => PluginManifestSchema.parse(bad)).toThrow();
  });

  it('keeps loading real manifests', () => {
    expect(new PluginLoaderService(process.cwd()).loadAll()).toBeInstanceOf(
      Array,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-loader.service.spec`
Expected: FAIL — `PluginManifestSchema` is not exported, and the `fieldGroup` shape is unknown.

- [ ] **Step 3: Add the types**

In `apps/api/src/features/plugin/plugin.registry.types.ts`, add above `PluginManifest`:

```ts
export interface PluginManifestField {
  name: string;
  type: string;
  label?: string;
  options?: Record<string, unknown>;
}

export interface PluginFieldGroup {
  key: string;
  label: string;
  fields: PluginManifestField[];
}
```

Then add the optional property to `PluginManifest`:

```ts
export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  navItems: PluginNavItem[];
  fieldGroup?: PluginFieldGroup;
}
```

- [ ] **Step 4: Extend and export the loader schema**

In `apps/api/src/features/plugin/plugin-loader.service.ts`, replace the `const PluginManifestSchema = z.object({ ... })` block with an **exported** schema that includes the optional `fieldGroup`. Place the field-group sub-schema just above it:

```ts
export const PluginFieldGroupSchema = z
  .object({
    key: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'key must be kebab-case'),
    label: z.string().min(1),
    fields: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().min(1),
          label: z.string().min(1).optional(),
          options: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .min(1),
  })
  .superRefine((group, ctx) => {
    for (const field of group.fields) {
      if (!field.name.startsWith(`${group.key}_`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `field "${field.name}" must start with "${group.key}_"`,
        });
      }
    }
  });

export const PluginManifestSchema = z.object({
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
  fieldGroup: PluginFieldGroupSchema.optional(),
});
```

The existing `readManifest` already does `PluginManifestSchema.parse(rawManifest)` and spreads `...manifest`, so `fieldGroup` flows into the descriptor automatically — no other change needed in this file.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-loader.service.spec`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/plugin/plugin.registry.types.ts apps/api/src/features/plugin/plugin-loader.service.ts apps/api/src/features/plugin/plugin-loader.service.spec.ts
git commit -m "feat(api): accept optional fieldGroup in plugin manifest loader"
```

---

## Task 2: ZIP upload validation accepts `fieldGroup`

**Files:**

- Modify: `apps/api/src/features/plugin/plugin-files.service.ts`
- Test: `apps/api/src/features/plugin/plugin-files.service.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/features/plugin/plugin-files.service.spec.ts`:

```ts
import { UploadManifestSchema } from './plugin-files.service';

describe('UploadManifestSchema', () => {
  const base = {
    id: 'seo',
    name: 'SEO',
    description: 'SEO fields',
    version: '1.0.0',
    icon: 'FileText',
    navItems: [{ path: '/admin/seo', label: 'SEO', icon: 'FileText' }],
  };

  it('accepts a manifest without a fieldGroup', () => {
    expect(() => UploadManifestSchema.parse(base)).not.toThrow();
  });

  it('accepts a manifest with a valid fieldGroup', () => {
    const withGroup = {
      ...base,
      fieldGroup: {
        key: 'seo',
        label: 'SEO',
        fields: [{ name: 'seo_meta_title', type: 'text', label: 'Meta Title' }],
      },
    };
    expect(() => UploadManifestSchema.parse(withGroup)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-files.service.spec`
Expected: FAIL — `UploadManifestSchema` is not exported / does not allow `fieldGroup`.

- [ ] **Step 3: Reuse the loader schema and export it**

In `apps/api/src/features/plugin/plugin-files.service.ts`, import the shared group schema and extend the upload schema. Replace the existing `const UploadManifestSchema = z.object({ ... })` block with:

```ts
import { PluginFieldGroupSchema } from './plugin-loader.service';

export const UploadManifestSchema = z.object({
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
  fieldGroup: PluginFieldGroupSchema.optional(),
});
```

Keep the existing `import { z } from 'zod';` line. The `parseManifest` method already references `UploadManifestSchema`; no other change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-files.service.spec`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/plugin/plugin-files.service.ts apps/api/src/features/plugin/plugin-files.service.spec.ts
git commit -m "feat(api): accept optional fieldGroup in ZIP install validation"
```

---

## Task 3: `PluginFieldService` — read side (`getFieldGroup`, `listFieldTargets`)

**Files:**

- Create: `apps/api/src/features/plugin/plugin-field.service.ts`
- Test: `apps/api/src/features/plugin/plugin-field.service.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/features/plugin/plugin-field.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentTypesService } from '@/content-types/content-types.service';
import { PluginFieldService } from './plugin-field.service';
import { PluginRegistryService } from './plugin-registry.service';

const SEO_GROUP = {
  key: 'seo',
  label: 'SEO',
  fields: [
    { name: 'seo_meta_title', type: 'text', label: 'Meta Title' },
    {
      name: 'seo_meta_description',
      type: 'textarea',
      label: 'Meta Description',
    },
  ],
};

const makePlugin = (over: Record<string, unknown> = {}) => ({
  id: 'seo',
  name: 'SEO',
  enabled: true,
  fieldGroup: SEO_GROUP,
  ...over,
});

describe('PluginFieldService (read)', () => {
  let service: PluginFieldService;
  let registry: { get: jest.Mock };
  let contentTypes: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    registry = { get: jest.fn().mockReturnValue(makePlugin()) };
    contentTypes = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginFieldService,
        { provide: PluginRegistryService, useValue: registry },
        { provide: ContentTypesService, useValue: contentTypes },
      ],
    }).compile();
    service = module.get(PluginFieldService);
  });

  it('getFieldGroup throws when the plugin has no field group', () => {
    registry.get.mockReturnValue(makePlugin({ fieldGroup: undefined }));
    expect(() => service.getFieldGroup('seo')).toThrow(BadRequestException);
  });

  it('listFieldTargets marks a content type as applied when the group is present', async () => {
    contentTypes.findAll.mockResolvedValue([
      {
        id: 'ct-1',
        name: 'Blog Post',
        fields: [
          { name: 'seo_meta_title', type: 'text', options: { source: 'seo' } },
        ],
      },
      { id: 'ct-2', name: 'Page', fields: [{ name: 'title', type: 'text' }] },
    ]);

    const targets = await service.listFieldTargets('public', 'seo');

    expect(targets).toEqual([
      { contentTypeId: 'ct-1', name: 'Blog Post', applied: true },
      { contentTypeId: 'ct-2', name: 'Page', applied: false },
    ]);
  });

  it('listFieldTargets parses a stringified fields column', async () => {
    contentTypes.findAll.mockResolvedValue([
      {
        id: 'ct-1',
        name: 'Blog Post',
        fields: JSON.stringify([
          { name: 'seo_meta_title', type: 'text', options: { source: 'seo' } },
        ]),
      },
    ]);

    const targets = await service.listFieldTargets('public', 'seo');
    expect(targets[0].applied).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: FAIL — `PluginFieldService` does not exist.

- [ ] **Step 3: Create the service (read side + helpers)**

Create `apps/api/src/features/plugin/plugin-field.service.ts`:

```ts
import { ContentTypesService } from '@/content-types/content-types.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginFieldGroup, PluginManifestField } from './plugin.registry.types';

export interface FieldTarget {
  contentTypeId: string;
  name: string;
  applied: boolean;
}

export interface FieldTargetResult {
  target: FieldTarget;
  warnings: string[];
}

@Injectable()
export class PluginFieldService {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly contentTypes: ContentTypesService,
  ) {}

  getFieldGroup(pluginId: string): PluginFieldGroup {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      throw new BadRequestException('Plugin not found');
    }
    if (!plugin.fieldGroup) {
      throw new BadRequestException(
        `Plugin "${pluginId}" contributes no field group`,
      );
    }
    return plugin.fieldGroup;
  }

  async listFieldTargets(
    schemaName: string,
    pluginId: string,
  ): Promise<FieldTarget[]> {
    const group = this.getFieldGroup(pluginId);
    const contentTypes = await this.contentTypes.findAll(schemaName);
    return contentTypes.map((contentType) => ({
      contentTypeId: contentType.id,
      name: contentType.name,
      applied: this.isApplied(contentType.fields, group.key),
    }));
  }

  private assertEnabled(pluginId: string): void {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      throw new BadRequestException('Plugin not found');
    }
    if (!plugin.enabled) {
      throw new ForbiddenException(`Plugin "${pluginId}" is disabled`);
    }
  }

  private isApplied(fields: unknown, key: string): boolean {
    return this.parseFields(fields).some(
      (field) => field.options?.source === key,
    );
  }

  private tagField(
    field: PluginManifestField,
    key: string,
  ): PluginManifestField {
    return {
      ...field,
      options: { ...(field.options ?? {}), source: key, locked: true },
    };
  }

  private parseFields(fields: unknown): PluginManifestField[] {
    if (Array.isArray(fields)) {
      return fields as PluginManifestField[];
    }
    if (typeof fields === 'string') {
      try {
        const parsed = JSON.parse(fields);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
```

Note: `PluginManifestField.options` is typed `Record<string, unknown>`, so `field.options?.source` is `unknown`; the `=== key` comparison is valid TypeScript. The `assertEnabled` and `tagField` helpers are used by Task 4/5.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/plugin/plugin-field.service.ts apps/api/src/features/plugin/plugin-field.service.spec.ts
git commit -m "feat(api): add PluginFieldService read side (field-target listing)"
```

---

## Task 4: `PluginFieldService.applyToContentType` (inject, idempotent, collisions)

**Files:**

- Modify: `apps/api/src/features/plugin/plugin-field.service.ts`
- Test: `apps/api/src/features/plugin/plugin-field.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `apps/api/src/features/plugin/plugin-field.service.spec.ts` (reuse the `makePlugin`, `SEO_GROUP` helpers already in the file by keeping this block in the same file):

```ts
describe('PluginFieldService.applyToContentType', () => {
  let service: PluginFieldService;
  let registry: { get: jest.Mock };
  let contentTypes: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    registry = { get: jest.fn().mockReturnValue(makePlugin()) };
    contentTypes = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginFieldService,
        { provide: PluginRegistryService, useValue: registry },
        { provide: ContentTypesService, useValue: contentTypes },
      ],
    }).compile();
    service = module.get(PluginFieldService);
  });

  it('throws 403 when the plugin is disabled', async () => {
    registry.get.mockReturnValue(makePlugin({ enabled: false }));
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [],
    });
    await expect(
      service.applyToContentType('public', 'seo', 'ct-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appends tagged fields and preserves user field order', async () => {
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [{ name: 'title', type: 'text' }],
    });

    const result = await service.applyToContentType('public', 'seo', 'ct-1');

    const [, id, dto] = contentTypes.update.mock.calls[0];
    expect(id).toBe('ct-1');
    expect(dto.fields.map((f: any) => f.name)).toEqual([
      'title',
      'seo_meta_title',
      'seo_meta_description',
    ]);
    expect(dto.fields[1].options).toMatchObject({
      source: 'seo',
      locked: true,
    });
    expect(result.target.applied).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('is idempotent — a second apply makes no further update', async () => {
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [
        {
          name: 'seo_meta_title',
          type: 'text',
          options: { source: 'seo', locked: true },
        },
        {
          name: 'seo_meta_description',
          type: 'textarea',
          options: { source: 'seo', locked: true },
        },
      ],
    });

    await service.applyToContentType('public', 'seo', 'ct-1');
    expect(contentTypes.update).not.toHaveBeenCalled();
  });

  it('skips a colliding user field and reports a warning', async () => {
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [{ name: 'seo_meta_title', type: 'text' }], // user field, no source tag
    });

    const result = await service.applyToContentType('public', 'seo', 'ct-1');

    const [, , dto] = contentTypes.update.mock.calls[0];
    expect(dto.fields.map((f: any) => f.name)).toEqual([
      'seo_meta_title', // untouched user field
      'seo_meta_description', // only the non-colliding one added
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/seo_meta_title/);
  });
});
```

Add `ForbiddenException` to the existing `@nestjs/common` import at the top of the spec file:

```ts
import { BadRequestException, ForbiddenException } from '@nestjs/common';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: FAIL — `applyToContentType` is not defined.

- [ ] **Step 3: Implement `applyToContentType`**

In `apps/api/src/features/plugin/plugin-field.service.ts`, add this method to the class (after `listFieldTargets`):

```ts
async applyToContentType(
  schemaName: string,
  pluginId: string,
  contentTypeId: string,
): Promise<FieldTargetResult> {
  this.assertEnabled(pluginId);
  const group = this.getFieldGroup(pluginId);
  const contentType = await this.contentTypes.findOne(schemaName, contentTypeId);
  const existing = this.parseFields(contentType.fields);
  const existingByName = new Map(existing.map((field) => [field.name, field]));

  const warnings: string[] = [];
  const additions: PluginManifestField[] = [];

  for (const field of group.fields) {
    const tagged = this.tagField(field, group.key);
    const clash = existingByName.get(tagged.name);
    if (clash) {
      // Already injected by us -> idempotent skip. Otherwise it is a user
      // field with the same name -> skip and warn, never overwrite user data.
      if (clash.options?.source !== group.key) {
        warnings.push(
          `Field "${tagged.name}" already exists on this content type; skipped`,
        );
      }
      continue;
    }
    additions.push(tagged);
  }

  if (additions.length > 0) {
    await this.contentTypes.update(schemaName, contentTypeId, {
      fields: [...existing, ...additions],
    });
  }

  return {
    target: { contentTypeId, name: contentType.name, applied: true },
    warnings,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: PASS (all read + apply tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/plugin/plugin-field.service.ts apps/api/src/features/plugin/plugin-field.service.spec.ts
git commit -m "feat(api): inject tagged field group into content types (idempotent)"
```

---

## Task 5: `PluginFieldService.removeFromContentType` (strip tagged only)

**Files:**

- Modify: `apps/api/src/features/plugin/plugin-field.service.ts`
- Test: `apps/api/src/features/plugin/plugin-field.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to the spec file:

```ts
describe('PluginFieldService.removeFromContentType', () => {
  let service: PluginFieldService;
  let registry: { get: jest.Mock };
  let contentTypes: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    registry = { get: jest.fn().mockReturnValue(makePlugin()) };
    contentTypes = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginFieldService,
        { provide: PluginRegistryService, useValue: registry },
        { provide: ContentTypesService, useValue: contentTypes },
      ],
    }).compile();
    service = module.get(PluginFieldService);
  });

  it('removes only fields tagged with the group key and keeps user fields', async () => {
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [
        { name: 'title', type: 'text' },
        {
          name: 'seo_meta_title',
          type: 'text',
          options: { source: 'seo', locked: true },
        },
        {
          name: 'seo_meta_description',
          type: 'textarea',
          options: { source: 'seo', locked: true },
        },
      ],
    });

    const result = await service.removeFromContentType('public', 'seo', 'ct-1');

    const [, id, dto] = contentTypes.update.mock.calls[0];
    expect(id).toBe('ct-1');
    expect(dto.fields.map((f: any) => f.name)).toEqual(['title']);
    expect(result.target.applied).toBe(false);
  });

  it('makes no update when there is nothing tagged to remove', async () => {
    contentTypes.findOne.mockResolvedValue({
      id: 'ct-1',
      name: 'Blog',
      fields: [{ name: 'title', type: 'text' }],
    });

    await service.removeFromContentType('public', 'seo', 'ct-1');
    expect(contentTypes.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: FAIL — `removeFromContentType` is not defined.

- [ ] **Step 3: Implement `removeFromContentType`**

Add to the class in `apps/api/src/features/plugin/plugin-field.service.ts`:

```ts
async removeFromContentType(
  schemaName: string,
  pluginId: string,
  contentTypeId: string,
): Promise<FieldTargetResult> {
  const group = this.getFieldGroup(pluginId);
  const contentType = await this.contentTypes.findOne(schemaName, contentTypeId);
  const existing = this.parseFields(contentType.fields);
  const remaining = existing.filter(
    (field) => field.options?.source !== group.key,
  );

  if (remaining.length !== existing.length) {
    await this.contentTypes.update(schemaName, contentTypeId, {
      fields: remaining,
    });
  }

  return {
    target: { contentTypeId, name: contentType.name, applied: false },
    warnings: [],
  };
}
```

Note: removal does not require the plugin to be enabled — disabling a plugin should still allow cleanup.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-field.service.spec`
Expected: PASS (all service tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/plugin/plugin-field.service.ts apps/api/src/features/plugin/plugin-field.service.spec.ts
git commit -m "feat(api): remove tagged field group from content types"
```

---

## Task 6: Wire the module (export + import + register)

**Files:**

- Modify: `apps/api/src/content-types/content-types.module.ts`
- Modify: `apps/api/src/features/plugin/plugin.module.ts`

- [ ] **Step 1: Export `ContentTypesService`**

In `apps/api/src/content-types/content-types.module.ts`, add an `exports` array so the plugin module can inject it:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [ContentTypesController],
  providers: [ContentTypesService],
  exports: [ContentTypesService],
})
export class ContentTypesModule {}
```

- [ ] **Step 2: Register service in the plugin module**

In `apps/api/src/features/plugin/plugin.module.ts`, import `ContentTypesModule` and add the new service to providers (controller is added in Task 7). Update to:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentTypesModule } from '@/content-types/content-types.module';
import { PluginState } from './entities/plugin-state.entity';
import { PluginFieldService } from './plugin-field.service';
import { PluginFilesService } from './plugin-files.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginController } from './plugin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PluginState]), ContentTypesModule],
  controllers: [PluginController],
  providers: [
    PluginLoaderService,
    PluginRegistryService,
    PluginFilesService,
    PluginFieldService,
  ],
  exports: [PluginRegistryService],
})
export class PluginModule {}
```

- [ ] **Step 3: Verify the app compiles and the full API suite passes**

Run: `pnpm --filter api test`
Expected: PASS — no provider-resolution errors (`PluginFieldService` resolves `ContentTypesService` via the imported module).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/content-types/content-types.module.ts apps/api/src/features/plugin/plugin.module.ts
git commit -m "chore(api): wire PluginFieldService with ContentTypesModule"
```

---

## Task 7: DTO + generic field-target endpoints

**Files:**

- Create: `apps/api/src/features/plugin/dto/apply-field-target.dto.ts`
- Create: `apps/api/src/features/plugin/plugin-field.controller.ts`
- Modify: `apps/api/src/features/plugin/plugin.module.ts`
- Test: `apps/api/src/features/plugin/plugin-field.controller.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/features/plugin/plugin-field.controller.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { PluginFieldController } from './plugin-field.controller';
import { PluginFieldService } from './plugin-field.service';

describe('PluginFieldController', () => {
  let controller: PluginFieldController;
  let serviceMock: {
    listFieldTargets: jest.Mock;
    applyToContentType: jest.Mock;
    removeFromContentType: jest.Mock;
  };

  const req = { tenant: { schemaName: 'public' } } as any;

  beforeEach(async () => {
    serviceMock = {
      listFieldTargets: jest.fn().mockResolvedValue([]),
      applyToContentType: jest
        .fn()
        .mockResolvedValue({ target: { applied: true }, warnings: [] }),
      removeFromContentType: jest
        .fn()
        .mockResolvedValue({ target: { applied: false }, warnings: [] }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginFieldController],
      providers: [{ provide: PluginFieldService, useValue: serviceMock }],
    }).compile();
    controller = module.get(PluginFieldController);
  });

  it('lists field targets for the tenant schema', async () => {
    await controller.list('seo', req);
    expect(serviceMock.listFieldTargets).toHaveBeenCalledWith('public', 'seo');
  });

  it('applies the group when enabled is true', async () => {
    await controller.set('seo', { contentTypeId: 'ct-1', enabled: true }, req);
    expect(serviceMock.applyToContentType).toHaveBeenCalledWith(
      'public',
      'seo',
      'ct-1',
    );
    expect(serviceMock.removeFromContentType).not.toHaveBeenCalled();
  });

  it('removes the group when enabled is false', async () => {
    await controller.set('seo', { contentTypeId: 'ct-1', enabled: false }, req);
    expect(serviceMock.removeFromContentType).toHaveBeenCalledWith(
      'public',
      'seo',
      'ct-1',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- plugin-field.controller.spec`
Expected: FAIL — controller/DTO do not exist.

- [ ] **Step 3: Create the DTO**

Create `apps/api/src/features/plugin/dto/apply-field-target.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ApplyFieldTargetDto {
  @ApiProperty({ example: 'b1f2…', description: 'Target content type id' })
  @IsString()
  @IsNotEmpty()
  contentTypeId: string;

  @ApiProperty({
    example: true,
    description: 'true = inject fields, false = remove',
  })
  @IsBoolean()
  enabled: boolean;
}
```

- [ ] **Step 4: Create the controller**

Create `apps/api/src/features/plugin/plugin-field.controller.ts`:

```ts
import { Roles } from '@/common/decorators';
import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApplyFieldTargetDto } from './dto/apply-field-target.dto';
import { PluginFieldService } from './plugin-field.service';

@ApiTags('plugins')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Active tenant id (required for tenant-scoped routes)',
  required: true,
})
@UseInterceptors(TenantInterceptor)
@Controller('plugins')
export class PluginFieldController {
  constructor(private readonly pluginFields: PluginFieldService) {}

  @Get(':id/field-targets')
  @Roles('ADMIN')
  async list(@Param('id') id: string, @Req() req: any) {
    const data = await this.pluginFields.listFieldTargets(
      req.tenant.schemaName,
      id,
    );
    return { data };
  }

  @Post(':id/field-targets')
  @Roles('ADMIN')
  async set(
    @Param('id') id: string,
    @Body() dto: ApplyFieldTargetDto,
    @Req() req: any,
  ) {
    const data = dto.enabled
      ? await this.pluginFields.applyToContentType(
          req.tenant.schemaName,
          id,
          dto.contentTypeId,
        )
      : await this.pluginFields.removeFromContentType(
          req.tenant.schemaName,
          id,
          dto.contentTypeId,
        );
    return {
      message: `Field group ${dto.enabled ? 'applied' : 'removed'}`,
      data,
    };
  }
}
```

- [ ] **Step 5: Register the controller**

In `apps/api/src/features/plugin/plugin.module.ts`, import `PluginFieldController` and add it to the `controllers` array:

```ts
import { PluginFieldController } from './plugin-field.controller';
```

```ts
  controllers: [PluginController, PluginFieldController],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter api test -- plugin-field.controller.spec`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the full API suite**

Run: `pnpm --filter api test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/features/plugin/dto/apply-field-target.dto.ts apps/api/src/features/plugin/plugin-field.controller.ts apps/api/src/features/plugin/plugin-field.controller.spec.ts apps/api/src/features/plugin/plugin.module.ts
git commit -m "feat(api): add generic /plugins/:id/field-targets endpoints"
```

---

## Task 8: SEO plugin manifest

**Files:**

- Create: `plugins/seo/manifest.json`

- [ ] **Step 1: Create the manifest**

Create `plugins/seo/manifest.json`:

```json
{
  "id": "seo",
  "name": "SEO",
  "description": "Adds SEO fields (meta, Open Graph, Twitter, robots, JSON-LD) to selected content types.",
  "version": "1.0.0",
  "icon": "FileText",
  "navItems": [{ "path": "/admin/seo", "label": "SEO", "icon": "FileText" }],
  "fieldGroup": {
    "key": "seo",
    "label": "SEO",
    "fields": [
      {
        "name": "seo_meta_title",
        "type": "text",
        "label": "Meta Title",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_meta_description",
        "type": "textarea",
        "label": "Meta Description",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_canonical_url",
        "type": "url",
        "label": "Canonical URL",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_keywords",
        "type": "text",
        "label": "Keywords",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_og_title",
        "type": "text",
        "label": "OG Title",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_og_description",
        "type": "textarea",
        "label": "OG Description",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_og_image",
        "type": "image",
        "label": "OG Image",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_twitter_title",
        "type": "text",
        "label": "Twitter Title",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_twitter_description",
        "type": "textarea",
        "label": "Twitter Description",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_twitter_image",
        "type": "image",
        "label": "Twitter Image",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_robots_noindex",
        "type": "boolean",
        "label": "noindex",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_robots_nofollow",
        "type": "boolean",
        "label": "nofollow",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_robots_noarchive",
        "type": "boolean",
        "label": "noarchive",
        "options": { "source": "seo", "locked": true }
      },
      {
        "name": "seo_jsonld",
        "type": "json",
        "label": "JSON-LD Structured Data",
        "options": { "source": "seo", "locked": true }
      }
    ]
  }
}
```

- [ ] **Step 2: Verify the loader picks it up**

Run: `pnpm --filter api test -- plugin-loader.service.spec`
Expected: PASS — the `loadAll()` smoke test still returns an array (and now includes the `seo` plugin when run from repo root).

- [ ] **Step 3: Commit**

```bash
git add plugins/seo/manifest.json
git commit -m "feat: add SEO plugin manifest with declarative field group"
```

---

## Task 9: Web — preserve `source`/`locked` in field options

**Files:**

- Modify: `apps/web/types/content-type.type.ts`
- Test: `apps/web/types/content-type.type.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/web/types/content-type.type.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ContentTypeFieldSchema } from './content-type.type';

describe('ContentTypeFieldSchema options', () => {
  it('preserves the source and locked flags on injected fields', () => {
    const parsed = ContentTypeFieldSchema.parse({
      name: 'seo_meta_title',
      type: 'text',
      label: 'Meta Title',
      options: { source: 'seo', locked: true },
    });
    expect(parsed.options?.source).toBe('seo');
    expect(parsed.options?.locked).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- content-type.type.test`
Expected: FAIL — Zod strips unknown `source`/`locked` keys, so the assertions are `undefined`.

- [ ] **Step 3: Extend `FieldOptionsSchema`**

In `apps/web/types/content-type.type.ts`, add two optional fields to `FieldOptionsSchema`:

```ts
export const FieldOptionsSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  defaultValue: z.unknown().optional(),
  slugFrom: z.string().optional(),
  relatedType: z.string().optional(),
  displayField: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  choices: z.array(z.string()).optional(),
  // Set by declarative field plugins (e.g. SEO). `source` is the plugin's
  // fieldGroup key; `locked` protects the field from edit/delete in the UI.
  source: z.string().optional(),
  locked: z.boolean().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- content-type.type.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/types/content-type.type.ts apps/web/types/content-type.type.test.ts
git commit -m "feat(web): preserve source/locked flags on field options"
```

---

## Task 10: Web — field-target server actions

**Files:**

- Create: `apps/web/server/plugin-field.server.ts`

- [ ] **Step 1: Create the server actions**

Create `apps/web/server/plugin-field.server.ts` (mirrors the existing `content-type.server.ts` tenant/auth pattern; server actions are exercised via the page test in Task 11, so no separate unit test here):

```ts
'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { z } from 'zod';
import { authHeaders } from './auth-headers';

export const FieldTargetSchema = z.object({
  contentTypeId: z.string(),
  name: z.string(),
  applied: z.boolean(),
});

const ListFieldTargetsSchema = z.object({
  data: z.array(FieldTargetSchema),
});

const SetFieldTargetSchema = z.object({
  message: z.string(),
  data: z.object({
    target: FieldTargetSchema,
    warnings: z.array(z.string()),
  }),
});

export type FieldTarget = z.infer<typeof FieldTargetSchema>;

export const getFieldTargets = async (
  tenantId: string,
  pluginId: string,
): Promise<FieldTarget[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    ListFieldTargetsSchema,
    `/plugins/${pluginId}/field-targets`,
    {
      cache: 'no-store',
      headers: authHeaders(session, { tenantId }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const setFieldTarget = async (
  tenantId: string,
  pluginId: string,
  contentTypeId: string,
  enabled: boolean,
): Promise<{ target: FieldTarget; warnings: string[] }> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    SetFieldTargetSchema,
    `/plugins/${pluginId}/field-targets`,
    {
      method: 'POST',
      headers: authHeaders(session, { tenantId, json: true }),
      body: JSON.stringify({ contentTypeId, enabled }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
```

- [ ] **Step 2: Type-check the package**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS (no type errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/server/plugin-field.server.ts
git commit -m "feat(web): add field-target server actions"
```

---

## Task 11: Web — SEO admin page

**Files:**

- Create: `apps/web/app/admin/seo/page.tsx`
- Test: `apps/web/app/admin/seo/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/admin/seo/page.test.tsx`:

```tsx
import Page from '@/app/admin/seo/page';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFieldTargetsMock = vi.fn();
const setFieldTargetMock = vi.fn();

vi.mock('@/server/plugin-field.server', () => ({
  getFieldTargets: (...args: unknown[]) => getFieldTargetsMock(...args),
  setFieldTarget: (...args: unknown[]) => setFieldTargetMock(...args),
}));

vi.mock('@repo/shadcn/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('admin-tenant-id', 'tenant-1');
});

describe('admin SEO page', () => {
  it('lists content types with their applied state', async () => {
    getFieldTargetsMock.mockResolvedValue([
      { contentTypeId: 'ct-1', name: 'Blog Post', applied: true },
      { contentTypeId: 'ct-2', name: 'Page', applied: false },
    ]);

    render(<Page />);

    const blog = await screen.findByText('Blog Post');
    const blogRow = blog.closest('[data-slot="card"]') as HTMLElement;
    expect(
      within(blogRow).getByRole('switch').getAttribute('aria-checked'),
    ).toBe('true');
    expect(getFieldTargetsMock).toHaveBeenCalledWith('tenant-1', 'seo');
  });

  it('toggles a content type on', async () => {
    getFieldTargetsMock.mockResolvedValue([
      { contentTypeId: 'ct-2', name: 'Page', applied: false },
    ]);
    setFieldTargetMock.mockResolvedValue({
      target: { contentTypeId: 'ct-2', name: 'Page', applied: true },
      warnings: [],
    });

    render(<Page />);

    const page = await screen.findByText('Page');
    const row = page.closest('[data-slot="card"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('switch'));

    await waitFor(() => {
      expect(setFieldTargetMock).toHaveBeenCalledWith(
        'tenant-1',
        'seo',
        'ct-2',
        true,
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- app/admin/seo/page.test`
Expected: FAIL — the page does not exist.

- [ ] **Step 3: Create the page**

Create `apps/web/app/admin/seo/page.tsx`:

```tsx
'use client';

import {
  getFieldTargets,
  setFieldTarget,
  type FieldTarget,
} from '@/server/plugin-field.server';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { useEffect, useState } from 'react';

const PLUGIN_ID = 'seo';

const Page = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [targets, setTargets] = useState<FieldTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      getFieldTargets(stored, PLUGIN_ID)
        .then(setTargets)
        .catch((err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to load content types',
          ),
        )
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleToggle = async (contentTypeId: string, enabled: boolean) => {
    if (!tenantId) return;
    setPendingId(contentTypeId);
    try {
      const result = await setFieldTarget(
        tenantId,
        PLUGIN_ID,
        contentTypeId,
        enabled,
      );
      setTargets((prev) =>
        prev.map((t) =>
          t.contentTypeId === contentTypeId
            ? { ...t, applied: result.target.applied }
            : t,
        ),
      );
      result.warnings.forEach((w) => toast.warning?.(w) ?? toast.error(w));
      toast.success(enabled ? 'SEO fields added' : 'SEO fields removed');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update content type',
      );
    } finally {
      setPendingId(null);
    }
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">SEO</h1>
        <p className="text-muted-foreground">
          Please select a tenant from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO</h1>
        <p className="text-muted-foreground mt-1">
          Choose which content types get the SEO field group.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : targets.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No content types yet. Create one first.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => (
            <Card key={target.contentTypeId}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{target.name}</CardTitle>
                <Switch
                  checked={target.applied}
                  disabled={pendingId === target.contentTypeId}
                  onCheckedChange={(value: boolean) =>
                    handleToggle(target.contentTypeId, value)
                  }
                  aria-label={`Toggle SEO for ${target.name}`}
                />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {target.applied
                    ? 'SEO fields are added to this content type.'
                    : 'SEO fields are not added.'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- app/admin/seo/page.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/seo/page.tsx apps/web/app/admin/seo/page.test.tsx
git commit -m "feat(web): add SEO admin page to apply fields per content type"
```

---

## Task 12: Web — protect locked fields in the content-type editor

**Files:**

- Modify: `apps/web/app/admin/content-types/[id]/edit/page.tsx`

- [ ] **Step 1: Guard removal in `removeField`**

In `apps/web/app/admin/content-types/[id]/edit/page.tsx`, update `removeField` (around line 100) so locked fields cannot be removed:

```ts
const removeField = (index: number) => {
  if (fields[index]?.options?.locked) return;
  setFields(fields.filter((_, i) => i !== index));
};
```

- [ ] **Step 2: Disable the remove button + options dialog for locked fields**

In the same file, locate the field controls block (around lines 290–308). Replace the `FieldOptionsDialog` + remove `Button` group so locked fields show a badge and disable both controls. Change:

```tsx
<div className="flex items-center gap-1 pt-5">
  <FieldOptionsDialog
    options={field.options}
    fieldType={field.type}
    allFieldNames={fieldNames}
    onChange={(opts: ContentTypeFieldOptions) =>
      updateField(index, 'options', opts)
    }
  />
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="size-7"
    onClick={() => removeField(index)}
  >
    <X className="size-3.5" />
  </Button>
</div>
```

to:

```tsx
<div className="flex items-center gap-1 pt-5">
  {field.options?.locked ? (
    <span className="text-muted-foreground text-xs whitespace-nowrap">
      Locked ({field.options.source})
    </span>
  ) : (
    <>
      <FieldOptionsDialog
        options={field.options}
        fieldType={field.type}
        allFieldNames={fieldNames}
        onChange={(opts: ContentTypeFieldOptions) =>
          updateField(index, 'options', opts)
        }
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => removeField(index)}
      >
        <X className="size-3.5" />
      </Button>
    </>
  )}
</div>
```

- [ ] **Step 3: Disable the name/type/label inputs for locked fields**

In the same field row, the name `Input`, the `FieldTypePicker`, and the label `Input` (lines ~255–288) must be read-only for locked fields. Add `disabled={!!field.options?.locked}` to each of those three controls. For the name `Input` and label `Input` add the `disabled` prop; for `FieldTypePicker` add a `disabled` prop if supported, otherwise wrap its `onChange` to no-op when locked:

```tsx
onChange={(value: string) =>
  field.options?.locked ? undefined : updateField(index, 'type', value)
}
```

- [ ] **Step 4: Verify the build/type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Run the web test suite**

Run: `pnpm --filter web test`
Expected: PASS — existing content-type tests still green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/content-types/[id]/edit/page.tsx
git commit -m "feat(web): lock plugin-injected fields in the content-type editor"
```

---

## Task 13: Document the manifest extension

**Files:**

- Modify: `docs/plugin-development.md`

- [ ] **Step 1: Add a `fieldGroup` section**

In `docs/plugin-development.md`, after the manifest field table (the row list ending with `navItems`), add a new subsection:

````markdown
### Declarative field groups (optional)

A plugin may declare a `fieldGroup` to contribute a set of fields that an admin can apply to selected content
types from the plugin's admin page. This is a **declarative** extension — OpenCMS injects the fields into the
chosen content types' `fields`; no plugin code runs.

```json
{
  "fieldGroup": {
    "key": "seo",
    "label": "SEO",
    "fields": [
      {
        "name": "seo_meta_title",
        "type": "text",
        "label": "Meta Title",
        "options": { "source": "seo", "locked": true }
      }
    ]
  }
}
```

| Field    | Rules                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| `key`    | Kebab-case group id. Every field `name` must start with `<key>_`.               |
| `label`  | Display name for the group.                                                     |
| `fields` | Array of `{ name, type, label?, options? }`, same shape as content-type fields. |

Injected fields are tagged with `options.source = "<key>"` and `options.locked = true` so they are removable as
a group and protected from accidental edit/delete in the field editor. Apply/remove the group per content type
from the plugin's page, backed by `GET`/`POST /api/plugins/:id/field-targets`.
````

- [ ] **Step 2: Commit**

```bash
git add docs/plugin-development.md
git commit -m "docs: document declarative fieldGroup manifest extension"
```

---

## Final Verification

- [ ] **Run the full API test suite**

Run: `pnpm --filter api test`
Expected: PASS.

- [ ] **Run the full web test suite**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Manual smoke test (optional but recommended)**
  1. `pnpm dev`, open http://localhost:3000, log in as admin.
  2. Go to **/admin/plugins**, click **Rescan Plugins** — the **SEO** plugin appears under Installed Plugins. Ensure it is enabled.
  3. Open **SEO** in the sidebar (**/admin/seo**), toggle a content type (e.g. Blog Post) on.
  4. Create/edit an entry of that content type — the SEO fields appear and save.
  5. Open the content type in the editor — the SEO fields show as **Locked (seo)** and cannot be removed.
  6. Toggle the content type off on the SEO page — the SEO fields disappear from the content type; existing entry values remain in storage.

---

## Self-Review Notes

- **Spec coverage:** manifest extension (Tasks 1–2), engine apply/remove/list (Tasks 3–5), generic endpoints (Task 7), generic admin page (Task 11), tagging + lock protection (Tasks 4, 9, 12), SEO field set (Task 8), tests throughout, docs (Task 13). Phase 2 (registry/marketplace) intentionally excluded per spec.
- **Type consistency:** `PluginFieldGroup`/`PluginManifestField` (Task 1) are used unchanged in the service (Tasks 3–5); `FieldTarget`/`FieldTargetResult` shapes match between service, controller (Task 7), and web schemas (Tasks 10–11). The web `FieldTargetSchema` mirrors the API `FieldTarget` (`contentTypeId`, `name`, `applied`).
- **Non-destructive guarantee:** removal filters only `options.source === key`; entry values are never deleted.
