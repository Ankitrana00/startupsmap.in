# Mobile Toolbar Redesign — TODO

> ## ⚠️ As-built deviations (read before the phases below)
>
> This plan was implemented, then hardened by `docs/MOBILE_RESPONSIVE_TODO.md` (bugs M1–M12).
> The phase text below is the **original plan**; the following is what actually shipped where
> they differ, plus the later layout swap. Treat this list as authoritative.
>
> | Original plan (below) | Shipped |
> |---|---|
> | Toolbar Row 2 = full-width `SearchBox`; view toggle lives in tray (original plan) | **Swapped after ship:** toolbar Row 2 = **`ViewToggle`** (Map/Grid/Unmapped, always reachable); **search moved into the tray top** (`SearchBox#mobile-search-input`, only exists while the tray is open). Any phase/checklist lines below that still describe the old layout are stale � the shipped layout is per this row. |
> | Tray filter groups = chip rows (`FilterGroup`, `role="listbox"`/`aria-selected`, 2-col ≥365px) | Tray reuses the desktop **`FilterDropdown` `<select>`s** in a 3-up row. `FilterGroup.tsx` was deleted (zero importers). |
> | Tray `max-h-[calc(100vh-160px)]` | `max-h-[60vh]` + `max-md:max-h-[60dvh]` (keyboard-aware dynamic viewport) |
> | Tray `top: safe-area + 120px` | Derived from tokens: `safe + var(--mobile-toolbar-top) + var(--mobile-toolbar-min-h) + 12px` (= 120px at default) |
> | Toolbar fixed `h-[100px]` | `min-h-[var(--mobile-toolbar-min-h)]` (106px) — grows instead of clipping; `--mobile-toolbar-min-h`/`-top` in `globals.css` are the single source of truth for toolbar + layer + tray + badge |
> | Count badge `fixed bottom-4 left-4` | Bottom-left **on desktop-width** but **top-right on mobile** (`max-md:right-3 max-md:top-…`) — the map legend owns bottom-left after the map became full-height |
> | Leaflet zoom pushed down via `.leaflet-top.leaflet-left { margin-top: 120px }` | Offset back to `10px`: the map layer now starts **below** the toolbar, so no push is needed |
> | `export const viewport` absent → all `env(safe-area-inset-*)` inert | `layout.tsx` now exports `viewport` with `viewportFit: "cover"` |
> | Unit tests only (jsdom) | Plus `tests/e2e/mobile/responsive.spec.ts` — geometry assertions at 375 / 320 / 1280, run on chromium + firefox + webkit |
>
> **Known limitation — landscape phones (M6b decision: Option A).** A rotated phone (e.g. 812×375) is
> classified as **desktop** because `useIsMobile` tests width only, so it gets the desktop shell.
> This is accepted, not a bug to fix casually: making the predicate height-aware would put the JS
> decision and the `md:`-guarded CSS into conflict (every short *desktop* window would flip to the
> mobile overlay). The overflow that made landscape unusable is fixed (`max-md:min-h-56` on
> `MapPanel`). If landscape-mobile is ever required, implement a **CSS-driven shell**
> (`@media (max-width: 767px), (max-height: 480px)`) rather than a JS predicate.
>
> **Also changed relative to the plan:** `MOBILE_TOOLBAR_TODO` Problem #8 (outside-click must ignore
> the toggle pill) is implemented via an optional `toggleRef` prop on `FilterTray`.

## File inventory

| Action | File | Purpose |
|---|---|---|
| NEW | `src/hooks/useIsMobile.ts` | SSR-safe mobile detection (solves #1) |
| NEW | `src/components/toolbar/MobileToolbar.tsx` | Fixed 2-row overlay (solves #2, #5, #6) |
| NEW | `src/components/toolbar/FilterTray.tsx` | Floating filter overlay (solves #4, #8, #9, #10, #12) |
| NEW | `src/components/toolbar/MobileCountBadge.tsx` | Floating count indicator (solves #11) |
| EDIT | `src/app/DashboardContent.tsx` | Conditional render + data plumbing (solves #3, #10, #13) |
| EDIT | `src/styles/globals.css` | Leaflet control offset + safe-area + reduced-motion (solves #9, #12) |
| NEW | `tests/unit/components/toolbar/MobileToolbar.test.tsx` | Tests |
| NEW | `tests/unit/components/toolbar/FilterTray.test.tsx` | Tests |

---

## Phase 0 — Foundation: SSR-safe breakpoint (solves Problem #1)

**Problem #1 (SSR/hydration mismatch):** Fixed mobile + in-flow desktop can't both render on the server.
**Solution:** Hook defaults to `false` (desktop) on SSR and first paint, swaps in `useEffect`.

- [ ] Create `src/hooks/useIsMobile.ts`
  - [ ] `useState(false)` — desktop is the safe default that matches SSR
  - [ ] In a `useEffect`, read `window.innerWidth <= 767`
  - [ ] Subscribe to a `matchMedia('(max-width: 767px)')` `change` listener; cleanup on unmount
  - [ ] Returns `boolean`. One controlled re-render after mount; no mismatch
- [ ] Verify: `pnpm typecheck` green

---

## Phase 1 — Layout split in DashboardContent (solves Problems #3, #10, #13)

**Problem #3 (tablets):** Mobile overlay applies **only below 768px**. The existing wrapped desktop toolbar (and its `lg:` nowrap at 1024px) is untouched for 768–1023px. Least regressive.

**Problem #13 (no desktop regression):** Every new branch must be gated behind `isMobile`.
**Problem #10 (data reuse):** Pass already-computed `areas`/`sectors`/`stages` (from `uniqueValues`) down; no new data source.

- [ ] In `DashboardContent.tsx`
  - [ ] Add `const isMobile = useIsMobile();` near the top of the component
  - [ ] Compute `areas`, `sectors`, `stages` via `uniqueValues` (already done — just thread them through)
  - [ ] Wrap the existing `<ToolbarContainer>…</section>` block so it renders **only when `!isMobile`**
  - [ ] Render the new mobile stack **only when `isMobile`**:
    - [ ] `<MobileToolbar areas={areas} sectors={sectors} stages={stages} total={total} />`
    - [ ] `<div className="fixed inset-0 z-0">` wrapping the view content (loading / error / empty / map / grid / unmapped)
  - [ ] Extract loading/error/empty/view branching into a local render helper so both mobile and desktop call the same logic (DRY, no behavior duplication)
- [ ] Verify: Desktop (`>=768px`) renders the exact original tree; mobile renders the new stack. `pnpm typecheck` green.

---

## Phase 2 — MobileToolbar.tsx: the fixed overlay (solves Problems #2, #5, #6)

**Problem #2 (map height):** Map becomes a fixed full-viewport layer (`fixed inset-0`) under the toolbar — no `calc(100vh - 13rem)` spacer. (Handled by Phase 1's wrapper; toolbar just floats above it.)
**Problem #5 (brand fits 320px):** Brand text uses `min-w-0 flex-1 truncate` + smaller font at 320px; logo icon and buttons are `shrink-0`. Truncation is the last-resort safety net.
**Problem #6 (horizontal overflow):** Container enforces `width: calc(100% - 24px)`, `max-width` cap, `overflow: hidden`, `box-sizing: border-box`.

- [ ] Create `MobileToolbar.tsx` (props: `areas`, `sectors`, `stages`, `total`)
  - [ ] **Root:** `fixed top-[env(safe-area-inset-top)] left-3 right-3 z-[600] flex h-[100px] flex-col justify-center gap-2 rounded-[18px] panel`
    - `panel` gives frosted glass + `backdrop-filter` + shadow for free
    - Explicit `overflow-hidden` + `box-border` to kill horizontal overflow
  - [ ] **Row 1** (brand + actions):
    - [ ] `LogoButton` (reuse as-is) wrapped so its text span is `min-w-0 flex-1 truncate text-sm`
    - [ ] `Filters` pill: rounded, `aria-expanded={trayOpen}`, active highlight (different bg/text) when `hasActiveFilters`; includes sliders icon
    - [ ] `+` submit button: `shrink-0` rounded-square (>=40px), `<Link href="/submit">`, `aria-label="Submit a startup"`
    - [ ] Gaps + padding chosen so the row sums to <= 296px usable width at 320px
  - [ ] **Row 2** (view toggle -- swapped in after ship; was search):
    - [ ] `ViewToggle` (Map / Grid / Unmapped), `h-10`, full row width
  - [ ] Lifts `setFilter` / `resetFilters` / `setSearch` / `setView` from the store via props or direct hook (no new state)
- [ ] Verify: Render at 320/375/390/430 — nothing clips or wraps. `pnpm typecheck` green.

## Phase 3 — FilterTray.tsx: the overlay (solves Problems #8, #9, #10, #12; view toggle moved to toolbar Row 2)

**Problem #4 (view toggle — moved):** The segmented control `Map | Grid | Unmapped` now lives in the toolbar Row 2 as `ViewToggle`; the tray top holds the `SearchBox` instead. Preserves view-switching + URL sync.

**Problem #8 (outside-click vs map):**
- [ ] Tray + its toggle button are refs
- [ ] Document `click` listener (added only when open) closes the tray if the target is outside both refs
- [ ] Won't fire for the toggle button and won't touch Leaflet when the tray is closed

**Problem #9 (z-index):** Establish a scale:

| Layer | z |
|---|---|
| Map tiles | 0 (Leaflet 0–400) |
| Map pane / ads overlay | <= 500 |
| Count badge | 550 |
| MobileToolbar | 600 |
| FilterTray | 610 |

- [ ] Push Leaflet's zoom control below the toolbar via CSS: `.leaflet-top.leaflet-left { margin-top: 120px }` inside a `@media (max-width: 767px)` rule in `globals.css`
- [ ] Attribution (bottom-right) already clear of the count badge (bottom-left)

**Problem #10 (no duplicate data):** Tray receives `areas`/`sectors`/`stages` arrays (same `uniqueValues` source the desktop `FilterDropdown` uses). Each group renders `"All <x>"` (clears that filter) + the option list, driven by `setFilter`. Single `"Reset filters"` button calls `resetFilters`.

**Problem #12 (a11y):** `role="dialog"` + `aria-label`, `Escape` closes + returns focus to the filter button, visible focus rings, >=40px touch targets, readable contrast on `.panel`, and animation wrapped in `@media (prefers-reduced-motion: no-preference)`.

- [ ] Create `FilterTray.tsx` (props: `isOpen`, `onClose`, `areas`, `sectors`, `stages`, plus filter state + setters)
  - [ ] **Top:** `SearchBox` (`#mobile-search-input`, moved here from toolbar Row 2 in the later swap), then filter selects + reset
  - [ ] **Filter selects row:** Area / Sector / Stage dropdowns + `Reset filters` button (disabled when nothing active)
  - [ ] **Lifecycle:** `useEffect` for outside-click + Escape + focus-return; cleanup removes listeners
- [ ] Verify: Tray overlays map (no resize), closes on toggle/outside/Escape, Leaflet zoom/attribution still usable. `pnpm typecheck` green.

---

## Phase 4 — Count badge + Leaflet offset (solves Problem #11)

**Problem #11 (count indicator):** Float it `fixed bottom-4 left-4 z-[550] panel`, small text — visible, not covering Leaflet controls (zoom is offset down, attribution is bottom-right).

- [ ] Create `MobileCountBadge.tsx` (`total`): `fixed bottom-4 left-4 z-[550] rounded-full panel px-3 py-1 text-xs tabular-nums`
- [ ] In `globals.css` add, inside `@media (max-width: 767px)`:
  ```css
  .leaflet-top.leaflet-left { top: 120px; }
  ```
- [ ] Verify: Badge visible at all mobile widths; zoom control reachable; no overlap with attribution

---

## Phase 5 — Motion + safe-area hardening (completes Problem #12)

- [ ] Tray enter/exit uses `transition` on transform/opacity — wrapped in `@media (prefers-reduced-motion: no-preference)` so reduced-motion users get an instant show/hide
- [ ] All fixed elements use `env(safe-area-inset-*)` for notched devices (toolbar `top`, tray `top`, badge `bottom`)
- [ ] Touch targets >=40px enforced via min-height/min-width on filter options, view-toggle items, and the submit button
- [ ] Verify: Reduced-motion: tray snaps. Notched simulator: no content under the notch/homewindicator

---

## Phase 6 — Tests + verification (solves Problem #13 validation)

- [ ] `tests/unit/components/toolbar/MobileToolbar.test.tsx`
  - [ ] Renders brand, Filters button, submit link, view toggle (`Choose view` group)
  - [ ] Filters button shows active state when a filter is set
- [ ] `tests/unit/components/toolbar/FilterTray.test.tsx`
  - [ ] Toggles open/close; closes on Escape and outside-click
  - [ ] Selecting an option calls `setFilter`; Reset calls `resetFilters`
  - [ ] Search box commits a debounced value to the store
- [ ] Run full matrix: `pnpm typecheck` (0 errors), `pnpm lint`, `pnpm test:unit`, `pnpm test:integration` — all green
- [ ] Live QA at **320x667, 375x812, 390x884, 430x932, >=1024** — no horizontal scroll, map visible, tray overlays (doesn't push), desktop unchanged

---

## Quick reference — Problem to Solution mapping

| # | Problem | Solved in |
|---|---|---|
| 1 | SSR/hydration mismatch | Phase 0 (`useIsMobile` defaults to desktop) |
| 2 | Map height / spacer | Phase 1 (`fixed inset-0` map wrapper) |
| 3 | Tablet breakpoint | Phase 1 (overlay only `<768px`, desktop untouched 768+) |
| 4 | View toggle on mobile | Phase 3 (segmented control in toolbar Row 2) |
| 5 | Brand fits 320px | Phase 2 (`min-w-0 flex-1 truncate`) |
| 6 | Horizontal overflow | Phase 2 (`overflow-hidden`, `box-border`, width cap) |
| 7 | SearchBox behavior | Phase 2 (moved into the tray top, reuse component, restyle only) |
| 8 | Outside-click vs map | Phase 3 (ref-based listener, active only when open) |
| 9 | Z-index layering | Phase 3 (z-scale) + Phase 4 (Leaflet CSS offset) |
| 10 | Filter data reuse | Phase 1+3 (same `uniqueValues`, `setFilter`, `resetFilters`) |
| 11 | Count indicator placement | Phase 4 (`fixed bottom-left z-[550]`) |
| 12 | Accessibility | Phase 3 + Phase 5 (a11y attrs, reduced-motion, safe-area, >=40px) |
| 13 | No desktop regression | Phase 1 (gating) + Phase 6 (verification) |


