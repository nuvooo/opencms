# Content Types Enhancement Design

## Goal

Extend the CMS content type system with Directus-like features: new field types, relationships (m2o/o2m/m2m), field validation, and an improved content type editor UI.

## Constraints

- Tenant-scoped schemas (each tenant gets its own `content_type`, `entry`, and `relation` tables)
- Backend: NestJS (Fastify) with TypeORM
- Frontend: Next.js 14 App Router, shadcn/ui, React
- Currently `fields` are stored as JSONB in `content_type` table
- `synchronize: true` for dev (auto-create tables)

## New Field Types

Extended `type` enum on `ContentTypeField`:

```
text | textarea | rich_text | number | boolean | date | image | select | repeater
| slug | color | json | datetime | time | email | url | phone | m2o | o2m | m2m
```

| Type     | Storage        | UI Component               | Notes                                     |
| -------- | -------------- | -------------------------- | ----------------------------------------- |
| slug     | fields JSONB   | Input (auto-generated)     | `slugFrom` option references source field |
| color    | fields JSONB   | Input[type=color]          | Hex value                                 |
| json     | fields JSONB   | Textarea (monospace)       | Raw JSON string                           |
| datetime | fields JSONB   | Input[type=datetime-local] | ISO string                                |
| time     | fields JSONB   | Input[type=time]           | HH:mm format                              |
| email    | fields JSONB   | Input[type=email]          |                                           |
| url      | fields JSONB   | Input[type=url]            |                                           |
| phone    | fields JSONB   | Input[type=tel]            |                                           |
| m2o      | relation table | Select (searchable)        | Display `displayField` from related entry |
| o2m      | relation table | Read-only list             | Display "N entries reference this"        |
| m2m      | relation table | Multi-select + sort        | Junction via relation table               |

## Field Options (extended)

Each field gets an `options` object stored in the `fields` JSONB:

```typescript
interface FieldOptions {
  required?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  pattern?: string; // regex validation
  defaultValue?: unknown;
  slugFrom?: string; // source field name for slug auto-generation
  relatedType?: string; // content type slug for relationships
  displayField?: string; // field name to display for related entries
}
```

## Relation Table

A single `relation` table in each tenant schema:

```sql
CREATE TABLE relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  related_entry_id UUID NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(entry_id, field_name, related_entry_id)
);
```

- **m2o**: Single row per field, `sort_order = 0`
- **m2m**: Multiple rows per field, `sort_order` determines order
- **o2m**: Reverse lookup — find all rows where `related_entry_id = this entry`

### RelationService (backend)

```
setRelations(entryId, fieldName, relatedEntryIds[])  → replaces all
getRelations(entryId, fieldName)                      → returns related entry IDs + display data
getRelatedEntries(relatedEntryId)                     → o2m: entries referencing this one
deleteRelations(entryId)                              → cleanup on entry delete
```

## Content Type Editor (UI Changes)

- **Drag & Drop** field reordering (currently static list)
- **Add Field** button → popover with: name, type selector, label
- **Field Card** for each field showing: type badge, name, label, move handle, delete button
- **Gear icon** on each card → opens options dialog for validation/relationship config
- **Slug field**: additional `slugFrom` dropdown to select source field
- **Relationship fields**: additional `relatedType` + `displayField` selectors

## Entry Form (UI Changes)

- **m2o**: Searchable `<Select>` with entries of `relatedType`, shows `displayField`. "Create New" button opens inline creation modal.
- **m2m**: Searchable multi-select with drag-to-reorder. Saved as multiple relation rows.
- **o2m**: Read-only badge showing count. Click shows list of referencing entries.
- **New field types**: Input components as described in table above.
- **Validation**: Frontend validation on submit (required, min, max, pattern). Backend validation as well.

## Entry List (UI Changes)

- **Configurable columns**: Content type editor can mark fields as "show in table"
- **Relationship columns**: Display `displayField` of related entry
- **Column sorting**: Click header to sort by field value

## Updated Zod Schemas

```typescript
FieldOptionsSchema = z.object({
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

ContentTypeFieldSchema = z.object({
  name: z.string(),
  type: z.enum([
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
  ]),
  label: z.string().optional(),
  options: FieldOptionsSchema.optional(),
});
```

```

```

## Tenant DB Schema Migration

`TenantDbService.createTenantSchema()` must also create the `relation` table:

```sql
CREATE TABLE IF NOT EXISTS "schemaName".relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES "schemaName".entry(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  related_entry_id UUID NOT NULL REFERENCES "schemaName".entry(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(entry_id, field_name, related_entry_id)
);
```

Existing tenants: on API startup, `TenantDbService.onModuleInit()` queries all tenants and runs `CREATE TABLE IF NOT EXISTS` for the relation table in each tenant's schema.

## Implementation Order

1. Update `ContentTypeFieldSchema` with new types + FieldOptions
2. Add `relation` table to `TenantDbService`
3. Create backend `RelationService` (CRUD on relation table)
4. Add new field type UI components in entry form (slug, color, json, datetime, etc.)
5. Add relationship field UI components (m2o select, m2m multi-select, o2m display)
6. Update content type editor: drag-drop, field cards, options dialog
7. Update entry list: configurable columns + sorting
8. Add validation (frontend + backend)
9. Test with existing content types and entries
