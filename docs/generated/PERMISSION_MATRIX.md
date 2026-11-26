# Generated permission matrix (27 roles)

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority. Technical, functional and audit roles never approve.

| Permission | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.national.view` |  | N | N | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.division.view` |  |  |  |  |  |  |  | U | U | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.formation.view` |  |  |  |  |  |  |  | U |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.district.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U | U | U |  |  |  |  |  |
| `dashboard.station.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |
| `dashboard.unit.view` |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `org.view` | N | N | N | N | N | N | N | N | N | N | N |  |  | N |  |  |  | N | N | N | N | N |  | N | N | N |  |
| `org.propose` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.view` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.manage` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.view` | N |  |  |  |  | N | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |
| `user.provision` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.suspend` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.deactivate` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.assign` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.revoke` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.grant` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.revoke` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `accessreview.manage` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.support` | N |  |  |  |  | N | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |
| `request.view` |  |  | U | N |  |  |  | U | U | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  | U |
| `request.create` |  |  |  | U |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  | U |
| `request.edit` |  |  |  | U |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  | U |
| `request.submit` |  |  |  | U |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  | U |
| `request.assign` |  |  |  | N |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.cancel` |  |  |  | U |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  | U |
| `request.progress` |  |  |  | U |  |  |  |  |  | U |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.close` |  |  |  | N |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.reopen` |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `fleet.view` |  |  | N | N |  |  |  | U |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `fleet.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `maintenance.view` |  |  |  | N |  |  |  | U |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `maintenance.create` |  |  |  |  |  |  |  |  |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `maintenance.process` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `maintenance.verify` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `service.record` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |
| `asset.view` |  |  | N | N |  |  |  | S |  | U |  |  |  | U | S |  |  |  | S |  |  |  | S |  | S |  | S |
| `asset.register` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  | S |
| `asset.custody` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  | S |
| `asset.inspect` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  | S |
| `asset.dispose` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |
| `report.view` |  | N | N | N | N |  |  | S | S | S | S | S |  | S | U |  | U |  | S | S | S | S | U |  | S | S | U |
| `report.export` |  | N | N | N | N |  |  | S | S | S |  |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |
| `audit.view` |  | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.export` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `security.view` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.view` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.configure` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.operate` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `health.view` | N |  |  |  |  | N | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |
| `workflow.view` | U | U | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `workflow.configure` |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `personnel.view` |  |  | N | N | N |  |  | S | S | S | S | S | S | S |  |  |  |  | S | S | S | S |  |  | S | S |  |
| `personnel.register` |  |  |  |  | N |  |  |  |  | S | S | S | S | S |  |  |  |  |  |  | S | S |  |  |  | S |  |
| `personnel.edit` |  |  |  |  | N |  |  |  |  | S | S | S | S | S |  |  |  |  |  |  | S | S |  |  |  | S |  |
| `personnel.verify` |  |  |  |  | N |  |  |  |  | S | S |  |  |  |  |  |  |  | S |  | S |  |  |  | S |  |  |
| `personnel.export` |  |  |  | N | N |  |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |
| `manpower.view` |  | N | N | N | N |  |  | S | S | S | S | S | S | S |  |  |  |  | S | S | S | S |  |  | S | S |  |
| `manpower.create` |  |  |  | U | U |  |  |  |  | U | U |  |  | U |  |  |  |  |  |  | U |  |  |  |  |  |  |
| `manpower.review` |  |  |  | N | N |  |  |  |  | S |  |  |  | S |  |  |  |  |  |  | S |  |  |  |  |  |  |
| `manpower.contribute` |  |  |  |  |  |  |  |  |  | S | S | S | S | S |  |  |  |  | S | S | S | S |  |  | S | S |  |
| `roster.view` |  |  | N | N | N |  |  | S | S | S | S | S | S | S |  |  |  |  | S | S | S | S |  |  | S | S |  |
| `roster.build` |  |  |  | N | N |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  | S | S |  |  |  |  |  |
| `roster.review` |  |  | N | N | N |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `roster.export` |  |  | N | N | N |  |  |  | S | S |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `area.view` |  |  | N | N | N |  |  | S | S | S | S |  |  | S |  |  |  |  | S | S | S | S |  |  | S |  |  |
| `area.manage` |  |  |  | N |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.view` |  |  | N | N | N |  |  | S | S | S | S | S |  | S |  |  |  |  | S | S | S | S |  |  | S | S |  |
| `assignment.propose` |  |  |  | N | N |  |  |  |  | S | S |  |  | S |  |  |  |  |  | S | S | S |  |  |  |  |  |
| `assignment.transfer` |  |  |  | N | N |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  | S | S |  |  |  |  |  |
| `assignment.renew` |  |  |  | N | N |  |  |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.receive` |  |  |  | N |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |
| `disposition.change` |  |  |  | N |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |
| `stores.view` |  |  | N | N |  |  |  | S | S |  |  |  |  |  | S |  |  |  | S |  |  |  | S |  | S |  | S |
| `stores.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  | S |
| `stores.requisition` |  |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |  |  |  |  | S |  |  |  |  |  | S |
| `stores.approve` |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |
| `contact.view` | N |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `contact.manage` | N |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

Role numbers: R01 Superadmin · R02 Inspector General of Police (IG) · R03 Deputy Inspector General of Police - Operations (DIG Operations) · R04 Commissioner – Operations HQ · R05 Deputy Commissioner – Operations HQ · R06 System Administrator – HQ Tech · R07 Divisional/Unit System Administrator (Tech) · R08 Formation Commanding Officer · R09 Deputy Division Commander · R10 Division Senior Staff Officer – Operations (Staff I) · R11 Deputy Division Staff Officer – Operations (Staff II) · R12 Company Commander · R13 Section Head · R14 Formation Operations Staff Administrator · R15 Divisional Quarter Masters Stores Officer · R16 Divisional Principal Armourer · R17 Divisional MTO Officer-in-Charge · R18 District System Administrator (Tech) · R19 Officer Commanding — District · R20 Deputy OC — District · R21 Operations Officer — District · R22 Deputy Operations Officer — District · R23 Stores Officer — District · R24 Police Station System Administrator · R25 Officer-in-Charge — Police Station GD · R26 Station Inspector — Police Station GD · R27 Police Station Administrator (Stores and Admin)
