# Project Roadmap

## Phase 1: Foundation ✅ (Complete)

- [x] Project setup with Next.js
- [x] Core component structure
- [x] Data fetching with TanStack Query
- [x] Basic filtering and search
- [x] Map view with Leaflet
- [x] Grid view
- [x] Submit form
- [x] Unmapped queue view (unmapped_startups table)

## Phase 2: Enhancement (In Progress — partially built)

- [~] Admin dashboard (built: custom JWT+bcrypt auth, submissions/users/analytics/settings pages)
- [~] User authentication (admin-only exists; end-user accounts are stub pages)
- [~] Email verification (`/verify/[token]` route exists, logic stub)
- [ ] Job listings (`/jobs*` stub pages)
- [~] Advanced search filters (area/sector/stage + search exist; URL-sync pending — see U2)
- [~] Analytics integration (GA/Plausible components written, not mounted — see U1)

## Phase 3: Scale

- [~] Real-time updates (only a stub `/api/ws` route; needs real WS/SSE design)
- [~] Multi-language support (en/hi locale files + use-translate hook written, unwired — see U6)
- [ ] Advanced analytics
- [ ] Mobile app
- [~] API public access (`/api/startups` read route exists; no public API program)

## Phase 4: Growth

- [ ] Partner integrations
- [ ] Premium features
- [ ] API marketplace
- [ ] Community features

> **Status legend:** [x] done · [~] partially built (see `docs/PRODUCTION_READINESS_TODO.md` phases) · [ ] not started.
> Updated 2026-09-13 after full codebase audit.
