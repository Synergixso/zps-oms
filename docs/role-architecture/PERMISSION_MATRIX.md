# Permission Matrix — 27 Roles

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority. Technical, functional and audit roles never approve.

## Directive functions mapped to enforced permissions

| Function in the directive | Enforced permission(s) |
|---|---|
| View role dashboard | `dashboard.national/division/formation/district/station/unit.view` (live, scoped figures) |
| View aggregate (summary) information only | `dashboard.national.view` without `personnel.view` → national summary figures, no record links |
| Personnel registry: view / create / correct / verify / export | `personnel.view` / `personnel.register` / `personnel.edit` / `personnel.verify` (second officer) / `personnel.export` (audited) |
| Manpower requests: originate / review / contribute | `manpower.create` / `manpower.review` / `manpower.contribute` (+ `manpower.view`) |
| Rosters: build / review / export | `roster.build` / `roster.review` / `roster.export` (+ `roster.view`) |
| Assignments, transfers, tenure, renewals, disposition | `assignment.view/propose/transfer/renew/receive`, `disposition.change`, `area.view/manage` |
| Approve or reject | Not a permission: delegation + BUSINESS role (`policy.approvalUnitFor`) |
| Administrative requests | `request.view/create/edit/submit/cancel/assign/progress/close/reopen` |
| Motor transport | `fleet.view/manage`, `maintenance.view/create/process/verify`, `service.record` |
| General assets | `asset.view/register/custody/inspect/dispose` |
| General stores | `stores.view` / `stores.manage` (receipts, issues, returns, adjustments) / `stores.requisition` / `stores.approve` (+ STORES delegation) |
| Reports | `report.view` / `report.export` (audited, field allow-list) |
| Organisation structure | `org.view` / `org.propose` (approval: ORG_CHANGE delegation) |
| Tenants | `tenant.view` / `tenant.manage` |
| User accounts and access (HQ) | `user.view/provision/suspend/deactivate`, `grant.assign/revoke`, `delegation.grant/revoke`, `accessreview.manage` |
| Scoped technical account support | `user.view` + `user.support` (temporary password, unlock, end sessions) within scope |
| System health / technical operations / configuration | `health.view` / `platform.view` + `platform.operate` / `platform.configure` |
| Security monitoring | `security.view` |
| Audit oversight | `audit.view` / `audit.export` |
| Workflow configuration | `workflow.view` / `workflow.configure` |

## Tier 1 — National Headquarters

| Permission | R01 | R02 | R03 | R04 | R05 | R06 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.national.view` |  | N | N | N | N |  |
| `org.view` | N | N | N | N | N | N |
| `org.propose` | N |  |  |  |  |  |
| `tenant.view` | N |  |  |  |  |  |
| `tenant.manage` | N |  |  |  |  |  |
| `user.view` | N |  |  |  |  | N |
| `user.provision` | N |  |  |  |  |  |
| `user.suspend` | N |  |  |  |  | N |
| `user.deactivate` | N |  |  |  |  |  |
| `grant.assign` | N |  |  |  |  |  |
| `grant.revoke` | N |  |  |  |  | N |
| `delegation.grant` | N |  |  |  |  |  |
| `delegation.revoke` | N |  |  |  |  | N |
| `accessreview.manage` | N |  |  |  |  | N |
| `user.support` | N |  |  |  |  | N |
| `request.view` |  |  | U | N |  |  |
| `request.create` |  |  |  | U |  |  |
| `request.edit` |  |  |  | U |  |  |
| `request.submit` |  |  |  | U |  |  |
| `request.assign` |  |  |  | N |  |  |
| `request.cancel` |  |  |  | U |  |  |
| `request.progress` |  |  |  | U |  |  |
| `request.close` |  |  |  | N |  |  |
| `fleet.view` |  |  | N | N |  |  |
| `maintenance.view` |  |  |  | N |  |  |
| `asset.view` |  |  | N | N |  |  |
| `report.view` |  | N | N | N | N |  |
| `report.export` |  | N | N | N | N |  |
| `audit.view` |  | N | N |  |  |  |
| `audit.export` |  | N |  |  |  |  |
| `security.view` | N |  |  |  |  | N |
| `platform.view` | N |  |  |  |  | N |
| `platform.configure` | N |  |  |  |  |  |
| `platform.operate` | N |  |  |  |  | N |
| `health.view` | N |  |  |  |  | N |
| `workflow.view` | U | U | U | U |  |  |
| `workflow.configure` |  |  |  | N |  |  |
| `personnel.view` |  |  | N | N | N |  |
| `personnel.register` |  |  |  |  | N |  |
| `personnel.edit` |  |  |  |  | N |  |
| `personnel.verify` |  |  |  |  | N |  |
| `personnel.export` |  |  |  | N | N |  |
| `manpower.view` |  | N | N | N | N |  |
| `manpower.create` |  |  |  | U | U |  |
| `manpower.review` |  |  |  | N | N |  |
| `roster.view` |  |  | N | N | N |  |
| `roster.build` |  |  |  | N | N |  |
| `roster.review` |  |  | N | N | N |  |
| `roster.export` |  |  | N | N | N |  |
| `area.view` |  |  | N | N | N |  |
| `area.manage` |  |  |  | N |  |  |
| `assignment.view` |  |  | N | N | N |  |
| `assignment.propose` |  |  |  | N | N |  |
| `assignment.transfer` |  |  |  | N | N |  |
| `assignment.renew` |  |  |  | N | N |  |
| `assignment.receive` |  |  |  | N |  |  |
| `disposition.change` |  |  |  | N |  |  |
| `stores.view` |  |  | N | N |  |  |
| `contact.view` | N |  |  | N |  |  |
| `contact.manage` | N |  |  | N |  |  |

R01 Superadmin · R02 Inspector General of Police (IG) · R03 Deputy Inspector General of Police - Operations (DIG Operations) · R04 Commissioner – Operations HQ · R05 Deputy Commissioner – Operations HQ · R06 System Administrator – HQ Tech

## Tier 2 — Provincial Divisions and Unit Formations

| Permission | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.division.view` |  | U | U | U | U |  |  |  |  |  |  |
| `dashboard.formation.view` |  | U |  |  |  |  |  | U |  |  |  |
| `dashboard.unit.view` |  |  |  |  |  | U | U |  |  |  |  |
| `org.view` | N | N | N | N | N |  |  | N |  |  |  |
| `user.view` | S |  |  |  |  |  |  |  |  |  |  |
| `user.support` | S |  |  |  |  |  |  |  |  |  |  |
| `request.view` |  | U | U | U |  |  |  | U |  | U |  |
| `request.create` |  |  |  | U |  |  |  | U |  | U |  |
| `request.edit` |  |  |  | U |  |  |  | U |  | U |  |
| `request.submit` |  |  |  | U |  |  |  | U |  | U |  |
| `request.assign` |  | U |  |  |  |  |  |  |  |  |  |
| `request.cancel` |  |  |  | U |  |  |  | U |  | U |  |
| `request.progress` |  |  |  | U |  |  |  | U |  |  |  |
| `request.close` |  | U |  |  |  |  |  |  |  |  |  |
| `request.reopen` |  | U |  |  |  |  |  |  |  |  |  |
| `fleet.view` |  | U |  | U |  |  |  | U |  |  | U |
| `fleet.manage` |  |  |  |  |  |  |  |  |  |  | U |
| `maintenance.view` |  | U |  | U |  |  |  | U |  |  | U |
| `maintenance.create` |  |  |  | U |  |  |  | U |  |  | U |
| `maintenance.process` |  |  |  |  |  |  |  |  |  |  | U |
| `maintenance.verify` |  |  |  |  |  |  |  |  |  |  | U |
| `service.record` |  |  |  |  |  |  |  |  |  |  | U |
| `asset.view` |  | S |  | U |  |  |  | U | S |  |  |
| `asset.register` |  |  |  |  |  |  |  |  | S |  |  |
| `asset.custody` |  |  |  |  |  |  |  |  | S |  |  |
| `asset.inspect` |  |  |  |  |  |  |  |  | S |  |  |
| `asset.dispose` |  |  |  |  |  |  |  |  | S |  |  |
| `report.view` |  | S | S | S | S | S |  | S | U |  | U |
| `report.export` |  | S | S | S |  |  |  |  | U |  | U |
| `health.view` | S |  |  |  |  |  |  |  |  |  |  |
| `personnel.view` |  | S | S | S | S | S | S | S |  |  |  |
| `personnel.register` |  |  |  | S | S | S | S | S |  |  |  |
| `personnel.edit` |  |  |  | S | S | S | S | S |  |  |  |
| `personnel.verify` |  |  |  | S | S |  |  |  |  |  |  |
| `personnel.export` |  |  | S | S |  |  |  |  |  |  |  |
| `manpower.view` |  | S | S | S | S | S | S | S |  |  |  |
| `manpower.create` |  |  |  | U | U |  |  | U |  |  |  |
| `manpower.review` |  |  |  | S |  |  |  | S |  |  |  |
| `manpower.contribute` |  |  |  | S | S | S | S | S |  |  |  |
| `roster.view` |  | S | S | S | S | S | S | S |  |  |  |
| `roster.build` |  |  |  | S | S |  |  | S |  |  |  |
| `roster.review` |  | S | S |  |  |  |  |  |  |  |  |
| `roster.export` |  |  | S | S |  |  |  | S |  |  |  |
| `area.view` |  | S | S | S | S |  |  | S |  |  |  |
| `area.manage` |  |  |  | S |  |  |  |  |  |  |  |
| `assignment.view` |  | S | S | S | S | S |  | S |  |  |  |
| `assignment.propose` |  |  |  | S | S |  |  | S |  |  |  |
| `assignment.transfer` |  |  |  | S | S |  |  | S |  |  |  |
| `assignment.renew` |  |  |  | S | S |  |  |  |  |  |  |
| `assignment.receive` |  |  |  | S |  |  |  |  |  |  |  |
| `disposition.change` |  |  |  | S |  |  |  |  |  |  |  |
| `stores.view` |  | S | S |  |  |  |  |  | S |  |  |
| `stores.manage` |  |  |  |  |  |  |  |  | S |  |  |
| `stores.requisition` |  |  |  | S |  |  |  | S |  |  |  |
| `stores.approve` |  | S |  |  |  |  |  |  |  |  |  |

R07 Divisional/Unit System Administrator (Tech) · R08 Formation Commanding Officer · R09 Deputy Division Commander · R10 Division Senior Staff Officer – Operations (Staff I) · R11 Deputy Division Staff Officer – Operations (Staff II) · R12 Company Commander · R13 Section Head · R14 Formation Operations Staff Administrator · R15 Divisional Quarter Masters Stores Officer · R16 Divisional Principal Armourer · R17 Divisional MTO Officer-in-Charge

## Tier 3 — District Commands and Police Stations

| Permission | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.district.view` |  | U | U | U | U |  |  |  |  |  |
| `dashboard.station.view` |  |  |  |  |  |  |  | U | U |  |
| `org.view` | N | N | N | N | N |  | N | N | N |  |
| `user.view` | S |  |  |  |  |  | S |  |  |  |
| `user.support` | S |  |  |  |  |  | S |  |  |  |
| `request.view` |  |  |  |  |  |  |  |  |  | U |
| `request.create` |  |  |  |  |  |  |  |  |  | U |
| `request.edit` |  |  |  |  |  |  |  |  |  | U |
| `request.submit` |  |  |  |  |  |  |  |  |  | U |
| `request.cancel` |  |  |  |  |  |  |  |  |  | U |
| `asset.view` |  | S |  |  |  | S |  | S |  | S |
| `asset.register` |  |  |  |  |  | S |  |  |  | S |
| `asset.custody` |  |  |  |  |  | S |  |  |  | S |
| `asset.inspect` |  |  |  |  |  | S |  |  |  | S |
| `report.view` |  | S | S | S | S | U |  | S | S | U |
| `health.view` | S |  |  |  |  |  | S |  |  |  |
| `personnel.view` |  | S | S | S | S |  |  | S | S |  |
| `personnel.register` |  |  |  | S | S |  |  |  | S |  |
| `personnel.edit` |  |  |  | S | S |  |  |  | S |  |
| `personnel.verify` |  | S |  | S |  |  |  | S |  |  |
| `personnel.export` |  |  |  |  | S |  |  |  |  |  |
| `manpower.view` |  | S | S | S | S |  |  | S | S |  |
| `manpower.create` |  |  |  | U |  |  |  |  |  |  |
| `manpower.review` |  |  |  | S |  |  |  |  |  |  |
| `manpower.contribute` |  | S | S | S | S |  |  | S | S |  |
| `roster.view` |  | S | S | S | S |  |  | S | S |  |
| `roster.build` |  |  |  | S | S |  |  |  |  |  |
| `area.view` |  | S | S | S | S |  |  | S |  |  |
| `assignment.view` |  | S | S | S | S |  |  | S | S |  |
| `assignment.propose` |  |  | S | S | S |  |  |  |  |  |
| `assignment.transfer` |  |  |  | S | S |  |  |  |  |  |
| `assignment.receive` |  |  |  | S |  |  |  |  |  |  |
| `disposition.change` |  |  |  | S |  |  |  |  |  |  |
| `stores.view` |  | S |  |  |  | S |  | S |  | S |
| `stores.manage` |  |  |  |  |  | S |  |  |  | S |
| `stores.requisition` |  |  |  | S |  |  |  |  |  | S |
| `stores.approve` |  | S |  |  |  |  |  | S |  |  |

R18 District System Administrator (Tech) · R19 Officer Commanding — District · R20 Deputy OC — District · R21 Operations Officer — District · R22 Deputy Operations Officer — District · R23 Stores Officer — District · R24 Police Station System Administrator · R25 Officer-in-Charge — Police Station GD · R26 Station Inspector — Police Station GD · R27 Police Station Administrator (Stores and Admin)

