# Plugin Development

In OpenCMS, **features are plugins**. The built-in features (Entries, Media, Content Types, …) are registered the
same way the plugins you write are. This guide explains the plugin model, the manifest format, how to gate
backend and frontend routes, and how to package and install a plugin.

## Mental model

A plugin is a **directory with a `manifest.json`** that declares an id, some metadata, and the navigation entries
it contributes to the admin sidebar. The plugin registry tracks which plugins exist and whether each is enabled,
and the rest of the system reacts to that:

- The **admin sidebar** is built from the `navItems` of every **enabled** plugin.
- **Backend routes** can opt into gating so they return `403` while their plugin is disabled.
- **Frontend routes** belonging to a disabled plugin redirect to the dashboard.

> **Scope (important):** the plugin system handles **registration, navigation, enable/disable, and gating**. It
> does **not** hot-load remote React pages or NestJS modules from a package at runtime. In practice that means a
> plugin's `navItems` should point at routes that exist in the app, and any API it needs is implemented in
> `apps/api`. Think of a plugin as **a feature toggle + navigation + metadata** for code that lives in the repo.

## Where plugins live

| Kind            | Location                      | How it gets there                  |
| --------------- | ----------------------------- | ---------------------------------- |
| **Core** plugin | `apps/api/core/plugins/<id>/` | Ships with OpenCMS                 |
| **User** plugin | `apps/api/plugins/<id>/`      | Installed from a ZIP via the admin |

(If a `core/plugins` or `plugins` directory exists at the repo root, that location is preferred over the
`apps/api/...` path.)

## The manifest

Every plugin needs a `manifest.json`. All fields are required.

```json
{
  "id": "newsletter",
  "name": "Newsletter",
  "description": "Manage newsletter subscribers and campaigns.",
  "version": "1.0.0",
  "icon": "FileText",
  "navItems": [
    {
      "path": "/admin/newsletter",
      "label": "Newsletter",
      "icon": "FileText"
    }
  ]
}
```

| Field         | Rules                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| `id`          | Lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Must not collide with a core id. |
| `name`        | Non-empty display name.                                                              |
| `description` | Non-empty, shown on the Plugins admin page.                                          |
| `version`     | Non-empty version string (e.g. `1.0.0`).                                             |
| `icon`        | Icon name (see below).                                                               |
| `navItems`    | Array of `{ path, label, icon }`. `path` is the admin route the entry links to.      |

### Icons

Icons are referenced by name and resolved on the web side in
`apps/web/lib/plugin/icons.tsx`. The built-in set is:

`LayoutDashboard`, `FileText`, `FileType`, `ImageIcon`, `Building2`, `Puzzle`, `KeyRound`

Unknown names fall back to the `Puzzle` icon. To add more, import the icon and extend the `iconMap` in
`apps/web/lib/plugin/icons.tsx`.

## Build a plugin step by step

The example below adds a "Newsletter" feature.

### 1. Create the manifest

```bash
mkdir -p apps/api/plugins/newsletter
```

`apps/api/plugins/newsletter/manifest.json`:

```json
{
  "id": "newsletter",
  "name": "Newsletter",
  "description": "Manage newsletter subscribers and campaigns.",
  "version": "1.0.0",
  "icon": "FileText",
  "navItems": [
    { "path": "/admin/newsletter", "label": "Newsletter", "icon": "FileText" }
  ]
}
```

Restart the API (or click **Rescan Plugins** in the admin) and the plugin appears under **Installed Plugins** with
a "Newsletter" entry in the sidebar.

### 2. Implement the admin page

The nav item points at `/admin/newsletter`, so create that route in the web app:

`apps/web/app/admin/newsletter/page.tsx`:

```tsx
const NewsletterPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
      <p className="text-muted-foreground">Manage subscribers and campaigns.</p>
    </div>
  );
};

export default NewsletterPage;
```

Because the route lives under `/admin`, it is automatically covered by `PluginRouteGuard`: if the Newsletter
plugin is disabled, visiting `/admin/newsletter` redirects to the dashboard.

### 3. (Optional) Add and gate an API

If your feature needs backend endpoints, add a NestJS module in `apps/api/src` as usual, then **gate** its
controller so requests are rejected while the plugin is disabled:

```ts
import { Controller, Get } from '@nestjs/common';
import { RequiresPlugin } from '@/features/plugin/requires-plugin.decorator';

@RequiresPlugin('newsletter') // matches the manifest id
@Controller('newsletter')
export class NewsletterController {
  @Get('subscribers')
  list() {
    return { data: [] };
  }
}
```

`PluginEnabledGuard` is registered globally. Any handler or controller marked with `@RequiresPlugin('<id>')`
returns **403** while that plugin is disabled; unmarked routes are never gated.

### 4. Toggle it

Open **/admin/plugins**. Your plugin shows under **Installed Plugins** with an enable/disable switch. Toggling it
updates the sidebar and route access immediately (no refresh) and persists the state in the `plugin_state` table.

## Packaging and installing a plugin (ZIP)

User plugins can be installed through the admin UI without touching the filesystem manually.

### Package

Create a ZIP whose contents include `manifest.json`. The manifest may be at the root of the archive or inside a
single top-level folder — both work:

```text
newsletter.zip
└── manifest.json            # or  newsletter/manifest.json
```

Include any static files your plugin ships alongside the manifest; they are extracted into
`apps/api/plugins/<id>/`.

### Install

1. Go to **/admin/plugins**.
2. Use **Install from ZIP** and pick your archive.

The API validates the package:

- `manifest.json` must be present and valid.
- The `id` must be kebab-case and **must not** collide with a core plugin id.
- File paths inside the archive are checked to prevent path traversal; extraction is atomic (staged, then
  swapped, with automatic rollback on failure).

After installation the plugin appears immediately. Remember to ship/implement the route(s) its `navItems` point
to (see steps 2–3 above) if they are not already in the app.

### Uninstall

Click **Delete** on an installed plugin. Core plugins cannot be deleted.

## Marketplace (install over the network)

Beyond manual ZIP uploads, OpenCMS can install plugins straight from a remote
registry via **Admin → Marketplace**.

- The registry is a `catalog.json` index listing available plugins and a
  `downloadUrl` for each package. The official registry lives in the
  [`nuvooo/opencms-plugins`](https://github.com/nuvooo/opencms-plugins)
  repository.
- The catalog location is configured with the `PLUGIN_MARKETPLACE_URL`
  environment variable. It accepts `http(s):` and `file:` URLs (the latter is
  handy for local development against a checkout). It defaults to the published
  registry's raw `catalog.json`.
- `GET /api/plugins/marketplace` returns the catalog decorated with each
  plugin's local install state; `POST /api/plugins/marketplace/install`
  (`{ id }`) downloads the package and installs it through the same code path as
  a ZIP upload, then rescans.

`PluginMarketplaceService`
(`apps/api/src/features/plugin/plugin-marketplace.service.ts`) fetches the
catalog and hands the downloaded bytes to
`PluginFilesService.installFromBuffer()`.

### Feature plugins vs. metadata plugins

A marketplace package contains a `manifest.json` (and docs/assets). The feature
code it unlocks ships **with** OpenCMS and stays gated behind
`@RequiresPlugin('<id>')` until the plugin is installed and enabled. The
first-party **SEO** plugin works this way: installing it from the marketplace
flips on the `/api/seo/*` routes (`sitemap.xml`, `robots.txt`, settings) and the
**Admin → SEO** page, which otherwise return `403`.

## Protected core plugins

Some core features are **protected**: they can never be disabled and are always reported as enabled, so an admin
can always recover. These are: `entries`, `locales`, `media`, `content-types`, `api-tokens`, `dashboard`, and
`plugins`. The optional `tenants` plugin is **not** protected and can be toggled.

You cannot mark a user plugin as protected via its manifest; protection is defined for core features in
`PluginRegistryService` (`apps/api/src/features/plugin/plugin-registry.service.ts`).

## Reference

| Thing                       | File                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Manifest loading + scanning | `apps/api/src/features/plugin/plugin-loader.service.ts`                                |
| Enable/disable + protection | `apps/api/src/features/plugin/plugin-registry.service.ts`                              |
| ZIP install/uninstall       | `apps/api/src/features/plugin/plugin-files.service.ts`                                 |
| HTTP API (`/api/plugins`)   | `apps/api/src/features/plugin/plugin.controller.ts`                                    |
| Backend route gating        | `apps/api/src/features/plugin/requires-plugin.decorator.ts`, `plugin-enabled.guard.ts` |
| Frontend registry/context   | `apps/web/lib/plugin/registry.tsx`                                                     |
| Sidebar icons               | `apps/web/lib/plugin/icons.tsx`                                                        |
| Frontend route gating       | `apps/web/components/admin/plugin-route-guard.tsx`                                     |

## HTTP API summary

All routes are under `/api/plugins` and require an admin session (except as configured):

| Method & path                           | Description                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/plugins`                      | List all plugins with their state.                                                  |
| `PATCH /api/plugins/:id`                | Enable/disable a plugin (`{ enabled }`). Protected plugins reject disable with 403. |
| `POST /api/plugins/install`             | Install from an uploaded ZIP.                                                       |
| `POST /api/plugins/rescan`              | Re-scan the plugin directories.                                                     |
| `DELETE /api/plugins/:id`               | Uninstall a user plugin (core plugins rejected).                                    |
| `GET /api/plugins/marketplace`          | List the remote catalog with local install state.                                   |
| `POST /api/plugins/marketplace/install` | Download and install a catalog plugin (`{ id }`).                                   |
