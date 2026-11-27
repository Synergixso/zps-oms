# Threat Model — ZPS-OMS (STRIDE, prototype scope)

Assets: org directory, access grants & delegations, administrative requests, fleet/asset registers, audit trail, sessions.
Actors: authorised users of each role; a malicious insider with a valid account; an external attacker on the same network (production); a compromised administrator.

| # | Threat (STRIDE) | Scenario | Mitigation in prototype | Residual / production action |
|---|---|---|---|---|
| T1 | Spoofing | Forged/stolen session cookie | Random 256-bit token, hash stored, HttpOnly, SameSite=Strict, idle/absolute expiry | TLS, IdP + MFA, device binding |
| T2 | Spoofing | Demo simulator left enabled outside local review | Prominent labelling; `ZPS_DEMO_AUTH=off`; platform page shows status | Remove simulator from production build |
| T3 | Tampering | Change `originOrgId`/record id in request payload or URL | Scope recomputed server-side; out-of-scope → NOT_FOUND/FORBIDDEN (TS-02, TS-04, route audit) | Keep tests in CI |
| T4 | Tampering | Bypass approval sequence or self-approve | Level-bound delegations; self-approval refused (TS-11) | — |
| T5 | Tampering | Edit closed request | State guard; controlled reopen only (TS-12) | — |
| T6 | Tampering | Alter/delete audit rows | Triggers abort; hash chain verification (TS-13) | WORM/off-host log shipping; DB role without UPDATE/DELETE |
| T7 | Repudiation | Deny having approved/exported | Audit with actor, time, reference; export register | Time sync, signed logs |
| T8 | Information disclosure | Cross-province / cross-formation browsing | Unit-scoped coverage; existence not disclosed | Row-level security in PostgreSQL |
| T9 | Information disclosure | Over-broad export | Field allowlist per report; export permission; audited (TS-14) | DLP review of report definitions |
| T10 | Information disclosure | Platform admin reads business data | No business permissions (TS-08) | DB-level separation of duties |
| T11 | Information disclosure | Sensitive data typed into free text | Warnings; prohibited-term screening (assets); categories allowlisted | Field classification, DPIA, content scanning |
| T12 | Information disclosure | Clickjacking / framing | `frame-ancestors 'none'`, X-Frame-Options DENY | — |
| T13 | Denial of service | Request flooding | Limits on list sizes (≤500/1000 rows) | Reverse-proxy rate limiting, WAF |
| T14 | Elevation of privilege | Admin grants themselves access | Self-changes refused (TS-09) | Two-person rule for privileged grants |
| T15 | Elevation of privilege | Delegation to technical/security role | `canApprove` requires business role; grant refused (TS-09) | — |
| T16 | Elevation of privilege | Stale access after transfer | Revocation immediate; expiry enforced (TS-10); access reviews | Automated HR-driven deprovisioning |
| T17 | Tampering | CSRF on state-changing endpoints | Server-action origin check; same-origin check on export routes; SameSite=Strict | — |
| T18 | Tampering | CSV formula injection in exports | Prefix guard | — |
| T19 | Supply chain | Malicious npm dependency | Minimal dependency set; versions pinned in lockfile; `npm audit` = 0 vulnerabilities; `npm audit --omit=dev` in CI | SBOM; review of each new dependency |
| T20 | Information disclosure | Error messages leak internals | Domain errors map to safe messages; unexpected errors logged without payload | Central error monitoring |
| T22 | Tampering / EoP | A malicious document stored with correspondence (scripted PDF, launch action, embedded file, decompression bomb) | PDF only, 5 MB; structural screen including compressed streams and an expansion limit; encrypted PDFs refused; SHA-256 integrity; served only as an attachment with `Content-Security-Policy: sandbox`; uploads and downloads audited; storage switchable (DEC-068) | Malware scanning before production; information-security decision on what may be stored |
| T23 | Information disclosure | Demonstration data or accounts in a production database | Production runs only the reference baseline; synthetic account list never shown; environment banner warns while synthetic accounts exist (DEC-069) | Remove any synthetic account before Service information is entered |
| T21 | Tampering / EoP | Cross-site scripting: stored or reflected markup runs as script in another user's session | React escapes all output (no `dangerouslySetInnerHTML`); per-request nonce CSP with `'strict-dynamic'` refuses injected inline scripts and inline event handlers (`e2e/csp.spec.ts` stored-XSS simulation); `object-src 'none'`, `base-uri 'self'` | Keep `'unsafe-inline'` out of `script-src`; consider Trusted Types; penetration test |
