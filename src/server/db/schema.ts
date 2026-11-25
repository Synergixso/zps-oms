/**
 * ZPS-OMS relational schema (migration 001).
 *
 * Local prototype engine: SQLite via Node's built-in `node:sqlite` (ADR-003).
 * The SQL deliberately avoids SQLite-only features other than the audit
 * immutability triggers, so it can be ported to PostgreSQL (the PRD's
 * preferred production candidate) with type substitutions only.
 *
 * Every business table carries `synthetic` = 1. Real Police data must never
 * be loaded into this prototype.
 */
/** Official title of the national office (owner-confirmed, 25 Nov 2026). */
export const DIG_OPS_TITLE = "Deputy Inspector General of Police - Operations (DIG Operations)";
export const HQ_NAME = `Service Headquarters — ${DIG_OPS_TITLE}`;
const LEGACY_HQ_NAME = "Service Headquarters — Office of the Deputy Inspector General (Operations)";

/** Ordered migrations. Structural DDL lives in SCHEMA_SQL (idempotent); `sql` holds one-off data changes. */
export const MIGRATIONS: ReadonlyArray<{ version: number; description: string; sql?: string }> = [
  { version: 1, description: "001 initial ZPS-OMS schema" },
  { version: 2, description: "002 public contact messages" },
  {
    version: 3,
    description: "003 correct the official DIG Operations title on the Service HQ record",
    sql: `UPDATE org_units SET name = '${HQ_NAME}' WHERE id = 'org_hq' AND name = '${LEGACY_HQ_NAME}';`,
  },
];
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL,
  description TEXT NOT NULL
);

-- M01 Organisation and Formation Registry --------------------------------
CREATE TABLE IF NOT EXISTS org_units (
  id             TEXT PRIMARY KEY,           -- stable internal identifier
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,              -- display name (provisional until validated)
  short_name     TEXT,
  unit_type      TEXT NOT NULL CHECK (unit_type IN ('SERVICE_HQ','HQ_OFFICE','PROVINCIAL_DIVISION','FORMATION')),
  status         TEXT NOT NULL CHECK (status IN ('ACTIVE','INACTIVE','SUPERSEDED')),
  effective_from TEXT NOT NULL,
  effective_to   TEXT,
  approval_ref   TEXT,
  validation_note TEXT,
  synthetic      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS org_relationships (
  id             TEXT PRIMARY KEY,
  child_id       TEXT NOT NULL REFERENCES org_units(id),
  parent_id      TEXT NOT NULL REFERENCES org_units(id),
  relationship   TEXT NOT NULL CHECK (relationship IN ('REPORTS_TO','ADMINISTERED_BY')),
  effective_from TEXT NOT NULL,
  effective_to   TEXT,
  approval_ref   TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS org_change_requests (
  id            TEXT PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  change_type   TEXT NOT NULL CHECK (change_type IN ('CREATE_UNIT','RENAME_UNIT','DEACTIVATE_UNIT','CHANGE_PARENT')),
  target_unit_id TEXT REFERENCES org_units(id),
  payload       TEXT NOT NULL,               -- JSON: proposed values
  reason        TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','APPLIED')),
  proposed_by   TEXT NOT NULL REFERENCES users(id),
  decided_by    TEXT REFERENCES users(id),
  decision_reason TEXT,
  approval_ref  TEXT,
  created_at    TEXT NOT NULL,
  decided_at    TEXT,
  applied_at    TEXT
);

-- M02 Identity, Roles and Access ------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,                -- synthetic label, never a real identity
  position_title TEXT NOT NULL,              -- configurable, provisional
  status       TEXT NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED','DEACTIVATED')),
  synthetic    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  status_reason TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('BUSINESS','FUNCTIONAL','AUDIT','TECHNICAL','SECURITY')),
  requires_expiry INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code  TEXT NOT NULL REFERENCES roles(code),
  permission TEXT NOT NULL,
  coverage   TEXT NOT NULL CHECK (coverage IN ('UNIT','NATIONAL')),
  PRIMARY KEY (role_code, permission)
);

-- A role assignment = role + organisational scope + validity window.
CREATE TABLE IF NOT EXISTS role_assignments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  role_code    TEXT NOT NULL REFERENCES roles(code),
  org_unit_id  TEXT NOT NULL REFERENCES org_units(id),
  valid_from   TEXT NOT NULL,
  valid_to     TEXT,
  justification TEXT NOT NULL,
  granted_by   TEXT REFERENCES users(id),
  revoked_at   TEXT,
  revoked_by   TEXT REFERENCES users(id),
  revoke_reason TEXT,
  created_at   TEXT NOT NULL
);

-- Approval authority is NOT derived from role or rank: it needs a delegation.
CREATE TABLE IF NOT EXISTS delegations (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  org_unit_id   TEXT NOT NULL REFERENCES org_units(id),
  domain        TEXT NOT NULL CHECK (domain IN ('ADMIN_REQUEST','MAINTENANCE','ORG_CHANGE')),
  category_code TEXT,                        -- NULL = all categories in domain
  valid_from    TEXT NOT NULL,
  valid_to      TEXT,
  approval_ref  TEXT NOT NULL,
  granted_by    TEXT REFERENCES users(id),
  revoked_at    TEXT,
  revoked_by    TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,              -- SHA-256 of the opaque cookie token
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_reviews (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('OPEN','COMPLETED')),
  opened_by   TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS access_review_items (
  id            TEXT PRIMARY KEY,
  review_id     TEXT NOT NULL REFERENCES access_reviews(id),
  assignment_id TEXT NOT NULL REFERENCES role_assignments(id),
  decision      TEXT CHECK (decision IN ('RETAIN','REVOKE')),
  decided_by    TEXT REFERENCES users(id),
  decided_at    TEXT,
  note          TEXT
);

-- M03 Administrative Requests ---------------------------------------------
CREATE TABLE IF NOT EXISTS request_categories (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id            TEXT PRIMARY KEY,
  category_code TEXT NOT NULL REFERENCES request_categories(code),
  version       INTEGER NOT NULL,
  approval_steps TEXT NOT NULL,              -- JSON array of {level, approverScope}
  status        TEXT NOT NULL CHECK (status IN ('ACTIVE','RETIRED')),
  note          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  UNIQUE (category_code, version)
);

CREATE TABLE IF NOT EXISTS admin_requests (
  id              TEXT PRIMARY KEY,
  reference       TEXT NOT NULL UNIQUE,
  category_code   TEXT NOT NULL REFERENCES request_categories(code),
  workflow_id     TEXT NOT NULL REFERENCES workflow_definitions(id),
  title           TEXT NOT NULL,
  details         TEXT NOT NULL,
  priority        TEXT NOT NULL CHECK (priority IN ('ROUTINE','PRIORITY')),
  origin_org_id   TEXT NOT NULL REFERENCES org_units(id),
  status          TEXT NOT NULL,
  current_level   INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT NOT NULL REFERENCES users(id),
  assigned_to     TEXT REFERENCES users(id),
  due_date        TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  submitted_at    TEXT,
  closed_at       TEXT,
  row_version     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS request_actions (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES admin_requests(id),
  actor_id      TEXT NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  approval_level INTEGER,
  reason        TEXT,
  workflow_version INTEGER NOT NULL,
  approval_ref  TEXT,
  created_at    TEXT NOT NULL
);

-- M04 Fleet ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id               TEXT PRIMARY KEY,
  fleet_ref        TEXT NOT NULL UNIQUE,
  registration_ref TEXT NOT NULL UNIQUE,     -- synthetic placeholder, never a real plate
  make             TEXT NOT NULL,
  model            TEXT NOT NULL,
  vehicle_class    TEXT NOT NULL,
  custody_org_id   TEXT NOT NULL REFERENCES org_units(id),
  status           TEXT NOT NULL CHECK (status IN ('IN_SERVICE','UNDER_MAINTENANCE','AWAITING_DISPOSAL','DISPOSED')),
  next_service_due TEXT,
  licence_expiry   TEXT,
  insurance_expiry TEXT,
  synthetic        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id            TEXT PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  vehicle_id    TEXT NOT NULL REFERENCES vehicles(id),
  org_unit_id   TEXT NOT NULL REFERENCES org_units(id),
  service_type  TEXT NOT NULL,
  description   TEXT NOT NULL,
  estimated_cost INTEGER,                    -- ZMW, synthetic
  approval_required INTEGER NOT NULL,
  status        TEXT NOT NULL,
  workshop_ref  TEXT,
  requested_by  TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_actions (
  id          TEXT PRIMARY KEY,
  maintenance_id TEXT NOT NULL REFERENCES maintenance_requests(id),
  actor_id    TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_records (
  id            TEXT PRIMARY KEY,
  vehicle_id    TEXT NOT NULL REFERENCES vehicles(id),
  maintenance_id TEXT REFERENCES maintenance_requests(id),
  service_date  TEXT NOT NULL,
  service_type  TEXT NOT NULL,
  workshop_ref  TEXT,
  cost_ref      TEXT,
  notes         TEXT,
  recorded_by   TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL
);

-- M05 General non-sensitive assets ----------------------------------------
CREATE TABLE IF NOT EXISTS asset_categories (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  allowed     INTEGER NOT NULL DEFAULT 1     -- approved allowlist flag
);

CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  asset_tag     TEXT NOT NULL UNIQUE,
  category_code TEXT NOT NULL REFERENCES asset_categories(code),
  description   TEXT NOT NULL,
  condition     TEXT NOT NULL CHECK (condition IN ('NEW','GOOD','FAIR','POOR','UNSERVICEABLE')),
  status        TEXT NOT NULL CHECK (status IN ('IN_STORE','ISSUED','IN_TRANSFER','UNDER_REPAIR','DISPOSED')),
  custody_org_id TEXT NOT NULL REFERENCES org_units(id),
  custodian_ref TEXT,                        -- office/post reference, not a personal identity
  transfer_to_org_id TEXT REFERENCES org_units(id),
  last_inspected_at TEXT,
  synthetic     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_events (
  id          TEXT PRIMARY KEY,
  asset_id    TEXT NOT NULL REFERENCES assets(id),
  event_type  TEXT NOT NULL,
  actor_id    TEXT NOT NULL REFERENCES users(id),
  before_state TEXT,
  after_state TEXT,
  reference   TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL
);

-- M09 Notifications -------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  created_at TEXT NOT NULL,
  read_at    TEXT
);

-- M06 Reporting -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_definitions (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  permission  TEXT NOT NULL,
  fields      TEXT NOT NULL,                 -- JSON allowlist of exportable fields
  owner_note  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_exports (
  id          TEXT PRIMARY KEY,
  report_code TEXT NOT NULL REFERENCES report_definitions(code),
  user_id     TEXT NOT NULL REFERENCES users(id),
  filters     TEXT NOT NULL,
  fields      TEXT NOT NULL,
  row_count   INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

-- M10 Audit (append-only, hash-chained) ---------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  id          TEXT NOT NULL UNIQUE,
  occurred_at TEXT NOT NULL,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILURE')),
  entity_type TEXT,
  entity_id   TEXT,
  org_unit_id TEXT,
  category    TEXT NOT NULL CHECK (category IN ('AUTH','IAM','BUSINESS','EXPORT','CONFIG','SECURITY','ORG')),
  details     TEXT,
  prev_hash   TEXT NOT NULL,
  hash        TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events
BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events
BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_req_origin ON admin_requests(origin_org_id, status);
CREATE INDEX IF NOT EXISTS ix_assign_user ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS ix_veh_org ON vehicles(custody_org_id);
CREATE INDEX IF NOT EXISTS ix_asset_org ON assets(custody_org_id);
CREATE INDEX IF NOT EXISTS ix_notif_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_events(entity_type, entity_id);

-- Migration 002: messages submitted through the public Contact page ----------
CREATE TABLE IF NOT EXISTS contact_messages (
  id           TEXT PRIMARY KEY,
  reference    TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  subject      TEXT NOT NULL CHECK (subject IN ('ENQUIRY','SUPPORT','ACCESS','FEEDBACK')),
  message      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('NEW','HANDLED')) DEFAULT 'NEW',
  handled_by   TEXT REFERENCES users(id),
  handled_at   TEXT,
  handled_note TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_contact_status ON contact_messages(status, created_at);
CREATE INDEX IF NOT EXISTS ix_contact_email ON contact_messages(email, created_at);
`;
