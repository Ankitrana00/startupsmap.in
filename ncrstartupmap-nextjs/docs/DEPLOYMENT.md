# Deployment Guide

> Last verified: P3-5 docs-truthing pass. Every command below is either a real
> `package.json` script or a documented CLI step — nothing else.
> Item references (`P3-5`, `L2`) point at `docs/PRODUCTION_FIX_PLAN.md`.

## Prerequisites

- Node.js 20+ (dev machines here run Node 24) and `pnpm` — the lockfile is `pnpm-lock.yaml`
- A Supabase project (the app reads/writes the `startups` table through the
  Supabase JS client; migrations live in `supabase/migrations/`)
- SMTP credentials for submission/promotion emails (a Gmail app password works)
- Optional: Upstash Redis — rate limiting, idempotency keys and the list cache.
  Without it the app uses a bounded in-memory fallback, which is fine for a
  single local instance but not for serverless production
- Optional: a Sentry project — error tracking and CSP violation reporting

## Environment Variables

Copy `.env.example` to `.env`, fill in the real values, then restart the dev
server. `.env` is gitignored.

**Required**

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — read-only under RLS (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; all server-side writes. Never expose. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email delivery |
| `SUBMISSIONS_TO` | Inbox that receives submissions and promo leads |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login; `ADMIN_PASSWORD` is a bcrypt hash |
| `JWT_SECRET` | Admin session signing key (32+ random chars) |

**Optional**

| Variable | Notes |
| --- | --- |
| `PROMOTE_TO` | Send promo leads to a different inbox |
| `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` | App metadata |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_PLAUSIBLE_*` | Analytics |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Error tracking + source maps. With a DSN set, the CSP also gains Sentry's `report-uri` (`src/lib/security/headers.ts`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | KV store. Vercel's KV integration injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` — both names are read. |
| `LOG_LEVEL` (`0`–`3`) | Structured log verbosity; defaults to `1` (info) |

**Scripts only** — not needed by the running app:

- `DATABASE_URL` — used by `scripts/backup-db.mjs`, `scripts/restore-db.mjs`, `scripts/seed.mjs`, `src/lib/db/utils.ts`
- `BACKUP_DIR` — backup output directory (defaults to `./backups`)

**Deliberately absent:** `NEXTAUTH_SECRET` and `REDIS_HOST` / `REDIS_PORT` /
`REDIS_PASSWORD`. The app has no NextAuth and no TCP Redis client — sessions are
custom JWTs and the KV client is Upstash's HTTP API. If you see those names in
older notes, ignore them.

### Production boot gate

`src/instrumentation.ts` validates the environment at server start, and
`GET /api/ready` reports readiness without leaking secret values:

```bash
curl -s https://startupsmap.in/api/ready
# {"status":"ready","checks":{"supabase":true,"serviceRole":true,"smtp":true,"auth":true}}
```

A missing `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET` in production makes the
probe return `503` — wire it to your platform's health check.

## Deploy Steps

```bash
# 1. Install
pnpm install

# 2. Apply database migrations (Supabase CLI, once per environment)
supabase link --project-ref <your-project-ref>
supabase db push                      # applies supabase/migrations/* in order
supabase migration list               # verify what is applied

# 3. Seed sample data (optional, needs DATABASE_URL)
node scripts/seed.mjs

# 4. Local development
pnpm dev                              # http://localhost:3000

# 5. Quality gates (all must pass before deploying)
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e                         # Playwright; starts its own dev server

# 6. Production build
pnpm build

# 7. Ship it
npx vercel --prod
```

### Platform notes (Vercel — recommended)

- Set every variable from the tables above in **Project → Settings → Environment
  Variables**; `NEXT_PUBLIC_*` values are baked into the client bundle at build time.
- The app has no long-lived worker, which is why email delivery happens in the
  request path (a durable queue is deferred — see `P3-3` in the fix plan).
- Roll back by promoting a previous deployment; no database change is implied by
  a rollback, so check for applied migrations first.

### Post-deploy smoke test

```bash
curl -sI https://startupsmap.in/ | findstr /I "content-security-policy x-frame-options"
# → CSP present, X-XSS-Protection absent (P3-6)
curl -s  https://startupsmap.in/api/ready
# → {"status":"ready", ...}
curl -s "https://startupsmap.in/api/startups?page=1&limit=5"
# → { startups: [...], meta: { total, page, pageSize, totalPages } }
```

## Operational Scripts

| Script | Purpose | Requires |
| --- | --- | --- |
| `scripts/backup-db.mjs` | `pg_dump` backup (spawn, no shell interpolation) | `DATABASE_URL`, `pg_dump` on PATH |
| `scripts/verify-backup.mjs` | Validate a backup file | backup file path |
| `scripts/restore-db.mjs` | Restore from a backup (`psql`) | `DATABASE_URL`, `psql` on PATH |
| `scripts/seed.mjs` | Insert sample startups | `DATABASE_URL` |
| `scripts/cleanup-old.mjs` | Prune old backups | `BACKUP_DIR` |
| `scripts/bundle-analyze.mjs` | Inspect the production bundle | a completed `pnpm build` |
| `scripts/deploy.mjs` | Build + ship to Vercel (default) or Netlify (`DEPLOY_TARGET`) | `pnpm build` deps; `npx vercel` / `npx netlify` login |

`scripts/lint.mjs`, `scripts/predeploy.mjs` and `scripts/build.mjs` are thin
wrappers around the `pnpm` scripts above — prefer calling the `pnpm` scripts
directly. `scripts/build.mjs` is no longer divergent: its env precondition
and step list match this guide (it checks `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and no longer shells out to a nonexistent
`npm run db:migrate`). `scripts/deploy.mjs`'s AWS branch is intentionally a
hard error — this repo has no AWS deploy tooling.