-- ZPS-OMS migration 005 — configurable, versioned approval chains for manpower requests (Module 09).
-- steps: JSON array of {"level": n, "authority": "APPROVAL_UNIT" | "HQ", "label": "..."}; a request is pinned to the
-- version that was active when it was first submitted.
CREATE TABLE manpower_workflows (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  category    VARCHAR(20)  NOT NULL,
  version     INT          NOT NULL,
  steps       TEXT         NOT NULL,
  status      VARCHAR(10)  NOT NULL CHECK (status IN ('ACTIVE','RETIRED')),
  note        VARCHAR(300) NULL,
  created_by  VARCHAR(40)  NULL,
  created_at  CHAR(24)     NOT NULL,
  CONSTRAINT uq_mpw UNIQUE (category, version)
) ENGINE=InnoDB;

INSERT INTO manpower_workflows (id, category, version, steps, status, note, created_at) VALUES
  ('mpw_national_v1', 'NATIONAL_DUTY', 1, '[{"level":1,"authority":"APPROVAL_UNIT","label":"Approval authority named on the request"}]', 'ACTIVE', 'Provisional default (DEC-008).', '2026-11-26T00:00:00.000Z'),
  ('mpw_special_v1', 'SPECIAL_DUTY', 1, '[{"level":1,"authority":"APPROVAL_UNIT","label":"Approval authority named on the request"}]', 'ACTIVE', 'Provisional default (DEC-008).', '2026-11-26T00:00:00.000Z'),
  ('mpw_area_v1', 'AREA_ASSIGNMENT', 1, '[{"level":1,"authority":"APPROVAL_UNIT","label":"Approval authority named on the request"}]', 'ACTIVE', 'Provisional default (DEC-008).', '2026-11-26T00:00:00.000Z'),
  ('mpw_reinf_v1', 'REINFORCEMENT', 1, '[{"level":1,"authority":"APPROVAL_UNIT","label":"Approval authority named on the request"},{"level":2,"authority":"HQ","label":"National HQ concurrence"}]', 'ACTIVE', 'Provisional: reinforcements need HQ concurrence (DEC-008).', '2026-11-26T00:00:00.000Z'),
  ('mpw_other_v1', 'OTHER', 1, '[{"level":1,"authority":"APPROVAL_UNIT","label":"Approval authority named on the request"}]', 'ACTIVE', 'Provisional default (DEC-008).', '2026-11-26T00:00:00.000Z');

ALTER TABLE manpower_requests ADD COLUMN workflow_id VARCHAR(40) NULL;
ALTER TABLE manpower_requests ADD COLUMN current_level INT NOT NULL DEFAULT 1;
ALTER TABLE manpower_requests ADD CONSTRAINT fk_mpr_wf FOREIGN KEY (workflow_id) REFERENCES manpower_workflows(id);
