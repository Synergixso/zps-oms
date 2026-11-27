# Role Deprecation and Migration Report

Recorded 27 November 2026 for v0.10.0 (owner directive Parts 3 and 11; DEC-072). All data synthetic.

## 1. Before the migration (audit, Stage 1)

| Item | Finding |
|---|---|
| Code catalogue | 27 roles in three tiers (`catalogue.ts`), plus the list of 41 retired codes from the superseded catalogue (DEC-033/049) |
| Database `roles` (development) | 27 rows, all ACTIVE; **no retired or unknown role rows** |
| Role assignments (development) | 55 active, 0 revoked; every one points at an active catalogue role |
| Retirement logic | `syncCatalogue` retired only the 41 listed codes; any other stray definition would have stayed |
| Reassignment tracking | None: a retired role's live assignments were neither revoked nor recorded for reassignment |
| Role pickers | Built from the code catalogue (`ROLES`), so a retired role could never be offered for assignment |
| Workspaces, navigation, dashboard routing, seed data, tests | Keyed by role code; no obsolete role configuration present |

The test database is rebuilt from the migrations and seeds on every run, and the dev database had been re-created on 26 November (known issue 12), so neither held legacy 41-role rows. The migration was therefore built and proved against injected obsolete roles in a test transaction (§4), so it is ready for any database that does hold them.

## 2. Backup (Stage 2)

`backups/zps_oms_dev_pre013_202611271426.sql` (7.5 MB, complete dump, SHA-256 recorded beside it) was taken before migration 013 was written, so a development reload could not apply it first (the lesson of known issue 13).

## 3. The migration

**Schema (migration 013, additive only):** `role_reassignments` (user, retired role, unit, the revoked assignment, reason, flagged at, resolved at/by, the authorising new assignment); `liaison_records` and `liaison_routing` (see `INTELLIGENCE_LIAISON_SCOPE_AND_ACCESS_CONTROLS.md`). No existing table or row is altered by the SQL.

**Catalogue synchronisation (`bootstrap.syncCatalogue`, one transaction, idempotent, every start-up):**

1. Upsert the 31 catalogue roles as ACTIVE (name, tier 1–4, number 1–31, back office) and rewrite their permission rows.
2. Compare every row in `roles` with the catalogue. Any role not in it, whether from the 41-role catalogue, a duplicate, a generic fallback or an earlier attempt, is set RETIRED with no tier or number.
3. Delete the retired role's permission rows, so it grants nothing and the server denies by default.
4. Revoke each still-active assignment of that role: `revoked_at` and a reason are set, and the row is kept as history.
5. Record each revoked assignment in `role_reassignments`. **No replacement role is granted.** Job titles are not used to guess, and access stays denied until an authorised administrator grants an approved role and organisational scope.
6. Physically delete a retired role row only when nothing references it (no assignment and no reassignment record). The foreign keys from `role_assignments`, `role_permissions` and `role_reassignments` make it impossible to delete a referenced row.
7. Write one CONFIG audit event (`role.catalogue.sync`) listing what was retired, flagged and deleted.

**Resolution:** `iam.assignRole` (Superadmin, `grant.assign` at HQ, never self-grant, organisation type checked against the role) closes every open flag for that user, recording who resolved it and the new assignment. A retired code can never be granted again ("Unknown role").

**Visibility:** *Users & access* shows "Accounts awaiting authorised reassignment" to administrators whose `user.view` scope covers the unit (Superadmin nationally; Division, District and Station technical administrators for their own scope).

**Role numbering:** the directive's numbering is applied. Codes are unchanged, so no assignment, audit event or configuration needed rewriting.

| Change | Roles |
|---|---|
| Added | 07 National Police Intelligence Officer · 19 Division Police Intelligence Officer · 30 District Police Intelligence Officer · 31 Police Intelligence Officer |
| Renumbered | former 7–17 → 8–18 · former 18–27 → 20–29 (for example the Principal Armourer is now 17; the stores roles are 16, 25 and 29) |
| Removed | none from the 27; no obsolete definitions existed in the databases |

## 4. Verification

| Check | Result | Evidence |
|---|---|---|
| Active catalogue = exactly the 31 code roles, in order | Pass | `role-migration` › "the active catalogue in the database is exactly the 31 code-defined roles" |
| Tier counts 7 / 12 / 11 / 1, numbers 1–31, unique codes and back offices | Pass | `three-tier-roles`, `auth-scope` |
| No permission row for a non-active role; no active assignment of a non-active role | Pass | `role-migration` |
| Injected obsolete role with a live assignment: retired, permissions removed, assignment revoked with reason, flagged, account kept with no role and denied, audit event written | Pass | `role-migration` › "retires an unauthorised role …" |
| Injected unreferenced obsolete role: deleted | Pass | same test |
| Second run changes nothing | Pass | same test |
| Authorised grant resolves the flag; the retired role cannot be re-granted | Pass | same test |
| Flag visible to administrators in scope only (Copperbelt technical admin yes, Kitwe District technical admin no) | Pass | same test |
| Fresh database: migrations and seeds apply once and re-run idempotently, including `013_liaison_roles` | Pass | `migrations` |
| Development database after migration | 31 ACTIVE roles (7 / 12 / 11 / 1), 0 retired, 61 active assignments, 0 reassignment flags, 60 synthetic users (6 new liaison accounts) | direct query, 27 Nov 2026 |
| Production start-up | Runs only the reference-baseline seed; the catalogue sync runs as above | `production-setup` test |

## 5. Rollback

Migration 013 is additive. In development, restore the pre-013 backup. In any other environment, back up first, then:

1. Revoke the active assignments of the four liaison roles, giving a reason.
2. Set those four role rows to RETIRED and delete their permission rows.
3. Drop `liaison_routing`, `liaison_records` and `role_reassignments`, in that order.
4. Deploy the v0.9.1 code.

Step 2 is necessary because the v0.9.1 synchronisation retires only the 41 listed legacy codes and would not retire roles it does not know. No identity, personnel record, assignment history or audit event is lost.
