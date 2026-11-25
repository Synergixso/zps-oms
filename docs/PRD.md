# Product Requirements (working summary) — ZPS-OMS

| Field | Value |
|---|---|
| Version | 1.1-md (25 Nov 2026) |
| Baseline | `docs/01_EXECUTIVE_AND_MASTER/ZPS-OMS_Master_PRD_and_Claude_Code_Blueprint_v1.0.docx` (Draft, 24 Nov 2026) — **unchanged**; this file records the working summary and deltas only |
| Status | Draft for institutional validation |

## 1. Vision
A centralised administrative platform supporting coordination, resource accountability and management reporting for Operations office bearers at Service HQ (Deputy Inspector General of Police - Operations (DIG Operations)), the ten Provincial Police Divisions and authorised Divisional Units — without altering the chain of command or delegations.

## 2. Users
13 roles (USER_ROLES_AND_PERMISSIONS.md). Personas from PRD §5.2 retained; "Provincial administrative officer" is now **Division Staff Ops** (DEC-002).

## 3. Scope
MVP: M01 Organisation registry, M02 Identity & access, M03 Requests & approvals, M04 Fleet & maintenance, M05 General assets, M06 Dashboards & reports, M09 In-app notifications, M10 Audit & security, M11 Platform operations. Later (separate approval): M07 Scheduling, M08 Correspondence metadata. Exclusions: PHASE2_ASSESSMENT.md §3.

## 4. Functional requirements
Unchanged from PRD v1.0 §7 (M01–M10, FR-WF-001…007). Traceability and status: REQUIREMENTS_TRACEABILITY.md. Detailed behaviour: MODULE_SPECIFICATIONS.md, WORKFLOW_SPECIFICATIONS.md.

## 5. Non-functional requirements
PRD v1.0 §12 NFR-001…014 unchanged. Prototype status in REQUIREMENTS_TRACEABILITY.md.

## 6. Deltas from PRD v1.0 introduced in this engagement
| Delta | Reason | Ref |
|---|---|---|
| Role "Division Staff Ops" replaces provincial admin officer | User instruction | DEC-002 |
| Additional roles: Organisational Registry Administrator, Authorised Operations Staff | Master prompt D12/D13 | DEC-007 |
| Approval authority = delegation + business role, not a role permission | Master prompt D4 | DEC-016 |
| Prototype DB = SQLite (built-in) rather than PostgreSQL | Not installed; zero funding | DEC-006 |
| Public pages: Landing, About, Features, Modules, Contact, Login | Master prompt H | — |

## 7. Acceptance
Definition of Done (master prompt Part R) applied per module; evidence in PHASE_COMPLETION_REPORT.md.
