# ZPS-OMS — Claude Code project instructions

Zambia Police Service Operations Management System — Operations personnel, manpower and administration management platform, developed by Synergix Solutions. **Local development uses synthetic data only.** The controlling requirements are the owner's Master Development Directive (26 Nov 2026) as reconciled in `docs/PHASE3_AUDIT_AND_ARCHITECTURE.md`; decisions are in `docs/DECISION_REGISTER.md` (DEC-028 … DEC-037 supersede earlier scope rules).

## Non-negotiables
- **Scope:** national HQ, ten Provincial Divisions, District Commands, Police Stations, Police Posts, Divisions/Formations and their Departments, Companies, Detachments, Platoons and Sections. Personnel registry, manpower requests, rosters, duty-area assignments, transfers, disposition, tenure and renewals are in scope.
- **Still excluded:** GPS / live location, patrol routes, tactical deployment or positions, dispatch, command and control, intelligence/informants, investigations, firearms/ammunition, sensitive operational equipment. An assignment is an administrative duty-area record, never a location.
- **Synthetic data only** in development (`demo.` usernames, "Demo" names, `SYN-` references, synthetic service numbers). Never real personnel, service numbers or rosters.
- **ZMW 0:** free dependencies only; no paid services, APIs or hosting.
- **Crest:** `public/brand/zambia-police-service-crest.png` byte-identical to `assets/…`; render only via `<Crest>`. Band order green/white/blue.
- **Official title:** "Deputy Inspector General of Police - Operations (DIG Operations)".
- **Footer credit:** keep "Designed and developed by SPOM Technical Services Section Team" (owner instruction).
- **One project folder:** public website (`src/app/(public)`) and web app (`src/app/app`) stay in this Next.js project.

## Architecture
- **Database:** MySQL (XAMPP MariaDB 10.4) via `mysql2`, raw parameterised SQL. Migrations are versioned `.sql` files in `db/migrations/`, applied by `npm run db:migrate`; never drop or rewrite data without an approved, backed-up step. Databases: `zps_oms_dev`, `zps_oms_test`. Credentials only in `.env.local` (git-ignored).
- **Domain layer** `src/server/domain/*` holds business rules **and all authorisation and audit**; every function is `async (db, actor, …)`. Never authorise only in a page or action.
- **Scope:** coverage `UNIT` / `SUBTREE` (via `organization_unit_closure`) / `NATIONAL` (HQ assignments only). Tenant isolation is server-side. Approval authority = delegation + business role, never rank.
- **Catalogue** `src/server/domain/catalogue.ts` defines permissions and roles (regenerate docs with `npm run docs:permissions`).
- Never trust org/role/user/tenant ids from the browser; out-of-scope reads → `notFound()` via `loadOr404`.

## Workflow for changes
1. Read the domain module and its tests. 2. Domain change first, with a test. 3. Then actions/UI. 4. Run `npx tsc --noEmit`, `npm test` (needs XAMPP MySQL running), and with `npm run dev` running, `npm run audit:routes`. 5. Update docs (traceability, decision register, CHANGELOG). Never claim a test passed without running it.

## Commands
`npm run dev` (port 3100) · `npm test` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run audit:routes` · `npm run docs:permissions`
