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
Open http://localhost:3100 → **Secure sign-in** → choose a synthetic account. The database `data/zps-oms-synthetic.db` is created, migrated and seeded automatically on first start.

Production-mode local run:
```powershell
npm run build
$env:ZPS_INSECURE_COOKIE = "1"; npm start   # cookie 'Secure' flag needs HTTPS; this flag allows plain-HTTP localhost review only
```

## Configuration (environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `ZPS_DB_FILE` | `data/zps-oms-synthetic.db` | Database path |
| `ZPS_DEMO_AUTH` | enabled | Set `off` to disable the synthetic sign-in simulator |
| `ZPS_INSECURE_COOKIE` | unset | `1` = omit `Secure` cookie flag under `npm start` on plain HTTP localhost |

## Reset the synthetic data
Stop the server, then `npm run db:reset`, then start again.

## Backup and restore (prototype)
Stop the server and copy `data/zps-oms-synthetic.db` (plus `-wal`/`-shm` if present). Restore by copying back. No automated backups exist; a production backup/RPO/RTO design is required (NFR-004).

## Path to an institutional environment (not authorised — for planning)
1. Technical Services selects hosting, IdP/MFA and database (DEC-005/006/023).
2. Replace the demo simulator with the IdP adapter in `src/server/auth/session.ts`; remove `demoSignIn`.
3. Port schema to PostgreSQL (DATABASE_SCHEMA.md §PostgreSQL port); add row-level security.
4. Put a TLS-terminating reverse proxy with rate limiting in front; add CSP nonces.
5. Ship audit events off-host to WORM storage; configure NTP.
6. Run security testing, DPIA and accreditation before any real data.
