-- ZPS-OMS migration 007 — three-tier 27-role catalogue support, active role context, general stores.
-- The previous 41 roles are RETIRED (kept for assignment history), never deleted.

ALTER TABLE roles ADD COLUMN tier TINYINT NULL;
ALTER TABLE roles ADD COLUMN role_no INT NULL;
ALTER TABLE roles ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE roles ADD COLUMN back_office VARCHAR(120) NULL;
ALTER TABLE roles ADD COLUMN updated_at CHAR(24) NULL;

-- The selected organisational context (role assignment) for a session; validated on every request.
ALTER TABLE sessions ADD COLUMN active_assignment_id VARCHAR(40) NULL;

-- Stores requisition approval is delegated like every other approval domain.
ALTER TABLE delegations MODIFY domain VARCHAR(20) NOT NULL CHECK (domain IN ('ADMIN_REQUEST','MAINTENANCE','ORG_CHANGE','MANPOWER','ASSIGNMENT','STORES'));

-- General stores (non-sensitive consumables and general stock only) -------------
CREATE TABLE store_categories (
  code    VARCHAR(30) NOT NULL PRIMARY KEY,
  name    VARCHAR(80) NOT NULL,
  active  TINYINT(1)  NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO store_categories (code, name) VALUES
  ('STATIONERY', 'Stationery and office consumables'),
  ('CLEANING', 'Cleaning and hygiene materials'),
  ('ICT_CONSUMABLES', 'ICT consumables (toner, media, cables)'),
  ('GENERAL_HARDWARE', 'General hardware and maintenance materials'),
  ('KITCHEN_WELFARE', 'Kitchen and welfare supplies'),
  ('UNIFORM_GENERAL', 'General uniform items (non-protective)');

CREATE TABLE store_items (
  id               VARCHAR(40)  NOT NULL PRIMARY KEY,
  tenant_id        VARCHAR(40)  NOT NULL,
  org_unit_id      VARCHAR(40)  NOT NULL,
  code             VARCHAR(30)  NOT NULL,
  category_code    VARCHAR(30)  NOT NULL,
  name             VARCHAR(120) NOT NULL,
  unit_of_measure  VARCHAR(20)  NOT NULL,
  quantity_on_hand INT          NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level    INT          NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  status           VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_by       VARCHAR(40)  NULL,
  created_at       CHAR(24)     NOT NULL,
  updated_at       CHAR(24)     NOT NULL,
  version          INT          NOT NULL DEFAULT 1,
  CONSTRAINT uq_store_item UNIQUE (org_unit_id, code),
  CONSTRAINT fk_si_unit FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_si_cat FOREIGN KEY (category_code) REFERENCES store_categories(code),
  INDEX ix_si_unit (org_unit_id, status)
) ENGINE=InnoDB;

CREATE TABLE store_requisitions (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY,
  reference          VARCHAR(24)  NOT NULL UNIQUE,
  tenant_id          VARCHAR(40)  NOT NULL,
  requesting_unit_id VARCHAR(40)  NOT NULL,
  store_unit_id      VARCHAR(40)  NOT NULL,
  purpose            VARCHAR(200) NOT NULL,
  status             VARCHAR(10)  NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','ISSUED','REJECTED','CANCELLED')),
  requested_by       VARCHAR(40)  NOT NULL,
  submitted_at       CHAR(24)     NULL,
  approved_by        VARCHAR(40)  NULL,
  approved_at        CHAR(24)     NULL,
  issued_by          VARCHAR(40)  NULL,
  issued_at          CHAR(24)     NULL,
  decision_comment   VARCHAR(300) NULL,
  created_at         CHAR(24)     NOT NULL,
  CONSTRAINT fk_sr_req_unit FOREIGN KEY (requesting_unit_id) REFERENCES org_units(id),
  CONSTRAINT fk_sr_store_unit FOREIGN KEY (store_unit_id) REFERENCES org_units(id),
  INDEX ix_sr_store (store_unit_id, status),
  INDEX ix_sr_req (requesting_unit_id, status)
) ENGINE=InnoDB;

CREATE TABLE store_requisition_lines (
  id                 VARCHAR(40) NOT NULL PRIMARY KEY,
  requisition_id     VARCHAR(40) NOT NULL,
  item_id            VARCHAR(40) NOT NULL,
  quantity_requested INT         NOT NULL CHECK (quantity_requested > 0),
  quantity_issued    INT         NULL,
  CONSTRAINT uq_srl UNIQUE (requisition_id, item_id),
  CONSTRAINT fk_srl_req FOREIGN KEY (requisition_id) REFERENCES store_requisitions(id),
  CONSTRAINT fk_srl_item FOREIGN KEY (item_id) REFERENCES store_items(id)
) ENGINE=InnoDB;

CREATE TABLE store_transactions (
  seq            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id             VARCHAR(40)  NOT NULL UNIQUE,
  item_id        VARCHAR(40)  NOT NULL,
  txn_type       VARCHAR(12)  NOT NULL CHECK (txn_type IN ('RECEIPT','ISSUE','RETURN','ADJUSTMENT')),
  quantity       INT          NOT NULL,
  balance_after  INT          NOT NULL,
  reference      VARCHAR(60)  NULL,
  counterparty   VARCHAR(160) NULL,
  requisition_id VARCHAR(40)  NULL,
  note           VARCHAR(300) NULL,
  actor_id       VARCHAR(40)  NOT NULL,
  created_at     CHAR(24)     NOT NULL,
  CONSTRAINT fk_st_item FOREIGN KEY (item_id) REFERENCES store_items(id),
  CONSTRAINT fk_st_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX ix_st_item (item_id, seq)
) ENGINE=InnoDB;
