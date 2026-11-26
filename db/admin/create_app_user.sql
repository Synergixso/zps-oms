-- ZPS-OMS — least-privilege MySQL / MariaDB accounts (run ONCE as an administrator, e.g. in phpMyAdmin → SQL).
-- Replace CHANGE_ME_* with strong passwords of your choice before running. Never commit the real passwords.
-- Afterwards put them in .env.local:
--   DATABASE_URL=mysql://zps_oms_app:<app password>@127.0.0.1:3306/zps_oms_dev
--   (migrations run at start-up, so the application account also needs the DDL rights granted below on its own schema only)
-- Keep using root only for creating databases and for `npm run db:reset` / tests if you prefer.

CREATE USER IF NOT EXISTS 'zps_oms_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_APP_PASSWORD';
CREATE USER IF NOT EXISTS 'zps_oms_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_APP_PASSWORD';

-- Application schema only: data access plus the DDL needed by versioned migrations and triggers.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, TRIGGER, LOCK TABLES, SHOW VIEW
  ON zps_oms_dev.* TO 'zps_oms_app'@'127.0.0.1', 'zps_oms_app'@'localhost';

-- Backups (mysqldump) need these additionally.
GRANT PROCESS ON *.* TO 'zps_oms_app'@'127.0.0.1', 'zps_oms_app'@'localhost';

-- Optional read-only account for reporting tools.
CREATE USER IF NOT EXISTS 'zps_oms_ro'@'localhost' IDENTIFIED BY 'CHANGE_ME_READONLY_PASSWORD';
GRANT SELECT ON zps_oms_dev.* TO 'zps_oms_ro'@'localhost';

FLUSH PRIVILEGES;

-- Finally, give the XAMPP root account a password (XAMPP ships it empty):
--   ALTER USER 'root'@'localhost' IDENTIFIED BY 'CHANGE_ME_ROOT_PASSWORD';
-- and update phpMyAdmin's config.inc.php accordingly.
