# Configuration

OpenCMS is configured through environment variables in two `.env` files:

- `apps/api/.env` — the NestJS API (also written automatically by the setup wizard).
- `apps/web/.env` — the Next.js web app.

Both apps validate their environment on boot with Zod and fall back to sensible defaults where possible, so a
fresh checkout can reach the installer without any manual configuration. For production you should set explicit
values — especially the secrets.

## API (`apps/api/.env`)

`example` files are provided as `apps/api/.env.example`. All variables have defaults unless noted.

### Server

| Variable         | Default                 | Description                                                                                                 |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `HOST`           | `localhost`             | Hostname used in logs.                                                                                      |
| `PORT`           | `8000`                  | Port the API listens on.                                                                                    |
| `NODE_ENV`       | `development`           | `development` \| `production` \| `test` \| `provision`.                                                     |
| `ALLOW_CORS_URL` | `http://localhost:3000` | Comma-separated list of allowed CORS origins (the web app).                                                 |
| `SETUP_COMPLETE` | _(unset)_               | Set to `true` by the installer; controls first-run vs full boot. Don't set by hand unless re-running setup. |

### Authentication (JWT)

| Variable                   | Default     | Description                         |
| -------------------------- | ----------- | ----------------------------------- |
| `ACCESS_TOKEN_SECRET`      | dev default | Secret used to sign access tokens.  |
| `ACCESS_TOKEN_EXPIRATION`  | `15m`       | Access-token lifetime.              |
| `REFRESH_TOKEN_SECRET`     | dev default | Secret used to sign refresh tokens. |
| `REFRESH_TOKEN_EXPIRATION` | `7d`        | Refresh-token lifetime.             |

> **Production:** always set strong, unique values for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.

### Database

The engine is selected with `DB_TYPE`. The setup wizard writes these for you.

| Variable      | Default             | Applies to      | Description                                           |
| ------------- | ------------------- | --------------- | ----------------------------------------------------- |
| `DB_TYPE`     | `postgres`          | all             | `postgres` \| `mysql` \| `mariadb` \| `sqlite`.       |
| `DB_HOST`     | `localhost`         | postgres, mysql | Database host.                                        |
| `DB_PORT`     | `5432`              | postgres, mysql | Database port (`3306` for MySQL).                     |
| `DB_USERNAME` | `postgres`          | postgres, mysql | Database user.                                        |
| `DB_PASSWORD` | `password`          | postgres, mysql | Database password.                                    |
| `DB_NAME`     | `cms`               | postgres, mysql | Database name.                                        |
| `DB_SSL`      | `false`             | postgres        | Set `true` to require SSL.                            |
| `DB_DATABASE` | `./data/cms.sqlite` | sqlite          | SQLite file path (host/port/credentials are ignored). |

```bash
# PostgreSQL (default)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=cms

# MySQL / MariaDB
DB_TYPE=mysql
DB_PORT=3306

# SQLite (no server needed — great for local development)
DB_TYPE=sqlite
DB_DATABASE=./data/cms.sqlite
```

Notes:

- Multi-tenancy uses a **table-name prefix per tenant** (e.g. `tenant_acme_entry`), so it behaves identically on
  all engines.
- Drivers `pg`, `mysql2`, and `better-sqlite3` are all installed by default.

### Mail (Nodemailer)

| Variable          | Default     | Description           |
| ----------------- | ----------- | --------------------- |
| `MAIL_HOST`       | `localhost` | SMTP host.            |
| `MAIL_PORT`       | _(unset)_   | SMTP port.            |
| `MAIL_USERNAME`   | `''`        | SMTP username.        |
| `MAIL_PASSWORD`   | `''`        | SMTP password.        |
| `MAIL_IGNORE_TLS` | _(unset)_   | `true` to ignore TLS. |

### File storage

| Variable                | Default    | Description                          |
| ----------------------- | ---------- | ------------------------------------ |
| `FILE_SYSTEM`           | `public`   | `public` (local) or `s3`.            |
| `FILE_MAX_SIZE`         | `20971520` | Max upload size in bytes (20 MB).    |
| `AWS_REGION`            | `''`       | S3 region (when `FILE_SYSTEM=s3`).   |
| `AWS_ACCESS_KEY_ID`     | `''`       | S3 access key.                       |
| `AWS_SECRET_ACCESS_KEY` | `''`       | S3 secret key.                       |
| `AWS_S3_BUCKET_NAME`    | `''`       | S3 bucket.                           |
| `AWS_S3_ENDPOINT`       | `''`       | Custom S3 endpoint (e.g. for MinIO). |

## Web (`apps/web/.env`)

See `apps/web/.env.example`. All variables have defaults so the app can boot to the installer.

| Variable           | Default                     | Description                                                      |
| ------------------ | --------------------------- | ---------------------------------------------------------------- |
| `API_URL`          | `http://localhost:8000/api` | Base URL of the API, including the `/api` prefix.                |
| `AUTH_URL`         | `http://localhost:3000`     | Public URL of the web app (used by NextAuth).                    |
| `AUTH_SECRET`      | dev default                 | Secret used to encrypt NextAuth sessions. **Set in production.** |
| `AUTH_SESSION_AGE` | `7776000`                   | Session lifetime in seconds (default 90 days).                   |
| `NODE_ENV`         | `development`               | Node environment.                                                |

> **Note:** The installer writes the **API** `.env`. The web app keeps its own `.env`; set a strong `AUTH_SECRET`
> there for production.

## Production checklist

- [ ] Strong `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` (API) and `AUTH_SECRET` (web).
- [ ] Correct `DB_*` values pointing at your production database.
- [ ] `ALLOW_CORS_URL` set to your web app's origin(s).
- [ ] `API_URL` / `AUTH_URL` set to your real hostnames.
- [ ] `NODE_ENV=production` for both apps.
- [ ] Mail and file-storage settings configured if you use those features.
