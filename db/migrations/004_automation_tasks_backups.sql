-- ZPS-OMS migration 004 — automation engine, administrative tasks, backups, error log,
-- human references for users and rosters, contribution deadlines, notification categories.

-- Human references (backfilled for existing rows; generated for new rows by the application).
ALTER TABLE users ADD COLUMN user_ref VARCHAR(16) NULL;
UPDATE users u JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS n FROM users) x ON x.id = u.id
   SET u.user_ref = CONCAT('USR-', LPAD(x.n, 6, '0'));
ALTER TABLE users ADD CONSTRAINT uq_user_ref UNIQUE (user_ref);

ALTER TABLE roster_versions ADD COLUMN reference VARCHAR(28) NULL;
UPDATE roster_versions v JOIN manpower_requests m ON m.id = v.request_id
   SET v.reference = CONCAT('RST-', SUBSTRING(m.reference, 5), '-V', v.version_no);
ALTER TABLE roster_versions ADD CONSTRAINT uq_roster_ref UNIQUE (reference);

-- Contribution deadline set when requirements are distributed (reminders and overdue tracking).
ALTER TABLE manpower_requests ADD COLUMN contribution_deadline CHAR(10) NULL;

-- Notification categories and de-duplication of automated reminders.
ALTER TABLE notifications ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'GENERAL';
ALTER TABLE notifications ADD COLUMN dedupe_key VARCHAR(160) NULL;
ALTER TABLE notifications ADD CONSTRAINT uq_ntf_dedupe UNIQUE (dedupe_key);

-- Per-user notification preferences (in-application only; external channels are disabled).
CREATE TABLE notification_preferences (
  user_id   VARCHAR(40) NOT NULL,
  category  VARCHAR(20) NOT NULL,
  enabled   TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, category),
  CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Administrative tasks (assigned work items with due dates; automated or manual).
CREATE TABLE administrative_tasks (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  user_id      VARCHAR(40)  NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         VARCHAR(500) NULL,
  link         VARCHAR(300) NULL,
  category     VARCHAR(20)  NOT NULL DEFAULT 'GENERAL',
  due_date     CHAR(10)     NULL,
  status       VARCHAR(10)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DONE','CANCELLED')),
  source_key   VARCHAR(160) NULL,
  created_by   VARCHAR(40)  NULL,
  created_at   CHAR(24)     NOT NULL,
  completed_at CHAR(24)     NULL,
  CONSTRAINT uq_task_source UNIQUE (source_key),
  CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_task_user (user_id, status, due_date)
) ENGINE=InnoDB;

-- Automation engine run log.
CREATE TABLE job_runs (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job          VARCHAR(60)  NOT NULL,
  trigger_type VARCHAR(10)  NOT NULL CHECK (trigger_type IN ('SCHEDULE','MANUAL','STARTUP')),
  started_at   CHAR(24)     NOT NULL,
  finished_at  CHAR(24)     NULL,
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),
  processed    INT          NOT NULL DEFAULT 0,
  attempts     INT          NOT NULL DEFAULT 1,
  message      VARCHAR(500) NULL,
  triggered_by VARCHAR(40)  NULL,
  INDEX ix_job_runs (job, started_at)
) ENGINE=InnoDB;

-- Database backups (mysqldump) with verification result.
CREATE TABLE backup_runs (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file_name   VARCHAR(200) NULL,
  size_bytes  BIGINT       NULL,
  sha256      CHAR(64)     NULL,
  started_at  CHAR(24)     NOT NULL,
  finished_at CHAR(24)     NULL,
  status      VARCHAR(10)  NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),
  verified    TINYINT(1)   NOT NULL DEFAULT 0,
  message     VARCHAR(500) NULL,
  started_by  VARCHAR(40)  NULL
) ENGINE=InnoDB;

-- Unexpected application errors (no request payloads or personal data are stored).
CREATE TABLE error_logs (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  occurred_at CHAR(24)     NOT NULL,
  source      VARCHAR(80)  NOT NULL,
  error_name  VARCHAR(80)  NOT NULL,
  message     VARCHAR(500) NOT NULL,
  INDEX ix_err_time (occurred_at)
) ENGINE=InnoDB;

INSERT INTO app_settings (`key`, value, description) VALUES
  ('platform.maintenance_mode', 'OFF', 'ON = only platform administrators can use the back office; everyone else sees a maintenance notice.'),
  ('automation.interval_minutes', '5', 'How often the in-process automation engine runs its jobs.'),
  ('manpower.default_deadline_days', '7', 'Default number of days units have to submit a contribution.'),
  ('backup.max_age_hours', '24', 'A warning is raised when the last verified backup is older than this.')
ON DUPLICATE KEY UPDATE `key` = `key`;
