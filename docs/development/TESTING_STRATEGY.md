# Testing Strategy

| Level | Tool | Where | What |
|---|---|---|---|
| Unit + integration | Vitest 5 against real MySQL `zps_oms_test` (recreated and seeded once per run; every test in a rolled-back transaction) | `tests/*.test.ts`, `npm test` | Access control and scope, tenant isolation, organisation hierarchy and type rules, authentication and lockout, the 27-role matrix, context switching, scoped technical administration, stores, decision chains, scheduled delivery, Excel export, restore drills, audit-chain concurrency, strict SQL mode, personnel validation and duplicates, manpower and contributions, roster integrity and versions, tenure arithmetic, exceptions, transfers, renewals, workflows, audit events, migrations, seed |
| End-to-end | Playwright (installed Microsoft Edge) against `zps_oms_e2e` and a second dev server on port 3200 | `e2e/*.spec.ts`, `npm run test:e2e` | Login; isolation; assignment approval; renewal; transfer; roster build, print and export; access denial |
| Route audit | `scripts/route-audit.mjs` | `npm run audit:routes` (with `npm run dev`) | Every route × every synthetic user: renders, access-denied, 404 or server error |
| Phone-width review | `scripts/mobile-review.mjs` | `npm run review:mobile` | Every role's dashboard at 375 × 812: horizontal overflow and screenshots |
| Audit-chain verification | `scripts/verify-audit-chain.mjs` | `npm run verify:audit` | Content and link integrity of every audit event |
| CI | GitHub Actions | `.github/workflows/ci.yml` | Type check, tests on MariaDB 10.4, production-dependency audit, build |
| Accessibility | axe-core 4.14.1 via `@axe-core/playwright` (MPL-2.0, dev only) | `e2e/accessibility.spec.ts` (part of `npm run test:e2e`) | WCAG 2.0/2.1/2.2 A and AA automated rules on 8 public pages and the dashboard and Help page of every role (62 page views); fails on any violation; report `docs/evidence/accessibility.md` |
| Reflow, zoom and tablet | Playwright | `e2e/reflow.spec.ts` (part of `npm run test:e2e`) | WCAG 2.2 SC 1.4.10 / 1.4.4 and tablet layouts: 8 public pages and every distinct back-office page reachable from each role's navigation (109 pages), at 320 px (400 % zoom), 640 px (200 % zoom), 768 px and 1024 px (tablet portrait and landscape); the page must not scroll sideways (wide tables scroll in their own region); report `docs/evidence/reflow.md` |
| A4 print | Playwright (print media + browser PDF) | `e2e/print.spec.ts` | Roster print view, a report, the dashboard and four public pages at the A4 printable width (180 mm): nothing wider than the paper, no content cut off in scroll regions, no on-screen navigation printed, PDF is A4 portrait; report `docs/evidence/print.md` |
| Content Security Policy | Vitest + Playwright | `tests/csp.test.ts`, `e2e/csp.spec.ts` | Nonce uniqueness and policy text; fresh nonce per request; Next.js scripts carry it; pages run with no violations; a stored-XSS simulation (inline `<script>` and `onerror` handler in the server HTML) is refused |
| Public site | Playwright | `e2e/public-site.spec.ts` | Navigation order (desktop and mobile), every internal public link resolves, `/modules` redirects permanently to `/features`, functional modules still reachable in the back office |
| Calendar, correspondence, sessions | Playwright | `e2e/admin-records.spec.ts` | Schedule an event; operational text refused; register correspondence; malicious PDF refused, clean PDF stored; download is a sandboxed attachment; own sessions and sign-in history |
| Load and page weight | `scripts/load-test.mjs` (dependency-free) | `npm run test:load -- http://localhost:PORT` against a production build | NFR-002/003 baseline: 300 requests per level at 1, 10 and 25 concurrent users across 27 signed-in roles; p50/p95/p99, throughput, server errors; gzip HTML weight per page; provisional budgets (DEC-066); report `docs/evidence/load-test.md` |
| Acceptance | UAT scripts | `docs/uat/` | One script per role, run by Service testers |
| Static | TypeScript strict | `npx tsc --noEmit` | Types across server and client |
| Build | Next.js | `npm run build` | Production compilation |

Mapping to the Master Execution Prompt Part XII tests A–J:

| Test | Covered by |
|---|---|
| A Register → request → contributions → roster → PDF | Unit: personnel + manpower tests · e2e: roster build, print, export (registration via unit test) |
| B Create and approve assignment, register | Unit criterion F · e2e assignment flow |
| C Early withdrawal restricted before one year | Unit criterion H |
| D Same-area renewal keeps commencement | Unit criterion I · e2e renewal |
| E KCM → Mopani transfer and histories | Unit criterion G · e2e transfer |
| F Other province's records denied | Unit isolation tests · e2e isolation · route audit |
| G Amended roster keeps approved version | Unit roster versions test |
| H Organisational reassignment revokes access | Unit "Test H" |
| I Approve and reject with history | Unit workflow, manpower and assignment tests |
| J Reports reflect database records | `tests/reports.test.ts` (dashboard summaries equal direct SQL counts, national and scoped) |

Results of each run: `TEST_RESULTS.md`.
