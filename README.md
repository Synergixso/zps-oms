# ZPS-OMS — Zambia Police Service Operations Management System

**Local synthetic-data prototype prepared for institutional review. Not an authorised production police system. Not connected to any Zambia Police Service network or data.**

A secure, modular administrative operations-support application for the Office of the Deputy Inspector General – Operations, the ten Provincial Police Divisions and authorised Divisional Units: organisation registry, identity & access with delegated approvals, administrative request workflows, fleet maintenance, general asset accountability, role-specific dashboards, audited reporting and a tamper-evident audit trail.

## Quick start
Requirements: Node.js ≥ 22.13 (uses the built-in `node:sqlite`; no database server, no paid services).

```powershell
npm install
npm run dev
```
Open http://localhost:3100 → **Secure sign-in** → pick a synthetic account (each is a different role and scope). The synthetic database is created and seeded on first start.

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
| `npm test` | 34 domain, permission, workflow and migration tests |
| `npm run build` / `npm start` | Production build / run (see DEPLOYMENT_GUIDE for the local cookie flag) |
| `npm run audit:routes` | Every route × every synthetic user against the running server → `docs/evidence/route-audit.md` |
| `npm run docs:permissions` | Regenerate the permission matrix from the enforced catalogue |
| `npm run db:reset` | Delete and recreate the synthetic database |

## Technology
Next.js 16 (App Router, server actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Zod 4 · SQLite via Node's built-in `node:sqlite` · Vitest. All MIT/Apache-licensed; ZMW 0.

## Documentation
Start with `docs/PHASE2_ASSESSMENT.md` (17-part assessment) and `docs/PHASE_COMPLETION_REPORT.md` (verification evidence). Governance: `docs/DECISION_REGISTER.md`, `docs/ASSUMPTIONS_REGISTER.md`, `docs/KNOWN_LIMITATIONS.md`. Full list in `docs/` (PRD, charter, organisational model, roles & permissions, modules, workflows, design system, screens, database, data dictionary, API, security, threat model, testing, deployment, traceability). Phase 1 source packages are preserved unchanged under `docs/00_…` to `docs/06_…`.
