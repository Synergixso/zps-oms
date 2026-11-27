-- ZPS-OMS migration 014 — Institutional command hierarchy, directives and status reporting (owner directive 27 Nov 2026,
-- "Comprehensive development status audit, institutional command hierarchy, directive and reporting workflow"; DEC-074–DEC-077).
--
-- ADMINISTRATIVE command and reporting only: no tactical plans, patrol routes, deployments, positions or locations of
-- officers, intelligence or collection methods. Free text (subject, instructions, summaries, notes) is screened for
-- excluded terms by the domain layer.
--
-- Rank, position, appointment and application role are separate: `command_positions` are offices in the structure
-- (the IG, DIG Operations, a Divisional Commander, an Area Commander, a Sergeant…); `position_appointments` put a user in
-- an office for a period; application roles (`role_assignments`) stay the 31-role catalogue and are not derived from
-- appointments. `mapped_role_code` only RECORDS a proposed correspondence for institutional validation.
--
-- Relationships are rows, never a single parent column, so one office can have a primary command superior and parallel
-- reporting or coordination superiors. Acting appointments and delegated actions expire by date.
-- Additive only: no existing table or row is changed.

CREATE TABLE command_positions (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  code              VARCHAR(40)  NOT NULL,
  title             VARCHAR(160) NOT NULL,
  position_type     VARCHAR(40)  NOT NULL,
  org_unit_id       VARCHAR(40)  NOT NULL,
  mapped_role_code  VARCHAR(40)  NULL,
  mapping_validated TINYINT(1)   NOT NULL DEFAULT 0,
  status            VARCHAR(8)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
  created_by        VARCHAR(40)  NULL,
  created_at        CHAR(24)     NOT NULL,
  CONSTRAINT fk_cp_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_cp_role FOREIGN KEY (mapped_role_code) REFERENCES roles(code),
  CONSTRAINT fk_cp_creator FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uq_cp_code (code),
  INDEX ix_cp_org (org_unit_id)
) ENGINE=InnoDB;

CREATE TABLE position_appointments (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY,
  position_id     VARCHAR(40)  NOT NULL,
  user_id         VARCHAR(40)  NOT NULL,
  valid_from      CHAR(24)     NOT NULL,
  valid_to        CHAR(24)     NULL,
  authorising_ref VARCHAR(60)  NOT NULL,
  created_by      VARCHAR(40)  NULL,
  created_at      CHAR(24)     NOT NULL,
  ended_at        CHAR(24)     NULL,
  ended_by        VARCHAR(40)  NULL,
  end_reason      VARCHAR(200) NULL,
  CONSTRAINT fk_pa_position FOREIGN KEY (position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_pa_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pa_ender FOREIGN KEY (ended_by) REFERENCES users(id),
  INDEX ix_pa_user (user_id, ended_at),
  INDEX ix_pa_position (position_id, ended_at)
) ENGINE=InnoDB;

CREATE TABLE reporting_relationships (
  id                      VARCHAR(40)  NOT NULL PRIMARY KEY,
  subordinate_position_id VARCHAR(40)  NOT NULL,
  superior_position_id    VARCHAR(40)  NOT NULL,
  relationship_type       VARCHAR(24)  NOT NULL CHECK (relationship_type IN ('PRIMARY_COMMAND','PRIMARY_REPORTING','PARALLEL_REPORTING','ADMIN_COORDINATION')),
  channel                 VARCHAR(60)  NULL,
  valid_from              CHAR(24)     NOT NULL,
  valid_to                CHAR(24)     NULL,
  authorising_ref         VARCHAR(60)  NOT NULL,
  created_by              VARCHAR(40)  NULL,
  created_at              CHAR(24)     NOT NULL,
  ended_at                CHAR(24)     NULL,
  ended_by                VARCHAR(40)  NULL,
  CONSTRAINT fk_rr2_sub FOREIGN KEY (subordinate_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_rr2_sup FOREIGN KEY (superior_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_rr2_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_rr2_ender FOREIGN KEY (ended_by) REFERENCES users(id),
  CONSTRAINT ck_rr2_self CHECK (subordinate_position_id <> superior_position_id),
  INDEX ix_rr2_sub (subordinate_position_id, ended_at),
  INDEX ix_rr2_sup (superior_position_id, ended_at)
) ENGINE=InnoDB;

CREATE TABLE acting_appointments (
  id               VARCHAR(40)  NOT NULL PRIMARY KEY,
  position_id      VARCHAR(40)  NOT NULL,
  acting_user_id   VARCHAR(40)  NOT NULL,
  original_user_id VARCHAR(40)  NULL,
  authorised_by    VARCHAR(40)  NOT NULL,
  authorising_ref  VARCHAR(60)  NOT NULL,
  actions          VARCHAR(200) NOT NULL,
  valid_from       CHAR(24)     NOT NULL,
  valid_to         CHAR(24)     NOT NULL,
  revoked_at       CHAR(24)     NULL,
  revoked_by       VARCHAR(40)  NULL,
  created_at       CHAR(24)     NOT NULL,
  CONSTRAINT fk_aa_position FOREIGN KEY (position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_aa_acting FOREIGN KEY (acting_user_id) REFERENCES users(id),
  CONSTRAINT fk_aa_original FOREIGN KEY (original_user_id) REFERENCES users(id),
  CONSTRAINT fk_aa_authoriser FOREIGN KEY (authorised_by) REFERENCES users(id),
  CONSTRAINT fk_aa_revoker FOREIGN KEY (revoked_by) REFERENCES users(id),
  CONSTRAINT ck_aa_dates CHECK (valid_to > valid_from),
  INDEX ix_aa_acting (acting_user_id, valid_to),
  INDEX ix_aa_position (position_id, valid_to)
) ENGINE=InnoDB;

CREATE TABLE command_directives (
  id                    VARCHAR(40)   NOT NULL PRIMARY KEY,
  reference             VARCHAR(24)   NOT NULL,
  parent_id             VARCHAR(40)   NULL,
  category              VARCHAR(24)   NOT NULL CHECK (category IN ('COMMAND_DIRECTIVE','ADMIN_INSTRUCTION','OPS_ADMIN_TASK','PERSONNEL_ASSIGNMENT')),
  subject               VARCHAR(160)  NOT NULL,
  instructions          VARCHAR(2000) NOT NULL,
  issuer_user_id        VARCHAR(40)   NOT NULL,
  issuer_position_id    VARCHAR(40)   NOT NULL,
  authority             VARCHAR(12)   NOT NULL CHECK (authority IN ('SUBSTANTIVE','ACTING')),
  acting_id             VARCHAR(40)   NULL,
  recipient_position_id VARCHAR(40)   NOT NULL,
  relationship_id       VARCHAR(40)   NOT NULL,
  effective_date        CHAR(10)      NOT NULL,
  due_date              CHAR(10)      NULL,
  ack_required          TINYINT(1)    NOT NULL DEFAULT 1,
  status                VARCHAR(12)   NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS','COMPLETED','CLOSED','CANCELLED')),
  related_type          VARCHAR(20)   NULL CHECK (related_type IS NULL OR related_type IN ('MANPOWER_REQUEST','ASSIGNMENT','TRANSFER')),
  related_reference     VARCHAR(40)   NULL,
  completion_report_id  VARCHAR(40)   NULL,
  version               INT           NOT NULL DEFAULT 1,
  created_at            CHAR(24)      NOT NULL,
  updated_at            CHAR(24)      NOT NULL,
  CONSTRAINT fk_cd_parent FOREIGN KEY (parent_id) REFERENCES command_directives(id),
  CONSTRAINT fk_cd_issuer FOREIGN KEY (issuer_user_id) REFERENCES users(id),
  CONSTRAINT fk_cd_issuer_pos FOREIGN KEY (issuer_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_cd_acting FOREIGN KEY (acting_id) REFERENCES acting_appointments(id),
  CONSTRAINT fk_cd_recipient FOREIGN KEY (recipient_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_cd_rel FOREIGN KEY (relationship_id) REFERENCES reporting_relationships(id),
  CONSTRAINT ck_cd_dates CHECK (due_date IS NULL OR due_date >= effective_date),
  UNIQUE KEY uq_cd_reference (reference),
  INDEX ix_cd_recipient (recipient_position_id, status),
  INDEX ix_cd_issuer (issuer_position_id, status),
  INDEX ix_cd_parent (parent_id),
  INDEX ix_cd_related (related_type, related_reference)
) ENGINE=InnoDB;

CREATE TABLE directive_events (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  directive_id      VARCHAR(40)  NOT NULL,
  seq               INT          NOT NULL,
  action            VARCHAR(12)  NOT NULL CHECK (action IN ('ISSUE','ACKNOWLEDGE','PROGRESS','FORWARD','COMPLETE','CLOSE','CANCEL','CONFLICT')),
  actor_user_id     VARCHAR(40)  NULL,
  actor_position_id VARCHAR(40)  NULL,
  authority         VARCHAR(12)  NULL,
  from_status       VARCHAR(12)  NULL,
  to_status         VARCHAR(12)  NOT NULL,
  note              VARCHAR(500) NULL,
  at                CHAR(24)     NOT NULL,
  CONSTRAINT fk_de_directive FOREIGN KEY (directive_id) REFERENCES command_directives(id),
  CONSTRAINT fk_de_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_de_position FOREIGN KEY (actor_position_id) REFERENCES command_positions(id),
  UNIQUE KEY uq_de_seq (directive_id, seq)
) ENGINE=InnoDB;

CREATE TABLE status_reports (
  id                   VARCHAR(40)   NOT NULL PRIMARY KEY,
  reference            VARCHAR(24)   NOT NULL,
  category             VARCHAR(20)   NOT NULL CHECK (category IN ('STATUS','PROGRESS','COMPLETION','AREA_STATUS','ESCALATION','RECOMMENDATION')),
  reporter_user_id     VARCHAR(40)   NOT NULL,
  reporter_position_id VARCHAR(40)   NOT NULL,
  origin_unit_id       VARCHAR(40)   NOT NULL,
  directive_id         VARCHAR(40)   NULL,
  reporting_date       CHAR(10)      NOT NULL,
  period_from          CHAR(10)      NULL,
  period_to            CHAR(10)      NULL,
  summary              VARCHAR(2000) NOT NULL,
  progress_status      VARCHAR(12)   NOT NULL CHECK (progress_status IN ('ON_TRACK','DELAYED','COMPLETED','BLOCKED')),
  outstanding          VARCHAR(1000) NULL,
  supporting_refs      VARCHAR(200)  NULL,
  status               VARCHAR(10)   NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','RETURNED','CLOSED')),
  submissions          INT           NOT NULL DEFAULT 0,
  version              INT           NOT NULL DEFAULT 1,
  created_at           CHAR(24)      NOT NULL,
  updated_at           CHAR(24)      NOT NULL,
  CONSTRAINT fk_sr_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id),
  CONSTRAINT fk_sr_position FOREIGN KEY (reporter_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_sr_origin FOREIGN KEY (origin_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_sr_directive FOREIGN KEY (directive_id) REFERENCES command_directives(id),
  CONSTRAINT ck_sr_period CHECK (period_to IS NULL OR period_from IS NULL OR period_to >= period_from),
  UNIQUE KEY uq_sr_reference (reference),
  INDEX ix_sr_reporter (reporter_position_id, status)
) ENGINE=InnoDB;

ALTER TABLE command_directives ADD CONSTRAINT fk_cd_report FOREIGN KEY (completion_report_id) REFERENCES status_reports(id);

CREATE TABLE report_recipients (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  report_id         VARCHAR(40)  NOT NULL,
  position_id       VARCHAR(40)  NOT NULL,
  relationship_id   VARCHAR(40)  NULL,
  recipient_kind    VARCHAR(10)  NOT NULL CHECK (recipient_kind IN ('PRIMARY','PARALLEL','FORWARDED')),
  forwarded_from_id VARCHAR(40)  NULL,
  status            VARCHAR(12)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACKNOWLEDGED','REVIEWED','RETURNED','FORWARDED','CLOSED')),
  acknowledged_at   CHAR(24)     NULL,
  acknowledged_by   VARCHAR(40)  NULL,
  reviewed_at       CHAR(24)     NULL,
  reviewed_by       VARCHAR(40)  NULL,
  review_outcome    VARCHAR(12)  NULL CHECK (review_outcome IS NULL OR review_outcome IN ('NOTED','RECOMMENDED','RETURNED')),
  review_note       VARCHAR(500) NULL,
  created_at        CHAR(24)     NOT NULL,
  CONSTRAINT fk_rcp_report FOREIGN KEY (report_id) REFERENCES status_reports(id),
  CONSTRAINT fk_rcp_position FOREIGN KEY (position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_rcp_rel FOREIGN KEY (relationship_id) REFERENCES reporting_relationships(id),
  CONSTRAINT fk_rcp_from FOREIGN KEY (forwarded_from_id) REFERENCES report_recipients(id),
  CONSTRAINT fk_rcp_ack FOREIGN KEY (acknowledged_by) REFERENCES users(id),
  CONSTRAINT fk_rcp_rev FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE KEY uq_rcp (report_id, position_id),
  INDEX ix_rcp_position (position_id, status)
) ENGINE=InnoDB;

CREATE TABLE report_events (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  report_id         VARCHAR(40)  NOT NULL,
  recipient_id      VARCHAR(40)  NULL,
  seq               INT          NOT NULL,
  action            VARCHAR(12)  NOT NULL CHECK (action IN ('CREATE','SUBMIT','ACKNOWLEDGE','REVIEW','RETURN','RESUBMIT','FORWARD','CLOSE','ESCALATE')),
  actor_user_id     VARCHAR(40)  NULL,
  actor_position_id VARCHAR(40)  NULL,
  authority         VARCHAR(12)  NULL,
  note              VARCHAR(500) NULL,
  at                CHAR(24)     NOT NULL,
  CONSTRAINT fk_re_report FOREIGN KEY (report_id) REFERENCES status_reports(id),
  CONSTRAINT fk_re_recipient FOREIGN KEY (recipient_id) REFERENCES report_recipients(id),
  CONSTRAINT fk_re_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_re_position FOREIGN KEY (actor_position_id) REFERENCES command_positions(id),
  UNIQUE KEY uq_re_seq (report_id, seq)
) ENGINE=InnoDB;

CREATE TABLE command_conflicts (
  id                          VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference                   VARCHAR(24)  NOT NULL,
  recipient_position_id       VARCHAR(40)  NOT NULL,
  directive_a_id              VARCHAR(40)  NOT NULL,
  directive_b_id              VARCHAR(40)  NOT NULL,
  common_superior_position_id VARCHAR(40)  NULL,
  source                      VARCHAR(10)  NOT NULL CHECK (source IN ('RECIPIENT','AUTOMATIC')),
  reason                      VARCHAR(500) NOT NULL,
  status                      VARCHAR(10)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
  flagged_by                  VARCHAR(40)  NULL,
  decision                    VARCHAR(16)  NULL CHECK (decision IS NULL OR decision IN ('A_PRECEDES','B_PRECEDES','BOTH_STAND','WITHDRAW_A','WITHDRAW_B')),
  decision_note               VARCHAR(500) NULL,
  decided_by                  VARCHAR(40)  NULL,
  decided_position_id         VARCHAR(40)  NULL,
  decided_authority           VARCHAR(12)  NULL,
  decided_at                  CHAR(24)     NULL,
  created_at                  CHAR(24)     NOT NULL,
  CONSTRAINT fk_cc_recipient FOREIGN KEY (recipient_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_cc_a FOREIGN KEY (directive_a_id) REFERENCES command_directives(id),
  CONSTRAINT fk_cc_b FOREIGN KEY (directive_b_id) REFERENCES command_directives(id),
  CONSTRAINT fk_cc_superior FOREIGN KEY (common_superior_position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_cc_flagger FOREIGN KEY (flagged_by) REFERENCES users(id),
  CONSTRAINT fk_cc_decider FOREIGN KEY (decided_by) REFERENCES users(id),
  CONSTRAINT fk_cc_decided_pos FOREIGN KEY (decided_position_id) REFERENCES command_positions(id),
  CONSTRAINT ck_cc_pair CHECK (directive_a_id <> directive_b_id),
  UNIQUE KEY uq_cc_reference (reference),
  INDEX ix_cc_superior (common_superior_position_id, status)
) ENGINE=InnoDB;

INSERT INTO app_settings (`key`, value, description) VALUES
  ('command.ack_reminder_days', '2', 'Days after issue before an unacknowledged directive is reminded (escalated to the issuer after 2.5 times this)'),
  ('command.report_reminder_days', '3', 'Days a report may wait at a recipient before a reminder (escalated to the next superior after twice this)');
