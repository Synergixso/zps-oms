# Database Migration History

| Version | File | Date | Purpose |
|---|---|---|---|
| 001 | `001_core_schema.sql` | 2026-11-26 | MySQL schema v1: tenants, organisation units and types, effective-dated relationships, closure table, users, roles, assignments, delegations, sessions, login attempts, access reviews, administrative requests and workflows, fleet, assets, notifications, reports, contact messages, settings, hash-chained audit with immutability triggers |
| 002 | `002_personnel_manpower_assignments.sql` | 2026-11-26 | `must_change_password`; seed steps; approval actions; ranks; disposition statuses; personnel records, memberships, history; operational areas; manpower requests, contributions, entries; roster versions and entries; assignments, exceptions, transfers, renewals; disposition history; reference data (ranks, 15 dispositions, 6 exception categories, tenure settings) |
| 003 | `003_formation_type_rule.sql` | 2026-11-26 | Configuration: FORMATION → FORMATION parent/child rule |
| 004 | `004_automation_tasks_backups.sql` | 2026-11-26 | User references (`USR-`), roster references (`RST-`), contribution deadlines, notification categories and de-duplication keys, notification preferences, administrative tasks, automation `job_runs`, `backup_runs`, `error_logs`, platform settings (maintenance mode, automation interval, default deadline, backup age) |
| 005 | `005_manpower_workflows.sql` | 2026-11-26 | Versioned manpower approval chains (`manpower_workflows`) with provisional defaults; `workflow_id` and `current_level` on manpower requests |
| 006 | `006_asset_reconciliation_saved_reports.sql` | 2026-11-26 | Asset reconciliations and checklist items; saved custom report definitions |
| 007 | `007_three_tier_roles_and_stores.sql` | 2026-11-26 | 27-role catalogue columns, session role context, general stores and requisitions |
| 008 | `008_scheduled_report_delivery.sql` | 2026-11-26 | Report schedules and in-application deliveries |
| 009 | `009_decision_chains.sql` | 2026-11-26 | Versioned decision chains for assignment approval and transfer release |
| 010 | `010_backup_restore_drills.sql` | 2026-11-26 | Restore-drill records and setting |
| 011 | `011_audit_chain_head.sql` | 2026-11-26 | Audit chain head row (serialised appends) |
| 012 | `012_scheduling_and_correspondence.sql` | 2026-11-27 | Administrative calendar events; correspondence, its history and PDF documents; three settings (KNOWN_ISSUES 13) |

- All migrations are additive. They are applied automatically on server start and by `npm run db:migrate`. `npm run db:reset` (synthetic `zps_oms_*` databases only, with `--confirm-synthetic`) is the only destructive operation.
- Checksums prevent edited migrations from running. Migration 005 exists because a draft of 004 had already been applied to the development database: the guard refused the edited file, so the addition became a new migration, as required.
- Line-ending conversion is not an edit: `.gitattributes` keeps migration bytes unchanged in git, and the runner also accepts the LF and CRLF forms of an applied file.
