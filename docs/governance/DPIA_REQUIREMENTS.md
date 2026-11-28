# Data Protection Impact Assessment (DPIA) — requirements and preparation pack

Issue #13 (X-08). Prepared 28 Nov 2026 for v0.13.x. **This is not a DPIA and not a penetration test.** It lists what the Service's data protection and information-security officers need in order to carry out the assessment, and what the system already provides. No independent assessment has been performed; only internal testing exists.

## 1. Processing to be assessed
| Item | Content |
|---|---|
| Purpose | Administrative management of Operations personnel, manpower, rosters, duty-area assignments, transfers, tenure, administrative requests, fleet and general assets, correspondence and command administration |
| Data subjects | Police officers and civilian staff of the Service; system users |
| Personal data | Name, service number, rank, home unit, employment and disposition status, assignment history, attendance status (platoon register), user account and audit data |
| Excluded by design | Location / GPS, patrol routes, tactical deployment, intelligence content, informants, investigations, firearms (CLAUDE.md; DEC-028 … DEC-037) |
| Special categories | None intended. Medical or disciplinary detail must not be entered (free text is screened for excluded terms; liaison and engagement records have no content field) |
| Recipients | Users within their role scope and command offices; no external recipients; no third-party processors (ZMW 0, self-hosted) |
| Retention | To be set by the Service (NFR-013); personnel history is append-only; audit hash chain is permanent |

## 2. Questions the assessors must answer
1. Lawful basis and legal instruments for processing personnel data in this system (Zambia Police Act, Cap. 107; the Data Protection Act No. 3 of 2021).
2. Whether the role catalogue (31 roles, DEC-072) and scopes are proportionate (`docs/generated/PERMISSION_MATRIX.md`).
3. Retention periods per record type, and the archive/deletion policy.
4. Whether the platoon attendance register (DEC-080) is proportionate and who may see individual entries (today: the Platoon Commander office with personnel scope; the Area Commander sees counts only).
5. Hosting location, backup storage, encryption at rest and key management (#11).
6. Identity provider and MFA (#9).
7. Breach notification procedure and responsible officer.

## 3. Controls already implemented (evidence for the assessors)
| Control | Evidence |
|---|---|
| Deny-by-default role + organisational scope, server-side | `policy.ts`; route audit (every route as every synthetic user); `access-control`, `auth-scope` tests |
| Command authority only by appointment to an office | `command.ts`; `command`, `command-negative`, `field-command` tests |
| Tamper-evident audit (hash chain, UPDATE/DELETE blocked by triggers) | ADR-004; `npm run verify:audit`; `audit-chain` test |
| Sessions: hashed tokens, HttpOnly/Secure cookies, lockout, expiry | `sessions.ts`, `auth.ts`; security probes |
| CSP with per-request nonce, strict production `style-src`, no inline scripts | `csp.ts`; `csp` tests; security probes |
| Injection-safe SQL (parameterised, strict SQL mode) | DEC-061 |
| Synthetic-only data outside production (identifier rules) | `identifiers.ts`; `identifiers` test |
| Upload screening; malware scanner required in production | `screenPdf`, `malware-scan.ts`; `malware-scan` test (EICAR) |
| Controlled import, all-or-nothing, audited with file fingerprint | `data-import.ts`; `data-import` test |
| Configuration validation without exposing secrets | `config-check.ts`; `npm run check:config` |
| Backups with checksums and automatic restore drills | DEPLOYMENT_GUIDE "Backup and restore" |

## 4. Preparing the independent penetration test
- Environment: a production-configured instance (`ZPS_ENVIRONMENT=production`, production build, TLS) loaded with synthetic data only — the assessor must not need real data.
- Scope: all `/app/*` routes, `/api/health`, server actions, file download and upload routes, session handling, the import page.
- Accounts: one account per role and per command office type, issued to the assessor for the test window and disabled afterwards.
- Out of scope unless the Service decides otherwise: denial-of-service testing and social engineering.
- Inputs for the assessor: `SECURITY_ARCHITECTURE.md`, `THREAT_MODEL.md`, `development/SECURITY_AUDIT.md`, `final-delivery/CYBERSECURITY_VERIFICATION.md`, the permission matrix and `scripts/security-probe.mjs`.
- Acceptance: report received; every high or critical finding fixed and retested; residual risks accepted in writing by the Service.
