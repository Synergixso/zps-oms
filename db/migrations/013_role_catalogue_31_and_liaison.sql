-- ZPS-OMS migration 013 — 31-role catalogue support and restricted intelligence-liaison ADMINISTRATION
-- (owner directive 27 Nov 2026, DEC-072, DEC-073).
--
-- 1. role_reassignments: when a role definition leaves the authoritative catalogue, every active assignment of it
--    is revoked (kept as history) and recorded here for AUTHORISED reassignment. No replacement role is ever
--    granted automatically; access stays denied until an administrator grants an approved role and scope.
--
-- 2. liaison_records / liaison_routing: administrative METADATA ONLY for the four Police Intelligence Officer
--    roles: reference numbers, originating and receiving organisation units, dates, the responsible account,
--    an approved administrative classification, submission and acknowledgement status, an approval reference
--    and the routing history. By design there is NO subject, narrative, note, attachment or other free-text
--    column: intelligence content, sources, informants, targets, surveillance, collection methods or tasking
--    cannot be stored in ZPS-OMS. Reference fields accept reference-number characters only (domain validation).
--
-- Additive only: no existing table or row is changed.

CREATE TABLE role_reassignments (
  id                       VARCHAR(40)  NOT NULL PRIMARY KEY,
  user_id                  VARCHAR(40)  NOT NULL,
  role_code                VARCHAR(40)  NOT NULL,
  org_unit_id              VARCHAR(40)  NOT NULL,
  assignment_id            VARCHAR(40)  NOT NULL,
  reason                   VARCHAR(200) NOT NULL,
  flagged_at               CHAR(24)     NOT NULL,
  resolved_at              CHAR(24)     NULL,
  resolved_by              VARCHAR(40)  NULL,
  resolution_assignment_id VARCHAR(40)  NULL,
  CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_rr_role FOREIGN KEY (role_code) REFERENCES roles(code),
  CONSTRAINT fk_rr_org FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_rr_assignment FOREIGN KEY (assignment_id) REFERENCES role_assignments(id),
  CONSTRAINT fk_rr_resolver FOREIGN KEY (resolved_by) REFERENCES users(id),
  CONSTRAINT fk_rr_resolution FOREIGN KEY (resolution_assignment_id) REFERENCES role_assignments(id),
  UNIQUE KEY uq_rr_assignment (assignment_id),
  INDEX ix_rr_open (resolved_at, user_id)
) ENGINE=InnoDB;

CREATE TABLE liaison_records (
  id                  VARCHAR(40) NOT NULL PRIMARY KEY,
  reference           VARCHAR(24) NOT NULL,
  tenant_id           VARCHAR(40) NOT NULL,
  kind                VARCHAR(16) NOT NULL CHECK (kind IN ('SUBMISSION','REPORT_REFERENCE')),
  -- The reference number of the off-system document (reference characters only; never its content).
  external_reference  VARCHAR(40) NULL,
  origin_unit_id      VARCHAR(40) NOT NULL,
  -- The organisation unit the record is currently routed to (the receiving office).
  holding_unit_id     VARCHAR(40) NOT NULL,
  responsible_user_id VARCHAR(40) NOT NULL,
  classification      VARCHAR(12) NOT NULL DEFAULT 'UNCLASSIFIED' CHECK (classification IN ('UNCLASSIFIED','RESTRICTED')),
  status              VARCHAR(12) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','RECEIVED','ACKNOWLEDGED','CLOSED','WITHDRAWN')),
  date_submitted      CHAR(10)    NULL,
  date_received       CHAR(10)    NULL,
  date_acknowledged   CHAR(10)    NULL,
  approval_reference  VARCHAR(40) NULL,
  version             INT         NOT NULL DEFAULT 1,
  created_by          VARCHAR(40) NOT NULL,
  created_at          CHAR(24)    NOT NULL,
  updated_at          CHAR(24)    NOT NULL,
  CONSTRAINT fk_lr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_lr_origin FOREIGN KEY (origin_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_lr_holding FOREIGN KEY (holding_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_lr_responsible FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  CONSTRAINT fk_lr_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_lr_dates CHECK (date_received IS NULL OR date_submitted IS NULL OR date_received >= date_submitted),
  UNIQUE KEY uq_lr_reference (reference),
  INDEX ix_lr_origin (origin_unit_id, status),
  INDEX ix_lr_holding (holding_unit_id, status),
  INDEX ix_lr_responsible (responsible_user_id, status)
) ENGINE=InnoDB;

CREATE TABLE liaison_routing (
  id                 VARCHAR(40) NOT NULL PRIMARY KEY,
  record_id          VARCHAR(40) NOT NULL,
  seq                INT         NOT NULL,
  action             VARCHAR(12) NOT NULL CHECK (action IN ('RECORD','UPDATE','SUBMIT','RECEIVE','ACKNOWLEDGE','ROUTE','CLOSE','WITHDRAW')),
  from_unit_id       VARCHAR(40) NULL,
  to_unit_id         VARCHAR(40) NULL,
  from_status        VARCHAR(12) NULL,
  to_status          VARCHAR(12) NOT NULL,
  approval_reference VARCHAR(40) NULL,
  actor_id           VARCHAR(40) NOT NULL,
  at                 CHAR(24)    NOT NULL,
  CONSTRAINT fk_lrt_record FOREIGN KEY (record_id) REFERENCES liaison_records(id),
  CONSTRAINT fk_lrt_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_lrt_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_lrt_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  UNIQUE KEY uq_lrt_seq (record_id, seq),
  INDEX ix_lrt_at (at)
) ENGINE=InnoDB;
