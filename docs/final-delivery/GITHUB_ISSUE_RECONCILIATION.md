# GitHub issue reconciliation — issues #1–#17

Reconciled 28 Nov 2026 against v0.14.0; updated for v0.15.0 (master execution instruction of 28 Nov 2026). Register refreshed before work started: 17 open issues, no labels, one external comment (see §3). Software issues are closed only when their acceptance criteria are met and verified; Service decisions and external dependencies stay open until the authorised decision or evidence is recorded.

## 1. Issue-by-issue status

| # | Issue | Kind | Work done (v0.14.0) | Evidence | State | Waiting on |
|---|---|---|---|---|---|---|
| 1 | Role catalogue 27 vs 31 | PM | Stakeholder instruction §6.1 confirms the 31-role catalogue unless a newer written decision supersedes DEC-072; DEC-081 confirmed; permission matrix regenerated | `catalogue.ts`, migration 013, `three-tier-roles` / `role-migration` tests, `docs/generated/PERMISSION_MATRIX.md` | **Closed** | — |
| 2 | KMU HQ office above Company Commanders | PM | The final master directive (Part F §7.3) states the route: Company Commander / Deputy → Senior Operations Officer (Staff I or Staff II) → Divisional Commander, Mobile Unit. Configured as Company Commander → Staff II → Staff I → Divisional Commander (seed step 018 end-dates the interim direct line) | `kmu-structure` test; DEC-079 | **Closed** (v0.15.0) | — |
| 3 | Full Detachment / Platoon establishment | PM | Five Companies and six Detachments preserved; controlled establishment import (#8) ready to load further units through WF-03; training placeholders kept and labelled (they hold test personnel and history, so are not retired) | `data-import` test; ORGANISATIONAL_MODEL | Open | Establishment list |
| 4 | Area Commander application role | PM | Office-based access only (no role); workspace distinct from Platoon Commander; synthetic data corrected so the Area Commander is a separate appointment (DEC-085) | `field-command`, `command-negative`, `appointment-access` tests | Open | Decision on the role (M-3) |
| 5 | CF-1 Conflict Referral Office | Service | Not activated; common-superior mechanism re-tested: a junior office cannot decide or override | `command-negative` test, Command Test H | Open | Service decision |
| 6 | H-3 DIG Administration read access | Service | Restriction kept; negative tests: no office authority, no directive/report lists, no access by id, no workspace, no personnel register, no reporting line | `command-negative` test | Open | Service decision |
| 7 | C-18 DEC-075 sign-off | Service | Review updated: items confirmed by the directive listed (not signatures); outstanding items and required signatories identified | `command-architecture/DEC-075_VALIDATION_REVIEW.md` §5A | Open | Signatures |
| 8 | Establishment and personnel data | External | Controlled import built and verified (preview, all-or-nothing, scope, synthetic-only outside production, audit); production records no longer flagged synthetic | `data-import` test; e2e; security probe | Open | Authorised data and approval |
| 9 | Single sign-on | External | Integration design (OIDC preferred, linking, sessions, tests); local authentication unchanged | `architecture/SSO_INTEGRATION_DESIGN.md` | Open | Identity provider and test tenant |
| 10 | Identifier formats | External | Already configurable (`ZPS_FORMAT_*`), refused until set, synthetic refused in production; now also validated by `check:config` | `identifiers` test; `config-check` test | Open | Official formats |
| 11 | Production infrastructure | External | Configuration check, start-up logging, runbook (TLS, release, rollback, logging) | `config-check` test; DEPLOYMENT_GUIDE | Open | Hosting |
| 12 | Malware scanner | External | Scanner interface with ClamAV adapter; production fails closed; EICAR verified against a stub clamd | `malware-scan` test | Open | Approved scanner and live EICAR check |
| 13 | Penetration test and DPIA | External | DPIA preparation pack and test-environment brief; internal probes extended | `governance/DPIA_REQUIREMENTS.md`; security probes | Open | Independent assessor |
| 14 | .xlsx in licensed Excel | External | Integrity tests added (formula-like text, widths, frozen header, schema order, Unicode, sheet-name limit) | `xlsx` test | Open | Manual check in licensed Excel |
| 15 | Manual assistive-technology audit | External | Plan and record sheet; axe scans extended to the import page | `evidence/ASSISTIVE_TECHNOLOGY_AUDIT_PLAN.md` | Open | Qualified reviewers |
| 16 | Pilot authorisation (X-10) | Service | Pilot readiness package updated | `final-delivery/PILOT_READINESS.md` | Open | Authorisation and #11, #13, #7 |
| 17 | Master tracking | — | Updated with this reconciliation | this file | Open | — |
| 18 | DIG Administration portfolio scope (medical and welfare, procurement, research and planning) | Service | Opened v0.15.0: recorded as not implemented / outside scope pending an approved specification | `portfolios/DIG_ADMINISTRATION_COVERAGE.md` | Open | Service decision |

## 2. Software defects found and fixed in this round
| Defect | Fix | Verification |
|---|---|---|
| Personnel registered in production stored `synthetic = 1` | `isProduction() ? 0 : 1` in `registerPersonnel` | `data-import` test (dev flag); code review |
| Units created through WF-03 in production stored `synthetic = 1` | `applyDueChanges` sets the record basis | `data-import` test |
| Area Commander account also held the A Company Commander office; its report form defaulted to the wrong office (Playwright `command` journey failed) | Office left vacant; seed step 017 end-dates the appointment | `appointment-access` test; Playwright `command` journey |
| DIG Special Duties title "(Stately)" | "Special Duties / State House" (official website) | — |
| `check:config` restore of an unset variable would have stored the string "undefined" | delete instead of assign | `config-check` test |

## 3. Security observation and moderation
Issue #14 carried one comment (id 7236581529, 28 Nov 2026 08:26 UTC, account `4registrynik12`, display text "xlsxexcelverify") urging readers to download and run a ZIP from mediafire.com to "fix" Excel exports — a malware lure. The file was never opened or downloaded. With the repository owner's approval (28 Nov 2026): the comment was **reported to GitHub** (category *Active Malware or Exploits*; GitHub confirmed the submission) and then **deleted** through the issue's comment menu. The account was not blocked (not requested); the owner may block it from the organisation settings.
