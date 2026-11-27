# Deployment Readiness

Recorded 27 November 2026 for v0.9.0. No production server, hosting provider or institutional infrastructure has been selected or authorised; nothing below assumes one. This lists what the application already provides and what a production environment must supply. Operating steps are in `docs/DEPLOYMENT_GUIDE.md`.

## What the application provides

| Area | Provided | Evidence |
|---|---|---|
| Build | `npm run build` (Next.js production build, 0 warnings); `npm start` serves it | `TEST_RESULTS.md` |
| Environment separation | `ZPS_ENVIRONMENT` = development / test / production. Production hides the synthetic account list (it cannot be forced on), removes environment banners only when no synthetic records remain, and accepts only the Service's configured identifier formats (DEC-069) | `tests/release.test.ts`, `tests/identifiers.test.ts` |
| Database | Versioned migrations 001–012 with checksums, applied by `npm run db:migrate` or at start; strict SQL mode on every connection; foreign keys, unique and CHECK constraints; multi-record changes in transactions | `tests/migrations.test.ts`, `docs/development/DATABASE_MIGRATION_HISTORY.md` |
| Sessions | Random 256-bit tokens, only SHA-256 stored; HttpOnly, SameSite=Strict, Secure under production; 30-minute idle and 8-hour absolute expiry; per-session and per-user revocation; context switching | `tests/auth-scope.test.ts`, `tests/account-activity.test.ts` |
| Sign-in protection | scrypt password hashes; account lockout after 5 failures for 15 minutes; per-device throttling; forced password change for temporary passwords | `tests/auth-scope.test.ts` |
| Security headers | Per-request nonce CSP with `'strict-dynamic'` for pages; `default-src 'none'` for API responses; `sandbox` CSP on stored documents; X-Frame-Options DENY, nosniff, no-referrer, Permissions-Policy, COOP | `tests/csp.test.ts`, `e2e/csp.spec.ts` |
| Health monitoring | `GET /api/health` readiness (503 when degraded) and `?probe=live` liveness | `tests/automation-platform.test.ts` |
| Logging and errors | Unexpected errors logged without payload to `error_logs` and shown on the platform console; job failures notify platform administrators | platform console |
| Audit | Append-only, hash-chained audit trail; `npm run verify:audit`; restore drills re-verify the chain | `tests/audit-chain.test.ts` |
| Backup and recovery | Verified mysqldump backups (SHA-256), backup monitor, periodic restore drills into a scratch database | `tests/automation-platform.test.ts` |
| Automation | 16 scheduled jobs with execution records, retries and failure alerts; none approves anything | platform console |
| File handling | Correspondence documents: PDF only, 5 MB, structural screen (scripts, launch actions, embedded files, encryption, compressed streams), SHA-256 integrity check on download, served as attachment with a sandbox CSP; storage can be switched off | `tests/scheduling-correspondence.test.ts` |
| Performance baseline | 0 server errors at 1/10/25 users; back-office p95 about 1.1 s at 10 users on the development machine | `docs/evidence/load-test.md` |
| CI | GitHub Actions: type check, tests on MariaDB 10.4, production-dependency audit, build | `.github/workflows/ci.yml` (first run not yet observed) |

## What a production environment must supply (blocked by external dependency)

| # | Requirement | Owner |
|---|---|---|
| 1 | Authorised hosting and network on approved infrastructure; TLS certificates; a reverse proxy with request rate limiting that passes the CSP header through and does not cache HTML | Service ICT / Technical Services |
| 2 | Production MySQL/MariaDB with a least-privilege application account (`db/admin/create_app_user.sql`), TLS to the database, encryption at rest, off-host backups, and an agreed RPO/RTO with a tested disaster-recovery exercise | Service ICT |
| 3 | Approved identity provider for single sign-on and multi-factor authentication (DEC-039) | Service ICT |
| 4 | Central log collection / SIEM, NTP time synchronisation, uptime monitoring on `/api/health`, off-host or WORM audit storage | Service ICT |
| 5 | Malware scanning for stored correspondence documents, and an information-security decision on what correspondence may be stored (DEC-068) | Information security |
| 6 | Identifier formats (`ZPS_FORMAT_SERVICE_NUMBER`, `ZPS_FORMAT_VEHICLE_REGISTRATION`, `ZPS_FORMAT_ASSET_TAG`, `ZPS_FORMAT_FLEET_REF`, `ZPS_FORMAT_STORE_CODE`) | Service |
| 7 | Approved records-retention schedule (NFR-013) | Service records management |
| 8 | Independent penetration test, DPIA and accreditation | Service / independent assessor |
| 9 | Load model and production performance targets (NFR-002) | Service |
| 10 | Production deployment authorisation (`INSTITUTIONAL_APPROVAL_STATUS.md`) | Service |

## Production configuration checklist

1. `NODE_ENV=production`, `ZPS_ENVIRONMENT=production`; never set `ZPS_INSECURE_COOKIE`.
2. `DATABASE_URL` for the least-privilege account; a fresh database (migrations create the schema; the synthetic seed does not run once non-synthetic users exist).
3. Set the identifier formats (item 6). Registration of each kind stays refused until its format is set.
4. Create the first Superadmin account through the approved provisioning procedure; no synthetic account may exist in production (the environment banner warns while any does).
5. Point monitoring at `/api/health`; confirm backups and a first restore drill succeed; confirm `npm run verify:audit` reports no breaks.
