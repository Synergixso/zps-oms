-- ZPS-OMS migration 006 — asset reconciliation (stock-take) and saved custom report definitions.

CREATE TABLE asset_reconciliations (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference    VARCHAR(24)  NOT NULL UNIQUE,
  tenant_id    VARCHAR(40)  NOT NULL,
  org_unit_id  VARCHAR(40)  NOT NULL,
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('OPEN','CLOSED','CANCELLED')),
  opened_by    VARCHAR(40)  NOT NULL,
  opened_at    CHAR(24)     NOT NULL,
  closed_by    VARCHAR(40)  NULL,
  closed_at    CHAR(24)     NULL,
  summary      VARCHAR(300) NULL,
  note         VARCHAR(500) NULL,
  CONSTRAINT fk_arc_unit FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_arc_open FOREIGN KEY (opened_by) REFERENCES users(id),
  INDEX ix_arc_unit (org_unit_id, status)
) ENGINE=InnoDB;

CREATE TABLE asset_reconciliation_items (
  id                VARCHAR(40) NOT NULL PRIMARY KEY,
  reconciliation_id VARCHAR(40) NOT NULL,
  asset_id          VARCHAR(40) NOT NULL,
  expected_status   VARCHAR(16) NOT NULL,
  result            VARCHAR(10) NULL CHECK (result IN ('FOUND','DAMAGED','MISSING')),
  note              VARCHAR(300) NULL,
  checked_by        VARCHAR(40) NULL,
  checked_at        CHAR(24)    NULL,
  CONSTRAINT uq_arc_item UNIQUE (reconciliation_id, asset_id),
  CONSTRAINT fk_ari_rec FOREIGN KEY (reconciliation_id) REFERENCES asset_reconciliations(id),
  CONSTRAINT fk_ari_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- Saved custom report definitions (an approved report, a chosen subset of its approved fields, optional sort).
CREATE TABLE saved_reports (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(40)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  report_code VARCHAR(40)  NOT NULL,
  fields      TEXT         NOT NULL,
  sort_field  VARCHAR(60)  NULL,
  sort_dir    VARCHAR(4)   NOT NULL DEFAULT 'asc' CHECK (sort_dir IN ('asc','desc')),
  created_at  CHAR(24)     NOT NULL,
  CONSTRAINT fk_sr_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sr_report FOREIGN KEY (report_code) REFERENCES report_definitions(code),
  INDEX ix_sr_user (user_id)
) ENGINE=InnoDB;
