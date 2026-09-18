# Ads UI → Production Readiness TODO
Scope: `src/components/carousel/*` + ads render path (`DashboardContent`, `MapPanel`) + unused `src/components/ui/carousel.tsx`.
Rule: one phase at a time. Typecheck + unit tests + live check after EVERY phase. Ask phase-related questions BEFORE implementing that phase.

## Phase 0 — Baseline (no code changes)
1. `npm run typecheck` → expect 0 errors. Save log.
2. `npm run test:unit` → record pass counts.
3. `curl http://localhost:3000/` → 200. Screenshot map view with ads overlay at 360px / 768px / 1280px (light + dark).
4. `git status --short` → clean; branch `chore/ads-ui-prod`.
Acceptance: all green, screenshots in `docs/ads-baseline/`.

## Phase 1 — P0 Crash Guard (CarouselItem image branch)
File: `src/components/carousel/CarouselItem.tsx` (lines 10-40).
Today: all ads have no `image` → `ad.image ?? ""` passes `src=""` into `next/image`, which throws on empty src. The day a real image ad is added, map view crashes.
Change: render `<Image>` ONLY when `image` is non-empty; otherwise the text fallback card. Fix `sizes` to include a default. Promo styling untouched (Phase 2).
Tests: `image: ""` / `undefined` renders text card, never `<img>`; valid image renders `<Image>`.
Verify: tsc + unit tests + live map 200. No visual change for current ads.
## Phase 2 — Overlay Correctness + Design Tokens
Files: `MapPanel.tsx:84-90`, `CarouselItem.tsx:14`, `AdCarousel.tsx:15`, `AdCarouselWrapper.tsx:17-20`.
- 2A Heights: outer `h-27.5` (110px) vs inner p-2 + `h-25` card (116px) overflows 6px. Single panel background (remove one `panel` class), content fits container, add `overflow-hidden`.
- 2B Z-index: `z-1000` collides with Leaflet panes (max 1000). Change to `z-[500]` (below map controls), documented.
- 2C Tokens: replace `border-[#1f2120]/40`, `bg-white`, `text-[#1f2120]` with `border-border`, `bg-surface`, `text-foreground` (globals.css: never hardcode). Restyle promo card so it reads as a paid ad, not a dashed drop-zone.
- 2D Widths: collapse triple centering (`max-w-90` + `max-w-85` + `max-w-85`) to ONE constraint; fix non-monotonic `w-25 → md:w-20 → lg:w-25` to one scale.
Verify: tsc + tests + screenshots 360/768/1280 light+dark, no clipping, no double-blur.
Q2 (ask first): overlay below controls (z-500) or above (z-1100)? (Recommend: below.) Q3: keep dashed promo look or solid ad-card style? (Recommend: solid.)

## Phase 3 — Links, Disclosure, Dismiss, Error-state
Files: `CarouselItem.tsx`, `MapPanel.tsx:84-90`, `AdCarousel.tsx`.
- 3A Internal `/promote` uses `next/link` without `target="_blank"`; external links keep `<a target="_blank" rel="noopener noreferrer">`. Decide per-ad by `link.startsWith("/")`.
- 3B Disclosure: "Ad" badge per card + `role="region" aria-label="Advertisements"` + list semantics.
- 3C Dismiss: close button on overlay, session-local state in MapPanel.
- 3D Hide overlay when `loadError` is set (move `{ads && …}` inside success branch).
Verify: tsc + tests + keyboard walkthrough (tab to ads, dismiss works, SR announces label).
Q4 (ask first): dismiss for session only or persisted localStorage? (Recommend: session.) Q5: badge text "Ad" or "Sponsored"? (Recommend: "Ad".)

## Phase 4 — Carousel Behaviour: adopt or rename
Files: `AdCarousel.tsx`, `ui/carousel.tsx` (embla, ~200 lines, unused by ads).
- Option A: build ads on embla primitive (snap, arrows, keyboard, dots).
- Option B: keep strip → rename `AdCarousel` to `AdStrip`, add `scroll-snap` + focusable region + styled scrollbar.
Recommend: B (3 fixed cards don't need embla's weight); decide delete-or-keep `ui/carousel.tsx` explicitly.
Also remove ONE redundant empty-guard (Wrapper:14 vs AdCarousel:12); keep wrapper's.
Verify: tsc + tests + keyboard scroll works.
Q6 (ask first): embla adopt (A) or strip + rename (B)? Q7: delete `ui/carousel.tsx` if unused?

## Phase 5 — Sample Data Must Not Ship (prod gate)
File: `DashboardContent.tsx:37-60`. Today 2 of 3 ads point to `https://example.com`.
Change: gate behind `NODE_ENV !== "production"` OR `ads={[]}` in prod until a real source exists. Wrapper renders null on empty, so hiding is free.
Verify: prod build has no `example.com` in ads HTML; dev still shows samples.
Q8 (ask first): real ad source coming soon (build data hook now), or hide in prod until it exists? (Recommend: hide.)

## Verification Matrix (after EVERY phase)
`npm run typecheck` = 0 errors. Unit tests pass (14/14+). Live `curl /` 200 + map view at 360/768/1280px, no console errors. Dark-mode screenshot. Keyboard: toolbar → map → ads → dismiss.

## Order
0 → 1 → 2 → 3 → 4 → 5. Crash-guard first, overlay/tokens, behaviour/disclosure, carousel decision, prod gate last. Each phase = one commit `fix/ads-ui-<phase>`.

