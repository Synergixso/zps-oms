# Module Catalogue

Status per module: `DEVELOPMENT_STATUS.md`. Modules 16 and 17 are later-phase and are not advertised as implemented.

| # | Module | Pages (implemented) | Key workflows | Domain |
|---|---|---|---|---|
| 01 | National Organisation & Multi-Tenant Management | Organisation directory (hierarchy tree, as-at date), organisation profile, structure changes | Propose / approve create, rename, re-parent, deactivate; type-rule validation; closure rebuild | `org.ts` |
| 02 | User, Roles & Access Management | Users & access, user profile (roles, scopes, delegations, credentials, status), roles & permissions, access reviews, security events, my profile | Provision; assign role + scope; delegate; suspend / deactivate; temporary password; unlock; access review | `iam.ts`, `auth.ts` |
| 03 | Central Personnel Registry | Personnel register, register officer, officer record | Register once; verify; correct; change home unit; disposition; export | `personnel.ts` |
| 04 | Manpower Requests & Contributions | Manpower requests, new request, request record, unit contributions, contribution | Create → review → approve; distribute; contribute; accept / return; reuse lists | `manpower.ts` |
| 05 | Roster Builder & Lists | Rosters, roster builder, print / PDF, CSV export | Build; validate; adjust; review; approve; amend (new version); finalise → assignments | `manpower.ts` |
| 06 | Operational Areas | Operational areas | Register; activate / deactivate | `assignments.ts` |
| 07 | Field Assignment & Disposition | Assignment register, propose assignment, assignment record | Propose; approve; commence; release / complete; disposition history | `assignments.ts` |
| 08 | Transfer, Tenure & Renewal | Transfers, transfer record; tenure panel and renewal on the assignment record | Initiate; releasing decision; receiving acceptance; exceptions; renewal | `assignments.ts` |
| 09 | Approval & Workflow Engine | Approvals & queues, workflow definitions | Delegated decisions across all modules | `requests.ts`, `policy.ts` |
| 10 | Fleet & Transport | Fleet register, vehicle, maintenance list / new / record | Maintenance lifecycle with verification | `fleet.ts` |
| 11 | General Assets | Asset register, asset, new asset | Custody, issue / return, transfer, inspection, disposal | `assets.ts` |
| 12 | Dashboards & Reporting | Role dashboards (20 kinds), reports, report detail, CSV export | Live scoped summaries | `reports.ts`, `dashboards.tsx` |
| 13 | Notifications & Tasks | Notifications | In-app notifications | `core.ts` |
| 14 | Audit & Compliance | Audit explorer, evidence export | Hash-chain verification | `audit.ts`, `auditq.ts` |
| 15 | Platform Administration | System health | — | — |
| 16 | Administrative Scheduling | — (later phase) | — | — |
| 17 | Correspondence | — (later phase) | — | — |
