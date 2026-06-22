<img src="assets/preview.png" width="851" alt="OpenCMS">

# OpenCMS

**OpenCMS** is an open-source, self-hostable headless CMS built on a modern TypeScript stack. It pairs a
**NestJS (Fastify)** API with a **Next.js** admin app in a single Turborepo monorepo, and ships with a guided
first-run installer, multi-database support, multi-tenancy, and a pluggable feature system.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Highlights

- **Zero-config first run** — start the apps, open the browser, and a setup wizard provisions the database and
  the first admin account. No `.env` editing required to get going.
- **Bring your own database** — PostgreSQL, MySQL/MariaDB, or SQLite, selected at setup time (or via `DB_TYPE`).
- **Content modeling** — define content types and fields, author entries, manage media, and translate via locales.
- **Multi-tenancy** — isolated content per tenant using a table-name prefix, so it works on every supported engine.
- **Headless API** — REST under `/api` with JWT auth, API tokens for programmatic access, and Swagger docs.
- **Pluggable features** — core features are plugins; install additional ones from a ZIP, toggle them on/off, and
  routes/navigation react instantly. See **[Plugin Development](docs/plugin-development.md)**.
- **Batteries included** — JWT access/refresh auth, email (Nodemailer), file storage (local or S3),
  shadcn/UI + Tailwind v4, ESLint/Prettier, and tests across both apps.

## Tech stack

| Layer    | Technology                                                          |
| -------- | ------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces, SWC                                     |
| API      | NestJS 11, Fastify, TypeORM, Zod, JWT, Nodemailer                   |
| Web      | Next.js 15 (App Router), React 19, NextAuth, shadcn/UI, Tailwind v4 |
| Database | PostgreSQL · MySQL/MariaDB · SQLite (via `DB_TYPE`)                 |

## Quick start

**Prerequisites:** Node.js ≥ 20 and pnpm 9 (`corepack enable`). A database server is optional — you can pick
**SQLite** in the installer and run with no external services.

```bash
# 1. Clone and install
git clone https://github.com/nuvooo/opencms.git
cd opencms
pnpm install

# 2. Start both apps in dev mode (API on :8000, web on :3000)
pnpm dev
```

Open **http://localhost:3000**. On a fresh install you are redirected to **`/setup`**, where the wizard lets you:

1. choose a database engine and validate the connection,
2. create the first admin account,
3. finish — the API provisions the schema, writes its `.env`, and switches into full mode automatically.

Then sign in with the admin account you just created. That's it.

> New to the project? Read **[docs/getting-started.md](docs/getting-started.md)** for a step-by-step walkthrough.

## Documentation

| Guide                                            | What it covers                                              |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [Getting Started](docs/getting-started.md)       | Prerequisites, install, run, and the first-run setup wizard |
| [Configuration](docs/configuration.md)           | Every environment variable for the API and web apps         |
| [Architecture](docs/architecture.md)             | Monorepo layout, request flow, auth, and the plugin system  |
| [Plugin Development](docs/plugin-development.md) | Build, package, install, and gate feature plugins           |

## Project structure

```text
opencms
├── apps
│   ├── api                 # NestJS + Fastify API
│   │   ├── core/plugins    # Built-in feature plugins (manifests)
│   │   └── src             # Features: content-types, entries, media, locales,
│   │                       # tenants, plugins, api-token, auth, setup, ...
│   └── web                 # Next.js admin app (App Router)
├── packages
│   ├── shadcn              # shadcn/UI component library (Tailwind v4)
│   ├── utils               # Shared utility functions
│   ├── constants           # Shared constants
│   ├── eslint-config       # Shared ESLint config
│   └── ts-config           # Shared TypeScript config
├── docs                    # Project documentation
└── turbo.json              # Turborepo pipeline
```

## Common scripts

Run from the repo root:

| Script         | Description                      |
| -------------- | -------------------------------- |
| `pnpm dev`     | Start API + web in watch mode    |
| `pnpm dev:api` | Start only the API               |
| `pnpm dev:web` | Start only the web app           |
| `pnpm build`   | Build both apps for production   |
| `pnpm start`   | Run both apps in production mode |
| `pnpm test`    | Run all tests                    |
| `pnpm lint`    | Lint the whole repo              |
| `pnpm format`  | Format with Prettier             |

## Testing

```bash
pnpm test            # everything
pnpm test:api        # API (Jest)
pnpm test:web        # web (Vitest)
```

## Contributing

Contributions are welcome! Please open an issue to discuss substantial changes first, then fork, branch, and
open a pull request. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (use
`pnpm commit` for a guided prompt). Run `pnpm lint` and `pnpm test` before submitting.

## License

OpenCMS is released under the [MIT License](LICENSE).
