# Design: First-Run Installer (Strapi-Style Setup Wizard)

## Context

Current onboarding requires manual environment setup and manual account creation.
This creates friction for self-hosting and causes confusion when trying to sign in
without a clearly bootstrapped first admin account.

The target is a Strapi-like first-run installer that guides users through setup in
the browser and writes required runtime configuration to `.env`.

## Goals

1. Provide a one-time web installer at `/setup`.
2. Collect required configuration (especially DB + first admin) via wizard UI.
3. Validate DB connectivity before bootstrap.
4. Persist installer config to `.env` (allowlist keys only).
5. Create first admin account during bootstrap.
6. Permanently lock installer after success.

## Non-Goals

- No recurring maintenance setup UI after initialization.
- No multi-tenant setup orchestration in installer v1.
- No advanced plugin marketplace configuration in installer flow.

## Recommended Approach

Use a web setup wizard + setup API service (approach A), with one-time lock.

Why this approach:

- Matches expected CMS UX (Strapi-like onboarding).
- Works for non-technical self-host users.
- Keeps setup state machine centralized in backend logic.

## High-Level Architecture

### Setup Gate

Introduce setup state with two flags:

- `is_initialized` (permanent success marker)
- `setup_in_progress` (short-lived lock to prevent concurrent bootstrap)

Storage can be an `app_settings` table (preferred) or dedicated setup-state table.

Behavior:

- If `is_initialized=false`, `/setup` is available.
- If `is_initialized=true`, `/setup` is blocked and redirected to sign-in/home.

### Setup Wizard (Web)

Route: `/setup`

Wizard steps:

1. Welcome + one-time setup notice
2. Database settings
3. First admin account
4. Review and confirm
5. Success page with redirect to `/auth/sign-in`

### Setup API

Endpoints:

- `GET /setup/status`
- `POST /setup/validate-db` (optional preflight from wizard)
- `POST /setup/bootstrap`

Lock semantics:

- If setup running: return `423 Setup in progress`
- If initialized: return `409 Already initialized`

## Data Flow

1. Frontend calls `GET /setup/status`.
2. If not initialized, wizard is shown.
3. User enters settings and submits bootstrap.
4. Backend validates payload and setup lock acquisition.
5. Backend validates DB credentials by opening a test connection.
6. Backend writes `.env` atomically:
   - update allowlist keys only
   - preserve unknown existing keys
   - create backup before replace (e.g., `.env.bak`)
7. Backend runs bootstrap actions:
   - ensure schema/migration readiness
   - create first admin user
8. Backend sets `is_initialized=true`.
9. Backend releases lock and returns success.
10. Frontend redirects to `/auth/sign-in`.

## Configuration Model

Installer payload sections:

- `app`: `allowCorsUrl`, `authSecret`, optional `authUrl`
- `database`: `host`, `port`, `username`, `password`, `name`, `ssl`
- `admin`: `email`, `password`

Mail settings are explicitly out-of-scope for installer v1 and are not part of
the bootstrap payload.

Allowlist for `.env` write in v1:

- `ALLOW_CORS_URL`
- `AUTH_SECRET`
- `AUTH_URL` (optional)
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`

## Security Requirements

1. Setup endpoints do not expose secret values in logs/responses.
2. `.env` write path is fixed and not user-controlled.
3. Setup lock prevents concurrent bootstrap attempts.
4. After initialization, setup endpoints hard-block with `409`.
5. First admin password follows strong validation policy (existing auth schema rules).

## Failure and Recovery Behavior

- DB validation fails: return error, do not write `.env`.
- `.env` write fails: return error, do not run bootstrap.
- Bootstrap fails after `.env` write:
  - keep `is_initialized=false`
  - return actionable error
  - allow retry after correction
- Admin email already exists: return validation/conflict error.

## UX Behavior Details

- Show clear one-time warning: "This installer can only be run once."
- Inline validation per step.
- Show explicit error mapping (DB connect failed, env write failed, admin conflict).
- On success, show confirmation and a single next action (`/auth/sign-in`).

## API Contracts

### GET /setup/status

Response:

```json
{
  "initialized": false,
  "inProgress": false
}
```

### POST /setup/validate-db

Request: database block only.

Success:

```json
{ "ok": true }
```

Error:

```json
{ "message": "Database connection failed" }
```

### POST /setup/bootstrap

Request: full installer payload.

Success:

```json
{ "message": "Installation completed" }
```

Errors:

- `409 Already initialized`
- `423 Setup in progress`
- `400 Validation failed`
- `500 Setup failed` (only when unrecoverable/internal)

## Testing Strategy

### API Tests

- `GET /setup/status` before and after initialization.
- `POST /setup/bootstrap` happy path.
- `POST /setup/bootstrap` blocked when already initialized.
- Concurrent bootstrap requests produce one `423`.
- DB validation failure does not mutate `.env`.
- `.env` writer updates only allowlist keys.
- Secret values are not leaked in error responses/logs.

### Web Tests

- Wizard step navigation and validation.
- Error rendering for each backend failure class.
- Success transition to sign-in.
- Guard behavior when initialized (redirect/block).

### End-to-End

Fresh environment scenario:

1. Open `/setup`
2. Enter DB values
3. Enter admin credentials
4. Complete bootstrap
5. Sign in with created admin account

## Rollout Plan

1. Add setup state storage and service in API.
2. Add setup endpoints and lock logic.
3. Add `.env` write utility with backup + allowlist.
4. Add first-run wizard route in web app.
5. Add setup guards for setup route and post-init block.
6. Add automated tests (API, web, e2e).

## Acceptance Criteria

Implementation is complete when all are true:

1. `/setup` is available only when uninitialized.
2. Installer writes required `.env` keys from wizard inputs.
3. Installer validates DB before bootstrap.
4. Installer creates first admin account successfully.
5. Installer cannot be rerun after success.
6. Parallel setup attempts are safely blocked.
7. Tests cover setup happy path + lock + failure modes.
