# Deployment Guide — ZPS-OMS (local synthetic prototype)

> This guide covers **local review only**. No hosting, production network, real data or production identity integration is authorised (DEC-023).

## Prerequisites
- Node.js ≥ 22.13 (tested 22.23.4).
- MySQL 8 or MariaDB 10.4+ (tested with XAMPP MariaDB 10.4.32). Connection via `DATABASE_URL` in `.env.local`; migrations in `db/migrations/` are applied automatically on start or with `npm run db:migrate`. Use a dedicated least-privilege database user outside local review.
- npm. No paid services, accounts or API keys.

## Run locally
```powershell
npm install
npm run dev          # http://localhost:3100
```
Open http://localhost:3100 → **Login**. On start the server applies pending migrations and any missing synthetic seed steps (development databases only; existing records are never modified).

**Synthetic accounts.** Every seed account (`demo.*`) uses the published development password defined in `src/server/db/constants.ts` (`SYNTHETIC_DEV_PASSWORD`); the development sign-in page lists the accounts and the password. It is a test value for local review only. Accounts created through Users & access have no password until the Platform Super Administrator issues a one-time temporary password, which must be changed at first sign-in.

Production-mode local run:
```powershell
npm run build
$env:ZPS_INSECURE_COOKIE = "1"; npm start   # cookie 'Secure' flag needs HTTPS; this flag allows plain-HTTP localhost review only
```

## Configuration (environment variables, in `.env.local`)
| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — (required) | MySQL connection for the app, database `zps_oms_*` |
| `DATABASE_URL_TEST` | — | Test database (`zps_oms_test`); Playwright derives `zps_oms_e2e` from it |
| `ZPS_SHOW_DEMO_ACCOUNTS` | on in development, off in production | `1` forces / `0` hides the synthetic account list on the sign-in page; never shown when `ZPS_ENVIRONMENT=production` |
| `ZPS_INSECURE_COOKIE` | unset | `1` = omit `Secure` cookie flag under `npm start` on plain HTTP localhost |
| `NEXT_DIST_DIR` | `.next` | Build folder (the Playwright server uses `.next-e2e`) |
| `ZPS_BACKUP_DIR` | `./backups` | Folder for platform backups (git-ignored) |
| `MYSQLDUMP_PATH` | `C:\xampp\mysql\bin\mysqldump.exe` (Windows) / `mysqldump` | Backup tool |
| `MYSQL_CLIENT_PATH` | `C:\xampp\mysql\bin\mysql.exe` (Windows) / `mysql` | Client used by restore drills |
| `ZPS_AUTOMATION` | on | `off` disables the in-process automation scheduler |
| `ZPS_ENVIRONMENT` | `development` | `development`, `test` or `production` (DEC-069): environment labels, demo account list, identifier formats, production baseline seed |
| `ZPS_SETUP_TOKEN` | unset | One-time token (≥ 24 characters) for `/setup`, which creates the first Superadmin on an empty database; remove after use |
| `ZPS_FORMAT_*` | unset | Production identifier formats (`SERVICE_NUMBER`, `VEHICLE_REGISTRATION`, `FLEET_REF`, `ASSET_TAG`, `STORE_CODE`, `USERNAME`); see `DEPLOYMENT_READINESS.md` |

All application and migration connections run in **strict SQL mode** (`src/server/db/sql-mode.ts`, DEC-061), whatever the server default; XAMPP ships non-strict.

## Monitoring
- `GET /api/health` — readiness: `200` when the database answers, every migration is applied and maintenance mode is off; `503` otherwise (`status` = `degraded` or `down`). Returns only up/down signals, schema versions and the application version — no hosts, names or counts.
- `GET /api/health?probe=live` — liveness: `200` while the process answers (no database call).
Point an uptime monitor at the readiness URL; alert on two consecutive non-200 responses.

## Tests
`npm test` (Vitest, `zps_oms_test`), `npm run test:e2e` (Playwright in Microsoft Edge, `zps_oms_e2e`, port 3200), `npm run audit:routes` and `npm run review:mobile` (against a running server; use a production build on another port for evidence).

## Continuous integration
`.github/workflows/ci.yml` runs on every push to `main` and every pull request: type check, the full Vitest suite against a MariaDB 10.4 service (the XAMPP engine), `npm audit --omit=dev --audit-level=high`, and a production build. It uses a throw-away CI database password inside the service container only. Playwright, the route audit and the phone review stay local (they need Edge and the XAMPP stack).

## Reset the synthetic data
Stop the server, run `npm run db:reset` (drops and recreates the local `zps_oms_*` database; refuses any other name), then start again to reseed.

## Backup and restore (prototype)
- **Back up** from *System health → Database backups* (Superadmin or HQ Tech): `mysqldump` into `ZPS_BACKUP_DIR`, verified by the completion marker and a recorded SHA-256; re-verify at any time.
- **Restore drill** (*Run restore drill*, or automatically every `backup.restore_drill_days`, default 7): the latest verified backup is checksum-checked, restored into a scratch database `<db>_restorecheck`, checked for the core tables, the schema version and an intact audit hash chain, and the scratch database is dropped. The live database is never touched; failures notify technical operators and are logged.
- **Manual restore** of a real incident: stop the app, then `C:\xampp\mysql\bin\mysql -u root zps_oms_dev < backups\<file>.sql` into an empty database, run `npm run db:migrate`, start the app and check `GET /api/health`.
- Take a verified backup before any migration on a database whose data matters. A production backup/RPO/RTO design is still required (NFR-004).

## Path to an institutional environment (not authorised — for planning)
1. Technical Services selects hosting, IdP/MFA and database (DEC-005/006/023).
2. Add the approved IdP / MFA adapter alongside password sign-in (`src/server/actions/auth.ts`) and enable the SSO button on the login page.
3. Create a dedicated least-privilege MySQL user for the application and enable TLS to the database.
4. Put a TLS-terminating reverse proxy with rate limiting in front. The application already sends a per-request nonce Content-Security-Policy (DEC-067): the proxy must pass the `Content-Security-Policy` response header through unchanged and must not cache HTML pages (each carries its own nonce).
5. Ship audit events off-host to WORM storage; configure NTP.
6. Run security testing, DPIA and accreditation before any real data.
