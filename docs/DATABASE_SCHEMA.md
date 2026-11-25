# Database Schema — ZPS-OMS

Source of truth: `src/server/db/schema.ts` (migration 001). Engine: SQLite via `node:sqlite` for the local prototype (ADR-003); SQL kept portable to PostgreSQL.

## Entity overview

```
org_units 1─* org_relationships *─1 org_units          org_change_requests ─> org_units, users
users 1─* role_assignments *─1 roles 1─* role_permissions
users 1─* delegations *─1 org_units                     sessions *─1 users
access_reviews 1─* access_review_items *─1 role_assignments
request_categories 1─* workflow_definitions 1─* admin_requests 1─* request_actions
vehicles 1─* maintenance_requests 1─* maintenance_actions;  vehicles 1─* service_records
asset_categories 1─* assets 1─* asset_events
notifications *─1 users;  report_definitions 1─* report_exports
audit_events (append-only, hash-chained);  app_settings;  schema_migrations
```

## Tables (22)
| Table | Purpose | Key constraints |
|---|---|---|
| `schema_migrations` | Applied migration versions | PK version |
| `org_units` | Organisation directory | `unit_type` CHECK (SERVICE_HQ, HQ_OFFICE, PROVINCIAL_DIVISION, FORMATION); `status` CHECK; unique `code` |
| `org_relationships` | Effective-dated parent links | FK child/parent; `relationship` CHECK |
| `org_change_requests` | Proposed structural changes | `change_type`, `status` CHECK; unique `reference` |
| `users` | Synthetic individual accounts | unique `username`; `status` CHECK |
| `roles`, `role_permissions` | Role catalogue mirror (for reporting/DB-level review) | `coverage` CHECK |
| `role_assignments` | Role + org scope + validity + justification | FKs; revocation columns |
| `delegations` | Approval authority | `domain` CHECK; `approval_ref` NOT NULL |
| `sessions` | Server-side sessions | PK = SHA-256(token) |
| `access_reviews`, `access_review_items` | Recertification | `decision` CHECK |
| `request_categories` | Approved category allowlist | — |
| `workflow_definitions` | Versioned approval steps (JSON) | unique (category, version) |
| `admin_requests` | Requests | FK workflow; `row_version` optimistic lock |
| `request_actions` | Workflow history | FK request, actor; workflow version, approval ref |
| `vehicles` | Fleet register (admin fields only) | unique fleet_ref, registration_ref; `status` CHECK |
| `maintenance_requests`, `maintenance_actions` | Maintenance lifecycle & history | — |
| `service_records` | Service history | — |
| `asset_categories` | Allowlist | `allowed` flag |
| `assets`, `asset_events` | Asset register & before/after event history | `condition`, `status` CHECK |
| `notifications` | In-app notifications | — |
| `report_definitions`, `report_exports` | Report catalogue & export register | FK report_code |
| `audit_events` | Append-only audit | `outcome`, `category` CHECK; triggers abort UPDATE/DELETE; `prev_hash`/`hash` chain |
| `app_settings` | Non-secret configuration | — |

Indexes: request origin+status, assignment user, vehicle org, asset org, notification user+read, audit entity.

## Migration and rollback
- Migrations are applied at start-up by `openDatabase()`; each records a row in `schema_migrations`. The seed runs only on first creation of the database.
- **Rollback (prototype):** stop the server, delete `data/zps-oms-synthetic.db*` (synthetic data only) — `npm run db:reset` — and restart to recreate v1. Future migrations must ship a paired down-script and be tested against a copy (`TESTING_STRATEGY.md` §migrations).
- **PostgreSQL port:** `TEXT` ids → `text`/`uuid`; `INTEGER` booleans → `boolean`; JSON text → `jsonb`; `AUTOINCREMENT` → identity; triggers → `CREATE FUNCTION … RAISE EXCEPTION` + `REVOKE UPDATE, DELETE ON audit_events`; `julianday()` → date arithmetic; add row-level security keyed on org scope as defence in depth.
