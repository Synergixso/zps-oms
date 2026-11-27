# Execution Register — Master Final Engineering Directive

Live task register (directive §15). Statuses: Not Started · In Progress · Partially Implemented · Implemented · Tested · Completed and Verified · Blocked by External Dependency. Evidence paths are relative to the repository root. Earlier releases (v0.1–v0.9.0) are summarised in `CHANGELOG.md`; this register covers the work done under this directive (v0.9.1).

| ID | Stage | Module / role | Requirement | Dependency | Status | Test result | Evidence | Blocker |
|---|---|---|---|---|---|---|---|---|
| T01 | 1 | All | Full audit of code, database, routes, roles, tests, CI | — | Completed and Verified | Audit recorded | `COMPREHENSIVE_EXISTING_SYSTEM_AUDIT.md` | — |
| T02 | 1 | DB | Back up the development database before changes | XAMPP MySQL | Completed and Verified | Dump completed (5.3 MB) | `backups/zps_oms_dev_pre_final_*.sql` (git-ignored) | — |
| T03 | 2 | All | Requirements matrix against the 17-module, 27-role architecture | T01 | Completed and Verified | — | `COMPLETE_SYSTEM_REQUIREMENTS_MATRIX.md` | — |
| T04 | 7, 12, 13 | 03, 04, 09, 10, 11, 17, 02 | Registers paged with a true total (previously silent cut-off at 300–500 rows) | T01 | Completed and Verified | `tests/paging.test.ts` 3/3; register pages in browser | `src/server/domain/paging.ts`; `src/components/pager.tsx` | — |
| T05 | 12 | 09, 10, 11 | Dashboard figures counted in SQL over the whole scope (previously derived from capped lists: overdue requests, open maintenance, service overdue, assets by status, stores queues) | T04 | Completed and Verified | `tests/paging.test.ts` (overdue rule); full suite | `fleetFigures`, `assetFigures`, `maintenanceStatusCounts`, request filters | — |
| T06 | 17 | 07, 08, 17 | Transaction failure leaves no partial change | — | Completed and Verified | `tests/transactions.test.ts` 2/2 | Failure injected mid-transfer and mid-registration | — |
| T07 | 13 | 07, 08, 03 | Audit events carry before/after values, authorising unit and delegation reference | — | Completed and Verified | `tests/transactions.test.ts` (audit values) | `policy.delegationReference`; assignment, transfer, personnel events | — |
| T08 | 15 | DevOps | ESLint (Next.js core-web-vitals + TypeScript), zero warnings, in CI | — | Completed and Verified | `npm run lint`: 0 errors, 0 warnings | `eslint.config.mjs`; `.github/workflows/ci.yml` | — |
| T09 | 15 | UI | Fix the 9 React-hook findings (sidebar storage, contact form, chart) | T08 | Completed and Verified | Lint clean; checked in the browser | `shell.tsx`, `contact-form.tsx`, `charts.tsx` | — |
| T10 | 12 | UI | Navigation loading indicator and error boundary for the back office | — | Tested | Type check, lint and code review; the error boundary only shows on a server fault, so it has not been exercised in the browser. The first loading boundary broke 404 statuses (B11) and was replaced by a link pending indicator | `src/components/shell.tsx`, `src/app/app/error.tsx`, `src/app/global-error.tsx` | — |
| T11 | 12 | 09 | User-selectable sort on the requests register | T04 | Tested | Browser check (sort=due) | `src/app/app/requests/page.tsx` | — |
| T17 | 14 | 14 | Audit explorer and security events paged with a true total (previously latest 200 only) | T04 | Tested | `tests/paging.test.ts`; browser (page 3 of 14,706 events) | `src/server/domain/auditq.ts` | — |
| T18 | 8 | 05 | Rosters index paged (previously cut off at 300) | T04 | Tested | `tests/paging.test.ts`; browser | `rosterIndex` | — |
| T12 | 6 | 27 roles | Per-role verification of identity, context, dashboard, navigation, modules, page/action/approval permissions, notifications, statistics, reports, audit, sessions | Route audit | In Progress | Route audit, 0 server errors | `ALL_27_ROLES_VERIFICATION.md` (generated) | — |
| T13 | 17 | Security | Cybersecurity verification (direct requests, manipulated payloads, rollback, headers, uploads) | T04–T07 | In Progress | `npm run test:security` 14/14; domain and browser tests | `CYBERSECURITY_VERIFICATION.md` | Independent penetration test (external) |
| T14 | 17 | QA | Beta testing: happy path, negative, regression, browser | All | In Progress | See report | `BETA_TESTING_REPORT.md` | — |
| T15 | 18 | All | Regression: unit, browser, route audit, load, build | All | In Progress | See results | `COMPLETE_WORKFLOW_TEST_RESULTS.md` | — |
| T16 | 19 | All | Final documentation and delivery report | All | In Progress | — | `FINAL_DELIVERY_REPORT.md` | — |
| X01 | — | Production | Production infrastructure, TLS, least-privilege DB account, off-host backups, monitoring | Service ICT | Blocked by External Dependency | — | `docs/development/DEPLOYMENT_READINESS.md` | Infrastructure not provided |
| X02 | — | 02 | Single sign-on and MFA | Approved identity provider | Blocked by External Dependency | — | DEC-039 | IdP decision |
| X03 | — | Security | Independent penetration test and DPIA | Production-configured deployment | Blocked by External Dependency | — | `CYBERSECURITY_VERIFICATION.md` | Assessor and environment |
| X04 | — | 17 | Malware scanning for stored documents | Information-security decision | Blocked by External Dependency | — | DEC-068 | Scanner and policy |
| X05 | — | 03, 10, 11 | Production identifier formats | Service decision | Blocked by External Dependency | — | DEC-069 | Formats not supplied |
| X06 | — | Governance | Institutional approval and deployment authorisation | Service | Blocked by External Dependency | — | `INSTITUTIONAL_APPROVAL_STATUS.md` | Service decision |
