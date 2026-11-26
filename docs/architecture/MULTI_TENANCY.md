# Multi-Tenancy and Organisational Hierarchy

## Tenants
| Tenant | Type | Holds |
|---|---|---|
| `t_zps` Zambia Police Service — National | NATIONAL | Service HQ, HQ offices, national formations |
| `t_lsk`, `t_cb`, `t_cen`, `t_sth`, `t_est`, `t_nth`, `t_lua`, `t_wst`, `t_nw`, `t_muc` | PROVINCIAL | Each Provincial Division and every district, station and post below it |
| `t_mu` Mobile Unit Division / SPOM, Kamfinsa | FORMATION | The formation and its departments, companies, detachments, platoons and sections |

Every organisation unit carries `tenant_id` (a new unit inherits its parent's tenant). Every business record — personnel, operational area, manpower request and contribution, assignment, vehicle, asset, administrative and maintenance request — stores the tenant of its owning unit.

## Units and relationships
- `org_units.unit_type` ∈ SERVICE_HQ, HQ_OFFICE, PROVINCIAL_DIVISION, DISTRICT, STATION, POST, FORMATION, DEPARTMENT, COMPANY, DETACHMENT, PLATOON, SECTION; `branch` ∈ HQ, TERRITORIAL, FORMATION.
- `org_relationships` are **typed** (`REPORTS_TO`, `ADMINISTERED_BY`) and **effective-dated**; history is never deleted.
- Allowed parent → child type pairs are **configuration** (`org_type_rules`), so non-standard formations are supported without code changes (e.g. FORMATION → FORMATION, migration 003).
- `org_unit_closure (ancestor_id, descendant_id, depth)` is rebuilt in the same transaction as every approved structural change; it answers "everything under this unit" with one indexed join and lets the system refuse cycles.

## Isolation (server-side only)
1. `loadActor` loads the user's active role assignments and, for each, the assignment unit's active subtree from the closure table.
2. `scopeFor(actor, permission)` resolves the set of units where a permission applies: UNIT (the unit), SUBTREE (unit + descendants), NATIONAL (everything; only when held at Service HQ).
3. Every list query filters by that set; every record read re-checks it; anything outside returns **404** (existence is not disclosed). Exports re-check export scope per row.
4. Nothing from the browser (organisation, tenant, role or user ids) is trusted for authorisation.

Verified by `tests/auth-scope.test.ts` (sibling districts and companies invisible, Lusaka cannot see Copperbelt, staff without manpower scope), `tests/personnel-assignments.test.ts`, the route audit and the Playwright isolation test.
