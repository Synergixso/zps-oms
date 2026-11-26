# User Roles and Permissions — ZPS-OMS

> **Superseded (26 November 2026).** This is the Phase 2 role model, kept for history. The active configuration is the three-tier 27-role catalogue (DEC-049): see `docs/role-architecture/ROLE_CATALOGUE.md`, `PERMISSION_MATRIX.md` and `APPROVAL_AUTHORITY_CONFIGURATION.md`, generated from the enforced code.

Status: **proposed starting matrix (DEC-007), not an approved delegation.** The authoritative machine-readable version is `src/server/domain/catalogue.ts`; the full action-level matrix is generated into `docs/generated/PERMISSION_MATRIX.md` (`npm run docs:permissions`).

## 1. Access model
- **RBAC + organisational ABAC.** A permission applies only through an active, unexpired, unrevoked role assignment `(user, role, org unit, valid_from, valid_to, justification)` held by an ACTIVE user.
- **Deny by default.** Unknown permission → denied. No role inherits another.
- **Coverage:** `U` own unit only; `N` national, only for assignments held at Service HQ.
- **Approval authority** is not a role permission. It requires an active delegation `(user, domain, org unit, category?, validity, approval_ref)` **and** an active BUSINESS-category role at the same org unit. Self-approval is refused. Technical, security, audit and functional roles can never approve.
- **Never from the browser.** Role, org, scope and permission are always derived server-side from the database on every request.
- **No self-administration.** Nobody can assign, revoke, delegate, suspend or certify their own access.
- **No superadmin.** Technical, security, audit and business privileges are disjoint.

## 2. Role catalogue

| # | Role | Category | Dashboard | Assignable at | Key rights | Explicitly cannot |
|---|---|---|---|---|---|---|
| D1 | DIG Operations Executive | Business | National Operations Executive Dashboard | HQ | National aggregates & reports; view HQ requests; decide HQ-level approvals with delegation; approve org changes with delegation | Record-level provincial/formation data; IAM |
| D2 | HQ Operations Coordinator / Secretariat Officer | Business | National Operations Coordination Workspace | HQ | National request register & assignment queue; close; national fleet/asset view; reports | Approve without delegation; IAM |
| D3 | Provincial Division Commander | Business | Provincial Division Command Dashboard | Division | Own division requests: assign, decide (delegated), close, reopen; maintenance approval (delegated); fleet/asset view; reports | Other provinces; technical admin |
| D4 | **Division Staff Ops** | Business | Division Operations Staff Workspace | Division | Create, edit, submit, cancel, progress requests; raise maintenance; view fleet/assets; reports | Assign or approve (unless a delegation is separately recorded) |
| D5 | Formation Commander | Business | Divisional Formation Command Dashboard | Formation | As D3, formation-scoped | Other formations |
| D6 | Formation Administrative Officer | Business | Formation Administration Workspace | Formation | As D4 + asset custody/inspection | Approve |
| D7 | Fleet Officer | Functional | Fleet and Transport Management Workspace | Any | Fleet register, maintenance processing & verification, service records, fleet reports — for granted units only | Requests, assets, personnel, IAM; approve |
| D8 | General Asset Custodian | Functional | Assets and Equipment Workspace | Any | Register, custody, transfer, inspect, dispose (approved categories) | Fleet, requests |
| D9 | Internal Auditor | Audit | Audit and Compliance Workspace | Any (time-limited ≤180 d) | Read-only registers, audit search, evidence export | Any write |
| D10 | Platform Administrator | Technical | Platform Administration Workspace | HQ | Provision users, assign/revoke roles, record delegations, system health | Any business record; self-changes |
| D11 | Security Administrator | Security | Security Administration Workspace | HQ | Security events, audit view, suspend, revoke, access reviews | Business approvals; provisioning |
| D12 | Organisational Registry Administrator | Business | Organisation and Formation Administration | HQ | Propose org changes | Approve own proposals |
| D13 | Authorised Operations Staff | Business | My Operations Workspace | Any | Create/submit/track own unit's requests | Everything else |

## 3. Module access summary (proposed)

| Role | Dashboard | Requests | Fleet | Assets | Reports | Administration |
|---|---|---|---|---|---|---|
| DIG Ops Executive | National | HQ records + delegated decisions | Aggregate only | Aggregate only | National aggregate + export | Org-change approval (delegated) |
| HQ Ops Coordinator | National | National view/assign/close; HQ create | National view | National view | National | — |
| Provincial Commander | Own division | Assign/decide (delegated)/close/reopen | View; maintenance approval (delegated) | View | Own division + export | — |
| Division Staff Ops | Own division | Prepare/submit/track/progress | View; raise maintenance | View | Own division (view) | — |
| Formation Commander | Own formation | As provincial | As provincial | View | Own formation + export | — |
| Formation Admin Officer | Own formation | Prepare/submit/track/progress | View; raise maintenance | Custody/inspect | Own formation (view) | — |
| Fleet Officer | Functional | — | Full fleet functions in granted units | — | Fleet + export | — |
| Asset Custodian | Functional | — | — | Full asset functions in granted unit | Assets + export | — |
| Internal Auditor | Audit | Read (national, time-limited) | Read | Read | View | Audit search/export |
| Platform Admin | Technical | — | — | — | — | Provisioning, grants, delegations, health |
| Security Admin | Security | — | — | — | — | Suspend, revoke, reviews, security events |
| Org Registry Admin | Registry | — | — | — | — | Propose org changes |
| Operations Staff | Own work | Own unit create/submit | — | — | — | — |

## 4. Seeded synthetic demonstration accounts

| Username | Role | Scope | Delegations |
|---|---|---|---|
| demo.dig.exec | DIG Ops Executive | HQ | Admin requests @HQ; Org change @HQ |
| demo.hq.coord | HQ Ops Coordinator | HQ | — |
| demo.lsk.commander | Provincial Commander | Lusaka | Admin requests, Maintenance @Lusaka |
| demo.lsk.staffops | Division Staff Ops | Lusaka | — |
| demo.cb.commander / demo.cb.staffops | Commander / Staff Ops | Copperbelt | Commander: requests, maintenance |
| demo.cen.commander / demo.cen.staffops | Commander / Staff Ops | Central | Commander: requests |
| demo.mu.commander / demo.mu.admin | Formation Commander / Admin Officer | Mobile Unit / SPOM | Commander: requests, maintenance |
| demo.ap.admin | Formation Admin Officer | Airport Division | — |
| demo.fleet.officer | Fleet Officer | Lusaka **and** Mobile Unit | — |
| demo.fleet.verifier | Fleet Officer | Lusaka | — |
| demo.asset.custodian / demo.asset.cb | Asset Custodian | Lusaka / Copperbelt | — |
| demo.auditor | Internal Auditor | HQ (national), expires 31 Mar 2027 | — |
| demo.platform.admin | Platform Admin | HQ | — |
| demo.security.admin | Security Admin | HQ | — |
| demo.org.registry | Org Registry Admin | HQ | — |
| demo.cen.staff | Authorised Operations Staff | Central | — |
