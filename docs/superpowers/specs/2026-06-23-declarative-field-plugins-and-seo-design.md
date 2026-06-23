# Design: Declarative Field Plugins + SEO Plugin (Phase 1 of Plugin Marketplace)

## Context

OpenCMS already has a file-based plugin system (`apps/api/src/features/plugin/`). Today a plugin is a
**feature toggle + navigation + metadata** for code that already lives in the repo. The documented scope
(`docs/plugin-development.md`, lines 17–20) is explicit: the system does **not** hot-load remote NestJS modules
or Next.js pages at runtime. A ZIP install (`plugin-files.service.ts`) extracts static files into
`plugins/<id>/` and validates `manifest.json`, but never executes plugin code.

Separately, the content model is field-driven:

- Content types store a `fields` JSON column — an array of `{ name, type, label, options }`
  (`apps/api/src/content-types/`).
- A rich set of field types already exists: `text`, `textarea`, `rich_text`, `number`, `boolean`, `date`,
  `image`, `select`, `url`, `json`, `datetime`, etc. (see `create-content-type.dto.ts`).
- Entries store their values as a JSON object keyed by field name (`apps/api/src/entries/`).
- The entry editor in `apps/web` renders fields generically from `content_type.fields`.

The user wants a plugin marketplace connected to the `nuvooo/opencms-plugins` repo, where users can
auto-install plugins. The first plugin is an **SEO plugin** that gives editors SEO fields to fill in per content
item.

This spec covers **Phase 1**: a generic **declarative field-plugin engine** plus the **SEO plugin** that uses
it. The marketplace/registry integration is **Phase 2** and gets its own spec (sketched under "Phase 2 (Out of
Scope Here)").

## Goals

1. Extend the plugin manifest with an **optional, backward-compatible** `fieldGroup` declaration.
2. Build a generic Core engine that injects a plugin's declared fields into selected content types' `fields`
   column, and removes them again — non-SEO-specific, reusable by future field plugins.
3. Provide generic API endpoints to query and toggle which content types a plugin's field group is applied to.
4. Provide a generic admin page (reached via the plugin's `navItems`) to manage that selection.
5. Ship the **SEO plugin** as an extended manifest declaring the "Erweitert" SEO field set.
6. Ensure injected fields are tagged so they are identifiable, non-destructively removable, and protected from
   accidental edit/delete in the field editor.

## Non-Goals

- No runtime hot-loading of plugin code (NestJS/Next.js). The model stays declarative.
- No marketplace/registry fetching or one-click install (that is Phase 2).
- No rendering of SEO meta tags on a public-facing frontend. This phase only **captures and stores** SEO data;
  output/consumption is up to the headless API consumer.
- No automatic deletion of already-entered SEO **values** from entries on removal (non-destructive).

## Architecture

The declarative field plugin splits into two parts:

- **Generic engine (Core, ships with OpenCMS):** reads field declarations from a plugin manifest and
  injects/removes them in `content_type.fields`. Lives in the API; the matching admin UI lives in `apps/web`.
  Reusable for any future field plugin — not SEO-specific.
- **The SEO plugin (manifest only):** an extended `manifest.json` that declares the SEO field group. No
  executable code. Distributed (in Phase 2) via the marketplace; installable today via the existing
  `Install from ZIP` flow.

This keeps the documented "no code hot-loading" guarantee intact: the engine is core code; the plugin only
contributes declarative data.

### 1. Manifest extension

Add an optional `fieldGroup` to the manifest. Shape:

```json
{
  "id": "seo",
  "name": "SEO",
  "description": "SEO-Felder für deine Inhalte.",
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
      }
    ]
  }
}
```

`fieldGroup` schema:

| Field           | Rules                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `key`           | Lowercase kebab-case; identifies the group. For SEO: `seo`. Used as the field-name prefix base. |
| `label`         | Non-empty display name for the group.                                                           |
| `fields`        | Array of `{ name, type, label, options? }`, same shape as `ContentTypeField`.                   |
| `fields[].type` | Must be one of the existing `FIELD_TYPES`.                                                      |
| `fields[].name` | Should be prefixed (`seo_…`) to avoid collisions. Validation enforces it starts with `<key>_`.  |

`fieldGroup` is **optional**. Both validation schemas are extended:

- `UploadManifestSchema` in `plugin-files.service.ts` (ZIP install validation).
- The loader schema in `plugin-loader.service.ts` (folder scan / in-app representation).

Existing plugins without `fieldGroup` continue to load and toggle unchanged.

### 2. Field injection engine (`PluginFieldService`, new, Core/API)

New service in `apps/api/src/features/plugin/` (e.g. `plugin-field.service.ts`).

Responsibilities:

- `getFieldGroup(pluginId)` — return the `fieldGroup` from the enabled plugin's manifest, or `null`.
- `listFieldTargets(schemaName, pluginId)` — return all content types with a boolean `applied` flag
  (true when the plugin's field group is present in that content type's `fields`).
- `applyToContentType(schemaName, pluginId, contentTypeId)` — inject the field group's fields (each tagged) into
  the content type's `fields` column. **Idempotent**: skip fields already present (matched by `name`).
- `removeFromContentType(schemaName, pluginId, contentTypeId)` — strip only fields whose
  `options.source === fieldGroup.key`. Never touches user fields.

Injection rules:

- Each injected field gets `options.source = "<fieldGroup.key>"` and `options.locked = true`.
- Fields are appended to the end of the existing `fields` array, preserving user field order.
- Content-type `fields` updates reuse `ContentTypesService.update` (atomic JSON write already implemented).
- Multi-tenant aware: operates per tenant `schemaName`, like the existing content-types service.

Collision handling: if a user field already exists with the same `name` as an injected field, skip that single
field and include it in a returned `warnings` array; do not fail the whole operation.

### 3. API endpoints (Core, generic)

Add to the plugin controller (`apps/api/src/features/plugin/plugin.controller.ts`) or a small dedicated
controller, admin-session protected like the rest of `/api/plugins`:

| Method & path                         | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/plugins/:id/field-targets`  | List content types with `{ contentTypeId, name, applied }` for the plugin.  |
| `POST /api/plugins/:id/field-targets` | Body `{ contentTypeId, enabled }`. `enabled:true` injects, `false` removes. |

Behavior:

- If the plugin has no `fieldGroup`, return `400` ("plugin contributes no field group").
- If the plugin is disabled, return `403` (consistent with existing gating). The plugin must be enabled before
  applying its fields.
- Responses include any `warnings` from collision handling.

### 4. Admin UI (Core route, gated by the plugin)

A generic "apply field group to content types" page in `apps/web`, reached via the plugin's `navItems`
(`/admin/seo` for SEO). Because it lives under `/admin`, it is automatically covered by `PluginRouteGuard`:
disabling the plugin redirects away.

The page:

- Calls `GET /api/plugins/seo/field-targets` and renders the list of content types with a checkbox per type
  (checked = applied).
- Toggling a checkbox calls `POST /api/plugins/seo/field-targets` with `{ contentTypeId, enabled }`.
- Surfaces any returned `warnings` (e.g. skipped colliding field).

The page is written generically (parameterized by plugin id from the route) so future field plugins can reuse
the same component. For Phase 1 it is wired for `seo`.

### 5. Entry editor (unchanged)

No changes required. The entry editor already renders fields generically from `content_type.fields`, so the
injected SEO fields appear automatically in the entry form, and values save into `entry.fields` under the
`seo_*` keys. The field editor should respect `options.locked` to prevent editing/deleting injected fields —
verify the existing field editor honors `locked`; if not, add that guard as part of this phase.

## Data flow

1. Admin enables the SEO plugin on `/admin/plugins` (existing toggle).
2. Admin opens `/admin/seo`, checks e.g. "Blog Post" and "Page".
3. `POST /api/plugins/seo/field-targets` → engine reads the SEO `fieldGroup` → appends tagged SEO fields to those
   content types' `fields`.
4. Opening a Blog Post entry now shows the SEO field block; values are stored in `entry.fields` under `seo_*`.
5. Unchecking a type (or disabling the plugin and re-applying) removes only the tagged SEO fields from that
   content type. Already-entered values in existing entries remain in their `fields` JSON (non-destructive).

## SEO field group (Erweitert)

All using existing field types:

| Field name                | Type     | Label                   |
| ------------------------- | -------- | ----------------------- |
| `seo_meta_title`          | text     | Meta Title              |
| `seo_meta_description`    | textarea | Meta Description        |
| `seo_canonical_url`       | url      | Canonical URL           |
| `seo_keywords`            | text     | Keywords                |
| `seo_og_title`            | text     | OG Title                |
| `seo_og_description`      | textarea | OG Description          |
| `seo_og_image`            | image    | OG Image                |
| `seo_twitter_title`       | text     | Twitter Title           |
| `seo_twitter_description` | textarea | Twitter Description     |
| `seo_twitter_image`       | image    | Twitter Image           |
| `seo_robots_noindex`      | boolean  | noindex                 |
| `seo_robots_nofollow`     | boolean  | nofollow                |
| `seo_robots_noarchive`    | boolean  | noarchive               |
| `seo_jsonld`              | json     | JSON-LD Structured Data |

Each field carries `options.source = "seo"` and `options.locked = true`.

## Error handling

- Extended manifest with malformed `fieldGroup` → rejected at install/load with a clear validation message.
- Applying a field group from a disabled plugin → `403`.
- Applying from a plugin without a `fieldGroup` → `400`.
- Field-name collision with a user field → skip that field, return a `warning`, do not fail.
- Removal only deletes fields tagged with the matching `source`; user fields are never touched.
- All `fields` writes are atomic JSON updates via the existing content-types update path.

## Testing

API unit/service tests:

- Manifest validation accepts a valid `fieldGroup` and rejects malformed ones; manifests without `fieldGroup`
  still validate.
- `applyToContentType` injects the full SEO group, tags each field, and is idempotent (second call is a no-op).
- `removeFromContentType` strips only `source === "seo"` fields and leaves user fields intact.
- Collision handling skips a colliding field and reports a warning.
- Endpoints: `403` when plugin disabled, `400` when no field group, success path returns updated `applied`
  state.

Web tests:

- `/admin/seo` lists content types and reflects applied state; toggling calls the endpoint.
- Field editor does not allow editing/deleting fields with `options.locked`.

## Packaging the SEO plugin

The SEO plugin ZIP contains just the extended `manifest.json` (with `fieldGroup`). It installs through the
existing `Install from ZIP` admin flow today, and through the Phase 2 marketplace later. The manifest will also
be committed to `nuvooo/opencms-plugins` in Phase 2.

## Phase 2 (Out of Scope Here)

Its own spec later. Sketch:

- `registry.json` schema in `nuvooo/opencms-plugins` (list of plugins: id, name, description, version,
  download URL).
- A fetch service in the API (HTTPS, base URL configurable via env, default = official raw GitHub URL).
- A marketplace tab under `/admin/plugins` listing available plugins with a one-click **Install** that downloads
  the ZIP and runs the existing `installFromZip` flow.
- Update detection (compare installed version vs registry version).

## Reference (files touched)

| Area                         | File                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| Manifest validation (ZIP)    | `apps/api/src/features/plugin/plugin-files.service.ts`           |
| Manifest validation (loader) | `apps/api/src/features/plugin/plugin-loader.service.ts`          |
| Field injection engine (new) | `apps/api/src/features/plugin/plugin-field.service.ts`           |
| Endpoints                    | `apps/api/src/features/plugin/plugin.controller.ts`              |
| Content-type field writes    | `apps/api/src/content-types/content-types.service.ts`            |
| Admin UI                     | `apps/web/app/admin/seo/page.tsx` (generic, parameterized)       |
| Field editor lock guard      | `apps/web` field editor component (verify/add `locked` handling) |
| SEO plugin manifest          | `plugins/seo/manifest.json` (and later `nuvooo/opencms-plugins`) |
