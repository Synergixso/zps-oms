# ZPS-OMS Phase 3 — Codebase Audit and Architecture Reconciliation

| Field | Value |
|---|---|
| Version | 1.0 · 26 November 2026 |
| Trigger | Master Development Directive — "National Operations Personnel, Manpower and Administration Management Platform" (Synergix Solutions) |
| Status | Stage 1 (audit) and Stage 2 (architecture) of the directive. Implementation proceeds in the stages listed in §6. |

---

## 1. Stage 1 — Existing codebase audit

### 1.1 What exists

| Area | State | Notes |
|---|---|---|
| Repository layout | Single Next.js 16 project (App Router) serving **both** the public website (`src/app/(public)`) and the authenticated web app (`src/app/app`). | Matches the instruction to keep the website and web app in one project folder. Retained as is. |
| Size | ~8,800 lines of TypeScript/TSX; 13 domain modules; 38 pages/actions call the data layer. | |
| Database | SQLite through Node's built-in `node:sqlite`, raw parameterised SQL, **synchronous** API; schema v3 (23 tables); idempotent migrations recorded in `schema_migrations`. | Must move to MySQL (XAMPP). |
| Authentication | Synthetic role simulator (pick an account; no password); hashed opaque session tokens; 30-min idle / 8-h absolute expiry. | Directive requires secure authentication with strong password hashing. |
| Authorisation | RBAC + organisational scope enforced in the domain layer; coverage `UNIT` / `NATIONAL`; approvals need a delegation plus a business role; deny by default; denials audited. | Sound core; needs **subtree** (descendant) coverage for the new hierarchy and 41 roles. |
| Organisation registry | Effective-dated units and relationships, approval-controlled changes, history preserved. Unit types limited to HQ, HQ office, Provincial Division, Formation by a database CHECK. | Must add District, Station, Post, Department, Company, Detachment, Platoon, Section; tenants; closure table. |
| Modules implemented | Administrative requests (multi-level workflow), fleet & maintenance, general assets, reports with audited export, audit explorer (hash-chained, append-only), security events, access reviews, contact inbox, notifications, platform health. | Retained. |
| Public website | Home, About, Features, Technical Team, How It Works, Contact, Login — owner-approved designs; shared photo hero. | Directive lists **Modules** in the public structure again; to be restored to the menu. |
| Tests | 40 Vitest tests (permissions, workflows, migrations, contact) + all-role route audit script. No browser E2E. | Directive asks for Playwright E2E. |

### 1.2 Fully implemented
Organisation registry (for the current unit types); identity & access (provisioning, role + scope, delegations, suspension, reviews); administrative request workflow; fleet & maintenance; general assets; reporting & export; audit; security events; notifications; contact inbox; role dashboards for the 13 current roles; public website.

### 1.3 Partially implemented / missing against the directive

| Requirement | Gap |
|---|---|
| MySQL via XAMPP | Not implemented (SQLite). |
| Secure password authentication | Not implemented (role simulator). |
| Hierarchical multi-tenancy | No `tenants`, no tenant id on records, no closure table, no subtree scope. |
| Territorial hierarchy below Division | District / Station / Post forbidden by schema and project rules. |
| Formation sub-structure | Department / Company / Detachment / Platoon / Section not representable. |
| Personnel registry | Not implemented (was an excluded capability). |
| Manpower requests, contributions, roster builder | Not implemented. |
| Operational areas, assignments, transfers, disposition, tenure, renewals, exceptions | Not implemented. |
| 41-role catalogue | 13 roles exist. |
| Role dashboards for district / station / post / formation sub-units | Not implemented. |
| PDF / print / Excel for rosters | Print styles exist; no roster documents. |
| Playwright E2E | Not installed. |

### 1.4 Broken functionality
None found: typecheck clean, 40/40 tests pass, production build passes, route audit 0 server errors (last run 26 Nov 2026).

### 1.5 Architectural weaknesses relevant to the new scope
1. **Synchronous data layer.** Every domain function is synchronous; any MySQL driver is asynchronous, so every domain call site must become `await`-based.
2. **Flat scope model.** `UNIT` coverage deliberately had no inheritance; the directive needs commanders to see their subordinate units (district → stations → posts; formation → companies → … → sections).
3. **Hard-coded exclusions.** `CHECK (unit_type IN …)`, `PROHIBITED_TERMS`, CLAUDE.md non-negotiables and DEC-001 encode exclusions the directive now reverses.
4. **Single-tenant identifiers.** No tenant column; national vs provincial ownership is implied by org unit only.

### 1.6 Database inconsistencies
None in the current schema. Note: the HQ-title data fix is migration 003; migration history must be re-based when moving to MySQL (fresh MySQL schema v1 with the current structure).

### 1.7 Security weaknesses to correct
| Weakness | Correction |
|---|---|
| No password authentication | Username + password; `scrypt` hashing (Node built-in; no paid or native dependency); lockout after repeated failures; MFA-ready schema. |
| No rate limiting on sign-in / public contact | Per-account and per-IP sign-in throttling stored in MySQL; contact limit retained. |
| Root DB account without password (XAMPP default) | Application reads credentials from `.env.local` (git-ignored); recommend a dedicated least-privilege MySQL user for ZPS-OMS. |
| CSP allows inline scripts | Unchanged for now (Next.js bootstrap); nonce-based CSP before any hosted deployment. |

---

## 2. Stage 2 — Architecture reconciliation

### 2.1 Repository
Keep one Next.js project ("monorepo" in one folder): public website + web app + server domain + database migrations + tests. No split into separate deployables.

### 2.2 Database: MySQL (MariaDB 10.4 under XAMPP)
- Driver: **`mysql2/promise`** with a thin, typed data-access layer (`all`, `one`, `run`, `tx`). The existing domain layer is hand-written, parameterised SQL with extensive tests; keeping SQL avoids rewriting proven logic into an ORM query language and avoids ORM engine downloads. (The directive permits "a suitable MySQL-compatible ORM such as Prisma" only where no data layer exists; one exists.)
- Migrations: versioned `.sql` files in `db/migrations/NNN_name.sql`, applied in order by `scripts/db-migrate.mjs` and recorded in `schema_migrations`. Migrations are additive; nothing is dropped without an explicit, approved, backed-up step.
- Databases: `zps_oms_dev` (application) and `zps_oms_test` (automated tests, recreated per run). Other databases on the server are never touched.
- Credentials: `DATABASE_URL` / `DATABASE_URL_TEST` in `.env.local` (git-ignored); `.env.example` documents the variables without secrets.
- Engine features used: InnoDB, utf8mb4, foreign keys, CHECK constraints, recursive CTEs, transactions. Audit immutability via `BEFORE UPDATE/DELETE` triggers raising `SIGNAL`.

### 2.3 Hierarchical multi-tenancy
- `tenants`: national root (Zambia Police Service) → 10 Provincial Division tenants → formation tenants (e.g. Mobile Unit Division / SPOM – Kamfinsa). Tenant = administrative environment; every tenant-owned row carries `tenant_id` **and** `org_unit_id`.
- `organization_units`: one table for all levels with `unit_type` ∈ {SERVICE_HQ, HQ_OFFICE, PROVINCIAL_DIVISION, DISTRICT, STATION, POST, FORMATION, DEPARTMENT, COMPANY, DETACHMENT, PLATOON, SECTION}, `branch` ∈ {TERRITORIAL, FORMATION}, effective dates, status, approval reference. Allowed parent/child pairs are configuration (`org_type_rules`), not hard-coded, so non-standard formations are supported.
- `organization_relationships` (effective-dated, as today) and **`organization_unit_closure`** (ancestor, descendant, depth) rebuilt transactionally on every structural change, for fast descendant checks and national roll-ups.
- Isolation is enforced only server-side: every list query joins the actor's permitted unit set (from the closure table); every record read re-checks scope.

### 2.4 Authorisation model (extended)
- Coverage per role permission: `UNIT` (assigned unit only), `SUBTREE` (assigned unit and all descendants), `NATIONAL` (all units; only for assignments at Service HQ).
- 41 roles from the directive, each with an explicit permission set and coverage; functional roles can be combined with organisational assignments; temporary and expiring assignments as today.
- Approval authority stays **delegation-based** (domain, org unit, category, validity, approval reference) plus a business role at that unit — never inferred from rank.
- Platform Super Administrator remains technical-only (no access to personnel records or approvals by default), as the directive states.

### 2.5 Personnel registry
- `personnel_records`: one canonical record per officer — unique personnel reference and unique service number, names, rank, service status, verification status, timestamps; minimum necessary data.
- `personnel_organization_memberships`: effective-dated home-unit membership (exactly one current home unit) plus optional sub-unit placement.
- Duplicates prevented by unique service number and a normalised-name + rank similarity check at registration.
- Scope: an organisational user sees personnel whose current home unit is within their permitted unit set.

### 2.6 Manpower requests, contributions and rosters
- `manpower_requests` → `manpower_request_requirements` (per contributing unit: numbers, ranks/categories) → `manpower_contributions` (the unit's submission) → `manpower_contribution_entries` (personnel ids, never re-typed names).
- Consolidation builds `manpower_roster_versions` (immutable once submitted) and `manpower_roster_entries` from approved contributions, with duplicate detection, active-assignment conflict checks and availability validation at build time and again at approval.
- States: Draft → Submitted → Reviewed → Approved → (Amended → Approved …) → Finalised. Every change to an approved roster creates a new version; earlier versions are never overwritten.
- Outputs: printable A4 roster (browser print to PDF), CSV/Excel export (authorised, audited).

### 2.7 Assignments, transfers, disposition, tenure
- `operational_areas` (administrative duty areas, e.g. "KCM Mine Operations — Kitwe"), owned by a responsible unit.
- `personnel_assignments`: personnel, home unit, receiving unit, area, commencement date, continuous-tenure start, review date, status, authorising officer/unit, source request.
- One active assignment per officer unless an approved exception exists (enforced in a transaction).
- `assignment_transfers`: releasing approval, receiving acceptance, effective date; on completion closes the old assignment and opens a new one (new commencement date) in one transaction.
- `assignment_renewals`: preserves the continuous-tenure start; sets next review date.
- `assignment_exceptions`: categories (Misconduct always available; Medical, Welfare, Safety, Legal, Exceptional service requirement configurable), justification, authoriser.
- Tenure policy setting: minimum 365 days (configurable, flagged "proposed — requires institutional authorisation"). Routine withdrawal/transfer before completion is refused unless an approved exception is linked.
- `assignment_disposition_history`: every status change with previous/new status, reason, authoriser, effective date, timestamp, reference.
- Boundary: an assignment is an **administrative duty-area record**, not a location. No GPS, routes, positions or live movement.

### 2.8 Authentication
- Username + password (scrypt, per-user salt, constant-time compare); account lockout after 5 failures for 15 minutes; sessions as today; password change; MFA fields reserved.
- The synthetic role simulator is retired from the login page; synthetic accounts receive passwords recorded in the seed file for local testing only.

### 2.9 Testing
- Vitest against a real MySQL test database (`zps_oms_test`), recreated per run.
- Multi-tenant isolation, scope (UNIT/SUBTREE/NATIONAL), duplicate prevention, roster integrity, tenure arithmetic, transfer atomicity tests.
- Playwright E2E (directive authorises it) for login, roster building, assignment, transfer and renewal flows.

---

## 3. Decisions that supersede earlier project rules
Recorded in DECISION_REGISTER.md as DEC-028 … DEC-036 (owner directive, 26 Nov 2026): scope extended to District/Station/Post and formation sub-units; personnel registry in scope (minimum data); MySQL via XAMPP; password authentication; hierarchical tenancy; 41-role catalogue; manpower/assignment modules; Modules page back in the public menu; Playwright authorised.

Boundaries that **remain**: no GPS or live location, patrol routes, tactical deployment, dispatch, intelligence/informants, investigations, firearms/ammunition, sensitive operational equipment.

## 4. Open questions for the Service (do not block development)
1. Exact tenure rule, renewal period and exception categories (365 days is the proposed default).
2. Which offices hold transfer and assignment approval authority at each level (configured as delegations).
3. Rank list and personnel categories to use in requests.
4. Official list of operational areas.
5. Footer credit: the directive names Synergix Solutions as developer; the owner asked to keep "SPOM Technical Services Section Team" — kept until told otherwise.

## 5. Risks
| Risk | Mitigation |
|---|---|
| Async migration of the whole data layer introduces regressions | Port module by module behind the existing 40 tests, then extend; route audit after each step. |
| Personal data in the registry | Synthetic data only; minimum fields; scope-checked reads; audited exports. |
| XAMPP MariaDB differs from MySQL 8 | Use features common to both; test against the actual XAMPP server. |

## 6. Implementation stages (from the directive)
1. ✅ Audit (this document). 2. ✅ Architecture (this document).
3. Database: MySQL data layer, migration runner, schema v1 on MySQL (current structure + tenancy, closure, extended unit types), synthetic seed.
4. Foundation: port the domain to async MySQL; password authentication; extended scope model; 41 roles.
5. Core: personnel registry → manpower requests & contributions → roster builder → assignments → transfers → disposition → tenure & renewals.
6. Supporting modules (existing fleet/assets/reports/audit carried over).
7. Role-specific dashboards for every level.
8. QA: Vitest on MySQL, Playwright E2E, responsive and print checks.
