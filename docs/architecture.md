# Architecture

OpenCMS is a Turborepo monorepo with two deployable apps and a set of shared packages.

```text
opencms
├── apps
│   ├── api     # NestJS + Fastify backend (REST under /api)
│   └── web     # Next.js App Router admin UI
└── packages
    ├── shadcn        # UI component library (shadcn/UI + Tailwind v4)
    ├── utils         # Shared utilities
    ├── constants     # Shared constants
    ├── eslint-config # Shared ESLint config
    └── ts-config     # Shared TypeScript config
```

## Request flow

```text
Browser ──▶ Next.js (apps/web)
              │  server actions / server components call the API
              ▼
            NestJS API (apps/api)  ──▶  TypeORM  ──▶  PostgreSQL / MySQL / SQLite
```

The web app talks to the API through server-side actions (`apps/web/server/*.server.ts`) using a small
`safeFetch` helper. The API base URL is `API_URL` (default `http://localhost:8000/api`). Because these calls run
on the Next.js server, they are not subject to browser CORS.

## API (apps/api)

NestJS on the Fastify adapter. Notable pieces:

- **Global prefix `/api`** and Swagger docs at `/api-docs` (non-production).
- **Validation** with a global `ValidationPipe`; environment validated by Zod (`common/utils/validateEnv.ts`).
- **Auth** via JWT access + refresh tokens; guards (`JwtAuthGuard`, `RolesGuard`) are registered globally and
  routes opt out with `@Public()` or restrict with `@Roles(...)`.
- **Database** through TypeORM (`database.module.ts`). The engine is chosen by `DB_TYPE`; per-tenant content
  tables are created on demand with a tenant-prefixed name.
- **Feature modules** under `src/features` and `src/*`: `content-types`, `entries`, `media`, `locales`,
  `tenants`, `plugin`, `api-token`, `auth`, `mail`, `file`, `health`, `setup`, plus a GraphQL content resolver.

### First-run installer

The API boots in **two phases** so a fresh machine can be configured entirely from the browser:

```text
start
  │  SETUP_COMPLETE=true in .env ?
  ├── no  ─▶ InstallerModule (no DB, no guards) ── serves /api/setup/* ──┐
  │                                                                      │ wizard finishes
  │           ◀── in-process switch, no manual restart ─────────────────┘
  └── yes ─▶ AppModule (full app, connected to the chosen database)
```

- **Phase 1 — Installer.** A minimal module exposes only `GET /api/setup/status`, `POST /api/setup/validate-db`,
  and `POST /api/setup/bootstrap`. It has **no database connection and no auth guards**, so it is reachable on a
  machine that has nothing configured yet.
- **Phase 2 — Bootstrap.** When the wizard submits, the API validates the chosen database, creates the schema and
  the admin user through a short-lived connection, writes `apps/api/.env` (including `SETUP_COMPLETE=true`), then
  tears down the installer and starts the full `AppModule` against that database — all in the same process.

The single source of truth for "is setup done?" is the `SETUP_COMPLETE=true` flag in `.env`, so the boot decision
never depends on a reachable database.

## Web (apps/web)

Next.js 15 App Router with React 19.

- **`/setup`** renders the installer wizard until setup is complete, then redirects to sign-in.
- **`/admin/*`** is the authenticated admin. Its layout wires up the plugin system (see below) and a route guard.
- **Server actions** in `server/*.server.ts` are the only place that calls the API; components stay declarative.
- **UI** comes from the `@repo/shadcn` package (shadcn/UI + Tailwind v4).

## The plugin system

Features in OpenCMS are modeled as **plugins**. A plugin is a directory containing a `manifest.json` that
declares an id, metadata, and the navigation entries it contributes.

- **Core plugins** live in `apps/api/core/plugins/<id>/` and ship with OpenCMS (Entries, Media, Content Types,
  Locales, Tenants, API Tokens, Dashboard, Plugins).
- **User plugins** live in `apps/api/plugins/<id>/` and are installed from a ZIP via the admin UI.

How the pieces connect:

| Concern               | Where                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| Discover manifests    | `PluginLoaderService` (API) scans `core/plugins` and `plugins`              |
| Enable/disable state  | `PluginRegistryService` + `plugin_state` table (persisted)                  |
| HTTP API              | `PluginController` (`/api/plugins`) — list, toggle, install, rescan, delete |
| Backend route gating  | `@RequiresPlugin('<id>')` + `PluginEnabledGuard` (disabled ⇒ 403)           |
| Frontend state        | `PluginProvider` context + `PluginLoader` (web)                             |
| Sidebar navigation    | Built from each enabled plugin's `navItems`                                 |
| Frontend route gating | `PluginRouteGuard` redirects disabled plugins' routes to the dashboard      |

**Protected plugins** are core features the CMS cannot run without (`entries`, `locales`, `media`,
`content-types`, `api-tokens`, `dashboard`, `plugins`). They are always enabled and can never be disabled, so an
admin can always recover. The optional `tenants` plugin stays toggleable.

When you toggle a plugin in the admin, the change is persisted and pushed into the shared registry, so the
sidebar and route access update **immediately** — no refresh required.

➡️ To build one, see **[Plugin Development](plugin-development.md)**.

## Authentication

- The API issues **JWT access and refresh tokens**. Access tokens are short-lived; refresh tokens rotate the
  session. Middleware on the web side refreshes the access token before protected requests when needed.
- The web app uses **NextAuth** for the session cookie (encrypted with `AUTH_SECRET`).
- **API tokens** (managed under `/admin/api-tokens`) allow programmatic access to the REST API without a browser
  session.

## Testing

- **API** — Jest unit/integration tests next to the source (`*.spec.ts`) and e2e tests under `apps/api/test`.
  A standalone first-run smoke test lives at `apps/api/scripts/e2e-setup-flow.mjs`.
- **Web** — Vitest + Testing Library (`*.test.tsx`), with a jsdom setup in `apps/web/vitest.setup.ts`.
