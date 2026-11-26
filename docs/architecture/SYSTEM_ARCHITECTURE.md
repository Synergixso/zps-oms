# System Architecture

## 1. Context
ZPS-OMS is a single Next.js application on Windows 11 that serves the public website and the authenticated back office, backed by MySQL (XAMPP MariaDB 10.4). It has no external services, paid APIs or outbound integrations (ZMW 0). It manages **administrative records only**: no GPS, patrol routes, tactical positions, dispatch, intelligence or surveillance.

```
Browser ──HTTPS──▶ Next.js 16 (Node.js)
                    ├─ src/app/(public)        public website, System Login
                    ├─ src/app/app             back office (server components)
                    ├─ src/server/actions      server actions: parse → domain → revalidate
                    ├─ src/server/domain       business rules + authorisation + audit
                    ├─ src/server/db           mysql2 pool, transactions, migrations, seed
                    └─ src/instrumentation.ts  start-up: migrate, sync role catalogue, seed steps
                                   │
                                   ▼
                    MySQL / MariaDB (XAMPP)  zps_oms_dev | zps_oms_test | zps_oms_e2e
```

## 2. Layers and rules
| Layer | Responsibility | Rule |
|---|---|---|
| Pages (React Server Components) | Render scoped data; show only actions the actor may take | Never the only authorisation check; call domain readers through `loadOr404` |
| Server actions / route handlers | Validate input shape, call one domain function, revalidate | No business logic; CSRF protected by Next.js origin checks |
| Domain (`src/server/domain`) | Every business rule, permission check, scope check, state transition, audit event | Every function is `async (db, actor, …)`; deny by default |
| Data (`src/server/db`) | Parameterised SQL, pooled connections, savepoint-nested transactions | No string-built user input in SQL |
| Database | Keys, foreign keys, unique and CHECK constraints, audit immutability triggers | Changed only through versioned migrations |

## 3. Module map
| Module | Domain file | Main pages |
|---|---|---|
| 01 Organisation & tenancy | `org.ts`, `lookup.ts` | `/app/org`, `/app/org/[id]`, `/app/org/changes` |
| 02 Users & access | `iam.ts`, `auth.ts`, `sessions.ts`, `policy.ts`, `catalogue.ts` | `/login`, `/app/admin/*`, `/app/profile`, `/app/security` |
| 03 Personnel | `personnel.ts` | `/app/personnel*` |
| 04–05 Manpower & rosters | `manpower.ts` | `/app/manpower*`, `/app/rosters*` |
| 06–08 Areas, assignments, transfers, tenure | `assignments.ts` | `/app/areas`, `/app/assignments*`, `/app/transfers*` |
| 09 Workflows | `requests.ts` (configurable), state machines in `manpower.ts` / `assignments.ts`, `approval_actions` | `/app/approvals`, `/app/workflows` |
| 10–11 Fleet & assets | `fleet.ts`, `assets.ts` | `/app/fleet*`, `/app/assets*` |
| 12 Dashboards & reports | `reports.ts`, `app/app/dashboards.tsx` | `/app`, `/app/reports*` |
| 13 Notifications | `core.notify` | `/app/notifications` |
| 14 Audit | `audit.ts`, `auditq.ts` | `/app/audit` |
| 15 Platform | — | `/app/platform` |

## 4. Cross-cutting
- **Time-driven events**: effective-dated organisation changes, assignment commencement and review-due flags are applied idempotently on each authenticated request (`getActor`). A dedicated job runner is planned (roadmap, Phase 15).
- **References**: human references (`PER-`, `MPR-`, `ASG-`, `TRF-`, `EXC-`, `REQ-`, `ORG-`) are generated inside the creating transaction; unique constraints guard against races.
- **Exports**: CSV with formula-injection neutralisation; every export is audited; print views produce PDF through the browser's print dialog.
- **Testing**: Vitest against real MySQL with per-test rollback; Playwright in Microsoft Edge against a dedicated database; route audit of every route × every synthetic user.
