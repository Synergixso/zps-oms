-- ZPS-OMS migration 002 — authentication flags, incremental seed steps, personnel registry,
-- manpower requests / contributions / rosters, operational (duty) areas, assignments,
-- transfers, renewals, exceptions and disposition history (Master Directive §5–§10).
-- An assignment is an administrative duty-area record; no location, route or position data exists.

ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;

-- Named synthetic seed steps already applied to this database (development only).
CREATE TABLE seed_steps (
  name       VARCHAR(60) NOT NULL PRIMARY KEY,
  applied_at CHAR(24)    NOT NULL
) ENGINE=InnoDB;

-- Generic approval / workflow history for the personnel modules.
CREATE TABLE approval_actions (
  seq          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type  VARCHAR(30) NOT NULL,
  entity_id    VARCHAR(40) NOT NULL,
  action       VARCHAR(30) NOT NULL,
  from_status  VARCHAR(30) NULL,
  to_status    VARCHAR(30) NULL,
  actor_id     VARCHAR(40) NOT NULL,
  org_unit_id  VARCHAR(40) NULL,
  comment      TEXT        NULL,
  created_at   CHAR(24)    NOT NULL,
  CONSTRAINT fk_apa_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX ix_apa_entity (entity_type, entity_id, seq)
) ENGINE=InnoDB;

-- Personnel registry --------------------------------------------------------
CREATE TABLE ranks (
  code       VARCHAR(12) NOT NULL PRIMARY KEY,
  name       VARCHAR(60) NOT NULL,
  seniority  INT         NOT NULL,
  category   VARCHAR(16) NOT NULL CHECK (category IN ('SENIOR_OFFICER','INSPECTORATE','NCO','CONSTABLE'))
) ENGINE=InnoDB;

CREATE TABLE disposition_statuses (
  code       VARCHAR(30) NOT NULL PRIMARY KEY,
  label      VARCHAR(60) NOT NULL,
  sort_order INT         NOT NULL,
  active     TINYINT(1)  NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE personnel_records (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id           VARCHAR(40)  NOT NULL,
  personnel_ref       VARCHAR(20)  NOT NULL,
  service_number      VARCHAR(20)  NOT NULL,
  surname             VARCHAR(60)  NOT NULL,
  first_names         VARCHAR(80)  NOT NULL,
  name_key            VARCHAR(160) NOT NULL,
  rank_code           VARCHAR(12)  NOT NULL,
  home_unit_id        VARCHAR(40)  NOT NULL,
  employment_status   VARCHAR(16)  NOT NULL CHECK (employment_status IN ('SERVING','ON_LEAVE','SECONDED','SUSPENDED','RETIRED','SEPARATED')),
  disposition_status  VARCHAR(30)  NOT NULL DEFAULT 'AVAILABLE_HOME',
  verification_status VARCHAR(12)  NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','VERIFIED','REJECTED')),
  eligibility_note    VARCHAR(200) NULL,
  verified_by         VARCHAR(40)  NULL,
  verified_at         CHAR(24)     NULL,
  synthetic           TINYINT(1)   NOT NULL DEFAULT 1,
  created_by          VARCHAR(40)  NULL,
  created_at          CHAR(24)     NOT NULL,
  updated_at          CHAR(24)     NOT NULL,
  version             INT          NOT NULL DEFAULT 1,
  CONSTRAINT uq_personnel_ref UNIQUE (personnel_ref),
  CONSTRAINT uq_service_number UNIQUE (service_number),
  CONSTRAINT fk_per_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_per_rank FOREIGN KEY (rank_code) REFERENCES ranks(code),
  CONSTRAINT fk_per_home FOREIGN KEY (home_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_per_disp FOREIGN KEY (disposition_status) REFERENCES disposition_statuses(code),
  INDEX ix_per_home (home_unit_id),
  INDEX ix_per_name (name_key),
  INDEX ix_per_tenant (tenant_id)
) ENGINE=InnoDB;

-- Effective-dated home-unit membership (exactly one open HOME row per officer).
CREATE TABLE personnel_memberships (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  personnel_id  VARCHAR(40) NOT NULL,
  org_unit_id   VARCHAR(40) NOT NULL,
  valid_from    CHAR(10)    NOT NULL,
  valid_to      CHAR(10)    NULL,
  reason        VARCHAR(200) NOT NULL,
  recorded_by   VARCHAR(40) NULL,
  created_at    CHAR(24)    NOT NULL,
  CONSTRAINT fk_pm_person FOREIGN KEY (personnel_id) REFERENCES personnel_records(id),
  CONSTRAINT fk_pm_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  INDEX ix_pm_person (personnel_id, valid_from)
) ENGINE=InnoDB;

CREATE TABLE personnel_history (
  seq           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  personnel_id  VARCHAR(40) NOT NULL,
  field         VARCHAR(40) NOT NULL,
  old_value     VARCHAR(200) NULL,
  new_value     VARCHAR(200) NULL,
  reason        VARCHAR(300) NULL,
  actor_id      VARCHAR(40) NULL,
  created_at    CHAR(24)    NOT NULL,
  CONSTRAINT fk_ph_person FOREIGN KEY (personnel_id) REFERENCES personnel_records(id),
  INDEX ix_ph_person (personnel_id, seq)
) ENGINE=InnoDB;

-- Operational (administrative duty) areas -------------------------------------
CREATE TABLE operational_areas (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id           VARCHAR(40)  NOT NULL,
  code                VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(120) NOT NULL,
  description         VARCHAR(300) NULL,
  responsible_unit_id VARCHAR(40)  NOT NULL,
  status              VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_by          VARCHAR(40)  NULL,
  created_at          CHAR(24)     NOT NULL,
  CONSTRAINT fk_area_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_area_unit FOREIGN KEY (responsible_unit_id) REFERENCES org_units(id)
) ENGINE=InnoDB;

-- Manpower requests -----------------------------------------------------------
CREATE TABLE manpower_requests (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id           VARCHAR(40)  NOT NULL,
  reference           VARCHAR(24)  NOT NULL UNIQUE,
  requesting_unit_id  VARCHAR(40)  NOT NULL,
  requested_by        VARCHAR(40)  NOT NULL,
  category            VARCHAR(20)  NOT NULL CHECK (category IN ('NATIONAL_DUTY','SPECIAL_DUTY','AREA_ASSIGNMENT','REINFORCEMENT','OTHER')),
  purpose             VARCHAR(200) NOT NULL,
  area_id             VARCHAR(40)  NULL,
  total_required      INT          NOT NULL CHECK (total_required BETWEEN 1 AND 5000),
  personnel_categories VARCHAR(200) NOT NULL,
  commencement_date   CHAR(10)     NOT NULL,
  duration_days       INT          NOT NULL CHECK (duration_days BETWEEN 1 AND 1095),
  justification       TEXT         NOT NULL,
  approval_unit_id    VARCHAR(40)  NOT NULL,
  status              VARCHAR(16)  NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','RETURNED','RECOMMENDED','APPROVED','REJECTED','COMPLETED','CANCELLED')),
  submitted_at        CHAR(24)     NULL,
  decided_at          CHAR(24)     NULL,
  created_at          CHAR(24)     NOT NULL,
  updated_at          CHAR(24)     NOT NULL,
  version             INT          NOT NULL DEFAULT 1,
  CONSTRAINT fk_mpr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_mpr_unit FOREIGN KEY (requesting_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_mpr_appr FOREIGN KEY (approval_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_mpr_user FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_mpr_area FOREIGN KEY (area_id) REFERENCES operational_areas(id),
  INDEX ix_mpr_unit (requesting_unit_id, status)
) ENGINE=InnoDB;

-- One row per contributing unit: the expected contribution and that unit's submission.
CREATE TABLE manpower_contributions (
  id                   VARCHAR(40) NOT NULL PRIMARY KEY,
  request_id           VARCHAR(40) NOT NULL,
  tenant_id            VARCHAR(40) NOT NULL,
  contributing_unit_id VARCHAR(40) NOT NULL,
  required_count       INT         NOT NULL CHECK (required_count BETWEEN 1 AND 5000),
  rank_note            VARCHAR(160) NULL,
  status               VARCHAR(12) NOT NULL CHECK (status IN ('PENDING','SUBMITTED','RETURNED','ACCEPTED')),
  revision             INT         NOT NULL DEFAULT 0,
  submitted_by         VARCHAR(40) NULL,
  submitted_at         CHAR(24)    NULL,
  reviewed_by          VARCHAR(40) NULL,
  reviewed_at          CHAR(24)    NULL,
  review_comment       TEXT        NULL,
  created_at           CHAR(24)    NOT NULL,
  CONSTRAINT uq_contrib UNIQUE (request_id, contributing_unit_id),
  CONSTRAINT fk_mc_req FOREIGN KEY (request_id) REFERENCES manpower_requests(id),
  CONSTRAINT fk_mc_unit FOREIGN KEY (contributing_unit_id) REFERENCES org_units(id),
  INDEX ix_mc_unit (contributing_unit_id, status)
) ENGINE=InnoDB;

CREATE TABLE manpower_contribution_entries (
  id              VARCHAR(40) NOT NULL PRIMARY KEY,
  contribution_id VARCHAR(40) NOT NULL,
  personnel_id    VARCHAR(40) NOT NULL,
  added_by        VARCHAR(40) NOT NULL,
  added_at        CHAR(24)    NOT NULL,
  CONSTRAINT uq_mce UNIQUE (contribution_id, personnel_id),
  CONSTRAINT fk_mce_c FOREIGN KEY (contribution_id) REFERENCES manpower_contributions(id),
  CONSTRAINT fk_mce_p FOREIGN KEY (personnel_id) REFERENCES personnel_records(id)
) ENGINE=InnoDB;

-- Rosters (immutable versions) -----------------------------------------------
CREATE TABLE roster_versions (
  id                VARCHAR(40) NOT NULL PRIMARY KEY,
  request_id        VARCHAR(40) NOT NULL,
  version_no        INT         NOT NULL,
  status            VARCHAR(12) NOT NULL CHECK (status IN ('DRAFT','AMENDED','SUBMITTED','REVIEWED','APPROVED','FINALISED','SUPERSEDED','WITHDRAWN')),
  based_on_id       VARCHAR(40) NULL,
  amendment_reason  TEXT        NULL,
  created_by        VARCHAR(40) NOT NULL,
  created_at        CHAR(24)    NOT NULL,
  submitted_by      VARCHAR(40) NULL,
  submitted_at      CHAR(24)    NULL,
  reviewed_by       VARCHAR(40) NULL,
  reviewed_at       CHAR(24)    NULL,
  approved_by       VARCHAR(40) NULL,
  approved_at       CHAR(24)    NULL,
  finalised_by      VARCHAR(40) NULL,
  finalised_at      CHAR(24)    NULL,
  CONSTRAINT uq_roster_ver UNIQUE (request_id, version_no),
  CONSTRAINT fk_rv_req FOREIGN KEY (request_id) REFERENCES manpower_requests(id),
  CONSTRAINT fk_rv_base FOREIGN KEY (based_on_id) REFERENCES roster_versions(id)
) ENGINE=InnoDB;

CREATE TABLE roster_entries (
  id              VARCHAR(40) NOT NULL PRIMARY KEY,
  version_id      VARCHAR(40) NOT NULL,
  personnel_id    VARCHAR(40) NOT NULL,
  contribution_id VARCHAR(40) NULL,
  source          VARCHAR(12) NOT NULL CHECK (source IN ('CONTRIBUTION','MANUAL','CARRIED')),
  -- Snapshot of the registry values at build time (traceable to personnel_id).
  service_number  VARCHAR(20) NOT NULL,
  full_name       VARCHAR(160) NOT NULL,
  rank_code       VARCHAR(12) NOT NULL,
  home_unit_id    VARCHAR(40) NOT NULL,
  issues          VARCHAR(300) NULL,
  added_by        VARCHAR(40) NOT NULL,
  added_at        CHAR(24)    NOT NULL,
  CONSTRAINT uq_roster_person UNIQUE (version_id, personnel_id),
  CONSTRAINT fk_re_ver FOREIGN KEY (version_id) REFERENCES roster_versions(id),
  CONSTRAINT fk_re_per FOREIGN KEY (personnel_id) REFERENCES personnel_records(id)
) ENGINE=InnoDB;

-- Assignments -----------------------------------------------------------------
CREATE TABLE personnel_assignments (
  id                    VARCHAR(40) NOT NULL PRIMARY KEY,
  tenant_id             VARCHAR(40) NOT NULL,
  reference             VARCHAR(24) NOT NULL UNIQUE,
  personnel_id          VARCHAR(40) NOT NULL,
  home_unit_id          VARCHAR(40) NOT NULL,
  responsible_unit_id   VARCHAR(40) NOT NULL,
  area_id               VARCHAR(40) NOT NULL,
  request_id            VARCHAR(40) NULL,
  roster_version_id     VARCHAR(40) NULL,
  commencement_date     CHAR(10)    NOT NULL,
  continuous_start_date CHAR(10)    NOT NULL,
  review_date           CHAR(10)    NOT NULL,
  status                VARCHAR(16) NOT NULL CHECK (status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING','CLOSED','CANCELLED','REJECTED')),
  close_reason          VARCHAR(16) NULL CHECK (close_reason IN ('TRANSFERRED','RELEASED','COMPLETED','CANCELLED')),
  ended_on              CHAR(10)    NULL,
  overlap_exception_id  VARCHAR(40) NULL,
  authorised_by         VARCHAR(40) NULL,
  authorised_unit_id    VARCHAR(40) NULL,
  authorised_at         CHAR(24)    NULL,
  notes                 VARCHAR(500) NULL,
  created_by            VARCHAR(40) NOT NULL,
  created_at            CHAR(24)    NOT NULL,
  updated_at            CHAR(24)    NOT NULL,
  version               INT         NOT NULL DEFAULT 1,
  CONSTRAINT fk_pa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_pa_per FOREIGN KEY (personnel_id) REFERENCES personnel_records(id),
  CONSTRAINT fk_pa_home FOREIGN KEY (home_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_pa_resp FOREIGN KEY (responsible_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_pa_area FOREIGN KEY (area_id) REFERENCES operational_areas(id),
  CONSTRAINT fk_pa_req FOREIGN KEY (request_id) REFERENCES manpower_requests(id),
  INDEX ix_pa_person (personnel_id, status),
  INDEX ix_pa_area (area_id, status),
  INDEX ix_pa_resp (responsible_unit_id, status),
  INDEX ix_pa_review (status, review_date)
) ENGINE=InnoDB;

CREATE TABLE exception_categories (
  code             VARCHAR(24) NOT NULL PRIMARY KEY,
  name             VARCHAR(80) NOT NULL,
  active           TINYINT(1)  NOT NULL DEFAULT 1,
  always_available TINYINT(1)  NOT NULL DEFAULT 0,
  requires_document TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE assignment_exceptions (
  id              VARCHAR(40) NOT NULL PRIMARY KEY,
  reference       VARCHAR(24) NOT NULL UNIQUE,
  assignment_id   VARCHAR(40) NOT NULL,
  purpose         VARCHAR(16) NOT NULL CHECK (purpose IN ('EARLY_RELEASE','OVERLAP')),
  category_code   VARCHAR(24) NOT NULL,
  justification   TEXT        NOT NULL,
  document_ref    VARCHAR(120) NULL,
  status          VARCHAR(10) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','USED','WITHDRAWN')),
  raised_by       VARCHAR(40) NOT NULL,
  raised_at       CHAR(24)    NOT NULL,
  decided_by      VARCHAR(40) NULL,
  decided_at      CHAR(24)    NULL,
  decision_comment TEXT       NULL,
  CONSTRAINT fk_ae_asg FOREIGN KEY (assignment_id) REFERENCES personnel_assignments(id),
  CONSTRAINT fk_ae_cat FOREIGN KEY (category_code) REFERENCES exception_categories(code),
  INDEX ix_ae_asg (assignment_id, status)
) ENGINE=InnoDB;

CREATE TABLE assignment_transfers (
  id                VARCHAR(40) NOT NULL PRIMARY KEY,
  reference         VARCHAR(24) NOT NULL UNIQUE,
  assignment_id     VARCHAR(40) NOT NULL,
  personnel_id      VARCHAR(40) NOT NULL,
  from_area_id      VARCHAR(40) NOT NULL,
  to_area_id        VARCHAR(40) NOT NULL,
  releasing_unit_id VARCHAR(40) NOT NULL,
  receiving_unit_id VARCHAR(40) NOT NULL,
  justification     TEXT        NOT NULL,
  proposed_date     CHAR(10)    NOT NULL,
  effective_date    CHAR(10)    NULL,
  exception_id      VARCHAR(40) NULL,
  status            VARCHAR(18) NOT NULL CHECK (status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE','COMPLETED','REJECTED','CANCELLED')),
  initiated_by      VARCHAR(40) NOT NULL,
  initiated_at      CHAR(24)    NOT NULL,
  released_by       VARCHAR(40) NULL,
  released_at       CHAR(24)    NULL,
  accepted_by       VARCHAR(40) NULL,
  accepted_at       CHAR(24)    NULL,
  decision_comment  TEXT        NULL,
  new_assignment_id VARCHAR(40) NULL,
  CONSTRAINT fk_tr_asg FOREIGN KEY (assignment_id) REFERENCES personnel_assignments(id),
  CONSTRAINT fk_tr_to FOREIGN KEY (to_area_id) REFERENCES operational_areas(id),
  CONSTRAINT fk_tr_exc FOREIGN KEY (exception_id) REFERENCES assignment_exceptions(id),
  INDEX ix_tr_status (status),
  INDEX ix_tr_recv (receiving_unit_id, status)
) ENGINE=InnoDB;

CREATE TABLE assignment_renewals (
  id                   VARCHAR(40) NOT NULL PRIMARY KEY,
  assignment_id        VARCHAR(40) NOT NULL,
  decision             VARCHAR(12) NOT NULL CHECK (decision IN ('RENEWED','NOT_RENEWED')),
  previous_review_date CHAR(10)    NOT NULL,
  next_review_date     CHAR(10)    NULL,
  comment              TEXT        NOT NULL,
  decided_by           VARCHAR(40) NOT NULL,
  decided_at           CHAR(24)    NOT NULL,
  CONSTRAINT fk_rn_asg FOREIGN KEY (assignment_id) REFERENCES personnel_assignments(id),
  INDEX ix_rn_asg (assignment_id)
) ENGINE=InnoDB;

CREATE TABLE disposition_history (
  seq            BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  personnel_id   VARCHAR(40) NOT NULL,
  assignment_id  VARCHAR(40) NULL,
  previous_status VARCHAR(30) NULL,
  new_status     VARCHAR(30) NOT NULL,
  reason         VARCHAR(300) NOT NULL,
  authorised_by  VARCHAR(40) NULL,
  effective_date CHAR(10)    NOT NULL,
  reference      VARCHAR(40) NULL,
  created_at     CHAR(24)    NOT NULL,
  CONSTRAINT fk_dh_per FOREIGN KEY (personnel_id) REFERENCES personnel_records(id),
  INDEX ix_dh_per (personnel_id, seq)
) ENGINE=InnoDB;

-- Configuration data (provisional; adjustable by authorised administrators) ------
INSERT INTO ranks (code, name, seniority, category) VALUES
  ('CP','Commissioner of Police',120,'SENIOR_OFFICER'),
  ('SACP','Senior Assistant Commissioner',110,'SENIOR_OFFICER'),
  ('ACP','Assistant Commissioner',100,'SENIOR_OFFICER'),
  ('CSP','Chief Superintendent',90,'SENIOR_OFFICER'),
  ('SSP','Senior Superintendent',80,'SENIOR_OFFICER'),
  ('SP','Superintendent',70,'SENIOR_OFFICER'),
  ('ASP','Assistant Superintendent',60,'SENIOR_OFFICER'),
  ('CI','Chief Inspector',50,'INSPECTORATE'),
  ('INSP','Inspector',40,'INSPECTORATE'),
  ('SI','Sub-Inspector',30,'INSPECTORATE'),
  ('SGT','Sergeant',20,'NCO'),
  ('PC','Constable',10,'CONSTABLE');

INSERT INTO disposition_statuses (code, label, sort_order) VALUES
  ('AVAILABLE_HOME','Available at Home Unit',1),
  ('PROPOSED','Proposed for Assignment',2),
  ('AWAITING_APPROVAL','Awaiting Assignment Approval',3),
  ('APPROVED_PENDING','Approved — Pending Commencement',4),
  ('ACTIVE_ASSIGNMENT','Active Field Assignment',5),
  ('REVIEW_DUE','Assignment Review Due',6),
  ('RENEWAL_PENDING','Renewal Pending',7),
  ('RENEWED_ACTIVE','Renewed — Active',8),
  ('TRANSFER_PENDING','Transfer Pending',9),
  ('TEMP_UNAVAILABLE','Temporarily Unavailable',10),
  ('RELEASED','Released from Assignment',11),
  ('RETURNED_HOME','Returned to Home Unit',12),
  ('SUSPENDED_REVIEW','Suspended Pending Administrative Review',13),
  ('COMPLETED','Assignment Completed',14),
  ('CANCELLED','Assignment Cancelled',15);

INSERT INTO exception_categories (code, name, active, always_available, requires_document) VALUES
  ('MISCONDUCT','Misconduct',1,1,1),
  ('MEDICAL','Medical',1,0,1),
  ('WELFARE','Welfare',1,0,0),
  ('SAFETY','Safety',1,0,0),
  ('LEGAL','Legal',1,0,1),
  ('EXCEPTIONAL_SERVICE','Exceptional service requirement',1,0,0);

INSERT INTO app_settings (`key`, value, description) VALUES
  ('assignment.renewal_period_days','365','Proposed period added to the review date when an assignment is renewed (requires institutional authorisation).'),
  ('assignment.review_window_days','30','Days before the review date when an assignment is flagged Review Due.')
ON DUPLICATE KEY UPDATE `key` = `key`;
INSERT INTO app_settings (`key`, value, description) VALUES
  ('assignment.minimum_tenure_days','365','Proposed minimum period at the same operational area before routine withdrawal or transfer. Requires institutional authorisation before production enforcement.')
ON DUPLICATE KEY UPDATE `key` = `key`;
