# Role Back-Office Development Status (27 roles)

**Date:** 26 November 2026 · **Version:** 0.5.0 · Synthetic data only. Evidence: `docs/role-architecture/ROLE_TEST_RESULTS.md`.

Status key: **Implemented and tested** = catalogue entry, permissions, scope, workspace (back-office name, navigation, headline figures, quick actions, working panels), synthetic account(s), covered by the role test suite and the route audit (0 server errors). Remaining items are listed per role.

## Shared foundations

| Item | Status |
|---|---|
| Migration 007 (role tier/number/status/back office, session context, delegation domain STORES, general-stores tables) | Applied to dev, test and e2e databases; dev backed up first (`backups/zps_oms_dev_pre007_*.sql`, git-ignored) |
| Retirement of the 41 roles (RETIRED, history kept) and re-mapping of synthetic accounts (seed step 003) | Implemented and tested |
| Central role → workspace configuration (`workspace-config.ts`, `workspaces.ts`) | Implemented and tested |
| Context switching (account menu; validated each request) | Implemented; server side tested; browser interaction not yet automated |
| Scoped technical administration (`user.support`) | Implemented and tested |
| General stores (items, ledger, requisitions, issue) | Implemented and tested |

## Tier 1 — National Headquarters

| No. | Role | Synthetic account(s) | Status | Remaining |
|--:|---|---|---|---|
| 01 | Superadmin | demo.platform.admin, demo.org.registry | Implemented and tested | — |
| 02 | Inspector General of Police | demo.hq.readonly, demo.auditor | Implemented and tested | Service to confirm which summaries the IG receives |
| 03 | DIG Operations | demo.dig.exec | Implemented and tested | Real delegations to be recorded by the Service |
| 04 | Commissioner – Operations HQ | demo.hq.coord, demo.hq.assignments | Implemented and tested | — |
| 05 | Deputy Commissioner – Operations HQ | demo.hq.staff, demo.hq.personnel, demo.hq.roster | Implemented and tested | — |
| 06 | System Administrator – HQ Tech | demo.security.admin | Implemented and tested | — |

## Tier 2 — Provincial Divisions and Unit Formations

| No. | Role | Synthetic account(s) | Status | Remaining |
|--:|---|---|---|---|
| 07 | Divisional/Unit System Administrator (Tech) | demo.cb.tech, demo.mu.tech | Implemented and tested | — |
| 08 | Formation Commanding Officer | demo.lsk/cb/cen/mu.commander | Implemented and tested | — |
| 09 | Deputy Division Commander | demo.cb.reporting, demo.cb.approver | Implemented and tested | — |
| 10 | Division Senior Staff Officer – Operations (Staff I) | demo.lsk/cb/cen.staffops | Implemented and tested | — |
| 11 | Deputy Division Staff Officer – Operations (Staff II) | demo.cb.personnel, demo.cb.assignments, demo.cb.originator | Implemented and tested | — |
| 12 | Company Commander | demo.mu.acoy.commander, demo.mu.acoy.admin | Implemented and tested | — |
| 13 | Section Head | demo.mu.opsdept, demo.mu.det/plt/sec.commander, demo.mu.det/plt/sec.admin | Implemented and tested | Service to confirm assignment at detachment / platoon / department level |
| 14 | Formation Operations Staff Administrator | demo.mu.admin, demo.ap.admin | Implemented and tested | — |
| 15 | Divisional Quarter Masters Stores Officer | demo.asset.custodian, demo.asset.cb | Implemented and tested | — |
| 16 | Divisional Principal Armourer | demo.cen.staff | Implemented and tested (non-sensitive administrative functions only) | Owner to approve any further non-sensitive function |
| 17 | Divisional MTO Officer-in-Charge | demo.fleet.officer, demo.fleet.verifier | Implemented and tested | — |

## Tier 3 — District Commands and Police Stations

| No. | Role | Synthetic account(s) | Status | Remaining |
|--:|---|---|---|---|
| 18 | District System Administrator (Tech) | demo.kitwe.tech | Implemented and tested | — |
| 19 | Officer Commanding — District | demo.kitwe.commander | Implemented and tested | — |
| 20 | Deputy OC — District | demo.kitwe.assignments | Implemented and tested | — |
| 21 | Operations Officer — District | demo.kitwe.ops, demo.mufulira.receiving | Implemented and tested | — |
| 22 | Deputy Operations Officer — District | demo.kitwe.personnel | Implemented and tested | — |
| 23 | Stores Officer — District | demo.kitwe.stores | Implemented and tested | — |
| 24 | Police Station System Administrator | demo.kitwec.tech | Implemented and tested | — |
| 25 | Officer-in-Charge — Police Station GD | demo.kitwec.commander | Implemented and tested | — |
| 26 | Station Inspector — Police Station GD | demo.kitwec.ops, demo.kitwec.personnel, demo.chimwemwe.post | Implemented and tested | — |
| 27 | Police Station Administrator (Stores and Admin) | demo.kitwec.stores | Implemented and tested | — |

All accounts use the published synthetic development password (local review only).

## Open items (all roles)

1. ~~Phone-width visual review of every role's dashboard~~ — done 26 Nov 2026 (`docs/evidence/mobile/`, findings in `ROLE_TEST_RESULTS.md` §5).
2. Automated browser test of the context switcher.
3. Institutional validation of the permission templates, the synthetic delegations and the assumptions in DEC-055.
