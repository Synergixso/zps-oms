# ZPS-OMS — Zambia Police Service Operations Management System

> **National Operations Personnel, Manpower and Administration Management Platform**
> Developed by Synergix Solutions · Designed and developed by SPOM Technical Services Section Team

**Status: local synthetic-data prototype prepared for institutional review.** This is not an authorised production police system, and it is not connected to any Zambia Police Service network or data. Every person, service number, roster and reference in this repository and its seed data is synthetic.

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
12. [Database and migrations](#12-database-and-migrations)
13. [Configuration](#13-configuration)
14. [Documentation index](#14-documentation-index)
15. [Contributing](#15-contributing)
16. [Licence](#16-licence)

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
- Fleet maintenance and general asset accountability.
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
| **Asset accountability** | Asset register, custody transfer between units, receipt acknowledgement. | Delivered |
| **Dashboards** | A dashboard per role and level: national, provincial, district, formation and unit. | Delivered |
| **Reports** | Scoped operational reports with CSV export. | Delivered |
| **Audit** | A hash-chained, append-only audit log (database triggers prevent updates and deletes), an explorer, an evidence export and chain verification. | Delivered |
| **Platform & security** | System health, security events, sessions, sign-in lockout. | Delivered |

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
- **Audit:** each event stores the hash of the previous event. MySQL triggers reject `UPDATE` and `DELETE` on the audit table. Chain verification is available to auditors.
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
| Tests | Vitest against a real MySQL test database; scripted route audit |

All dependencies are free and open source (MIT/Apache). Budget: ZMW 0.

## 7. Repository layout
```
assets/                 Official source assets (crest)
db/migrations/          Versioned SQL migrations (001_core_schema.sql, …)
docs/                   PRD, architecture, decisions, specifications, evidence
public/brand/           Web copy of the crest (byte-identical to assets/)
scripts/                Route audit, permission-matrix generator
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
| `npm run build` / `npm start` | Production build and serve. For the local cookie flag, see `docs/DEPLOYMENT_GUIDE.md` |
| `npm run db:migrate` | Apply pending SQL migrations to `DATABASE_URL` |
| `npm run db:reset` | Drop and recreate the local `zps_oms_*` database. **Destroys its data.** Refuses any other database name |
| `npm run audit:routes` | Requests every route as every synthetic user against the running server; writes `docs/evidence/route-audit.md` |
| `npm run docs:permissions` | Regenerate the permission matrix from the enforced catalogue |

## 10. Synthetic accounts and review walkthrough
Every account is synthetic: `demo.*` usernames and "Demo" names. The development password for all of them is shown on the local sign-in page (development builds only) and defined in `src/server/db/constants.ts`. It is a published test value for local review only. There are 48 synthetic accounts covering all 41 roles.

| Sign in as | Try |
|---|---|
| Demo Lusaka Division Staff Ops | New administrative request → submit. Note that you cannot approve it |
| Demo Lusaka Division Commander | Approvals → assign → approve or return; maintenance approval |
| Demo DIG Ops Executive | National dashboard; HQ-level approvals; organisation changes |
| Demo Copperbelt Division Commander | Open a Lusaka record URL → "not found or not within your authorised scope" |
| Demo Fleet Officer / Fleet Verification Officer | Maintenance lifecycle; verification must be done by a different officer |
| Demo Asset Custodian | Transfer an asset across divisions; receive it at the other end |
| Demo Platform Administrator | Provision a user, assign a role and scope, record a delegation |
| Demo Security Administrator | Security events, suspend a user, run an access review |
| Demo Internal Auditor | Read-only registers, audit explorer, evidence export, chain verification |
| Demo HQ Manpower Planning Officer (`demo.hq.staff`) | Operations Staff Workspace; accept a unit contribution; build, print and export a roster |
| Demo Copperbelt Assignment Coordinator (`demo.cb.assignments`) | Propose an assignment; initiate a transfer (tenure rule applies) |
| Demo Copperbelt Division Commander (`demo.cb.commander`) | Approve assignments, exceptions, renewals and transfer releases |
| Demo Mufulira Receiving Area Officer (`demo.mufulira.receiving`) | Accept a transfer into the receiving area |
| Demo Kitwe District Commander (`demo.kitwe.commander`) | District dashboard; personnel limited to Kitwe; a Lusaka record returns 404 |
| Demo A Company Administrative Officer (`demo.mu.acoy.admin`) | Select eligible officers for a contribution and submit |

## 11. Testing and verification evidence
- **Domain and integration tests** run with `npm test` against real MySQL. They cover access control, tenant isolation, workflows, separation of duties, the seed, the hierarchy and closure table, migration idempotency, checksum drift and the reset safeguards.
- **Route audit** (`npm run audit:routes`) produces an access matrix of every route against every user: `docs/evidence/route-audit.md`.
- **Evidence and strategy:** `docs/TESTING_STRATEGY.md` and `docs/PHASE_COMPLETION_REPORT.md`.

Before every change: `npx tsc --noEmit`, then `npm test`, then `npm run audit:routes` with the dev server running.

## 12. Database and migrations
- Migrations are plain SQL files named `NNN_description.sql` in `db/migrations/`. They are applied in order and recorded with a SHA-256 checksum in `schema_migrations`. Editing an applied migration is detected and refused; add a new migration instead.
- Timestamps are stored as ISO-8601 UTC strings; dates as `YYYY-MM-DD`.
- Destructive operations are restricted to databases named `zps_oms_*` and need an explicit `--confirm-synthetic` flag.
- Schema reference: `docs/DATABASE_SCHEMA.md` and `docs/DATA_DICTIONARY.md`.

## 13. Configuration
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection URL for the app, e.g. `mysql://user:pass@127.0.0.1:3306/zps_oms_dev` |
| `DATABASE_URL_TEST` | Test database. It must be named `zps_oms_test*` |
| `ZPS_INSECURE_COOKIE` | Set to `1` only to run a local production build over plain HTTP |
| `ZPS_SHOW_DEMO_ACCOUNTS` | `1` / `0` to show or hide the synthetic account list on the sign-in page (shown by default in development only) |

Put these in `.env.local`, which is never committed. `.env.example` documents them.

## 14. Documentation index
| Area | Documents |
|---|---|
| Direction | `docs/PRD.md`, `docs/PROJECT_CHARTER.md`, `docs/PHASE3_AUDIT_AND_ARCHITECTURE.md` |
| Governance | `docs/DECISION_REGISTER.md`, `docs/ASSUMPTIONS_REGISTER.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/REQUIREMENTS_TRACEABILITY.md` |
| Design | `docs/ORGANISATIONAL_MODEL.md`, `docs/USER_ROLES_AND_PERMISSIONS.md`, `docs/MODULE_SPECIFICATIONS.md`, `docs/WORKFLOW_SPECIFICATIONS.md`, `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/SCREEN_SPECIFICATION.md` |
| Technical | `docs/DATABASE_SCHEMA.md`, `docs/DATA_DICTIONARY.md`, `docs/API_SPECIFICATION.md`, `docs/SECURITY_ARCHITECTURE.md`, `docs/THREAT_MODEL.md` |
| Operations | `docs/DEPLOYMENT_GUIDE.md`, `docs/TESTING_STRATEGY.md`, `docs/QA_AND_REVIEW.md`, `docs/evidence/` |
| History | [CHANGELOG.md](CHANGELOG.md); Phase 1 source packages preserved under `docs/00_…` to `docs/06_…` |

## 15. Contributing
1. Read the relevant domain module and its tests.
2. Change the domain first, with a test.
3. Then make the action and UI changes.
4. Run the typecheck, the tests and the route audit.
5. Update the traceability matrix, the decision register and the CHANGELOG.

Never commit real personnel data, credentials or `.env.local`. Keep the crest byte-identical, and render it only through `<Crest>`.

## 16. Licence
Released under the [MIT License](LICENSE) © 2026 Synergix Solutions. The Zambia Police Service name, crest and insignia are official marks. They are **not** covered by the MIT licence and may not be reused without authorisation.
