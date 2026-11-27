# ZPS-OMS — Zambia Police Service Operations Management System

> **National Operations Personnel, Manpower and Administration Management Platform**
> Developed by Synergix Solutions · Designed and developed by SPOM Technical Services Section Team

**Status: v0.9.0 — software stage *Production candidate*; institutional approval: *Awaiting Formal Institutional Approval*; production deployment: not authorised** (`docs/final-delivery/PRODUCTION_READINESS_REPORT.md`, `docs/final-delivery/INSTITUTIONAL_APPROVAL_STATUS.md`). The application is not connected to any Zambia Police Service network or data. Every person, service number, roster and reference in this repository and its development seed data is synthetic.

---

## Contents
1. [What ZPS-OMS is](#1-what-zps-oms-is)
2. [Scope and exclusions](#2-scope-and-exclusions)
3. [Functional modules](#3-functional-modules)
4. [Organisational model and multi-tenancy](#4-organisational-model-and-multi-tenancy)
5. [Security model](#5-security-model)
6. [Architecture](#6-architecture)
7. [Repository layout](#7-repository-layout)
8. [Getting started (Windows + XAMPP)](#8-getting-started-windows--xampp)
9. [Commands](#9-commands)
10. [Synthetic accounts and review walkthrough](#10-synthetic-accounts-and-review-walkthrough)
11. [Testing and verification evidence](#11-testing-and-verification-evidence)
12. [Automation, backups and operations](#12-automation-backups-and-operations)
13. [Database and migrations](#13-database-and-migrations)
14. [Configuration](#14-configuration)
15. [Documentation index](#15-documentation-index)
16. [Contributing](#16-contributing)
17. [Licence](#17-licence)

---

## 1. What ZPS-OMS is
ZPS-OMS is a secure web platform for administering operations personnel and manpower across the Zambia Police Service. It supports the work of the office of the **Deputy Inspector General of Police - Operations (DIG Operations)**, the ten Provincial Police Divisions, their District Commands, Police Stations and Police Posts, and the Divisions/Formations with their Departments, Companies, Detachments, Platoons and Sections.

One Next.js project holds two things:

| Part | Path | Audience |
|---|---|---|
| **Public website** | `src/app/(public)` | The public, and officers before they sign in (about, leadership, services, contact, sign-in) |
| **Web application (back office)** | `src/app/app` | Authorised officers, signed in and limited to their role and organisational scope |

## 2. Scope and exclusions
**In scope (administrative records only):**
- The organisational registry and hierarchy.
- The personnel registry.
- Manpower requests and contributions, and duty rosters.
- Duty-area assignments, transfers and disposition records.
- The 365-day minimum tenure rule, with exceptions and renewals.
- Administrative requests and approvals.
- Fleet maintenance, general asset accountability and general stores (consumables only).
- Reporting, notifications and a tamper-evident audit trail.

**Permanently excluded:**
- GPS or live location, and patrol routes.
- Tactical deployment or positions, and dispatch.
- Command and control.
- Intelligence and informants, and investigations.
- Firearms and ammunition, and sensitive operational equipment.

An *assignment* is an administrative duty-area record. It is never a location. Terms that suggest excluded capability are blocked by validation (see `PROHIBITED_TERMS` in `src/server/domain/catalogue.ts`).

## 3. Functional modules
| Module | Highlights | Status |
|---|---|---|
| **Organisation registry** | Effective-dated hierarchy from HQ down to section. Approved structural changes rebuild the `org_unit_closure` table. Cycles are refused. Each unit carries its tenant. | Delivered |
| **Identity & access** | Users, role assignments with an organisational scope, delegations of approval authority, access reviews, account suspension. | Delivered |
| **Personnel registry** | Synthetic officer records with duplicate prevention on service number and national ID. Status history. | Delivered |
| **Manpower** | Manpower requests raised by a unit; contributions offered by subordinate units; approval through the workflow engine. | Delivered |
| **Rosters** | Versioned duty rosters built from approved manpower. Print and CSV export. | Delivered |
| **Assignments, transfers and disposition** | Duty-area assignments. The 365-day minimum tenure is enforced: earlier moves need an approved exception, and misconduct is always an available ground. Renewals and disposition records. | Delivered |
| **Administrative requests** | Draft, submit, review, assign, approve, return, reject and close, with multi-level routing. | Delivered |
| **Fleet maintenance** | Vehicle registry, maintenance requests, separation of duties between the requesting and verifying officers. | Delivered |
| **Asset accountability** | Asset register, custody transfer between units, receipt acknowledgement, reconciliation (stock-take). | Delivered |
| **General stores** | Store items, append-only stock ledger (receipt, issue, return, adjustment), requisitions to own or higher store with delegated approval and issue by the store keeper; reorder and overdue reminders. Consumables only. | Delivered |
| **Role back offices** | 31 role-specific workspaces in four levels (HQ, Division/Formation, District/Station, Section/Station): back-office name, navigation, live headline figures, quick actions and working panels per role; one active role context per session. | Delivered |
| **Reports** | 14 scoped reports, saved custom views, CSV and native Excel (.xlsx) export, scheduled in-application delivery (daily, weekly, monthly). | Delivered |
| **Audit** | A hash-chained, append-only audit log (database triggers prevent updates and deletes), an explorer, an evidence export and chain verification. | Delivered |
| **Platform & security** | Automation engine and run log, verified database backups, migration history, error log, maintenance mode, settings; security events, sessions, authentication history, lockouts. | Delivered |
| **Notifications & tasks** | In-app notifications by category with preferences, automated reminders, My tasks with automatic closure. | Delivered |
| **Workflow configuration** | Versioned, multi-level approval chains for manpower requests, assignment approval and transfer release; configurable administrative-request workflows; delegations. | Delivered |

The detailed specifications are in `docs/MODULE_SPECIFICATIONS.md` and `docs/WORKFLOW_SPECIFICATIONS.md`. The order in which modules are delivered is in [CHANGELOG.md](CHANGELOG.md).

## 4. Organisational model and multi-tenancy
```
National HQ (tenant t_zps)
├── 10 Provincial Divisions (tenants t_<province>)
│   └── District Commands → Police Stations → Police Posts
└── Divisions / Formations (e.g. Mobile Unit, tenant t_mu)
    └── Departments → Companies → Detachments → Platoons → Sections
```
- **Tenancy:** every organisation unit belongs to a tenant. Every business record (vehicle, asset, request, maintenance request, personnel record) stores the tenant of its owning unit. Isolation is enforced on the server, in the domain layer. Filtering in the browser is never relied on.
- **Hierarchy:** the hierarchy is held in `org_relationships`, which is effective-dated. The derived `org_unit_closure` table (ancestor, descendant, depth) answers "everything under this unit" in a single indexed query.
- **Scope of a role assignment:**
  - `UNIT`: the unit itself.
  - `SUBTREE`: the unit and everything below it.
  - `NATIONAL`: everything; only for assignments held at HQ.

## 5. Security model
- **Authorisation lives in the domain layer** (`src/server/domain/*`). Every function takes `(db, actor, …)` and checks permission, scope and tenant before reading or writing. Pages and actions never authorise on their own.
- **RBAC + ABAC:** permissions come from the enforced catalogue (`catalogue.ts`). Attribute checks cover scope, tenant, ownership and separation of duties.
- **Approval authority** requires a business role *and* an active delegation. It never follows from rank alone.
- **Out-of-scope reads** return 404 (`loadOr404`), so the existence of records outside a user's scope is never revealed.
- **Sessions:** random tokens, stored server-side only as a hash, in HttpOnly, SameSite cookies, with idle and absolute expiry.
- **Passwords:** scrypt hashes with per-user salts. Repeated failures lock the account temporarily, and every attempt is recorded.
- **Audit:** each event stores the hash of the previous event; appends are serialised so the chain cannot fork under concurrent requests. MySQL triggers reject `UPDATE` and `DELETE` on the audit table. Chain verification is available in the app and as `npm run verify:audit`.
- **Command and reporting:** directives flow down from the Inspector General through configured command offices, and status reports flow up, with parallel recipients, acting appointments and conflict referral (`docs/command-architecture/`). Authority comes from offices held, not roles or ranks.
- **Roles:** 31 roles in four levels (`docs/final-delivery/UPDATED_31_ROLE_CATALOGUE.md`). Technical administrators (Superadmin, HQ Tech, Division/Unit, District and Station system administrators) never hold personnel access or approval authority. The four Police Intelligence Officer roles (07, 19, 30, 31) hold only restricted liaison administration: metadata such as reference numbers, offices, dates, status and routing, with no content field and no access to personnel or operational registers (`docs/final-delivery/INTELLIGENCE_LIAISON_SCOPE_AND_ACCESS_CONTROLS.md`).
- **Database:** every connection runs in strict SQL mode, so values are never silently truncated.
- **Data hygiene:** synthetic data only; credentials only in `.env.local`, which is git-ignored; no paid or external services.

For more, see `docs/SECURITY_ARCHITECTURE.md` and `docs/THREAT_MODEL.md`.

## 6. Architecture
| Layer | Technology |
|---|---|
| UI | Next.js 16 App Router, React 19 Server Components, Tailwind CSS 4 |
| Mutations | Server actions validated with Zod 4 |
| Domain | TypeScript modules in `src/server/domain`: business rules, authorisation, audit |
| Data | MySQL 8 / MariaDB 10.4+ through `mysql2/promise`, raw parameterised SQL, savepoint-nested transactions |
| Schema | Versioned SQL migrations in `db/migrations`, checksum-verified |
| Tests | Vitest against a real MySQL test database; Playwright journeys; scripted route audit and phone-width review; GitHub Actions CI |

All dependencies are free and open source (MIT/Apache). Budget: ZMW 0.

## 7. Repository layout
```
assets/                 Official source assets (crest)
db/migrations/          Versioned SQL migrations (001_core_schema.sql, …)
docs/                   PRD, architecture, decisions, specifications, evidence
public/brand/           Web copy of the crest (byte-identical to assets/)
scripts/                Route audit, phone review, audit-chain verifier, documentation generator
.github/workflows/      Continuous integration
src/app/(public)/       Public website
src/app/app/            Authenticated web application
src/components/         Shared UI (including <Crest>)
src/server/actions/     Server actions (thin: validate → call domain)
src/server/auth/        Session and guard helpers
src/server/db/          Connection, migration runner, bootstrap, seed
src/server/domain/      Business rules, authorisation, audit
src/instrumentation.ts  Startup: migrate, then seed only if the database is empty
tests/                  Vitest suites, global setup, helpers
```

## 8. Getting started (Windows + XAMPP)
**Requirements:**
- Node.js 22.13 or later.
- Git.
- XAMPP with MySQL/MariaDB.

1. Start **MySQL** in the XAMPP Control Panel.
2. Create the local databases, once. Use phpMyAdmin or `C:\xampp\mysql\bin\mysql -u root`:
   ```sql
   CREATE DATABASE zps_oms_dev  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE zps_oms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `DATABASE_URL_TEST`. Outside a local review, use a dedicated, least-privilege MySQL user rather than `root`.
4. Install and run:
   ```powershell
   npm install
   npm run dev
   ```
5. Open <http://localhost:3100>.
   - The public website is at `/`.
   - Sign-in is at `/login`.
   - The back office is under `/app`.

On first start the server applies any pending migrations and then loads the synthetic dataset, but only if the database has no users. It never overwrites existing data.

## 9. Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm test` | Vitest suites against `zps_oms_test` (recreated once per run; every test runs inside a rolled-back transaction) |
| `npm run test:e2e` | Playwright end-to-end tests in Microsoft Edge against a dedicated `zps_oms_e2e` database (port 3200) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js and React rules), fails on any warning |
| `npm run test:security` | HTTP security probes against a running local server (headers, CSP, cookies, refusals) |
| `npm run build` / `npm start` | Production build and serve. For the local cookie flag, see `docs/DEPLOYMENT_GUIDE.md` |
| `npm run db:migrate` | Apply pending SQL migrations to `DATABASE_URL` |
| `npm run db:reset` | Drop and recreate the local `zps_oms_*` database. **Destroys its data.** Refuses any other database name |
| `npm run test:load` | Load and page-weight baseline against a running local server (production build recommended); writes `docs/evidence/load-test.md` |
| `npm run audit:routes` | Requests every route as every synthetic user against the running server; writes `docs/evidence/route-audit.md` |
| `npm run review:mobile` | Opens every role's dashboard at phone width, checks overflow and saves screenshots (`docs/evidence/mobile/`) |
| `npm run verify:audit` | Read-only verification of the whole audit hash chain |
| `npm run docs:permissions` | Regenerate the role catalogue, permission matrix, dashboard configuration and tier documents from the enforced configuration |

## 10. Synthetic accounts and review walkthrough
Every account is synthetic: `demo.*` usernames and "Demo" names. The development password for all of them is shown on the local sign-in page (development builds only) and defined in `src/server/db/constants.ts`. It is a published test value for local review only. There are 65 synthetic accounts covering all 31 roles, plus two appointment-only accounts (Sergeant, Constable); the per-role list is in `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and the user acceptance scripts in `docs/uat/`.

| Sign in as | Try |
|---|---|
| Superadmin (`demo.platform.admin`) | Provision a user, assign a role and scope, record a delegation; tenants; no personnel records |
| Inspector General (`demo.hq.readonly`) | National summary figures without record access; audit explorer and chain verification |
| DIG Operations (`demo.dig.exec`) | National dashboard; HQ-level approvals; organisation changes |
| HQ Tech (`demo.security.admin`) | Security events, account support, run jobs, backups and a restore drill |
| Staff I, Lusaka (`demo.lsk.staffops`) | New administrative request → submit; note that you cannot approve it |
| Formation Commanding Officer, Lusaka (`demo.lsk.commander`) | Approvals → assign → approve or return; maintenance approval |
| Copperbelt Formation CO (`demo.cb.commander`) | Open a Lusaka record URL → "not found or not within your authorised scope" |
| MTO Officer-in-Charge (`demo.fleet.officer`) | Two contexts (Lusaka, Mobile Unit): switch from the account menu; maintenance lifecycle |
| District Stores Officer, Kitwe (`demo.kitwe.stores`) | Stock ledger, reorder tasks, issue an approved requisition |
| Station Stores and Admin, Kitwe Central (`demo.kitwec.stores`) | Raise a stores requisition; OIC Station (`demo.kitwec.commander`) approves it |
| District System Administrator (`demo.kitwe.tech`) | Account support limited to Kitwe; no personnel access |
| Demo HQ Manpower Planning Officer (`demo.hq.staff`) | Operations Staff Workspace; accept a unit contribution; build, print and export a roster |
| Demo Copperbelt Assignment Coordinator (`demo.cb.assignments`) | Propose an assignment; initiate a transfer (tenure rule applies) |
| Demo Copperbelt Division Commander (`demo.cb.commander`) | Approve assignments, exceptions, renewals and transfer releases |
| Demo Mufulira Receiving Area Officer (`demo.mufulira.receiving`) | Accept a transfer into the receiving area |
| Police Intelligence Officer, Kitwe Central (`demo.kitwec.pio`) | Record a liaison reference (free text is refused) and submit it to Kitwe District |
| District Police Intelligence Officer, Kitwe (`demo.kitwe.pio`) | Record receipt, acknowledge, route onward to the Division; open `/app/personnel` → access denied |
| Inspector General (`demo.hq.readonly`) | National Command Overview; issue a directive to DIG Operations (no office can instruct the IG) |
| Area Commander, Mobile Unit (`demo.mu.acoy.commander`) | Submit one area report to Staff II, the Kitwe Operations Officer and the OC Kitwe; each acknowledges separately |
| Constable (`demo.mu.constable`) | Appointment-only access: own directives and reports only |
| National Police Intelligence Officer (`demo.hq.pio`) | Liaison activity register, organisational routing, audit history; station drafts are not visible |
| Demo Kitwe District Commander (`demo.kitwe.commander`) | District dashboard; personnel limited to Kitwe; a Lusaka record returns 404 |
| Demo A Company Administrative Officer (`demo.mu.acoy.admin`) | Select eligible officers for a contribution and submit |

## 11. Testing and verification evidence
- **Domain and integration tests** (`npm test`, 183 tests in 29 files, strict SQL mode) cover access control, tenant isolation, the 31-role matrix, the liaison boundary and the safe role migration, context switching, scoped technical administration, stores, workflows and decision chains, separation of duties, scheduled delivery, Excel export, backups and restore drills, audit-chain concurrency, migrations and the seed.
- **Playwright** (`npm run test:e2e`, Microsoft Edge): 8 journeys, the axe-core accessibility scan (`docs/evidence/accessibility.md`), the reflow/200 % zoom/tablet check (`docs/evidence/reflow.md`), the A4 print check (`docs/evidence/print.md`) and the Content Security Policy check.
- **Load and page-weight baseline** (`npm run test:load -- http://localhost:3100` against `npm run start`) — `docs/evidence/load-test.md`.
- **Route audit** (`npm run audit:routes`): every route against every user — `docs/evidence/route-audit.md`. **Phone-width review** (`npm run review:mobile`) — `docs/evidence/mobile/`.
- **CI**: `.github/workflows/ci.yml` (type check, ESLint with zero warnings, tests on MariaDB 10.4, dependency audit, build).
- **Evidence:** `docs/role-architecture/ROLE_TEST_RESULTS.md`, `docs/development/TEST_RESULTS.md`.

Before every change: `npx tsc --noEmit`, then `npm test`, then the route audit against a production build.

## 12. Automation, backups and operations
- **Automation engine** (`src/server/jobs/engine.ts`): starts with the server and runs every `automation.interval_minutes` (default 5). Jobs: effective-dated organisation changes, assignment commencement and review flags, contribution reminders and overdue tracking, tenure-review reminders, overdue-approval escalation, temporary-access expiry, fleet and asset reminders, stores reorder and requisition reminders, scheduled report delivery, unusual-access flags, backup monitoring, restore drills and housekeeping. Every run is logged in `job_runs`; Platform administration → *Run now* triggers one manually. Set `ZPS_AUTOMATION=off` to disable it.
- **Backups**: Platform administration → *Create backup now* runs XAMPP's `mysqldump` into `backups/` (git-ignored) and verifies the file by its completion marker and SHA-256. Set `MYSQLDUMP_PATH` if XAMPP is not in `C:\xampp`, or `ZPS_BACKUP_DIR` to change the folder. The backup monitor warns when the last verified backup is older than `backup.max_age_hours`. **Restore drills** (manual, and automatically every `backup.restore_drill_days`) restore the latest backup into a scratch database, check it and drop it.
- **Monitoring**: `GET /api/health` (readiness, 503 when degraded) and `GET /api/health?probe=live` (liveness).
- **Database accounts**: `db/admin/create_app_user.sql` creates a least-privilege application account and a read-only account. Run it once in phpMyAdmin with your own passwords, then update `.env.local`.

## 13. Database and migrations
- Migrations are plain SQL files named `NNN_description.sql` in `db/migrations/`. They are applied in order and recorded with a SHA-256 checksum in `schema_migrations`. Editing an applied migration is detected and refused; add a new migration instead.
- Timestamps are stored as ISO-8601 UTC strings; dates as `YYYY-MM-DD`.
- Destructive operations are restricted to databases named `zps_oms_*` and need an explicit `--confirm-synthetic` flag.
- Schema reference: `docs/DATABASE_SCHEMA.md` and `docs/DATA_DICTIONARY.md`.

## 14. Configuration
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection URL for the app, e.g. `mysql://user:pass@127.0.0.1:3306/zps_oms_dev` |
| `DATABASE_URL_TEST` | Test database. It must be named `zps_oms_test*` |
| `ZPS_INSECURE_COOKIE` | Set to `1` only to run a local production build over plain HTTP |
| `ZPS_AUTOMATION` | `off` disables the in-process automation engine (default: on) |
| `MYSQLDUMP_PATH` / `MYSQL_CLIENT_PATH` / `ZPS_BACKUP_DIR` | Location of `mysqldump` and `mysql` (defaults in `C:\xampp\mysql\bin`) and of the backup folder (default `backups/`) |
| `ZPS_SHOW_DEMO_ACCOUNTS` | `1` / `0` to show or hide the synthetic account list on the sign-in page (shown by default in development only) |

Put these in `.env.local`, which is never committed. `.env.example` documents them.

## 15. Documentation index
| Area | Documents |
|---|---|
| Direction | `docs/PRD.md`, `docs/PROJECT_CHARTER.md`, `docs/PHASE3_AUDIT_AND_ARCHITECTURE.md` |
| Governance | `docs/governance/INSTITUTIONAL_DECISIONS_PACK.md`, `docs/DECISION_REGISTER.md`, `docs/ASSUMPTIONS_REGISTER.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/REQUIREMENTS_TRACEABILITY.md` |
| Roles | `docs/role-architecture/` (catalogue, permission matrix, scope model, dashboards, tiers, approval authority, test results) |
| Acceptance | `docs/uat/` (plan, 31 role scripts, sign-off) |
| Design | `docs/ORGANISATIONAL_MODEL.md`, `docs/USER_ROLES_AND_PERMISSIONS.md`, `docs/MODULE_SPECIFICATIONS.md`, `docs/WORKFLOW_SPECIFICATIONS.md`, `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/SCREEN_SPECIFICATION.md` |
| Technical | `docs/DATABASE_SCHEMA.md`, `docs/DATA_DICTIONARY.md`, `docs/API_SPECIFICATION.md`, `docs/SECURITY_ARCHITECTURE.md`, `docs/THREAT_MODEL.md` |
| Operations | `docs/DEPLOYMENT_GUIDE.md`, `docs/development/KNOWN_ISSUES.md`, `docs/development/DEVELOPMENT_STATUS.md`, `docs/QA_AND_REVIEW.md`, `docs/evidence/` |
| History | [CHANGELOG.md](CHANGELOG.md); Phase 1 source packages preserved under `docs/00_…` to `docs/06_…` |

## 16. Contributing
1. Read the relevant domain module and its tests.
2. Change the domain first, with a test.
3. Then make the action and UI changes.
4. Run the typecheck, the tests and the route audit.
5. Update the traceability matrix, the decision register and the CHANGELOG.

Never commit real personnel data, credentials or `.env.local`. Keep the crest byte-identical, and render it only through `<Crest>`.

## 17. Licence
Released under the [MIT License](LICENSE) © 2026 Synergix Solutions. The Zambia Police Service name, crest and insignia are official marks. They are **not** covered by the MIT licence and may not be reused without authorisation.
