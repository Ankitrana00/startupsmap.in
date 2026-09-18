# Sentry — Whole-Project Error Tracking TODO

> Goal: every error in the project lands in Sentry — client crashes,
> server/API failures, email + DB failures — with no PII leaks and no
> noise. Status: **PHASES 1–4 DONE (repo side)**. `@sentry/nextjs@10.74.0`
> installed; client + server capture wired; PII scrub unit-tested.
> Remaining: **Phase 0 (your sentry.io account action)** — without the DSN
> everything no-ops by design — plus Phase 5 dashboard alert rules and the
> Phase 6 build/rollout verification.

---

## Phase 0 — Sentry project + DSN (account side, ~10 min) — OWNER: YOU

- [ ] Create the Sentry project (platform: **Next.js**) at sentry.io.

- [ ] Create the Sentry project (platform: **Next.js**) at sentry.io.
- [ ] Copy the **DSN** (public, `NEXT_PUBLIC_SENTRY_DSN`) — safe to ship to
- [ ] Generate an **auth token** (`SENTRY_AUTH_TOKEN`, scopes:
- [ ] Decide the environment names: `development` / `preview` / `production`.
- [ ] Decide `tracesSampleRate` + `replaysSampleRate` budget (start low —
- [ ] Add the secrets to Verc/hosting env: `NEXT_PUBLIC_SENTRY_DSN`,
- [ ] Add the same vars to `.env.local` for local verification (never commit).

---

## Phase 1 — Install + wizard (repo side) — ✅ DONE

- [x] Run `npm i @sentry/nextjs` (pin the version in `package.json`).
- [x] Configs added manually (wizard equivalent, reviewed):
- [ ] Verify `package.json` diff — only `@sentry/nextjs` added, no stray deps.
- [ ] Verify `next.config.ts` is wrapped with `withSentryConfig` (source-map
- [ ] Verify `instrumentation.ts` (or `src/instrumentation.ts`) calls
- [ ] Typecheck (`npx tsc --noEmit`) + lint + unit tests still green.

---

## Phase 2 — Client-side capture (browser errors) — ✅ DONE

- [x] `sentry.client.config.ts`: `Sentry.init({ dsn, environment,
- [ ] Wire the existing seam — `src/lib/error/report-client-error.ts` body
- [ ] Keep the `monitorError` console transport as dev fallback (or remove
- [ ] Add root `src/app/global-error.tsx` (the Next.js convention for errors
- [ ] Decide the fate of `src/components/analytics/SentryErrorBoundary.tsx`:
- [ ] Verify: throw a test error from a client component in dev → appears in
- [ ] Confirm no PII in client events (search box text, form emails must be

---

## Phase 3 — Server-side capture (API routes + server code) — ✅ DONE

Routes to cover (every `route.ts` + server helper):

| Area | File(s) | Failure modes to report |
|---|---|---|
| Submit API | `src/app/api/submit/route.ts` | `sendSubmissionNotification` throw (currently 500 + `console.error` only), Supabase insert failure (currently `console.error` only) |
| Promote API | `src/app/api/promote/route.ts` | validation/rate-limit bypass attempts (as warnings, not errors), email send failure |
| Startups API | `src/app/api/startups/route.ts` | Supabase query failure |
| Tiles proxy | `src/app/api/tiles/[z]/[x]/[y]/route.ts` | upstream tile fetch failure |
| WS stub | `src/app/api/ws/route.ts` | unexpected hits (should stay 501/low-severity) |
| Admin auth | `src/app/api/admin/{login,logout,verify}/route.ts` | bcrypt/jose failures, unexpected 500s |
| Email lib | `src/lib/email/send.ts` | SMTP transport errors (wrap with `Sentry.captureException` + tags `channel: smtp`) |
| Supabase lib | `src/lib/supabase.ts` | connection/config errors at import time |

- [ ] `sentry.server.config.ts`: `Sentry.init({ dsn, environment,
- [ ] Add a tiny server helper `src/lib/error/report-server-error.ts`
- [ ] Wrap each `route.ts` handler `catch` block: replace bare
- [ ] Tag server events: `{ route: "api/submit", layer: "email|db|auth" }`
- [ ] Downgrade expected user errors (400/403/429/validation) to
- [ ] Verify: force a 500 (e.g. bad SMTP env) against dev API → Sentry issue

---

## Phase 4 — Privacy scrubbing (do before prod) — ✅ DONE (shipped in Phase 1 configs, proven by `tests/unit/lib/error/sentry-scrub.test.ts` — 5 tests)

- [ ] `beforeSend` (client + server): strip request bodies containing
- [ ] Denylist headers: `authorization`, `cookie`, `x-forwarded-for`
- [ ] Confirm search-box text and filter values never land in `extra`/`tags`.
- [ ] Confirm admin login payloads (password, token) are never captured.
- [ ] Test: trigger a submit-form validation error → inspect the Sentry event

---

## Phase 5 — Releases, alerts + noise control — OWNER: YOU (dashboard) + repo side done

- [ ] Enable release tracking (Sentry git integration or `SENTRY_RELEASE`
- [ ] Set `ignoreErrors` for known browser noise: `ResizeObserver loop`,
- [ ] Create alert rule #1: **new issue in production** → notify (email/Slack).
- [ ] Create alert rule #2: **spike in `api/submit` 500s** → page/notify.
- [ ] Set fingerprinting for rate-limit 429s so one flood = one issue.
- [ ] Document runbook: who triages, SLA, link in `docs/runbooks/` (see

---

## Phase 6 — Verification + rollout checklist

- [ ] `npx tsc --noEmit` — 0 errors.
- [ ] `npm run test:unit` — 42/42 (add a unit test for the scrub helper).
- [ ] `npm run test:integration` — 17/17.
- [ ] `npx eslint .` — exit 0.
- [ ] `npm run test:e2e -- --project=chromium` — 13 passed / 2 skipped.
- [ ] `npm run build` with `SENTRY_DSN` set — source maps upload, no leak
- [ ] Dev: test client error → Sentry. Test API 500 → Sentry. Test
- [ ] Prod deploy → trigger one harmless handled error → confirm the issue
- [ ] Mark this doc DONE + add a row in `docs/PRODUCTION_READINESS_TODO.md`.

---

## Out of scope (explicitly not Sentry)

- Analytics/product events (Google/Plausible — Phase U1, separate system).
- The missing `/api/analytics/error` route — superseded by Sentry; either
- Performance profiling beyond the initial sample-rate budget (revisit when
