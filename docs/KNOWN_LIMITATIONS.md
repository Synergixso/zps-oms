# Known Limitations — ZPS-OMS v0.8.2 (local synthetic build)

Reviewed 26 November 2026 against the code, the test evidence in `docs/evidence/` and `docs/development/KNOWN_ISSUES.md`. Items are grouped by who can close them. "Resolved since v0.1" at the end records the earlier limitations that no longer apply, so readers of older copies can see what changed.

## 1. Awaiting Service decisions (not engineering)
- Nothing in this repository is institutionally approved: scope, establishment, the 27 roles, delegations, decision chains, report definitions, categories and thresholds are proposals (`DECISION_REGISTER.md`, `docs/governance/INSTITUTIONAL_DECISIONS_PACK.md`).
- Organisation names and reporting lines are synthetic and provisional; intermediate HQ positions are not modelled (DEC-004). Temporary attachments and acting arrangements are not implemented pending policy.
- Tenure, renewal and exception rules are proposed defaults (DEC-041); rank list, disposition labels and operational areas are synthetic configuration data.
- Sign-in is by username. Service-number sign-in needs user-to-personnel linking that has not been authorised; Government ID single sign-on and multi-factor authentication await an approved identity provider (DEC-039). There is no self-service password reset by design: temporary passwords are issued by the Platform Super Administrator.
- Data retention periods await an approved records schedule (NFR-013, DEC-019); only operational housekeeping (for example 30-day report deliveries) is applied.
- Administrative scheduling (M07) and correspondence (M08) are later-phase by design. Attachments are not supported, deliberately, until legal, malware-scanning and retention requirements are set.
- Exception and renewal decisions are single delegated decisions; multi-level chains exist for assignment approval and transfer release and can be extended if the Service requires it (KNOWN_ISSUES 3).
- Performance targets: the load baseline (`docs/evidence/load-test.md`) uses provisional development budgets; production p95 targets need the Service's load model and the target infrastructure (NFR-002). Availability targets need an infrastructure assessment (NFR-001).

## 2. Production prerequisites (engineering, on the target infrastructure)
- The local database uses the XAMPP `root` account. `db/admin/create_app_user.sql` creates least-privilege application and read-only accounts; TLS to the database, encryption at rest and off-host backups are infrastructure work.
- Content Security Policy allows `'unsafe-inline'` scripts and styles, which the Next.js bootstrap needs without nonces. Moving to per-request nonces is planned with the production deployment (it makes every page dynamic, so it should be measured there).
- Rate limiting is applied in the application to sign-in (per account lockout and per-device throttling) and to the public contact form; general request rate limiting belongs at the reverse proxy, which does not exist locally.
- The audit hash chain detects tampering when verified (`npm run verify:audit`, restore drills); protection against an attacker who can rewrite the whole database needs external anchoring or WORM storage.
- No central logging/SIEM, host time synchronisation (NTP) or monitoring stack locally; the `/api/health` endpoint (readiness and liveness) is ready for one.
- The GitHub Actions workflow has not yet been observed running on GitHub (KNOWN_ISSUES 11).
- Penetration test and DPIA are outstanding (NFR-005).

## 3. Quality and testing gaps
- Accessibility: automated WCAG 2.2 A/AA rules pass (axe-core, `docs/evidence/accessibility.md`) and pages reflow at 320 px and 200 % zoom (`docs/evidence/reflow.md`). A manual audit with keyboard-only use and a screen reader, and user testing with representative roles (NFR-007), are still required.
- Exported .xlsx files are validated structurally (ZIP, CRC and XML checks) but have not yet been opened in a licensed Excel installation (KNOWN_ISSUES 6).
- Tablet breakpoints and A4 print output are checked by design and spot checks, not by an automated test.
- The route audit verifies the status and access decision of 83 routes for every account, not every button on every page; the Playwright journeys cover the main workflows.
- The load test runs on a single developer machine against the local database; it is a baseline, not a capacity test.
- Single language (English), as NFR-012 specifies "English first".

## Resolved since v0.1
| v0.1 limitation | Now |
|---|---|
| Authentication was a role simulator | Username and password sign-in with scrypt hashes, account lockout, device throttling, forced password change, session revocation and context switching (`src/server/domain/auth.ts`, `sessions.ts`) |
| Workflow definitions read-only | Assignment and transfer decision chains are configurable and versioned (`decision-chains.ts`, v0.6.0) |
| No scheduler; reminders on dashboards only; effective-dated changes applied on request | Automation engine with 14 jobs: effective-dated organisation changes, assignment time events, review, contribution, maintenance and custody reminders, overdue approvals, access expiry, unusual access, stores reorder, scheduled reports, backup monitor, restore drill, housekeeping (`src/server/jobs/engine.ts`) |
| PDF via browser print only; Excel as CSV | Server-side roster PDF (pdfkit, free) and a dependency-free .xlsx writer (`src/server/lib/xlsx.ts`) |
| No backup automation | Verified mysqldump backups, backup monitor and periodic restore drills that check schema version and the audit chain (`platform.ts`, DEC-060) |
| No Playwright E2E, no axe-core scan, no zoom testing | 8 Playwright journeys, axe-core scan (62 page views), reflow at 320 px and 200 % zoom, phone review of all 27 dashboards |
| No load test | Dependency-free load and page-weight baseline (`npm run test:load`) |
| No dependency scanning | `npm audit` for production packages in CI |
