# Changelog

All notable changes to ZPS-OMS. Dates are Africa/Lusaka.

## [0.1.0] — 2026-11-25 — Local synthetic prototype
### Added
- Repository placed under git; Phase 1 documentation packages preserved unchanged.
- Domain core: schema v1 (22 tables), RBAC + organisational-scope policy engine, delegation-based approvals, hash-chained append-only audit, server-side sessions, synthetic seed driven through the real services.
- Modules: organisation registry with effective-dated change control; identity & access (provisioning, role + scope assignments, delegations, suspension/deactivation, access reviews); administrative request workflow (multi-level, return/resubmit, cancel, close, controlled reopen); fleet register & maintenance lifecycle with service history; general asset register with custody/transfer/inspection/disposal; reports with audited CSV export; audit explorer & evidence export; security events; platform health; in-app notifications.
- 13 role-specific dashboards including the dedicated **Division Staff Ops** workspace.
- Public pages: Landing, About, Features, Modules, Contact, Secure sign-in (synthetic role simulator).
- Tests: 34 Vitest tests incl. mandated scenarios TS-01…TS-15; route-audit script (all roles × all routes).
- Documentation set required by the master prompt (Part S) plus `PHASE2_ASSESSMENT.md` and generated permission matrix.

### Fixed during verification
- Form input no longer cleared when the server returns a validation/authorisation error.
- No page-level horizontal scrolling at 375 px width.
