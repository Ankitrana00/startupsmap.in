
---

## 📋 TODO: General Security Enhancements

### Priority: Varies ⭐⭐⭐

| Task ID | Description | Priority | Status | Owner | Due Date |
|---------|-------------|----------|--------|-------|----------|
| SEC-001 | Implement rate limiting on all API endpoints | High | ✅ Done | - | - |
| SEC-002 | Add CSRF protection for state-changing operations | High | ✅ Done | `csrf.ts` |
| SEC-003 | Implement Content Security Policy (CSP) | High | ✅ Done | `headers.ts` |
| SEC-004 | Enable HTTPS/HSTS in production | High | ✅ Done | `headers.ts` (Strict-Transport-Security present; verified in live headers) |
| SEC-005 | Set up security monitoring & alerting | Medium | ⬜ Todo | - | - |
| SEC-006 | Implement security headers testing in CI/CD | Medium | ⬜ Todo | - | - |
| SEC-007 | Add security.txt for vulnerability reporting | Low | ⬜ Todo | - | - |
| SEC-008 | Implement authentication hardening (NextAuth) | Medium | 🟡 Partial | Dead unwired `next-auth.ts` deleted 2026-09-13; live path is custom JWT+bcrypt. Remaining: rotate JWT_SECRET, review bcrypt cost | - |
| SEC-009 | Add input length limits to prevent DoS | Medium | ✅ Done | `api/submit/validate.ts` + `api/promote/validate.ts` (zod `.max` on all fields) |
| SEC-010 | Implement email validation for SMTP | Medium | ✅ Done | zod `.email()` on submit/promote schemas |

---

## 📋 TODO: Dependency Security

### Priority: Medium ⭐⭐

| Task ID | Description | Priority | Status | Owner | Due Date |
|---------|-------------|----------|--------|-------|----------|
| DEP-001 | Run `npm audit` regularly and fix vulnerabilities | High | ✅ Done (last: 2026-09-13, `pnpm audit --prod` — 0 vulnerabilities) | - |
| DEP-002 | Set up dependabot/alerts for GitHub | High | ✅ Done | `.github/dependabot.yml` |
| DEP-003 | Review and update dependencies monthly | Medium | ⬜ Todo | - | - |
| DEP-004 | Pin dependency versions (already done ✅) | High | ✅ Done | `package.json` |
| DEP-005 | Remove unused dependencies | Low | ✅ Done (2026-09-13: 37 packages removed, see PRODUCTION_READINESS_TODO.md Phase C2) | - |

---

## 📋 TODO: Testing & Verification

### Priority: High ⭐⭐⭐

| Task ID | Description | Priority | Status | Owner | Due Date |
|---------|-------------|----------|--------|-------|----------|
| TST-001 | XSS penetration testing (manual) | High | ⬜ Todo | - | - |
| TST-002 | SQL injection penetration testing | High | ⬜ Todo | - | - |
| TST-003 | Security header verification (automated) | Medium | ⬜ Todo | - | - |
| TST-004 | Authentication bypass testing | High | ⬜ Todo | - | - |
| TST-005 | Rate limiting effectiveness testing | Medium | ⬜ Todo | - | - |
| TST-006 | Regular security audit (quarterly) | High | ⬜ Todo | - | - |
| TST-007 | Create security test suite in CI/CD | Medium | ⬜ Todo | - | - |

---

## 📋 TODO: Documentation

### Priority: Medium ⭐⭐

| Task ID | Description | Priority | Status | Owner | Due Date |
|---------|-------------|----------|--------|-------|----------|
| DOC-001 | Security architecture document | High | ⬜ Todo | - | - |
| DOC-002 | Incident response plan | High | ⬜ Todo | `incident-response.md` |
| DOC-003 | Security policies document | Medium | ⬜ Todo | - | - |
| DOC-004 | Dependency security policy | Low | ⬜ Todo | - | - |
| DOC-005 | Security checklist for releases | Medium | ⬜ Todo | - | - |

---

## 🎯 Immediate Action Items (Next 7 Days)

### Priority: High ⭐⭐⭐

- [ ] **SQL-004:** Implement query timeout in database connection
- [ ] **SQL-005:** Create least-privilege database user for production
- [ ] **SEC-004:** Configure HSTS for production environment
- [ ] **DEP-001:** Run `npm audit` and address any high/critical vulnerabilities
- [ ] **TST-001:** Perform manual XSS penetration testing
- [ ] **TST-002:** Perform manual SQL injection testing

---

## 📈 Security Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| XSS Vulnerabilities | 0 | 0 | ✅ Good |
| SQL Injection Vulnerabilities | 0 | 0 | ✅ Good |
| High/Critical Dependencies | 0 | TBD | ⏳ Unknown |
| Security Headers Coverage | 100% | 100% | ✅ Good |
| Rate Limiting Coverage | 100% API | 100% | ✅ Good |
| Test Coverage (Security) | >80% | TBD | ⏳ Unknown |

---

## 🔄 Process & Workflow

### Security Review Checklist (Before Each Release)

- [ ] Run `npm audit` - no high/critical vulnerabilities
- [ ] Run `npm run typecheck` - 0 errors
- [ ] Run `npm run test:unit` - all tests pass
- [ ] Verify security headers on production/staging
- [ ] Check for new dependencies vulnerabilities
- [ ] Review recent dependency updates
- [ ] Verify rate limiting is working
- [ ] Check authentication flows
- [ ] Update security documentation if needed

---

## 📝 Notes

1. **Current Status:** XSS protection is fully implemented and tested. SQL injection protection is in place via parameterized queries.
2. **Focus Areas:** Next priority is database hardening (RLS, least privilege, query timeouts) and security testing.
3. **Regular Reviews:** Security should be reviewed quarterly at minimum.
4. **Dependencies:** Keep dependencies updated and monitor for vulnerabilities regularly.

---

**Document Version:** 1.0  
**Created:** 2026-09-12  
**Last Modified:** 2026-09-12

# Security Implementation TODO

> **Last Updated:** 2026-09-12  
> **Status:** In Progress  
> **Owner:** Security Team

---

## 📊 Overview

This document tracks all security implementations needed for StartupsMap.in, including XSS (Cross-Site Scripting), SQL Injection, and other security measures.

---

## ✅ Completed Security Implementations

### XSS Protection ✅ (Completed)

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| Phase 0 | Baseline verification | ✅ Done | - |
| Phase 1 | URL Sanitization (P0) | ✅ Done | `src/lib/security/sanitize.ts` |
| Phase 2 | HTML Escaping + Leaflet Boundary (P0) | ✅ Done | `buildPopup.ts` |
| Phase 3 | Carousel + Email Security (P1) | ✅ Done | `CarouselItem.tsx`, `email/send.ts` |
| Phase 4 | Security Headers + CSP (P2) | ✅ Done | `headers.ts`, `middleware.ts` |
| Phase 5 | Chart dangerouslySetInnerHTML Guard (P2) | ✅ Done | `chart.tsx` |
| Phase 6 | Final Verification | ✅ Done | Tests passing |

**XSS Documentation:** `docs/XSS_SECURITY_TODO.md`

---

## 📋 TODO: SQL Injection Hardening

### Priority: Medium ⭐⭐

| Task ID | Description | Priority | Status | Owner | Due Date |
|---------|-------------|----------|--------|-------|----------|
| SQL-001 | Audit all database queries for parameterization | High | ✅ Done | - | - |
| SQL-002 | Verify no string concatenation in SQL queries | High | ✅ Done | - | - |
| SQL-003 | Enable PostgreSQL prepared statements verification | Medium | ⏳ Pending | - | - |
| SQL-004 | Implement query timeout (statement_timeout) | Medium | ⬜ Todo | - | - |
| SQL-005 | Set up database user with least privilege | High | ⬜ Todo | - | - |
| SQL-006 | Enable Row Level Security (RLS) in Supabase/PostgreSQL | High | ⬜ Todo | - | - |
| SQL-007 | Add audit logging for database queries (production) | Low | ⬜ Todo | - | - |
| SQL-008 | Create SQL injection test cases | Medium | ⬜ Todo | - | - |
| SQL-009 | Document database security policies | Medium | ⬜ Todo | - | - |

