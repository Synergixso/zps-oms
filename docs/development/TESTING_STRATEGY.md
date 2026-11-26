# Testing Strategy

| Level | Tool | Where | What |
|---|---|---|---|
| Unit + integration | Vitest 5 against real MySQL `zps_oms_test` (recreated and seeded once per run; every test in a rolled-back transaction) | `tests/*.test.ts`, `npm test` | Access control and scope, tenant isolation, organisation hierarchy and type rules, authentication and lockout, 41 roles, personnel validation and duplicates, manpower and contributions, roster integrity and versions, tenure arithmetic, exceptions, transfers, renewals, workflows, audit events, migrations, seed |
| End-to-end | Playwright (installed Microsoft Edge) against `zps_oms_e2e` and a second dev server on port 3200 | `e2e/*.spec.ts`, `npm run test:e2e` | Login; isolation; assignment approval; renewal; transfer; roster build, print and export; access denial |
| Route audit | `scripts/route-audit.mjs` | `npm run audit:routes` (with `npm run dev`) | Every route × every synthetic user: renders, access-denied, 404 or server error |
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
