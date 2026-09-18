# Bug Counter TODO — Dashboard Recovery

> **Context:** The mobile-toolbar agent followed `MOBILE_TOOLBAR_TODO.md` only partially. It built the
> new components (Phases 0, 2, 3 — all unit tests pass) but **skipped Phase 1** (the `DashboardContent`
> wiring). Instead of rendering `MobileToolbar`/`MobileCountBadge` on mobile and gating the desktop
> toolbar behind `!isMobile`, it copy-pasted the desktop `<main>` block into a broken ternary,
> leaving the entire mobile stack as dead code and shipping a page with **two duplicate toolbars**.
>
> Rule (from ADS_UI_TODO): one phase at a time. Typecheck + unit tests + live check after EVERY phase.
> Live dev server: `http://localhost:3000` (`npm run dev` in `ncrstartupmap-nextjs`).

## Evidence (verified 2026-09-15)

| # | Finding | Proof |
|---|---------|-------|
| 1 | **Two duplicate desktop toolbars render simultaneously** | `DashboardContent.tsx` line 258 has a stray `) : (` with **no** `condition ? (` opener. JSX treats it as literal text → both `<main>` branches render. Live page: `Submit a startup` ×2, `search-input` ×4. |
| 2 | **Mobile UI is dead code** | `isMobile` computed (line 45) but never used; `MobileToolbar`, `MobileCountBadge`, `MobileMapWrapper`, `MapPanelProps` imported, never rendered. Live page: `Toggle filters` ×0. Violates MOBILE_TOOLBAR_TODO Phase 1. |
| 3 | **`tsc --noEmit` fails (repo-wide red)** | `src/components/ui/breadcrumb.tsx(2,8): TS2613` — `@radix-ui/react-slot` has no default export (needs `import { Slot }`). That package isn't even in `ncrstartupmap-nextjs/package.json` (resolved from parent `node_modules`). File has **zero importers** — dead scaffolding. |
| 4 | **`MobileMapWrapper.tsx` never renders its children (runtime bug) + 3 lint errors** | Portal container is created in `useEffect` and stored in a ref; render reads `containerRef.current` — ref writes don't trigger re-render, so children never mount. Lint: `react-hooks/refs` ×3 (ref access during render, lines 42, 54). |
| 5 | **Lint warnings (unused code)** | `jobs/[id]/page.tsx` `notFound`; `Badge.tsx` `hiringTone`/`hiringLabel`; `use-translate.ts` `useState`; `SearchBox.tsx` stale eslint-disable directive. |
| 6 | **Junk files** | `c4-1.txt`–`c4-4.txt`, `c4-res.txt`, `test-output.txt`, empty `src/app/MobileMapWrapper.tsx`. |
| 7 | **Dual lockfiles / workspace-root warning** | Root `package-lock.json` + sub-project `pnpm-lock.yaml` → Next warns "inferred your workspace root… may not be correct" on every dev boot. |
| 8 | **Original FilterTray report (line 120 TS error)** | **Already resolved** — `FilterGroup` is now generic (`<T extends string \| number = string>`), `tsc` passes for `FilterTray.tsx`. Unverified in browser because FilterTray never renders (Finding #2). |
| 9 | **Uncommitted work** | All of the above (mobile toolbar feature + broken wiring) sits uncommitted on `main` (`d34842e`). |


---

## Phase B0 — Cleanup: junk files & dead scaffolding

- [x] Delete `ncrstartupmap-nextjs/c4-1.txt`, `c4-2.txt`, `c4-3.txt`, `c4-4.txt`, `c4-res.txt`, `test-output.txt`
- [x] Delete empty stray `src/app/MobileMapWrapper.tsx` (0 bytes, wrong location; real one lives in `src/components/utils/`)
- [x] Delete `src/components/ui/` (`breadcrumb.tsx`) — grep-verified **zero importers**; deleting also fixes Finding #3.
      Guard: `npx tsc --noEmit` must stay error-free after deletion (typecheck is the deletion guard per PRODUCTION_READINESS_TODO).
- [x] Verify: `npm run typecheck` → 0 errors

## Phase B1 — Restore DashboardContent wiring (core bug, Finding #1 + #2)

- [x] In `src/app/DashboardContent.tsx`, restore the lost ternary condition before line 205:
      `) : (` at line 258 must pair with `{isMobile ? (` — currently orphaned
- [x] Replace the **duplicate** second `<main>` block (lines 259–311) with the mobile stack per
      MOBILE_TOOLBAR_TODO Phase 1:
  - [x] `<MobileToolbar areas={areas} sectors={sectors} stages={stages} />`
  - [x] `<MobileCountBadge total={total} />`
  - [x] Map/view content in a full-viewport wrapper (reuse the `renderViewContent` helper with `fullHeight`)
- [x] Keep the desktop branch (`ToolbarContainer` + `FilterDropdown`s + `SearchBox` + Clear + Submit)
      as the **single** copy, gated behind `!isMobile` — delete the duplicate
- [x] Remove now-unused imports or wire them in: `MobileMapWrapper`, `MapPanelProps` (decide per design)
- [x] Verify (live, `http://localhost:3000`):
  - [x] Exactly **one** toolbar: `Submit a startup` ×1, `Toggle filters` present at width ≤767px, absent at ≥768px
  - [x] Desktop tree identical to pre-mobile-toolbar state (Problem #13 — no regression)
  - [x] No literal `) : (` text visible on the page

## Phase B2 — Fix `MobileMapWrapper` (Finding #4: broken portal + lint errors)

- [x] Replace ref-in-render pattern with state so the portal target triggers re-render:
      `const [container, setContainer] = useState<HTMLDivElement | null>(null);`
      create/append in `useEffect`, `setContainer(portalContainer)`, cleanup removes node and
      `setContainer(null)`; render `container && createPortal(children, container)`
- [x] Verify: `npm run lint` → 0 errors in `MobileMapWrapper.tsx`; mobile map actually mounts at
      device-width viewport; no duplicate container nodes after open/close cycles

## Phase B3 — Lint warnings sweep (Finding #5)

- [x] `src/app/jobs/[id]/page.tsx`: use or remove `notFound` import
- [x] `src/components/shared/Badge.tsx`: wire `hiringTone`/`hiringLabel` or remove
- [x] `src/lib/i18n/use-translate.ts`: remove unused `useState`
- [x] `src/components/toolbar/SearchBox.tsx`: delete stale `eslint-disable` directive
- [x] Verify: `npm run lint` → 0 errors, 0 warnings

## Phase B4 — Verify the mobile feature end-to-end (Finding #8 follow-up)

- [x] `FilterTray`: opens via Filters pill, closes on toggle / Escape / outside click; selecting a
      chip calls `setFilter`; Reset enabled only when filters active; view segmented control calls `setView`
- [x] Leaflet controls reachable (globals.css `.leaflet-top.leaflet-left` offset only inside
      `@media (max-width: 767px)`); count badge doesn't cover attribution
- [x] QA matrix (live): 320×667, 375×812, 390×884, 430×932, ≥1024 — no horizontal scroll, tray
      overlays (doesn't push), desktop unchanged

## Phase B5 — Repo hygiene + commit (Finding #7 + #9)

- [x] Decide lockfile strategy: last commit migrated to pnpm — keep `pnpm-lock.yaml`, remove root
      `package-lock.json` + stray root `package.json` (or set `turbopack.root`) to silence the
      workspace-root warning
- [x] Run full matrix: `npm run typecheck` (0) · `npm run lint` (0/0) · `npm run test:unit` (65/65)
      · `npm run test:integration`
- [x] `npm run build` → production build passes
- [x] Commit everything (mobile toolbar feature + all fixes) with a message referencing
      MOBILE_TOOLBAR_TODO Phase 1 completion

---

## Problem → Fix mapping

| Finding | Fixed in |
|---|---|
| #1 Duplicate toolbars | Phase B1 |
| #2 Mobile UI dead code | Phase B1 |
| #3 tsc red / breadcrumb.tsx | Phase B0 |
| #4 MobileMapWrapper portal broken | Phase B2 |
| #5 Lint warnings | Phase B3 |
| #6 Junk files | Phase B0 |
| #7 Dual lockfiles | Phase B5 |
| #8 FilterTray TS error (already fixed) | Verified in B4 |
| #9 Uncommitted work | Phase B5 |
