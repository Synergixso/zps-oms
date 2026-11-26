# User Acceptance Test (UAT) Plan — ZPS-OMS v0.7.0

**Prepared:** 26 November 2026 · **Environment:** local synthetic prototype (XAMPP) · **Data:** synthetic only

## 1. Purpose
Confirm, with officers who will use each back office, that the 27 role workspaces do what the Service needs — and nothing they must not do — before any decision on a pilot. UAT tests *fitness for the Service's work*; technical correctness is already evidenced by the automated suites (`docs/role-architecture/ROLE_TEST_RESULTS.md`).

## 2. Scope
| In scope | Out of scope |
|---|---|
| The 27 role back offices: navigation, figures, quick actions, working panels | Performance and load testing |
| Each role's functions and limits (scope, separation of duties, technical separation) | Penetration testing (separate, by a qualified team) |
| Personnel, manpower, rosters, assignments, transfers, stores, fleet, assets, reports | Real data of any kind |
| Help centre, phone-width use | Modules 16–17 (later phase) and SSO (not yet decided) |

## 3. Participants
| Role | Who (to be nominated by the Service) | Responsibility |
|---|---|---|
| UAT lead | Office of the DIG Operations | Plans sessions, triages defects, signs the summary |
| Role testers | One officer per role (27), ideally the real post-holder or a deputy | Runs their role's script, records results |
| Technical support | SPOM Technical Services Section | Environment, accounts, resets, defect logging |
| Observer (optional) | Internal Audit | Confirms separation of duties and audit trail |

## 4. Environment and preparation
1. One workstation per session with the prototype running (`npm run build` and `npm start`, or `npm run dev`), XAMPP MySQL started.
2. Reset to the clean synthetic baseline before the first session (`npm run db:reset`, after a backup), then start the app once to reseed.
3. Confirm `GET /api/health` returns 200 and `npm run verify:audit` reports no breaks.
4. Print or open the role scripts: `docs/uat/scripts/ROLE_NN_*.md` (regenerate with `npm run docs:uat` after any configuration change).
5. Testers use only the synthetic `demo.*` accounts listed in their script, with the development password shown on the sign-in page.

## 5. Entry criteria
- All automated suites pass on the build under test (type check, Vitest, route audit, phone review, Playwright).
- The environment is on the synthetic baseline and healthy.
- Testers have had a 30-minute walkthrough of their workspace and the Help page.

## 6. Execution
- Run each script top to bottom; mark every step Pass or Fail; record a defect reference for every Fail.
- Roles that interact (e.g. a requester and an approver) are tested in pairs; the scripts state when another role must act.
- Suggested order: Tier 3 (stations, districts) → Tier 2 (divisions, formations) → Tier 1 (HQ), so that work raised low is decided higher up.
- Indicative effort: 30–45 minutes per role; about 4 sessions of half a day for all 27 roles.

## 7. Defects
| Severity | Meaning | Release impact |
|---|---|---|
| S1 Critical | Data exposed outside scope, approval without authority, data loss, or system unusable | Blocks acceptance |
| S2 Major | A required function does not work and there is no workaround | Blocks acceptance of that role |
| S3 Minor | Works with a workaround, or a wrong label or figure | Accept with a fix plan |
| S4 Cosmetic | Presentation only | Accept |

Record each defect with: role, script step, account, what was done, what happened, what was expected, screenshot. Defects are logged in the project tracker (`docs/03_TRACKERS_AND_REGISTERS/`) and fixed through the normal workflow (domain change with a test → UI → full verification).

## 8. Exit criteria
- Every role script executed; the sign-off register (`UAT_SIGNOFF.md`) completed.
- No open S1 or S2 defects; S3/S4 defects have an agreed fix plan.
- Institutional decisions that UAT depends on are recorded (`docs/governance/INSTITUTIONAL_DECISIONS_PACK.md`).

## 9. Outputs
Completed scripts, the sign-off register, the defect log, and a one-page UAT summary signed by the UAT lead recommending: accept, accept with conditions, or reject.
