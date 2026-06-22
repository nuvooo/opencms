# Design: File-Based Plugin System With Core/User Separation

## Context

The current plugin setup is seeded in code and stored in an in-memory registry:

- API plugins are hardcoded in `apps/api/src/features/plugin/plugin-seeder.ts`.
- Plugin state exists only in `PluginRegistryService` memory.
- Web currently supports only plugin listing and toggle calls for non-system plugins.

This does not match the desired CMS behavior:

- Plugins should live in explicit plugin folders.
- System plugins should be loaded individually from `core/plugins`.
- User plugins should be installable and removable individually.
- System plugins must never be removable or disableable.

## Goals

1. Load system plugins as individual manifests from `core/plugins`.
2. Load user plugins as individual manifests from `plugins`.
3. Support plugin installation via:
   - ZIP upload in admin UI/API.
   - Manual folder copy + rescan endpoint.
4. Support uninstall for user plugins only (remove code/folder only).
5. Enforce system-plugin immutability:
   - Not deletable.
   - Not disableable.
   - Always enabled.

## Non-Goals

- No automatic deletion of plugin data/config/tables during uninstall.
- No plugin marketplace integration in this phase.
- No dynamic runtime execution sandboxing changes in this phase.

## Proposed Architecture

### 1. Plugin Sources

Two filesystem sources are introduced:

- `core/plugins/<plugin-id>/manifest.json` for system plugins.
- `plugins/<plugin-id>/manifest.json` for user-installed plugins.

Each plugin is represented as a folder with a required manifest file.

### 2. Plugin Loader Layer (API)

Add a loader service in the plugin feature (for example `plugin-loader.service.ts`) that:

1. Scans `core/plugins` and `plugins` directories.
2. Reads manifest files.
3. Validates manifest structure against schema.
4. Marks each descriptor with `source: 'core' | 'user'`.
5. Returns a normalized list for registry hydration.

Load order and collision rule:

- Core plugins are loaded first and have reserved IDs.
- If a user plugin declares the same `id` as a core plugin, it is rejected/ignored with warning.

### 3. Registry Lifecycle

Refactor `PluginRegistryService` to be hydrated from loader output instead of fixed seeding.

Core rules enforced centrally:

- `source='core'` plugins are always `enabled=true`.
- Core plugins cannot be toggled.
- Core plugins cannot be deleted.

Provide explicit methods:

- `getAll()`
- `getById(id)`
- `rescan()`
- `installFromZip(file)`
- `uninstallUserPlugin(id)`

### 4. API Endpoints

Keep existing list endpoint and add lifecycle endpoints:

- `GET /plugins` -> returns merged core + user plugins.
- `POST /plugins/install` -> accepts ZIP upload, extracts to `plugins/<id>`, validates, rescans.
- `POST /plugins/rescan` -> rescans plugin directories and refreshes registry.
- `DELETE /plugins/:id` -> removes user plugin folder only.

Behavior constraints:

- Delete on core plugin returns `403`.
- Toggle endpoint for core plugin is removed or hard-blocked.
- Existing toggle flow is removed in this phase; plugin lifecycle is install, list, rescan, and uninstall.

### 5. Frontend Admin Plugins UI

Update `apps/web/app/admin/plugins/page.tsx` behavior:

- Render separate sections:
  - System Plugins (read-only).
  - Installed Plugins (user plugins).
- Add install UI (ZIP upload action).
- Add delete action for user plugins.
- Add rescan action.

Display rules:

- System plugins show `System` badge and no action buttons for disable/delete.
- User plugins show delete button.

## Manifest Schema

Base fields (existing + source metadata on read):

- `id: string`
- `name: string`
- `description: string`
- `version: string`
- `icon: string`
- `navItems: { path: string; label: string; icon: string }[]`

Server-enriched fields in response:

- `source: 'core' | 'user'`
- `isSystem: boolean` (derived from `source === 'core'`)
- `enabled: boolean` (always `true` for core)

## Data Flow

### Startup

1. API bootstrap triggers plugin loader.
2. Loader scans core and user plugin folders.
3. Registry is populated with merged validated descriptors.

### Install (ZIP)

1. Admin uploads ZIP.
2. API extracts to temporary path.
3. Manifest is validated.
4. Destination `plugins/<id>` is created.
5. Plugin files are written.
6. Registry `rescan()` is executed.
7. Updated plugin descriptor is returned.

### Install (Manual + Rescan)

1. Operator copies plugin folder into `plugins/<id>`.
2. Admin calls rescan endpoint.
3. Registry updates and plugin appears in UI.

### Uninstall (User Plugin)

1. Admin calls delete endpoint.
2. API checks plugin exists and is `source='user'`.
3. API removes folder `plugins/<id>`.
4. Registry rescans.
5. No plugin data cleanup is performed.

## Error Handling

- Invalid ZIP format -> `400 Invalid plugin package`.
- Missing/invalid manifest -> `400 Invalid plugin manifest`.
- Plugin ID conflicts with core plugin -> `409 Plugin id reserved by core`.
- Deleting core plugin -> `403 System plugins cannot be deleted`.
- Plugin not found -> `404 Plugin not found`.
- Rescan with one broken user plugin -> continue loading valid plugins, report warning.

## Testing Strategy

### API Unit Tests

- Loader reads core plugin manifests from `core/plugins`.
- Loader reads user plugin manifests from `plugins`.
- Core-ID collision blocks/ignores conflicting user plugin.
- Core plugins are always returned as enabled and immutable.

### API Integration Tests

- `POST /plugins/install` installs valid ZIP and returns plugin.
- `POST /plugins/rescan` reflects manually added plugin.
- `DELETE /plugins/:id` removes user plugin folder.
- `DELETE /plugins/:coreId` returns `403`.

### Web Tests

- Plugin page renders system and user sections.
- System plugin cards do not show destructive actions.
- Upload, delete, and rescan actions trigger refresh and success/error toasts.

## Migration Plan

1. Introduce filesystem plugin loader and updated schema.
2. Move current seeded system plugin definitions into `core/plugins/*/manifest.json`.
3. Refactor registry to load from filesystem at startup and rescan.
4. Add install/rescan/delete API endpoints.
5. Update web plugin page for grouped display and lifecycle actions.
6. Add automated tests for loader, API lifecycle, and UI behavior.

## Acceptance Criteria

Implementation is complete when all are true:

1. System plugins are loaded from `core/plugins` as individual manifests.
2. User plugins are loaded from `plugins` as individual manifests.
3. Plugins can be installed via ZIP and via manual copy + rescan.
4. User plugins can be uninstalled, and uninstall removes only code folder.
5. System plugins cannot be deleted or disabled.
6. UI clearly separates system and user plugins.
7. Tests cover core lifecycle and immutability rules.
