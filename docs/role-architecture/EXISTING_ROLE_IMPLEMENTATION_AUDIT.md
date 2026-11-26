# Phase 0 — Existing Role Implementation Audit (against the Three-Tier 27-Role Directive)

**Date:** 26 November 2026 · **Code audited:** v0.4.0 plus the back-office redesign (overview, shell, search) · Synthetic data only.

## 1. What exists today

| Area | Current implementation | Reusable for the 27 roles? |
|---|---|---|
| Role catalogue | `src/server/domain/catalogue.ts`: **41 roles** (directive §11 of the earlier Master Directive), each with code, number, level, category, workspace title, assignable unit types and scoped permissions; synchronised to `roles` / `role_permissions` at start-up | Structure yes; the **content must be replaced** by the 27 roles |
| Permissions | 74 permission codes (module verbs: `personnel.view/register/edit/verify/export`, `manpower.view/create/review/contribute`, `roster.*`, `assignment.view/propose/transfer/renew/receive`, `area.*`, `fleet.*`, `asset.*`, `report.*`, `audit.*`, `security.view`, `platform.view/configure`, `tenant.view/manage`, `workflow.configure`, `user.*`, `grant.*`, `delegation.*`, …) | Yes; directive names map onto them (see `PERMISSION_MATRIX.md`); a few must be added |
| Scope | UNIT / SUBTREE / NATIONAL per permission, resolved server-side through `org_unit_closure`; 404 for out-of-scope records | Yes — covers National, Division, Unit/Formation, Department, Company, Section, District, Station, Post |
| Approvals | Delegation (domain × unit, effective dates, instrument reference) + business role at the delegating unit; never rank | Yes — matches §5 rule 6 and §12 separation |
| Tenancy | National, 10 provincial, Mobile Unit formation tenants; provisioning for further formations | Yes |
| Users & assignments | `role_assignments` (user, role, unit, validity, justification, granted_by, revoked_*) | Yes; **no active-context selection** yet |
| Dashboards | Shared command overview (identity, live KPIs by dashboard kind, charts, quick actions, status, activity, tasks, modules) + 20 dashboard kinds | Yes as components; must be configured **per role (27)** |
| Navigation | One navigation tree filtered by permission | Must become **role-specific** (labels, order, sections per workspace) |
| Modules | Organisation, users, personnel, manpower, rosters, areas, assignments, transfers/tenure, workflows, fleet, assets (incl. reconciliation), reports, notifications/tasks, audit, platform | Yes |
| Tests | 95 Vitest tests, 7 Playwright journeys, 75-route × 48-user audit | Must be migrated to the new role codes and accounts |

## 2. Gaps against the directive

| # | Requirement | Gap |
|---|---|---|
| G1 | Exactly 27 canonical roles in three tiers | Catalogue holds 41; no tier attribute; no role status (active/retired) |
| G2 | Previous 41 roles not used as active configuration | Old roles must be **retired, not deleted** (assignment history references them) |
| G3 | Role-to-workspace configuration (back-office name, widgets, navigation, quick actions) | Only dashboard *kinds*; no per-role configuration or role-specific navigation |
| G4 | Controlled context switching for users with several assignments; validated each request | Permissions are cumulative across assignments |
| G5 | Scoped technical administration (Divisional/Unit, District, Station system administrators) | User administration is HQ-only; no scoped user list, password reset, unlock or session end |
| G6 | General stores: stock categories, receipts, issue/return, requisitions, custody, stock reconciliation (QM Stores Officer, District Stores Officer, Station Stores & Admin) | Only individual asset register + asset reconciliation; **no consumable stock, receipts or requisitions** |
| G7 | Role 16 Principal Armourer: role exists, only non-sensitive administrative functions | Must be created with minimal permissions; firearms/ammunition/armoury records stay excluded |
| G8 | Role-specific test accounts and test matrix (27 profiles) | Accounts exist for 41 roles; must be re-mapped/created for 27 |
| G9 | Documentation set under `docs/role-architecture/` | New |

## 3. Decisions needed from the Service (implemented as configurable, documented assumptions)

1. **Audit and security functions.** The 27-role catalogue has no Internal Auditor or Security Administrator. Proposed: audit register and record history → Inspector General and DIG Operations (oversight); security events, sessions and authentication history → Superadmin and System Administrator – HQ Tech (technical). Configurable in the catalogue.
2. **Personnel registry maintenance.** No dedicated records officers in the 27 roles. Proposed: create/update by Staff I, Staff II, Formation Operations Staff Administrator, District Operations Officer and Deputy, Station Inspector and Section Head (within scope); verification by Staff I, Deputy Commissioner and Operations Officer — District.
3. **Organisation structure changes.** Proposed: Superadmin proposes (Organisation Configuration); approval remains an ORG_CHANGE delegation held by DIG Operations.
4. **Detachments, Platoons and Police Posts** have no dedicated roles. Proposed: Section Head may be assigned at detachment, platoon or section level; Police Station roles may be assigned at a Police Post where configured.
5. **Division commander.** Role 08 "Formation Commanding Officer" is used for the commanding officer of both Provincial Divisions and Unit Formations, as Tier 2 states; Role 09 is the deputy.

## 4. Mapping of existing synthetic accounts to the 27 roles (no records deleted)

| Existing account (old role) | New role | Scope |
|---|---|---|
| u_plat (Platform Administrator), u_org (Org Registry Admin) | 01 Superadmin | HQ |
| u_rom (Read-Only Management), u_audit (Internal Auditor) | 02 Inspector General of Police | HQ |
| u_dig (DIG Ops Executive) | 03 DIG Operations | HQ |
| u_hqc (HQ Coordinator), u_naa (National Assignment Admin) | 04 Commissioner – Operations HQ | HQ |
| u_hqstaff (HQ Ops Staff), u_npa (National Personnel Admin), u_rc (Roster Coordinator) | 05 Deputy Commissioner – Operations HQ | HQ |
| u_sec (Security Admin) | 06 System Administrator – HQ Tech | HQ |
| u_lsk_cmd, u_cb_cmd, u_cen_cmd (Provincial Commanders), u_mu_cmd (Formation Commander) | 08 Formation Commanding Officer | own Division / Formation |
| u_cb_rep (Reporting Officer), u_aao (Assignment Approver) | 09 Deputy Division Commander | Copperbelt |
| u_lsk_sops, u_cb_sops, u_cen_sops (Division Staff Ops) | 10 Staff I | own Division |
| u_cb_per, u_cb_asg, u_mpo | 11 Staff II | Copperbelt |
| u_mu_acoy, u_mu_aadm | 12 Company Commander | A Company |
| u_mu_dept, u_mu_det, u_mu_detadm, u_mu_plt, u_mu_pltadm, u_mu_sec, u_mu_secadm | 13 Section Head | their department / detachment / platoon / section |
| u_mu_adm, u_ap_adm (Formation Admin Officers) | 14 Formation Operations Staff Administrator | own Formation |
| u_asset (Lusaka), u_asset_cb | 15 Divisional QM Stores Officer | own Division |
| u_staff (General Staff, Central) | 16 Divisional Principal Armourer | Central (non-sensitive administrative functions only) |
| u_fleet, u_fleet2 (Fleet Officers) | 17 Divisional MTO Officer-in-Charge | Lusaka (u_fleet also Mobile Unit) |
| u_kit_cmd | 19 Officer Commanding — District | Kitwe |
| u_kit_asg | 20 Deputy OC — District | Kitwe |
| u_kit_ops, u_rao (Mufulira) | 21 Operations Officer — District | own District |
| u_kit_per | 22 Deputy Operations Officer — District | Kitwe |
| u_kitc_cmd | 25 Officer-in-Charge — Police Station GD | Kitwe Central |
| u_kitc_ops, u_kitc_per, u_chim (Post) | 26 Station Inspector — Police Station GD | own Station / Post |

New synthetic accounts are created for roles without an equivalent: 07 Divisional/Unit System Administrator (Copperbelt and Mobile Unit, to prove same-role isolation), 18 District System Administrator, 23 Stores Officer — District, 24 Police Station System Administrator, 27 Police Station Administrator (Stores and Admin).

## 5. Implementation plan (follows directive Part VIII)

1. Migration 007: role tier, status and workspace reference; retire the 41 roles; general-stores tables; workspace configuration table.
2. Catalogue: 27 roles with tiers, permission templates and workspace configurations (back-office name, navigation, widgets, quick actions).
3. Seed step 003: re-map existing synthetic accounts, create the new ones, delegations, stores data.
4. Context switching; scoped technical administration; general stores module.
5. Role-specific navigation and dashboards (Tier 1 → Tier 2 → Tier 3), each with its tests.
6. Migrate and extend tests (role matrix for all 27), route audit, Playwright; documentation.
