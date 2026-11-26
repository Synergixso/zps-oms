# Approval Authority Configuration

**Date:** 26 November 2026 · Applies to v0.5.0 · Synthetic data only.

## 1. Rule

A user may approve, reject or return a matter only when **all** hold (`policy.approvalUnitFor`, `policy.canApprove`):

1. an **active delegation** for the domain (ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES), valid on the day, recorded with an instrument reference, at the record's unit **or one of its ancestors**;
2. a **BUSINESS-category** role assignment **at that delegating unit**;
3. the domain's permission where one exists (e.g. `stores.approve`);
4. **separation of duties** — never the originator / requester / proposer of the same matter; no officer decides two levels of one chain.

Rank never confers authority. TECHNICAL, FUNCTIONAL and AUDIT roles never approve, even if a delegation were recorded in error. A deputy does not inherit the principal's delegations. `iam.grantDelegation` refuses delegations to users without a business role at the unit, and refuses self-delegation.

## 2. Delegations present in the synthetic dataset

These are **synthetic demonstration records** (references `SYN-DELEG-*`). They are not an approved Zambia Police Service delegation matrix; the Service must record its own instruments. The 27-role migration did **not** create new approval authority beyond the STORES domain (DEC-053), which mirrors the commanders who already held delegations.

| Holder (synthetic) | Role | Unit | Domains |
|---|---|---|---|
| u_dig | 03 DIG Operations | Service HQ | ADMIN_REQUEST, ORG_CHANGE, MANPOWER, ASSIGNMENT |
| u_lsk_cmd | 08 Formation Commanding Officer | Lusaka Division | ADMIN_REQUEST, MAINTENANCE, MANPOWER, ASSIGNMENT, STORES |
| u_cb_cmd | 08 Formation Commanding Officer | Copperbelt Division | ADMIN_REQUEST, MAINTENANCE, MANPOWER, ASSIGNMENT, STORES |
| u_cen_cmd | 08 Formation Commanding Officer | Central Division | ADMIN_REQUEST |
| u_mu_cmd | 08 Formation Commanding Officer | Mobile Unit | ADMIN_REQUEST, MAINTENANCE, MANPOWER, ASSIGNMENT, STORES |
| u_aao | 09 Deputy Division Commander | Copperbelt Division | ASSIGNMENT |
| u_kit_cmd | 19 Officer Commanding — District | Kitwe District | ASSIGNMENT, STORES |
| u_kitc_cmd | 25 Officer-in-Charge — Police Station GD | Kitwe Central Station | STORES |

## 3. Who may hold approval authority (if the Service delegates it)

Only BUSINESS roles: 02 Inspector General, 03 DIG Operations, 04 Commissioner, 05 Deputy Commissioner, 08 Formation Commanding Officer, 09 Deputy Division Commander, 10 Staff I, 11 Staff II, 12 Company Commander, 13 Section Head, 14 Formation Operations Staff Administrator, 19 OC District, 20 Deputy OC, 21 Operations Officer, 22 Deputy Operations Officer, 25 OIC Station, 26 Station Inspector. Stores requisitions additionally need `stores.approve`, held by 08, 19 and 25.

Never: 01 Superadmin, 06 HQ Tech, 07/18/24 local system administrators (TECHNICAL); 15 QM Stores, 16 Principal Armourer, 17 MTO, 23 District Stores, 27 Station Stores and Admin (FUNCTIONAL).

## 4. Configurable approval chains

Manpower approval chains remain versioned and configurable (`workflow.configure`, held by 04 Commissioner – Operations HQ); a request keeps the chain version active when it was submitted (DEC-045).

## 5. Evidence

`tests/three-tier-roles.test.ts` (stores: requester refused, Station Inspector refused, commander refused without delegation, then permitted), `tests/access-control.test.ts` TS-03 (approval only after a recorded delegation), TS-15 (proposer cannot approve), `tests/auth-scope.test.ts` (delegations follow the hierarchy, not rank).
