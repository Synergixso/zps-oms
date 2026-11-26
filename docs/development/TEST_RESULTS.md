# Test Results

Run on 26 November 2026, Windows 11, Node.js 22.23.4, XAMPP MariaDB 10.4.32, Microsoft Edge (Playwright channel `msedge`). All data synthetic.

| Check | Command | Result (v0.8.2) |
|---|---|---|
| TypeScript (strict) | `npx tsc --noEmit` | Clean |
| Unit + integration (real MySQL `zps_oms_test`, strict SQL mode) | `npm test` | **130 / 130 passed**, 18 files (the per-file table below dates from v0.3 and lists the original suites) |
| End-to-end (Edge, `zps_oms_e2e`, port 3200) | `npm run test:e2e` | **10 / 10 passed**: 8 journeys, accessibility scan, reflow check |
| Accessibility (axe-core 4.14.1, WCAG 2.0/2.1/2.2 A and AA) | part of `npm run test:e2e` | **0 violations**, 62 page views (`docs/evidence/accessibility.md`) |
| Reflow and zoom (SC 1.4.10 / 1.4.4) | part of `npm run test:e2e` | **0 overflowing pages**: 115 pages at 320 px and 640 px, 230 checks (`docs/evidence/reflow.md`) |
| Load and page weight (production build, port 3300) | `npm run test:load -- http://localhost:3300` | **PASS** (provisional budgets, DEC-066): 0 server errors at 1/10/25 users; back-office p95 919 ms at 10 users; HTML ≤ 24.1 KB gzip (`docs/evidence/load-test.md`) |
| Route audit (dev server, port 3100) | `npm run audit:routes` | **83 routes × 54 accounts, 0 server errors** (`docs/evidence/route-audit.md`) |
| Audit chain | `npm run verify:audit` | 0 content breaks, 0 link breaks |
| Production build | `npm run build` | Succeeds, 0 warnings |

Note: a run of `npm test` at the same time as the Playwright suite timed out once in `migrations.test.ts` (it recreates and seeds a database while the e2e suite seeds another on the same MariaDB server). Run on its own it passes; run the two suites one after the other.

## Unit and integration suites
| File | Tests | Covers |
|---|---|---|
| `access-control.test.ts` | 24 | Scope isolation, cross-province denial, separation of duties, organisation changes and type rules (criterion A) |
| `auth-scope.test.ts` | 12 | Password hashing, sign-in, lockout, throttling, temporary passwords, 41 roles, SUBTREE scope, tenant isolation, Test H (reassignment revokes access), delegation hierarchy |
| `personnel-assignments.test.ts` | 9 | Criteria B, F, G, H, I: registration and duplicates, verification, home-unit history, assignment approval, tenure and exceptions, transfer transaction, renewal |
| `manpower.test.ts` | 7 | Criteria C, D, E: request workflow, routing, contributions, roster integrity, versions, finalisation, list reuse |
| `automation-platform.test.ts` | 13 | Automation jobs, reminders and tasks, temporary-access expiry, notification preferences, platform console, **real mysqldump backup with tamper detection**, multi-level workflow chains, tenants, areas, reports, history, session ending |
| `extensions.test.ts` | 5 | Finer action permissions, server-generated PDF, unusual-access flags, asset reconciliation, saved custom reports |
| `reports.test.ts` | 2 | Test J: dashboard and report figures equal direct SQL counts |
| `workflows.test.ts` | 8 | Administrative request and maintenance workflows |
| `migrations.test.ts` | 4 | Idempotent bootstrap and seed steps, checksum drift, line-ending tolerance, CHECK constraints, reset guard |
| `seed.test.ts` | 2 | Hierarchy, tenants, closure completeness, synthetic-only data |
| `contact.test.ts` | 5 | Public contact form |

## End-to-end journeys
1. System login: design elements, refused password, password reveal, successful sign-in.
2. Tenant isolation: district commander sees only district personnel; a Lusaka record returns 404.
3. Assignment proposed by a coordinator and approved by the delegated commander.
4. Renewal keeps the continuous start date and records renewal history.
5. Transfer: releasing approval, then receiving acceptance opens the new assignment at Mopani.
6. Roster: accept a contribution, build from registry records, print view, CSV export and PDF download.
7. A general staff member is refused manpower registers.

## Defects found and fixed during this verification
| Defect | Fix |
|---|---|
| Client forms submitted before hydration would fall back to GET, which could place field values (including a password) in the URL | Forms declare `method="post"` |
| Test selector matched Next.js's empty route-announcer alert | Assert on the message text |
| Audit run against the dev server failed when code changed mid-run (new columns before the migration was applied) | Audit now runs against a frozen production build; failures are retried and recorded rather than crashing |
| Migration draft edited after being applied | Split into a new migration (005); checksum guard working as designed; line-ending conversion tolerated |
