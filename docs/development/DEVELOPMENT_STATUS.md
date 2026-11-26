# ZPS-OMS — Development Status

Updated 26 November 2026 (v0.4.0, final verification run). Status words follow the Master Execution Prompt Part XIII: Not Started · In Progress · Partially Implemented · Implemented · Tested · Completed and Verified · Blocked.
"Tested" means automated tests exist and pass (evidence: `docs/development/TEST_RESULTS.md`). "Completed and Verified" is reserved for modules whose institutional decisions are also settled — none yet, because tenure rules, delegations and the official establishment still need Service approval.

| # | Module | Status | Evidence / what remains |
|---|---|---|---|
| 01 | Organisation & multi-tenancy | **Tested** | Hierarchy, all 12 unit types under configurable type rules, closure, change workflow, directory tree, tenant management and formation-tenant provisioning. Remaining: drag-and-drop hierarchy builder (the tree plus structure-change form is the current builder) |
| 02 | Users, roles & access | **Tested** | 41 roles, scopes, delegations, lockout, temporary passwords, user references, authentication history, lockouts, session ending, temporary-access expiry. Transfer and renewal split into their own permissions; tenant and workflow configuration permissions. Remaining: further action-level splits where the Service requires them |
| 03 | Personnel registry | **Tested** | Registration, duplicate prevention and review, incomplete-record (unverified > 30 days) list, verification, corrections, membership, scope, export |
| 04 | Manpower requests & contributions | **Tested** | Full workflow, deadlines, automated reminders, overdue tracking, tasks |
| 05 | Roster builder | **Tested** | Build, integrity, references, versions, finalisation, server-generated PDF, print view, CSV |
| 06 | Operational areas | **Tested** | Register, edit (screened), profile with history, province / status filters, activate / deactivate |
| 07 | Assignments & disposition | **Tested** | Propose / approve / commence / register / disposition; review reminders and tasks |
| 08 | Transfers, tenure, renewals | **Tested** | Tenure rule, exceptions, transfer transaction, renewal; reports for tenure bands and transfers |
| 09 | Approval & workflow engine | **Tested** | Versioned, configurable manpower approval chains (multi-level, pinned per request); configurable administrative-request workflows; delegations; overdue escalation. Remaining: configurable chains for assignment and transfer decisions (delegation-routed today) |
| 10 | Fleet & transport | **Tested** | Register, maintenance lifecycle; service, licence and insurance reminders |
| 11 | General assets | **Tested** | Register, custody, transfers, inspections, reconciliation (stock-take) records; inspection and custody reminders |
| 12 | Dashboards & reporting | **Tested** | Role dashboards; 11 reports; saved custom reports (columns, sort); CSV export. Remaining: scheduled report delivery |
| 13 | Notifications & tasks | **Tested** | Categories, preferences, reminders (de-duplicated), tasks with automatic closure |
| 14 | Audit & compliance | **Tested** | Hash chain, explorer, export, record history views, automated unusual-access flags |
| 15 | Platform administration | **Tested** | Automation engine and run log, verified mysqldump backups with re-verification, migration history, error log, maintenance mode, editable non-policy settings, version |
| 16 | Administrative scheduling | **Not Started** (later phase by design) | — |
| 17 | Correspondence | **Not Started** (later phase by design) | — |
| — | Automation engine (Part IX) | **Tested** | 11 jobs, retries, run log, lock, scheduler |
| — | Back-office UI redesign (Part X) | **Not Started** | Owner mockups received (login implemented; dashboard pending) |
| — | Authentication (password) | **Tested** | Unit + e2e |
| — | 41 roles | **Tested** | Catalogue test; one synthetic account per role |
