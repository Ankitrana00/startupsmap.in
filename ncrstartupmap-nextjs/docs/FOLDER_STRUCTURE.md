# Folder Structure

> Verified against the working tree during the P3-5 docs-truthing pass. If a
> path below disagrees with reality, this file is wrong — fix the file.
> Tree markers: `*` = entry point / most important file in its group.

## Root

```
ncrstartupmap-nextjs/
├── middleware.ts              # admin gate, HPP guard, x-request-id (P2-6)
├── next.config.ts             # security headers (single source: src/lib/security/headers.ts)
├── instrumentation.ts *       # boot-time env validation + Sentry onRequestError
├── sentry.client.config.ts    # browser SDK + scrub rules
├── sentry.server.config.ts    # server SDK
├── sentry.shared.config.ts *  # shared PII scrubbing
├── vitest.config.ts           # unit + integration projects
├── eslint.config.mjs
├── tsconfig.json
├── package.json               # pnpm scripts are the source of truth for commands
├── postcss.config.mjs
├── .env.example *             # every variable the app reads, with notes
└── pnpm-lock.yaml
```

## src/app — routes & pages (Next.js App Router)

```
src/app/
├── layout.tsx
├── page.tsx *                 # dashboard entry (map + grid views)
├── DashboardContent.tsx       # client shell composed by page.tsx
├── providers.tsx              # React Query + theme providers
├── global-error.tsx           # React error boundary → reportClientError
├── not-found.tsx              # 404
├── metadata.ts, sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg, apple-icon.png
├── api/
│   ├── startups/route.ts *    # GET list (cached 60s) + authorized POST insert
│   ├── startups/rate-limit.ts
│   ├── submit/route.ts *      # public submission → email + Supabase; Idempotency-Key
│   ├── submit/validate.ts     # zod schema (submitSchema)
│   ├── submit/rate-limit.ts
│   ├── promote/route.ts       # promotion lead → email; Idempotency-Key
│   ├── promote/validate.ts, promote/rate-limit.ts
│   ├── admin/login/route.ts   # JWT cookie login (+ audit trail, rate limited)
│   ├── admin/login/rate-limit.ts
│   ├── admin/verify/route.ts  # session check (+ own rate limit)
│   ├── admin/verify/rate-limit.ts
│   ├── admin/logout/route.ts  # revokes jti deny-list entry
│   ├── tiles/[z]/[x]/[y]/route.ts  # OSM tile proxy
│   ├── health/route.ts        # liveness
│   └── ready/route.ts         # readiness probe (env checks, no secrets)
├── admin/                     # admin panel: page, login, submissions, users,
│                              # analytics, settings, layout (auth gate)
├── submit/, submit/success/   # submission form + confirmation
├── promote/                   # promotion landing page
├── verify/[token]/            # email verification landing
├── account/                   # account, settings, submissions
└── jobs/, jobs/[id]/, jobs/post/   # jobs board (page scaffolding)
```

## src/components

```
src/components/
├── views/
│   ├── MapView/Map.tsx *      # Leaflet map + marker clustering
│   ├── MapView/buildPopup.ts, MapControls.tsx, MapLegend.tsx, MapPanel.tsx
│   ├── GridView/GridContainer.tsx *, StartupCard.tsx, StartupCard/CardBody.tsx
│   └── UnmappedView/UnmappedList.tsx
├── toolbar/                   # ToolbarContainer *, SearchBox, FilterTray,
│                              # FilterDropdown, FilterGroup, ViewToggle,
│                              # CountLegend, MobileToolbar, MobileCountBadge, LogoButton
├── carousel/                  # AdCarousel, AdCarouselWrapper, CarouselItem
├── search/                    # AdvancedFilters, RecentSearches, SearchSuggestions
├── submit/SubmitForm.tsx
├── promote/PromoteForm.tsx
├── analytics/                 # GoogleAnalytics, PlausibleAnalytics
├── seo/JsonLd.tsx
├── shared/                    # Badge, EmptyState, OfflineBanner, ThemeToggle,
│                              # loading/MapSkeleton, loading/StartupCardSkeleton
└── utils/                     # constants.ts, format.ts
## src/lib — domain logic

```
src/lib/
├── supabase.ts *              # client factories (anon + service-role), RLS expectations
├── data/startups.ts           # row → Startup mapping
├── api/startups.ts            # fetchStartups used by React Query
├── types/                     # startup.ts, api.ts, state.ts
├── hooks/                     # useStartups *, useSubmit, usePromoteSubmit,
│                              # useShowMore, useNetworkStatus, useFilterParams, useFormDraft
├── cache/
│   ├── redis.ts *             # the single KV client (Upstash HTTP) + in-memory fallback
│   ├── startups-cache.ts      # P3-2 list cache (60s TTL + invalidation index)
│   └── metrics.ts             # cache hit/miss counters
├── rate-limit/create-limiter.ts *   # sliding-window limiter over the KV client
├── http/idempotency.ts *      # P3-1 Idempotency-Key / payload fingerprint claims
├── admin/
│   ├── auth.ts *              # bcrypt verify + JWT issue/verify + jti deny-list
│   ├── audit-login.ts         # P3-4 structured audit trail + burst escalation
│   ├── audit-log.ts           # admin action logging helpers (not login)
│   └── permissions.ts
├── error/
│   ├── report-server-error.ts *     # Sentry capture with route/layer/requestId tags
│   ├── report-client-error.ts       # browser-side counterpart
│   ├── handle-api-error.ts          # API response shaper
│   └── create-toast.ts
├── email/
│   ├── send.ts *              # sendSubmissionNotification / sendPromotionLead
│   ├── transport.ts           # nodemailer transport + retry
│   └── templates/             # submission.html, submission.txt
├── env/validate.ts *          # zod env schema, boot gate, PROD_SECRET_KEYS
├── logging/                   # logger.ts *, format.ts, transports/{console,file,cloudwatch}.ts
├── security/
│   ├── headers.ts *           # CSP + hardening headers (used by next.config.ts)
│   ├── hpp.ts, same-origin.ts, sanitize.ts
├── middleware/                # paths.ts (admin matcher), ip-utils.ts, rate-limit.ts
├── verification/              # token.ts, expire.ts
├── state/                     # store.ts, persistence.ts, selectors.ts (zustand)
├── analytics/                 # track-event, track-page-view, report-metric
├── db/                        # utils.ts, constraints.ts, seed/index.ts
│                              # schema/*.sql  → reference copies; live migrations are
│                              # supabase/migrations/* (do not edit both)
├── i18n/                      # config.ts, use-translate.ts, format.ts
├── theme/theme.ts, site.ts, utils.ts, utils/debounce.ts, error-page.ts, badge-helpers.ts
```

## src/styles & src/locales

```
src/styles/     # globals.css (Tailwind entry), variables.css, responsive.css, utilities.css
src/locales/    # en/{common,errors,ui}.json, hi/{common,errors,ui}.json
```

## scripts

```
scripts/
├── seed.mjs *           # sample data (needs DATABASE_URL)
├── build.mjs            # env check + next build wrapper
├── predeploy.mjs        # lint + typecheck + unit tests + build
├── lint.mjs, deploy.mjs, bundle-analyze.mjs, optimize-images.mjs
├── backup-db.mjs *, restore-db.mjs, verify-backup.mjs, cleanup-old.mjs
└── cls-check.mjs
```

No migration runner lives here: migrations are applied with
`supabase db push` (see `docs/DEPLOYMENT.md`).

## tests

```
tests/
├── unit/                # 18 files, jsdom: hooks, api client, security,
│                        # cache, http (idempotency), admin (audit-login),
│                        # middleware paths, rate limiter, components
├── integration/         # submit, promote, admin login (route-level behaviour)
├── e2e/                 # Playwright: map, grid, carousel, submit, promote,
│                        # mobile responsive, not-found
├── manual/              # xss-manual.test.ts (run by hand, not in CI)
├── factories/, fixtures/  # startup/user factories + form/startup fixtures
├── helpers/             # auth-helper.ts, db-helper.ts
└── setup/playwright.config.ts *
```

## supabase

```
supabase/migrations/     # applied in filename order by `supabase db push`
├── 20240901000000_init.sql *
├── 20240902000000_add_address.sql
├── 20240903000000_add_email_verification.sql
├── 20240904000000_add_submitter_email.sql
├── 20240905000000_rls_policies.sql
└── 20240906000000_add_hot_column_indexes.sql
```

## docs

```
docs/
├── DEPLOYMENT.md *          # env matrix + deploy/smoke-test steps (verified)
├── PRODUCTION_FIX_PLAN.md * # P0–P3 tiers with status
├── PRODUCTION_READINESS_TODO.md, SENTRY_TODO.md
├── FOLDER_STRUCTURE.md      # this file
├── api/v1/startups.md       # PLANNED surface — not implemented
├── architecture/            # overview.md, data-flow.md, decision-records/ADR-001
├── onboarding/              # dev-setup.md, first-day.md
├── runbooks/                # backup-restore.md, incident-response.md, scaling.md
└── component/UX/state notes (COMPONENT_GUIDELINES.md, STATE_GUIDE.md, TESTING.md, …)
```

## Deliberately absent

These appear in older notes and diagrams but do not exist here — treat a
reference to any of them as stale documentation:

- `prisma/`, `scripts/migrate.mjs` — migrations are Supabase SQL
- `src/lib/auth/` (next-auth, session, oauth) — sessions are custom JWTs
- `src/lib/jobs/`, `src/app/api/ws/` — no job system or websockets
- `src/lib/analytics/monitor-error.ts`, `src/lib/error-capture.ts` — Sentry replaced them
- `src/lib/state/cache.ts` (SimpleCache) — replaced by `src/lib/cache/*`
- `src/lib/env/schema.ts` — folded into `src/lib/env/validate.ts`
- `next-auth`, Redis TCP env vars (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`)
```