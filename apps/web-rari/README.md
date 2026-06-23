# web-rari (experimental)

A parallel port of the OpenCMS admin frontend (`apps/web`) onto
[**rari**](https://github.com/rari-build/rari) — a React Server Components
framework running on a Rust runtime — instead of Next.js.

> **Status: experimental / in progress.** `apps/web` (Next.js) remains the
> production frontend. This app is a separate workspace package so it can be
> developed and evaluated without touching the working app.

## Why a separate app

Next.js and rari differ in the parts that matter most here — **auth** and
**middleware**. The Next.js app uses NextAuth (no rari equivalent), so the swap
is a frontend rewrite, not a drop-in. Keeping it parallel means the production
app keeps working while the port matures.

## What maps to what

| Concern         | Next.js (`apps/web`)                | rari (`apps/web-rari`)                                                                 |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| Routing         | `app/` App Router                   | `src/app/` (same conventions)                                                          |
| Middleware      | `middleware.ts`                     | `src/proxy.ts` (`RariResponse`)                                                        |
| Auth            | NextAuth (Credentials, JWT session) | cookie session via `rari/headers` `cookies()` + server actions (`src/actions/auth.ts`) |
| Server data     | server components / server actions  | same                                                                                   |
| Cookies/session | `next-auth` encrypted JWT           | httpOnly `cms-session` cookie (`src/lib/session.ts`)                                   |
| API client      | `lib/safeFetch.ts`                  | `src/lib/api.ts`                                                                       |
| UI              | `@repo/shadcn`                      | `@repo/shadcn` (unchanged)                                                             |
| Navigation      | `next/link`, `usePathname`          | `<a>` + `usePathname` from `rari/router`                                               |

## Implemented so far

- App config (Vite + `rari/vite`, Tailwind v4 via `@repo/shadcn`).
- Cookie-based auth: sign-in/sign-out server actions against the Nest API,
  httpOnly session, route gating in `proxy.ts`.
- Admin shell: registry-driven sidebar (nav derived from enabled plugins).
- Pages: **sign-in**, **dashboard**, **plugins** (toggle/rescan),
  **marketplace** (install), **SEO** (settings).

## Still to port (migration map)

Remaining `apps/web` routes, to be ported mechanically against the patterns
above: `entries` (+ create/edit), `content-types` (+ create/edit), `media`,
`locales`, `api-tokens`, `tenants` (+ create/edit), `profile`, the rest of the
`auth/*` flows (sign-up, forgot/reset password, confirm email), the first-run
`setup` wizard, and `og`/`opengraph-image`. Auth hardening (access-token refresh
and server-side session validation, which the Next.js app does in middleware)
is also outstanding.

## Develop

```bash
cp .env.example .env          # point API_URL at the running NestJS API
pnpm install                  # from the repo root
pnpm --filter web-rari dev    # rari dev server
```

The NestJS API must be running (default `http://localhost:8000/api`).
