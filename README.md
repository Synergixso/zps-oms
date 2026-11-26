# ZPS-OMS — Zambia Police Service Operations Management System

**Local synthetic-data prototype prepared for institutional review. Not an authorised production police system. Not connected to any Zambia Police Service network or data.**

A secure, modular administrative operations-support application for the Deputy Inspector General of Police - Operations (DIG Operations), the ten Provincial Police Divisions and authorised Divisional Units: organisation registry, identity & access with delegated approvals, administrative request workflows, fleet maintenance, general asset accountability, role-specific dashboards, audited reporting and a tamper-evident audit trail.

## Quick start
Requirements: Node.js ≥ 22.13 and XAMPP with MySQL/MariaDB running (free; no paid services).

1. Start **MySQL** in the XAMPP Control Panel.
2. Create the two local databases (once), e.g. in phpMyAdmin or the MySQL shell:
   `CREATE DATABASE zps_oms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` and the same for `zps_oms_test`.
3. Copy `.env.example` to `.env.local` and adjust the connection URLs (credentials live only in `.env.local`, which is git-ignored).

```powershell
npm install
npm run dev
```
Open http://localhost:3100 → **Secure sign-in** → pick a synthetic account (each is a different role and scope). On start the server applies pending migrations (`db/migrations/*.sql`) and loads the synthetic dataset only if the database has no users.

### Suggested review walkthrough
| Sign in as | Try |
|---|---|
| Demo Lusaka Division Staff Ops | Dashboard → New administrative request → submit; note you cannot approve |
| Demo Lusaka Division Commander | Approvals & queues → assign → approve / return; maintenance approval |
| Demo DIG Ops Executive | National aggregate dashboard; approve the level-2 (HQ) step of an administrative return; approve an org change |
| Demo Copperbelt Division Commander | Paste a Lusaka request URL → "not found or not within your authorised scope" |
| Demo Fleet Officer / Fleet Verification Officer | Maintenance lifecycle; verification must be by a different officer |
| Demo Asset Custodian (Lusaka → Copperbelt) | Transfer an asset; receive it as the Copperbelt custodian |
| Demo Platform Administrator | Provision a user, assign role + scope, record a delegation; note no business data |
| Demo Security Administrator | Security events, suspend a user, run an access review |
| Demo Internal Auditor | Read-only registers, audit explorer, evidence export, chain verification |

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm test` | 42 domain, permission, workflow, seed and migration tests against `zps_oms_test` (recreated each run) |
| `npm run build` / `npm start` | Production build / run (see DEPLOYMENT_GUIDE for the local cookie flag) |
| `npm run audit:routes` | Every route × every synthetic user against the running server → `docs/evidence/route-audit.md` |
| `npm run docs:permissions` | Regenerate the permission matrix from the enforced catalogue |
| `npm run db:migrate` | Apply pending SQL migrations to `DATABASE_URL` |
| `npm run db:reset` | Drop and recreate the local synthetic `zps_oms_*` database (destroys its data; reseeded on next start) |

## Technology
Next.js 16 (App Router, server actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Zod 4 · MySQL/MariaDB (XAMPP) via `mysql2` with versioned SQL migrations · Vitest. All MIT/Apache-licensed; ZMW 0.

## Documentation
Start with `docs/PHASE2_ASSESSMENT.md` (17-part assessment) and `docs/PHASE_COMPLETION_REPORT.md` (verification evidence). Governance: `docs/DECISION_REGISTER.md`, `docs/ASSUMPTIONS_REGISTER.md`, `docs/KNOWN_LIMITATIONS.md`. Full list in `docs/` (PRD, charter, organisational model, roles & permissions, modules, workflows, design system, screens, database, data dictionary, API, security, threat model, testing, deployment, traceability). Phase 1 source packages are preserved unchanged under `docs/00_…` to `docs/06_…`.
