# Comprehensive Existing System Audit

Recorded 27 November 2026 at the start of the Master Final Engineering Directive, against v0.9.0 (commit `dd7cd76`). The development database was backed up first (`backups/zps_oms_dev_pre_final_202611270855.sql`, git-ignored). Classifications use the directive's scheme (§4).

## What was inspected

| Area | Inspected | Condition found |
|---|---|---|
| Source code | 38 domain modules at the audit (39 now, with `paging.ts`), 16 server-action files, 68 back-office pages and 7 file routes, 8 public pages, automation engine, libraries | Domain-layer authorisation and audit throughout; strict TypeScript clean |
| Routes and layouts | Public site (7 pages + setup), back office (87 audited routes), API (`/api/health`), downloads and exports | Every route rendered, refused or hidden as expected for every account in the last route audit |
| Roles | 27 roles, workspaces, navigation, figures, quick actions | Match the directive's catalogue exactly; generated matrices current |
| Database | MariaDB 10.4 via XAMPP; migrations 001–012 with checksums; strict SQL mode; seed steps | Foreign keys, unique and CHECK constraints in place; audit chain verifies |
| Server actions and API | Validation (Zod), `toState` error mapping, same-origin checks on exports | Sound |
| Tests | 152 domain/integration tests, 15 browser tests, route audit, security probes, load test | Passing at v0.9.0 |
| Environment and build | `.env.example`, `ZPS_ENVIRONMENT`, CI workflow, production build | Build clean; CI had no lint step |

## Requirement classification

| Requirement | Classification at audit | Action taken |
|---|---|---|
| 17 functional modules (§5) | Fully implemented (verified at v0.9.0) | Re-verified; gaps below fixed |
| 27 role back offices (§6) | Fully implemented | Per-role verification document added (generated) |
| Public website and Modules removal (§8) | Fully implemented | Re-verified (`e2e/public-site.spec.ts`) |
| Registers: search and filters | Fully implemented | — |
| Registers: pagination (§5.1) | **Implemented but defective**: only the personnel and assignment registers paged; ten other registers stopped silently at 300–500 rows | Fixed: server-side pagination with a true total (T04) |
| Dashboard figures from genuine queries (§5, §14) | **Implemented but defective**: overdue requests, open maintenance, service-overdue vehicles, assets by status and stores queues were derived from those capped lists, so they could under-count at national volumes | Fixed: SQL counts and SQL filters over the whole scope (T05) |
| Registers: user-selectable sorting (§5.1) | Partially implemented (personnel register only) | Requests register sort added (T11); other registers keep a fixed, documented order |
| Loading and error states (§5.1) | **Partially implemented**: per-form pending states and messages existed; no navigation loading indicator or error boundary | Added (T10; see B11) |
| Transaction integrity (§12, §11.4 "database transaction failures") | Fully implemented, **not proven by a failure test** | Failure-injection tests added (T06) |
| Audit: previous value, resulting value, approval reference (§7.7) | **Partially implemented**: workflow action tables held from/to and unit; several audit events lacked them; personnel corrections recorded field names only | Audit events enriched; delegation reference recorded (T07) |
| CI: linting (§10) | **Not implemented**: no ESLint configuration | ESLint added with zero-warning gate in CI (T08); 9 React-hook findings fixed (T09) |
| Security hardening (§9) | Fully implemented for the application; independent testing outstanding | Re-verified; see `CYBERSECURITY_VERIFICATION.md` |
| Production environment, SSO/MFA, penetration test, malware scanning, identifier formats | Blocked by external dependency | Documented (X01–X05) |
| Institutional approval and deployment authorisation | Requires institutional approval | Recorded separately (`INSTITUTIONAL_APPROVAL_STATUS.md`) |

## Reused, not replaced

Authentication, session handling, the domain layer and policy engine, the migration runner, the automation engine, UI components (`ui.tsx`, `forms.tsx`), the route audit and the test harness were all kept. The pagination work added one helper (`paging.ts`) and one component (`pager.tsx`) used by every register, rather than ten separate implementations.
