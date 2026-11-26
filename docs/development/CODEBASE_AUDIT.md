# ZPS-OMS — Phase 0 Codebase and MySQL Database Audit

**Date:** 26 November 2026 · **Version audited:** 0.3.0 (commit `a7c7080` plus working tree) · **Against:** Master Execution Prompt (Synergix Solutions), Parts I–XVI.
This audit describes the code as it exists. Status words: **Implemented** (code + automated test), **Implemented (untested UI)**, **Partial**, **Missing**.

---

## 1. Environment (verified)

| Item | Finding |
|---|---|
| OS / runtime | Windows 11 Pro, Node.js 22.23.4, npm |
| Database server | XAMPP MariaDB **10.4.32** (MySQL-compatible), `127.0.0.1:3306`, started from `C:\xampp\mysql\bin\mysqld.exe` |
| Credentials | `.env.local` (git-ignored): `DATABASE_URL` → `zps_oms_dev`, `DATABASE_URL_TEST` → `zps_oms_test`. Account is XAMPP's default `root` **without a password** — acceptable only for local synthetic review (see §8). |
| Databases | `zps_oms_dev` (application), `zps_oms_test` (Vitest, recreated per run), `zps_oms_test_mig` (migration tests), `zps_oms_e2e` (Playwright). No other database is touched. |
| Data access | `mysql2/promise`, raw parameterised SQL (`src/server/db/connection.ts`): pooled connections, savepoint-nested transactions, `withRollback` for tests. No ORM — an ORM is not introduced because a tested data layer exists (Prompt §2, "preserve it"). |
| Migrations | `db/migrations/001_core_schema.sql`, `002_personnel_manpower_assignments.sql`, `003_formation_type_rule.sql`; SHA-256 checksums in `schema_migrations`; edited migrations are refused. Applied automatically at start-up (`src/instrumentation.ts` → `bootstrap`). |
| Seed | Named synthetic seed steps in `seed_steps` (`001_base`, `002_personnel_manpower`); never run where a non-synthetic user exists; never modify existing rows. |
| Backups | **Missing** as an application function. Manual `mysqldump` documented in `docs/DEPLOYMENT_GUIDE.md`. |

## 2. Application structure

- One Next.js 16 project (App Router, React 19, TypeScript strict, Tailwind 4, Zod 4).
- **Public website** `src/app/(public)`: Home, About, Features, Modules, Technical Team, How It Works, Contact, System Login (owner design).
- **Back office** `src/app/app` — 52 pages and 4 export routes: dashboard; approvals; personnel (register, new, profile, export); manpower (requests, new, detail, contributions, contribution detail); rosters (index, builder, print, CSV); assignments (register, new, detail); transfers (list, detail); operational areas; administrative requests; fleet and maintenance; assets; reports; organisation directory, unit profile and structure changes; users, roles, access reviews; audit explorer and export; security events; workflow definitions; platform health; notifications; contact messages; profile; help.
- **Domain layer** `src/server/domain` (all authorisation and audit): `policy`, `catalogue`, `auth`, `sessions`, `iam`, `org`, `personnel`, `manpower`, `assignments`, `requests`, `fleet`, `assets`, `reports`, `audit`, `auditq`, `contact`, `core`, `lookup`.
- **Server actions** `src/server/actions` are thin: parse input, call the domain, revalidate.
- **Proxy** `src/proxy.ts` passes the request path so the session guard can enforce a forced password change.

## 3. Database (52 tables, InnoDB, utf8mb4)

Organisation: `tenants`, `org_units`, `org_type_rules`, `org_relationships` (effective-dated, typed `REPORTS_TO` / `ADMINISTERED_BY`), `org_unit_closure`, `org_change_requests`.
Identity: `users`, `roles`, `role_permissions`, `role_assignments`, `delegations`, `sessions`, `login_attempts`, `access_reviews`, `access_review_items`.
Personnel: `ranks`, `disposition_statuses`, `personnel_records`, `personnel_memberships`, `personnel_history`, `disposition_history`.
Manpower and rosters: `manpower_requests`, `manpower_contributions` (requirement + submission per unit), `manpower_contribution_entries`, `roster_versions`, `roster_entries`.
Assignments: `operational_areas`, `personnel_assignments`, `assignment_transfers`, `assignment_renewals`, `assignment_exceptions`, `exception_categories`.
Workflow and administration: `approval_actions`, `request_categories`, `workflow_definitions`, `admin_requests`, `request_actions`, `notifications`, `report_definitions`, `report_exports`, `contact_messages`, `app_settings`, `audit_events` (hash-chained; UPDATE/DELETE blocked by triggers), `seed_steps`.
Fleet and assets: `vehicles`, `maintenance_requests`, `maintenance_actions`, `service_records`, `asset_categories`, `assets`, `asset_events`.

Mapping to the prompt's logical entities: `organization_*` → `org_*`; `user_roles` + `user_organization_assignments` → `role_assignments` (role + unit + validity in one row); `personnel_status_history` → `personnel_history` + `disposition_history`; `manpower_request_requirements` + `manpower_participating_organizations` + `manpower_contributions` → `manpower_contributions` (one row per participating unit holds the requirement and the submission); `roster_approvals`, `workflow_instances/steps/approvals`, `assignment_transfer_decisions`, `assignment_history` → `approval_actions` (generic decision log) plus status columns; `audit_logs` → `audit_events`; `system_settings` → `app_settings`. **Not present:** `tenant_memberships`, `operational_area_relationships`, `assignment_tenure_reviews` (renewal decisions cover reviews), `administrative_tasks`, `job_logs`, `backup_logs`.

## 4. Feature status against the 17 modules

| Module | Implemented | Partial / missing |
|---|---|---|
| 01 Organisation & multi-tenancy | Tenants (national, 10 provincial, formation); all 12 unit types; configurable type rules; effective-dated typed relationships; closure table; cycle refusal; approval workflow for create / rename / re-parent / deactivate; directory tree; unit profile; as-at history (tests: seed, TS-15, criterion A) | **Missing:** Tenant Management page; Hierarchy Builder (visual); per-level directory pages (the tree and filters cover them); direct "edit details" for non-structural fields; organisation reference generation (codes are entered); default permission templates per new unit |
| 02 Users, roles & access | Provisioning, multiple role + scope assignments, expiry, delegations, suspension/deactivation (sessions end), access reviews, temporary passwords, lockout, password change, 41 roles (tests) | **Missing:** user references; active-sessions and authentication-history screens (data exists in `sessions`, `login_attempts`, `audit_events`); automatic notification of account changes; "users without valid assignment" flag; per-user session revocation |
| 03 Personnel registry | Canonical record, unique service number, similar-name confirmation, references, verification by a second officer, corrections with history, effective-dated home unit, scoped register with search / filter / sort / pagination / export, disposition (tests: criterion B) | **Missing:** Duplicate Record Review screen; incomplete-record alerts; verification notifications; dashboard "by province/district/formation/rank" views (available as filters) |
| 04 Manpower | Create, numbering, submit, review, recommend, return/resubmit, approve/reject (delegation), routing to units, contributions from eligible registry personnel, recall, accept/return, totals, list reuse with revalidation (tests: criterion C) | **Missing:** submission deadlines and overdue reminders; closed-request view (status filter only) |
| 05 Roster builder | Consolidation from accepted contributions, grouping (unit/rank/contributor), duplicate / conflict / eligibility / outdated detection, manual adjustments, review → approve → finalise, immutable versions and amendments, print view (browser PDF), CSV export (tests: D, E; e2e) | **Missing:** human roster references (e.g. `RST-2026-00001`); archive view; server-side PDF file generation |
| 06 Operational areas | Register, activate/deactivate (refused with current assignments), responsible unit, location-detail screening | **Missing:** edit area, area profile and assignment history pages; areas-by-province filter |
| 07 Assignments & disposition | Proposal, approval (delegation, separation of duties), commencement (time-driven), one current assignment per officer, overlap exception, register with all directive filters, disposition history (tests: F) | **Missing:** review reminders as notifications (review-due is a disposition flag) |
| 08 Transfers, tenure, renewals | Tenure calculation, configurable minimum, early-release block, exceptions (Misconduct always available), two-stage transfer in one transaction, renewals that keep the continuous start (tests: G, H, I; e2e) | **Missing:** dedicated Tenure / Released-personnel register pages (available as register filters); renewal reminders |
| 09 Workflow engine | Configurable versioned workflows for administrative requests; delegation registry; separation of duties everywhere; decision history (`approval_actions`, `request_actions`) | **Partial:** personnel-module workflows (manpower, roster, assignment, transfer) use fixed state machines with delegation-based authority — **not configurable**; no overdue escalation; no workflow reports |
| 10 Fleet | Register, maintenance lifecycle, workshop referral, verification, service history | **Missing:** maintenance reminders; missing-documentation alerts |
| 11 Assets | Register, custody, issue/return, transfer, inspection, disposal | **Missing:** reconciliation records; overdue-return and inspection reminders |
| 12 Dashboards & reports | Role dashboards for every dashboard kind (live queries); reports for requests, fleet, assets with CSV export | **Missing:** manpower, roster, assignment, tenure, renewal, transfer, disposition and approval reports; custom report builder; scheduled reporting; server PDF reports |
| 13 Notifications & tasks | In-app notifications for workflow events; mark read | **Missing:** tasks (assigned / overdue), notification preferences, reminder automation |
| 14 Audit & compliance | Hash-chained audit, explorer, export, chain verification, security events | **Missing:** per-domain history views (data exists); unusual-access flagging |
| 15 Platform administration | System health (DB version, health, audit chain) | **Missing:** migration history page, backup management, scheduled jobs and logs, error monitoring, maintenance mode, version page |
| 16 Scheduling (later phase) | — | Not started (by design) |
| 17 Correspondence (later phase) | — | Not started (by design) |

## 5. Automation engine

**Missing.** Time-driven transitions (assignment commencement, review-due flags, effective-dated organisation changes) are applied on each authenticated request (`getActor`). There is no job runner, `job_logs`, reminder generation, temporary-access expiry job, or backup monitoring. XAMPP provides no scheduler; an application-level runner is needed (Part IX).

## 6. Authentication and authorisation

- **Sound:** scrypt hashing, constant-time compare, lockout, device throttling, HttpOnly SameSite=Strict cookies, idle and absolute session expiry, forced change of temporary passwords, deny-by-default RBAC with UNIT / SUBTREE / NATIONAL scope resolved server-side, delegation-based approvals, 404 for out-of-scope records, denials audited, technical roles have no personnel access.
- **Weaknesses:** permissions are module-level verbs (e.g. `assignment.propose` covers propose / transfer / exception) rather than the finer names suggested in Part VII §7.2; the catalogue lives in code (`catalogue.ts`) and is synchronised to `roles` / `role_permissions` at start-up — role templates are not editable in the UI; MFA is schema-ready only; CSP still allows inline scripts.

## 7. UI/UX

- **Reusable components:** `PageHeader`, `Card`, `Stat`, `Badge`, `Table`, `DL`, `Timeline`, `Bar`, `Notice`, `ActionForm` / `Submit` / fields (server-validation aware), `PrintButton`, `Crest`.
- **Issues:** no global search, breadcrumbs or loading skeletons; dense forms on the record pages; dashboards are functional but visually plain compared with the owner's dashboard mockup; the sidebar has grown to six groups and needs collapsible sections; confirmation uses the browser `confirm()` dialog.

## 8. Risks and required changes

1. Local `root` without password → create a least-privilege `zps_oms_app` user (documented change; needs the owner to run SQL in phpMyAdmin).
2. Configurable workflow definitions for the personnel modules (Module 09).
3. Automation engine with job logs, reminders and backup monitoring (Part IX, Module 15).
4. Missing report set and per-domain history views (Modules 12, 14).
5. Tasks and notification preferences (Module 13).
6. Organisation tenant management and hierarchy builder (Module 01); user screens for sessions and authentication history (Module 02).
7. UI redesign of the back office to the owner's dashboard direction (Part X).

## 9. Verification baseline at audit time

- `npx tsc --noEmit`: clean. `npm run build`: succeeds (2 pre-existing tracing warnings in `migrate.ts`).
- `npm test`: **70 / 70** passing (8 files).
- Route audit and Playwright e2e: being re-run after this audit; results are recorded in `docs/development/TEST_RESULTS.md`.
