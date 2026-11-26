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
