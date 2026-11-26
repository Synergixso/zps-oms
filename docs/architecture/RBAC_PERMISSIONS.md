# RBAC, Scope and Approval Authority

## Model
`user —< role_assignments (role, organisation unit, valid_from, valid_to, revoked_at) >— roles —< permissions (coverage)`

- **Central catalogue:** `src/server/domain/catalogue.ts` defines the permissions and the 41 directive roles. Each role has a code, number (1–41), level, official name, category (BUSINESS, FUNCTIONAL, AUDIT, TECHNICAL, SECURITY), workspace, assignable unit types, and scoped permissions. At start-up it is synchronised to `roles` and `role_permissions`.
- **Coverage per permission:** UNIT, SUBTREE or NATIONAL (see `MULTI_TENANCY.md`). The same permission held at different units gives different reach: a Provincial Staff Ops officer's `manpower.review` covers one province, while an HQ Operations Staff officer's covers the nation.
- **Deny by default:** no active, unexpired, unrevoked assignment held by an active user means no access. The actor is reloaded on every request, so revocation, expiry, suspension and organisational reassignment take effect immediately (Test H).
- **Temporary access:** a role assignment with `valid_to`; auditor roles must be time-limited.

## Approval authority (separate from permissions)
Approvals require an active **delegation** (`delegations`: user, unit, domain, optional category, validity, approval instrument reference) at the record's unit or an ancestor, **plus** a BUSINESS-category role held at that delegating unit (`policy.approvalUnitFor`). Domains: ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT. Rank and job title never confer authority. Technical, security and audit roles can never approve.

## Separation of duties (enforced in the domain)
Proposers never approve their own assignment, exception, transfer, manpower request or organisation change. A roster compiler cannot review or approve their own roster. Personnel records are verified by an officer other than the registrar. Contributions are reviewed by someone other than the submitter. Administrators cannot change their own access.

## Permission names
The catalogue uses verbs per module, for example `personnel.view/register/edit/verify/export`, `manpower.view/create/review/contribute`, `roster.view/build/review/export`, `area.view/manage`, `assignment.view/propose/receive`, `disposition.change`. Approve / transfer / renew / release decisions are delegation-controlled rather than role permissions. Finer action permissions (Prompt §7.2) are on the roadmap (Phase 3 refinement).

The complete per-role listing is generated in `docs/development/USER_ROLE_CATALOGUE.md`, and the grid in `docs/generated/PERMISSION_MATRIX.md`.
