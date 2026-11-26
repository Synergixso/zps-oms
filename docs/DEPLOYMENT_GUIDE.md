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
| `ZPS_SHOW_DEMO_ACCOUNTS` | on in development, off in production | `1` forces / `0` hides the synthetic account list on the sign-in page |
| `ZPS_INSECURE_COOKIE` | unset | `1` = omit `Secure` cookie flag under `npm start` on plain HTTP localhost |
| `NEXT_DIST_DIR` | `.next` | Build folder (the Playwright server uses `.next-e2e`) |

## Tests
`npm test` (Vitest, `zps_oms_test`), `npm run test:e2e` (Playwright in Microsoft Edge, `zps_oms_e2e`, port 3200), `npm run audit:routes` (needs `npm run dev`).

## Reset the synthetic data
Stop the server, run `npm run db:reset` (drops and recreates the local `zps_oms_*` database; refuses any other name), then start again to reseed.

## Backup and restore (prototype)
Back up with `C:\xampp\mysql\bin\mysqldump -u root zps_oms_dev > backup.sql` and restore with `C:\xampp\mysql\bin\mysql -u root zps_oms_dev < backup.sql`. Take a verified backup before any migration on a database whose data matters. A production backup/RPO/RTO design is still required (NFR-004).

## Path to an institutional environment (not authorised — for planning)
1. Technical Services selects hosting, IdP/MFA and database (DEC-005/006/023).
2. Add the approved IdP / MFA adapter alongside password sign-in (`src/server/actions/auth.ts`) and enable the SSO button on the login page.
3. Create a dedicated least-privilege MySQL user for the application and enable TLS to the database.
4. Put a TLS-terminating reverse proxy with rate limiting in front; add CSP nonces.
5. Ship audit events off-host to WORM storage; configure NTP.
6. Run security testing, DPIA and accreditation before any real data.
