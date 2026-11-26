# ZPS-OMS — Development Status

Updated 26 November 2026 (v0.6.0, final verification run). Status words follow the Master Execution Prompt Part XIII: Not Started · In Progress · Partially Implemented · Implemented · Tested · Completed and Verified · Blocked.
"Tested" means automated tests exist and pass (evidence: `docs/development/TEST_RESULTS.md`). "Completed and Verified" is reserved for modules whose institutional decisions are also settled — none yet, because tenure rules, delegations and the official establishment still need Service approval.

| # | Module | Status | Evidence / what remains |
|---|---|---|---|
| 01 | Organisation & multi-tenancy | **Tested** | Hierarchy, all 12 unit types under configurable type rules, closure, change workflow, directory tree, tenant management and formation-tenant provisioning. Remaining: drag-and-drop hierarchy builder (the tree plus structure-change form is the current builder) |
| 02 | Users, roles & access | **Tested** | 27-role three-tier catalogue (41 earlier roles retired), role context switching, scoped technical account support, scopes, delegations, lockout, temporary passwords, user references, authentication history, lockouts, session ending, temporary-access expiry. Transfer and renewal split into their own permissions; tenant and workflow configuration permissions. Remaining: further action-level splits where the Service requires them |
| 03 | Personnel registry | **Tested** | Registration, duplicate prevention and review, incomplete-record (unverified > 30 days) list, verification, corrections, membership, scope, export |
| 04 | Manpower requests & contributions | **Tested** | Full workflow, deadlines, automated reminders, overdue tracking, tasks |
| 05 | Roster builder | **Tested** | Build, integrity, references, versions, finalisation, server-generated PDF, print view, CSV |
| 06 | Operational areas | **Tested** | Register, edit (screened), profile with history, province / status filters, activate / deactivate |
| 07 | Assignments & disposition | **Tested** | Propose / approve / commence / register / disposition; review reminders and tasks |
| 08 | Transfers, tenure, renewals | **Tested** | Tenure rule, exceptions, transfer transaction, renewal; reports for tenure bands and transfers |
| 09 | Approval & workflow engine | **Tested** | Versioned, configurable manpower approval chains (multi-level, pinned per request); configurable administrative-request workflows; delegations; overdue escalation. Configurable, versioned chains for assignment approval and transfer release (v0.6.0). Remaining: exception and renewal decisions stay single delegated decisions |
| 10 | Fleet & transport | **Tested** | Register, maintenance lifecycle; service, licence and insurance reminders |
| 11 | General assets and stores | **Tested** | Register, custody, transfers, inspections, reconciliation; general stores (stock ledger, requisitions, issue) with reorder and overdue-requisition automation |
| 12 | Dashboards & reporting | **Tested** | 27 role-specific back offices; 14 reports (incl. 3 stores reports); saved custom reports; CSV and native Excel (.xlsx) export; scheduled in-app delivery (daily, weekly, monthly) |
| 13 | Notifications & tasks | **Tested** | Categories, preferences, reminders (de-duplicated), tasks with automatic closure |
| 14 | Audit & compliance | **Tested** | Hash chain, explorer, export, record history views, automated unusual-access flags |
| 15 | Platform administration | **Tested** | Automation engine and run log, verified mysqldump backups with re-verification, migration history, error log, maintenance mode, editable non-policy settings, version |
| 16 | Administrative scheduling | **Not Started** (later phase by design) | — |
| 17 | Correspondence | **Not Started** (later phase by design) | — |
| — | Automation engine (Part IX) | **Tested** | 13 jobs (incl. stores reminders and scheduled report delivery), retries, run log, lock, scheduler |
| — | Back-office UI redesign (Part X) | **Tested** | Owner dashboard mockup implemented for all 27 role workspaces; phone-width review 27/27 |
| — | Authentication (password) | **Tested** | Unit + e2e |
| — | 27 roles (three tiers) | **Tested** | Catalogue matrix, separation, context switching, scoped tech admin; synthetic accounts for every role (`docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md`) |
