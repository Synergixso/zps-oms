# ZPS-OMS — Repository, Documentation and Architecture Assessment

| Field | Value |
|---|---|
| Version | 1.0 · 25 November 2026 |
| Prepared by | Claude Code (developer support) under the master development prompt |
| Status | Developer assessment. Not an institutional approval. |
| Covers | Master prompt Part U items 1–17 |

Items that have their own controlling document are summarised here and cross-referenced.

---

## 1. Repository Assessment Report

**State found:** documentation-only repository, not under version control. No application code, no `package.json`, no BMAD installation.

| Area | Finding |
|---|---|
| Top level | `assets/zambia-police-service-crest.png`, `docs/` |
| Crest | PNG 339×197 RGBA, SHA-256 `6a73b71c…178a`; byte-identical to the copy in the UI concept |
| Docs | Phase 1 Master Documentation Package v1.2 (start-here README, master PRD v1.0, documentation pack v1.1, executive concept note, 9 discovery documents, tracker v1.2, Claude Code pack v1.2, superseded archive, manifest + SHA256SUMS) and UI/UX Concept v0.2 (static HTML/JS + 9 screen PNGs) |
| Tooling | Node 22.23.4, npm 10.9.9, git 2.56, Python 3.14; XAMPP (Apache, MySQL/MariaDB) present; **PostgreSQL not installed**; BMAD not installed |
| Action taken | `git init`; application scaffolded alongside the existing `docs/` (nothing deleted or overwritten); `.gitignore` excludes the local database and build output |

## 2. Source Documentation Inventory

| Document | Version | Status in sources | Use in this work |
|---|---|---|---|
| Phase 1 Master Index & Handover | 1.0 | Prepared | Orientation |
| Master PRD & Claude Code Blueprint | 1.0 (24 Nov 2026) | Draft | Primary requirements baseline (M01–M10, FR-WF-001..007, NFR-001..014) |
| Phase 1 Complete Documentation Pack | 1.1 | Prepared | Narrative baseline |
| Executive Concept Note | 1.0 | Prepared | Context |
| Discovery documents 01–09 | 1.0 | Prepared | Governance, data, security, test, change mgmt context |
| Requirements & Discovery Tracker | 1.2 (xlsx) | Current | Exit gates reference |
| Claude Code Phase 1 Pack | 1.2 | Current | Rules adopted into root `CLAUDE.md` |
| UI/UX Concept | 0.2 | Design reference | Visual language, tokens, 9 screens |
| Superseded archive (v1.0/v1.1 packs, trackers) | — | Superseded | Not used |

**Conflicts identified** (all logged in DECISION_REGISTER.md):
1. PRD uses "Provincial admin officer"; master prompt requires "Division Staff Ops" → DEC-002 (applied).
2. PRD prefers PostgreSQL; not installed, zero-funding → DEC-006.
3. Pack v1.2 prompt 03 says *do not prototype fleet or equipment inventories until validated*; master prompt Part T5 explicitly instructs building general fleet and asset management with synthetic data → followed the later, explicit user instruction; fleet/asset screens carry system-of-record warnings (DEC-009).
4. UI concept shows a static "Demo Officer" identity; master prompt requires role-specific, server-authorised back offices → implemented role simulator (DEC-005).
5. Public DIG Ops page vs Appendix D organogram naming → not hard-coded; registry is configurable (DEC-004).
6. "Unit Commander" and "CRM Administrator" labels were not found in any readable source; no such roles exist in the implementation.

## 3. Scope and Exclusion Compliance Matrix

| Exclusion (Part C4) | Status | How enforced |
|---|---|---|
| Districts, stations, posts as tenancy | Excluded | `org_units.unit_type` CHECK; change workflow only offers HQ office / division / formation |
| Training administration (incl. Lilayi, SPOM courses, Mukuma) | Excluded | No module, no data |
| HR & payroll, medical, biometric | Excluded | User record = synthetic display name + position title only |
| Intelligence, informants, surveillance | Excluded | No module; prohibited-term screening on asset text |
| Investigations, case management, evidence | Excluded | No module; request categories allowlisted |
| Tactical plans, patrol routes, live tracking, dispatch | Excluded | No location/route/mission fields in fleet schema |
| Firearms/armoury, sensitive equipment | Excluded | Asset category allowlist + term screening (`PROHIBITED_TERMS`) |
| Generic operational tasking | Excluded | Requests limited to 4 administrative categories |
| M07 scheduling, M08 correspondence | Not implemented | Later phase (DEC-021) |
| External integrations / notifications | Disabled | No outbound network code; setting recorded |

## 4. Institutional Organisational Model Proposal
See **ORGANISATIONAL_MODEL.md**. Summary: stable-ID, effective-dated `org_units` + `org_relationships`; four unit types; approval-controlled changes (create/rename/re-parent/deactivate) with separation of duties; historical relationships end-dated, never deleted; organisational changes never alter role assignments.

## 5. Complete User Role Catalogue
13 roles — see **USER_ROLES_AND_PERMISSIONS.md** and `docs/generated/PERMISSION_MATRIX.md`. No superadmin. Technical (Platform Admin), Security (Security Admin), Audit (Internal Auditor) and Business privileges are disjoint.

## 6. User-to-Module Permission Matrix
43 action-level permissions × 13 roles, generated from the enforced catalogue: `docs/generated/PERMISSION_MATRIX.md`. Module-level summary in USER_ROLES_AND_PERMISSIONS.md §3.

## 7. Back-office Dashboard Inventory

| Dashboard | Roles | Key content (all live from the synthetic DB) |
|---|---|---|
| National Operations Executive | DIG Ops Executive | Directory counts, open/overdue requests, my HQ approvals, status bars, ageing, fleet/asset aggregates, per-organisation aggregate table |
| National Coordination Workspace | HQ Ops Coordinator | Executive content + national assignment queue + overdue escalation list |
| Provincial Division Command | Provincial Commander | Division identity & validation note, my approvals, submissions to assign, maintenance approvals, status, fleet/asset summaries, recent activity |
| Division Operations Staff Workspace | **Division Staff Ops** | My drafts, returned to me, submitted/in review, approved-to-action, overdue, completed, shortcuts, notifications |
| Divisional Formation Command | Formation Commander | As provincial command, formation-scoped |
| Formation Administration Workspace | Formation Admin Officer | As staff workspace, formation-scoped |
| Fleet and Transport Workspace | Fleet Officer | Vehicles in scope, overdue service, maintenance workbench, due-date monitor |
| Assets and Equipment Workspace | Asset Custodian | Status counts, inbound transfers, inspection-due list |
| Audit and Compliance Workspace | Internal Auditor | Chain integrity, denied attempts, export count, grant expiry |
| Security Administration Workspace | Security Admin | Denied actions, auth events, suspended accounts, open reviews, IAM changes |
| Platform Administration Workspace | Platform Admin | App/DB/schema/user/session status — no business data |
| Organisation and Formation Administration | Org Registry Admin | Unit counts, pending changes |
| My Operations Workspace | Authorised Operations Staff | Own unit's requests only |

## 8. Functional Module Inventory

| Module | MVP? | Implemented | Notes |
|---|---|---|---|
| M01 Organisation registry | MVP | Yes | Directory (as-at date), unit detail + relationship history, change propose/approve/apply |
| M02 Identity & access | MVP | Yes | Provision, assign/revoke role+scope, delegations, suspend/deactivate, access reviews; production IdP/MFA not implemented (DEC-005) |
| M03 Requests & approvals | MVP | Yes | Full state machine, multi-level, return/resubmit, cancel, close, controlled reopen, escalation list, optimistic concurrency |
| M04 Fleet & maintenance | MVP | Yes | Register, admin updates, maintenance lifecycle, workshop referral, verification, service history |
| M05 General assets | MVP | Yes | Register (allowlist), issue/return, transfer/receive, inspect, repair, disposal, event history |
| M06 Dashboards & reports | MVP | Yes | 13 dashboards, 4 report definitions, audited CSV export with field allowlist |
| M07 Scheduling | Later | No | Separate approval required |
| M08 Correspondence metadata | Later | No | Separate approval required |
| M09 Notifications | MVP (in-app) | Yes | In-app only |
| M10 Audit & security | MVP | Yes | Hash-chained audit, explorer, evidence export, security events |
| M11 Platform operations | MVP | Partial | Health, schema, settings (read-only), counts; no backup automation |

## 9. Workflow Catalogue
19 workflows specified in **WORKFLOW_SPECIFICATIONS.md** (WF-01…WF-19) with preconditions, initiators, receivers, transitions, validation, errors, notifications, audit events and test references.

## 10. UI/UX Design System Assessment
UI concept v0.2 is a strong, appropriate base (restrained enterprise style, correct band order, crest in white lock-up). Gaps addressed: 9.5 px table text raised to 13 px; static identity replaced by real role context; non-functional buttons replaced by working actions; error/empty/loading states added; mobile overflow handled. See **UI_UX_DESIGN_SYSTEM.md**.

## 11. Technical Architecture Proposal
Modular monolith (ADR-001). See **SECURITY_ARCHITECTURE.md** §2 and **API_SPECIFICATION.md** for layers and contracts.

## 12. Database Model Proposal
22 tables — see **DATABASE_SCHEMA.md** and **DATA_DICTIONARY.md**.

## 13. Security and Privacy Assessment
See **SECURITY_ARCHITECTURE.md** and **THREAT_MODEL.md**. Legal applicability (Data Protection Act 2021, Cyber Security Act 2025, Cyber Crimes Act 2025, Electronic Government Act 2021) is listed for review — no legal interpretation is made.

## 14. Development Roadmap

| Increment | Content | State |
|---|---|---|
| 0 | Repository audit, decision/assumption registers | Done |
| 1 | Schema, policy engine, audit chain, seed, domain tests | Done |
| 2 | Shell, design system, public pages, demo sign-in | Done |
| 3 | Role dashboards; requests, approvals | Done |
| 4 | Fleet, maintenance, assets | Done |
| 5 | Reports/export, org registry, IAM, reviews, audit, security, platform | Done |
| 6 | Route audit across all roles; mobile checks | Done |
| 7 | Browser E2E suite (Playwright), axe accessibility scan, load test | **Not started** — requires downloading browser binaries (decision needed, free) |
| 8 | Workflow-definition editor with approval; report-definition admin | Blocked on DEC-008/012 |
| 9 | PostgreSQL adapter, IdP/MFA integration, backup automation | Blocked on DEC-005/006/023 |
| 10 | M07/M08 | Blocked on separate approval |

## 15. Requirements Traceability Matrix
See **REQUIREMENTS_TRACEABILITY.md**.

## 16. Open Decisions and Assumptions Register
See **DECISION_REGISTER.md** (23 entries; 13 Open) and **ASSUMPTIONS_REGISTER.md** (18 entries).

## 17. Zero-Funding Compliance Checklist

| Check | Result |
|---|---|
| Paid services, APIs, subscriptions, credits | None used |
| Cloud hosting | None — runs on `localhost:3100` |
| Commercial software / licences | None. Dependencies: next, react, react-dom (MIT), zod (MIT), server-only (MIT); dev: typescript (Apache-2.0), tailwindcss & @tailwindcss/postcss (MIT), vitest (MIT), @types/* (MIT) |
| Database | Node built-in SQLite — no install, no cost |
| Remote fonts / CDNs / telemetry | None (system font stack; CSP `default-src 'self'`) |
| Hardware / travel | None |
| Items that would need spend later | Production hosting, IdP/MFA, accreditation, penetration test, backup infrastructure (DEC-023) |
| Free-but-unapproved downloads deferred | BMAD installer, Playwright browser binaries, axe-core (DEC-020, roadmap 7) |
