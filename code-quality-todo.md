### Decisions

1. **Shared form primitive — shared field-error + honeypot components + shared `useFormFields` hook.**  
   Both forms already use the same `FieldName` union, `getFieldErrors`, `errorId`, `FieldError`, honeypot, draft, focus-order, and submit orchestration. Extracting a single `useFormFields<Schema, FieldName>({ schema, storageKey, emptyDraft, fieldOrder })` hook plus `<FormField>` / `<HoneypotField>` components removes the duplication without deleting either form; each form keeps its own schema, layout, and route. Keep PromoteForm/SubmitForm as thin wrappers around those primitives.

2. **Shared hook — one generic `useAsyncSubmit<SubmitOutcome>(endpoint, transform)` with per-form schemas.**  
   `useSubmit` and `usePromoteSubmit` are structurally identical besides endpoint + payload shape. A single generic hook parameterized by endpoint and payload transform fits the existing hook pattern better than two near-clones; the generic return type can be reused so `SubmitForm`/`PromoteForm` imports stay stable.

3. **Error envelope — `{ error: string }` for error responses; `{ message: string }` for success responses.**  
   Most existing route handlers already emit `{ error: "..." }` for 400/403/409/429/500. Only `promote/route.ts` currently emits `{ success: true, message: "..." }` for success and `{ error: "..." }` for errors, and `submit/route.ts` emits `{ message: "Submission received" }` for success. Drive consistency by making all error responses use `{ error: string }` and all success responses use a single success shape `{ message: string }` (no `{ success }` flag needed for the existing 201 flows). Keep `handleApiError` and `handleValidationError` as-is since they already use `{ error, success: false }`; only route-level bodies need realignment for the error key.

4. **Dead modules and single-function wrappers.**  
   - `config.ts` and `rules.ts` throw at module scope and are not imported anywhere reachable — **delete both** after a grep confirms no imports.  
   - Single-function wrappers (`create-toast.ts`, `error-page.ts`, `badge-helpers.ts`, `time-until.ts`, `selectors.ts`, `format.ts`, `track-event.ts`, `track-page-view.ts`) are live and used; **do not delete**. Only fold them into a shared primitive when a real duplication (not just size) exists, per the TODO for `track-event`/`track-page-view`/`create-toast`.  
   - `monitor-error.ts` is a new server-only module with no tests and import-time risk — **gate it behind a runtime env check** so it never throws at import in builds/tests that lack Node env, then add tests.

5. **Test strategy — co-locate new tests with existing suites, plus a small integration suite per missing route.**  
   The existing test layout has `tests/unit/` and `tests/integration/tests/integration/submit/`. Add promote and admin unit tests adjacent to their source modules under `tests/unit/`, and add per-route integration suites under `tests/integration/` mirroring the submit suite shape. Do not create a new top-level test folder.

6. **Sentry dual import — consolidate to `@sentry/nextjs`.**  
   Client-side reporting in `reportClientError` already imports `@sentry/nextjs`. If `@sentry/nextjs` re-exports the browser client needed there, drop the `@sentry/browser` import in `report-client-error.ts`. Confirm with a grep of `@sentry/browser` usage before removing.

---

### [P0] — Delete `config.ts` and `rules.ts` (they throw at module scope)

**Audit ref:** Dead Code — `config.ts` is a compile-time error, not live code; Dead Code — `rules.ts` is a compile-time error, not live code  
**File(s):** `ncrstartupmap-nextjs/src/lib/config.ts` → entire file; `ncrstartupmap-nextjs/src/lib/rules.ts` → entire file  
**Problem:** Both modules throw immediately at module scope, so any import of them crashes at load time; they appear to be stubs rather than wired code.  
**Fix:** Confirm neither is imported in reachable code, then delete both files. If a grep turns up an import, either remove that import or gate the module's exports behind a runtime function so the throw only happens on call, not at import.  
**Approach:** Use the same delete-grep-verify pattern used elsewhere for dead files; do not move them into a "stubs" folder because they are not wired.  
**New file needed:** none  
**Verify:** `rg -n "from ['"]\.\.?/lib/(config|rules)" src` (and `scripts/`) returns zero results; `npx tsc --noEmit` passes; no runtime import path references these modules.  
**Dependency needed:** none
### [P1] — Realign route error/response envelopes to one consistent shape

**Audit ref:** Consistency — Error shape inconsistency: `message` vs `error` as the top-level key  
**File(s):** `ncrstartupmap-nextjs/src/app/api/submit/route.ts` → 17, 33, 42, 55–58, 76, 93, 112, 115; `ncrstartupmap-nextjs/src/app/api/promote/route.ts` → 16, 31, 40, 46–48, 56–58, 75, 97; `ncrstartupmap-nextjs/src/lib/error/handle-api-error.ts` → 21–27 (keep)  
**Problem:** The same logical outcomes are expressed with different top-level keys across routes (`{ error }`, `{ message }`, `{ success, message }`), so client error handling cannot assume a single envelope shape even though errors already mostly use `{ error }`.  
**Fix:** Make every route-level **error** body use `{ error: string }`. Make every route-level **success** body use `{ message: string }`. Concretely:  
- `submit/route.ts`: keep `{ message: "Submission received" }` for 201 success (already correct); ensure all 201s use the same key; keep `{ error }` for all non-2xx.  
- `promote/route.ts`: change the honeypot 201 and the normal 201 success body from `{ success: true, message: "Request submitted successfully" }` to `{ message: "Request submitted successfully" }`; keep `{ error }` for errors.  
- Leave `handleApiError` and `handleValidationError` emitting `{ error, success: false }` only if the existing server catch blocks actually use them; otherwise align those catch blocks to render `{ error }` without `success` if the rest of the API does not need `success: false`.  
**Approach:** Reuse the same `NextResponse.json(...)` inline shape already used per route; do not introduce a new response helper unless a catch block currently uses `handleApiError` and that helper's shape diverges from `{ error }`.  
**New file needed:** none  
**Verify:** Grep route files for `{ success:` and ensure only intended uses remain; assert each 400/403/409/429/500 body has `{ error }`; assert each 201 success body has `{ message }`; type-check passes; existing submit integration test still passes and promote integration test (once added) asserts the success shape.  
**Dependency needed:** none

### [P1] — Extract shared form primitive: `useFormFields` hook + `FormField` + honeypot component

**Audit ref:** Duplication — SubmitForm and PromoteForm duplicate the same form logic; Duplication — Duplicate per-field error extraction; Code Smells — Duplicate honeypot field in both forms; Naming — `handleChange` vs `updateField` naming inconsistency  
**File(s):**  
- New shared file: `ncrstartupmap-nextjs/src/lib/hooks/useFormFields.ts` (proposed lines 1–~120)  
- New shared file: `ncrstartupmap-nextjs/src/components/FormField.tsx` (proposed)  
- New shared file: `ncrstartupmap-nextjs/src/components/HoneypotField.tsx` (proposed)  
- Modified: `ncrstartupmap-nextjs/src/components/submit/SubmitForm.tsx` → current 92–105, 108, 172–185, 438–450  
- Modified: `ncrstartupmap-nextjs/src/components/promote/PromoteForm.tsx` → current 24–32, 64–70, 79–94, 97–101, 244–256  
**Problem:** SubmitForm and PromoteForm each define the same `FieldName` union, `getFieldErrors`, `errorId`, `FieldError`, draft init, field updater, focus-first-error logic, and honeypot inclusion; a change to one must be ported to the other.  
**Fix:** Create a single generic `useFormFields<Schema, FieldName>({ schema, storageKey, emptyDraft, fieldOrder })` hook that owns draft sync, per-field error clearing, and first-error focus policy. Create `<FormField field={...} error={...} onChange={...} ...>` to own `aria-invalid`, `aria-describedby`, and error-id wiring. Create `<HoneypotField name="honeypot_website" ...>` to own the hidden-field markup once. Rewrite SubmitForm and PromoteForm to import those instead of defining the helpers inline, keeping only schema, field order, layout, and endpoint-specific render logic.  
**Approach:** Reuse the existing Zod `safeParse` + `issues` mapping already in both forms, the existing `useFormDraft` pattern, and the existing `FIELD_ORDER` focus policy; centralize naming to one updater (`updateField`) rather than two names (`updateField` / `handleChange`).  
**New file needed:** `ncrstartupmap-nextjs/src/lib/hooks/useFormFields.ts` — single generic hook so both forms share one implementation; `ncrstartupmap-nextjs/src/components/FormField.tsx` — one component for wired input+error+aria; `ncrstartupmap-nextjs/src/components/HoneypotField.tsx` — one honeypot component.  
**Verify:** `SubmitForm` and `PromoteForm` no longer define `getFieldErrors`, `errorId`, `FieldError`, or honeypot markup inline; both forms render identically for field errors/honeypot; type-check passes; existing submit unit test still passes; PromoteForm unit test added in the test TODO covers the same behaviors.  
### [P1] — Extract shared generic submit hook `useAsyncSubmit`

**Audit ref:** Duplication — `useSubmit` and `usePromoteSubmit` are structurally the same hook  
**File(s):**  
- New shared file: `ncrstartupmap-nextjs/src/lib/hooks/useAsyncSubmit.ts` (proposed)  
- Modified: `ncrstartupmap-nextjs/src/lib/hooks/useSubmit.ts` → current 62–79 (re-export or thin wrapper)  
- Modified: `ncrstartupmap-nextjs/src/lib/hooks/usePromoteSubmit.ts` → current 55–64 (re-export or thin wrapper)  
**Problem:** Two hooks implement the same orchestration (pre-fill + saved state, fetch, optimistic submit state, reset) with only the endpoint and payload shape differing; the return types are duplicated rather than shared.  
**Fix:** Introduce a generic `useAsyncSubmit<Payload, Outcome>(endpoint, transformPayload, options?)` hook that owns the fetch loop and state shape, and export a shared return type `AsyncSubmitResult<Outcome>`. Rewrite `useSubmit` and `usePromoteSubmit` as thin parameterized wrappers or re-exports, keeping their public names for call sites if renaming is not desired.  
**Approach:** Reuse the existing hook shape (ref + state + single async action + optimistic state + reset) already in both hooks; reuse the existing return shape `isSubmitting, isSubmitted, error, submit` so callers change minimally.  
### [P1] — Make `monitor-error.ts` safe at import time and add tests

**Audit ref:** Code Smells — `monitor-error.ts` has no tests and no safe shim; Dead Code (risk) — new server-only module can throw at import in some environments  
**File(s):** `ncrstartupmap-nextjs/src/lib/analytics/monitor-error.ts` → whole file (all lines, since it is new and unwritten in the repo today)  
**Problem:** A new server-side error-monitor module exists (per the audit) with no tests and no import-time guard, so it can throw at import in builds/tests that lack Node env, and its behavior is untested.  
**Fix:** Ensure the module only uses `process` / Node APIs behind a runtime env check so importing it never throws at module scope. Add tests covering import safety, the happy path (when enabled), and the disabled path (when env missing or test env).  
**Approach:** Follow the same runtime-guard pattern already used in other env-dependent modules (e.g. Sentry reporters that check `SENTRY_DSN`/DSN presence before calling); do not invent a new pattern.  
**New file needed:** `ncrstartupmap-nextjs/tests/unit/lib/analytics/monitor-error.test.ts` — covers import safety + enabled/disabled behavior.  
### [P2] — Add logging to the unlogged fallback paths in `create-limiter`

**Audit ref:** Code Smells — `create-limiter` has empty catch blocks that silently degrade  
**File(s):** `ncrstartupmap-nextjs/src/lib/rate-limit/create-limiter.ts` → 71–73, 89–91  
**Problem:** Two `catch { }` blocks swallow Redis failures silently and fall through to in-memory, with no trace that the fallback happened; this makes production Redis outages hard to see in logs.  
**Fix:** Add `log.warn(...)` (or the existing log level used elsewhere for degraded behavior) in both catch blocks with a short, stable message indicating Redis check failed and in-memory fallback is being used.  
**Approach:** Reuse the existing `log` import already present in the module and the same logging style used by other fallbacks in the codebase (e.g. server route logs with a `[api/...]` prefix).  
**New file needed:** none  
**Verify:** Both catch paths log a warning when Redis is unavailable (e.g. integration test with Redis disabled, or integration test asserting the log line); type-check passes; rate limiting still works via the memory fallback.  
**Dependency needed:** none

---
### [P2] — Narrow `getRateLimitHeaders` return type and rename to match existing naming

**Audit ref:** Type Safety — `getRateLimitHeaders` returns `Promise<Record<string, unknown>>`; Naming — `getRateLimitHeaders` naming inconsistency with `retryAfterSeconds`  
**File(s):** `ncrstartupmap-nextjs/src/lib/rate-limit/create-limiter.ts` → current lines around the header helper (audit cites ~186) and any wrapper that calls it  
**Problem:** The header helper returns `Record<string, unknown>`, so callers cannot know what keys/values they receive, and its name `getRateLimitHeaders` is inconsistent with the action-style naming already used in the limiter (`check`, `retryAfterSeconds`).  
**Fix:** Replace `getRateLimitHeaders` with a typed helper whose name and return type match the rate-limit domain (e.g. `getRateLimitStatus(ip)` returning a small typed snapshot such as `{ remaining: number; resetSeconds: number }`), and update any callers to use the new shape.  
**Approach:** Reuse the existing per-IP bucket data already available in the limiter to compute the status; keep the naming style consistent with `retryAfterSeconds` (action-oriented, not noun-heavy).  
**New file needed:** none  
**Verify:** Callers type-check against the new return type; the helper no longer returns `unknown`; integration test asserting rate-limit response headers/behavior still passes; naming grep for `getRateLimitHeaders` shows no remaining usage.  
**Dependency needed:** none

---
### [P2] — Remove the unused/unnecessary `secret`/`whitelistedSecret` toggle in `create-limiter`

**Audit ref:** Type Safety — `secret`/`whitelistedSecret` toggle in `create-limiter`  
**File(s):** `ncrstartupmap-nextjs/src/lib/rate-limit/create-limiter.ts` → current options block (audit cites ~46–55) and any call site passing those options  
**Problem:** Two secret-related option names with an inverted `whitelistedSecret` boolean make the limiter options harder to use correctly and suggest two concepts where one likely suffices.  
**Fix:** Consolidate to a single, clearly named bypass concept (e.g. `isFromTrustedSource?: boolean` or a single `bypassSecret` if secret-based bypass is the actual mechanism), and update any call sites. If both concepts are genuinely needed, rename them so their relationship is obvious rather than leaving `secret` and `whitelistedSecret` both present.  
**Approach:** Follow the same options-type strictness already used in `create-rate-limiter.ts`; do not introduce runtime behavior changes beyond the naming/option consolidation.  
**New file needed:** none  
**Verify:** `createRateLimiter` option type no longer contains both `secret` and `whitelistedSecret` as ambiguously named fields; callers compile; behavior for bypass logic is preserved and tested where it already exists.  
**Dependency needed:** none

---
### [P2] — Replace ad hoc fingerprint/observability ID helpers with one shared typed helper

**Audit ref:** Duplication — `reportClientError` repeats `fingerprint` and `observabilityId` logic already in `beforeSend`; Naming — `fingerprint`/`observabilityId` helpers typed loosely  
**File(s):** `ncrstartupmap-nextjs/sentry.client.config.ts` → current 108–118, 125–131; `ncrstartupmap-nextjs/src/lib/error/report-client-error.ts` → current 27–36, 45, 62–63, 72 (or whichever lines implement the same logic)  
**Problem:** The same PRNG-based fingerprint and observability-id derivation appears in both the Sentry client config and in `reportClientError`, so a change to one identity scheme must be ported manually.  
**Fix:** Extract one shared helper (e.g. `createObservabilityId()` and `fingerprintEvent(event)`) used by both the SDK `beforeSend`/`beforeSendTransaction` block and `reportClientError`. Keep the helper internally consistent rather than duplicating the logic.  
**Approach:** Reuse the existing PRNG + fingerprint shape already in `sentry.client.config.ts`; do not change the algorithm, only consolidate the code path.  
**New file needed:** `ncrstartupmap-nextjs/src/lib/sentry/identity.ts` — single shared identity helpers used by both Sentry config and client error reporting.  
**Verify:** Only one definition of fingerprint/observability-id logic exists; both call sites import from the same module; type-check passes; Sentry client config still attaches observabilityId; `reportClientError` still emits the same enriched payload shape.  
**Dependency needed:** none

---
### [P2] — Consolidate `track-event.ts` / `track-page-view.ts` / `create-toast.ts` to one public surface each

**Audit ref:** Dead Code — `trackEvent` and `trackPageView` only ever call `reportMetric` with fixed strings; Dead Code — `create-toast` is one function that only wraps `reportClientError`  
**File(s):** `ncrstartupmap-nextjs/src/lib/analytics/track-event.ts`; `ncrstartupmap-nextjs/src/lib/analytics/track-page-view.ts`; `ncrstartupmap-nextjs/src/lib/error/create-toast.ts`  
**Problem:** Three thin modules exist mainly to delegate to a single underlying call (`reportMetric` for analytics; `reportClientError` for toast), so callers have multiple names for the same behavior and the files add import hops with no behavior of their own.  
**Fix:** Decide, per module, whether the wrapper is a stable public API or just indirection. If the wrapper is the intended public surface, keep one file per concern but remove any redundant synonyms (e.g. if `track-event.ts` defines multiple functions that all map to the same `reportMetric` call, consolidate to one `reportEvent(event, payload?)`). If the wrapper adds no semantics, fold call sites to import the underlying function directly and remove the wrapper module. Either way, ensure each analytics/error concern has exactly one clear public entry point.  
**Approach:** Use the existing delegation already in those files; do not change `reportMetric`/`reportClientError` behavior; only reduce the wrapper layers that add no additional policy.  
**New file needed:** none (consolidation only)  
**Verify:** Each concern has one clear public function; no two functions in the analytics module delegate to `reportMetric` with only a fixed string difference; call sites still compile; analytics unit test still covers the remaining public entry point.  
**Dependency needed:** none

---
### [P2] — Standardize submit/promote validation route helpers and reuse shared token/verification types

**Audit ref:** Code Smells — `verify-token` parsing duplicated or mirrored by route validation; Type Safety — token format assumptions live in more than one place  
**File(s):** `ncrstartupmap-nextjs/src/lib/verification/token.ts`; `ncrstartupmap-nextjs/src/app/api/submit/validate.ts`; `ncrstartupmap-nextjs/src/app/api/promote/validate.ts`  
**Problem:** Token format parsing/verification logic appears in both `lib/verification` and route validation code, so the token encoding/decoding contract can drift between the library and the routes that consume it.  
**Fix:** Centralize token encoding/decoding and any route-facing token checks behind `lib/verification/token.ts` (or a clearly named shared module), and have the submit/promote validate helpers use that single module instead of re-implementing format assumptions.  
**Approach:** Reuse the existing `verify-token` shape already in `lib/verification`; do not change the token contract, only ensure there is one implementation and one type for it.  
**New file needed:** none  
**Verify:** Submit and promote validation use the same token helper/type; no duplicated token parsing logic remains; type-check passes; existing submit validation tests still pass.  
**Dependency needed:** none

---
### [P2] — Replace `SetStateAction`/`StateSetter` aliases in `store.ts` with React's built-in types

**Audit ref:** Type Safety — state store action+state types are separate but repetitive  
**File(s):** `ncrstartupmap-nextjs/src/lib/state/store.ts` → 13–20  
**Problem:** The store module re-declares `SetStateAction<T>` and `StateSetter<T>` types that React already provides, adding a redundant local type surface.  
**Fix:** Remove the local aliases and use React's `SetStateAction<T>` / `Dispatch<SetStateAction<T>>` (or the hook return types) directly.  
**Approach:** Reuse React's built-in generic types instead of a local mirror; keep the module's public API unchanged.  
**New file needed:** none  
**Verify:** `store.ts` no longer defines the redundant aliases; imports that used them still compile via React's types; type-check passes; tests for the store still pass.  
**Dependency needed:** none

---
### [P2] — Consolidate Sentry client config's duplicate observability-ID attachment

**Audit ref:** Duplication — `InstrumentationProvider` replicates what `modifyClientStartup` already injects; Duplication — Sentry client config `beforeSend`/`beforeSendTransaction` duplicates SDK setup  
**File(s):** `ncrstartupmap-nextjs/src/app/providers.tsx` → 57–85; `ncrstartupmap-nextjs/sentry.client.config.ts` → 104–140  
**Problem:** The same PRNG, fingerprint, observability-id, and trace-state attachment is set in both the Sentry client config startup block and again inside `InstrumentationProvider`'s `beforeSend`, so the same data can be attached twice on the same error/transaction.  
**Fix:** Keep the SDK-level identity attachment in `modifyClientStartup` (or whichever is the canonical SDK place) and remove the duplicate attachment from `InstrumentationProvider` if it adds nothing beyond the SDK config. If the provider owns behavior the SDK config does not, keep only the provider's unique part.  
**Approach:** Reuse the existing SDK startup block in `sentry.client.config.ts` as the single place for observability-ID attachment; remove redundancy rather than both places doing the same thing.  
**New file needed:** none  
**Verify:** Only one place (SDK config or provider, not both) attaches observabilityId/fingerprint for the same event; provider still compiles and provides its non-duplicated behavior; Sentry client config still wires the SDK identity block; type-check passes.  
**Dependency needed:** none

---
### [P2] — Drop `@sentry/browser` import in `report-client-error.ts` if `@sentry/nextjs` already covers it

**Audit ref:** Dependency Hygiene — `@sentry/browser` imported in a module alongside `@sentry/nextjs`  
**File(s):** `ncrstartupmap-nextjs/src/lib/error/report-client-error.ts` → 1 (import line) and use of `Sentry.captureException`  
**Problem:** `reportClientError` imports from `@sentry/browser` while the rest of the client-side reporting already uses `@sentry/nextjs`; this may be redundant and increases the chance of two Sentry package versions/types in use.  
**Fix:** Keep the existing `Sentry.captureException` usage but import from `@sentry/nextjs` only if that package re-exports the client API needed; remove the `@sentry/browser` import if it is not required.  
**Approach:** Grep the codebase for other `@sentry/browser` imports first; if `report-client-error.ts` is the only place and `@sentry/nextjs` satisfies the same API, switch the import. Do not change behavior, only the import source.  
**New file needed:** none  
**Verify:** `report-client-error.ts` imports only from `@sentry/nextjs` (or keeps both only if a justified dual import is confirmed); `npx tsc --noEmit` passes; `Sentry.captureException` still types correctly.  
**Dependency needed:** none

---
### [P2] — Make `admin/users` body handling narrow with a zod schema

**Audit ref:** Type Safety — `admin/users` handler accepts a wide `Record<string, any>` body  
**File(s):** `ncrstartupmap-nextjs/src/app/api/admin/users/route.ts` → 27–30, 45 (and surrounding access)  
**Problem:** The admin mutate body is typed as a broad record and accessed with optional chaining plus raw casts, so downstream code cannot rely on a stable shape.  
**Fix:** Introduce a zod schema for the admin mutate body (matching the existing validation style used by submit/promote) and parse it at the route boundary, then use the parsed shape downstream.  
**Approach:** Reuse the existing `z` + schema pattern from `src/app/api/submit/validate.ts` and `src/app/api/promote/validate.ts`; do not change the intended mutate semantics, only narrow the input type.  
**New file needed:** `ncrstartupmap-nextjs/src/app/api/admin/users/validate.ts` — zod schema for the admin mutate body.  
**Verify:** `admin/users` route parses the body with a schema; downstream code types against the parsed shape; type-check passes; admin integration test (added in the test TODO) covers valid/invalid mutate bodies.  
**Dependency needed:** none

---
### [P2] — Add logging around the `rds` shared header mutation paths

**Audit ref:** Code Smells — `rds` callbacks can mutate a shared header object unsafely  
**File(s):** `ncrstartupmap-nextjs/src/lib/middleware/rate-limit.ts` → 32, 46–53, 266 (and surrounding shared header usage)  
**Problem:** Middleware builds one header object and mutates its values across callbacks, which is error-prone when multiple callbacks contribute to the same response headers.  
**Fix:** Prefer building response headers per callback from immutable fragments or returned objects rather than mutating one shared object; if the current shape is intentionally shared, add a short inline comment stating the mutation contract and keep mutation localized.  
**Approach:** Reuse the existing middleware header-building style already in the file; do not restructure the entire middleware, only tighten the header-mutation contract.  
**New file needed:** none  
### [P3] — Add promote integration suite and remove reliance on submit-only coverage

**Audit ref:** Test Coverage Gaps — No route-level tests for PROMOTE, SUBMIT, ADMIN, HEALTH, READY, TILES  
**File(s):** New: `ncrstartupmap-nextjs/tests/integration/promote/` (suite following the submit integration shape); validation-only helper: `ncrstartupmap-nextjs/tests/integration/promote/route.test.ts`  
**Problem:** Integration tests exist for submit but not for promote, admin, health, ready, or tiles, so the public promote flow has no route-level integration coverage.  
**Fix:** Add a promote integration suite that mirrors the submit suite shape: valid submission, honeypot discard, invalid body, rate-limit behavior, and success response shape. Use the existing test runner and folder layout rather than creating a new top-level test folder.  
**Approach:** Reuse the existing integration test conventions already in `tests/integration/submit/`; do not invent a new testing pattern.  
**New file needed:** `ncrstartupmap-nextjs/tests/integration/promote/` — promote route integration suite.  
**Verify:** Promote integration suite asserts the success shape (`{ message }` after the error-envelope TODO), error responses (`{ error }`), honeypot discard, and validation failures; suite runs under the same `npm test` runner; type-check passes.  
**Dependency needed:** none

---
### [P3] — Add admin login/verify/logout integration suites

**Audit ref:** Test Coverage Gaps — No route-level tests for ADMIN login/verify/logout  
**File(s):** New: `ncrstartupmap-nextjs/tests/integration/admin/` with login, verify, logout suites  
**Problem:** Admin authentication routes have no integration coverage, leaving login/verify/logout behavior untested at the route level.  
**Fix:** Add integration suites for admin login, verify, and logout following the same integration-test conventions used for submit. Cover successful auth, invalid credentials, missing/expired tokens, and the response shapes used by the admin routes after the error-envelope TODO.  
**Approach:** Reuse the existing integration-test layout under `tests/integration/`; do not create a new separate test harness.  
**New file needed:** `ncrstartupmap-nextjs/tests/integration/admin/` — admin auth integration suites.  
**Verify:** Admin login/verify/logout suites run under the existing test runner and assert success/error shapes and auth-state transitions; type-check passes.  
**Dependency needed:** none

---
### [P3] — Add health/ready/tiles integration suites

**Audit ref:** Test Coverage Gaps — No route-level tests for HEALTH, READY, TILES  
**File(s):** New: `ncrstartupmap-nextjs/tests/integration/health/`, `ncrstartupmap-nextjs/tests/integration/ready/`, `ncrstartupmap-nextjs/tests/integration/tiles/`  
**Problem:** Health, ready, and tiles routes have no route-level integration coverage.  
**Fix:** Add small integration suites for `/api/health`, `/api/ready`, and the tiles route(s) following the existing integration-test conventions. Cover success responses, error responses where applicable, and readiness gating behavior for `/api/ready`.  
**Approach:** Reuse the existing integration-test folder layout and runner; keep the suites minimal but behavior-focused rather than ad hoc.  
**New file needed:** `ncrstartupmap-nextjs/tests/integration/health/`, `ncrstartupmap-nextjs/tests/integration/ready/`, `ncrstartupmap-nextjs/tests/integration/tiles/`  
**Verify:** Each suite runs under the existing test runner and asserts the route's expected response shape and behavior; type-check passes.  
**Dependency needed:** none
**Verify:** No callback mutates a shared header object in a way that can conflict with another callback; rate-limit response headers still include the expected values; type-check passes; integration test covering rate-limit headers still passes.  
**Dependency needed:** none
### [P3] — Add unit tests for promote hook + PromoteForm

**Audit ref:** Test Coverage Gaps — Promote and Admin flows lack unit coverage relative to submit; Naming — `handleChange` vs `updateField` naming inconsistency (fixed by shared primitive, but promote's behavior still needs coverage)  
**File(s):** New: `ncrstartupmap-nextjs/tests/unit/lib/hooks/usePromoteSubmit.test.ts`; `ncrstartupmap-nextjs/tests/unit/components/promote/PromoteForm.test.tsx`  
**Problem:** PromoteForm and `usePromoteSubmit` lack unit coverage comparable to the submit equivalents, so promote-specific behaviors (submit outcome, error propagation, drafting, focus) are less tested.  
**Fix:** Add unit tests for `usePromoteSubmit` and `PromoteForm` mirroring the submit hook/form test shape, covering success, error, loading, and optimistic state behaviors. After the shared primitive extraction, these tests should also cover the shared hook/component behaviors via the promote wrappers.  
**Approach:** Reuse the existing test conventions in `tests/unit/`; do not create a new test style.  
**New file needed:** `ncrstartupmap-nextjs/tests/unit/lib/hooks/usePromoteSubmit.test.ts`; `ncrstartupmap-nextjs/tests/unit/components/promote/PromoteForm.test.tsx`  
**Verify:** Promote unit tests cover the same outcome categories as submit; they run under the existing test runner; type-check passes; promote integration suite (added above) complements them at route level.  
**Dependency needed:** none

---
### [P3] — Add unit tests for `AdminContext` and admin route handlers

**Audit ref:** Test Coverage Gaps — Admin flows lack unit coverage relative to submit; Complexity — `AdminContext` has deep nesting and a typo-laden error surface  
**File(s):** New: `ncrstartupmap-nextjs/tests/unit/contexts/AdminContext.test.tsx`; `ncrstartupmap-nextjs/tests/unit/app/api/admin/login/route.test.ts`; `ncrstartupmap-nextjs/tests/unit/app/api/admin/verify/route.test.ts`; `ncrstartupmap-nextjs/tests/unit/app/api/admin/logout/route.test.ts`  
**Problem:** `AdminContext` and the admin route handlers have limited unit coverage relative to the submit flow, and `AdminContext` has concentrated side-effect logic and inconsistent error messages.  
**Fix:** Add unit tests for `AdminContext` covering session load, expiry observe, window messaging, visibility re-sync, and error paths; add unit tests for admin login/verify/logout route handlers covering valid/invalid credentials, token lifecycle, and response shapes.  
**Approach:** Reuse the existing unit-test conventions in `tests/unit/`; do not introduce a separate admin test harness.  
**New file needed:** Admin context + admin route unit tests under `tests/unit/`.  
**Verify:** Admin context tests assert the expected side-effect behaviors and error paths; admin route tests assert auth success/failure shapes; tests run under the existing runner; type-check passes; admin integration suite (added above) complements them at route level.  
**Dependency needed:** none

---

---
**Verify:** Module imports cleanly in a unit test environment with no Node env; `npx tsc --noEmit` passes; tests assert no throw on import, correct behavior when enabled, and no-op when disabled.  
**Dependency needed:** none

---
**New file needed:** `ncrstartupmap-nextjs/src/lib/hooks/useAsyncSubmit.ts` — single generic hook with a shared return type.  
**Verify:** Both hooks have no duplicated orchestration logic; shared return type is imported by both wrappers; type-check passes; SubmitForm and PromoteForm still compile against the same hook signature; unit tests for each hook cover the shared behaviors.  
**Dependency needed:** none

---
**Dependency needed:** none

---
---

---
### [P3] — Add analytics higher-level tests for `trackEvent`/`trackPageView` behavior

**Audit ref:** Test Coverage Gaps — Analytics module mostly untested except `reportMetric`  
**File(s):** Extend: `ncrstartupmap-nextjs/tests/unit/lib/analytics.test.ts` to cover `trackEvent` and `trackPageView` (or whichever public helpers remain after the consolidation TODO)  
**Problem:** The analytics test suite covers `reportMetric` but not the higher-level public helpers that delegate to it, so the public analytics API surface is less tested than its internal implementation.  
**Fix:** Extend the existing analytics test suite to cover the public entry points (after the consolidation TODO chooses which functions are the canonical ones), including success, no-op when disabled, and any metadata forwarding behavior.  
**Approach:** Reuse the existing analytics test file and conventions; do not create a new analytics test location.  
**New file needed:** none (extend existing `tests/unit/lib/analytics.test.ts`)  
**Verify:** Analytics test suite covers the public entry points, not only `reportMetric`; tests run under the existing runner; type-check passes.  
**Dependency needed:** none

---
### [P3] — Extend map auto-annotation tests to cover the orchestration behavior

**Audit ref:** Test Coverage Gaps — Auto-annotation tests only cover leaf cases  
**File(s):** Extend: `ncrstartupmap-nextjs/tests/unit/components/map/annotations.test.ts`  
**Problem:** The map auto-annotation tests cover `pickAnnotation`, `isMultiAnn`, and `autoLabelMatch`, but not the higher-level `autoAnnounceAnnotation`/`autoAnnounceNewAnnotation` orchestration behavior.  
**Fix:** Add test cases for the auto-annotation orchestration functions, covering the decision paths that lead to an announcement, not only the leaf predicate helpers.  
**Approach:** Reuse the existing annotation test file and conventions; do not create a separate annotation test folder.  
**New file needed:** none (extend existing `tests/unit/components/map/annotations.test.ts`)  
**Verify:** Auto-annotation orchestration functions are covered by explicit test cases; tests run under the existing runner; type-check passes.  
**Dependency needed:** none

---
### [P3] — Remove `@types/node` from devDependencies if the tsconfig `types` addition made it redundant for type-checking only

**Audit ref:** (From the tsconfig fix context) `@types/node` is already in devDependencies, but tsconfig had no `types` array  
**File(s):** `ncrstartupmap-nextjs/package.json` (devDependencies)  
**Problem:** After adding `"types": ["node"]` to `tsconfig.json` compilerOptions, `@types/node` is still listed in devDependencies; if it is now used only for type-checking, that is fine, but if it became redundant for runtime, leave the decision explicit rather than implicit.  
**Fix:** Confirm whether `@types/node` is still required by any runtime or type-checking path. If it is still needed for type-checking Node globals, keep it and document that the tsconfig `types` addition is what enables those globals; if it is truly redundant, remove it.  
**Approach:** Use `rg` to confirm whether any other config or source file depends on `@types/node` explicitly; do not remove it speculatively.  
**New file needed:** none  
**Verify:** If kept: `npx tsc --noEmit` still resolves Node globals and no `process`-related type errors remain. If removed: `npx tsc --noEmit` still passes and no file relies on `@types/node` directly.  
**Dependency needed:** none

---
### [P3] — Standardize minor inconsistent naming and unused-variable / `let`-where-`const`-suffices spots identified in audit

**Audit ref:** Naming — `submit`/`submitSuccess` naming overlap; Naming — `handleChange` vs `updateField` (already addressed by the shared form primitive TODO, but remaining call-site naming should be consistent afterward); Code Smells — mixed `const`/`let` where `const` is sufficient  
**File(s):** After the shared primitive TODOs, audit call sites that still use the old divergent names; files with `let` that never reassigns (audit flagged several form/hook files and rate-limit modules)  
**Problem:** Once duplication is removed, remaining naming should be consistent (one updater name, one success-signal name) and locals that never reassign should be `const`.  
**Fix:** After the shared primitive TODOs land, rename remaining divergent call-site identifiers to match the shared primitive naming, and convert `let` to `const` where the variable is never reassigned. This is a cleanup TODO only after the structural extractions, not a standalone rewrite.  
**Approach:** Reuse the naming now established by the shared `useFormFields`/`useAsyncSubmit` primitives and existing React style; do not rename beyond what the audit flagged.  
**New file needed:** none  
**Verify:** No two names exist for the same concept across forms/hooks after extraction; `rg -n "\blet\b" <files>` shows only reassigning locals; type-check passes; existing tests still pass.  
**Dependency needed:** none

---
