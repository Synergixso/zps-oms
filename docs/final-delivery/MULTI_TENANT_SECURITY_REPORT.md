# Multi-Tenant Security Report

Recorded 27 November 2026 for v0.10.0. It covers how organisational and tenant boundaries are enforced for all 31 roles, and the evidence for each control. General application security (sessions, CSRF, headers, CSP, injection, documents) is in `CYBERSECURITY_VERIFICATION.md`. All testing was done against local synthetic databases only; no external system or institutional infrastructure was probed.

## 1. Model

| Element | Implementation |
|---|---|
| Hierarchy | One organisation tree: Service HQ → ten Provincial Divisions and the Unit Formations → District Commands → Police Stations and Posts; Formations → Departments, Companies, Detachments, Platoons, Sections. `org_unit_closure` holds every ancestor–descendant pair with its depth |
| Tenants | Administrative environments (national, provincial, formation) over sub-trees (`tenants`, `org_units.tenant_id`). Records carry the tenant of their owning unit |
| Assignment | A user holds one or more role assignments, each at one unit with a validity window. One active context per session (context switching is re-validated on every request) |
| Coverage | **UNIT**: the assigned unit only. **SUBTREE**: the unit and every descendant. **NATIONAL**: every unit, but only for an assignment held at Service HQ; at any other unit a NATIONAL grant degrades to SUBTREE (`policy.scopeFor`) |
| Approval | Never a permission: it needs an active delegation at the record's unit or an ancestor plus a BUSINESS role there (`policy.approvalUnitFor`). Never self-approval; never two levels of one chain by one officer; rank confers nothing |
| Enforcement point | Every domain function is `async (db, actor, …)` and checks permission and scope itself. Pages and navigation mirror the checks for usability only. The actor (assignments, subtree) is loaded from the database on every request, never from the browser |

## 2. Controls

| # | Control | How | Evidence |
|---|---|---|---|
| T1 | No identifiers trusted from the browser | Organisation, role, user and tenant ids from forms are re-validated against the actor's scope; lists are filtered in SQL by the actor's covered units | code review; `access-control` |
| T2 | Out-of-scope record → neutral 404 | `loadOr404` maps NOT_FOUND/FORBIDDEN to `notFound()`; existence is not disclosed; the HTTP status really is 404 (B11 fixed in v0.9.1; the route audit now fails on a 200 not-found page) | route audit; `npm run test:security`; tenant-isolation browser test |
| T3 | Refusals are security events | `requirePermission` and the record loaders write DENIED audit events with the entity reference | `access-control`, `transactions`, `liaison` |
| T4 | Cross-Province isolation | Coverage never reaches a sibling sub-tree | `access-control` (cross-province denial); security probes (Lusaka → Copperbelt correspondence, calendar and liaison records) |
| T5 | District / Station / Post isolation | SUBTREE from a District never reaches another District; Station roles are UNIT or SUBTREE of the station | `access-control`; isolation journey (`e2e/flows.spec.ts`) |
| T6 | Formation isolation | Company Commander and Section Head scopes stop at their company or section | `access-control`; route audit |
| T7 | National only at HQ | A NATIONAL permission held outside HQ behaves as SUBTREE | `auth-scope` |
| T8 | Technical vs business separation | The five technical roles (01, 06, 08, 20, 26) hold no personnel, assignment, manpower, stores, request, fleet, scheduling, correspondence or liaison permission; only Superadmin configures the platform and tenants | `three-tier-roles` › "technical administrators are separated …" |
| T9 | Liaison vs operational separation | Roles 07, 19, 30 and 31 hold only `liaison.*`; no other role holds it; Tier 4 is UNIT-scoped; drafts are need-to-know; only the receiving office acts | `liaison` (8 tests), `e2e/liaison.spec.ts` (5 tests), 13 liaison security probes |
| T10 | Scoped technical administration | Division, District and Station technical administrators see and support only accounts assigned inside their scope (including reassignment flags) | `three-tier-roles`; `role-migration` |
| T11 | Context switching | The actor is restricted to the selected assignment, re-validated on each load; an expired or revoked assignment drops out | `three-tier-roles` › "controlled context switching"; browser journey |
| T12 | Retired roles grant nothing | Permissions removed, assignments revoked and flagged, no automatic replacement | `role-migration` |
| T13 | Exports and documents | Exports re-check scope and are audited; document downloads re-check the parent record's scope and carry `sandbox` CSP | `reports`, `scheduling-correspondence`; security probes |
| T14 | Figures cannot leak | Dashboard figures are SQL counts over the actor's scope; the Inspector General's national figures are aggregates without record links | `three-tier-roles`; `reports` (figures = direct SQL) |

## 3. Route-level evidence

The route audit (`npm run audit:routes`, `docs/evidence/route-audit.md`) requests every back-office route, including representative records from different Provinces, Districts, Stations and Formations, as every synthetic account. Each response is classified as rendered, access denied (audited), out of scope (404) or server error, and a not-found page served with status 200 counts as an error. Per-role totals are in the tier verification documents. Results for this release are in `END_TO_END_TEST_RESULTS.md`.

## 4. Residual risks

| Risk | Treatment |
|---|---|
| Authorisation mistakes in future code | One enforcement layer with tests per module; route audit on every release; lint and type checks in CI |
| Insider misuse within a legitimate scope | Audit trail with hash chain, refused-access events, access reviews (`/app/admin/reviews`); production needs central log shipping (`DEPLOYMENT_READINESS.md`) |
| Delegation and role allocations not yet validated by the Service | DEC-008 and DEC-072: the synthetic allocations are configuration to be replaced by authorised ones |
| Independent assurance | Penetration test of a production-configured deployment (X03) |
