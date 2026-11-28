-- ZPS-OMS migration 017 — Kamfinsa Mobile Unit field command (institutional compliance directive, 28 Nov 2026, §10–§12).
--
-- 1. Platoon attendance (muster) register: the Platoon Commander, who is directly in charge of the officers on the
--    ground, records one administrative attendance status per officer per day. Status codes only: no location, no
--    free text, no tactical information. The Area Commander sees counts, not individual records.
-- 2. Partner-organisation engagement register for Area Commanders (e.g. meetings with mine management, security
--    coordination meetings): administrative METADATA only — date, partner, type, reference of the official record held
--    elsewhere, follow-up status. There is deliberately no content, minutes, notes or attachment field.
-- Additive only.

CREATE TABLE platoon_musters (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  unit_id       VARCHAR(40) NOT NULL,
  position_id   VARCHAR(40) NOT NULL,
  muster_date   CHAR(10)    NOT NULL,
  recorded_by   VARCHAR(40) NOT NULL,
  authority     VARCHAR(12) NOT NULL CHECK (authority IN ('SUBSTANTIVE','ACTING')),
  version       INT         NOT NULL DEFAULT 1,
  created_at    CHAR(24)    NOT NULL,
  updated_at    CHAR(24)    NOT NULL,
  CONSTRAINT uq_muster_day UNIQUE (unit_id, muster_date),
  CONSTRAINT fk_muster_unit FOREIGN KEY (unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_muster_pos FOREIGN KEY (position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_muster_user FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX ix_muster_date (muster_date)
) ENGINE=InnoDB;

CREATE TABLE platoon_muster_entries (
  muster_id     VARCHAR(40) NOT NULL,
  personnel_id  VARCHAR(40) NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('PRESENT','ON_LEAVE','SICK','OFF_DUTY','ON_COURSE','ABSENT')),
  PRIMARY KEY (muster_id, personnel_id),
  CONSTRAINT fk_mentry_muster FOREIGN KEY (muster_id) REFERENCES platoon_musters(id),
  CONSTRAINT fk_mentry_person FOREIGN KEY (personnel_id) REFERENCES personnel_records(id)
) ENGINE=InnoDB;

CREATE TABLE area_engagements (
  id                VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference         VARCHAR(24)  NOT NULL UNIQUE,
  position_id       VARCHAR(40)  NOT NULL,
  engagement_date   CHAR(10)     NOT NULL,
  partner           VARCHAR(120) NOT NULL,
  engagement_type   VARCHAR(30)  NOT NULL CHECK (engagement_type IN ('SECURITY_COORDINATION_MEETING','PARTNER_LIAISON_MEETING','COURTESY_CALL','JOINT_ADMIN_MEETING','CORRESPONDENCE')),
  record_reference  VARCHAR(60)  NULL,
  follow_up         VARCHAR(8)   NOT NULL DEFAULT 'NONE' CHECK (follow_up IN ('NONE','OPEN','DONE')),
  recorded_by       VARCHAR(40)  NOT NULL,
  authority         VARCHAR(12)  NOT NULL CHECK (authority IN ('SUBSTANTIVE','ACTING')),
  version           INT          NOT NULL DEFAULT 1,
  created_at        CHAR(24)     NOT NULL,
  updated_at        CHAR(24)     NOT NULL,
  CONSTRAINT fk_eng_pos FOREIGN KEY (position_id) REFERENCES command_positions(id),
  CONSTRAINT fk_eng_user FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX ix_eng_pos_date (position_id, engagement_date)
) ENGINE=InnoDB;
