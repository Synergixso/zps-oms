-- ZPS-OMS migration 012 — Module 16 administrative scheduling and Module 17 administrative correspondence
-- (owner directive 27 Nov 2026, DEC-068; supersedes the later-phase rule of DEC-021).
--
-- Scheduling holds NON-SENSITIVE administrative events only: no location, patrol, deployment or tactical
-- fields exist by design. Correspondence holds administrative metadata; stored documents are PDF only,
-- validated before storage, and the feature can be switched off (correspondence.files_enabled).

CREATE TABLE admin_calendar_events (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(40)  NOT NULL,
  org_unit_id   VARCHAR(40)  NOT NULL,
  title         VARCHAR(160) NOT NULL,
  category      VARCHAR(20)  NOT NULL CHECK (category IN ('MEETING','DEADLINE','REVIEW','TRAINING','INSPECTION','OTHER')),
  event_date    CHAR(10)     NOT NULL,
  start_time    CHAR(5)      NULL,
  end_time      CHAR(5)      NULL,
  notes         VARCHAR(600) NULL,
  status        VARCHAR(10)  NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','CANCELLED','COMPLETED')),
  status_reason VARCHAR(200) NULL,
  created_by    VARCHAR(40)  NOT NULL,
  created_at    CHAR(24)     NOT NULL,
  updated_at    CHAR(24)     NOT NULL,
  CONSTRAINT fk_ace_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_ace_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_ace_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_ace_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  INDEX ix_ace_org_date (org_unit_id, event_date),
  INDEX ix_ace_date (event_date, status)
) ENGINE=InnoDB;

CREATE TABLE correspondence (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference           VARCHAR(24)  NOT NULL,
  tenant_id           VARCHAR(40)  NOT NULL,
  org_unit_id         VARCHAR(40)  NOT NULL,
  direction           VARCHAR(8)   NOT NULL CHECK (direction IN ('INCOMING','OUTGOING')),
  subject             VARCHAR(200) NOT NULL,
  -- The other party: an internal organisation unit, or an external body named in text.
  counterpart_org_id  VARCHAR(40)  NULL,
  counterpart_name    VARCHAR(160) NULL,
  letter_reference    VARCHAR(80)  NULL,
  letter_date         CHAR(10)     NULL,
  register_date       CHAR(10)     NOT NULL,
  classification      VARCHAR(12)  NOT NULL DEFAULT 'UNCLASSIFIED' CHECK (classification IN ('UNCLASSIFIED','RESTRICTED')),
  assigned_to         VARCHAR(40)  NULL,
  status              VARCHAR(16)  NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED','ASSIGNED','IN_PROGRESS','AWAITING_REPLY','CLOSED','FILED')),
  file_reference      VARCHAR(80)  NULL,
  follow_up_date      CHAR(10)     NULL,
  summary             VARCHAR(1000) NULL,
  created_by          VARCHAR(40)  NOT NULL,
  created_at          CHAR(24)     NOT NULL,
  updated_at          CHAR(24)     NOT NULL,
  CONSTRAINT uq_corr_reference UNIQUE (reference),
  CONSTRAINT fk_corr_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_corr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_corr_counterpart FOREIGN KEY (counterpart_org_id) REFERENCES org_units(id),
  CONSTRAINT fk_corr_assignee FOREIGN KEY (assigned_to) REFERENCES users(id),
  CONSTRAINT fk_corr_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_corr_counterpart CHECK (counterpart_org_id IS NOT NULL OR counterpart_name IS NOT NULL),
  INDEX ix_corr_org (org_unit_id, status, register_date),
  INDEX ix_corr_assignee (assigned_to, status),
  INDEX ix_corr_follow (status, follow_up_date)
) ENGINE=InnoDB;

CREATE TABLE correspondence_events (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  correspondence_id VARCHAR(40)  NOT NULL,
  actor_id          VARCHAR(40)  NOT NULL,
  action            VARCHAR(20)  NOT NULL,
  from_status       VARCHAR(16)  NULL,
  to_status         VARCHAR(16)  NULL,
  note              VARCHAR(500) NULL,
  at                CHAR(24)     NOT NULL,
  CONSTRAINT fk_cev_corr FOREIGN KEY (correspondence_id) REFERENCES correspondence(id),
  CONSTRAINT fk_cev_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX ix_cev_corr (correspondence_id, at)
) ENGINE=InnoDB;

CREATE TABLE correspondence_files (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  correspondence_id VARCHAR(40)  NOT NULL,
  file_name         VARCHAR(120) NOT NULL,
  content_type      VARCHAR(40)  NOT NULL CHECK (content_type = 'application/pdf'),
  size_bytes        INT          NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  sha256            CHAR(64)     NOT NULL,
  content           MEDIUMBLOB   NOT NULL,
  uploaded_by       VARCHAR(40)  NOT NULL,
  uploaded_at       CHAR(24)     NOT NULL,
  removed_at        CHAR(24)     NULL,
  removed_by        VARCHAR(40)  NULL,
  CONSTRAINT fk_cf_corr FOREIGN KEY (correspondence_id) REFERENCES correspondence(id),
  CONSTRAINT fk_cf_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX ix_cf_corr (correspondence_id)
) ENGINE=InnoDB;

INSERT INTO app_settings (`key`, value, description) VALUES
  ('correspondence.files_enabled', '1', 'Allow PDF documents to be stored with correspondence records (1 = on, 0 = off). Production use with classified or sensitive correspondence needs information-security approval.'),
  ('correspondence.retention_years', '7', 'Years after closure before a correspondence record is flagged for retention review (1-50). Nothing is deleted automatically; the period awaits the approved records schedule (NFR-013).'),
  ('schedule.reminder_days', '1', 'Days before a scheduled administrative event that its creator is reminded (1-14).');
