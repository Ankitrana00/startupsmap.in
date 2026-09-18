# Production Readiness TODO — Master Plan (post-audit)

> **Created:** 2026-09-13 · **Owner:** maintainers · **Source:** full codebase audit (docs vs. code, import graph, tests, live DB)
> **Rule:** one phase at a time. Typecheck + unit tests + live check after EVERY phase. Phase-specific questions asked BEFORE that phase, not before the plan.
> **Verify set:** `pnpm typecheck` → `pnpm test:unit` → `pnpm test:integration` → dev-server live check (`/`, `/admin/login`, `/submit`, `/promote`) → `curl -I` headers where relevant.
> **Note:** working tree has ~43 uncommitted files. One phase = one commit so every fix stays revertible.

## Baseline (audited 2026-09-13)
- Green: typecheck 0 errors · unit 35/35 · integration 17/17 · `pnpm audit --prod` clean · XSS phases 0–6 done · rate limiting live · toolbar phases 1–2 + 4C/4D/4E done · ads Phase 1 crash guard + overlay z-index done · sanitizeUrl now upgrades scheme-less URLs (linkedin bug fixed).
- Stale docs: several ⬜ items are actually done (SEC-009/010, DEP-002, HSTS). Doc truthing folded into Phase C3.

---

## P0 — Security

### Phase S1 — Supabase RLS + least-privilege DB (SQL-004/005/006)
- New file: `src/lib/db/schema/rls_policies.sql` + runbook note.
- Content: enable RLS on `startups`, `unmapped_startups`; anon = SELECT only; statement_timeout; least-privilege grant notes.
- **Blocked on apply:** needs Supabase SQL editor / service role — ship SQL + instructions; user applies.
- Verify: app still reads both tables with anon key after policies are applied.

### Phase S2 — CSP hygiene — ✅ DONE 2026-09-13
- File: `src/lib/security/headers.ts` rewritten as **environment-aware** (single source of truth feeds both `middleware.ts` prod branch and `next.config.ts` all-routes headers):
  - `script-src`: `'unsafe-eval'` now **dev-only** (Turbopack/HMR needs it); production drops it — eval was the XSS enabler the file's own comment flagged.
  - `img-src`: placeholder `https://cdn.example.com` removed (dead allowlist entry = attack surface for zero benefit). Same placeholder removed from `next.config.ts` `images.remotePatterns`.
  - CSP string built from an array (`join("; ")`) — one directive per line, readable diff-able.
- Verified: typecheck 0 errors · unit 35/35 · **prod build compiles** · `pnpm start` headers probed live — `unsafe-eval: False`, `cdn.example.com: False`, HSTS intact · headless-browser map check under prod policy: `.leaflet-container` ×1, panes ×7, **18 tiles rendered, 0 CSP violations, 0 console errors**. Dev server restored after.

### Phase S3 — Admin auth hardening (SEC-008)
- Files: `src/lib/auth/next-auth.ts` (dead code with hardcoded `"changeme"` fallback), admin JWT flow.
- Change: DELETE `next-auth.ts` (unwired) unless NextAuth is chosen as platform (Q-S1: recommend delete). Confirm `ADMIN_PASSWORD` is bcrypt-only; note JWT_SECRET rotation.
- Verify: admin login/logout round-trip; typecheck.

---

## P1 — Code health (fast; shrinks surface for everything after)

### Phase C1 — Dead code deletion (grep-verified zero importers) — ✅ DONE 2026-09-13
- Deleted: entire `src/components/ui/*` (46 shadcn files), `src/lib/variants/*`, `src/hooks/use-mobile.tsx`, `toolbar/Divider.tsx`, `views/UnmappedView/UnmappedItem.tsx`, `views/GridView/StartupCard/CardHeader.tsx` + `CardFooter.tsx`, `lib/auth/next-auth.ts`.
- **Lesson recorded:** `LogoButton.tsx` was initially deleted on a bad grep, but `tsc` caught `DashboardContent.tsx:7` importing it → restored from git. Typecheck is the deletion guard, always.
- Verified: typecheck 0 errors · unit 35/35 · integration 17/17 · clean dev boot (`.next` cache had to be wiped — Turbopack held stale references) · **production `next build` passes (25/25 routes)**.

### Phase C2 — Unused dependency removal (DEP-005) — ✅ DONE 2026-09-13
- Removed 37 packages: all 26 `@radix-ui/*`, `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`, `next-auth`, `react-day-picker`, `react-hook-form`, `recharts`, `sonner`, `vaul`, `react-resizable-panels` (+ `pnpm install` → lockfile synced).
- **KEPT `react-error-boundary`** — reserved as the vehicle for Phase U4 (deliberate deviation from audit list).
- Verified: pre-flight source sweep clean (zero references) · typecheck 0 errors · unit + integration green · **production `next build` passes**.

### Phase C3 — Repo & docs hygiene — ✅ DONE 2026-09-13
- ~~Delete stray root `package-lock.json`~~ — ✅ DONE. File was an **empty** lockfile (`"packages": {}`, zero pinned deps — residue of an accidental root `npm install`), git-tracked so recoverable via `git checkout`. Result: Turbopack workspace-root warning **gone** — clean boot (`Ready in 1.2s`, `GET / 200`, 0 warnings).
- ~~Remove one-shot debug artifacts~~ — ✅ DONE. Deleted: root `find-nonce*.js` ×6, root `headers.txt`/`ads-tc.log`/`dev-server.log`; project-root `.dev-server.log`, `dev-out*.log`, `dev-server.log`, `diag_tsc_next.txt`, `headers.txt`, `test-headers*.txt`, `tsc-out.txt`, `test-bcrypt.js` (self-deleting one-shot with hardcoded `admin123` probe). Sweep confirmed **zero references** in src/tests/scripts. Live `dev-run.log` intentionally kept (active server log).
- ~~Truth the docs~~ — ✅ DONE. `CLAUDE.md` (Next 14→16, npm→pnpm + lockfile warning), `ROADMAP.md` (audited checkboxes with [~] partial legend), `SECURITY_IMPLEMENTATION_TODO.md` (SEC-004/009/010 ✅, SEC-008 🟡 partial, DEP-001/002/005 ✅ with evidence), `FOLDER_STRUCTURE.md` (truthing banner).
- Note: `ncrstartupmap-nextjs/package-lock.json` intentionally KEPT — it mirrors the real lockfile for npm readers; pnpm owns installs via `pnpm-lock.yaml`, so it is inert. Revisit if it drifts.

---

## P2 — Product gaps

### Phase U1 — Mount analytics — ✅ DONE 2026-09-13
- `src/app/layout.tsx`: mounted existing `GoogleAnalytics` + `PlausibleAnalytics` via `next/dynamic` (no `ssr:false` — forbidden in Server Components; unnecessary since both no-op server-side). Internal env-gating (`NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`) keeps them inert until vars are set in `.env`.
- CSP closed the silent-failure gaps (both vendors now actually usable once enabled): `script-src` += `https://plausible.io` (both envs); `connect-src` += `https://www.google-analytics.com https://plausible.io` (GA4 beacons + Plausible event POSTs were previously blocked → scripts would load but send nothing).
- Verified: typecheck 0 · unit 35/35 · prod build compiles · headless check with vars unset: **0 GA/Plausible script tags injected, 0 page errors** (gating works). To enable: set the vars in `.env`, restart.
- Note: `lib/analytics/track-event.ts` / `track-page-view.ts` remain unwired (zero callers; they POST to non-existent `/api/analytics/*`) — future phase if a custom event endpoint is wanted. Not dead-code-deleted deliberately (candidates for that phase).

### Phase U2 — URL-synced filters — ✅ DONE 2026-09-13
- New: `src/lib/hooks/useFilterParams.ts` — hand-rolled 5-param sync (`view,q,area,sector,stage`).
  - Read (URL→store): one-shot mount seed via `useDashboardStore.getState()` setters (no re-render loops); invalid values (e.g. `view=bogus`) ignored.
  - Write (store→URL): `router.replace(pathname?qs)` on every store change; defaults/nulls omitted → URL self-cleans to bare `/` when state resets. `scroll:false`; own-replace no-op guard via toString comparison.
- Wiring: `DashboardContent.tsx` calls the hook; `page.tsx` wraps `<DashboardContent/>` in `<Suspense>` (required — `useSearchParams` without it breaks prerendering).
- Store stays single source of truth; URL is a derived projection. Debounce already lives in SearchBox, so typing commits to URL only per-pause.
- Verified: typecheck 0 · unit tests green · headless round-trip: `/?view=unmapped&q=cyber` seeds view+search → URL updates `view=grid&q=cyber` on view switch → clearing search self-cleans to `?view=grid` · `q=cyber` filters 692→24 cards · invalid params ignored · **prod build compiles** · dev restored.

### Phase U3 — Grid "Show more" pagination — ✅ DONE 2026-09-13
All spec items implemented & verified:
- New `src/lib/hooks/useShowMore.ts` (clamped `visible`; `hasMore`/`remaining`; reset keyed on stable signature, not array identity) + `tests/unit/lib/hooks/useShowMore.test.ts` **7/7** (initial, add, clamp, total≤step, total=0, reset+shrink, same-key stability).
- `GridContainer` + `UnmappedList` both slice to `visible`, render footer `Showing {n} of {total} startups` (plain text — count pill is the single `role="status"` live region) and `Show more ({remaining} remaining)` button below the list. `resetKey` prop from `DashboardContent` (`search:filters:length`, memoized).
- Verified: typecheck 0 · unit **42/42** · integration 17/17 · headless: initial **24** → click **48** · footer text exact · count pill intact · **1** live region · q=allianz → 2 cards, show-more absent · q=cyber reset → 24 · 0 console errors · **prod build compiles** · dev restored.
- Note: initial `q=zepwell` check returned 0 — fixture name, not in live DB (non-issue; re-verified with real `allianz`).
- **NEW cleanup item logged:** `tests/e2e/grid-view/grid.spec.ts` targets `.grid-container` / `.startup-card` classes that don't exist anywhere in markup (stale selectors, pre-existing). Add to Phase C4: fix selectors or rewrite spec vs live rendering. Out of U3 scope by design.

### Phase U4 — Observability wiring (Toolbar 5E) — ✅ DONE 2026-09-14
- Mounted the kept `react-error-boundary@6.1.5` `<ErrorBoundary>` around the whole dashboard `<main>` in `DashboardContent.tsx`:
  - `onError` → new seam `src/lib/error/report-client-error.ts`, routed today via existing `monitorError` (console + POST to `/api/analytics/error`; that endpoint ships later, fetch failure is swallowed) with `componentStack`, route, and current `view` in context.
  - `onReset` → `refetch()` so "Try again" actually reloads data; `resetKeys={[view, listResetKey]}` auto-recovers when view/filter/URL state changes.
  - `fallbackRender` → error panel consistent with the existing `isError` panel (message + Try-again button).
- **SENTRY READY:** `reportClientError` is the single swap point — replace its body with `Sentry.captureException(error, { extra: { ...context } })` when `@sentry/nextjs` is adopted; zero call-site changes. Lovable telemetry intentionally NOT wired (superseded by the Sentry direction).
- Verified: typecheck 0 errors · unit **42/42** · integration **17/17** · live dev `GET /` 200 with full dashboard rendered, 0 log errors, hot-reload clean.

### Phase U5 — Ads UI phases 2C–5 (per `ADS_UI_TODO.md`, still open)
- 2C design tokens (kill `#1f2120`/`bg-white`), 2D width cleanup; 3A `next/link` for internal ads; 3B "Ad" badge + `role="region"`; 3C dismiss; 3D hide overlay on `loadError`; 4 strip rename + scroll-snap; 5 `NODE_ENV` gate for hardcoded sample ads.

### Phase U6 — i18n wiring (ROADMAP Phase 3)
- Files: `lib/i18n/use-translate.ts` + toolbar/view strings; language switcher (en/hi).
- Q-U6: switcher placement; persistence (cookie vs. localStorage).

### Phase U7 — Stub pages decision
- `/jobs*`, `/account*`, `/verify/[token]`, `/api/ws`: build for real or remove routes/links until built.
- Q-U7 per page (recommend: hide `/jobs/*` + `/api/ws` now; implement verify when submission emails carry verify links).

## P3 — Later
Real-time updates (real WS/SSE design), advanced analytics, public API, partner/premium/community, `security.txt` + security docs (DOC-001..005), quarterly audit cadence.

### Phase C4 — Stale e2e selectors + Playwright in CI — ✅ DONE 2026-09-14
- Stable test hooks: `data-testid="grid-container"` on `GridContainer`'s grid div, `data-testid="startup-card"` on `StartupCard`'s `<article>` (real markup had no `.grid-container`/`.startup-card` classes).
- Rewrote all 5 specs (15 tests) against real markup: grid (grid button `button:has-text("Grid")`, testids, searchbox `getByRole("searchbox")` + real assertion for the no-match filter path), carousel→ad-strip (dismiss button `[aria-label="Dismiss advertisements"]`, "Ad" badge text), map-view (`[aria-label="Map of NCR startups"]`, `.startup-marker`, `#filter-area` selectOption by index, Leaflet native zoom `[aria-label="Zoom in/out"]`), promote/submit (real `h1` text, `data-error` field hooks via `noValidate` forms; backend-dependent valid-submit tests marked `test.fixme` so CI never POSTs to live SMTP/Supabase).
- CI: new repo-root `.github/workflows/test.yml` (repo root is the git checkout root — GitHub only reads workflows from `<root>/.github/`; the pre-existing subdir file at `ncrstartupmap-nextjs/.github/workflows/test.yml` is inert) with `defaults.run.working-directory: ncrstartupmap-nextjs`, `test` job (unit + integration + typecheck) and `e2e` job (`playwright install --with-deps chromium`, `test:e2e --project=chromium`, Supabase secrets).
- Verified: typecheck 0 errors · unit **42/42** · integration **17/17** · eslint 0 on touched files · e2e **13 passed, 2 fixme-skipped** (chromium, against live dev server) · `test:e2e --list` shows 15 tests in 5 files.
- Notes: map "zoom" test passes against Leaflet's native controls — `MapControls.tsx` (custom overlay w/ identical aria-labels) is still dead code, deletion deferred per user choice; `Map.tsx` keeps `zoomControl: true`, no conflict. Root `.github/` dir was created fresh (untracked) — overlapping subdir workflows (lint, deploy, etc.) still live only under `ncrstartupmap-nextjs/.github/` and remain inert until moved.
`C1 → C2 → C3 → S2 → S3 → U1 → U2 → U3 → U4 → U5 → S1 (SQL ship) → U6 → U7`
Cleanup first (small, safe, shrinks the attack/maintenance surface), security config second, features last.

