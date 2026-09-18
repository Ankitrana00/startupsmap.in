# XSS → Production Security TODO
> **STATUS: ALL PHASES IMPLEMENTED** — Phase 4 enforced via `next.config.ts` headers
> (Next 16 dev did not apply root `middleware.ts`; config is the guaranteed path).
> CSP active, no `unsafe-eval`, HSTS + Permissions-Policy live on every route.
Scope: all user-data sinks (`MapView/buildPopup`, `Map.tsx`, `StartupCard`, `CardFooter`, `UnmappedItem`, `CarouselItem`, `email/send.ts`, `ui/chart.tsx`) + trust boundary (`lib/security/sanitize.ts`, `lib/security/headers.ts`, `middleware.ts`).
Rule: one phase at a time. Typecheck + unit tests + live check after EVERY phase. Ask phase-related questions BEFORE implementing that phase.
## Security Architect Note — Threat Model
Trust boundary: DB/seed rows + submit/promote inputs are UNTRUSTED. Sinks: Leaflet popup HTML (raw string), React href/src props (scheme not escaped), owner-inbox email HTML, single style injection point. React escapes TEXT nodes by default — the gap is URL schemes + raw HTML strings + headers backstop.
Principles: (1) Validate URLs at OUTPUT (sanitizeUrl), not only zod at entry. (2) Escape text at the sink that needs it. (3) Single source for headers/CSP. (4) Dead security code (sanitize.ts, 0 callers) must be wired or it is theater. (5) One phase = one commit, verify before next.

## Phase 0 — Baseline (no code changes)
1. `npm run typecheck` → expect 0 errors. Save log.
2. `npm run test:unit` → record pass counts.
3. `curl http://localhost:3000/` → 200. Confirm map/grid/unmapped render.
4. `git status --short` → clean; branch `chore/xss-prod`.
Acceptance: all green, no code touched.

## Phase 1 — P0 URL Validation (link sinks: javascript: gap)
Files: `src/components/views/GridView/StartupCard.tsx:37,48`, `src/components/views/GridView/StartupCard/CardFooter.tsx:24,35`, `src/components/views/UnmappedView/UnmappedItem.tsx:36,47`, `src/components/views/MapView/buildPopup.ts:23-25`.
Today: `href={startup.website}` renders any scheme — `javascript:alert(1)` in a DB row = clickable stored XSS. `rel="noreferrer noopener"` does NOT help. Popup `escapeHtml` on href escapes chars but does NOT block the scheme.
Vulnerable pattern:
```tsx
<a href={startup.website} target="_blank" rel="noreferrer noopener">
```
Target pattern (all 5 sinks):
```tsx
import { sanitizeUrl } from "@/lib/security/sanitize";
const safeWebsite = sanitizeUrl(startup.website ?? "");
{safeWebsite && <a href={safeWebsite} target="_blank" rel="noreferrer noopener">}
```
Popup (`buildPopup.ts`): `const safe = sanitizeUrl(startup.website ?? ""); const link = safe ? \`<a ... href="${safe}" ...>\` : "";` — never interpolate raw URL.
Edge cases: `undefined`/empty → `""` → no anchor rendered. `sanitizeUrl` currently `new URL(url)` throws on relative paths → returns `""` (intentional strict default; see Q1). Whitespace-trim before parse (add `.trim()` in sanitize.ts if missing).
Tests: NEW `tests/unit/lib/security/sanitize.test.ts` — `javascript:alert(1)` / `JaVaScRiPt:` / `data:text/html` / `vbscript:` / `""` / `undefined` → `""`; `https://example.com` + `http://` pass through normalized. Component/popup test: malicious startup row renders zero `<a href>`.
Verify: `npm run typecheck` 0 errors; unit tests green; `curl http://localhost:3000/` 200; open `/` grid view — legit website/linkedin icons still clickable; probe row with `javascript:` shows no link.
Rollback: revert single commit; links restore to previous behavior.
Q1 (ask first): strict absolute-http(s)-only, or also allow `mailto:`/`tel:` and relative `/` paths? (Recommend: http(s) absolute only — startup website/linkedin are always absolute https; loosening re-opens scheme bypasses.)

## Phase 2 — P0 HTML Escaping + Leaflet Boundary
Files: `src/components/views/MapView/buildPopup.ts:3-9`, `src/components/views/MapView/Map.tsx:65-71`.
Today: local `escapeHtml` in buildPopup escapes `& < > "` but MISSES single-quote `'` — inconsistent with `sanitizeInput` (sanitize.ts:7) and `send.ts:16` which escape it. `Map.tsx` passes raw `startup.name` / `startup.area` into Leaflet `title`/`alt` (third-party DOM sink — never trust the lib to escape for you). `markerClass` output is constants-only (safe, no change).
Target pattern:
```ts
// buildPopup.ts — delete local escapeHtml, import shared:
import { sanitizeInput, sanitizeUrl } from "@/lib/security/sanitize";
// replace escapeHtml(x) -> sanitizeInput(x ?? "")
// Map.tsx:
import { sanitizeInput } from "@/lib/security/sanitize";
title: sanitizeInput(startup.name ?? ""),
alt: `${sanitizeInput(startup.name ?? "")}, ${sanitizeInput(startup.area ?? "")}`,
```
Null-safety: `Startup.name/description/area/sector/stage` are nullable in DB (startup.ts:18-19) — every interpolation gets `?? ""` FIRST, then escape. `startup.founded` is numeric — interpolate directly, no escape needed.
Edge cases: `sanitizeInput` also escapes `/` → `&#x2F;` — safe inside HTML text/attributes; URLs must NEVER go through sanitizeInput (use sanitizeUrl, Phase 1) or slashes break.
Tests: extend `tests/unit/lib/security/sanitize.test.ts` — `<script>alert(1)</script>`, `"onmouseover="`, `'onclick='` neutralized; `buildPopupHTML(maliciousStartup)` contains zero raw `<script>` / `javascript:` / unescaped quotes. Map marker test: name with `"` renders escaped in title.
Verify: tsc 0 errors; tests green; open `/` map view — markers render, click marker → popup shows name/area/desc/tags + safe website link only.
Rollback: revert single commit.
Q2 (ask first): shared `sanitizeInput` import everywhere (single source, my recommendation), or keep local copy in buildPopup? (Recommend: shared — two escape functions WILL drift; drift in security code is how bypasses are born.)

## Phase 3 — P1 Carousel + Owner-Inbox Email
Files: `src/components/carousel/CarouselItem.tsx:16,27,30`, `src/lib/email/send.ts:46-47`.
Today: ad `link`/`image` interpolated raw into `href`/`src` — safe ONLY because ads are hardcoded literals today; breaks the day real advertiser data lands. Email builds `<a href="${escapeHtml(url)}">` — escaping ≠ scheme validation, same `javascript:` gap, delivered to YOUR inbox (Gmail neutralizes most, but never rely on the mail client).
Target pattern:
```tsx
// CarouselItem.tsx — both branches:
import { sanitizeUrl } from "@/lib/security/sanitize";
const safeLink = sanitizeUrl(link ?? "");
const safeImage = sanitizeUrl(image ?? "");
// promo branch: {safeLink ? <a href={safeLink}...> : <div ...>} (card still shows, just not clickable)
// image branch: render <Image> ONLY when safeImage non-empty, else fall back to text card
// send.ts — replace escapeHtml(url) in href with sanitizeUrl:
const safeSite = sanitizeUrl(data.website ?? "");
${safeSite ? row("Website", `<a href="${safeSite}">${escapeHtml(data.website)}</a>`) : data.website ? row("Website", escapeHtml(data.website)) : ""}
// (same for linkedin) — unsafe URL degrades to PLAIN TEXT, never a link. Display text stays escapeHtml.
```
Note: `sanitizeUrl` strict http(s)-absolute REJECTS same-origin `/promote` — current DashboardContent ads use link="/promote" (rf5a2fbe). Decision needed (see Q3) or Phase 1 testing will flag all 3 ad cards as unsafe. Options: (a) extend sanitizeUrl with explicit relative-path allowance, (b) keep strict + change ad links to absolute. Recommend (a) ONLY for CarouselItem, gated by `url.startsWith("/") && !url.startsWith("//")`.
Tests: `javascript:` ad link → no `<a href>` rendered; `javascript:` image → text fallback, zero `<Image>`; email with bad URL → row contains plain text, zero `href="javascript`.
Verify: tsc; tests; carousel shows 3 cards, `/promote` card clickable; submit probe with bad website → owner email arrives with URL as inert text.
Rollback: revert single commit.
Q3 (ask first): allow same-origin `/` paths for ads while startups stay absolute-http(s)-only? (Recommend: yes — your own 3 ad cards link to `/promote` today; startups are external sites, always absolute.)

## Phase 4 — P2 Security Headers + CSP Backstop
Files: `src/lib/security/headers.ts:8-9`, `middleware.ts:4-22`, `next.config.ts` (headers path, if used).
Today: two sources of truth — `headers.ts` defines full set (with `script-src 'unsafe-eval'`, `style-src 'unsafe-inline'`) but `middleware.ts` enforces only 3 headers (X-Content-Type-Options, Referrer-Policy, X-Frame-Options). No CSP, no HSTS, no Permissions-Policy on most routes. `unsafe-eval` voids much of CSP's XSS value.
Change:
- Single source: `headers.ts` exports `SECURITY_HEADERS`; `middleware.ts` applies it to all routes (matcher already `/:path*` — verify it also covers static/api).
- Remove `'unsafe-eval'` from `script-src` if build passes without it (Next/Turbopack dev may need it — keep dev-only exception, strict in prod).
- Keep `'unsafe-inline'` in `style-src` ONLY with comment (Tailwind requires it) — note as accepted risk.
- Add `frame-ancestors 'self'` via CSP (replaces/augments X-Frame-Options), HSTS (prod only), `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
Tests: header unit test (all keys present, no `unsafe-eval` in prod string); live `curl -I /` shows CSP + HSTS.
Verify: tsc + tests + live headers + map still loads (Leaflet tiles/scripts allowed by `img-src`/`connect-src` — update allowlist if tiles break).
Q4 (ask first): enforce CSP in `middleware.ts` (edge, per-request) or `next.config.ts` headers (static)? (Recommend: middleware — single dynamic source, already in place.)

## Phase 5 — P2 chart.tsx dangerouslySetInnerHTML Guard
File: `src/components/ui/chart.tsx:90-105` (only `dangerouslySetInnerHTML` in the app).
Today: `id`, `key`, `color` interpolate unescaped into `<style>` — safe only because callers pass constants. One future `<ChartContainer id={userInput}>` = CSS-breakout → script injection.
Change:
- Validate `id` against `/^[a-zA-Z0-9-_]+$/` (fallback `chart-fallback`) and `color` against `/^#[0-9a-fA-F]{3,8}$|^rgb|^hsl|^var\(--[\w-]+\)$/` before interpolating.
- Add comment marking this as the single sanctioned `dangerouslySetInnerHTML`.
Tests: malicious `id` (`"></style><script>`) → fallback; valid id/color pass through.
Verify: tsc + tests + any chart still renders.
Q5 (ask first): fallback-and-render vs throw-and-hide on bad id/color? (Recommend: fallback-and-render — charts are non-critical UI.)

## Phase 6 — Final Verification + Commit
1. `npm run typecheck` → 0 errors.
2. `npm run test:unit` → all green (incl. new sanitize/popup/chart tests).
3. Live battery: `/` 200, markers render, popups open, legit website/linkedin links clickable, `javascript:` probe rows render inert (manual DB/seed probe).
4. `curl -I /` → CSP/HSTS present.
5. Commit `fix/xss-prod` (one commit per phase preferred; squash only if noisy).
6. Update this file: mark phases done with commit hashes.

## Verification Matrix (after EVERY phase)
Types `npm run typecheck` = 0 errors. Unit tests pass. E2E unaffected. Live `curl 200` + open `/` at 1280px, no console errors. Legit links/cards/popups visually unchanged.

## Order
0 → 1 → 2 → 3 → 4 → 5 → 6.
URL-sinks first (exploitable), escaping second, email/carousel third, headers fourth, chart fifth.
Each phase = one commit `fix/xss-<phase>`. Baseline branch kept till green.
