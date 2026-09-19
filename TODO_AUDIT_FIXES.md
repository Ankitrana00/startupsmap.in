# TODO_AUDIT_FIXES.md — UX Audit Remediation Plan

> **Status:** PLAN ONLY. No application code has been changed. Implementation happens in
> separate, scoped follow-up tasks — one batch at a time, with diffs shown and build/tests
> run after each.
>
> **Step 0 scope verification: PASSED.** The audit's stack matches the codebase:
> `@tanstack/react-query@^5.102.8`, `zustand@^5.0.15`, `@sentry/nextjs@^10.74.0`,
> `nodemailer@^10.0.3` in `ncrstartupmap-nextjs/package.json`; `/jobs`, `/jobs/[id]`,
> `/jobs/post`, `/promote`, `/admin/*`, `/verify/[token]` all exist under `src/app/`;
> Nodemailer is live-wired in `api/submit/route.ts:66` and `api/promote/route.ts:65` via
> `src/lib/email/send.ts` (real SMTP transport, HTML + plain-text, `escapeHtml` on all
> user fields).
>
> **Test infra verified:** `tests/unit/` (12 files — incl. `lib/hooks/useStartups.test.tsx`
> which mocks `fetchStartups`, and `lib/api/startups.test.ts` which does NOT cover
> `fetchStartups` yet), `tests/integration/submit|promote`, `tests/e2e/` (submit-flow,
> promote-flow, map-view, grid-view, mobile, carousel), `tests/factories/`,
> `tests/fixtures/`, `tests/setup/playwright.config.ts` (Chromium/Firefox/WebKit,
> baseURL localhost:3000). Commands: `pnpm test:unit`, `pnpm test:integration`,
> `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

---

## STEP 2 — BATCH ORDER (implement, test, commit in this sequence)

Each batch is independently revertible. Rationale: (a) P0 > P1 > P2, (b) dependency chains,
(c) same-file fixes grouped to avoid repeated edits.

| # | Batch | Findings | Priority | Files touched |
|---|---|---|---|---|
| 1 | Dashboard error/empty-state integrity | C1 + M8 | P0 | `lib/api/startups.ts`, `app/DashboardContent.tsx`, unit tests |
| 2 | 404 page | C2 | P0 | new `app/not-found.tsx` |
| 3 | Admin security + session expiry | C3 + H4 + L6 | P0 | `middleware.ts`, `api/admin/login/route.ts`, `contexts/AdminContext.tsx`, `app/admin/*` |
| 4 | Network hardening (timeout / offline / 429) | H1 + H3 + H2 | P1 | `useSubmit.ts`, `usePromoteSubmit.ts`, `create-limiter.ts`, submit/promote/tiles routes, `DashboardContent.tsx`, new `useOnlineStatus` |
| 5 | Form UX (drafts + focus/ARIA) | M2 + M3 | P1 | `SubmitForm.tsx`, `PromoteForm.tsx`, `lib/state/persistence.ts`, unit tests |
| 6 | Stub pages + success copy | M1 (decision-gated) + L7 | P1 | `submit/page.tsx`, `promote/page.tsx`, stub pages, `submit/success/page.tsx` |
| 7 | Token cleanup (hardcoded colors) | M4 (part b) | P1 | `SubmitForm.tsx`, `PromoteForm.tsx`, `submit/success/page.tsx`, `admin/login/login-client.tsx` |
| 8 | Dark mode activation | M4 (part a) — decision-gated | P1 | `app/layout.tsx`, `globals.css`, theme script/toggle |
| 9 | Mobile/a11y polish | M5 + M6 + M7 | P2 | `useIsMobile.ts`, `DashboardContent.tsx`, `Map.tsx`, `globals.css` |
| 10 | Small cleanups | L1 + L2 + L3 + L4 + L5 + L8 | P2 | misc small files |
| 11 | Post-launch backlog | map picker, Redis limiter, route error/loading, i18n | P2 | various — each its own task |

**Explicit sequencing dependencies:**
- **Batch 7 before Batch 8** — activating an unreachable theme while `bg-red-50`,
  `bg-green-100`, and raw-gray admin pages exist would produce broken dark UIs.
- **Batch 3 before Batch 4** — both touch `create-limiter.ts` (C3 adds a third instance;
  H3 extends its return type); one round of edits, not two.
- **Batch 1 before Batch 4's H2** — the offline banner's pre-first-load variant is only
  meaningful once a real error state exists.
- **Batch 1 groups C1+M8** — same branch in `DashboardContent.tsx` (lines 153–167).
- **Batch 5 groups M2+M3** — same two components.
- **Batch 3 groups C3+H4+L6** — same admin surface; L6's logout button rides along
  (`logout()` already exists unused in `AdminContext.tsx:73–76`).

---

## STEP 1 — FINDINGS

### [C1] — Supabase read errors silently render as a fake empty state

- **Root cause:** `fetchStartups()` in `src/lib/api/startups.ts:47–109` treats
  `mapped.error` (lines 69–87) as non-fatal: it logs (sanitized in prod per the comment)
  and falls through to `return []` (line 108). TanStack Query sees a *successful* query
  resolving to `[]` — `useStartups()` never sets `isError`, so the retry UI at
  `app/DashboardContent.tsx:139–152` is unreachable for DB/env failures. The missing-env
  case is swallowed identically (`startups.ts:48–54`). Confirmed via
  `tests/unit/lib/api/startups.test.ts`: it covers only `applyFilters`/`uniqueValues` —
  `fetchStartups` has zero test coverage. The unmapped-table failure (lines 89–105) is
  *intentionally* soft ("supplementary — never block the dashboard") — by design, preserve.
  The component layer was already built for errors (`isPending/isError/refetch` per
  `docs/TOOLBAR_PRODUCTION_TODO.md:29–33`); the data layer was never made to throw.
- **Fix approach:** (1) `fetchStartups` throws on `mapped.error` and on
  `!isSupabaseConfigured`; keep the unmapped soft-degrade and sanitized prod logging.
  (2) In `DashboardContent`, split the empty branch on `hasActiveFilters` (with M8).
  Optionally `retry: 1` in `startupsQueryOptions` (`useStartups.ts:4–9`) — see Decisions #4.
- **Regression risk:** Unmapped soft-degrade must survive (test both tables). History
  check: this *completes* the earlier "fake 0 startups" fix
  (`docs/TOOLBAR_PRODUCTION_TODO.md:29–33`), does not revert it. E2E empty-panel
  assertions quote "No startups match these filters." for the *filtered* case — keep that
  exact string (see M8).
- **Test plan:** Extend `tests/unit/lib/api/startups.test.ts` with `fetchStartups` cases
  (mock `@/lib/supabase`): mapped error → rejects; unmapped error + mapped ok → resolves;
  unconfigured → rejects. Extend `tests/unit/lib/hooks/useStartups.test.tsx`:
  `mockRejectedValue` → `isError === true`, `refetch()` recovers. Manual: unset Supabase
  env → unavailable state + working Retry; restore → retry loads data. Run `pnpm test:unit`
  + map/grid e2e.
- **Depends on:** none. M8 lands in the same batch (same file).

### [C2] — No 404 page (unstyled framework default dead-end)

- **Root cause:** No `not-found.tsx` anywhere under `src/app` (verified by recursive
  search). Bad URLs (`/jobs/123` with no job data, typos, stale links) hit Next's built-in
  unstyled 404 with no way back. `middleware.ts`'s `NOINDEX_PREFIXES` and `robots.ts`
  address crawlers, not users.
- **Fix approach:** Add `src/app/not-found.tsx` — server component, no client JS: brand
  heading, one-line explanation, "Back to the map" `<Link href="/">`. Reuse existing
  token classes (`panel`, `text-muted-foreground`) consistent with other static pages.
- **Regression risk:** None — purely additive. Must not import client-heavy modules so it
  renders without hydration. Root metadata title template applies automatically.
- **Test plan:** New `tests/e2e/not-found.spec.ts`: `page.goto("/definitely-not-a-page")`
  → heading + link with `href="/"`. Manual: stale link → 404 → back to map; browser back
  returns to prior page.
- **Depends on:** none.

### [C3] — `/api/admin/*` reachable in production; admin login un-rate-limited

- **Root cause:** `middleware.ts:21` checks only `pathname.startsWith("/admin")`, which
  does **not** match `/api/admin/login|verify|logout` — the admin *pages* are blocked in
  production but the **login API is not**. The gate flag is
  `process.env.NEXT_PUBLIC_ADMIN_ENABLED` (`middleware.ts:22`) — a `NEXT_PUBLIC_*` var,
  client-visible, controlling a security decision. `api/admin/login/route.ts` has **no
  rate limit** (verified: no `checkRateLimit` import), unlike submit (5/h) and promote
  (3/h). The cookie itself is sound (httpOnly, `secure` in prod, `sameSite: "strict"`,
  `api/admin/login/route.ts:35–41`).
- **Fix approach:** (1) In `middleware.ts`, extend the production gate to `/api/admin`.
  (2) Add a dedicated instance of the existing factory —
  `createRateLimiter(5, 15 * 60 * 1000)` in a new `api/admin/login/rate-limit.ts`,
  mirroring `api/submit/rate-limit.ts`, called before body parsing with the same IP
  extraction as `api/submit/route.ts:28–31`. **Deliberately an extension of the existing
  pattern, not a new limiter** — per git history (`1ba9f4c` submit, `52d2cff` promote)
  each endpoint gets its own instance via the shared tested `createRateLimiter` factory.
  Flag rename (`NEXT_PUBLIC_ADMIN_ENABLED` → server-side `ADMIN_ENABLED`) flagged
  separately — Decisions #1.
- **Regression risk:** Extending via the factory cannot revert the submit/promote fixes
  (separate files, separate instances, shared tested factory — the exact pattern already
  shipped twice). Dev-mode e2e is unaffected: `middleware.ts:14` gates on `isProduction`,
  so dev bypasses; integration tests call route handlers directly (no middleware).
- **Test plan:** Extract a pure helper (e.g. `isAdminPath(pathname)` in `lib/middleware/`)
  and unit-test `/api/admin/login` → true, `/admin` → true, `/` → false. Integration
  test: 6 rapid logins → 429 on the 6th. Manual: local prod build → `/admin` and
  `/api/admin/login` both blocked.
- **Depends on:** none. Must land before Batch 4 (H3) — same limiter file.

### [H1] — No request timeouts anywhere

- **Root cause:** Every client fetch (`lib/hooks/useSubmit.ts:20–24`,
  `usePromoteSubmit.ts:31–37`, `contexts/AdminContext.tsx:42–44`,
  `app/admin/login/login-client.tsx:20–25`) and the server tile proxy
  (`api/tiles/[z]/[x]/[y]/route.ts:24–28`) use bare `fetch` with no `AbortSignal`/timeout;
  Supabase queries (`lib/api/startups.ts:58–67`) likewise. A stalled connection leaves
  "Submitting…" forever (the spinner has no cancel) or an eternal map skeleton.
- **Fix approach:** Small `fetchWithTimeout(url, init, ms)` helper in `lib/api/` wrapping
  `AbortSignal.timeout(ms)` (native, all evergreen browsers + Node ≥18). Use it in
  `useSubmit`, `usePromoteSubmit`, `login-client`, `AdminContext`, and the tile route's
  upstream OSM fetch (server-side, prevents hung route handlers). On abort → throw
  `Error("Request timed out…")` so the existing catch paths (`useSubmit.ts:31–33`) render
  it. Supabase dashboard query timeout deferred to post-launch — supabase-js abort support
  in v2.115 needs verification before relying on it.
- **Regression risk:** Too-short timeout could abort legitimately slow mobile form uploads
  → default 10s client / 5s tile proxy (confirm, Decisions #4). Existing tests that mock
  `fetch` with never-resolving promises would now surface as timeout errors — extend mocks,
  don't disable the timeout. No interaction with rate limiting (H3/H-3 untouched).
- **Test plan:** New `tests/unit/lib/hooks/useSubmit.test.ts` (fake timers; never-resolving
  fetch → timed-out error message; success/error paths unchanged). Manual: devtools
  "Slow 3G" + paused request → error shown, form still editable, retry possible. Tile
  route: block network to OSM in dev → fast 500.
- **Depends on:** none.

### [H2] — No offline mode

- **Root cause:** Zero `navigator.onLine` / `online`/`offline` listeners in `src`
  (verified by search). TanStack Query has no `networkMode` config in `providers.tsx:7–16`,
  so offline queries/mutations fail opaquely. Ironic detail: the copy already exists in
  `src/locales/en/errors.json:10–12` ("network.offline") but the entire i18n tree is
  unwired dead code.
- **Fix approach:** Minimal, no i18n activation: a small `useOnlineStatus()` hook
  (window `online`/`offline` listeners, SSR-safe like `useIsMobile.ts`) + a slim overlay
  banner in `DashboardContent` when offline — "pre-first-load" variant ("Check your
  connection" + Retry) vs "stale data" variant ("You're offline — showing last loaded
  data"). Do NOT wire the i18n tree for this (separate post-launch task).
- **Regression risk:** Banner must not shift layout: the mobile shell geometry is fixed by
  CSS vars (`globals.css:64–74`, `--mobile-toolbar-top/min-h`) and
  `tests/e2e/mobile/responsive.spec.ts` asserts offsets from real rects — render the
  banner as an overlay, not a flow element.
- **Test plan:** New unit test for `useOnlineStatus` (mock `navigator.onLine`, dispatch
  events). Manual devtools offline: (a) before load → message + Retry on reconnect;
  (b) after load → banner, last data stays. Re-run responsive e2e.
- **Depends on:** C1 (otherwise offline-first-load still fakes an empty state under the
  banner).

### [H3] — Rate limiting per-process; no Retry-After; raw 429 UX

- **Root cause:** `lib/rate-limit/create-limiter.ts` is in-memory per-process
  (self-documented limitation, lines 6–10): serverless instances each get their own quota
  and cold-starts reset it, so real users hit 429 unpredictably. Neither route returns
  `Retry-After` (`api/submit/route.ts:32–37`, `api/promote/route.ts:30–35`), and the
  client renders the raw server string (`useSubmit.ts:26–27`) with no cooldown affordance.
- **Fix approach:** (a) Server: extend `createRateLimiter` to also expose the remaining
  window (`{ allowed, retryAfterSec }` — backward-compatible addition, not a behavior
  change) and return a `Retry-After` header + machine-readable `code` on 429 from both
  routes. (b) Client: map 429 to "You've reached the limit — try again in X min" and
  disable the submit button with a countdown while `Retry-After` is in the future.
  (c) Redis/Upstash backend behind the same factory interface = post-launch (Decisions #6).
- **Regression risk:** Extending the factory return type touches BOTH submit and promote
  routes — the two flows hardened in `1ba9f4c`/`52d2cff`. Keep the signature
  backward-compatible or update both call sites in the same commit;
  `tests/integration/submit|promote` must stay green. Do NOT introduce a shared limiter
  across endpoints (quotas are per-endpoint by design — factory comment, lines 2–4).
  The admin login limiter (C3) should adopt the extended shape when it lands — sequence
  Batch 3 first.
- **Test plan:** Extend `tests/integration/submit/submit.test.ts` (+ promote) to assert
  `Retry-After` + JSON shape on the 6th request. New
  `tests/unit/lib/rate-limit/create-limiter.test.ts` (none exists): window reset,
  per-IP isolation, remaining-window math. Client mapping: unit test of the new
  message/cooldown helper in the useSubmit test file.
- **Depends on:** C3 (same factory file — land C3's instance first); H1 (same hook files
  for the client-side cooldown UI).

### [H4] — Admin session expiry surfaces as silent failure

- **Root cause:** `AdminContext.tsx:37–71` verifies the cookie once on mount; there is no
  expiry-driven state and no distinction between "logged out" and "session expired" —
  `admin-client.tsx:12–16` just redirects to `/admin/login` when `user` is null after
  loading. Mid-session 401s from future admin endpoints would also land there invisibly.
  (Currently mitigated: admin sub-pages are stubs and the whole surface is prod-gated, so
  exposure is small — hence High, not Critical.)
- **Fix approach:** Add an `isExpired`/`sessionState` distinction: on a 401 from
  `/api/admin/verify` set state that routes to `/admin/login?reason=expired`, and have the
  login form show "Your session expired — sign in again" when `reason=expired`. No token
  parsing on the client (httpOnly cookie by design) — derive purely from the verify call's
  status code.
- **Regression risk:** None for public flows. `useAdmin` throws when used outside the
  provider (`AdminContext.tsx:25–31`) — keep that. Admin e2e has no dedicated spec today;
  the login form copy change is the only UI-visible piece.
- **Test plan:** Manual: valid login → wait/force cookie expiry (shorten maxAge in a dev
  env override) → next admin visit lands on login with the expired message; fresh login →
  no message. If a CI admin spec is added later, cover `?reason=expired`.
- **Depends on:** C3 (same admin surface/batch; also pointless to build session UX for an
  endpoint that must stay prod-blocked).

### [M1] — Dead-end "coming soon" pages reachable from live flows

- **Root cause:** Product shipped cross-links before the destinations exist:
  `submit/page.tsx:37` links to `/jobs` ("Jobs section coming soon", `jobs/page.tsx:33`);
  `promote/page.tsx:54–64` links both `/jobs` and `/submit`; `/verify/[token]/page.tsx:19–20`
  prints the raw token + "Verification functionality coming soon"; `/account/*`,
  `/admin/submissions|users|settings|analytics`, `/jobs/[id]`, `/jobs/post`, `/api/ws`
  are all stubs. Each stub is a dead end with no "back" affordance except browser back.
  (The `noindex`/`noindex` header coverage in `middleware.ts:10` is correct — SEO is
  protected; this is purely a human UX gap.)
- **Fix approach:** Decision-gated (Decisions #2): either (a) hide cross-links to stubs
  from live pages (`submit/page.tsx:36–46`, `promote/page.tsx:48–65`) and reduce
  `/verify/[token]` to a neutral "check your email" message **without echoing the token**,
  or (b) upgrade stubs to "In progress — back to map" cards with a CTA. Option (a) is the
  minimal production-safe choice; (b) is better if the pages ship soon. Echoing the token
  should stop in both cases — it leaks a capability credential into the DOM.
- **Regression risk:** Removing links changes page content asserted in tests — check
  `tests/e2e/submit-flow/submit.spec.ts` and `promote.spec.ts` for related-page link
  assertions before editing (none observed in the specs read, but confirm at
  implementation). Metadata (`robots` noindex) must stay as-is.
- **Test plan:** Update/extend the submit/promote e2e specs for the new nav state; new e2e:
  `/verify/anything` renders the neutral message with no token in the DOM; every visible
  link resolves 200 (simple crawl assertion).
- **Depends on:** Decisions #2.

### [M2] — Form data lost on refresh/back

- **Root cause:** `SubmitForm.tsx:52–72` and `PromoteForm.tsx:46–53` hold all field state
  in `useState` only; no persistence. A refresh, accidental back-navigation, or session
  restore wipes a 14-field submission. `lib/state/persistence.ts` (loadState/saveState,
  try/catch-guarded, SSR-safe) exists for exactly this and is imported by nothing
  (verified) — dead infrastructure awaiting this fix.
- **Fix approach:** Reuse `persistence.ts`: a small `useFormDraft(key)` hook that
  loadState()s on mount, saves on change (debounced), and clears on successful submit;
  keys `submit-form:v1` / `promote-form:v1`. Clear on success only (after 201), never on
  validation failure.
- **Regression risk:** localStorage failures are already swallowed
  (`persistence.ts:11–18`) — keep. Draft restore must not resurrect stale validation
  errors (`fieldErrors` starts empty — fine). Sensitive-field caution: the draft stores
  email/phone locally; acceptable for a public form (same as browser autofill), but the
  draft must clear on submit. Watch the honeypot field: exclude it from persistence.
- **Test plan:** New `tests/unit/lib/hooks/useFormDraft.test.ts` (save/load/clear, quota
  error swallowed); component test or manual: fill half → reload → values restored →
  submit → success → localStorage key gone. Extend `tests/e2e/submit-flow/submit.spec.ts`
  with a reload-restores-draft case.
- **Depends on:** none. Same batch as M3 (same files).

### [M3] — No focus management / aria-invalid on failed submit

- **Root cause:** `SubmitForm.tsx:43–50` and `PromoteForm.tsx:34–41` render per-field
  errors with `role="alert"` (good) but nothing moves focus on failed submit — screen
  readers announce the alert but keyboard users must tab-hunt; the submit error banner
  (`SubmitForm.tsx:121`, `PromoteForm.tsx:106–108`) is not focused either. Inputs signal
  errors only via a red border class (`inputErrorClassName`, lines 28–29) with no
  `aria-invalid` or `aria-describedby` — invisible to assistive tech. (`CLAUDE.md:715`
  claims "aria-invalid on error states"; verified absent.)
- **Fix approach:** On validation failure: focus the first invalid field (field names map
  1:1 to element `id`s — a `document.getElementById(firstErrorKey)?.focus()` is enough);
  give each error `<p>` an `id` and set `aria-invalid={!!fieldErrors.x}` +
  `aria-describedby` on the corresponding input. For server-rejection errors, focus the
  banner (`tabIndex={-1}` + focus()). Both forms, mirrored.
- **Regression risk:** `getElementById` lookup runs only inside the submit handler (no
  render-phase DOM access). Focusing can scroll the page — expected behavior. No effect
  on the success path. Shares the banner with H1's timeout errors — same focus target.
- **Test plan:** New `tests/unit/components/submit/SubmitForm.test.tsx` + promote
  equivalent: submit empty form → first invalid field focused, has
  `aria-invalid="true"`, error `<p>` has `role="alert"` + id. Extend
  `tests/e2e/submit-flow/submit.spec.ts` happy path unaffected.
- **Depends on:** none. Same batch as M2 (same files).

### [M4] — Hardcoded colors break the token contract; dark mode unreachable

- **Root cause:** Two independent facts confirmed by reading the code. (a) Hardcoded
  colors: `SubmitForm.tsx:121` (`bg-red-50 text-red-600`), `PromoteForm.tsx:83–88` +
  `:106–108` (`bg-green-100 text-green-600`, `bg-red-50`), `submit/success/page.tsx:13–26`
  (`bg-green-100 text-green-600`), and the whole admin login page
  (`admin/login/login-client.tsx:41–103`) uses raw `gray`/`white`/`indigo` Tailwind
  colors — all violating the design system's own rule (`globals.css:9–10`). Tokens exist
  for most of this: `--destructive` = `#dc2626` (`globals.css:107`), `--action` =
  `#10b981` green (`:100`), and `Badge.tsx:5–10` shows the canonical tone-class pattern.
  There is no dedicated `--success` token — reuse `--action` or add one (minor decision;
  default: reuse `--action`). (b) Dark mode: `globals.css:439–466` defines a complete
  `:root[data-theme="dark"]` token set and `globals.css:3` declares the `dark`
  custom-variant — but nothing in `src` ever sets `data-theme` or a `.dark` class, and
  there is no `prefers-color-scheme` fallback (verified: the only `data-theme` occurrence
  in `src` is the CSS file itself). The dark theme is unreachable dead CSS.
- **Fix approach:** Two sequential parts. **Part b (Batch 7):** replace hardcoded classes
  with token classes (`text-destructive`, `border-destructive/40 bg-destructive/10`,
  `text-action`/`bg-action/15` per the Badge pattern); tokenize the admin login page onto
  the shared panel/input styles. **Part a (Batch 8, decision-gated):** no-flash inline
  theme script (localStorage → `prefers-color-scheme` → `data-theme` before paint),
  a toggle, `theme-color` meta, localStorage persistence.
- **Regression risk:** Color classes only — MUST NOT touch `sanitizeInput`/`sanitizeUrl`
  or `Map.tsx`/`buildPopup.ts` (the stored-XSS fix from `78972ff` lives there and is
  guarded by `tests/unit/security/sanitize.test.ts` + `tests/manual/xss-manual.test.ts`;
  no color work imports them). While tokenizing the admin login file, also fix its
  missing `htmlFor`/`id` label association (lines 57–80) — same file, M3-adjacent.
- **Test plan:** Batch 7: grep gate — `rg "bg-(red|green|gray)-|text-(red|green|gray)-|indigo-" src/`
  returns zero hits; full `pnpm test:unit` + e2e; manual visual pass of submit error,
  promote success, submit/success, admin login. Batch 8: manual light/dark/system toggle,
  no-FOUC on hard reload, contrast pass on dark tokens, one e2e smoke in dark.
- **Depends on:** Part a depends on Part b. Part b depends on nothing. Decisions #3.

### [M5] — Mobile first-paint renders desktop shell (CLS)

- **Root cause:** `useIsMobile.ts:16` initializes `false` (deliberate hydration-safety
  choice per its own docstring) then flips after mount — `DashboardContent.tsx:217/235`
  branches the whole page on it, so every mobile visit paints the desktop `<main>` shell
  first, then swaps to the fixed mobile overlay. The CSS-var shell
  (`--mobile-toolbar-*`) was built for geometry, but the branch decision itself waits
  for JS.
- **Fix approach:** CSS-first: render both shells server-side with `max-md:hidden` /
  `hidden max-md:block` visibility instead of the JS ternary, keeping `useIsMobile` only
  for behavior (listeners), not layout. Alternatively accept the flash as a known
  tradeoff (Decisions #5).
- **Regression risk:** Highest-risk cosmetic fix here: duplicated DOM (two toolbars in
  the tree) can double-match e2e selectors (`tests/e2e/mobile/responsive.spec.ts`
  targets the mobile toolbar; `tests/e2e/map-view/map.spec.ts` targets the map) — all
  `getBy*` queries need visibility scoping. Mobile offset CSS vars assume a single
  toolbar instance.
- **Test plan:** Full responsive + map + grid e2e re-runs; new assertion that exactly one
  toolbar is visible per breakpoint; Lighthouse CLS before/after on mobile emulation.
- **Depends on:** none; scheduled late (Batch 9) because of e2e churn. Decisions #5.

### [M6] — Map marker touch targets are 20×20px

- **Root cause:** `Map.tsx:107–112` builds `L.divIcon` with a 20×20px span
  (`iconSize: [20,20]`, `iconAnchor: [10,10]`). Individual markers at max zoom are ~20px —
  below the 44px touch guideline. Popup icon buttons are `2rem` (`globals.css:411–421`),
  also small. Clustering (`Map.tsx:78–85`) mitigates density, not per-marker targets.
- **Fix approach:** Increase hit area without changing visuals: render a larger
  transparent span (36–44px) with the visible dot centered via CSS (`.startup-marker`
  gets a padded centered inner element), adjusting `iconSize`/`iconAnchor` so the anchor
  stays centered. Bump `.popup-icon-btn` to ~2.5rem min. Pure CSS + markup — no cluster
  config or popup-content changes.
- **Regression risk:** Anchor geometry shifts click-to-marker mapping by a few px —
  `tests/e2e/map-view/map.spec.ts` clicks markers; larger hit boxes increase overlap
  (clusters mitigate). **Explicitly do not touch `buildPopup.ts` or `sanitizeInput`**
  (stored-XSS fix from `78972ff` — same guard as M4).
- **Test plan:** Re-run map e2e; manual touch check on mobile emulation; screenshot diff;
  confirm popups open on click and via keyboard (`keyboard: true`, `Map.tsx:118`).
- **Depends on:** none. Batch 9 (P2 polish).

### [M7] — Pervasive 12px (`text-xs`) primary copy; contrast unverified

- **Root cause:** `text-xs` is the de-facto size for toolbar controls, count pill, card
  meta, and buttons (`ViewToggle.tsx:31`, `SearchBox.tsx:74`, `DashboardContent.tsx:282`,
  `GridContainer.tsx:42–51`, `FilterDropdown.tsx:49`). It's rem-based (zoom-safe), but
  12px is small for primary actions, and `--muted-foreground` = `#6b6e6b` on
  `--background` = `#f3f4f3` (`globals.css:77,94`) is marginal at 12px for non-bold text.
  No numeric contrast audit exists in the repo.
- **Fix approach:** Measured, not blanket: run an axe/contrast audit, then bump only the
  low-contrast + small combos (count pill, "Showing X of Y", submit CTA) to `text-sm`.
  If mobile toolbar geometry changes, `--mobile-toolbar-min-h` (`globals.css:74`) must be
  recomputed in the same commit — its comment (lines 64–74) documents the exact height
  arithmetic.
- **Regression risk:** Any size bump inside the fixed mobile toolbar invalidates the
  `--mobile-toolbar-min-h`/offset math (the file's own comment warns "Never hardcode
  8/100/106/120/130"). Changing the count pill text may affect e2e count assertions.
- **Test plan:** Add `@axe-core/playwright` (devDep) and a contrast spec; responsive e2e
  re-run after any `--mobile-toolbar-min-h` change; manual check at 320px emulation.
- **Depends on:** lands with/after M5 (Batch 9) — both touch mobile geometry.

### [M8] — Misleading empty state when there are truly no results

- **Root cause:** `DashboardContent.tsx:153–167` renders "No startups match these
  filters." + "Clear all filters" whenever `viewStartups.length === 0` — including when
  `hasActiveFilters` is false (line 101 computes it but the branch ignores it). A
  genuinely empty (or, pre-C1-fix, error-swallowed) dataset tells users they filtered
  something away. No submission CTA at the natural "empty directory" moment.
- **Fix approach:** Split by `hasActiveFilters`: filtered → current copy + clear button
  (keep the exact existing string — e2e may assert it); unfiltered → "No startups listed
  yet" + "Submit your startup" link to `/submit`. Exact copy pending Decisions #7.
- **Regression risk:** Copy changes can break e2e assertions (map/grid specs assert the
  empty-panel text) — update specs only for the unfiltered case. `EmptyState` component
  itself untouched (that's L2, Batch 10).
- **Test plan:** Extend e2e: `/?q=zzz` (filtered-empty → old copy) vs `/` on empty
  dataset (unfiltered-empty → new copy + CTA).
- **Depends on:** C1 (same batch — the error-vs-empty distinction comes from C1's throw).

### [L1] — Desktop "Clear" button hidden while loading

- **Root cause:** `DashboardContent.tsx:259` gates the Clear button on
  `hasActiveFilters && !isPending` — during refetch, active filters cannot be cleared.
  Clearing mid-load is actually safe: `applyFilters` (`lib/api/startups.ts:125–128`)
  handles empty data, and `FilterDropdown`'s stale-guard (`FilterDropdown.tsx:30–37`)
  already protects option lists during refetch.
- **Fix approach:** Drop the `!isPending` condition.
- **Regression risk:** Trivial — skeleton renders with cleared filters; no state hazard.
- **Test plan:** Manual: start a refetch with filters active → Clear visible and
  functional. No dedicated test exists for this button.
- **Depends on:** none.

### [L2] — EmptyState lacks semantics (role/heading)

- **Root cause:** `EmptyState.tsx` is a plain `<div>` + decorative icon + text — no
  `role="status"`, no heading; announcements depend on surrounding context.
- **Fix approach:** Add `role="status"` (content replaces the list — appropriate live
  region) and an optional visually-hidden heading via the existing `sr-only` utility
  (`styles/utilities.css`).
- **Regression risk:** The repo deliberately keeps exactly one live region (count pill):
  `GridContainer.tsx:40–41` comment and `docs/PRODUCTION_READINESS_TODO.md:76` asserts
  "**1** live region". EmptyState renders *instead of* the count pill only in the
  DashboardContent empty branch — but GridContainer/UnmappedList also render EmptyState
  internally when handed 0 items, which can coexist with the pill. Fix: only add
  `role="status"` where no other live region is present, or update the e2e live-region
  count — Decisions #9.
- **Test plan:** Existing toolbar/empty e2e assertions re-run; adjust the live-region
  count assertion per decision.
- **Depends on:** Decisions #9.

### [L3] — Ad dismissal not persisted

- **Root cause:** `MapPanel.tsx:28` `adsDismissed` is component state; per its own
  comment (lines 99–100) it is session-scoped by design, but "session" = component
  lifetime — any remount or reload resurrects the ad.
- **Fix approach:** Persist to `sessionStorage` (matches the comment's intent; e2e uses
  fresh contexts so tests are unaffected) with the existing try/catch pattern from
  `persistence.ts`.
- **Regression risk:** Minimal; `tests/e2e/carousel/carousel.spec.ts` expects the
  dismiss button on a fresh page — fresh context = fresh sessionStorage, unaffected.
- **Test plan:** Manual: dismiss → navigate away → back within session → still hidden;
  new tab → visible again.
- **Depends on:** none.

### [L4] — Unused skeleton components (drift risk)

- **Root cause:** `StartupCardSkeleton.tsx` and `SubmitFormSkeleton.tsx` exist but no
  component imports them (verified) — `DashboardContent.tsx:122–137` inlines its own
  grid skeleton markup. Two sources of truth for the same visual.
- **Fix approach:** Replace the inline skeleton with `<StartupCardSkeleton />` mapping;
  delete `SubmitFormSkeleton.tsx` if still unused after the /submit loading story is
  decided (it has no client-side loading state today — /submit is a static page — so
  deletion is the honest option unless a route-level `loading.tsx` lands, see Batch 11).
- **Regression risk:** None; markup parity is the goal.
- **Test plan:** `pnpm typecheck && pnpm lint && pnpm test:unit`; visual check of the
  loading state.
- **Depends on:** none.

### [L5] — Dead `ErrorBoundary` component with an inferior recovery pattern

- **Root cause:** `src/components/ErrorBoundary.tsx` has zero importers (verified) —
  `DashboardContent` uses `react-error-boundary` instead, whose `onReset` actually
  refetches (`DashboardContent.tsx:195`). The dead class's "Try Again" (lines 30–35) only
  clears state without reloading data — leaving it invites future misuse of the weaker
  pattern.
- **Fix approach:** Delete the file. Docs mention it
  (`docs/PRODUCTION_READINESS_TODO.md`) — update the doc reference only if trivial.
- **Regression risk:** None (re-grep importers at implementation time as a gate).
- **Test plan:** `rg "@/components/ErrorBoundary" src/` → 0 hits, then
  `pnpm typecheck && pnpm lint && pnpm build`.
- **Depends on:** none.

### [L6] — Admin dashboard dead-end copy + no logout UI

- **Root cause:** `admin-client.tsx:30` greets a successful login with "Admin
  functionality coming soon" and provides no way to sign out — even though
  `AdminContext.tsx:73–76` implements `logout()` that nothing calls (verified). Grouped
  with Batch 3 because it is the same admin surface and C3 may make the page moot.
- **Fix approach:** Add a "Sign out" button calling `logout()` then
  `router.push("/admin/login")`. Keep the "coming soon" copy until sub-pages ship (or
  per Decisions #2).
- **Regression risk:** Dev-only surface; none for public users.
- **Test plan:** Manual dev flow: login → sign out → redirected to login → verify cookie
  cleared (`/api/admin/logout`).
- **Depends on:** C3 (same batch; same gate decision).

### [L7] — `/submit/success` reachable without a submission

- **Root cause:** Static server page with no state guard (`submit/success/page.tsx`) —
  deep-linking shows "Submission Received!" spuriously. Harmless (no data side effects)
  but can mislead.
- **Fix approach:** Cheapest honest fix: soften copy ("Thanks for your interest — if you
  just submitted a startup, we've received it…"). State-guarding via a `useSubmit`-set
  sessionStorage flag is possible but adds coupling for little value.
- **Regression risk:** `tests/e2e/submit-flow/submit.spec.ts` likely asserts
  success-page content — update the spec in the same commit if the heading changes.
- **Test plan:** E2E submit-flow re-run; manual deep-link to `/submit/success`.
- **Depends on:** none. Rides with Batch 6 (same area as M1).

### [L8] — One Escape press both clears search and closes the filter tray

- **Root cause:** `SearchBox.tsx:68–72` handles Escape (clears the input) while
  `FilterTray.tsx:57–67` also listens for Escape on `document` while open — no
  `stopPropagation` on either side, so one keypress does both. Verified by reading both
  handlers; there is no precedence rule.
- **Fix approach:** Define precedence: Escape inside the search input clears the text and
  *stops propagation* when the input had content; a second Escape (input now empty)
  closes the tray. A one-line guard in `FilterTray`'s handler (ignore Escape originating
  inside a non-empty search input) is cleaner than mutating SearchBox.
- **Regression risk:** Behavior change — `tests/unit/components/toolbar/FilterTray.test.tsx`
  likely asserts Escape-closes; must be updated to the two-step model. SearchBox has no
  dedicated test.
- **Test plan:** Extend `FilterTray.test.tsx`: Escape with text in input → input clears,
  tray stays; Escape again → tray closes. Manual keyboard pass.
- **Depends on:** none. Batch 10.

---

## STEP 3 — NEEDS YOUR DECISION BEFORE IMPLEMENTATION

These are product/strategy calls, not code choices. Batches that depend on a decision
are marked above; un-decided items stay parked while the rest of their batch ships.

1. **[C3 + M1-admin] Admin in production:** (a) remove admin from production entirely
   (recommended while all sub-pages are stubs — smallest attack surface), (b) keep the
   gate but rename `NEXT_PUBLIC_ADMIN_ENABLED` to a server-side `ADMIN_ENABLED` (env-file
   + docs churn), or (c) leave the flag as-is and only extend the gate to `/api/admin`.
   Today it blocks pages but not APIs (the audit's C3 finding).
2. **[M1 + L6] Stub pages:** hide cross-links to stubs from `/submit` and `/promote`
   (minimal, recommended pre-launch) vs. upgrade stubs to "in progress + back to map"
   cards. Per-page granularity available (jobs list / job detail / account / verify).
   Regardless of choice: stop echoing the raw verification token in `/verify/[token]` —
   confirm you accept that as a security-hygiene fix rather than a product feature.
3. **[M4a] Dark mode:** ship theme activation now (no-flash script + toggle +
   persistence + contrast pass) or defer post-launch? Token cleanup (Batch 7) proceeds
   regardless — required for consistency either way.
4. **[C1 + H1] Small technical defaults to confirm:** (a) startups query `retry: 1`
   instead of TanStack's default 3 (faster error UI on real outages); (b) timeout budget:
   10s for client form fetches, 5s for the tile proxy. Both are one-line constants.
5. **[M5] Mobile CLS:** invest in the CSS-first dual-shell refactor (touches e2e
   selectors, Batch 9) or accept the one-frame desktop flash as a known tradeoff? The
   audit rated it P2; cost/benefit favors deferring unless CLS matters for SEO.
6. **[H3c] Rate-limit backend:** stay in-memory for launch (fine for a single instance;
   documented limitation in `create-limiter.ts`) vs. adopt Upstash/Redis now. Audit
   recommendation: post-launch.
7. **[M8 + L7] Copy:** (a) unfiltered empty-state wording + whether it gets a "Submit
   your startup" CTA; (b) softened `/submit/success` wording for direct visits. Defaults
   proposed in the entries; wording is yours to red-pen.
8. **[Batch 11] Map picker/geocoding on `/submit`:** the manual lat/lng fields are the
   biggest usability barrier in the conversion funnel. In scope as a post-launch feature
   task, or explicitly out? (Affects whether route-level `loading.tsx` work in Batch 10
   is worth doing first.)
9. **[L2] Live-region count:** the e2e suite asserts exactly **1** live region
   (`docs/PRODUCTION_READINESS_TODO.md:76`). Giving EmptyState `role="status"` may raise
   that to 2 in some states. Accept 2, or scope EmptyState's live region to the
   dashboard-only variant?

---

## Audit items explicitly NOT in scope of this plan (no action)

- **Payments:** none exist in the codebase (verified) — payment success/failure/
  interruption UX is N/A until a payment provider is introduced. When it is, it needs
  its own audit.
- **Session-expired states for public users:** no public auth exists (verified) — H4
  covers the only real session surface (admin).
- **Maintenance/service-unavailable page:** deferred with Batch 11's route-level
  `error.tsx` work; the API-side 503 path already exists (`api/startups/route.ts:7–15`).
- **i18n activation:** the `lib/i18n/*` + `locales/*` tree is fully authored but unwired
  (verified); it's roadmap work (Phase U6 in `docs/PRODUCTION_READINESS_TODO.md`), not a
  UX-audit defect. Offline copy for H2 is hardcoded English to match the current
  all-English UI.
- **`lib/auth/session.ts` stub:** dead code with a fake `verifySession` — candidate for
  the same Batch 10 dead-code sweep as L5; no UI imports it (verified).
- **`lib/state/cache.ts`, `RecentSearches`, `SearchSuggestions`, `AdvancedFilters`,
  `MapControls`, `lib/db/*`, `lib/jobs/*`:** dead/unwired scaffolding — if you want a
  broader dead-code sweep beyond L4/L5, say so and it becomes its own batch; it is not
  required by any audit finding.

