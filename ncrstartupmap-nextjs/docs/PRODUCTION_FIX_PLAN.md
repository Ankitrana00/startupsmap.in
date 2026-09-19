# Production Fix Plan — TODO (from Backend Production Audit)

> Generated from the verified backend production audit. Planning only — no code changed.
> Every item references the audit finding ID and exact file/line. Implementation must
> reuse existing codebase patterns (zod validators, jose JWT, Supabase client,
> security-headers pattern). No placeholder code.

> **Status (2026-09-19): P0 + P1 tiers implemented; P2 tier (phase 3) ✅ DONE.**
> - P2-1 admin login zod validation · P2-2 pagination + rate-limited GET · P2-3
>   envelope/503 unification · P2-5 dead-code deletion · P2-7 `monitor-error.ts` +
>   `error-capture.ts` deleted (Sentry via `report-client-error.ts` is the only
>   client transport) · P2-8 HPP wired + `x-rate-limit` echo removed · P2-9
>   `pg_dump` via argv `spawn` (shell injection closed) · P2-10 migrations ported
>   to `supabase/migrations/`, `migrate.mjs` deleted.
> - P2-4: `supabase/migrations/20240906000000_add_hot_column_indexes.sql`
>   (`created_at DESC`, `verification_token`). Plain `CREATE INDEX` (not
>   CONCURRENTLY) — `supabase db push` runs migrations in a transaction and
>   CONCURRENTLY cannot run inside one; see file comment.
> - P2-6: routes call `reportServerError` with route/layer tags + the middleware
>   correlation ID (`x-request-id`, set on both forwarded request and response);
>   raw `console.error` replaced by the structured `log.error`. `handleApiError`
>   retained as the generic seam (no route needs its generic 500 today).
> - Verify: `pnpm typecheck` 0 errors · unit 90/90 · integration 19/19.

> **Status (2026-09-19): P3 tier (phase 4) ✅ DONE except P3-3 (deferred).**
> - P3-1 ✅ `src/lib/http/idempotency.ts` — atomic `setnx` claim on the shared KV
>   client (`lib/cache/redis.ts` gained `setnx`), `Idempotency-Key` header (TTL
>   24h) with a SHA-256 stable-JSON payload fingerprint fallback (TTL 10 min).
>   Wired into `/api/submit` (releases the claim when the send fails, so a retry
>   is not blocked) and `/api/promote`; replay returns the stored response, key
>   reuse with a different payload or an in-flight duplicate returns 409.
> - P3-2 ✅ `src/lib/cache/startups-cache.ts` — 60s TTL list cache (matches
>   `useStartups.ts` `staleTime: 60_000`) with a bounded key index because the
>   shared client has no `SCAN`; `GET /api/startups` reads through it and the
>   authorized POST (P0-1) invalidates. Dead `src/lib/state/cache.ts`
>   (`SimpleCache`) deleted.
> - P3-3 ⏸ **DEFERRED (decision):** `inngest` is not installed and a durable queue
>   needs a new third-party account/secret, which is not a code-only change. P1-4's
>   inline retry + timeouts remain the mitigation; revisit when an account exists.
> - P3-4 ✅ `src/lib/admin/audit-login.ts` — structured `admin_login` log events
>   (outcome/ip/requestId/request id from P2-6) on success, failure, rate-limit and
>   logout, with a ≥3-consecutive-failure burst escalated to Sentry once per burst
>   (no per-attempt spam). No new table, no PII beyond IP — consistent with the
>   `sentry.shared.config.ts` scrub rules.
> - P3-5 ✅ Docs truthed: `DEPLOYMENT.md` rewritten around the real `.env.example`
>   keys and real commands (`supabase db push`, `pnpm *`), with `NEXTAUTH_SECRET`
>   and the TCP `REDIS_*` vars explicitly listed as absent; `docs/api/v1/startups.md`
>   marked **planned**; `docs/FOLDER_STRUCTURE.md` regenerated with a "Deliberately
>   absent" section; stale `scripts/build.mjs` env check (`DATABASE_URL` +
>   `NEXTAUTH_SECRET` → the two Supabase vars a build really needs) and
>   `src/lib/env/schema.ts` (a second, wrong env schema — the live gate is
>   `src/lib/env/validate.ts`) deleted. Also `scripts/bundle-analyze.mjs` — it
>   shelled out to a nonexistent `npm run build:analyze` and to
>   `webpack-bundle-analyzer`, which cannot work under Turbopack (no
>   `stats.json`); it now walks `.next` and prints the heaviest JS artifacts with
>   zero added dependencies (verified against a synthetic `.next`: cache dir
>   skipped, largest-first ordering, missing-`.next` guard exits 1 with
>   instructions). Finally `scripts/deploy.mjs`: its `aws` branch ran a
>   `deploy:aws` script that does not exist — it now fails with an explicit
>   "not configured, Vercel is the supported target" message instead of an
>   opaque `npm error Missing script`.
> - P3-6 ✅ `src/lib/security/headers.ts`: `X-XSS-Protection` removed; CSP
>   `report-uri` derived from `NEXT_PUBLIC_SENTRY_DSN` via `buildCspReportUri()`
>   (omitted entirely when no DSN is set — the plan's literal placeholder URL is
>   never shipped); `geolocation=()` **kept** and documented — no
>   `navigator.geolocation` reference exists anywhere in `src/`, so enabling it
>   would widen permissions for zero functionality.
> - Verify: see the "Verification" section at the end of this file.

---

# Decisions

1. **Redis for rate limits: Yes, in prod only.** `lib/cache/redis.ts` is an in-memory fallback with no real client (verified: L7-31); per-process quotas are the documented limitation (`create-limiter.ts:10-15`). On Vercel there is no persistent Redis, so use **Upstash Redis (HTTP client) via Vercel KV integration** behind the existing `createRateLimiter` factory interface — call sites (`submit`, `promote`, `admin/login` rate-limit.ts) stay unchanged. Keep the in-memory implementation for dev. **Dependency: `@upstash/ratelimit` + `@upstash/redis`** — serverless-compatible Redis-backed limiter without a TCP pool.
2. **Email: inline retry + timeout now, queue later.** No queue infra exists (no BullMQ/Inngest anywhere in the repo); adding one is a launch-blocking surface. Fix H2 with Nodemailer's own options (`connectionTimeout`, `socketTimeout`, `tls`) plus a bounded retry wrapper (3 attempts, exponential backoff) reusing the existing `AbortSignal.timeout()` pattern from `useSubmit.ts:29`. Real queue (Inngest, chosen over BullMQ because Vercel serverless has no long-lived worker for BullMQ) is P3, audit §8.5.
3. **Admin session length: 12h absolute expiry after revocation exists** (audit §7.3). 30d is only safe with rotation/revocation, neither of which will exist at launch. Login sets 12h; `/api/admin/verify` keeps validating; no refresh tokens — re-login on expiry (the `?reason=expired` flow in `admin-client.tsx:16` already handles this).
4. **RLS strategy: anon = `SELECT`-only on both tables; writes move to a server-only service-role path.** The only write is startup creation; a dedicated server module using `SUPABASE_SERVICE_ROLE_KEY` (new env var, documented in `.env.example`) with a column allowlist is simpler and safer than per-column INSERT policies for anon. Full per-table RLS is unnecessary given there is no end-user identity in the data model.
5. **Migration runner: Supabase CLI (`supabase db push` with `supabase/migrations/*.sql`).** The repo already uses plain SQL files (`db/schema/*.sql`); Prisma is not a dependency (`package.json` has none), so `migrate.mjs` is unrunnable as-is. Port the four schema files into `supabase/migrations/`, delete the conflicting `20240904` variant.
6. **Stub cleanup:**
   - **Delete (dead/broken, zero importers verified):** `src/lib/auth/session.ts` (simulated verify — auth bypass if ever wired), `src/lib/auth/oauth.ts` (simulated token exchange), `src/lib/jobs/api.ts` + `apply.ts` (hardcoded fake data), `src/lib/verification/validate.ts` (`verifyStartupToken` returns `token.length === 64` — ignores identity), `src/app/api/startups/search.ts` + `utils.ts` (queries seed data, not a route file, M5), `src/app/api/ws/route.ts` (fake endpoint), `src/lib/security/csrf.ts` (per-process token store is unusable serverless; CSRF is already covered by `SameSite=Strict` cookie + same-origin checks — see P2 item for hpp wiring).
   - **Keep but do not wire yet:** `src/lib/verification/token.ts` + `expire.ts` (real crypto, needed for the actual email-verification flow), `src/lib/admin/permissions.ts` (will be consumed by the P1 server gate).
   - **Wire (exists, unwired):** `src/lib/security/hpp.ts` → into `middleware.ts`; `src/lib/error/handle-api-error.ts` → into API routes' catch blocks; `src/lib/env/validate.ts` → at boot; `src/lib/logging/logger.ts` → replaces raw `console.*` in routes.

---

## Priority tiers

- **P0** — Fix before any public traffic (C1/C2/C3)
- **P1** — Fix before launch (H1–H6)
- **P2** — Fix in first week post-launch (M1–M10)
- **P3** — Fix after launch / continuous improvement (L1–L4 + §8 recommendations)

Ordering within each tier: security risk → data integrity → reliability → DX/observability.

---

## TODO List

### [P0-1] — Close the unauthenticated public write to `startups`
**Audit ref:** C1
**File(s):** `src/app/api/startups/route.ts` → L36-68
**Problem:** `POST /api/startups` inserts into the live `startups` table with no auth, no rate limit, no origin check, no honeypot — bypassing the moderated `/api/submit` flow entirely.
**Fix:** Require a valid admin session (read `admin-token` cookie, `verifyAdminToken`) before touching Supabase; return 401 without a cookie, 403 on invalid token. Additionally apply the same-origin check + `limiter` pattern from `submit/route.ts` so even a compromised/anon key can't be spammed through this route. Remove the direct-insert path for anonymous callers permanently (public creation only ever goes through `/api/submit` email moderation).
**Approach:** Reuse `verifyAdminToken` (`lib/admin/auth.ts:28`), `cookies()` from `next/headers` as in `admin/verify/route.ts:8-9`, and the origin+limiter pattern from `submit/route.ts:9-40`.
**Verify:** `curl -X POST /api/startups` without cookie → 401; with invalid cookie → 403; with valid admin cookie → 201; integration test asserting 401 on anonymous POST (pattern exists in `tests/integration/admin/login.test.ts`).
**Dependency needed:** none

---

### [P0-2] — Fail closed on missing `JWT_SECRET` and `ADMIN_PASSWORD`
**Audit ref:** C2
**File(s):** `src/lib/admin/auth.ts` → L12-14; `src/app/api/admin/login/route.ts` → L66-72
**Problem:** `JWT_SECRET` falls back to the literal string `"dev-only-change-in-production"`; any prod boot without the env var silently signs forgeable 30-day admin JWTs.
**Fix:** At module load, throw when `NODE_ENV === "production"` and (`JWT_SECRET` or `ADMIN_PASSWORD` is unset) — mirror the existing guard in `verifyAdminCredentials` (`auth.ts:51-53`) which already throws `"ADMIN_PASSWORD not configured"`. Also throw on `ADMIN_TOKEN` usage if the legacy path is ever enabled without the var. In dev, keep current behavior so local boot stays friction-free.
**Approach:** Extend the existing throw pattern in `verifyAdminCredentials`; keep the error message shape so `login/route.ts:67-71`'s existing special-case catch still returns the configured 500.
**Verify:** Build with `NODE_ENV=production` and unset secret → boot fails with the thrown error; with secret set → login round-trip passes existing integration test (`tests/integration/admin/login.test.ts`).
**Dependency needed:** none

---

### [P0-3] — Ship Supabase RLS: anon SELECT-only + service-role write path
**Audit ref:** C3
**File(s):** new `src/lib/db/schema/rls_policies.sql`; `src/lib/supabase.ts` → L19-22 (add a second, server-only client)
**Problem:** All reads and writes use the anon key with no RLS in the repo; if live tables lack policies, the anon key inherits whatever table grants exist.
**Fix:** (a) SQL: `ALTER TABLE startups, unmapped_startups ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY anon_read ... FOR SELECT TO anon USING (true);` with **no** INSERT/UPDATE/DELETE policy for anon; add `SET statement_timeout` per the runbook note in `docs/PRODUCTION_READINESS_TODO.md` (Phase S1). (b) Code: create `supabaseAdmin` in `supabase.ts` using `SUPABASE_SERVICE_ROLE_KEY` guarded by `isSupabaseConfigured`-style check; switch the P0-1-authorized write in `api/startups/route.ts` and the best-effort insert in `submit/route.ts:81` to `supabaseAdmin` with an explicit column list (name, description, sector, stage, area, founded, is_hiring, website, linkedin, address, lat, lng, email) — never `parsed.data` spread.
**Approach:** Mirror `lib/supabase.ts`'s `createClient` + `isSupabaseConfigured` flag pattern for the second client; the SQL file lands alongside existing `db/schema/*.sql` with a runbook note like Phase S1 prescribes.
**Verify:** SQL editor run → `SELECT` as anon works, `INSERT` as anon fails with RLS violation; e2e submit flow still stores via service role; `.env.example` documents the new var (pattern: SMTP section).
**Dependency needed:** none

---

### [P0-4] — Reconcile schema ↔ insert payload ↔ migrations
**Audit ref:** M10 + §4.5
**File(s):** `src/lib/db/migrations/20240904_add_address_lat_lng.ts` → L4-9; `src/lib/db/schema/20240903_add_email.sql` → L3-5; `src/app/api/submit/route.ts` → L81
**Problem:** `20240904` re-adds `address TEXT NOT NULL` (already added NULL in 20240902) and redefines `lat/lng` as `DOUBLE PRECISION` vs init's `DECIMAL(10,8)`; the submit insert includes `email` but no committed schema has an `email` column — the DB leg of every submission either fails or drops data silently.
**Fix:** Delete the conflicting `20240904` file (marked broken in audit); add a single reconciled migration adding `email VARCHAR(255) NULL` plus `created_at` index (see P2-4); make the insert in `submit/route.ts` and `api/startups/route.ts` use the explicit column list from P0-3 so payload ↔ schema can never drift again.
**Approach:** Supabase migration files (Decision 5); explicit column list is already used in `db/seed/index.ts:7-8` — reuse that style.
**Verify:** Fresh DB from migrations → seeded insert of a submit payload succeeds; `npm run typecheck` + integration tests green; no duplicate-column error on `supabase db push`.
**Dependency needed:** Supabase CLI (dev tooling only, not a runtime dep) — `supabase db push` replaces the unrunnable Prisma-based `scripts/migrate.mjs`

---

### [P1-1] — Server-side admin gate on `/admin/*` pages
**Audit ref:** H6
**File(s):** `src/app/admin/page.tsx` → L1-12; `src/app/admin/layout.tsx` → L1-13
**Problem:** The only protection for admin pages is the prod middleware kill-switch plus a client-side `useEffect` redirect; nothing verifies the session server-side before rendering.
**Fix:** In `admin/layout.tsx` (convert to server component that wraps the client `AdminProvider`), read the `admin-token` cookie and call `verifyAdminToken`; `redirect("/admin/login")` when invalid — reusing the exact check from `admin/verify/route.ts:8-24`. Keep `AdminContext` for the client UI state, but it is no longer the gate.
**Approach:** `verifyAdminToken` (jose) + `cookies()` — both already in the codebase; `redirect()` is the App Router built-in.
**Verify:** Curl the admin page without cookie → 307 to `/admin/login`; with expired token → same; with valid token → 200; existing e2e admin specs still pass.
**Dependency needed:** none

---

### [P1-2] — Admin token revocation + shortened session
**Audit ref:** H1
**File(s):** `src/lib/admin/auth.ts` → L17, L19-45; `src/app/api/admin/login/route.ts` → L57-63; `src/app/api/admin/logout/route.ts` → L4-12; `src/app/api/admin/verify/route.ts` → L18-24
**Problem:** 30-day JWT, logout only deletes the cookie, no revocation — a stolen cookie is valid for a month.
**Fix:** Add `jti` (random UUID via `crypto.randomUUID()`) to the JWT claims; on logout, store the `jti` in a deny-list until the token's `exp`; `verifyAdminToken` rejects denied `jti`s. Reduce `TOKEN_EXPIRY` and cookie `maxAge` to 12h (Decision 3). Backing store: the Redis client from Decision 1 (`SETEX jti 1` with TTL = remaining validity), with the in-memory `Map` fallback already used as the pattern in `lib/cache/redis.ts`.
**Approach:** `SignJWT.setJti()`/`jwtVerify` payload access — both from the existing `jose` usage in `auth.ts:19-45`; Redis shape mirrors `lib/cache/redis.ts`'s `get/set/del` interface.
**Verify:** Login → logout → replay the old cookie against `/api/admin/verify` → 401 (previously 200); unit test for deny-list expiry; existing login integration test still green.
**Dependency needed:** `@upstash/redis` (same as Decision 1) — deny-list must survive across instances; falls back to in-memory in dev

---

### [P1-3] — Real, shared (Redis) rate limiting + trusted IP extraction
**Audit ref:** H4, H5
**File(s):** `src/lib/rate-limit/create-limiter.ts` → L16-59 (add Redis backend behind same interface); `src/app/api/submit/route.ts` → L28-31; `src/app/api/promote/route.ts` → L26-29; `src/app/api/admin/login/route.ts` → L7-13; `src/lib/middleware/ip-utils.ts` → L1-7
**Problem:** Limiter state is per-process (multiplies brute-force budget per serverless instance); IP extraction takes the spoofable first `x-forwarded-for` hop.
**Fix:** (a) Swap the `Map` in `create-limiter.ts` for Redis `INCR` + `PEXPIRE` keyed `rl:{endpoint}:{ip}`, keeping the factory signature (`check`, `retryAfterSeconds`) identical so the three `rate-limit.ts` files don't change. In-memory path stays for dev/no-Redis. (b) Centralize IP extraction into `lib/middleware/ip-utils.ts:getClientIp` and, on Vercel, prefer `x-real-ip`/platform header; never split `x-forwarded-for` first hop unless behind a known proxy — document the trust decision in the function.
**Approach:** Factory interface is explicitly designed for a backing-store swap (`create-limiter.ts:10-15` says "Replace the backing store with Redis… behind this same factory interface"); Upstash REST `INCR` with expiry in one pipeline call.
**Verify:** Unit test: two `check()` calls from same key within window are counted jointly across a fresh module instance (simulating second lambda); spoofed `x-forwarded-for` no longer bypasses (send 6 submits with different forged XFF → 6th returns 429).
**Dependency needed:** `@upstash/ratelimit` + `@upstash/redis` — distributed counters on serverless (Decision 1)

---

### [P1-4] — Timeout + bounded retry on outbound email
**Audit ref:** H2
**File(s):** `src/lib/email/transport.ts` → L8-28; `src/app/api/submit/route.ts` → L69-77; `src/app/api/promote/route.ts` → L67-80
**Problem:** SMTP has no connection/socket timeouts and no retry; an SMTP blip turns every submission into a 500 and holds the request open.
**Fix:** Add `connectionTimeout`, `greetingTimeout`, `socketTimeout` to `createTransport` options. Wrap `sendEmail` in a retry helper: 3 attempts, exponential backoff (1s/2s/4s), retry only on transient errors (timeouts, ECONNRESET, 4xx SMTP codes), rethrow after exhaustion. Routes already return 500 with a user-facing message on failure — unchanged.
**Approach:** Nodemailer's built-in timeout options (no new dep); backoff loop pattern matches the client-side `MAX_RETRIES = 3` convention noted in the repo; timeout philosophy mirrors `AbortSignal.timeout(15_000)` in `useSubmit.ts:29`.
**Verify:** Unit test with a mock transport that times out twice then succeeds → send resolves on attempt 3, total duration bounded; hard-fail case → route still 500s; log check shows `[email] retry attempt 2` via the `logger` wiring (P2-6).
**Dependency needed:** none

---

### [P1-5] — Bound the OSM tile proxy
**Audit ref:** H3
**File(s):** `src/app/api/tiles/[z]/[x]/[y]/route.ts` → L14-28
**Problem:** Outbound `fetch` has no timeout, no zoom cap, and the endpoint has no rate limit — a slow OSM hangs requests and `z=999` fans out to the origin.
**Fix:** Add `signal: AbortSignal.timeout(5_000)` to the fetch; reject `z` outside 0-19 (and x/y outside `2^z - 1`) with the existing 400 path at L17-19; add the shared limiter (`createRateLimiter`) with a generous quota (e.g. 300/min/IP) using the same check-first pattern as submit. On OSM 4xx pass through the status (existing L30-31); on timeout/5xx return 502 (correct proxied-failure code, replacing the current 500 at L48).
**Approach:** `AbortSignal.timeout` (used in hooks), regex param validation (already at L17), limiter factory + check-before-work ordering (submit pattern).
**Verify:** `curl /api/tiles/999/0/0.png` → 400; stalled-mock fetch → 502 within ~5s; 301st request in a minute → 429 with `Retry-After`.
**Dependency needed:** none (in-memory limiter until P1-3 lands, then shared)

---

### [P1-6] — Rate-limit the remaining unauthenticated endpoints
**Audit ref:** M7
**File(s):** `src/app/api/startups/route.ts` → L17-34 (GET), `src/app/api/admin/verify/route.ts` → L6-36, `src/app/api/admin/logout/route.ts` → L4-12
**Problem:** Only submit/promote/admin-login are limited; the unauthenticated list endpoint and admin auth surface are wide open.
**Fix:** Create per-endpoint limiter instances (dedicated quotas per the factory contract documented in `admin/login/rate-limit.ts:3-8`): startups GET 60/min/IP; admin verify 30/min/IP (it's cookie-read + JWT verify); logout is low-risk — same-origin check only, matching its trivial semantics. Use the same `checkRateLimit`/`Retry-After` wiring as `submit/route.ts:32-40`.
**Approach:** `createRateLimiter` factory + the exact route wiring pattern already present in three routes.
**Verify:** 61st GET `/api/startups` in a minute → 429 + `Retry-After` header; verify integration tests updated to reset buckets between cases (test helper pattern: fresh `createRateLimiter` per test).
**Dependency needed:** none (until P1-3 unifies the store)

---

### [P1-7] — Health + readiness endpoints and boot-time env validation
**Audit ref:** §3 (no health/readyz), §7.10
**File(s):** new `src/app/api/health/route.ts`; new `src/app/api/ready/route.ts`; `src/lib/env/validate.ts` → L20-27 (wire it); `src/lib/env/schema.ts` → L1-20 (extend)
**Problem:** No health/readiness endpoints and `validateEnv()` is never called — bad env config surfaces as opaque 500s at request time.
**Fix:** `GET /api/health` → always 200 `{status:"ok"}` (liveness, no dependency calls). `GET /api/ready` → checks `isSupabaseConfigured`, SMTP config presence, and (prod) `JWT_SECRET` presence; 503 with `{checks:{supabase,smtp,auth}}` booleans when unready — no secrets in output. Call `validateEnv()` from `src/instrumentation.ts` (already exists for Sentry) so boot fails loudly. Extend the zod schema with `JWT_SECRET`/`ADMIN_PASSWORD`/`NEXT_PUBLIC_SUPABASE_*` required-in-prod refinements.
**Approach:** Zod schema pattern (`lib/env/validate.ts:3-18`), the `isSupabaseConfigured` flag (`supabase.ts:11`), `instrumentation.ts` as the boot hook.
**Verify:** curl `/api/health` → 200; unset Supabase vars → `/api/ready` 503 with `checks.supabase:false`; prod build without `JWT_SECRET` → boot fails with the zod error message.
**Dependency needed:** none

---

### [P2-1] — Validate and cap admin login request body
**Audit ref:** M1
**File(s):** `src/app/api/admin/login/route.ts` → L29-37
**Problem:** Only presence-checked; no type/length limits, and `req.json()` is unguarded (same malformed-JSON 500 risk the submit/promote routes already fixed).
**Fix:** Copy the `z.object({ email: z.string().email().max(255), password: z.string().min(1).max(1024) })` shape into a `loginSchema` co-located file (`login/validate.ts`, mirroring `submit/validate.ts`); wrap `req.json()` in try/catch returning the existing 400 `"Invalid JSON body"` response from `submit/route.ts:43-47`.
**Approach:** Zod schema + `safeParse` + first-issue message response — byte-for-byte the `submit/route.ts:57-63` pattern.
**Verify:** Integration test: non-string email → 400; 10KB password → 400; malformed JSON → 400 not 500; valid creds flow unchanged.
**Dependency needed:** none

---

### [P2-2] — Pagination on list endpoints
**Audit ref:** M2
**File(s):** `src/app/api/startups/route.ts` → L17-34; `src/lib/api/startups.ts` → L47-125; `src/lib/types/api.ts` → L11-18
**Problem:** Unbounded `select("*")` ordered by `created_at`; documented `meta` envelope and `PaginatedResponse` type exist but are unused.
**Fix:** Accept `page` (default 1) and `limit` (default 50, max 100) query params validated with zod (pattern: `submit/validate.ts` preprocess); pass `.range(offset, offset+limit-1)` to both Supabase queries in `fetchStartups`/`GET /api/startups` and return `{ startups, meta: { total, page, pageSize } }` using the existing `PaginatedResponse`/`ApiResponse` shapes from `types/api.ts`. Get `total` via Supabase `count: "exact"` option.
**Approach:** Supabase `.range()` + count option (built into `@supabase/supabase-js` already in use); `ApiResponse`/`PaginatedResponse` types already defined — this is wiring, not new design.
**Verify:** `curl "/api/startups?limit=2&page=2"` → 2 rows + correct `meta`; `limit=10000` clamps to 100; typecheck + unit tests for the param parser.
**Dependency needed:** none

---

### [P2-3] — Unify response envelope and status codes
**Audit ref:** M3
**File(s):** `src/app/api/submit/route.ts` → L91; `src/app/api/promote/route.ts` → L69; `src/app/api/startups/route.ts` → L33, L64; `src/app/api/admin/verify/route.ts` → L26-35; `src/lib/types/api.ts` → L1-9
**Problem:** Five different success shapes (`{message}`, `{success,message}`, `{startups}`, `{authenticated,user}`, `{message,data}`); verify returns 500 (not 401) for its own catch.
**Fix:** Standardize on `{ data?, error?, meta? }` per `ApiResponse`. Submit/promote success → `{ data: {...}, error: null }`; startups GET → `{ data: [...], meta }`; admin verify keeps `{ authenticated, user }` (documented auth contract) but returns 503 (not 500) on internal failure so it's distinguishable from 401, and the client already treats any non-OK as failure (`AdminContext.tsx:51-60` only special-cases 401).
**Approach:** `ApiResponse<T>` from `types/api.ts` — the envelope type already exists; change response construction sites only.
**Verify:** Integration tests updated to assert the new shapes; typecheck catches missed call sites via the typed helper (`ok()`/`fail()` wrappers around `NextResponse.json` using `ApiResponse`).
**Dependency needed:** none

---

### [P2-4] — Add missing indexes on hot columns
**Audit ref:** M4
**File(s):** new migration (Supabase CLI format, Decision 5); ref `src/lib/db/schema/20240901_init.sql` → L20-23
**Problem:** Every read sorts by `created_at` and verification will look up `verification_token`, neither indexed.
**Fix:** `CREATE INDEX CONCURRENTLY idx_startups_created_at ON startups(created_at DESC);` and `idx_startups_verification_token ON startups(verification_token)` in a new migration; keep the existing area/sector/stage/is_hiring/address indexes untouched.
**Approach:** Same SQL-file + Supabase CLI flow as P0-4; `CONCURRENTLY` matches Supabase prod guidance for live tables.
**Verify:** `EXPLAIN ANALYZE SELECT * FROM startups ORDER BY created_at DESC LIMIT 50` uses the index before/after; `supabase db push` clean.
**Dependency needed:** none

---

### [P2-5] — Delete dead/broken modules and the fake search endpoint
**Audit ref:** M5, §4.8, Decision 6
**File(s):** `src/app/api/startups/search.ts` + `utils.ts` (L1-37, L1-8); `src/lib/auth/session.ts` (L17-21); `src/lib/auth/oauth.ts` (L18-23); `src/lib/jobs/api.ts` + `apply.ts`; `src/lib/verification/validate.ts` → L21-24; `src/app/api/ws/route.ts` (L1-9); `src/lib/security/csrf.ts` (L1-26)
**Problem:** Auth-shaped stubs (`verifyStartupToken` returns any 64-char token valid; `verifySession` fabricates a session; `exchangeCodeForToken` fabricates an access token), a fake `/api/ws` endpoint, and a search module over seed data — all with zero importers, all future-bypass hazards.
**Fix:** Delete the files listed in Decision 6. Keep `verification/token.ts` + `expire.ts` (real `randomBytes`/constant-time compare — reuse them when building the real verify flow). Delete `csrf.ts` because CSRF is covered by `SameSite=Strict` cookie (`login/route.ts:60`) + same-origin checks (`submit/route.ts:9`), and a per-process token Map cannot work serverless. Grep + typecheck confirm zero importers before each deletion (the project's own deletion guard, documented in `PRODUCTION_READINESS_TODO.md` Phase C1).
**Approach:** The project's established deletion procedure: grep-verify zero importers → delete → `tsc --noEmit` → unit tests.
**Verify:** `npx tsc --noEmit` → 0 errors; `npm run test:unit`/`test:integration` green; no route matches for `/api/ws`; search for `verifyStartupToken|verifySession|exchangeCodeForToken` → 0 hits.
**Dependency needed:** none

---

### [P2-6] — Wire the existing structured logger + central error handler into API routes
**Audit ref:** M8, M9, §3 (no correlation IDs)
**File(s):** `src/app/api/submit/route.ts` → L71, L83, L87; `src/app/api/promote/route.ts` → L74; `src/app/api/startups/route.ts` → L26, L57; `src/lib/error/handle-api-error.ts` → L4-21; `src/lib/logging/logger.ts` → L23-43
**Problem:** Routes use raw `console.error`; the purpose-built `logger` and `handleApiError` have zero callers.
**Fix:** Replace `console.error(...)` + manual `NextResponse.json(500)` in route catch blocks with `handleApiError(err, 500)` (it already reports to Sentry and hides messages in prod). Inside `handleApiError`, swap `console.error` for `log.error` from the existing logger. Add a per-request correlation ID in `middleware.ts` (crypto.randomUUID, set `x-request-id` on the response and pass via `Sentry.setTag` in `reportServerError`'s existing `extra` param).
**Approach:** Wire, don't rewrite — both modules exist with the right signatures; middleware already sets response headers (`middleware.ts:37-43`), so `x-request-id` is one more `response.headers.set`.
**Verify:** Trigger a 500 (unset SMTP vars, submit) → log line is `[ts] [ERROR] [API Error] … route:"api/submit"` with request id; response carries `x-request-id`; Sentry event shows the same id.
**Dependency needed:** none

---

### [P2-7] — Remove the global `console.error` patch; point client error reports at a real endpoint
**Audit ref:** M9
**File(s):** `src/lib/error-capture.ts` → L55-63 (monkey-patch); `src/lib/analytics/monitor-error.ts` → L17-23 (POSTs to nonexistent `/api/analytics/error`)
**Problem:** A module patches global `console.error` and ships stack traces to an endpoint that does not exist — fetch noise on every client error.
**Fix:** Delete `error-capture.ts` (it's h3/Nitro-specific — references h3 HTTPError in comments — and has zero Next.js importers). In `monitor-error.ts`, since Sentry is already the primary transport via `report-client-error.ts`, drop the dead `fetch` POST (the `.catch(console.error)` was masking the 404) and keep only the dev console branch.
**Approach:** Delete-after-grep guard (project convention); `report-client-error.ts` already routes client errors to Sentry — this removes the duplicate broken path.
**Verify:** Grep `error-capture` → 0 importers; client error in dev → single console line, no network 404 to `/api/analytics/error`; Sentry still receives via `reportClientError`.
**Dependency needed:** none

---

### [P2-8] — Wire HPP protection and fix the middleware rate-limit echo
**Audit ref:** §4.2, M8
**File(s):** `middleware.ts` → L47-51; `src/lib/security/hpp.ts` → L3-19
**Problem:** Middleware echoes the attacker-controlled `x-rate-limit` header and no HPP check runs anywhere despite the module existing.
**Fix:** Delete the L47-51 echo block entirely (it does no limiting and trusts client input). Call `hppMiddleware(request)` in `middleware.ts` after the admin gate: when it returns a `NextResponse` (400 duplicate params), return it directly; when null, continue. Apply only to `/api/` paths (query-param routes: startups GET).
**Approach:** Wire the existing `hppMiddleware` — its signature (`Request` → `NextResponse | null`) is middleware-shaped by design; guard uses the same `pathname.startsWith("/api/")` check already in the file.
**Verify:** `curl "/api/startups?area=Delhi&area=Noida"` → 400 `Duplicate parameters detected`; normal requests unaffected; `X-RateLimit-Limit` no longer reflects attacker input.
**Dependency needed:** none

---

### [P2-9] — Fix shell injection in backup script
**Audit ref:** M6
**File(s):** `scripts/backup-db.mjs` → L23-24
**Problem:** `DATABASE_URL` is interpolated into a shell string with `sed` pipelines — injection via crafted connection string.
**Fix:** Drop the shell pipeline: use Node's `URL` to parse `DATABASE_URL` for the password, pass it via env (`PGPASSWORD`) to `spawn("pg_dump", [databaseUrl, "-f", backupFile])` with `shell: false` — no string concatenation.
**Approach:** Node `child_process.spawn` with argv array; `new URL(connectionString)` parsing (same `new URL` usage pattern as `sanitize.ts:27`).
**Verify:** Run with a URL containing a single quote/backtick → backup file created, no shell execution of injected text; successful round-trip restore with `verify-backup.mjs`.
**Dependency needed:** none

---

### [P2-10] — Replace the broken migration runner
**Audit ref:** M10, Decision 5
**File(s):** `scripts/migrate.mjs` → L11, L21 (delete); new `supabase/migrations/` ported from `src/lib/db/schema/*.sql` + the P0-4 reconciliation
**Problem:** `migrate.mjs` shells to `npx prisma migrate` with no Prisma in the project — it cannot run; migration state is unknowable.
**Fix:** Delete `migrate.mjs`; port schema SQL into `supabase/migrations/<timestamp>_<name>.sql` (init, add_address, add_email, the P0-4 reconciliation, P2-4 indexes); document `supabase db push` in `docs/DEPLOYMENT.md` replacing the `npm run db:migrate` section.
**Approach:** Decision 5 — Supabase CLI matches the existing plain-SQL files; no new runtime dependency.
**Verify:** `supabase db push` against a fresh project → all migrations apply in order, `supabase migration list` shows them applied; DEPLOYMENT.md commands execute as written.
**Dependency needed:** Supabase CLI (dev dependency only)

---

### [P3-1] — Idempotency keys on submit/promote
**Audit ref:** §3 (no idempotency), §8.2
**File(s):** `src/app/api/submit/route.ts` → L21-63; `src/app/api/promote/route.ts` → L20-64
**Problem:** Double-click/retry double-sends emails; no dedupe.
**Fix:** Accept optional `Idempotency-Key` header; before sending, check Redis key `idem:{route}:{key}` (SET NX, TTL 24h) — hit → return the stored original response; miss → process and store. Also compute a fallback fingerprint (hash of validated payload) so duplicate bodies dedupe even without a client key.
**Approach:** Redis SET-NX via the P1-2/P1-3 Redis client; response shape unchanged so existing clients are unaffected.
**Verify:** Same key twice → second call returns 201 without a second email (log check: one `sendSubmissionNotification`); different payloads, same key → second rejected 409.
**Dependency needed:** `@upstash/redis` (already required by P1-2/P1-3)

---

### [P3-2] — Server-side caching for `GET /api/startups`
**Audit ref:** §3 (cache modules unwired), §8.6
**File(s):** `src/app/api/startups/route.ts` → L17-34; `src/lib/cache/redis.ts` → wire `getRedisClient`; `src/lib/state/cache.ts` → delete after migration
**Problem:** Every dashboard load hits Supabase for full tables; two purpose-built cache modules are unwired.
**Fix:** Cache the paginated list response (key includes page/limit/filters, TTL 60s matching `staleTime: 60_000` in `useStartups.ts:8`); invalidate on the authorized POST (P0-1) via `del("startups:*")` pattern. Replace the `SimpleCache`-style per-instance memory with the Redis client once P1-3 lands; delete `state/cache.ts` when nothing references it.
**Approach:** `getRedisClient` get/set/del interface exists (`redis.ts:11-31`) — wire, don't rewrite.
**Verify:** Second identical request within 60s → served from cache (log line `cache hit`), Supabase query count in network tab drops to 1 per minute; insert → next GET reflects the new row.
**Dependency needed:** `@upstash/redis` (same shared client)

---

### [P3-3] — Move email delivery to a durable queue
**Audit ref:** §3 (no job system), §8.5
**File(s):** `src/app/api/submit/route.ts` → L69-77; `src/app/api/promote/route.ts` → L67-80; `src/lib/email/send.ts`
**Problem:** Synchronous SMTP in the request path; P1-4's retry helps but an outage still 500s submissions and can drop them entirely.
**Fix:** Introduce Inngest functions (`email/sendSubmission`, `email/sendPromotionLead`); routes enqueue and immediately return 202 with a job id; Inngest provides retries, backoff, and a DLQ/dashboard out of the box. Keep `sendSubmissionNotification`/`sendPromotionLead` signatures unchanged — they become the function bodies.
**Approach:** The email functions are already isolated behind `lib/email/send.ts` — routes swap `await send…` for `inngest.send()`; no signature changes.
**Verify:** Submit with SMTP down → 202, function retries visible in Inngest dashboard, email arrives after SMTP recovery; DLQ populated after max retries; existing integration tests adapted to mock the enqueue.
**Dependency needed:** `inngest` — serverless-native durable queue with retries/DLQ; BullMQ requires a long-lived worker Vercel can't host

---

### [P3-4] — Admin audit logging for logins
**Audit ref:** §8.4
**File(s):** `src/app/api/admin/login/route.ts` → L40-49 (success + 401 paths); `src/app/api/admin/logout/route.ts` → L4-12
**Problem:** No record of who logged in, when, or failed-attempt bursts.
**Fix:** On login success/failure, emit a structured log event via `log.info`/`log.warn` with `{event:"admin_login", outcome, ip, requestId}` (IP from the P1-3 hardened extractor, request id from P2-6) and a matching `Sentry.addBreadcrumb`-style tag via the existing `reportServerError` context on bursts (≥3 consecutive 401s from one IP). No new table needed at this stage.
**Approach:** Existing `logger` + `reportServerError` tags; no PII beyond IP/outcome (consistent with the Sentry scrub rules in `sentry.shared.config.ts:11-16`).
**Verify:** Failed logins produce `[WARN] admin_login outcome:failure` lines with request id; 3 failures trigger a Sentry issue with route tag; success logs after rate-limit window reset.
**Dependency needed:** none

---

### [P3-5] — Docs hygiene: align DEPLOYMENT.md and API docs with reality
**Audit ref:** L2
**File(s):** `docs/DEPLOYMENT.md` → L13-23 (NEXTAUTH_SECRET/Redis/Postgres that don't apply); `docs/api/v1/startups.md` (documents nonexistent `/api/v1/*`); `src/app/robots.ts` (no `security.txt`)
**Problem:** Docs describe infrastructure the app doesn't use and a v1 API that doesn't exist.
**Fix:** Rewrite DEPLOYMENT.md env section from the actual `lib/env/schema.ts` + `.env.example` keys; delete or mark `docs/api/v1/startups.md` as "planned" until P2-2/P2-3 ship a versioned surface; add `security.txt` via a static route when the §8.3 hardening pass happens.
**Approach:** Doc-truthing pass per the project's own convention (`PRODUCTION_READINESS_TODO.md` "Truth the docs" item).
**Verify:** Every env var in DEPLOYMENT.md exists in `.env.example`; no doc references `/api/v1` as live; grep `NEXTAUTH_SECRET` → 0 hits.
**Dependency needed:** none

---

### [P3-6] — Header polish: CSP reporting, Permissions-Policy review, deprecation cleanup
**Audit ref:** L1
**File(s):** `src/lib/security/headers.ts` → L19, L22-34, L35
**Problem:** Deprecated `X-XSS-Protection` still sent; CSP has no violation reporting; `geolocation=()` is disabled on a map product.
**Fix:** Remove `X-XSS-Protection`; add `report-uri https://o{org}.ingest.sentry.io/api/{id}/security/?sentry_key=…` (Sentry CSP reporting, consistent with the existing `connect-src *.ingest.sentry.io` allowance at L27); either enable `geolocation=(self)` or confirm Leaflet never requests it and document why it stays blocked.
**Approach:** Single-source-of-truth headers file already feeds both `next.config.ts` and `middleware.ts` — one edit, both surfaces.
**Verify:** `curl -I /` → no `X-XSS-Protection`, CSP includes report-uri; deliberate CSP violation in dev → event appears in Sentry security report.
**Dependency needed:** none

---

## End of plan

Do not implement anything from this file without re-reading the referenced source files first — line numbers are from the audit snapshot (commit `38fa150`) and may shift as fixes land. Work strictly in tier order: all P0s before any public traffic, all P1s before launch.


---

## Verification

Run from `ncrstartupmap-nextjs/`. Last full run: 2026-09-19 (after the P3 tier).

| Gate | Command | Result |
| --- | --- | --- |
| Types | `pnpm typecheck` | 0 errors |
| Lint | `pnpm lint` | clean |
| Unit | `pnpm test:unit` | 18 files, 120 tests passed |
| Integration | `pnpm test:integration` | 3 files, 19 tests passed |
| E2E | `pnpm test:e2e` | Playwright specs (map, grid, carousel, submit, promote, responsive, 404) |

### Per-tier acceptance checks

- **P3-1** `tests/unit/lib/http/idempotency.test.ts` (11 tests) covers: fresh claim,
  replay of the committed response, concurrent duplicate → `in_flight`, `release()`
  freeing a failed attempt, the fingerprint fallback when no header is sent,
  `fingerprint_mismatch` when a key is reused with a different payload,
  malformed/oversized header rejection, route isolation, corrupt stored value →
  fresh claim (not a 500), and key-order-independent fingerprints.
- **P3-2** `tests/unit/lib/cache/startups-cache.test.ts` covers: round-trip,
  per-(page,limit) keying, invalidation dropping every cached page,
  re-caching after invalidation, corrupt-value → miss, and a rejecting backing
  store never throwing into the request path.
- **P3-4** `tests/unit/lib/admin/audit-login.test.ts` covers: success logs without
  a Sentry event, escalation exactly at the 3rd consecutive failure and only
  once per burst, streak reset on success, per-IP isolation, rate-limited not
  counted as a credential failure, and tolerance of a missing IP.
- **P3-6** `tests/unit/lib/security/headers.test.ts` covers: DSN → report endpoint
  derivation, null for missing/malformed/non-Sentry DSNs, `X-XSS-Protection`
  absence, and that `report-uri` is present **iff** a DSN was configured.

### P3-5 acceptance greps

- `NEXTAUTH_SECRET` — no doc or script instructs you to set it. The two remaining
  hits (`docs/DEPLOYMENT.md`, `scripts/build.mjs`) both explicitly document that
  it does **not** apply.
- `X-XSS-Protection` — remaining hits are the removal comment in
  `src/lib/security/headers.ts` and the test asserting its absence.
- `/api/v1` — 0 hits anywhere under `src/`; the only reference is the
  "PLANNED — NOT IMPLEMENTED" banner in `docs/api/v1/startups.md`.

### Still manual (cannot be verified from this repo)

1. `supabase db push` against the live project — applies
   `supabase/migrations/20240906000000_add_hot_column_indexes.sql`. `CONCURRENTLY`
   is deliberately not used (plan P2-4 note).
2. Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in the deployment env
   — without them the KV fallback is per-instance, so idempotency and the list
   cache are best-effort in serverless production.
3. Set `NEXT_PUBLIC_SENTRY_DSN` — until then error reporting and the CSP
   `report-uri` are inert by design (`docs/SENTRY_TODO.md`).
4. P3-3 remains deferred (needs an Inngest account + `inngest` dependency).





