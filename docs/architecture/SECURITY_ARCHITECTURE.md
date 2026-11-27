# Security Architecture (current)

| Control | Implementation |
|---|---|
| Authentication | Username + password; scrypt (N=16384, r=8, p=1, 16-byte salt), constant-time comparison, dummy hash for unknown users |
| Brute force | 5 consecutive failures → 15-minute account lockout; >20 failures per device in 15 minutes → throttled; all attempts in `login_attempts` and the audit log |
| Credentials lifecycle | No self-registration; one-time temporary passwords issued by the Platform Super Administrator; forced change at first sign-in (proxy + session guard); password policy (12+ characters, three character classes, not the username) |
| Sessions | 32-byte random token; only its SHA-256 stored; HttpOnly, SameSite=Strict, Secure in production; 30-minute idle and 8-hour absolute expiry; ended on suspension or deactivation |
| MFA | Schema fields reserved (`mfa_enabled`, `mfa_secret`); enabled with the approved identity provider |
| Authorisation | Deny by default; role + organisational scope resolved server-side per request; delegation-based approval; separation of duties; 404 for out-of-scope records; denials audited (`RBAC_PERMISSIONS.md`, `MULTI_TENANCY.md`) |
| Input / output | Zod validation in the domain; parameterised SQL; React output encoding; CSV formula neutralisation; prohibited tactical and location vocabulary refused in requests and areas |
| Headers | Per-request nonce CSP for pages (`script-src` with `'strict-dynamic'`, no `'unsafe-inline'`), `default-src 'none'` for API responses (DEC-067), X-Frame-Options DENY, nosniff, no-referrer, restrictive Permissions-Policy, COOP; `poweredByHeader` off |
| Audit | Hash-chained, append-only `audit_events`; secrets redacted; chain verification for auditors |
| Exports | Permission- and scope-checked per row; every export audited |
| Data | Synthetic only (`demo.` users, "Demo" names, `SYN-` service numbers); credentials only in `.env.local` |
| Database account | **Open item:** local XAMPP `root` without a password. A least-privilege `zps_oms_app` user (SELECT/INSERT/UPDATE/DELETE on `zps_oms_dev`, no DDL outside migrations) is required before any shared deployment |

The threat model is in `docs/THREAT_MODEL.md`. The earlier `docs/SECURITY_ARCHITECTURE.md` is retained for history.
