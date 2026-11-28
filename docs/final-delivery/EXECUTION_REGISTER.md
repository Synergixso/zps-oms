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
## v0.10.0 — Final system completion and role catalogue restructuring (owner directive 27 Nov 2026)

| ID | Stage | Module / role | Requirement | Dependency | Status | Test result | Evidence | Blocker |
|---|---|---|---|---|---|---|---|---|
| V01 | 1 | All | Audit of code, database and running application for the new directive | — | Completed and Verified | Findings F1–F13 | `FINAL_CODEBASE_AUDIT.md` | — |
| V02 | 2 | DB | Back up before migration 013 | XAMPP MySQL | Completed and Verified | Dump completed (7.5 MB), SHA-256 recorded | `backups/zps_oms_dev_pre013_*.sql` (git-ignored) | — |
| V03 | 3 | 02 | Retire every role outside the catalogue; revoke and flag live assignments; no guessed replacement; delete only unreferenced rows | V02 | Completed and Verified | `role-migration` 2/2 | `bootstrap.syncCatalogue`; `ROLE_DEPRECATION_AND_MIGRATION_REPORT.md` | — |
| V04 | 4 | 02 | Authoritative 31-role catalogue, 7 / 12 / 11 / 1, numbered 1–31 | V03 | Completed and Verified | `three-tier-roles`, `auth-scope` | `UPDATED_31_ROLE_CATALOGUE.md` (generated) | — |
| V05 | 5 | 01, 02 | Central RBAC with tier 4, restricted `liaison.*` namespace, technical/business/liaison separation | V04 | Completed and Verified | `liaison` › catalogue; `three-tier-roles` | `UPDATED_PERMISSION_MATRIX.md` (generated) | — |
| V06 | 6 | Tier 1 | Six Tier 1 roles kept; National Police Intelligence Officer back office | V05 | Tested | route audit; `e2e/liaison.spec.ts` | `TIER_1_DASHBOARD_VERIFICATION.md` | — |
| V07 | 7 | Tier 2 | Eleven Tier 2 roles kept; Division Police Intelligence Officer back office | V05 | Tested | route audit; browser | `TIER_2_DASHBOARD_VERIFICATION.md` | — |
| V08 | 8 | Tier 3 | Ten Tier 3 roles kept; District Police Intelligence Officer back office | V05 | Tested | route audit; browser | `TIER_3_DASHBOARD_VERIFICATION.md` | — |
| V09 | 9 | Tier 4 | Section / Police Station Police Intelligence Officer back office | V05 | Tested | route audit; browser | `TIER_4_INTELLIGENCE_ROLE_VERIFICATION.md` | — |
| V10 | 10, 11 | 09, 12, 13, 14 | Liaison metadata, routing channels, receipt, acknowledgement, notifications, history, dashboards | V05 | Completed and Verified | `liaison` 8/8; `e2e/liaison.spec.ts` 5/5 | `INTELLIGENCE_LIAISON_SCOPE_AND_ACCESS_CONTROLS.md` | — |
| V11 | 10 | 12 | Dashboard module panel showed Modules 16 and 17 as "planned" | — | Completed and Verified | browser | `src/app/app/overview.tsx` | — |
| V12 | 12 | Public site | Modules page removed, `/modules` → `/features`, accurate copy, no intelligence functionality implied | — | Tested | `e2e/public-site.spec.ts` | DEC-073 (liaison roles not advertised) | — |
| V13 | 13 | Security | Multi-tenant and liaison security verification; new HTTP probes | V10 | Tested | 37/37 security probes | `MULTI_TENANT_SECURITY_REPORT.md` | — |
| V14 | 14, 15 | All | Beta and end-to-end testing for all 31 roles; defects fixed | V13 | Tested | 189/189 unit; 30/30 browser; route audit 0 server errors | `END_TO_END_TEST_RESULTS.md` | — |
| V15 | 16 | All | Production-readiness verification and documentation | V14 | Implemented | readiness report complete | `PRODUCTION_READINESS_REPORT.md` | Penetration test; production environment |
| X07 | — | Liaison | Information-security and legal review of the liaison metadata, classification list and retention | Service | Blocked by External Dependency | — | DEC-073 | Service decision |

## v0.11.0 — Command hierarchy, directives and reporting (owner directive 27 Nov 2026)

| ID | Stage | Area | Requirement | Status | Test result | Evidence |
|---|---|---|---|---|---|---|
| W01 | 1–3 | All | Code, database and application audit; evidence-based baseline status report with weighted percentages; remaining register; new-direction gap analysis | Completed and Verified | Baseline 64.8 % / 64.0 % | `COMPLETE_ZPS_OMS_DEVELOPMENT_STATUS_REPORT.md` (generated) |
| W02 | 4 | Hierarchy | IG as the highest authority; DIG offices under the IG; no upward instruction | Completed and Verified | Test A | `NATIONAL_COMMAND_HIERARCHY.md` |
| W03 | 5 | Directives | Downward directives with authority validation, categories, acknowledgement, assignment onward, progress, completion, closure, consolidated status | Completed and Verified | Test B | `DIRECTIVE_WORKFLOW.md` |
| W04 | 6 | Reports | Upward reports with acknowledgement, review, return, resubmission, forwarding, closure | Completed and Verified | Tests C, D, F | `UPWARD_REPORTING_WORKFLOW.md` |
| W05 | 7 | Mobile Unit | Junior chain and the Area Commander's two channels; one report with separate recipient records | Completed and Verified (structure requires validation) | Test E | `MOBILE_UNIT_REPORTING_STRUCTURE.md`, `PARALLEL_REPORTING_MODEL.md` |
| W06 | 8 | Authority | Acting appointments with delegated actions and expiry; conflict referral to the common superior | Completed and Verified | Tests G, H | `ACTING_AUTHORITY_AND_DELEGATION.md`, `COMMAND_CONFLICT_RESOLUTION.md` |
| W07 | 9 | Roles | Command pages and dashboard panel for every office holder; appointment-only access | Completed and Verified (DEC-076 needs owner decision) | browser; route audit | `REPORTING_PERMISSION_MATRIX.md` |
| W08 | 11 | Security | Visibility by office chain; refusals audited; technical and liaison exclusion; loops refused | Completed and Verified | Test I; 10 probes | `MULTI_TENANT_SECURITY_REPORT.md` |
| W09 | 11 | Integration | Directives referencing manpower requests, assignments and transfers within scope; notifications; audit | Completed and Verified | Test J | `COMMAND_AND_REPORTING_TEST_RESULTS.md` |
| W10 | 11–13 | All | Full regression, defects fixed, percentages updated, readiness report | Completed and Verified | full chain exit 0 (27–28 Nov 2026) | `END_TO_END_TEST_RESULTS.md` |
| W11 | 12 | 16 | Personnel availability in the administrative calendar, derived from disposition, within scope (M16-2) | Completed and Verified | `scheduling-correspondence` test (191/191 unit tests); browser; Playwright 30/30; route audit 0 server errors | `CHANGELOG.md` [0.12.0] |
| W12 | 11 | Security | Production `style-src 'self'`: inline style attributes replaced by literal classes (KNOWN_ISSUES 14) | Completed and Verified | `csp` test; 2 new security probes (39/39); production browser check | `SECURITY_ARCHITECTURE.md` |
| W13 | 13 | CI | GitHub Actions observed (runs #1–#7 successful); checkout action moved to v5 | Completed and Verified | GitHub Actions run #7 | KNOWN_ISSUES 11 |
| X08 | — | Command | Validation of the command structure, channels, precedence and mappings; decision on appointment-only access | Blocked by External Dependency | — | DEC-075, DEC-076 |

## v0.13.0 — Institutional compliance directive (28 Nov 2026): Kamfinsa Mobile Unit structure and field command

Plan: `docs/MASTER_DEVELOPMENT_PLAN.md`. Project Manager actions: GitHub issues #1–#16, master tracking issue [#17](https://github.com/Synergixso/zps-oms/issues/17).

| ID | Phase | Area | Requirement | Status | Test result | Evidence |
|---|---|---|---|---|---|---|
| K1 | 1 | Audit | Skills verified (mattpocock-skills 1.3.1); repository audit against the directive; master plan committed | Completed and Verified | — | `MASTER_DEVELOPMENT_PLAN.md` (commit ea6e11e) |
| K2 | 2 | Organisation | Established KMU Companies and Detachments with duty stations; established coverage labels (K-01 … K-03) | RESULT_K | `kmu-structure` 8/8 | DEC-078; migration 016; seed step 016 |
| K3 | 2 | Command | Company, Deputy Company and Detachment Commander offices and relationships; Deputy acting (K-04, K-05) | RESULT_K | `kmu-structure` 8/8 | DEC-079 |
| K4 | 3 | Command | Accountability record for each instruction (§13.4) (K-11) | RESULT_K | `command-accountability` 2/2 | `directiveAccountability` |
| K5 | 4 | Field command | Platoon Commander workspace and attendance register (K-06, K-07) | RESULT_K | `field-command` 7/7; Playwright `field-command` 4/4; browser | DEC-080; migration 017 |
| K6 | 4 | Field command | Area Commander workspace and engagement register; Company / Detachment workspace (K-08 … K-10) | RESULT_K | `field-command` 7/7; Playwright; browser | DEC-080 |
| K7 | 6 | Security | Field command probes; office-based access; neutral 404 (K-12) | RESULT_K | security probes 43/43 (development) | `scripts/security-probe.mjs` §4c |
| K8 | 7 | QA | Full regression | RESULT_K | RESULT_FULL | `CHANGELOG.md` [0.13.0] |
| K9 | 8 | Pilot | Pilot readiness assessment | Completed | — | `PILOT_READINESS.md` |
| K10 | 2 | Organisation | Complete KMU detachment and platoon establishment (K-13) | Blocked by External Dependency | — | Project Manager issue |

## External dependencies

| ID | Stage | Module / role | Requirement | Dependency | Status | Test result | Evidence | Blocker |
|---|---|---|---|---|---|---|---|---|
| X01 | — | Production | Production infrastructure, TLS, least-privilege DB account, off-host backups, monitoring | Service ICT | Blocked by External Dependency | — | `docs/development/DEPLOYMENT_READINESS.md` | Infrastructure not provided |
| X02 | — | 02 | Single sign-on and MFA | Approved identity provider | Blocked by External Dependency | — | DEC-039 | IdP decision |
| X03 | — | Security | Independent penetration test and DPIA | Production-configured deployment | Blocked by External Dependency | — | `CYBERSECURITY_VERIFICATION.md` | Assessor and environment |
| X04 | — | 17 | Malware scanning for stored documents | Information-security decision | Blocked by External Dependency | — | DEC-068 | Scanner and policy |
| X05 | — | 03, 10, 11 | Production identifier formats | Service decision | Blocked by External Dependency | — | DEC-069 | Formats not supplied |
| X06 | — | Governance | Institutional approval and deployment authorisation | Service | Blocked by External Dependency | — | `INSTITUTIONAL_APPROVAL_STATUS.md` | Service decision |
