-- ZPS-OMS migration 008 — scheduled report delivery (in-application; no external e-mail, DEC-013).

CREATE TABLE report_schedules (
  id               VARCHAR(40)  NOT NULL PRIMARY KEY,
  user_id          VARCHAR(40)  NOT NULL,
  -- The role context (assignment) the schedule runs under; if it stops being valid the schedule is suspended.
  assignment_id    VARCHAR(40)  NOT NULL,
  report_code      VARCHAR(40)  NOT NULL,
  saved_report_id  VARCHAR(40)  NULL,
  frequency        VARCHAR(8)   NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY')),
  status           VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED')),
  status_reason    VARCHAR(200) NULL,
  next_run_at      CHAR(24)     NOT NULL,
  last_run_at      CHAR(24)     NULL,
  created_at       CHAR(24)     NOT NULL,
  CONSTRAINT fk_rs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_rs_report FOREIGN KEY (report_code) REFERENCES report_definitions(code),
  INDEX ix_rs_due (status, next_run_at),
  INDEX ix_rs_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE report_deliveries (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  schedule_id  VARCHAR(40)  NOT NULL,
  user_id      VARCHAR(40)  NOT NULL,
  report_code  VARCHAR(40)  NOT NULL,
  file_name    VARCHAR(120) NOT NULL,
  row_count    INT          NOT NULL,
  content      MEDIUMTEXT   NOT NULL,
  created_at   CHAR(24)     NOT NULL,
  downloaded_at CHAR(24)    NULL,
  CONSTRAINT fk_rd_schedule FOREIGN KEY (schedule_id) REFERENCES report_schedules(id),
  CONSTRAINT fk_rd_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_rd_user (user_id, created_at)
) ENGINE=InnoDB;
