# Known Limitations — ZPS-OMS v0.1 (local synthetic prototype)

## Institutional
- Nothing in this repository is institutionally approved: scope, establishment, roles, delegations, workflows, report definitions, categories and thresholds are all proposals (DECISION_REGISTER.md).
- Organisation names and reporting lines are provisional; intermediate HQ positions are not modelled.

## Functional
- Authentication is a synthetic role simulator — not real authentication; no MFA, no password recovery.
- Workflow and report definitions are read-only (no admin editor) pending approval.
- Overdue escalation is a list only; no automatic re-routing or scheduled reminders; due-date reminders are dashboard-based.
- M07 (scheduling) and M08 (correspondence) are not implemented by design.
- Attachments are not supported (deliberately; needs legal/malware/retention review).
- Org changes with a future effective date apply on the first authenticated request on/after that date (no background scheduler).
- Single-language (English).

## Technical
- SQLite (`node:sqlite`, flagged experimental by Node) — single-writer, local file; not the production database.
- No rate limiting, no CSP nonces (`'unsafe-inline'` scripts allowed for Next.js bootstrap), no encryption at rest, no off-host audit storage, no backup automation, no central logging.
- Audit hash chain detects tampering only if verified; a DB-file-level attacker could rewrite the whole chain (needs external anchoring).

## Quality
- No Playwright E2E, no axe-core scan, no load test, no screen-reader or 200 % zoom testing yet.
- Tablet breakpoint and A4 print output checked only by design, not formally tested.
- Route audit verifies status/denial per route, not every button on every page.
