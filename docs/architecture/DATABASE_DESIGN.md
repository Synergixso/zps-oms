# Database Design (MySQL / MariaDB via XAMPP)

- **Engine:** InnoDB, utf8mb4_unicode_ci. Timestamps are ISO-8601 UTC strings (`CHAR(24)`), dates `CHAR(10)` (`YYYY-MM-DD`), so values compare and sort lexically and are identical across MariaDB and MySQL 8.
- **Migrations:** `db/migrations/NNN_name.sql`, applied in order by `src/server/db/migrate.ts`, recorded with SHA-256 checksums in `schema_migrations`. Applied migrations are immutable; changes go in a new file. History: `docs/development/DATABASE_MIGRATION_HISTORY.md`.
- **Integrity:** primary keys on every table; foreign keys for every reference; unique constraints for business identifiers (service number, personnel reference, all workflow references, one contribution per unit per request, one roster entry per officer per version); CHECK constraints for status vocabularies; audit table protected by `BEFORE UPDATE/DELETE` triggers.
- **Indexes:** on scope columns (`home_unit_id`, `responsible_unit_id`, `requesting_unit_id`, `contributing_unit_id`), statuses, review dates and names.
- **History, not deletion:** effective-dated relationships and memberships; `personnel_history`, `disposition_history`, `approval_actions`, `assignment_renewals`; closed assignments and superseded roster versions are kept. Business records are deactivated or closed, never hard-deleted.
- **Transactions:** every multi-row change runs in `tx()`; nested calls use savepoints. A transfer closes the old assignment, writes disposition history, creates the new assignment and completes the transfer in one transaction, so it either completes fully or rolls back (verified by the transfer tests).
- **Concurrency:** an officer's row is locked (`SELECT … FOR UPDATE`) when an assignment is created or approved, so one current assignment per officer holds under concurrent requests; optimistic `version` columns on editable records.

Table inventory and the mapping to the prompt's logical entities: `docs/development/CODEBASE_AUDIT.md` §3. Column-level reference: `docs/DATABASE_SCHEMA.md` and the migration files.
