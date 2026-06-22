# OpenCMS Documentation

Welcome to the OpenCMS docs. Start here and follow the guide that matches what you want to do.

| Guide                                       | Read it when you want to…                                    |
| ------------------------------------------- | ------------------------------------------------------------ |
| [Getting Started](getting-started.md)       | Install OpenCMS and complete the first-run setup wizard      |
| [Configuration](configuration.md)           | Understand and set environment variables for the API and web |
| [Architecture](architecture.md)             | Learn how the monorepo, request flow, auth, and plugins fit  |
| [Plugin Development](plugin-development.md) | Build, package, install, and gate your own feature plugins   |

> Looking for the project overview, scripts, and tech stack? See the [root README](../README.md).

## At a glance

- **Two apps, one repo.** `apps/api` is a NestJS + Fastify backend; `apps/web` is a Next.js admin UI. They are
  developed together via Turborepo.
- **The database is chosen at setup time.** On first run the API serves a lightweight installer (no database
  needed) until the wizard provisions PostgreSQL, MySQL/MariaDB, or SQLite.
- **Features are plugins.** Built-in features (Entries, Media, Content Types, …) are registered as plugins and
  can be toggled; you can also install your own.
