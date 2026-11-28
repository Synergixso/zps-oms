# Security Audit (internal)

Recorded 27 November 2026 for v0.9.0. This is the development team's own review against the directive's §9 requirements, the threat model (`docs/THREAT_MODEL.md`, T1–T21) and the test evidence. It is **not** an independent penetration test, which remains required before production (NFR-005).

## Requirement-by-requirement

| Requirement (§9) | Implementation | Verified by | Result |
|---|---|---|---|
| Secure authentication | Username and password; scrypt hashes with per-user salt; generic failure messages | `auth-scope` tests | Met |
| Strong password hashing | scrypt (N=16384, r=8, p=1, 32-byte key), 16-byte per-user salt; password policy: at least 12 characters and three character classes | `auth-scope` tests | Met |
| Session security | 256-bit random tokens, only SHA-256 stored; HttpOnly, SameSite=Strict, Secure in production; 30-minute idle and 8-hour absolute expiry; revocation per session and per user; ended on suspension and password reset | `auth-scope`, `account-activity` tests | Met |
| MFA readiness | `users.mfa_enabled` / `mfa_secret` columns exist; SSO button shown as unavailable; adapter point documented | — | Ready; blocked by external IdP decision (DEC-039) |
| Role-based access control | 27 roles, permissions with UNIT/SUBTREE/NATIONAL coverage, enforced in every domain function | `three-tier-roles`, `access-control` tests; route audit | Met |
| Tenant isolation / organisational scope | Scope resolved server-side from role assignments and the closure table; ids from the browser never trusted; out-of-scope reads return 404 | `access-control`, `scheduling-correspondence` tests; Playwright isolation journey; route audit | Met |
| Deny by default; least privilege | Unlisted permissions are refused; technical roles hold no business permissions; role 16 restricted; Superadmin alone configures the platform | `three-tier-roles` tests; `PERMISSION_VERIFICATION_REPORT.md` | Met |
| Separation of duties | No self-approval; one officer cannot decide two levels of a chain; approval needs delegation + business role; only correspondence managers file | `workflows`, `decision-chains`, `scheduling-correspondence` tests | Met |
| Protected audit records | Append-only (triggers), hash chain serialised through `audit_chain_head`, verification script and restore-drill re-verification | `audit-chain` test; `npm run verify:audit` | Met; off-host anchoring needs infrastructure |
| Secure report exports | Field allowlists per report, `report.export` permission, scope applied, every export audited, CSV formula-injection guard | `reports`, `report-schedules` tests | Met |
| Input validation | Zod schemas on every domain input; prohibited-term screening; identifier formats by environment; strict SQL mode | domain tests; `identifiers` tests | Met |
| Output encoding / XSS | React escaping (no `dangerouslySetInnerHTML`); per-request nonce CSP with `'strict-dynamic'`; injected inline script and handler refused | `csp` tests; `e2e/csp.spec.ts` stored-XSS simulation | Met |
| Rate limiting | Sign-in: account lockout and per-device throttling; public contact form limited | `auth-scope`, `contact` tests | Met in the application; general request rate limiting belongs at the reverse proxy (infrastructure) |
| Database access controls | Parameterised SQL only; least-privilege account script `db/admin/create_app_user.sql` | code review | Script ready; local development still uses XAMPP root (KNOWN_ISSUES 1) |
| Secure environment variables | Credentials only in `.env.local` (git-ignored); `ZPS_SETUP_TOKEN` compared in constant time and only usable while no account exists | `production-setup` test | Met |
| Account suspension / access revocation | Immediate sign-out on suspension; assignments and delegations revocable and expiring | `auth-scope` tests | Met |
| Backup and recovery | Verified backups, monitoring, periodic restore drills | `automation-platform` tests | Met locally; production RPO/RTO design needed |
| File handling (new) | PDF only, 5 MB, structural screen (signature, end marker, encryption, JavaScript/launch/embedded files/automatic actions, compressed streams, decompression-bomb limit), SHA-256 integrity, attachment + `sandbox` CSP on download, audited | `scheduling-correspondence` tests; `e2e/admin-records.spec.ts` | Met for screening; malware scanning required before production (DEC-068) |
| Direct requests, not just the interface | The route audit requests every route as every account; domain tests call functions directly without the UI | route audit; domain tests | Met |

## Findings and fixes in this release

| # | Finding | Severity | Fix |
|---|---|---|---|
| S1 | A fresh database in production would have been filled with synthetic demonstration accounts by the start-up seed | High | Production runs only the reference baseline; first account through token-protected `/setup` (`production-setup` test) |
| S2 | Accounts created through the application were always flagged synthetic (column default) | Medium | Flag set from the environment |
| S3 | `ZPS_SHOW_DEMO_ACCOUNTS=1` could show the synthetic account list in a production build | Medium | Never shown when `ZPS_ENVIRONMENT=production` |
| S4 | Synthetic-only identifier and username rules would have blocked real records, inviting ad-hoc bypasses | Medium | Environment-based formats; production refuses synthetic values and refuses registration until a format is configured |
| S5 | The page CSP replaced the stricter `sandbox` policy on document downloads | Medium | Proxy leaves document downloads to their own policy (found by `e2e/admin-records.spec.ts`) |
| S6 | Correspondence assignees could include national users outside the record's line | Low | Assignees must serve at the record's unit or below |

## Residual risks (need external action)

Independent penetration test; IdP with MFA; TLS and reverse-proxy rate limiting; least-privilege database account in use; encryption at rest; off-host/WORM audit storage; central logging; malware scanning for documents; DPIA. `'unsafe-inline'` remained in `style-src` at the time of this audit (resolved for production in v0.12.0). Dependency audit: `npm audit --omit=dev` reports 0 vulnerabilities (CI step).
