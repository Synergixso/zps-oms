# Test Results

Run on 26 November 2026, Windows 11, Node.js 22.23.4, XAMPP MariaDB 10.4.32, Microsoft Edge (Playwright channel `msedge`). All data synthetic.

| Check | Command | Result |
|---|---|---|
| TypeScript (strict) | `npx tsc --noEmit` | Clean |
| Unit + integration (real MySQL `zps_oms_test`) | `npm test` | **91 / 91 passed**, 11 files |
| End-to-end (Edge, `zps_oms_e2e`, port 3200) | `npm run test:e2e` | **7 / 7 passed** |
| Route audit (production build, port 3300) | `node scripts/route-audit.mjs http://localhost:3300` | **74 routes × 48 users = 3,552 requests, 0 server errors** (1,097 rendered, 1,539 access-denied, 916 not-found-by-scope) |
| Production build | `npm run build` | Succeeds (two tracing warnings for the migration runner and the backup process spawn, expected) |

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
