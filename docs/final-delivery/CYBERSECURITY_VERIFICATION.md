# Cybersecurity Verification

Recorded 27 November 2026 for v0.9.1. This is the development team's verification inside the local synthetic environment. It is **not** an independent penetration test, which remains a production prerequisite (Blocked by External Dependency, X03). No testing was performed against external systems or institutional infrastructure. The detailed requirement-by-requirement review from v0.9.0 is in `docs/development/SECURITY_AUDIT.md`; this document adds the directive §9 checklist, the negative tests of §11.4 and the findings of this round.

## §9 review checklist

| Area | Control | Verified by | Result |
|---|---|---|---|
| Authentication | Username and password, scrypt (N=16384, r=8, p=1), generic failure messages, lockout after 5 failures, per-device throttling | `auth-scope` tests | Pass |
| Session security | 256-bit tokens, SHA-256 stored, HttpOnly, SameSite=Strict, Secure in production, idle and absolute expiry, per-session revocation | `auth-scope`, `account-activity` tests | Pass |
| Password hashing | scrypt with per-user salt; minimum 12 characters, three classes | `auth-scope` tests | Pass |
| Role permissions | 27-role catalogue enforced in every domain function; deny by default | `three-tier-roles`, route audit | Pass |
| Organisational scope / tenant isolation | Scope from role assignments and the closure table; out-of-scope reads are a neutral 404 | `access-control`, `scheduling-correspondence`, isolation journey, security probes | Pass |
| API authorisation | `/api/health` exposes only up/down, version and stage; every other data route requires a session and re-checks permission | security probes; route audit | Pass |
| Server actions | Every action calls `requireActor` and a domain function that re-checks permission and scope; Next.js origin check on actions | route audit; domain tests | Pass |
| Input validation | Zod on every input; prohibited-term screening; identifier formats by environment | domain tests | Pass |
| Output encoding / XSS | React escaping, no `dangerouslySetInnerHTML`; nonce CSP with `'strict-dynamic'`; stored-XSS simulation refused | `csp` tests; `e2e/csp.spec.ts`; reflected-input probe | Pass |
| CSRF | SameSite=Strict session cookie; Next.js server-action origin check; explicit same-origin check on export routes | code review; route audit | Pass |
| SQL injection | Parameterised SQL only; identifiers in dynamic SQL come from code, never input; injection-style ids return 404 | code review; security probes | Pass |
| Rate limiting | Sign-in and contact form limited in the application; general rate limiting belongs at the reverse proxy | `auth-scope`, `contact` tests | Pass (application); proxy is infrastructure (X01) |
| File upload | PDF only, 5 MB, structural screen incl. compressed streams, integrity hash, sandboxed attachment download | `scheduling-correspondence` tests; admin-records journey | Pass; malware scanning external (X04) |
| Secure headers | Nonce CSP for pages, `default-src 'none'` for API, `sandbox` for documents, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP | `csp` tests; probes | Pass |
| Environment variables | Credentials only in `.env.local` (git-ignored); setup token constant-time, single use; production cannot show synthetic accounts | `production-setup`, `release` tests | Pass |
| Database privileges | Least-privilege account script ready; development uses XAMPP root | script review | Ready; production use external (X01) |
| Audit protection | Append-only triggers, hash chain serialised by `audit_chain_head`, verification and restore-drill re-verification | `audit-chain` test; `npm run verify:audit` | Pass |
| Error disclosure | Domain errors mapped to safe messages; unexpected errors logged without payload; error boundary shows only a reference | `result.ts`; `error.tsx` | Pass |
| Report export permissions | `report.export` / `personnel.export` / `audit.export` checked; field allowlists; every export audited | `reports` tests; route audit | Pass |
| Backup security | Backups in a git-ignored folder, SHA-256 verified, restore drills; production off-host storage external | `automation-platform` tests | Pass locally |

## Negative tests (§11.4) — the system must refuse safely

| Attempt | Expected | Evidence | Result |
|---|---|---|---|
| Duplicate personnel creation | Refused (service number), possible duplicates flagged | `personnel-assignments` (criterion B) | Refused |
| Invalid organisational assignment | Refused (type rules, scope) | `access-control` | Refused |
| Unauthorised approval / self-approval / two levels by one officer | Refused and audited | `workflows`, `decision-chains`, `personnel-assignments` | Refused |
| Cross-tenant record access | Neutral 404, audited | `access-control`, isolation journey, `npm run test:security` | Refused |
| Conflicting active assignments | Refused (eligibility check under a person lock) | criterion F | Refused |
| Premature routine withdrawal | Refused before 365 days without an approved exception | criterion H | Refused |
| Unauthorised disposition change (no permission, other Division, workflow-only status, missing reason) | Refused, record unchanged, each refusal audited | `transactions` (disposition) | Refused |
| Unauthorised report export | Refused and audited | `reports`, route audit | Refused |
| Invalid document upload (scripted, encrypted, oversized, not PDF) | Refused and audited | `scheduling-correspondence` (9 cases); admin-records journey | Refused |
| Unauthorised account administration | Refused; out-of-scope users hidden | `auth-scope`, `account-activity` | Refused |
| Database transaction failure mid-operation | No partial change; retry succeeds | `transactions` (transfer, correspondence) | Rolled back |
| Manipulated request payloads (foreign org ids, other users' records, path traversal, injection strings) | Refused / 404 | domain tests; `npm run test:security` | Refused |

## Findings this round

| # | Finding | Severity | Fix |
|---|---|---|---|
| S7 | "Failed sign-ins (24 h)" on the security page was counted from the latest 100 attempts, so it would under-report during a password-guessing attack | Medium | Counted in SQL over the full 24 hours |
| S8 | The audit explorer and security events showed only the latest 200 matching events; older events matching a filter could not be reached | Medium (compliance) | Paged with the true total |
| S9 | Several dashboard figures (overdue requests, open maintenance, service overdue, assets by status, stores queues) were derived from lists capped at 300–500 rows | Medium (integrity) | SQL counts and filters over the whole scope |
| S10 | No static analysis of code quality or React rules in CI | Low | ESLint with a zero-warning gate; 9 findings fixed |
| S11 | Refused reads of personnel records (out-of-scope access attempts) returned the neutral 404 but were not written to the audit trail, unlike every other module; one refusal path omitted the record reference | Medium (accountability) | Refusals audited as SECURITY events with the record reference (found by the new disposition negative test, `tests/transactions.test.ts`) |

Earlier findings S1–S6 (v0.9.0) remain fixed and covered by tests.

## Residual risks (external)

Independent penetration test and DPIA (X03); identity provider with MFA (X02); TLS, reverse-proxy rate limiting, least-privilege database account in use, encryption at rest, off-host audit storage and central logging (X01); malware scanning for documents (X04). `style-src 'unsafe-inline'` remains (styles cannot run code).
