-- ZPS-OMS migration 001 — core schema on MySQL/MariaDB (InnoDB, utf8mb4).
-- Carries forward the proven SQLite structure (schema v3) and adds hierarchical
-- multi-tenancy, configurable organisation-type rules and a closure table.
-- Timestamps are ISO-8601 UTC strings (CHAR(24), lexicographically sortable);
-- calendar dates are 'YYYY-MM-DD' (CHAR(10)). See docs/PHASE3_AUDIT_AND_ARCHITECTURE.md.

-- Tenancy ------------------------------------------------------------------
CREATE TABLE tenants (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY,
  code            VARCHAR(30)  NOT NULL UNIQUE,
  name            VARCHAR(160) NOT NULL,
  tenant_type     VARCHAR(20)  NOT NULL CHECK (tenant_type IN ('NATIONAL','PROVINCIAL','FORMATION')),
  parent_tenant_id VARCHAR(40) NULL,
  status          VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at      CHAR(24)     NOT NULL,
  CONSTRAINT fk_tenant_parent FOREIGN KEY (parent_tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB;

-- Organisation registry ----------------------------------------------------
CREATE TABLE org_units (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id       VARCHAR(40)  NOT NULL,
  code            VARCHAR(30)  NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  short_name      VARCHAR(80)  NULL,
  unit_type       VARCHAR(24)  NOT NULL CHECK (unit_type IN ('SERVICE_HQ','HQ_OFFICE','PROVINCIAL_DIVISION','DISTRICT','STATION','POST','FORMATION','DEPARTMENT','COMPANY','DETACHMENT','PLATOON','SECTION')),
  branch          VARCHAR(12)  NOT NULL CHECK (branch IN ('HQ','TERRITORIAL','FORMATION')),
  status          VARCHAR(12)  NOT NULL CHECK (status IN ('ACTIVE','INACTIVE','SUPERSEDED')),
  effective_from  CHAR(10)     NOT NULL,
  effective_to    CHAR(10)     NULL,
  approval_ref    VARCHAR(60)  NULL,
  validation_note TEXT         NULL,
  synthetic       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      CHAR(24)     NOT NULL,
  CONSTRAINT fk_org_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX ix_org_tenant (tenant_id),
  INDEX ix_org_type (unit_type)
) ENGINE=InnoDB;

-- Which unit types may sit directly under which (configuration, not code).
CREATE TABLE org_type_rules (
  parent_type VARCHAR(24) NOT NULL,
  child_type  VARCHAR(24) NOT NULL,
  PRIMARY KEY (parent_type, child_type)
) ENGINE=InnoDB;

CREATE TABLE org_relationships (
  id             VARCHAR(40) NOT NULL PRIMARY KEY,
  child_id       VARCHAR(40) NOT NULL,
  parent_id      VARCHAR(40) NOT NULL,
  relationship   VARCHAR(20) NOT NULL CHECK (relationship IN ('REPORTS_TO','ADMINISTERED_BY')),
  effective_from CHAR(10)    NOT NULL,
  effective_to   CHAR(10)    NULL,
  approval_ref   VARCHAR(60) NULL,
  created_at     CHAR(24)    NOT NULL,
  CONSTRAINT fk_rel_child FOREIGN KEY (child_id) REFERENCES org_units(id),
  CONSTRAINT fk_rel_parent FOREIGN KEY (parent_id) REFERENCES org_units(id),
  INDEX ix_rel_child (child_id, effective_to),
  INDEX ix_rel_parent (parent_id, effective_to)
) ENGINE=InnoDB;

-- Current hierarchy as ancestor/descendant pairs (depth 0 = self). Rebuilt on every structural change.
CREATE TABLE org_unit_closure (
  ancestor_id   VARCHAR(40) NOT NULL,
  descendant_id VARCHAR(40) NOT NULL,
  depth         SMALLINT    NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id),
  INDEX ix_closure_desc (descendant_id),
  CONSTRAINT fk_cl_anc FOREIGN KEY (ancestor_id) REFERENCES org_units(id),
  CONSTRAINT fk_cl_desc FOREIGN KEY (descendant_id) REFERENCES org_units(id)
) ENGINE=InnoDB;

-- Identity and access -------------------------------------------------------
CREATE TABLE users (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  username       VARCHAR(80)  NOT NULL UNIQUE,
  display_name   VARCHAR(120) NOT NULL,
  position_title VARCHAR(120) NOT NULL,
  status         VARCHAR(12)  NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED','DEACTIVATED')),
  status_reason  TEXT         NULL,
  password_hash  VARCHAR(255) NULL,
  password_changed_at CHAR(24) NULL,
  failed_logins  INT          NOT NULL DEFAULT 0,
  locked_until   CHAR(24)     NULL,
  last_login_at  CHAR(24)     NULL,
  mfa_enabled    TINYINT(1)   NOT NULL DEFAULT 0,
  mfa_secret     VARCHAR(255) NULL,
  synthetic      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     CHAR(24)     NOT NULL
) ENGINE=InnoDB;

CREATE TABLE org_change_requests (
  id              VARCHAR(40) NOT NULL PRIMARY KEY,
  reference       VARCHAR(30) NOT NULL UNIQUE,
  change_type     VARCHAR(20) NOT NULL CHECK (change_type IN ('CREATE_UNIT','RENAME_UNIT','DEACTIVATE_UNIT','CHANGE_PARENT')),
  target_unit_id  VARCHAR(40) NULL,
  payload         TEXT        NOT NULL,
  reason          TEXT        NOT NULL,
  effective_date  CHAR(10)    NOT NULL,
  status          VARCHAR(12) NOT NULL CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','APPLIED')),
  proposed_by     VARCHAR(40) NOT NULL,
  decided_by      VARCHAR(40) NULL,
  decision_reason TEXT        NULL,
  approval_ref    VARCHAR(60) NULL,
  created_at      CHAR(24)    NOT NULL,
  decided_at      CHAR(24)    NULL,
  applied_at      CHAR(24)    NULL,
  CONSTRAINT fk_ocr_target FOREIGN KEY (target_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_ocr_proposer FOREIGN KEY (proposed_by) REFERENCES users(id),
  CONSTRAINT fk_ocr_decider FOREIGN KEY (decided_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE roles (
  code            VARCHAR(40)  NOT NULL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  description     TEXT         NOT NULL,
  category        VARCHAR(12)  NOT NULL CHECK (category IN ('BUSINESS','FUNCTIONAL','AUDIT','TECHNICAL','SECURITY')),
  requires_expiry TINYINT(1)   NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_code  VARCHAR(40) NOT NULL,
  permission VARCHAR(60) NOT NULL,
  coverage   VARCHAR(10) NOT NULL CHECK (coverage IN ('UNIT','SUBTREE','NATIONAL')),
  PRIMARY KEY (role_code, permission),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_code) REFERENCES roles(code)
) ENGINE=InnoDB;

CREATE TABLE role_assignments (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  user_id       VARCHAR(40) NOT NULL,
  role_code     VARCHAR(40) NOT NULL,
  org_unit_id   VARCHAR(40) NOT NULL,
  valid_from    CHAR(24)    NOT NULL,
  valid_to      CHAR(24)    NULL,
  justification TEXT        NOT NULL,
  granted_by    VARCHAR(40) NULL,
  revoked_at    CHAR(24)    NULL,
  revoked_by    VARCHAR(40) NULL,
  revoke_reason TEXT        NULL,
  created_at    CHAR(24)    NOT NULL,
  CONSTRAINT fk_ra_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ra_role FOREIGN KEY (role_code) REFERENCES roles(code),
  CONSTRAINT fk_ra_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_ra_granter FOREIGN KEY (granted_by) REFERENCES users(id),
  CONSTRAINT fk_ra_revoker FOREIGN KEY (revoked_by) REFERENCES users(id),
  INDEX ix_assign_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE delegations (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  user_id       VARCHAR(40) NOT NULL,
  org_unit_id   VARCHAR(40) NOT NULL,
  domain        VARCHAR(20) NOT NULL CHECK (domain IN ('ADMIN_REQUEST','MAINTENANCE','ORG_CHANGE','MANPOWER','ASSIGNMENT')),
  category_code VARCHAR(40) NULL,
  valid_from    CHAR(24)    NOT NULL,
  valid_to      CHAR(24)    NULL,
  approval_ref  VARCHAR(60) NOT NULL,
  granted_by    VARCHAR(40) NULL,
  revoked_at    CHAR(24)    NULL,
  revoked_by    VARCHAR(40) NULL,
  created_at    CHAR(24)    NOT NULL,
  CONSTRAINT fk_dg_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_dg_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  INDEX ix_deleg_user (user_id, domain)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id           CHAR(64)    NOT NULL PRIMARY KEY,
  user_id      VARCHAR(40) NOT NULL,
  created_at   CHAR(24)    NOT NULL,
  expires_at   CHAR(24)    NOT NULL,
  last_seen_at CHAR(24)    NOT NULL,
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  id           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(80) NOT NULL,
  client_key   CHAR(64)    NOT NULL,
  succeeded    TINYINT(1)  NOT NULL,
  created_at   CHAR(24)    NOT NULL,
  INDEX ix_login_user (username, created_at),
  INDEX ix_login_client (client_key, created_at)
) ENGINE=InnoDB;

CREATE TABLE access_reviews (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference    VARCHAR(30)  NOT NULL UNIQUE,
  title        VARCHAR(200) NOT NULL,
  status       VARCHAR(12)  NOT NULL CHECK (status IN ('OPEN','COMPLETED')),
  opened_by    VARCHAR(40)  NOT NULL,
  created_at   CHAR(24)     NOT NULL,
  completed_at CHAR(24)     NULL,
  CONSTRAINT fk_ar_opener FOREIGN KEY (opened_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE access_review_items (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  review_id     VARCHAR(40) NOT NULL,
  assignment_id VARCHAR(40) NOT NULL,
  decision      VARCHAR(8)  NULL CHECK (decision IN ('RETAIN','REVOKE')),
  decided_by    VARCHAR(40) NULL,
  decided_at    CHAR(24)    NULL,
  note          TEXT        NULL,
  CONSTRAINT fk_ari_review FOREIGN KEY (review_id) REFERENCES access_reviews(id),
  CONSTRAINT fk_ari_assign FOREIGN KEY (assignment_id) REFERENCES role_assignments(id)
) ENGINE=InnoDB;

-- Administrative requests ---------------------------------------------------
CREATE TABLE request_categories (
  code        VARCHAR(40)  NOT NULL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description TEXT         NOT NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE workflow_definitions (
  id             VARCHAR(60) NOT NULL PRIMARY KEY,
  category_code  VARCHAR(40) NOT NULL,
  version        INT         NOT NULL,
  approval_steps TEXT        NOT NULL,
  status         VARCHAR(10) NOT NULL CHECK (status IN ('ACTIVE','RETIRED')),
  note           TEXT        NOT NULL,
  created_at     CHAR(24)    NOT NULL,
  UNIQUE KEY uq_wf (category_code, version),
  CONSTRAINT fk_wf_cat FOREIGN KEY (category_code) REFERENCES request_categories(code)
) ENGINE=InnoDB;

CREATE TABLE admin_requests (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(40)  NOT NULL,
  reference     VARCHAR(30)  NOT NULL UNIQUE,
  category_code VARCHAR(40)  NOT NULL,
  workflow_id   VARCHAR(60)  NOT NULL,
  title         VARCHAR(200) NOT NULL,
  details       TEXT         NOT NULL,
  priority      VARCHAR(10)  NOT NULL CHECK (priority IN ('ROUTINE','PRIORITY')),
  origin_org_id VARCHAR(40)  NOT NULL,
  status        VARCHAR(16)  NOT NULL,
  current_level INT          NOT NULL DEFAULT 0,
  created_by    VARCHAR(40)  NOT NULL,
  assigned_to   VARCHAR(40)  NULL,
  due_date      CHAR(10)     NULL,
  created_at    CHAR(24)     NOT NULL,
  updated_at    CHAR(24)     NOT NULL,
  submitted_at  CHAR(24)     NULL,
  closed_at     CHAR(24)     NULL,
  row_version   INT          NOT NULL DEFAULT 1,
  CONSTRAINT fk_req_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_req_cat FOREIGN KEY (category_code) REFERENCES request_categories(code),
  CONSTRAINT fk_req_wf FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id),
  CONSTRAINT fk_req_org FOREIGN KEY (origin_org_id) REFERENCES org_units(id),
  CONSTRAINT fk_req_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_req_assignee FOREIGN KEY (assigned_to) REFERENCES users(id),
  INDEX ix_req_origin (origin_org_id, status)
) ENGINE=InnoDB;

CREATE TABLE request_actions (
  id               VARCHAR(40) NOT NULL PRIMARY KEY,
  seq              BIGINT      NOT NULL AUTO_INCREMENT UNIQUE,
  request_id       VARCHAR(40) NOT NULL,
  actor_id         VARCHAR(40) NOT NULL,
  action           VARCHAR(16) NOT NULL,
  from_status      VARCHAR(16) NULL,
  to_status        VARCHAR(16) NOT NULL,
  approval_level   INT         NULL,
  reason           TEXT        NULL,
  workflow_version INT         NOT NULL,
  approval_ref     VARCHAR(60) NULL,
  created_at       CHAR(24)    NOT NULL,
  CONSTRAINT fk_ra_req FOREIGN KEY (request_id) REFERENCES admin_requests(id),
  CONSTRAINT fk_ra_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX ix_reqact (request_id)
) ENGINE=InnoDB;

-- Fleet -----------------------------------------------------------------------
CREATE TABLE vehicles (
  id               VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id        VARCHAR(40)  NOT NULL,
  fleet_ref        VARCHAR(30)  NOT NULL UNIQUE,
  registration_ref VARCHAR(30)  NOT NULL UNIQUE,
  make             VARCHAR(60)  NOT NULL,
  model            VARCHAR(60)  NOT NULL,
  vehicle_class    VARCHAR(40)  NOT NULL,
  custody_org_id   VARCHAR(40)  NOT NULL,
  status           VARCHAR(20)  NOT NULL CHECK (status IN ('IN_SERVICE','UNDER_MAINTENANCE','AWAITING_DISPOSAL','DISPOSED')),
  next_service_due CHAR(10)     NULL,
  licence_expiry   CHAR(10)     NULL,
  insurance_expiry CHAR(10)     NULL,
  synthetic        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       CHAR(24)     NOT NULL,
  updated_at       CHAR(24)     NOT NULL,
  CONSTRAINT fk_veh_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_veh_org FOREIGN KEY (custody_org_id) REFERENCES org_units(id),
  INDEX ix_veh_org (custody_org_id)
) ENGINE=InnoDB;

CREATE TABLE maintenance_requests (
  id                VARCHAR(40) NOT NULL PRIMARY KEY,
  tenant_id         VARCHAR(40) NOT NULL,
  reference         VARCHAR(30) NOT NULL UNIQUE,
  vehicle_id        VARCHAR(40) NOT NULL,
  org_unit_id       VARCHAR(40) NOT NULL,
  service_type      VARCHAR(60) NOT NULL,
  description       TEXT        NOT NULL,
  estimated_cost    INT         NULL,
  approval_required TINYINT(1)  NOT NULL,
  status            VARCHAR(24) NOT NULL,
  workshop_ref      VARCHAR(60) NULL,
  requested_by      VARCHAR(40) NOT NULL,
  created_at        CHAR(24)    NOT NULL,
  updated_at        CHAR(24)    NOT NULL,
  CONSTRAINT fk_mnt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_mnt_veh FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_mnt_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_mnt_req FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE maintenance_actions (
  id             VARCHAR(40) NOT NULL PRIMARY KEY,
  seq            BIGINT      NOT NULL AUTO_INCREMENT UNIQUE,
  maintenance_id VARCHAR(40) NOT NULL,
  actor_id       VARCHAR(40) NOT NULL,
  action         VARCHAR(24) NOT NULL,
  from_status    VARCHAR(24) NULL,
  to_status      VARCHAR(24) NOT NULL,
  note           TEXT        NULL,
  created_at     CHAR(24)    NOT NULL,
  CONSTRAINT fk_ma_mnt FOREIGN KEY (maintenance_id) REFERENCES maintenance_requests(id),
  CONSTRAINT fk_ma_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE service_records (
  id             VARCHAR(40) NOT NULL PRIMARY KEY,
  vehicle_id     VARCHAR(40) NOT NULL,
  maintenance_id VARCHAR(40) NULL,
  service_date   CHAR(10)    NOT NULL,
  service_type   VARCHAR(60) NOT NULL,
  workshop_ref   VARCHAR(60) NULL,
  cost_ref       VARCHAR(60) NULL,
  notes          TEXT        NULL,
  recorded_by    VARCHAR(40) NOT NULL,
  created_at     CHAR(24)    NOT NULL,
  CONSTRAINT fk_svc_veh FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_svc_mnt FOREIGN KEY (maintenance_id) REFERENCES maintenance_requests(id),
  CONSTRAINT fk_svc_rec FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- General assets ----------------------------------------------------------------
CREATE TABLE asset_categories (
  code    VARCHAR(40)  NOT NULL PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  allowed TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE assets (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id          VARCHAR(40)  NOT NULL,
  asset_tag          VARCHAR(30)  NOT NULL UNIQUE,
  category_code      VARCHAR(40)  NOT NULL,
  description        VARCHAR(200) NOT NULL,
  `condition`        VARCHAR(16)  NOT NULL CHECK (`condition` IN ('NEW','GOOD','FAIR','POOR','UNSERVICEABLE')),
  status             VARCHAR(16)  NOT NULL CHECK (status IN ('IN_STORE','ISSUED','IN_TRANSFER','UNDER_REPAIR','DISPOSED')),
  custody_org_id     VARCHAR(40)  NOT NULL,
  custodian_ref      VARCHAR(80)  NULL,
  transfer_to_org_id VARCHAR(40)  NULL,
  last_inspected_at  CHAR(24)     NULL,
  synthetic          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         CHAR(24)     NOT NULL,
  updated_at         CHAR(24)     NOT NULL,
  CONSTRAINT fk_ast_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_ast_cat FOREIGN KEY (category_code) REFERENCES asset_categories(code),
  CONSTRAINT fk_ast_org FOREIGN KEY (custody_org_id) REFERENCES org_units(id),
  CONSTRAINT fk_ast_to FOREIGN KEY (transfer_to_org_id) REFERENCES org_units(id),
  INDEX ix_asset_org (custody_org_id)
) ENGINE=InnoDB;

CREATE TABLE asset_events (
  id           VARCHAR(40) NOT NULL PRIMARY KEY,
  seq          BIGINT      NOT NULL AUTO_INCREMENT UNIQUE,
  asset_id     VARCHAR(40) NOT NULL,
  event_type   VARCHAR(20) NOT NULL,
  actor_id     VARCHAR(40) NOT NULL,
  before_state TEXT        NULL,
  after_state  TEXT        NULL,
  reference    VARCHAR(60) NULL,
  note         TEXT        NULL,
  created_at   CHAR(24)    NOT NULL,
  CONSTRAINT fk_ae_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_ae_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Notifications, reporting, contact, settings ------------------------------------
CREATE TABLE notifications (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(40)  NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT         NOT NULL,
  link       VARCHAR(200) NULL,
  created_at CHAR(24)     NOT NULL,
  read_at    CHAR(24)     NULL,
  CONSTRAINT fk_ntf_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_notif_user (user_id, read_at)
) ENGINE=InnoDB;

CREATE TABLE report_definitions (
  code        VARCHAR(40)  NOT NULL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  description TEXT         NOT NULL,
  permission  VARCHAR(60)  NOT NULL,
  fields      TEXT         NOT NULL,
  owner_note  TEXT         NOT NULL
) ENGINE=InnoDB;

CREATE TABLE report_exports (
  id          VARCHAR(40) NOT NULL PRIMARY KEY,
  report_code VARCHAR(40) NOT NULL,
  user_id     VARCHAR(40) NOT NULL,
  filters     TEXT        NOT NULL,
  fields      TEXT        NOT NULL,
  row_count   INT         NOT NULL,
  created_at  CHAR(24)    NOT NULL,
  CONSTRAINT fk_exp_report FOREIGN KEY (report_code) REFERENCES report_definitions(code),
  CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE contact_messages (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference    VARCHAR(30)  NOT NULL UNIQUE,
  full_name    VARCHAR(80)  NOT NULL,
  email        VARCHAR(120) NOT NULL,
  phone        VARCHAR(20)  NULL,
  subject      VARCHAR(10)  NOT NULL CHECK (subject IN ('ENQUIRY','SUPPORT','ACCESS','FEEDBACK')),
  message      TEXT         NOT NULL,
  status       VARCHAR(8)   NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','HANDLED')),
  handled_by   VARCHAR(40)  NULL,
  handled_at   CHAR(24)     NULL,
  handled_note TEXT         NULL,
  created_at   CHAR(24)     NOT NULL,
  CONSTRAINT fk_con_handler FOREIGN KEY (handled_by) REFERENCES users(id),
  INDEX ix_contact_status (status, created_at),
  INDEX ix_contact_email (email, created_at)
) ENGINE=InnoDB;

CREATE TABLE app_settings (
  `key`       VARCHAR(80) NOT NULL PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT        NOT NULL
) ENGINE=InnoDB;

-- Audit (append-only, hash-chained) --------------------------------------------
CREATE TABLE audit_events (
  seq         BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id          VARCHAR(40) NOT NULL UNIQUE,
  occurred_at CHAR(24)    NOT NULL,
  actor_id    VARCHAR(40) NULL,
  tenant_id   VARCHAR(40) NULL,
  action      VARCHAR(80) NOT NULL,
  outcome     VARCHAR(8)  NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILURE')),
  entity_type VARCHAR(40) NULL,
  entity_id   VARCHAR(40) NULL,
  org_unit_id VARCHAR(40) NULL,
  category    VARCHAR(10) NOT NULL CHECK (category IN ('AUTH','IAM','BUSINESS','EXPORT','CONFIG','SECURITY','ORG')),
  details     TEXT        NULL,
  prev_hash   CHAR(64)    NOT NULL,
  hash        CHAR(64)    NOT NULL,
  INDEX ix_audit_entity (entity_type, entity_id),
  INDEX ix_audit_actor (actor_id)
) ENGINE=InnoDB;

CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_events is append-only';
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_events is append-only';
