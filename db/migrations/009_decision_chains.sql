-- ZPS-OMS migration 009 — configurable, versioned approval chains for assignment approval and transfer release
-- (Module 09; known issue 3). Steps: JSON array of {"level": n, "authority": "RESPONSIBLE_UNIT" | "HQ", "label": "..."}.
-- A matter is pinned to the version active when it was raised. Version 1 is one level: today's behaviour.
CREATE TABLE decision_workflows (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  domain      VARCHAR(20)  NOT NULL CHECK (domain IN ('ASSIGNMENT','TRANSFER_RELEASE')),
  version     INT          NOT NULL,
  steps       TEXT         NOT NULL,
  status      VARCHAR(10)  NOT NULL CHECK (status IN ('ACTIVE','RETIRED')),
  note        VARCHAR(300) NULL,
  created_by  VARCHAR(40)  NULL,
  created_at  CHAR(24)     NOT NULL,
  CONSTRAINT uq_dwf UNIQUE (domain, version)
) ENGINE=InnoDB;

INSERT INTO decision_workflows (id, domain, version, steps, status, note, created_at) VALUES
  ('dwf_assignment_v1', 'ASSIGNMENT', 1, '[{"level":1,"authority":"RESPONSIBLE_UNIT","label":"Delegated authority of the responsible unit"}]', 'ACTIVE', 'Provisional default (DEC-008): one level.', '2026-11-26T00:00:00.000Z'),
  ('dwf_release_v1', 'TRANSFER_RELEASE', 1, '[{"level":1,"authority":"RESPONSIBLE_UNIT","label":"Delegated authority of the releasing unit"}]', 'ACTIVE', 'Provisional default (DEC-008): one level.', '2026-11-26T00:00:00.000Z');

ALTER TABLE personnel_assignments ADD COLUMN workflow_id VARCHAR(40) NULL;
ALTER TABLE personnel_assignments ADD COLUMN current_level INT NOT NULL DEFAULT 1;
ALTER TABLE personnel_assignments ADD CONSTRAINT fk_pa_dwf FOREIGN KEY (workflow_id) REFERENCES decision_workflows(id);
ALTER TABLE assignment_transfers ADD COLUMN workflow_id VARCHAR(40) NULL;
ALTER TABLE assignment_transfers ADD COLUMN current_level INT NOT NULL DEFAULT 1;
ALTER TABLE assignment_transfers ADD CONSTRAINT fk_at_dwf FOREIGN KEY (workflow_id) REFERENCES decision_workflows(id);
