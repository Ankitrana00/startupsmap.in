# Toolbar → Production Readiness TODO
Scope: `src/components/toolbar/*` + data chain (`DashboardContent`, store, selectors, api, hooks, views).
Working dir: `c:\Users\Ankit\startup-map-dash\ncrstartupmap-nextjs`
Rule: one phase at a time. Typecheck + tests + live check after EVERY phase.

## Phase 0 — Baseline (no code changes)
1. `npm run typecheck` → expect 0 errors. Save log.
2. `npm run test:unit` + `npm run test:integration` → record pass counts.
3. `curl http://localhost:3000/` → 200. Screenshot toolbar at 390px / 768px / 1280px.
4. `git status --short` → clean; branch `chore/toolbar-prod-baseline`.
Acceptance: all green, screenshots in `docs/toolbar-baseline/`.

## Phase 1 — P0 Crash & Data Bugs
### 1A. Null-safe search matching
File: `src/lib/api/startups.ts` → `matchesQuery()` (lines 19-25). The crash:
`[s.name, s.description, ...].some((v) => v.toLowerCase()...)` throws TypeError
when any field is null (your own type comment admits nullable DB rows).
Change:
- Normalize query ONCE in `applyFilters()`: `const q = query.trim().toLowerCase()`,
  pass `q` into `matchesQuery(s, q)` (also kills O(n) per-item allocs — Phase 2D).
- Matcher uses `(s.name ?? "")`, `(s.description ?? "")`, `(s.sector ?? "")`,
  `(s.area ?? "")`, `(s.stage ?? "")`. Early-return true if `!q`.
- Do NOT change ranking/scoring.
Tests: add to `tests/unit/lib/api/startups.test.ts` — null description, undefined
name, null stage, empty/whitespace query.
Verify: unit tests + tsc. No UI change.

### 1B. Loading / Error / Empty states
Files: `src/app/DashboardContent.tsx` (line 21), `src/lib/hooks/useStartups.ts`.
Today `{ data: startups = [] }` discards isPending/isError → fake "0 startups"
flash, and server(0)/client(N) mismatch. Change:
- Destructure `isPending, isError, refetch`.
- isPending → toolbar skeleton (disabled inputs) + map/grid skeleton. Never "0".
- isError → error panel + Retry button calling `refetch()`.
- `filtered.length === 0 && !isPending` → empty panel: "No startups match these
  filters." + `Clear all filters` button → `resetFilters()`.
- Keep `aria-live="polite"` ONLY on count/empty message (see 4E).
- Q1: reuse existing `MapSkeleton`/grid skeleton or build one shared skeleton?

### 1C. Wire resetFilters + Clear affordance
Files: `DashboardContent.tsx`, `src/lib/state/store.ts` (line 23).
`resetFilters` exists but zero callers (verified by grep). Change:
- `resetFilters: () => set({ filters: { ...emptyFilters }, search: "" })`
  (fresh object — shared reference can skip re-render under selector equality).
- Show ghost `Clear` button after Stage dropdown ONLY when any filter/search set.
- Empty-state panel (1B) reuses same action.
- Q2: preserve current view on clear? (Recommend: yes.)
- Q2: preserve current view on clear? (Recommend: yes.)

## Phase 2 — P1 Performance
### 2A. Selective store subscriptions
File: `DashboardContent.tsx` (line 22). One whole-store subscription today
re-renders the full toolbar per keystroke; the 150ms debounce only delays
computation, not renders. Change to per-field selectors:
`useDashboardStore((s) => s.view)` etc. for view/search/filters/setters.
- Q3: vanilla selectors enough, or add subscribeWithSelector? (Recommend: enough.)

### 2B. Local search state + debounced commit
Files: `src/components/toolbar/SearchBox.tsx`, `DashboardContent.tsx`.
SearchBox owns `local` state (init from value, sync when value goes ""),
debounces INSIDE via useDebouncedValue(local, 150), commits when
debounced !== value. Remove useDebouncedValue from DashboardContent to avoid
double-debounce. Escape/X clears local AND commits "" immediately.
- Q4: keep 150ms? (Recommend: keep; measure first.)
- Risk MEDIUM (stale closures). Handle unmount cleanup, external-reset sync.

### 2C. Single-pass selectCounts + memoize MapPanel
Files: `src/lib/state/selectors.ts` (11-19),
`src/components/views/MapView/MapPanel.tsx` (41-42).
6 passes per call today, called twice per tree, MapPanel unmemoized.
Change: single for..of accumulating total/hiring/notHiring/unconfirmed/
mapped/unmapped (unmapped = lat===null || lng===null). MapPanel useMemos both.
Add unit test with mixed fixture asserting exact numbers.

## Phase 3 — Type Safety
### 3A. Generic setFilter + generic FilterDropdown
Files: `src/lib/state/store.ts` (line 10), `FilterDropdown.tsx` (props).
Today `value: string | null` erases StartupStage safety. Change:
`setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;`
Dropdown: `function FilterDropdown<T extends string>({ value: T | null,
options: readonly T[], onSelect: (v: T | null) => void ... })`.
Verify tsc green + negative test ("Garbage" as stage must fail compile).

### 3B. Narrow uniqueValues
File: `src/lib/api/startups.ts` (line 31). `keyof Startup` allows "lat" giving
"null" option strings. Change: `key: "area" | "sector" | "stage"`.

## Phase 4 — Dead Code, Responsive, A11y
### 4A. Divider + LogoButton (imported nowhere — grep verified)
- Q5: delete both? (Recommend: delete LogoButton — layout has header logo;
  keep Divider only if design wants it, else delete both.)

### 4B. Responsive overflow
Files: `ToolbarContainer.tsx:10`, `SearchBox.tsx:33`,
`DashboardContent.tsx:84-89`. md:flex-nowrap + fixed widths overflow ~768px.
Change: nowrap at lg:, SearchBox `w-full sm:w-64 lg:w-72`,
Submit CTA `w-full sm:w-auto sm:ml-auto`. QA 390/768/1024/1280px.
- Q6: collapse filters into disclosure on mobile? (Recommend: defer.)

### 4C. SearchBox a11y + clear-button dedupe
File: `SearchBox.tsx`. Add role="search" wrapper, sr-only label, keep ONE
clear (recommend custom X) + hide native via
`input[type="search"]::-webkit-search-cancel-button{display:none}`.
- Q7: custom X only? (Recommend: yes.)

### 4D. FilterDropdown stale-value guard
File: `FilterDropdown.tsx`. If value not in options and not null, render
fallback value="" + auto-clear once via effect onSelect(null).
- Q8: silent auto-clear? (Recommend: yes.)

### 4E. MapPanel retry, not reload
File: `MapPanel.tsx:46-56`. window.location.reload() nukes filter/search
state. Replace with retry: clear error, null component, bump retryKey in
import-effect deps; cap 3, then Reload fallback. Fix z-1000 ad overlay to
z-[500] or move ads below map.
- Q9: overlay only >=md, below map on mobile? (Recommend: yes.)

### 4F. QueryClient defaults single source
Files: `src/app/providers.tsx:12`, `src/lib/hooks/useStartups.ts:8`.
Keep staleTime in providers; remove per-query override. Add
`retry: 2, gcTime: 5*60_000, refetchOnWindowFocus: false`. Document.

## Phase 5 — Production Features
### 5A. URL-synced filters — ?view=&q=&area=&sector=&stage= via useSearchParams
+ router.replace (replace, not push). New src/lib/utils/useFilterParams.ts
or adopt nuqs.
- Q10: hand-roll vs nuqs? (Recommend: hand-roll — 4 params.)

### 5B. Sample ads must not ship
File: `DashboardContent.tsx:30-52` hardcodes example.com ads. Gate behind
NODE_ENV !== "production" or pass ads={[]} until real source.
- Q11: real ad source coming, or hide carousel in prod now? (Recommend: hide.)

### 5C. Live region + filter counts
Move aria-live to count text in CountLegend (+ role="status").
Add countsBy(key, startups) for "Noida (12)" options.

### 5D. Grid scale guard
- Q12: expected prod row count? Decides pagination (Show more) vs virtualize.

### 5E. Observability
Wire react-error-boundary (already a dep) around dashboard section.
Route errors via existing src/lib/error/* or analytics — no new vendor.

## Verification Matrix (after EVERY phase)
Types `npm run typecheck` = 0 errors. Unit + integration pass (16/16+).
E2E map/grid specs pass. Live curl 200 + open / at 390/768/1280px, no
console errors. A11y: tab toolbar, SR labels, Escape clears search.

## Order
0 → 1A → 1B+1C → 2C → 2A+2B → 3A+3B → 4A→4F → 5A→5E.
Crash-first, states, perf, types, polish, features.
Each phase = one commit fix/toolbar-<phase>. Baseline branch kept till green.

