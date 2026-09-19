# Mobile Responsive TODO — Bug Fixes & Known Issues

> Complements `docs/MOBILE_TOOLBAR_TODO.md`. Tracks bugs found during dev/server runtime, test CI issues, and follow-up items.

---

## 🔴 Critical Bugs (Fixed or In Progress)

### BUG-001: Duplicate `toggleRef` declaration in FilterTray
- **Severity:** High — breaks HMR, causes full page reloads
- **File:** `src/components/toolbar/FilterTray.tsx`
- **Error:** `Identifier 'toggleRef' has already been declared`
- **Root cause:** `toggleRef` was declared both as a prop destructured parameter AND as a local `useRef` const
- **Status:** ✅ **FIXED** — removed the duplicate local declaration. `toggleRef` is now only received via props (line 34) and used in outside-click handler (line 74).
- **Evidence:** `.dev-server.err.log` showed repeated HMR failures for this

---

## 🟡 Runtime Warnings / Performance

### BUG-002: Tile proxy connection timeouts (IPv6)
- **Severity:** Medium — degrades map loading
- **File:** `src/app/api/tiles/[z]/[x]/[y]/route.ts`
- **Error:** `ConnectTimeoutError: Connect Timeout Error (attempted addresses: 2a04:4e42::347:443, timeout: 10000ms)`
- **Observation:** Multiple `TypeError: fetch failed` errors in `.dev-server.err.log`
- **Impact:** Tile fetches taking 6-8s instead of <100ms at certain zoom levels
- **Status:** ⚠️ **Monitoring** — may be network/environment specific (IPv6 routing issue). Not a code bug per se.

---

## 🟢 CI / Test Infrastructure

### BUG-003: Vite config native loader warning
- **Severity:** Low — warning only, tests still pass
- **File:** `vitest.config.ts`
- **Warning:** `Your Vite config uses features that are unsupported by configLoader: 'native'`
- **Cause:** ESM syntax in `vitest.config.ts` loaded as CommonJS
- **Fix options:**
  - Rename to `vitest.config.mts` 
  - OR set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true`
- **Status:** ⚠️ **To decide** — tests pass (`pnpm test:unit` green), but warning clutters logs

---

## 📋 Test Results Summary

All unit tests passing:
```
✓ tests/unit/lib/state/selectors.test.ts (3 tests) 11ms
✓ tests/unit/lib/error/sentry-scrub.test.ts (5 tests) 17ms
✓ tests/unit/security/sanitize.test.ts (17 tests) 23ms
✓ tests/unit/lib/api/startups.test.ts (9 tests) 21ms
✓ tests/unit/lib/hooks/useShowMore.test.ts (7 tests) 67ms
✓ tests/unit/lib/hooks/useStartups.test.tsx — should return startups data
```

---

## ✅ Verification Checklist

- [ ] `pnpm dev` — no HMR errors (especially no `toggleRef` duplicate)
- [ ] `pnpm test:unit` — all tests green
- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm lint` — clean
- [ ] Mobile QA at 375x812, 390x884 — tray opens/closes, filters work, no console errors

---

*Last updated: 2026-09-15*
