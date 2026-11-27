# End-to-End Test Results — v0.9.0

Run on 27 November 2026, Windows 11, Node.js 22.23.4, XAMPP MariaDB 10.4.32, Microsoft Edge (Playwright channel `msedge`). All data synthetic. Every result below was produced by running the command shown; nothing is inferred.

## Summary

| Check | Command | Result |
|---|---|---|
| TypeScript (strict) | `npx tsc --noEmit` | Clean |
| Domain and integration tests | `npm test` | **149 / 149 passed**, 24 files, strict SQL mode |
| Browser tests | `npm run test:e2e` | **15 / 15 passed** (see below) |
| Accessibility — dashboards and Help, 27 roles | `e2e/accessibility.spec.ts` | 0 violations, 61 page views (7 public pages after the Modules page removal) |
| Accessibility — v0.9.0 pages | `e2e/accessibility-modules.spec.ts` | 0 violations, 8 pages (`docs/evidence/accessibility-modules.md`) |
| Reflow, zoom and tablet | `e2e/reflow.spec.ts` | 0 overflowing pages: 7 public and 109 back-office pages at 320 / 640 / 768 / 1024 px (`docs/evidence/reflow.md`) |
| A4 print | `e2e/print.spec.ts` | 0 findings (`docs/evidence/print.md`) |
| Security probes over HTTP | `npm run test:security` | **14 / 14 passed** |
| Route audit | `npm run audit:routes` | **87 routes × 54 accounts = 4,698 requests, 0 server errors** (`docs/evidence/route-audit.md`) |
| Audit chain | `npm run verify:audit` | 14,702 events, 0 content and 0 link breaks |
| Production build | `npm run build` | Succeeds, 0 warnings |
| Load and page weight | `npm run test:load` | PASS (provisional budgets, DEC-066): 0 server errors at 1/10/25 users; back-office p95 972 ms at 10 users; security probes 14/14 also pass against the production build (`docs/evidence/load-test.md`) |
| Dependency audit | `npm audit --omit=dev` | 0 vulnerabilities |

## Browser tests (Playwright, Edge)

| Spec | What it proves | Result |
|---|---|---|
| `flows.spec.ts` (8) | Sign-in; tenant isolation (district sees only its personnel; a Lusaka record is a 404); assignment approval; renewal keeps the commencement date; KCM → Mopani transfer with both histories; roster accept, approve, print and export; context switching between two assignments | Passed |
| `admin-records.spec.ts` | Schedule an event; operational title refused; register correspondence; scripted PDF refused, clean PDF stored; download is a sandboxed attachment; own sessions and sign-in history | Passed |
| `public-site.spec.ts` | Navigation order on desktop and phone; every internal public link resolves; `/modules` → 308 → `/features`; functional modules still reachable after sign-in | Passed |
| `csp.spec.ts` | Fresh nonce per request; no violations on normal pages; stored-XSS simulation refused | Passed |
| `accessibility.spec.ts`, `accessibility-modules.spec.ts`, `reflow.spec.ts`, `print.spec.ts` | As in the summary | Passed |

**Defects found by the tests during this release and fixed:** the page CSP replaced the stricter download policy (admin-records); the roster print test expected the old hard-coded label (test updated to the environment stamp); two audit-count expectations in the new domain tests omitted the recorded denials (tests corrected). The full run had one failure (the roster label) and two tests not run after it in the same serial file; the journey file was re-run in full afterwards: 8 / 8 passed.

## Business processes (directive §14.2)

| Process | Evidence |
|---|---|
| Personnel: register, verify, prevent duplicates | `personnel-assignments` tests (criteria B) |
| Manpower: create, distribute, receive contributions | `manpower` tests; roster journey |
| Roster: consolidate, validate, approve, PDF | `manpower`, `extensions` tests; roster journey; A4 print test |
| Assignment: create, approve, commencement date | criterion F; assignment journey |
| Tenure: 365-day rule, early-withdrawal restriction | criterion H |
| Renewal keeps the original commencement date | criterion I; renewal journey |
| Transfer KCM Mine Operations (Kitwe) → Mopani Mine Operations (Mufulira) with both histories | criterion G; transfer journey |
| Disposition updated by approved changes | criteria F/G |
| Multi-tenancy across Provinces, Districts, Stations and formations | `access-control` tests; isolation journey; route audit; security probes |
| Fleet, assets, notifications, approvals, correspondence, scheduling | `workflows`, `extensions`, `notifications`, `scheduling-correspondence` tests; admin-records journey |
| Audit history of user and administrative actions | `audit-chain` test; every domain test checks its audit events |

## All 27 roles (directive §14.1)

Per-role results (accounts audited, pages rendered, refused and hidden, server errors) are in `ROLE_DASHBOARD_COMPLETION_MATRIX.md` and `PERMISSION_VERIFICATION_REPORT.md`, generated from the route audit. Each role's dashboard and Help page also pass the accessibility scan, and every page reachable from each role's navigation passes the reflow and tablet check.
