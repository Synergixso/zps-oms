# Organisational Scope Model — 27 Roles

**Date:** 26 November 2026 · Applies to v0.5.0 · Synthetic data only.

## 1. Hierarchy

Service Headquarters → ten Provincial Divisions → District Commands → Police Stations → Police Posts, and Service Headquarters → Unit Formations (e.g. Mobile Unit, Airport Division) → Departments → Companies → Detachments → Platoons → Sections. Every unit is a row in `org_units`; ancestry is materialised in `org_unit_closure` (ancestor, descendant, depth) and rebuilt on every approved structure change.

## 2. How a role's scope is resolved (server-side, every request)

1. `loadActor` reads the user's **active, unexpired, unrevoked** assignments of **ACTIVE catalogue roles** (retired roles are ignored) at **active** units, and each assignment's subtree from the closure table.
2. **Context.** A web session acts in one context (`sessions.active_assignment_id`). The selected id is re-validated against the user's own valid assignments on every request; with none selected, or if it has become invalid, the highest-precedence assignment applies. The browser only supplies a selector — never a unit, role or scope.
3. For each permission the role grants a coverage:
   - **UNIT** — records owned by the assignment's unit only;
   - **SUBTREE** — that unit and every descendant;
   - **NATIONAL** — every unit, **only** when the assignment is held at Service HQ (`org_hq`); elsewhere evaluated as SUBTREE.
4. Domain functions filter queries with `scopeSql` / `unitsFor` and check single records with `can`. A record outside scope returns **404** (existence is not disclosed) and an audited denial.

## 3. Scope per tier

| Tier | Held at | Typical coverage | Isolation guarantee (tested) |
|---|---|---|---|
| 1 — HQ | `SERVICE_HQ` | NATIONAL for HQ business roles; NATIONAL technical scope for Superadmin and HQ Tech | Technical roles see no personnel, assignments, stores or requests |
| 2 — Division / Formation | `PROVINCIAL_DIVISION`, `FORMATION`; Company Commander at `COMPANY`; Section Head at `SECTION`, `PLATOON`, `DETACHMENT` or `DEPARTMENT` | SUBTREE of the assigned unit | No access to sibling Divisions or Formations (route audit: Lusaka QM gets 404 on Kitwe stock; Copperbelt tech admin gets 404 on Mobile Unit accounts) |
| 3 — District / Station | `DISTRICT`; station roles at `STATION` or `POST` | SUBTREE of the district or station | No access to other Districts or Stations (Mufulira cannot requisition from Kitwe; station tech admin cannot support district accounts) |

## 4. Scoped technical administration

`user.view` and `user.support` follow the same coverage. A user is inside a technical administrator's scope when:

- **viewing** — at least one of the user's active assignments lies inside the administrator's scope;
- **support actions** (temporary password, unlock, end sessions) — **every** active assignment lies inside it, and (for non-national administrators) the user holds no TECHNICAL role. Other administrators' accounts are escalated to System Administrator – HQ Tech.

## 5. Stores scope

Store items belong to the store's unit. `stores.view` / `stores.manage` follow the unit coverage. A unit may requisition only from its own store or a store **above** it (closure ancestors); approval is evaluated against the **requesting** unit (delegation at that unit or an ancestor).

## 6. Approval scope

Approval is never a coverage: see `APPROVAL_AUTHORITY_CONFIGURATION.md`.
