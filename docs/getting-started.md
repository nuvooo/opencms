# Getting Started

This guide takes you from a clean checkout to a running OpenCMS with an admin account.

## Prerequisites

- **Node.js ≥ 20**
- **pnpm 9** — enable it with `corepack enable` (ships with Node).
- **A database (optional).** You can choose **SQLite** in the installer and run with no external services.
  For PostgreSQL or MySQL/MariaDB, have a reachable server and an empty database ready.

## 1. Install

```bash
git clone https://github.com/nuvooo/opencms.git
cd opencms
pnpm install
```

## 2. Run in development

```bash
pnpm dev
```

This starts both apps via Turborepo:

- **API** → http://localhost:8000 (REST under `/api`, Swagger at `/api-docs`)
- **Web** → http://localhost:3000

You do **not** need to create any `.env` files first — the apps boot with safe defaults so you can reach the
installer. (If port 3000 is taken, Next.js will pick the next free port and print it.)

## 3. Complete the setup wizard

Open the web app at **http://localhost:3000**. A fresh install redirects you to **`/setup`**. The wizard has
four steps:

1. **Database** — pick PostgreSQL, MySQL, or SQLite, fill in the connection details, and click **Validate
   connection**. For SQLite you only provide a file path (e.g. `./data/cms.sqlite`); no server is required.
2. **Admin** — enter the email and password for the first administrator. The password must be at least 8
   characters and include an uppercase letter, a number, and a special character.
3. **Review** — set the **Auth secret** (used to sign sessions; at least 10 characters) and confirm.
4. **Install** — the API creates the database schema and the admin user, writes its `.env`, and then switches
   from the installer into the full application **automatically — no manual restart**.

When it finishes, follow **Go to sign-in** and log in with the admin account you just created.

### What happens under the hood

On first run the API boots a **lightweight installer** that exposes only the setup endpoints and needs **no
database**. When you click _Install_, it provisions the database you chose, persists the configuration to
`apps/api/.env` (including `SETUP_COMPLETE=true`), and the process boots the full application against that
database in-process. On every later start, the presence of `SETUP_COMPLETE=true` makes the API start in full
mode directly. See [Architecture](architecture.md#first-run-installer) for details.

## 4. Explore the admin

After signing in you land in the admin at `/admin`. From the sidebar you can:

- **Content Types** — define content schemas and fields.
- **Entries** — author content against those schemas.
- **Media** — upload and manage files.
- **Locales** — manage languages and translations.
- **Tenants** — manage isolated multi-tenant environments (optional).
- **API Tokens** — create tokens for programmatic API access.
- **Plugins** — enable/disable features and install new ones (see
  [Plugin Development](plugin-development.md)).

## Running tests

```bash
pnpm test        # both apps
pnpm test:api    # API only (Jest)
pnpm test:web    # web only (Vitest)
```

## Production build

```bash
pnpm build
pnpm start
```

For production, make sure the values in `apps/api/.env` and `apps/web/.env` are set appropriately — most
importantly strong secrets and the correct database and URLs. See [Configuration](configuration.md).

## Troubleshooting

- **"Invalid environment variables" / the web app won't load.** Rebuild after pulling changes (`pnpm build` or
  restart `pnpm dev`); the web app reads its env at build time.
- **Setup page shows "fetch failed".** The API isn't reachable. Make sure `pnpm dev` is running and the API is
  listening on `:8000` (or update `API_URL` in `apps/web/.env`).
- **The installer never finishes after clicking Install.** Check the API logs — the most common cause is an
  unreachable database or wrong credentials in the wizard.
- **Re-run the installer.** Stop the API, remove `SETUP_COMPLETE` (and the DB settings) from `apps/api/.env`,
  and start again.
