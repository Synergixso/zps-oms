-- ZPS-OMS migration 018 — executive portfolios (final master directive, 28 Nov 2026, Parts C–E; DEC-086 … DEC-088).
--
-- 1. Training and professional development (DIG Administration portfolio): institutions, course catalogue,
--    sessions (delivered by an institution or an authorised formation such as SPOM / Mobile Unit), training needs from
--    units, nominations with recommendation and approval, attendance, results and certification.
-- 2. Operations administration (DIG Operations portfolio): an ADMINISTRATIVE register of public-order incidents and
--    illegal-mining operations (authority, responsible unit, dates, personnel committed as a count, status, short
--    screened outcome) with dated updates; partner organisations and mining security service agreements tied to an
--    administrative duty area. No tactical plans, routes, positions, live locations, vulnerabilities, intelligence or
--    investigation content — there are no columns for them.
-- 3. Inter-office coordination requests between executive portfolio offices (e.g. DIG Operations ↔ DIG Special
--    Duties / State House): administrative requirement, authority reference, status and history; visible only to the
--    two offices and the Inspector General. No protection plans, schedules, routes or protective intelligence.
-- Additive only.

CREATE TABLE training_institutions (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(160) NOT NULL,
  kind        VARCHAR(12)  NOT NULL CHECK (kind IN ('COLLEGE','SCHOOL','FORMATION','EXTERNAL')),
  org_unit_id VARCHAR(40)  NULL,
  status      VARCHAR(8)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at  CHAR(24)     NOT NULL,
  CONSTRAINT fk_ti_unit FOREIGN KEY (org_unit_id) REFERENCES org_units(id)
) ENGINE=InnoDB;

CREATE TABLE training_courses (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  code           VARCHAR(30)  NOT NULL UNIQUE,
  title          VARCHAR(160) NOT NULL,
  institution_id VARCHAR(40)  NOT NULL,
  category       VARCHAR(16)  NOT NULL CHECK (category IN ('INDUCTION','PUBLIC_ORDER','LEADERSHIP','ADMINISTRATION','TECHNICAL','REFRESHER','OTHER')),
  duration_days  INT          NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  eligibility    VARCHAR(200) NULL,
  certification  VARCHAR(120) NULL,
  renewal_months INT          NULL CHECK (renewal_months IS NULL OR renewal_months BETWEEN 1 AND 120),
  version        INT          NOT NULL DEFAULT 1,
  status         VARCHAR(8)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETIRED')),
  created_by     VARCHAR(40)  NOT NULL,
  created_at     CHAR(24)     NOT NULL,
  updated_at     CHAR(24)     NOT NULL,
  CONSTRAINT fk_tc_inst FOREIGN KEY (institution_id) REFERENCES training_institutions(id)
) ENGINE=InnoDB;

CREATE TABLE training_sessions (
  id                 VARCHAR(40) NOT NULL PRIMARY KEY,
  reference          VARCHAR(24) NOT NULL UNIQUE,
  course_id          VARCHAR(40) NOT NULL,
  delivering_unit_id VARCHAR(40) NOT NULL,
  start_date         CHAR(10)    NOT NULL,
  end_date           CHAR(10)    NOT NULL,
  capacity           INT         NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
  plan_year          INT         NOT NULL,
  status             VARCHAR(12) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_by         VARCHAR(40) NOT NULL,
  created_at         CHAR(24)    NOT NULL,
  updated_at         CHAR(24)    NOT NULL,
  CONSTRAINT fk_ts_course FOREIGN KEY (course_id) REFERENCES training_courses(id),
  CONSTRAINT fk_ts_unit FOREIGN KEY (delivering_unit_id) REFERENCES org_units(id),
  INDEX ix_ts_dates (start_date)
) ENGINE=InnoDB;

CREATE TABLE training_needs (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference          VARCHAR(24)  NOT NULL UNIQUE,
  requesting_unit_id VARCHAR(40)  NOT NULL,
  course_id          VARCHAR(40)  NULL,
  topic              VARCHAR(160) NOT NULL,
  category           VARCHAR(16)  NOT NULL CHECK (category IN ('INDUCTION','PUBLIC_ORDER','LEADERSHIP','ADMINISTRATION','TECHNICAL','REFRESHER','OTHER')),
  officers_count     INT          NOT NULL CHECK (officers_count BETWEEN 1 AND 10000),
  priority           VARCHAR(8)   NOT NULL CHECK (priority IN ('HIGH','MEDIUM','LOW')),
  justification      VARCHAR(500) NOT NULL,
  status             VARCHAR(10)  NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','ACCEPTED','PLANNED','DECLINED','MET')),
  submitted_by       VARCHAR(40)  NOT NULL,
  decided_by         VARCHAR(40)  NULL,
  decision_note      VARCHAR(300) NULL,
  created_at         CHAR(24)     NOT NULL,
  updated_at         CHAR(24)     NOT NULL,
  CONSTRAINT fk_tn_unit FOREIGN KEY (requesting_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_tn_course FOREIGN KEY (course_id) REFERENCES training_courses(id)
) ENGINE=InnoDB;

CREATE TABLE training_nominations (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference          VARCHAR(24)  NOT NULL UNIQUE,
  session_id         VARCHAR(40)  NOT NULL,
  personnel_id       VARCHAR(40)  NOT NULL,
  nominating_unit_id VARCHAR(40)  NOT NULL,
  nominated_by       VARCHAR(40)  NOT NULL,
  status             VARCHAR(14)  NOT NULL DEFAULT 'NOMINATED' CHECK (status IN ('NOMINATED','RECOMMENDED','NOT_RECOMMENDED','APPROVED','REJECTED','WITHDRAWN','ATTENDED','COMPLETED','NOT_COMPLETED')),
  recommended_by     VARCHAR(40)  NULL,
  decided_by         VARCHAR(40)  NULL,
  decision_note      VARCHAR(300) NULL,
  certificate_ref    VARCHAR(60)  NULL,
  certificate_expiry CHAR(10)     NULL,
  version            INT          NOT NULL DEFAULT 1,
  created_at         CHAR(24)     NOT NULL,
  updated_at         CHAR(24)     NOT NULL,
  CONSTRAINT uq_tnom UNIQUE (session_id, personnel_id),
  CONSTRAINT fk_tnom_session FOREIGN KEY (session_id) REFERENCES training_sessions(id),
  CONSTRAINT fk_tnom_person FOREIGN KEY (personnel_id) REFERENCES personnel_records(id),
  CONSTRAINT fk_tnom_unit FOREIGN KEY (nominating_unit_id) REFERENCES org_units(id)
) ENGINE=InnoDB;

CREATE TABLE ops_activities (
  id                   VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference            VARCHAR(24)  NOT NULL UNIQUE,
  category             VARCHAR(16)  NOT NULL CHECK (category IN ('PUBLIC_ORDER','ILLEGAL_MINING')),
  classification       VARCHAR(24)  NOT NULL,
  title                VARCHAR(160) NOT NULL,
  authorising_ref      VARCHAR(60)  NOT NULL,
  authorising_office   VARCHAR(40)  NULL,
  responsible_unit_id  VARCHAR(40)  NOT NULL,
  coordinating_unit_id VARCHAR(40)  NULL,
  start_date           CHAR(10)     NOT NULL,
  end_date             CHAR(10)     NULL,
  personnel_committed  INT          NOT NULL DEFAULT 0 CHECK (personnel_committed BETWEEN 0 AND 100000),
  status               VARCHAR(10)  NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED','ACTIVE','COMPLETED','REVIEWED','CLOSED')),
  outcome_summary      VARCHAR(500) NULL,
  review_summary       VARCHAR(500) NULL,
  created_by           VARCHAR(40)  NOT NULL,
  version              INT          NOT NULL DEFAULT 1,
  created_at           CHAR(24)     NOT NULL,
  updated_at           CHAR(24)     NOT NULL,
  CONSTRAINT fk_oa_unit FOREIGN KEY (responsible_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_oa_coord FOREIGN KEY (coordinating_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_oa_office FOREIGN KEY (authorising_office) REFERENCES command_positions(id),
  INDEX ix_oa_cat (category, status)
) ENGINE=InnoDB;

CREATE TABLE ops_activity_updates (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  activity_id   VARCHAR(40)  NOT NULL,
  seq           INT          NOT NULL,
  kind          VARCHAR(18)  NOT NULL CHECK (kind IN ('REGISTER','PROGRESS','RESOURCE_REQUEST','STATUS','REVIEW')),
  note          VARCHAR(500) NULL,
  personnel     INT          NULL,
  from_status   VARCHAR(10)  NULL,
  to_status     VARCHAR(10)  NULL,
  recorded_by   VARCHAR(40)  NOT NULL,
  at            CHAR(24)     NOT NULL,
  CONSTRAINT uq_oau UNIQUE (activity_id, seq),
  CONSTRAINT fk_oau_act FOREIGN KEY (activity_id) REFERENCES ops_activities(id)
) ENGINE=InnoDB;

CREATE TABLE partner_organisations (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL UNIQUE,
  name       VARCHAR(160) NOT NULL,
  sector     VARCHAR(12)  NOT NULL CHECK (sector IN ('MINING','TRANSPORT','ENERGY','OTHER')),
  status     VARCHAR(8)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at CHAR(24)     NOT NULL
) ENGINE=InnoDB;

CREATE TABLE security_service_agreements (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference           VARCHAR(24)  NOT NULL UNIQUE,
  partner_id          VARCHAR(40)  NOT NULL,
  area_id             VARCHAR(40)  NOT NULL,
  responsible_unit_id VARCHAR(40)  NOT NULL,
  authorisation_ref   VARCHAR(60)  NOT NULL,
  valid_from          CHAR(10)     NOT NULL,
  valid_to            CHAR(10)     NULL,
  officers_required   INT          NOT NULL CHECK (officers_required BETWEEN 0 AND 10000),
  status              VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','ENDED')),
  created_by          VARCHAR(40)  NOT NULL,
  created_at          CHAR(24)     NOT NULL,
  updated_at          CHAR(24)     NOT NULL,
  CONSTRAINT fk_ssa_partner FOREIGN KEY (partner_id) REFERENCES partner_organisations(id),
  CONSTRAINT fk_ssa_area FOREIGN KEY (area_id) REFERENCES operational_areas(id),
  CONSTRAINT fk_ssa_unit FOREIGN KEY (responsible_unit_id) REFERENCES org_units(id)
) ENGINE=InnoDB;

CREATE TABLE security_service_reports (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  agreement_id  VARCHAR(40)  NOT NULL,
  period_from   CHAR(10)     NOT NULL,
  period_to     CHAR(10)     NOT NULL,
  officers_provided INT      NOT NULL CHECK (officers_provided BETWEEN 0 AND 10000),
  service_status VARCHAR(12) NOT NULL CHECK (service_status IN ('DELIVERED','PARTIAL','NOT_DELIVERED')),
  follow_up     VARCHAR(8)   NOT NULL DEFAULT 'NONE' CHECK (follow_up IN ('NONE','OPEN','DONE')),
  summary       VARCHAR(300) NULL,
  recorded_by   VARCHAR(40)  NOT NULL,
  created_at    CHAR(24)     NOT NULL,
  CONSTRAINT fk_ssr_ag FOREIGN KEY (agreement_id) REFERENCES security_service_agreements(id)
) ENGINE=InnoDB;

CREATE TABLE coordination_requests (
  id                     VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference              VARCHAR(24)  NOT NULL UNIQUE,
  requesting_position_id VARCHAR(40)  NOT NULL,
  receiving_position_id  VARCHAR(40)  NOT NULL,
  category               VARCHAR(18)  NOT NULL CHECK (category IN ('PERSONNEL_SUPPORT','ADMIN_SUPPORT','TRAINING_SUPPORT','INFORMATION','OTHER')),
  subject                VARCHAR(160) NOT NULL,
  requirement            VARCHAR(500) NOT NULL,
  officers_required      INT          NULL CHECK (officers_required IS NULL OR officers_required BETWEEN 1 AND 10000),
  authorisation_ref      VARCHAR(60)  NOT NULL,
  required_by            CHAR(10)     NULL,
  status                 VARCHAR(12)  NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','ACKNOWLEDGED','IN_PROGRESS','COMPLETED','DECLINED','CANCELLED')),
  created_by             VARCHAR(40)  NOT NULL,
  version                INT          NOT NULL DEFAULT 1,
  created_at             CHAR(24)     NOT NULL,
  updated_at             CHAR(24)     NOT NULL,
  CONSTRAINT fk_cr_from FOREIGN KEY (requesting_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_cr_to FOREIGN KEY (receiving_position_id) REFERENCES command_positions(id)
) ENGINE=InnoDB;

CREATE TABLE coordination_events (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  request_id  VARCHAR(40)  NOT NULL,
  seq         INT          NOT NULL,
  action      VARCHAR(12)  NOT NULL CHECK (action IN ('SUBMIT','ACKNOWLEDGE','PROGRESS','COMPLETE','DECLINE','CANCEL')),
  note        VARCHAR(500) NULL,
  actor_user_id VARCHAR(40) NOT NULL,
  actor_position_id VARCHAR(40) NOT NULL,
  from_status VARCHAR(12)  NULL,
  to_status   VARCHAR(12)  NOT NULL,
  at          CHAR(24)     NOT NULL,
  CONSTRAINT uq_ce UNIQUE (request_id, seq),
  CONSTRAINT fk_ce_req FOREIGN KEY (request_id) REFERENCES coordination_requests(id)
) ENGINE=InnoDB;
