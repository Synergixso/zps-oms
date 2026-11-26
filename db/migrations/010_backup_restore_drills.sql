-- ZPS-OMS migration 010 — backup restore drills (DevOps: a backup is proven only by restoring it).
CREATE TABLE backup_restore_checks (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  backup_id     BIGINT       NOT NULL,
  started_at    CHAR(24)     NOT NULL,
  finished_at   CHAR(24)     NULL,
  status        VARCHAR(10)  NOT NULL CHECK (status IN ('RUNNING','PASSED','FAILED')),
  tables_found  INT          NULL,
  schema_version INT         NULL,
  audit_events  INT          NULL,
  details       TEXT         NULL,
  started_by    VARCHAR(40)  NULL,
  CONSTRAINT fk_brc_backup FOREIGN KEY (backup_id) REFERENCES backup_runs(id),
  INDEX ix_brc_started (started_at)
) ENGINE=InnoDB;

INSERT INTO app_settings (`key`, value, description) VALUES
  ('backup.restore_drill_days', '7', 'Days between automated restore drills of the latest verified backup (1-90).');
