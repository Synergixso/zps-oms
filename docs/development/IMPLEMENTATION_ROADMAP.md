# ZPS-OMS — Implementation Roadmap (from the Phase 0 audit)

Order follows Master Execution Prompt Part XIV. Phases already delivered are kept and extended, not rebuilt.

| Phase | Scope | State | Next tasks |
|---|---|---|---|
| 0 | Codebase and database audit | Done | `docs/development/CODEBASE_AUDIT.md` |
| 1 | Architecture and database design | In progress | `docs/architecture/*` set (system, database, multi-tenancy, RBAC, workflow, security, decisions) |
| 2 | Multi-tenancy and hierarchy | Core done | Tenant management page; hierarchy builder; organisation detail edits; generated references |
| 3 | Authentication and 41 roles | Core done | Finer action permissions (create/update/approve/transfer/renew/release); sessions and authentication-history screens; per-user session revocation; unassigned-user flag |
| 4 | Personnel registry | Done | Duplicate-review screen; incomplete-record alerts |
| 5 | Manpower | Done | Submission deadlines; overdue contribution reminders |
| 6 | Roster builder | Done | Roster references; archive; server-side PDF (free library, no native deps) |
| 7 | Operational areas | Partial | Edit, profile, per-area history |
| 8 | Assignments and disposition | Done | Review reminders (via automation engine) |
| 9 | Transfers, tenure, renewals | Done | Tenure / released registers; renewal reminders |
| 10 | Workflow engine | Partial | Configurable workflow definitions for manpower, roster, assignment, transfer, exception and renewal; overdue escalation; workflow reports |
| 11 | Fleet and assets | Done (Phase 2) | Reminders; asset reconciliation |
| 12 | Dashboards and reporting | Partial | Personnel-module reports; report builder; back-office redesign to the owner mockup |
| 13 | Notifications and tasks | Partial | Tasks, preferences, reminder automation |
| 14 | Audit and compliance | Partial | Per-domain history views; unusual-access flags |
| 15 | Platform administration | Partial | Automation engine with job logs; backup management with mysqldump verification; migration history; error log; maintenance mode; version |
| 16 | Integration and e2e testing | Ongoing | Extend Playwright to Tests A–J in Part XII |
| 17 | Scheduling and correspondence | Later phase | Only after institutional approval |

## Update — v0.6.0 (26 November 2026)

All phases above are implemented and tested. Delivered since v0.4.0: the three-tier 27-role back offices (v0.5.0), phone-width review (v0.5.1), context-switch browser test (v0.5.2), and in v0.6.0 stores reports and automation, `platform.operate` enforcement for HQ Tech, scheduled report delivery, configurable assignment/transfer approval chains and native .xlsx export.

Remaining work depends on Service decisions, not engineering: modules 16 (administrative scheduling) and 17 (correspondence) are later-phase by design; SSO and the production database accounts await institutional decisions; delegations, permission templates and tenure rules await validation (DEC-008, DEC-055).
