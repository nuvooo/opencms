# Content Types Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the CMS content type system with relationships (m2o/o2m/m2m), new field types, field validation config, and an improved content type editor UI.

**Architecture:** New `relation` table in each tenant schema stores relationship links. `RelationService` (backend) + `relation.server.ts` (frontend server action) handle CRUD. Content type editor gets drag-drop field reordering, a gear icon for field options, and an expanded field type selector. Entry form renders new field types and relationship selectors.

**Tech Stack:** NestJS (Fastify), TypeORM, Next.js 14 App Router, shadcn/ui, Zod, react-beautiful-dnd (for drag-drop)

---

### Task 1: Update Zod Schemas (Shared Types)

**Files:**

- Modify: `apps/web/types/content-type.type.ts` (full rewrite)
- Check: `apps/api/src/features/content-type/` - need to verify backend also uses these schemas or has its own DTOs

- [ ] **Step 1: Update frontend ContentTypeFieldSchema with new types + FieldOptions**

Replace `apps/web/types/content-type.type.ts`:

```typescript
import { z } from 'zod';

export const fieldTypes = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'boolean',
  'date',
  'image',
  'select',
  'repeater',
  'slug',
  'color',
  'json',
  'datetime',
  'time',
  'email',
  'url',
  'phone',
  'm2o',
  'o2m',
  'm2m',
] as const;

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
});

export const ContentTypeFieldSchema = z.object({
  name: z.string(),
  type: z.enum(fieldTypes),
  label: z.string().optional(),
  options: FieldOptionsSchema.optional(),
});

export const ContentTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  fields: z.array(ContentTypeFieldSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContentType = z.infer<typeof ContentTypeSchema>;
export type ContentTypeField = z.infer<typeof ContentTypeFieldSchema>;
export type ContentTypeFieldOptions = z.infer<typeof FieldOptionsSchema>;

export const GetContentTypesSchema = z.object({
  data: z.array(ContentTypeSchema),
});
export const GetContentTypeSchema = z.object({ data: ContentTypeSchema });
```

- [ ] **Step 2: Add backend DTO for CreateContentTypeDto fields**

Check `apps/api/src/features/content-type/dto/create-content-type.dto.ts`:

If fields are typed via `@IsArray()` / `@ValidateNested()`, update to accept the new field options. If the backend doesn't validate fields shape (currently stores raw JSONB), it already works — skip.

Run: `grep -r "fields" apps/api/src/features/content-type/dto/`
Expected: fields are stored as-is in JSONB, backend doesn't need DTO changes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/types/content-type.type.ts
git commit -m "feat: extend ContentTypeFieldSchema with new types + FieldOptions"
```

---

### Task 2: Add Relation Table to TenantDbService

**Files:**

- Modify: `apps/api/src/common/services/tenant-db.service.ts`

- [ ] **Step 1: Add relation table creation in createTenantSchema**

Add after the entry table creation:

```typescript
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
```

- [ ] **Step 2: Add existing tenant migration in onModuleInit**

After datasource initialize, query all tenants and create relation table in each:

```typescript
async onModuleInit() {
  // ... existing init code ...
  // After datasource initialized, migrate existing tenants
  try {
    const tenants = await this.dataSource.query(
      `SELECT schema_name FROM public.tenant`,
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
    }
  } catch { /* no tenants table yet — first run */ }
}
```

- [ ] **Step 3: Add withTenantDb relation table replacement**

Update `withTenantDb` to also replace `"relation"`:

```typescript
return fn((sql: string, params?: unknown[]) =>
  this.dataSource.query(
    sql
      .replaceAll('"content_type"', `"${schemaName}"."content_type"`)
      .replaceAll('"entry"', `"${schemaName}"."entry"`)
      .replaceAll('"relation"', `"${schemaName}"."relation"`),
    params,
  ),
);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/services/tenant-db.service.ts
git commit -m "feat: add relation table to tenant schemas"
```

---

### Task 3: Create RelationService (Backend)

**Files:**

- Create: `apps/api/src/features/relation/relation.module.ts`
- Create: `apps/api/src/features/relation/relation.service.ts`
- Create: `apps/api/src/features/relation/relation.controller.ts`
- Create: `apps/api/src/features/relation/dto/set-relations.dto.ts`

- [ ] **Step 1: Create SetRelations DTO**

`apps/api/src/features/relation/dto/set-relations.dto.ts`:

```typescript
import { IsArray, IsString, IsUUID } from 'class-validator';

export class SetRelationsDto {
  @IsString()
  fieldName: string;

  @IsArray()
  @IsUUID('4', { each: true })
  relatedEntryIds: string[];
}
```

- [ ] **Step 2: Create RelationService**

`apps/api/src/features/relation/relation.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { TenantDbService } from '@/common/services';

@Injectable()
export class RelationService {
  constructor(private tenantDb: TenantDbService) {}

  async setRelations(
    schemaName: string,
    entryId: string,
    fieldName: string,
    relatedEntryIds: string[],
  ) {
    await this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 AND field_name = $2`,
        [entryId, fieldName],
      );
      for (let i = 0; i < relatedEntryIds.length; i++) {
        await query(
          `INSERT INTO "relation" (entry_id, field_name, related_entry_id, sort_order) VALUES ($1, $2, $3, $4)`,
          [entryId, fieldName, relatedEntryIds[i], i],
        );
      }
    });
  }

  async getRelations(schemaName: string, entryId: string, fieldName: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      const rows = await query(
        `SELECT r.related_entry_id, r.sort_order, e.fields->>'title' AS display
         FROM "relation" r
         JOIN "entry" e ON e.id = r.related_entry_id
         WHERE r.entry_id = $1 AND r.field_name = $2
         ORDER BY r.sort_order`,
        [entryId, fieldName],
      );
      return rows;
    });
  }

  async getRelatedEntries(schemaName: string, entryId: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      const rows = await query(
        `SELECT r.entry_id, r.field_name, e.content_type_slug, e.fields->>'title' AS display
         FROM "relation" r
         JOIN "entry" e ON e.id = r.entry_id
         WHERE r.related_entry_id = $1
         ORDER BY r.field_name, r.sort_order`,
        [entryId],
      );
      return rows;
    });
  }

  async deleteEntryRelations(schemaName: string, entryId: string) {
    return this.tenantDb.withTenantDb(schemaName, async (query) => {
      await query(
        `DELETE FROM "relation" WHERE entry_id = $1 OR related_entry_id = $2`,
        [entryId, entryId],
      );
    });
  }
}
```

- [ ] **Step 3: Create RelationController**

`apps/api/src/features/relation/relation.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import { RelationService } from './relation.service';
import { SetRelationsDto } from './dto/set-relations.dto';

@ApiTags('relations')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post(':entryId')
  setRelations(
    @Param('entryId') entryId: string,
    @Body() dto: SetRelationsDto,
    @Req() req: any,
  ) {
    return this.relationService.setRelations(
      req.tenant.schemaName,
      entryId,
      dto.fieldName,
      dto.relatedEntryIds,
    );
  }

  @Get(':entryId/:fieldName')
  getRelations(
    @Param('entryId') entryId: string,
    @Param('fieldName') fieldName: string,
    @Req() req: any,
  ) {
    return this.relationService.getRelations(
      req.tenant.schemaName,
      entryId,
      fieldName,
    );
  }

  @Get(':entryId/related')
  getRelatedEntries(@Param('entryId') entryId: string, @Req() req: any) {
    return this.relationService.getRelatedEntries(
      req.tenant.schemaName,
      entryId,
    );
  }
}
```

- [ ] **Step 4: Create RelationModule**

`apps/api/src/features/relation/relation.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';

@Module({
  controllers: [RelationController],
  providers: [RelationService],
  exports: [RelationService],
})
export class RelationModule {}
```

- [ ] **Step 5: Register RelationModule in AppModule**

In `apps/api/src/app.module.ts`, add `RelationModule` to imports.

- [ ] **Step 6: Build & restart API**

```bash
docker cp apps/api/src/features/relation cms-api-1:/app/apps/api/src/features/relation
docker cp apps/api/src/common/services/tenant-db.service.ts cms-api-1:/app/apps/api/src/common/services/tenant-db.service.ts
docker cp apps/api/src/app.module.ts cms-api-1:/app/apps/api/src/app.module.ts
docker exec cms-api-1 sh -c "pnpm --filter=api build"
docker restart cms-api-1
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/features/relation/ apps/api/src/common/services/tenant-db.service.ts apps/api/src/app.module.ts
git commit -m "feat: add RelationService and relation table"
```

---

### Task 4: Create Relation Server Actions (Frontend)

**Files:**

- Create: `apps/web/server/relation.server.ts`

- [ ] **Step 1: Create relation.server.ts**

```typescript
'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';

const SetRelationResponseSchema = z.object({ message: z.string() });

export const setRelations = async (
  tenantId: string,
  entryId: string,
  fieldName: string,
  relatedEntryIds: string[],
) => {
  const session = await auth();
  const [error] = await safeFetch(
    SetRelationResponseSchema,
    `/relations/${entryId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({ fieldName, relatedEntryIds }),
    },
  );
  if (error) throw new Error(error);
};

const GetRelationsSchema = z.object({
  data: z.array(
    z.object({
      related_entry_id: z.string(),
      sort_order: z.number(),
      display: z.string().nullable().optional(),
    }),
  ),
});

export const getRelations = async (
  tenantId: string,
  entryId: string,
  fieldName: string,
) => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetRelationsSchema,
    `/relations/${entryId}/${fieldName}`,
    {
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/server/relation.server.ts
git commit -m "feat: add relation server actions"
```

---

### Task 5: Update Content Type Editor UI (Create + Edit Pages)

**Files:**

- Modify: `apps/web/app/admin/content-types/create/page.tsx`
- Modify: `apps/web/app/admin/content-types/[id]/edit/page.tsx`

- [ ] **Step 1: Rewrite create page with field cards, drag-drop, gear options**

Replace `apps/web/app/admin/content-types/create/page.tsx` with the enhanced version:

Key changes:

- Update `fieldTypes` constant to include all new types
- Replace `FieldRow` interface with `ContentTypeField` shape (including `options`)
- Each field shown as a card with: type badge, name input, label input, move handle (drag), gear icon (opens FieldOptionsDialog), delete button
- Add `FieldOptionsDialog` — popover/dialog for validation rules, relationship config, slugFrom
- For `select` type: show an options editor (textarea for comma-separated values)
- For `m2o`/`m2m` types: show relatedType + displayField selectors
- For `slug` type: show slugFrom dropdown (populated from other field names)
- Drag-and-drop via `@hello-pangea/dnd` (lighter fork of react-beautiful-dnd)

The file will be ~350 lines. Main structure:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { createContentType } from '@/server/content-type.server';
import {
  fieldTypes,
  ContentTypeField,
  ContentTypeFieldOptions,
} from '@/types/content-type.type';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Textarea } from '@repo/shadcn/textarea';
import { Label } from '@repo/shadcn/label';
import { Checkbox } from '@repo/shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import {
  ArrowLeft,
  Plus,
  X,
  Settings2,
  GripVertical,
} from '@repo/shadcn/lucide';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from '@repo/shadcn/sonner';
import Link from 'next/link';
import FieldOptionsDialog from '@/components/admin/field-options-dialog';

// ... state management, handlers, drag-end handler, submit handler

// JSX: drag-drop context with field cards, each card has:
//   - GripVertical (drag handle)
//   - Name + Label inputs
//   - Type select
//   - Gear icon → FieldOptionsDialog
//   - Delete button
```

- [ ] **Step 2: Create FieldOptionsDialog component**

`apps/web/components/admin/field-options-dialog.tsx`:

A dialog that edits `ContentTypeFieldOptions` for a given field. Shows different options based on field type:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/shadcn/dialog';
import { Button } from '@repo/shadcn/button';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Checkbox } from '@repo/shadcn/checkbox';
import { Settings2 } from '@repo/shadcn/lucide';
import { ContentTypeFieldOptions } from '@/types/content-type.type';

interface FieldOptionsDialogProps {
  options?: ContentTypeFieldOptions;
  fieldType: string;
  allFieldNames: string[];
  onChange: (options: ContentTypeFieldOptions) => void;
  trigger: React.ReactNode;
}

export default function FieldOptionsDialog({
  options,
  fieldType,
  allFieldNames,
  onChange,
  trigger,
}: FieldOptionsDialogProps) {
  const [local, setLocal] = useState<ContentTypeFieldOptions>(options || {});
  // ... form fields for validation, slugFrom, relatedType, displayField
  // Show slugFrom only for slug type
  // Show relatedType + displayField only for m2o/m2m types
  // Show required, unique, min, max, pattern for all types
  // On save: onChange(local)
  // Render: trigger + Dialog
}
```

- [ ] **Step 3: Update edit page similarly**

`apps/web/app/admin/content-types/[id]/edit/page.tsx` — same changes as create page but pre-populated with existing content type data and calls `updateContentType`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/content-types/ apps/web/components/admin/field-options-dialog.tsx
git commit -m "feat: enhanced content type editor with drag-drop and field options"
```

---

### Task 6: Update Entry Form — New Field Types

**Files:**

- Modify: `apps/web/app/admin/entries/create/page.tsx` (renderFieldInput)
- Modify: `apps/web/app/admin/entries/[id]/edit/page.tsx` (renderFieldInput)

- [ ] **Step 1: Add new field type renderers**

In `renderFieldInput`, add cases:

```tsx
case 'slug':
  return (
    <Input
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
      placeholder={field.label || field.name}
    />
  );

case 'color':
  return (
    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={(value as string) || '#000000'}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        className="w-12 h-9 p-1"
      />
      <Input
        value={value as string}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder="#000000"
      />
    </div>
  );

case 'json':
  return (
    <Textarea
      value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
      placeholder={field.label || field.name}
      className="font-mono text-xs"
      rows={8}
    />
  );

case 'datetime':
  return (
    <Input
      type="datetime-local"
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
    />
  );

case 'time':
  return (
    <Input
      type="time"
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
    />
  );

case 'email':
  return (
    <Input
      type="email"
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
      placeholder={field.label || field.name}
    />
  );

case 'url':
  return (
    <Input
      type="url"
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
      placeholder="https://"
    />
  );

case 'phone':
  return (
    <Input
      type="tel"
      value={value as string}
      onChange={(e) => handleFieldChange(field.name, e.target.value)}
      placeholder="+1 234 567 890"
    />
  );
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/entries/create/page.tsx apps/web/app/admin/entries/[id]/edit/page.tsx
git commit -m "feat: add new field type renderers to entry forms"
```

---

### Task 7: Update Entry Form — Relationship Fields

**Files:**

- Modify: `apps/web/app/admin/entries/create/page.tsx`
- Modify: `apps/web/app/admin/entries/[id]/edit/page.tsx`
- Create: `apps/web/components/admin/relation-picker.tsx`

- [ ] **Step 1: Create RelationPicker component**

`apps/web/components/admin/relation-picker.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getEntries } from '@/server/entry.server';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';

interface RelationPickerProps {
  tenantId: string;
  relatedType: string;
  displayField?: string;
  value: string | string[];
  multiple?: boolean;
  onChange: (value: string | string[]) => void;
}

export default function RelationPicker({
  tenantId,
  relatedType,
  displayField,
  value,
  multiple,
  onChange,
}: RelationPickerProps) {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    getEntries(tenantId)
      .then((all) => {
        setEntries(all.filter((e) => e.content_type_slug === relatedType));
      })
      .catch(console.error);
  }, [tenantId, relatedType]);

  const display = (entry: any) => {
    if (displayField) return entry.fields?.[displayField] || entry.id;
    return entry.fields?.title || entry.fields?.name || entry.id;
  };

  if (multiple) {
    return (
      <div className="space-y-1">
        {entries
          .filter((e) => (value as string[])?.includes(e.id))
          .map((e) => (
            <div key={e.id} className="text-sm">
              {display(e)}
            </div>
          ))}
        <Select
          onValueChange={(id) => onChange([...((value as string[]) || []), id])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Add..." />
          </SelectTrigger>
          <SelectContent>
            {entries
              .filter((e) => !(value as string[])?.includes(e.id))
              .map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {display(e)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Select value={value as string} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {entries.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {display(e)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Add m2o/m2m/o2m cases in renderFieldInput**

In both create and edit pages, add to the switch:

```tsx
case 'm2o':
  return tenantId ? (
    <RelationPicker
      tenantId={tenantId}
      relatedType={field.options?.relatedType || ''}
      displayField={field.options?.displayField}
      value={value as string}
      onChange={(v) => handleFieldChange(field.name, v)}
    />
  ) : <p className="text-sm text-muted-foreground">Select a tenant first</p>;

case 'm2m':
  return tenantId ? (
    <RelationPicker
      tenantId={tenantId}
      relatedType={field.options?.relatedType || ''}
      displayField={field.options?.displayField}
      value={value as string[] || []}
      multiple
      onChange={(v) => handleFieldChange(field.name, v)}
    />
  ) : <p className="text-sm text-muted-foreground">Select a tenant first</p>;

case 'o2m':
  return (
    <p className="text-sm text-muted-foreground italic">
      This field displays entries that reference this entry.
      Manage relationships from the related entry&apos;s m2o field.
    </p>
  );
```

- [ ] **Step 3: Add saveRelations call on entry submit**

In both create and edit pages, after `createEntry`/`updateEntry` succeeds, loop through fields and save relations:

```typescript
// After successful create:
for (const field of currentCt.fields) {
  if (field.type === 'm2o' || field.type === 'm2m') {
    const val = fields[field.name];
    const ids =
      field.type === 'm2o'
        ? val
          ? [val as string]
          : []
        : (val as string[]) || [];
    if (ids.length > 0) {
      await setRelations(tenantId, createdEntryId, field.name, ids);
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/relation-picker.tsx apps/web/app/admin/entries/create/page.tsx apps/web/app/admin/entries/[id]/edit/page.tsx
git commit -m "feat: add relationship field UI to entry forms"
```

---

### Task 8: Update Entry Preview for New Types

**Files:**

- Modify: `apps/web/components/admin/entry-preview.tsx`

- [ ] **Step 1: Add new type renderers to preview**

Add cases for slug/color/json/datetime/time/email/url/phone:

```tsx
case 'slug':
case 'email':
case 'url':
case 'phone':
case 'datetime':
case 'time':
  return <p className="text-sm">{String(value || '')}</p>;

case 'color':
  return (
    <div className="flex items-center gap-2">
      <div className="size-4 rounded border" style={{ backgroundColor: String(value || '#000') }} />
      <span className="text-sm">{String(value || '')}</span>
    </div>
  );

case 'json':
  return (
    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );

case 'm2o':
case 'o2m':
case 'm2m':
  return <p className="text-sm text-muted-foreground italic">Relationship field</p>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/admin/entry-preview.tsx
git commit -m "feat: add new field type renderers to entry preview"
```

---

### Task 9: Update Entry List — Configurable Columns

**Files:**

- Modify: `apps/web/app/admin/entries/page.tsx`

- [ ] **Step 1: Add dynamic column rendering**

Update the entries table to show field values as columns. Read the content type's fields to determine which columns to show (first 3 non-relationship fields + status + locale + updated_at):

```typescript
// Get fields from first matching content type
const displayFields = contentTypes
  .find(ct => ct.slug === filterSlug || (filterSlug === 'all' && false))
  ?.fields.filter(f => !['m2o','o2m','m2m','repeater'].includes(f.type))
  .slice(0, 3) || [];

// In table header:
{displayFields.map(f => (
  <th key={f.name} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
    {f.label || f.name}
  </th>
))}

// In table body:
{displayFields.map(f => (
  <td key={f.name} className="px-4 py-3 text-sm truncate max-w-[200px]">
    {renderCellValue(entry.fields?.[f.name], f.type)}
  </td>
))}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/entries/page.tsx
git commit -m "feat: dynamic columns in entry list from content type fields"
```

---

### Task 10: Add Validation (Frontend + Backend)

**Files:**

- Modify: `apps/web/app/admin/entries/create/page.tsx`
- Modify: `apps/web/app/admin/entries/[id]/edit/page.tsx`

- [ ] **Step 1: Add frontend validation on submit**

Before submitting, validate each field against its options:

```typescript
const validate = (): string | null => {
  for (const field of currentCt.fields) {
    const val = fields[field.name];
    if (field.options?.required && (!val || val === '')) {
      return `${field.label || field.name} is required`;
    }
    if (
      field.options?.min &&
      typeof val === 'number' &&
      val < field.options.min
    ) {
      return `${field.label || field.name} must be at least ${field.options.min}`;
    }
    if (
      field.options?.max &&
      typeof val === 'number' &&
      val > field.options.max
    ) {
      return `${field.label || field.name} must be at most ${field.options.max}`;
    }
    if (
      field.options?.pattern &&
      typeof val === 'string' &&
      !new RegExp(field.options.pattern).test(val)
    ) {
      return `${field.label || field.name} does not match the required pattern`;
    }
  }
  return null;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/entries/create/page.tsx apps/web/app/admin/entries/[id]/edit/page.tsx
git commit -m "feat: add field validation on entry submit"
```

---

### Task 11: Rebuild API & Deploy

- [ ] **Step 1: Copy all changed API files and rebuild**

```bash
docker cp apps/api/src/features/relation cms-api-1:/app/apps/api/src/features/relation
docker cp apps/api/src/common/services/tenant-db.service.ts cms-api-1:/app/apps/api/src/common/services/tenant-db.service.ts
docker cp apps/api/src/app.module.ts cms-api-1:/app/apps/api/src/app.module.ts
docker exec cms-api-1 sh -c "pnpm --filter=api build"
docker restart cms-api-1
```

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete content types enhancement with relationships, new field types, and validation"
```
