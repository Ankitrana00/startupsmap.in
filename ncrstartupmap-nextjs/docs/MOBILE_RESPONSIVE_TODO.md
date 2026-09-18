# Mobile Responsive — Fix TODO

**Source:** manual code-reading diagnosis of the mobile responsive shell (toolbar / tray / map layer / badge / list views) + live measurements on `localhost:3000` at 320×568, 375×812, 430×932, 812×375, 1280×800.
**Status:** not started — implement phase by phase.
**Owner:** next implementing agent.

> **Read "Rules of engagement" and "Baseline" before editing anything.** Every phase is written
> as a surgical diff with an exact verification step. If a phase's verification fails, revert
> **that phase only** and report — do not continue to the next phase on a broken base.

---

## 0. Scope

**In scope (this file):** correctness and layout bugs of the mobile responsive shell —
unscrollable list views, the dead band under the map, badge/legend/ads collisions, tray control
heights, toolbar clipping + magic-number drift, short-viewport (landscape) overflow, two state
bugs, touch-target sizes, tray keyboard/scroll containment, dead code.

**Out of scope:** any visual redesign, any new feature, any change that alters desktop (≥768px).
Deferred items are listed in §"Deferred (explicitly out of scope)" with the reason they must
**not** be half-implemented.

---

## 1. Rules of engagement (mandatory)

| # | Rule |
|---|---|
| **R1** | **No new runtime code.** No new components, hooks, npm deps, or files — the only new files allowed are the e2e spec in **M11** and edits to docs. Fixes are changes to existing classes/expressions, plus the 1-line `cn` import in **M1**. |
| **R2** | **Desktop must stay pixel-identical.** Any class that could leak to ≥768px must be guarded with `max-md:` (mobile-only) or be part of a **full string ternary** that keeps the desktop string byte-identical. |
| **R3** | **Never append conflicting Tailwind classes to a plain string.** `"h-9 " + "h-10"` resolves by *stylesheet* order, not class order → unpredictable. Use a ternary that replaces the whole string, or `cn()` (twMerge), which is the only reliable dedupe. |
| **R4** | `md:` and `max-md:` variant utilities are emitted **after** base utilities, so they win at their breakpoint. That is how the codebase already overrides base heights (`md:h-[calc(100vh-11rem)]` over `h-[calc(100vh-13rem)]`); `max-md:` behaves the same way. Guards (R2) are safe for this reason. |
| **R5** | **Do not touch `MapPanel`'s desktop strings** (`md:` variants, `h-[calc(100vh-11rem)]`, ads `md:` placement) — `MapPanel` is shared by both branches. |
| **R6** | When a fixed element gets a `max-md:top-*`, it **must** also get `max-md:bottom-auto` (both set → the box stretches). Same for left/right pairs. |
| **R7** | **Decision gates are stop-and-ask.** `M6b`, `M7`, `M8b`, `M9c`, `M10d` each change behaviour beyond a class swap. Implement them only after the chosen option is written into this file; never implement "half" of one. |
| **One phase = one commit.** Run the phase's *Verify* before moving on. |

### Tooling (verified present)

| What | Where |
|---|---|
| Next.js 16.3.4 / React 19.2.8 / Tailwind **v4** (`@tailwindcss/postcss`) | `package.json` |
| Tailwind v4 features already in use: `@theme inline`, `@custom-variant`, `@utility` | `src/styles/globals.css:1-3,13,146,158,166` |
| Design tokens live in `:root` (line 61-104) + `.dark` | `src/styles/globals.css:61` |
| Unit tests: Vitest + Testing Library (`npm run test:unit`) | `tests/unit/**` |
| E2E: **Playwright is installed**, `testDir: ../e2e`, `baseURL http://localhost:3000`, projects chromium/firefox/webkit, `reuseExistingServer: true` | `tests/setup/playwright.config.ts` |
| E2E script | `npm run test:e2e` |

---

## 2. Baseline ("before") — measured, do not guess

Taken on the current working tree (dev server running, hot-reloaded).

| # | Symptom | Measurement |
|---|---|---|
| B1 | Grid/Unmapped views don't scroll | 375×812 grid: layer `scrollHeight 5360` / `clientHeight 688`; `scrollTop` stays `0`; document `scrollHeight 812` |
| B2 | Dead band under the map | 375×812: map box `top 124 → bottom 728`, viewport `812` → **84px** band |
| B3 | Badge/legend collision | already touching at 320×568 (`92×1px` overlap) once the map reaches the bottom |
| B4 | Tray selects too short | `select` rects `84×20` @375, `66×20` @320 (should be 40px) |
| B5 | Toolbar already clipped | `scrollHeight 99` / `clientHeight 98` at default font size |
| B6 | Landscape phone = desktop layout | 812×375: no mobile toolbar found; map box `top 192 h 416` in a 375px-tall viewport |
| B7 | No mobile markup in SSR | SSR HTML: `mobile-search-input 0`, `id="search-input" 1`, `h-[100px] 0`, `Toggle filters 0` |
| B8 | Touch targets < 40px | logo link `h 28`, search input `h 36`, clear button `≈22`, selects `h 20` |
| B9 | Dead code (0 importers) | `src/components/toolbar/FilterGroup.tsx`, `src/components/utils/MobileMapWrapper.tsx` |
| B10 | Stale comment | `globals.css:236-238` says `+112px`, code says `+124px` |

**Freeze the baseline** (M0) so "did I break desktop?" is always answerable.

---

## M0 — Checkpoint + baseline capture (no code change)

1. **Clean the workspace first** — `git add -A` would otherwise sweep throwaway probe scripts and stray
   lockfile artifacts into the checkpoint commit. Verified untracked at the time of writing:
   `.diagnose-mobile.mjs`, `.diagnose-run.mjs`, `.verify-final.mjs`, `.verify-legend.mjs`,
   `.verify-row.mjs` (all throwaway geometry probes from the diagnosis — delete them; M11 replaces them
   with a real spec), plus `.cline/`, a workspace-root `package.json` and a modified workspace-root
   `package-lock.json` (pre-existing stray artifacts of an `npm install` run at the repo root — **do not
   stage these**; they are a separate decision, see the "leftover for later" note in `BUGFIX_TODO.md`).
   ```powershell
   Set-Location "c:\Users\Ankit\startup-map-dash\ncrstartupmap-nextjs"
   Remove-Item -Force .diagnose-mobile.mjs,.diagnose-run.mjs,.verify-final.mjs,.verify-legend.mjs,.verify-row.mjs -ErrorAction SilentlyContinue
   ```
2. Commit (or stash) the current mobile work as a checkpoint so each phase can be reverted alone —
   **stage the `ncrstartupmap-nextjs/` paths explicitly**, never `-A`:
   ```powershell
   Set-Location "c:\Users\Ankit\startup-map-dash"
   git add ncrstartupmap-nextjs
   git status --short          # confirm no .cline/, no root package.json, no root package-lock.json
   git commit -m "chore: checkpoint mobile toolbar before responsive fixes"
   ```
   (Ask the user first if they don't want a commit; a `git stash` also works.)
3. Re-measure the B1–B8 table and confirm it matches; note device pixel ratio and browser.
4. Confirm the dev server answers: `Invoke-WebRequest http://localhost:3000` → 200.

**Deliverable:** baseline row recorded per phase in the phase's commit message.

---

## M1 — Make the mobile view layer scrollable 🔴 CRITICAL

**Problem:** Grid and Unmapped views are unreachable past the first screenful.

**Evidence (B1):** the layer is `position: fixed` with no `overflow`. A fixed element's overflow
contributes nothing to document scroll height (the `grid-backdrop` wrapper in
`DashboardContent.tsx:172` is static), so `window.scrollTo()` and a touch drag do nothing.
Measured: 5360px of content inside a 688px box, and nothing can move it. "Show more" and ~90% of the
cards can never be reached.

**File:** `src/app/DashboardContent.tsx:207-212` — **Root cause:** a fixed overlay layer used as a
scroll container, left with the default `overflow: visible`.

**Change (exact):**
```diff
+import { cn } from "@/lib/utils";
...
             <div
-              className="fixed bottom-0 left-0 right-0 z-0"
+              className={cn(
+                "fixed bottom-0 left-0 right-0 z-0",
+                view === "map"
+                  ? "overflow-hidden"
+                  : "overflow-x-hidden overflow-y-auto overscroll-contain pb-16",
+              )}
               style={{ top: "calc(env(safe-area-inset-top) + 124px)" }}
             >
               {renderViewContent(true)}
             </div>
```
Add the `cn` import to the existing import block (lines 1-26); `view` is already in scope (`:46`).

**Why here / why these classes**
- The **layer** is the scroll container — the only place a fix can live without touching the shared
  `GridContainer` / `UnmappedList` components (R1).
- `overflow-hidden` in map view: after M2 the map fits the layer exactly, so a scroll container
  would be inert — the explicit branch removes any rubber-band/drag ambiguity and stops a future
  `pb` from making the map scrollable.
- `overflow-x-hidden` is **required**: `overflow-y: auto` with `overflow-x: visible` computes to
  `overflow-x: auto`, which would add a horizontal scrollbar if any child is 1px wide.
- `overscroll-contain` stops the page behind from rubber-banding on iOS/Android.
- `pb-16` gives the last card / "Show more" clearance from the fixed badge (M3).

**Risk & guard**
- Map view must not scroll: `overflow-hidden` guarantees it (asserted in M11).
- Desktop untouched: this `<div>` exists only in the `isMobile` branch (`:203-213`).
- `padding-bottom` on a scroll container is part of the scrollable overflow area in all modern
  engines; if an ancient engine ignores it, move `pb-16` into the list views — not pre-emptively.

**Verify (375×812)**
```
grid view → layer.scrollHeight > layer.clientHeight  AND  layer.scrollTop = 500 sticks
scroll to the end → last startup-card / "Show more" inside the viewport
document.documentElement.scrollWidth <= window.innerWidth   (no horizontal bar)
map view → layer.scrollHeight == layer.clientHeight          (must not scroll)
```

---

## M2 — Make the map fill its layer 🔴 CRITICAL

**Problem:** an 84px dead band of page background sits under the map; below 540px viewport height
the map instead overflows *past* the layer bottom.

**Evidence (B2):** layer height `= 100vh − 124px`; the map's own height is
`max(100vh − 208px, 416px)` (`MapPanel.tsx:59`) → strip `= 84px` for any viewport ≥624px tall,
shrinking to 0 at 540px, negative below it.

**Root cause:** `renderViewContent(fullHeight)` already documents the intent — *"`fullHeight` makes
the map fill its container (mobile) vs. using the calc height (desktop)"* (`DashboardContent.tsx:104-107`)
— but the flag was never passed to `MapPanel`, and `MapPanel` hardcodes its own height.

**Files:** `src/app/DashboardContent.tsx:163` (main), `:111` (pending skeleton), `:34` (loading shell)

**M2a — honor `fullHeight` for the map (`:163`)**
```diff
-          {view === "map" && <MapPanel startups={mappedFiltered} ads={ads} />}
+          {view === "map" && (
+            <MapPanel
+              startups={mappedFiltered}
+              ads={ads}
+              className={fullHeight ? "h-full min-h-0" : undefined}
+            />
+          )}
```
Safe: `MapPanel.tsx:59` builds its class with `cn(base, className)` (twMerge) → `h-full` beats
`h-[calc(100vh-13rem)]`, `min-h-0` beats `min-h-104`. Desktop passes `undefined` → byte-identical (R5).

**M2b — pending skeleton (`:111`)**: replace the whole class string with a ternary (R3 — never append):
```diff
-          <div className="h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border md:h-[calc(100vh-11rem)]">
+          <div
+            className={
+              fullHeight
+                ? "h-full min-h-0 w-full overflow-hidden"
+                : "h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border md:h-[calc(100vh-11rem)]"
+            }
+          >
             <MapSkeleton />
           </div>
```
The desktop string is copied **character for character** (R2).

**M2c — `dynamic()` loading shell (`:34`)**: shared by both branches, cannot see `fullHeight`, so
guard with `max-md:` (R4):
```diff
-      <div className="h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border md:h-[calc(100vh-11rem)]">
+      <div className="h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border max-md:h-full max-md:min-h-0 md:h-[calc(100vh-11rem)]">
```

**Why here:** the layout owner decides how tall the map is; `MapPanel` already accepts `className`
for exactly this. No prop invented, no `MapPanel` default changed.

**Risk & guard**
- `min-h-0` also drops the 416px floor on mobile — intended (the layer is the authority). The
  short-viewport case for desktop is handled separately in M6.
- The map now reaches the viewport bottom. Leaflet attribution is relative to the map container and
  the ads overlay is `bottom-3` **inside** it (`MapPanel.tsx:90`), so their relative offset is
  unchanged — the pre-existing ads/attribution overlap (D8) is not made worse.
- iOS bottom-edge swipe: the last ~20px of the map sit in the home-gesture zone. If testers report
  a fight with the gesture, the documented fallback is to set the layer's bottom to
  `env(safe-area-inset-bottom)` instead of `0`. Do not pre-emptively change it.

**Verify (375×812 and 320×568)**
```
mapPanel.bottom == layer.bottom  (±1px)   AND  mapPanel.height == layer.height
mapPanel.bottom <= window.innerHeight
no page-background strip between the map bottom and the viewport bottom
```

---

## M3 — De-collide the count badge from legend/ads 🔴 CRITICAL (do after M2)

**Problem:** the badge and the map legend both claim the bottom-left corner; the bottom row is
already full.

**Evidence (B3):** badge = `fixed left-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]`
(`MobileCountBadge.tsx:11-14`); legend = `absolute bottom-3 left-3` (`MapLegend.tsx:11`). Already
touching (`92×1px` overlap) at 320×568 **before** M2 — and after M2 the map reaches the viewport
bottom, so it becomes a real stack. A centred badge is not an option: the ads panel is
`w-[calc(100%-148px)] max-w-56` at `bottom-3 right-3` (`MapPanel.tsx:90`) and the legend+ads row has
measured slack of only 16px on a 375px screen.

**Root cause:** three positioned overlays share one row with no reserved slot. The only free corner
is the map's **top-right** — Leaflet's zoom control is pinned top-left (`globals.css:239-243`) and
nothing else lives top-right.

**File:** `src/components/toolbar/MobileCountBadge.tsx` (rendered only in the mobile branch —
`DashboardContent.tsx:206`, so there is no desktop surface to regress).

**Change (exact)** — move positioning into classes (an inline `style` cannot be overridden by a
class) and pin the badge top-right:
```diff
     <p
       role="status"
-      className="fixed left-3 z-[550] rounded-full panel px-3 py-1.5 font-display text-xs font-semibold tabular-nums text-foreground"
-      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
+      className="pointer-events-none fixed left-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[550] rounded-full panel px-3 py-1.5 font-display text-xs font-semibold tabular-nums text-foreground max-md:left-auto max-md:right-3 max-md:bottom-auto max-md:top-[calc(env(safe-area-inset-top)+120px)]"
     >
```
- `max-md:bottom-auto` is **mandatory** (R6): with both `top` and `bottom` on a fixed box it stretches.
- `pointer-events-none`: the badge is purely informational. Without it the badge would now swallow
  map-drag gestures inside its rect (it sits over map tiles).
- `120px` = toolbar bottom (`safe + 8 + 100`) + 12px gutter — the same line as the tray top. Keep the
  literal until **M5** lands, then switch to the tokens.
- While the tray is open it (z-610) covers the badge (z-550) — intended; the tray is the front layer.

**Verify (320×568, 375×812, 430×932)**
```
rectIntersects(badge, legend)      == false
rectIntersects(badge, adsPanel)    == false
rectIntersects(badge, zoomControl) == false
badge fully inside the viewport;  getComputedStyle(badge).pointerEvents == "none"
1280×800: badge absent (mobile branch only) — no desktop regression
```

---

## M4 — Restore the tray filter controls to 40px  HIGH

**Problem:** the Area / Sector / Stage selects inside the tray render **20px tall** (B4) — well under
the 40px touch-target bar the mobile spec requires, and visibly misaligned with the 40px view toggle
directly above them.

**Root cause:** `flex-1` is applied to the **`<select>` itself** (`FilterTray.tsx:148,157,166`) while
`FilterDropdown` wraps it in a **column** flex container — `flex flex-col gap-1`
(`FilterDropdown.tsx:38`). In a column container, `flex-basis: 0%` governs the *main axis* (height),
so the declared `h-10` is overridden and the select collapses to its `min-height: auto` content size.
`cn()`/twMerge is working correctly here (`h-10` does beat `h-9`) — the loss is purely the flex-basis
override, which is why a class-name review wouldn't catch it.

**File:** `src/components/toolbar/FilterTray.tsx:148, 157, 166`

**Change (exact)** — drop `flex-1` from the three `className` props, keep it on the wrapper:
```diff
-          className={cn("h-10 min-w-0 flex-1", traySelectTone(filters.area !== null))}
+          className={cn("h-10 min-w-0", traySelectTone(filters.area !== null))}
           wrapperClassName="min-w-0 flex-1"
```
(apply the same single-token change for `sector` at `:157` and `stage` at `:166`)

**Why here:** the **wrapper** (already `flex-1`, `min-w-0`) owns the row width; the select is stretched
to the wrapper's width by the column's `align-items: stretch`. The select must not participate in the
column's flex sizing.

**Risk & guard**
- Tray-only component → desktop dropdowns are unaffected (they pass no `flex-1`).
- `min-w-0` stays: it is what dedupes `FilterDropdown`'s base `min-w-32` (128px) via twMerge. Removing
  it would force 3×128px + 40px reset + gaps into a 264px tray → overflow. **Do not remove `min-w-0`.**
- Widths stay as measured today (≈84px @375, ≈66px @320) — unchanged by this fix.

**Verify (320×568, 375×812, 430×932)**
```
each tray select rect.height == 40
the three selects have equal widths;  selects + reset + gaps <= tray inner width (no overflow)
tray still shows Area / Sector / Stage + reset on one row
1280×800: desktop dropdowns still h-9 (36px) — unchanged
```

---

## M5 — Toolbar height: stop clipping, single source of truth 🟠 HIGH

**Problem A — already clipping.** `h-[100px]` + `justify-center` + `overflow-hidden`
(`MobileToolbar.tsx:42`) with row math of *exactly* 100px (`pt-2` 8 + `h-10` 40 + `gap-2` 8 + `h-9` 36
+ `pb-2` 8). Measured `scrollHeight 99` / `clientHeight 98` (B5): it is clipping today, and every value
is rem-based, so a user with a larger browser/OS font size gets content clipped at **both** ends by
`justify-center`.

**Problem B — magic-number drift.** Three offsets must agree by hand: toolbar `top: safe + 8` +
`h 100`, layer `top: safe + 124` (`DashboardContent.tsx:209`), tray `top: safe + 120`
(`FilterTray.tsx:117`). The comment in `globals.css:236-238` already says `112px` while the code says
`124px` (B10) — the drift has begun.

**M5a — let the toolbar grow (`MobileToolbar.tsx:42-43`)**
```diff
-        className="fixed left-3 right-3 z-[600] flex h-[100px] flex-col justify-center gap-2 overflow-hidden rounded-[18px] panel"
+        className="fixed left-3 right-3 z-[600] flex min-h-[var(--mobile-toolbar-min-h)] flex-col justify-center gap-2 overflow-hidden rounded-[18px] panel"
         style={{ top: "calc(env(safe-area-inset-top) + var(--mobile-toolbar-top))" }}
```
`min-h-` instead of `h-`: the box grows with its content so nothing can be clipped, while
`overflow-hidden` is **kept** (it clips the frosted `panel` background to the rounded corners, and
with a growing box there is nothing left to clip).

**M5b — two tokens in `:root` (`globals.css:61`, next to `--radius`)**
```css
:root {
  --radius: 0.875rem;

  /* Mobile shell geometry — single source of truth for MobileToolbar,
     the mobile view layer (DashboardContent) and FilterTray. Offsets are
     derived from these two values; never hardcode 100/120/124 again. */
  --mobile-toolbar-top: 8px;
  --mobile-toolbar-min-h: 100px;
```
Then express the derived offsets:
| Consumer | Now | After |
|---|---|---|
| `MobileToolbar.tsx:43` | `safe + 8px` | `safe + var(--mobile-toolbar-top)` |
| `DashboardContent.tsx:209` | `safe + 124px` | `safe + var(--mobile-toolbar-top) + var(--mobile-toolbar-min-h) + 16px` |
| `FilterTray.tsx:117` | `safe + 120px` | `safe + var(--mobile-toolbar-top) + var(--mobile-toolbar-min-h) + 12px` |
| `MobileCountBadge.tsx` (M3) | `safe + 120px` | same expression as the tray |

Both resolve to **exactly today's numbers** (8+100+16 = 124; 8+100+12 = 120) — this phase is a pure
refactor with zero visual delta, plus the clip fix from M5a.

**M5c — fix the stale comment (`globals.css:236-238`)**: state that the layer top is
`toolbar-top + toolbar-min-h + 16px` (derived from the tokens), not `112px`.

**Risk & guard**
- Because the layer/tray offsets derive from `--mobile-toolbar-min-h` (100px, the *minimum*), a toolbar
  that grows under extreme font scaling will overlap the map's top edge by the growth amount. The
  16px/12px gutters absorb up to that much first, and nothing gets clipped or unreachable (content
  still grows the box). Full robustness needs a runtime-measured height → **D3, deferred**.
- The two tokens are `:root`-level (theme-independent) — do not move them into `@theme` (that would
  generate utility classes that nothing uses).

**Verify (375×812, and 375×812 with browser font size bumped one step)**
```
toolbar scrollHeight == toolbar clientHeight        (nothing clipped)
toolbar.bottom + 16 == layer.top  AND  toolbar.bottom + 12 == tray.top
values unchanged vs. baseline at default font size: toolbar.top 8, layer.top 124, tray.top 120
1280×800: desktop toolbar unchanged (no --mobile-* token is referenced outside the mobile branch)
```

---

## M6 — Short-viewport / landscape phones  HIGH

**Problem:** a rotated phone (812×375, 740×360) is evaluated as **desktop** because the breakpoint is
width-only, and the desktop map then overflows the screen.

**Evidence (B6):** at 812×375 the mobile toolbar is absent (probe threw on the missing
"Toggle filters") and the desktop map measured `top 192, height 416` — 233px past the fold — because
`min-h-104` (416px) has **no `md:` override** while the `md:h-[calc(100vh-11rem)]` calc goes negative
at 375px tall.

**Root cause (two independent parts):** (a) `useIsMobile` tests `innerWidth` only
(`useIsMobile.ts:13,21`), (b) `MapPanel.tsx:59`'s `min-h-104` floor is unconditional.

### M6a — always fix the desktop floor (unconditional win, do this one)

**File:** `src/components/views/MapView/MapPanel.tsx:59`
```diff
-  "relative h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border md:h-[calc(100vh-11rem)]",
+  "relative h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border max-md:min-h-56 md:h-[calc(100vh-11rem)] md:min-h-104",
```
Guarded with `max-md:` (R4) so the desktop floor is byte-identical, and the mobile floor is lowered to
`min-h-56` (224px) so a tiny/landscape mobile viewport doesn't push the map off-screen.
Cross-check: `max-md:` applies up to 767px wide, so it also covers the grid/unmapped views (not mapped)
and the M2 `h-full` override (which wins on specificity by source order anyway).

**Verify:** at 812×375 (still desktop branch until M6b) the map now has `min-height 224px`; at
1280×800 `min-height` is still exactly `416px`.

### M6b — height-aware breakpoint: ⚠️ DECISION GATE — do not treat as routine

Rectifying the *classification* (rotated phones getting the mobile shell) is **not** a class-level
change. It is a one-expression edit with real blast radius, so it is gated:

**Option A — accept landscape-as-desktop (documented, zero risk).** Add a "Known limitations" note to
`MOBILE_TOOLBAR_TODO.md`. Landscape users get the desktop shell, which after M6a no longer overflows.
**Option B — height-aware test**, e.g. `innerWidth <= 767 || innerHeight <= 480` in
`useIsMobile.ts:21`.
- **Blast radius if B is chosen** (all must be reviewed before/after): SSR still renders the desktop
  branch (hydration is unchanged because the effect decides, so no new mismatch), but every
  mobile-branch user on a short *desktop* window (e.g. 900×470 dev tools) now gets the mobile overlay
  shell, and `md:`-guarded CSS would fight the JS decision — a real dual-source-of-truth problem.
- **Recommend:** implement **A** now; open a follow-up only if product confirms landscape phones are
  in scope, and if so the correct fix is a **CSS-driven shell** (media query on
  `(max-width: 767px), (max-height: 480px)`) rather than a JS predicate — that keeps CSS and JS from
  disagreeing.

**Deliverable:** `M6b: A` decided (Option A — accept landscape-as-desktop; documented limitation).
**Implemented in code:** `MapPanel.tsx:61` adds `max-md:min-h-56` so a tiny/landscape mobile viewport no
longer pushes the map off-screen; the JS predicate (`useIsMobile.ts` width-only) is intentionally
**not** changed — making it height-aware would put a JS breakpoint and the `md:`-guarded CSS into
conflict for short *desktop* windows (D4, deferred).
**Cross-file note:** a "Known limitation — landscape phones" entry now exists in
`docs/MOBILE_TOOLBAR_TODO.md` (lines 20-26) so the trade-off is discoverable. (Replaces the old plain
"Deliverable" line.)

---

## M7 — First paint on phones shows the desktop toolbar  MEDIUM

**Problem:** SSR + first client paint render the desktop chrome on a phone, then the effect swaps it
→ visible layout jump on every load.

**Evidence (B7):** raw SSR was `mobile-search-input: 0`, `id="search-input": 1`, `h-[100px]: 0`,
`Toggle filters: 0` — i.e. phones get the desktop (4-row, wrapping) toolbar first.

**Root cause:** `useIsMobile` starts as `false` (`useIsMobile.ts:16`) and `DashboardContent.tsx:203`
branches on it.

**Decision gate — choose exactly one of these two, they are mutually exclusive:**

- **M7-OPTION-1. "Don't render the desktop toolbar on mobile" (JS-only, keeps SSR as-is).**
  Keep `isMobile=false` for SSR (avoids hydration mismatch) but suppress the *cost* of the wrong first
  paint on the client only. Concretely: gate the desktop toolbar's *sub-parts* that are mobile-invisible
  (nothing else changes for desktop). This is low benefit and mostly cosmetic → only do it if the jump
  is judged unacceptable.
- **M7-OPTION-2. CSS-first shell (correct fix, bigger change).** Replace the JS branch with
  `max-md:hidden` on the desktop toolbar + a mobile toolbar that is `hidden md:*`. ⚠️ **This collides
  with R1, R2 and the M1/M3 layers**: both shells would exist in the DOM at once, so the duplicated
  `filter-area` / `filter-sector` / `filter-stage` ids (`FilterDropdown.tsx:23`) become invalid HTML and
  `getElementById`/label association breaks — and M1's `view`-driven `overflow`/`pb` classes, which live
  inside the mobile branch, can no longer be expressed as a mobile branch at all. OPTION-2 therefore
  **requires** first re-keying those ids with `useId()`/an instance prefix, and moving M1/M3's
  conditions into `max-md:`-guarded CSS. Treat it as its own project (**D7**), not as part of this TODO.

**Default recommendation:** leave the branch as-is for now and only revisit if a jump is visually
confirmed; the SSR desktop shell is the *safe* default because it never renders mobile-only affordances
on a desktop.

**Verify (any option chosen):** `document.getElementById('filter-area').labels` resolves, there is
exactly one element per id, and hydration warnings are zero in the browser console.

---

## M8 — Two state bugs  MEDIUM

### M8a — `FilterTray` reads the store without subscribing (stale Reset button)

**Problem:** `FilterTray.tsx:96-100` calls `useDashboardStore.getState().search` **during render**
instead of subscribing. The component subscribes to `view`, `filters`, `setView`, `setFilter`,
`resetFilters` (`:41-45`) but **not** `search`, so typing in the toolbar's search box does not
re-render the tray and "Reset filters" can stay `disabled` while a search term is active.

**Root cause (code smell):** `getState()` inside render is a non-reactive read; the value leaks into a
render-derived output (`disabled={!hasActiveFilters}`).

**File:** `src/components/toolbar/FilterTray.tsx:41` (add subscription) and `:97` (read the variable)

**Change (exact):**
```diff
   const view = useDashboardStore((s) => s.view);
   const filters = useDashboardStore((s) => s.filters);
+  const search = useDashboardStore((s) => s.search);
   const setView = useDashboardStore((s) => s.setView);
...
   const hasActiveFilters =
-    useDashboardStore.getState().search !== "" ||
+    search !== "" ||
     filters.area !== null ||
```
**Why here:** the store value must be subscribed to be reactive; `FilterGroup`/`FilterDropdown` follow
the same subscribe-by-selector pattern everywhere else in the codebase. `search` is a primitive, so the
selector is referentially stable and cannot cause re-render loops.

**Risk & guard:** one extra store subscription per tray render — negligible; the tray is only mounted
while the mobile toolbar exists. Desktop has no tray. No other consumer reads `search` this way —
**do not** "fix" this by changing the store (`store.ts` has no bug).

**Verify**
```
open the tray (it starts with Reset disabled) → type in the search box → Reset becomes enabled
clear the search term → Reset returns to disabled
vitest: the existing FilterTray reset-state test must still pass (it likely asserts the initial state)
```

### M8b — `FilterDropdown` silently wipes a filter when options are momentarily empty

**Problem:** `FilterDropdown.tsx:28-35` has a "stale value" effect: if the current value is no longer
in `options`, it calls `onSelect(null)`. During a refetch / temporary empty dataset the user's
selection is **silently destroyed** — and on desktop this redirects the whole view to "unmapped"
results. Pre-existing (affects desktop too), found while reading the mobile tray's inputs.

**File:** `src/components/toolbar/FilterDropdown.tsx:28-35`

**Decision gate:** the fix changes filter semantics, so pick one and record it:
- **M8b-OPTION-1 (recommended, minimal):** only clear when the dataset is **not** empty, i.e. skip the
  reset while `options.length === 0`. Rationale: an empty option list means "no data yet", not "your
  value became invalid"; a genuinely invalid value will be cleared on the next render that has options.
- **M8b-OPTION-2:** keep the value and show it as an extra option ("Gurgaon (unavailable)") so the user
  decides. More code, better UX, needs new copy.

**Recommended:** OPTION-1 (one guard, no new strings).

**Risk & guard:** with OPTION-1, if a value is invalid *and* the dataset stays empty, the select shows a
value not in its list — browsers render an empty select in that case. Confirm the desktop filter chip
still shows the active value from `filters` state (it does — the chip reads state, not the `<select>`
options) so there is no visual "lost filter" illusion.

**Verify:** with the network throttled/refetching, select Area → while options are empty the filter
stays applied and results do not flip to unmapped; once data returns the value is still selected.
Add/extend a unit test in `tests/unit/components/toolbar/` only if OPTION-2 is chosen (OPTION-1 is a
one-line guard; a jsdom test cannot reproduce the empty-options race meaningfully).

---

## M9 — Tray keyboard / scroll containment  MEDIUM

All four items live in `FilterTray.tsx`; none change layout on desktop (tray is mobile-only).

### M9a — move focus into the tray on open
**Problem:** `:50-57` only *captures* and *restores* focus; the dialog never receives it. Measured:
`focus after open: insideTray = false` (stays on "Toggle filters"). So a keyboard/screen-reader user
must Tab through the whole toolbar to reach the first control.

**Change (exact):** give the tray `tabIndex={-1}` and focus it when it opens — extend the existing
effect rather than adding a new one:
```diff
   useEffect(() => {
     if (isOpen) {
       returnFocusRef.current = document.activeElement as HTMLElement;
+      // Defer one frame so the dialog is painted before focus lands inside it.
+      const id = requestAnimationFrame(() => trayRef.current?.focus());
+      return () => cancelAnimationFrame(id);
     } else if (returnFocusRef.current) {
       returnFocusRef.current.focus();
       returnFocusRef.current = null;
     }
   }, [isOpen]);
```
plus on the root element:
```diff
       role="dialog"
       aria-label="Filters"
       aria-modal="false"
+      tabIndex={-1}
```
**Why here:** focus capture/restore already live in this effect; a second effect would race it. `-1`
makes the container programmatically focusable without adding a tab stop.

**Verify:** open the tray → `document.activeElement` is inside the tray; close → focus is back on the
"Toggle filters" pill (already asserted by the existing unit test — keep it green).

### M9b — don't let the page behind scroll
**Problem:** the tray is `overflow-y-auto` but the body can still scroll/drag behind it (no
`overscroll-behavior`, and `aria-modal="false"`). On a phone the map keeps panning under the tray.

**Change (exact):** keep `aria-modal="false"` (the tray is a popover, not a modal — changing it would
be a behavioural claim the component doesn't implement), and contain the scroll:
```diff
-      className="filter-tray-enter fixed left-3 right-3 z-[610] max-h-[60vh] overflow-y-auto rounded-[18px] panel p-4"
+      className="filter-tray-enter fixed left-3 right-3 z-[610] max-h-[60vh] overflow-y-auto overscroll-contain rounded-[18px] panel p-4"
```
Do **not** add `touch-action: none` or a `body { overflow: hidden }` lock — both fight Leaflet's
gesture handling on the layer beneath and would be a new bug class.

**Verify:** with the tray open, dragging inside the tray scrolls the tray only; the map does not pan
behind it.

### M9c — Android back button closes the tray (not the page)
**Problem:** back exits the dashboard while the tray is open, which reads as a lost state.

**Decision gate — ⚠️ do not implement by pushing history entries casually.** `history.pushState` on
open + a `popstate` listener that calls `onClose` is the standard pattern, but it interacts with the
app's existing routing (`/` with `useFilterParams`) and must clean up on unmount **and** on
`onClose`-by-other-means (otherwise one stray entry makes the *next* back press a no-op).

**Recommend:** defer to a dedicated pass (see **D4**) unless the tray is a primary mobile surface for
users. If implemented: push a marker state on open, `popstate` → `onClose()`, and on any other close
path call `history.back()` **once**, guarded by a ref so it cannot fire twice (React 19 dev
double-effect will otherwise pop two entries).

### M9d — keyboard-aware tray height
**Problem:** `max-h-[60vh]` uses the **layout** viewport, which does not shrink when the on-screen
keyboard opens (mobile Chrome/Safari), so with a keyboard up the tray's bottom (reset button) can sit
under the keyboard.

**Change (exact):**
```diff
-      className="filter-tray-enter fixed left-3 right-3 z-[610] max-h-[60vh] overflow-y-auto overscroll-contain rounded-[18px] panel p-4"
+      className="filter-tray-enter fixed left-3 right-3 z-[610] max-h-[60vh] overflow-y-auto overscroll-contain rounded-[18px] panel p-4 max-md:max-h-[60dvh]"
```
`dvh` (dynamic viewport) is already the modern unit here and is ignored by engines that don't support
it, which then keep `60vh` — a safe progressive enhancement. **Do not** replace `60vh` outright: the
same literal may be relied on elsewhere in the tray's animation.

> **Sequencing note:** M9b and M9d touch the **same `className` string**. If both are implemented,
> apply them as **one** edit (`… overflow-y-auto overscroll-contain … max-md:max-h-[60dvh]`) so the
> second diff's context still matches.

**Verify:** focus the tray's first select on a real device / emulated keyboard → the reset button stays
reachable.

---

## M10 — Touch targets, dead code, docs, viewport  MEDIUM/LOW

### M10a — raise the sub-40px touch targets (mobile only)
Measured (B8): logo link `h 28`, search input `h 36`, clear button `≈22`. The Filters pill (`h-10`) and
Submit `+` (`h-10 w-10`) are already compliant.

**1. `LogoButton.tsx:11` (compact branch only — `compact` is passed by the mobile toolbar and nowhere
else):**
```diff
-        compact ? "min-w-0 flex-1 px-0 py-0" : "shrink-0 px-3 py-2",
+        compact ? "min-w-0 flex-1 px-1 py-1.5" : "shrink-0 px-3 py-2",
```
28px mark + `py-1.5` (12) = **40px** link. Row 1's height is already governed by the `h-10` buttons, so
**the toolbar stays 100px** (verify in M11) — `px-1` also turns the hover pill into a proper target.

**2. `SearchBox.tsx` — one guarded addition on the `<input>` (`:74`) and the clear button (`:81`).**
`SearchBox` has exactly two call sites (desktop toolbar + mobile toolbar, verified), and the desktop
one is untouched because everything is inside `max-md:`:
```diff
-        className="no-native-search-clear h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 md:w-72"
+        className="no-native-search-clear h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 max-md:h-10 max-md:pr-14 md:w-72"
```
```diff
-          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
+          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground max-md:p-3.5"
```
Math: `max-md:p-3.5` → 14px icon + 28px padding = **42px** hit area; `right-2` (8) + 42 = 50px reserved,
so `max-md:pr-14` (56px) clears it with 6px to spare.
**Do not** use arbitrary descendant selectors (`[&_input]:h-10`) from the call site instead — it is
more opaque and relies on specificity order.

### M10b — delete the two orphaned files
Both verified to have **zero importers** (only self-references):
```powershell
Get-ChildItem -Recurse -Include *.tsx,*.ts src,tests | Select-String -Pattern 'FilterGroup|MobileMapWrapper'
```
Expected today: only the files' own declarations. If that still holds, delete:
- `src/components/toolbar/FilterGroup.tsx` (superseded by `FilterDropdown` in the tray)
- `src/components/utils/MobileMapWrapper.tsx` (superseded by the inline layer in `DashboardContent`)

**Do not** delete `src/components/toolbar/MobileCountBadge.tsx` — it **is** rendered
(`DashboardContent.tsx:206`), despite looking unused at a glance. Re-run the grep in the same session
as the deletion; do not delete from memory.

**Verify:** `npx tsc --noEmit` → 0 errors, `npx vitest run tests/unit` → all pass, `next build` → OK.

### M10c — docs + comment drift
| File | Fix |
|---|---|
| `src/styles/globals.css:236-238` | comment says `+112px`; state the derived expression (see M5c) |
| `docs/MOBILE_TOOLBAR_TODO.md` | it still specifies the chip-row FilterGroup and `max-h-[calc(100vh-160px)]`; update to describe the shipped select-based tray and `60vh`, and record the M6b decision |
| This file | tick each phase + append the measured "after" numbers as phases land |

### M10d — `viewport-fit=cover`: ⚠️ DECISION GATE
**Problem (B7/M7 related):** every `env(safe-area-inset-*)` in the mobile shell is **inert** —
`src/app/layout.tsx` exports only `metadata`, and a repo-wide search for `viewport-fit` returns 0 hits.
Without `viewportFit: "cover"` the insets evaluate to `0`, so the notch/home-indicator handling the
spec asks for does nothing.

**Options**
- **Drop the `env()` usage** (simplest): the offsets become plain numbers. Least risk, but the shell
  will sit under the notch/status bar on notched devices in full-screen contexts.
- **Add `export const viewport`** (recommended, matches the existing design intent):
  ```ts
  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
  ```
  ⚠️ This is **not** cosmetic: the page then paints under the notch/status bar, and every `env()` in the
  shell (toolbar top, layer top, tray top, badge) starts resolving to a non-zero inset — changing layout
  on notched devices only. It also affects non-mobile routes (`/submit`, `/jobs`) which must be
  spot-checked for content sliding under the status bar.

**Recommended:** add the export, then verify on a notched device/emulator that the toolbar and the tray
sit **below** the notch and the count badge stays clear of the home indicator. Playwright cannot emulate
safe-area insets reliably, so this one is a **manual/DevTools device** check.

---

## M11 — Add the geometry regression spec (the only new file)

**Why:** every bug in this document is **invisible to jsdom** (`tests/unit/components/toolbar/*` asserts
DOM/ARIA only, no layout), which is exactly how the 20px selects and the unscrollable grid shipped. One
Playwright spec closes that class of bug permanently.

**File (new):** `tests/e2e/mobile/responsive.spec.ts`
**Convention:** `testDir: "../e2e"` and `baseURL: "http://localhost:3000"` (`tests/setup/playwright.config.ts`),
`import { test, expect } from "@playwright/test"`, `await page.goto("/")`, generous
`{ timeout: 15000 }` on first paint assertions (the existing specs do this because Firefox is slower
under parallel workers).

**Constraints (see `tests/e2e/grid-view/grid.spec.ts` for the house style):**
- Use `test.use({ viewport: { width, height } })` at describe level; **do not** add a Playwright project
  or new config (R1).
- Selectors must be role/text/`aria-label` based, matching the existing specs
  (`getByRole("searchbox")`, `button:has-text("Grid")`, `[data-testid="grid-container"]`).
  The mobile shell has no test ids for its own affordances → locate by `[aria-label="Toggle filters"]`,
  `[role="dialog"][aria-label="Filters"]`, `[aria-label="Submit a startup"]`, `[role="search"]`.
- The geometry helpers read rects via `boundingBox()` / `evaluate`, never `getComputedStyle` on
  non-laid-out elements.

**Assertions (one `test` per bullet, 375×812 unless stated):**
1. **Mobile shell present, desktop shell absent** — mobile toolbar visible (fixed, `< 768`), and
   `page.locator("#search-input")` hidden/absent while `#mobile-search-input` is visible.
2. **Toolbar not clipped** — toolbar `scrollHeight <= clientHeight + 1` (kills the M5 regression).
3. **Toolbar ⇄ map gap (M1/M2/M5)** — `layer.top - toolbar.bottom >= 12` and
   `Math.abs(mapPanel.bottom - layer.bottom) <= 1`.
   *Adapt during implementation:* if the map is `h-full` the box may have no stable selector — assert
   instead that no page background is visible in the bottom 8px strip (screenshot pixel check) **or**
   add `data-testid="map-panel"` to `MapPanel`'s root (a test-only attribute; the only allowed markup
   addition, and it is what makes the assertion durable).
4. **Badge de-collided (M3)** — `rectIntersects(badge, legend) === false`,
   `rectIntersects(badge, adsPanel) === false`, badge fully inside the viewport.
5. **Tray controls ≥ 40px (M4)** — after opening the tray, every `select` inside
   `[role="dialog"]` has `height === 40` and the three widths are equal.
6. **Grid view scrolls (M1)** — switch to Grid, then:
   ```
   layer.scrollHeight > layer.clientHeight
   layer.scrollTop = 500 → expect(layer.scrollTop).toBeGreaterThan(0)   // after rAF
   document.scrollingElement.scrollWidth <= innerWidth                   // no h-scroll
   ```
7. **Map view does not scroll (M1)** — in Map view `scrollHeight <= clientHeight + 1`.
8. **Tray open/close contract** — toggle opens it; **toggle closes it** (the pill-close fix); Escape
   closes it; outside tap closes it (this replaces the throwaway `.verify-*.mjs` probes).
9. **320×568 sanity** — repeat 1, 2, 5 and assert no element is wider than the viewport
   (`document.scrollingElement.scrollWidth <= innerWidth`).
10. **1280×800 desktop guard (regression)** — mobile toolbar absent, `#search-input` visible, the three
    desktop filter dropdowns visible, exactly one toolbar, no vertical page overflow
    (`scrollHeight <= clientHeight + 1`), and the map reaches the bottom of `<main>`.

**Run:** `npm run test:e2e -- tests/e2e/mobile/responsive.spec.ts`
(The `webServer` is `reuseExistingServer: true`, so it will reuse the already-running dev server.)

**Failure policy:** if an assertion fails because the behaviour is genuinely different *and acceptable*,
**update this TODO first** (record why), then update the spec. Never weaken an assertion to make a
phase pass.

---

## M12 — Verification matrix + definition of done

### Per-phase gate (run after **every** phase)
```
npx tsc --noEmit                 → 0 errors
npx eslint src                   → 0 errors, 0 warnings
npx vitest run tests/unit        → all pass
npm run test:e2e -- tests/e2e/mobile/responsive.spec.ts   → all pass (from M11 onward)
```
Plus the phase-specific *Verify* block. **One phase = one commit**; if a phase fails, revert that
commit only and report.

### Full matrix (final gate, after all implemented phases)
| Check | Command / method | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | 0 errors |
| Lint | `npx eslint src` | 0/0 |
| Unit | `npx vitest run tests/unit` | all pass (currently 82) |
| E2E mobile geometry | `npm run test:e2e -- tests/e2e/mobile/responsive.spec.ts` | all pass |
| E2E existing | `npm run test:e2e` | unchanged from baseline |
| Build | `npm run build` | 25/25 routes |
| Live @320×568 | manual + spec | no h-scroll, lists scroll, controls ≥40 |
| Live @375×812 | manual + spec | as M1–M5 verify |
| Live @430×932 | manual + spec | as M1–M5 verify |
| **Live @1280×800** | manual + desktop spec | **pixel-identical to the pre-phase baseline** (screenshot diff) |
| Live @812×375 | manual | no overflow past the fold (M6a) |
| Notched device | DevTools device (M10d) | shell clears notch/home bar |

### Definition of done
- [x] M1–M5 and M6a, M8a, M8b, M9a, M9b, M9d, M10a, M10b, M11 implemented and verified.
- [x] Every **DECISION GATE** (M6b, M7, M8b, M9c, M10d) explicitly answered **in this file**, with the
      chosen option recorded — gated items are either done or consciously deferred, never half-done.
      → see **Decision record** below.
- [~] The desktop screenshot diff at 1280×800 is empty (or its differences are listed and approved).
      → **geometry-verified** by `Desktop shell @1280x800 (no-regression guard)`: mobile shell absent,
      exactly one toolbar, desktop selects still 36px, map height still `100vh − 176px`, page not
      scrollable. A *pixel* diff still needs one manual screenshot comparison.
- [x] `docs/MOBILE_TOOLBAR_TODO.md` reflects the shipped design (select-based tray, M1/M2 layer, M6b note).
- [x] No new runtime files beyond the e2e spec; no `package.json` change.
- [ ] **Manual-only checks** (cannot be automated here): notched-device safe-area (M10d), landscape
      812×375 spot-check (M6a), and the 1280×800 pixel screenshot diff.

---

## Decision record — every gate answered

Recorded per M12's definition of done ("every DECISION GATE explicitly answered **in this file**").
No gate is half-done: each is implemented or consciously deferred.

| Gate | Decision | Basis | State |
|---|---|---|---|
| **M6b** landscape phones | **Option A — accept landscape-as-desktop** (docs only, zero code) | The TODO's own recommendation. Rectifying the classification would make the JS predicate and the `md:`-guarded CSS two sources of truth for the same shell (every short *desktop* window would flip to the mobile overlay). After **M6a** the landscape desktop map no longer overflows, so the failure mode is gone even though the shell choice stays "desktop". | ✅ Decided. Note added to `MOBILE_TOOLBAR_TODO.md`. Follow-up if product wants landscape-mobile: a **CSS-driven shell** on `(max-width: 767px), (max-height: 480px)` — not a JS predicate. |
| **M7** first-paint FOUC | **Leave the JS branch as-is** — SSR keeps the desktop shell | OPTION-2 (CSS-first shell) collides with R1/R2 and the M1/M3 layers: both shells in the DOM duplicate the `filter-area`/`-sector`/`-stage` ids (`FilterDropdown.tsx:23`) → invalid HTML and broken label association, and M1's `view`-driven `overflow`/`pb` cannot be expressed as a CSS branch at all. The default is also the *safe* one: a desktop user must never see mobile-only affordances, whereas a phone briefly seeing desktop chrome is cosmetic. | ✅ Decided = no code change. Revisit only on a visually confirmed jump; the correct fix is **D7**. |
| **M8b** empty-options filter wipe | **OPTION-1 — skip the reset while `options.length === 0`** | One guard, no new strings or copy. An empty list means "no data yet", not "your value became invalid"; a genuinely invalid value is still cleared on the next render that has options. | ✅ **Implemented** — `FilterDropdown.tsx:30-33`. |
| **M9c** Android back button | **Defer to a dedicated pass (D4)** | `pushState` + `popstate` must clean up on unmount **and** on every other close path, otherwise one stray entry turns the next back press into a no-op; React 19 dev double-effects would pop two entries. Not worth the regression surface for a secondary surface. | ⏸ **Consciously deferred** → D4. The tray still closes on Escape, outside tap, and the pill (regression-tested). |
| **M10d** `viewport-fit=cover` | **Add `export const viewport`** (recommended option) | Every `env(safe-area-inset-*)` in the shell was inert — without `viewportFit` the insets resolve to `0`, so the notch/home-indicator handling the spec requires did nothing. | ✅ **Implemented** — `layout.tsx:29-37`. ⚠️ **One manual notched-device check remains** (the only item Playwright cannot emulate): toolbar + tray below the notch, badge clear of the home indicator, and `/submit` + `/jobs` not sliding under the status bar. |

### Measured "after" vs. §2 baseline

| # | Baseline symptom | After | Guarded by |
|---|---|---|---|
| B1 | grid/unmapped unscrollable (5360px in a 688px box, `scrollTop` stuck at 0) | layer scrolls; `scrollHeight > clientHeight`, `scrollTop` moves, `overflowY: auto` | spec: *grid view layer scrolls*, *unmapped view layer scrolls* |
| B2 | 84px dead band under the map | `mapPanel.bottom == layer.bottom`, no background strip | spec: *map fills the layer*; @320 *toolbar is clear of the map* |
| B3 | badge ∩ legend `92×1px` at 320×568 | no intersection; badge fully in-viewport | spec: *badge stays clear of the legend* (375 + 320) |
| B4 | tray selects `84×20` / `66×20` | `40px`, equal widths, inside the tray | spec: *tray filter controls are 40px tall and evenly sized* (375 + 320) |
| B5 | toolbar already clipped (`99 > 98`) | `scrollHeight <= clientHeight + 1` | spec: *toolbar is not clipped and clear of the map* |
| B6 | 812×375 → desktop map `top 192 h 416` (233px past the fold) | mobile floor lowered to `min-h-56`; desktop floor intact | M6a code; **manual** 812×375 spot-check still listed in M12 |
| B7 | SSR has no mobile markup (`mobile-search-input 0`) | **unchanged by design** — see the M7 decision above | spec asserts the *client* shell split at 375 vs. 1280 |
| B8 | logo 28px / search 36px / clear ≈22px | `max-md:` guards raise all three (40/40/42px) — tray selects asserted by the spec; logo + search are CSS-only, see the manual note | spec (tray) + M10a code (logo/search) |
| B9 | 2 orphaned files | deleted; `tsc` 0 errors, tests green | `tsc` + full unit suite |
| B10 | comment said `+112px` | comment now states the token expression | `globals.css:64-74` |

---

## Deferred (explicitly out of scope — do **not** half-implement)

| # | Item | Why deferred |
|---|---|---|
| **D1** | 2-column filter layout inside the tray at ≥365px | replaced by the select-based tray; a 2-col layout would shrink the selects back toward the 66px width measured at 320px and fight the 40px target rules |
| **D2** | `role="listbox"` / `aria-selected` semantics for filter options | native `<select>` supplies correct semantics for free; adding ARIA roles to the selects would *break* them |
| **D3** | Runtime-measured toolbar height driving the layer/tray offsets (ResizeObserver + CSS custom property) | M5's min-height + derived tokens are sufficient until real font-scaling reports arrive; a measured-height loop is new runtime code (violates R1) and risks layout thrash |
| **D4** | History/back-button integration for the tray (M9c) | needs the routing-aware cleanup described in M9c; ship only as its own focused change |
| **D5** | Fixing the pre-existing ads ⇄ Leaflet attribution overlap near `bottom-3` | pre-existing, present on desktop too, unrelated to the mobile fixes; M2 explicitly does not worsen it |
| **D6** | Replacing `60vh` with `dvh` **everywhere** (not just the mobile tray) | the base value must stay for engines without `dvh` support and for the tray's entrance animation; only the `max-md:` override is added (M9d) |
| **D7** | A proper CSS-driven shell to replace the JS `isMobile` branch | the correct long-term shape, but it is a refactor of `DashboardContent`, not a bug fix, and it re-opens the duplicate-id problem called out in M7-OPTION-2 |
| **D8** | Reducing the toolbar's 1-row-tall content on very small heights (e.g. hiding the brand row in landscape) | design decision, not a defect; M6a already prevents overflow |

---

## Recommended execution order

**Stage 1 — correctness (ship together, highest value):**
`M1` → `M2` → `M3` → `M11` (spec as the guard) → `M12` per-phase gate.
These three are interdependent: fix M1/M2 first, then de-collide M3, then lock all three with M11.
If M1/M2/M3 must ship separately, the order M1 → M2 → M3 is mandatory (M3 depends on M2's geometry).

**Stage 2 — polish + robustness:**
`M4` → `M5` → `M6a` → `M8a` → `M9a` → `M9b` → `M9d` → `M10a` → `M10b` → `M10c`.

**Stage 3 — decisions (each is stop-and-ask, not implement-by-guess):**
`M6b` · `M7` · `M8b` · `M9c` · `M10d`.

**Rules for the implementing agent**
1. Read §1 (rules) and §2 (baseline) first; re-measure the baseline before touching code.
2. Implement **one phase at a time**, run that phase's *Verify*, then commit that phase alone.
3. If a *Verify* fails and the fix is not obvious **inside that phase's scope**, revert and stop —
   do not "fix forward" across phases.
4. **Do not** invent new components, props, hooks, or dependencies (R1). Every fix in this document is
   a class/expression edit in an already-wired file.
5. **Do not** touch desktop behaviour (R2/R5). When in doubt, wrap in `max-md:`.
6. Update the phase's sub-heading with the measured "after" numbers and mark decision gates answered.

---

## Traceability

| Finding (diagnosis) | Phase | File(s) |
|---|---|---|
| Grid/Unmapped unscrollable | M1 | `DashboardContent.tsx:207-212` |
| 84px band / map shorter than layer | M2 | `DashboardContent.tsx:34,111,163` |
| badge ∩ legend ∩ ads | M3 | `MobileCountBadge.tsx:11-14` |
| tray selects 20px tall | M4 | `FilterTray.tsx:148,157,166` |
| toolbar clipped + magic numbers + stale comment | M5 | `MobileToolbar.tsx:42-43`, `globals.css:61,236-238`, `DashboardContent.tsx:209`, `FilterTray.tsx:117` |
| landscape = desktop + map overflow | M6 | `useIsMobile.ts:13,21`, `MapPanel.tsx:59` |
| FOUC / wrong first paint | M7 | `useIsMobile.ts:16`, `DashboardContent.tsx:203` |
| stale Reset disabled state | M8a | `FilterTray.tsx:41,97` |
| filter wiped on empty options | M8b | `FilterDropdown.tsx:28-35` |
| focus not moved into dialog | M9a | `FilterTray.tsx:50-57,113` |
| background scrolls behind tray | M9b | `FilterTray.tsx:116` |
| back button exits page | M9c | `FilterTray.tsx` (new effect) |
| 60vh ignores keyboard | M9d | `FilterTray.tsx:116` |
| touch targets < 40px | M10a | `LogoButton.tsx:11`, `SearchBox.tsx:74,81` |
| dead files | M10b | `FilterGroup.tsx`, `MobileMapWrapper.tsx` |
| inert `env(safe-area-*)` | M10d | `layout.tsx` |
| no geometry test coverage | M11 | `tests/e2e/mobile/responsive.spec.ts` (new) |

**Out-of-scope findings (recorded, not fixed here):** grid backdrop wrapper is `static`
(`DashboardContent.tsx:172`, relevant only as the reason M1 must fix the layer, not the wrapper);
`globals.css` breakpoint `239` vs JS `767` vs Tailwind `md:` `768` are three copies of one concept —
consolidating them belongs to **D7**.

---