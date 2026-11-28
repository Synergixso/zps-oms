# Security Architecture — ZPS-OMS (prototype)

Status: design and prototype controls. **No security accreditation, penetration test or legal review has occurred.**

## 1. Principles
Deny by default · least privilege · server-side authorisation only · separation of technical / security / audit / business duties · data minimisation · everything auditable · no external integrations.

## 2. Layers
```
Browser ──(HTTPS in prod; cookie)──> Next.js server
  src/app/*            presentation (server components; client components only for forms/nav)
  src/server/actions   thin adapters: read FormData, call domain, map errors
  src/server/auth      session → Actor; page gates (defence in depth)
  src/server/domain    business rules + ALL authorisation + audit   ← single enforcement point
  src/server/db        schema, connection, transactions (parameterised SQL only)
```

## 3. Authorisation (policy.ts)
1. `loadActor` reads the user and *currently valid* assignments from the DB on every request (revocation/expiry/suspension immediate).
2. `scopeFor(actor, perm)` → `{ national, units[] }`. NATIONAL only from HQ-held assignments.
3. Lists use `scopeSql` (parameterised `IN (...)`); details check `can()` and return NOT_FOUND when out of scope (no existence disclosure).
4. Approvals: `canApprove` = delegation + business role at the org; self-approval refused; multi-level steps bound to specific org units so a later level cannot be approved first.
5. Separation of duties: proposer ≠ org-change approver; maintenance completion submitter ≠ verifier; reviewers cannot certify their own access; admins cannot change their own access or status.
6. Denials are audited (`authz.denied:*`, `page.denied:*`, action-specific DENIED events).

## 4. Authentication and sessions
- Prototype: synthetic role simulator (no passwords). Production: approved IdP with MFA (DEC-005).
- 256-bit random token; only SHA-256 stored; HttpOnly, SameSite=Strict, Secure in production; 30-min idle, 8-h absolute; deleted on sign-out, suspension and deactivation.

## 5. Input and output handling
- Zod schemas on every create/update; enums for statuses/actions; length limits; synthetic-pattern checks on references.
- SQL: prepared statements only; the few dynamic fragments (column lists, IN placeholders) are built from code constants, never user input.
- React escapes all output; no `dangerouslySetInnerHTML`.
- CSV export: formula-injection guard (`=+-@` prefixed with `'`), quoted fields, synthetic banner.
- Prohibited-term screening for asset text (excluded equipment classes).

## 6. HTTP hardening (`src/proxy.ts`, `next.config.ts`)
Pages: per-request nonce CSP from `src/proxy.ts` (`src/server/lib/csp.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `'unsafe-inline'`; `'unsafe-eval'` in development only), `style-src 'self'` in production (no style attributes or inline `<style>`; dynamic sizes use literal classes from `src/components/sizing.ts`; `'unsafe-inline'` in development only, for the Next.js dev server; v0.12.0), `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`, no remote scripts, fonts or images. Every page renders per request so its scripts carry the nonce. API responses: `default-src 'none'`. Verified by `tests/csp.test.ts` and `e2e/csp.spec.ts` (injected inline script and inline event handler are refused; no violations on normal pages) (DEC-067). Other headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `poweredByHeader: false`, `robots: noindex`. CSRF: server-action origin check + explicit same-origin check on export routes.

## 7. Audit
Append-only (DB triggers), hash-chained, verifiable; secrets redacted by key name; no application permission writes or edits audit rows; evidence export is itself audited.

## 8. Secrets
None exist in the prototype. `.env*` git-ignored. No credentials in seed data or logs.

## 9. Not yet implemented (production prerequisites)
Rate limiting (no reverse proxy locally), MFA/IdP, encryption at rest, WORM audit storage, centralised logging/SIEM, time synchronisation (NTP) on hosts, penetration test, DPIA. (Backup/restore automation, CI dependency scanning and CSP nonces are now in place.) See THREAT_MODEL.md and KNOWN_LIMITATIONS.md.

## 10. Legal and policy review (not legal advice)
To be assessed by the Service's Legal Directorate / DPO / Technical Services: Data Protection Act 2021; Cyber Security Act 2025; Cyber Crimes Act 2025; Electronic Government Act 2021; Public Procurement Act 2020 (if procurement later); SMART Zambia Institute guidelines; Zambia Police Act and standing orders.
