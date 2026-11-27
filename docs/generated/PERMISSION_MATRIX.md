# Generated permission matrix (31 roles)

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority. Technical, functional and audit roles never approve.

| Permission | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 | R28 | R29 | R30 | R31 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.national.view` |  | N | N | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.division.view` |  |  |  |  |  |  |  |  | U | U | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.formation.view` |  |  |  |  |  |  |  |  | U |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.district.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U | U | U |  |  |  |  |  |  |  |
| `dashboard.station.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |
| `dashboard.unit.view` |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `org.view` | N | N | N | N | N | N |  | N | N | N | N | N |  |  | N |  |  |  |  | N | N | N | N | N |  | N | N | N |  |  |  |
| `org.propose` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.view` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.manage` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.view` | N |  |  |  |  | N |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |  |  |
| `user.provision` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.suspend` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.deactivate` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.assign` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.revoke` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.grant` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.revoke` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `accessreview.manage` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.support` | N |  |  |  |  | N |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |  |  |
| `request.view` |  |  | U | N |  |  |  |  | U | U | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `request.create` |  |  |  | U |  |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `request.edit` |  |  |  | U |  |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `request.submit` |  |  |  | U |  |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `request.assign` |  |  |  | N |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.cancel` |  |  |  | U |  |  |  |  |  |  | U |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `request.progress` |  |  |  | U |  |  |  |  |  |  | U |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.close` |  |  |  | N |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.reopen` |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `fleet.view` |  |  | N | N |  |  |  |  | U |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `fleet.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `maintenance.view` |  |  |  | N |  |  |  |  | U |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `maintenance.create` |  |  |  |  |  |  |  |  |  |  | U |  |  |  | U |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `maintenance.process` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `maintenance.verify` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `service.record` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `asset.view` |  |  | N | N |  |  |  |  | S |  | U |  |  |  | U | S |  |  |  |  | S |  |  |  | S |  | S |  | S |  |  |
| `asset.register` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |
| `asset.custody` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |
| `asset.inspect` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |
| `asset.dispose` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `report.view` |  | N | N | N | N |  |  |  | S | S | S | S | S |  | S | U |  | U |  |  | S | S | S | S | U |  | S | S | U |  |  |
| `report.export` |  | N | N | N | N |  |  |  | S | S | S |  |  |  |  | U |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.view` |  | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.export` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `security.view` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.view` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.configure` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.operate` | N |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `health.view` | N |  |  |  |  | N |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |  |  |
| `workflow.view` | U | U | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `workflow.configure` |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `personnel.view` |  |  | N | N | N |  |  |  | S | S | S | S | S | S | S |  |  |  |  |  | S | S | S | S |  |  | S | S |  |  |  |
| `personnel.register` |  |  |  |  | N |  |  |  |  |  | S | S | S | S | S |  |  |  |  |  |  |  | S | S |  |  |  | S |  |  |  |
| `personnel.edit` |  |  |  |  | N |  |  |  |  |  | S | S | S | S | S |  |  |  |  |  |  |  | S | S |  |  |  | S |  |  |  |
| `personnel.verify` |  |  |  |  | N |  |  |  |  |  | S | S |  |  |  |  |  |  |  |  | S |  | S |  |  |  | S |  |  |  |  |
| `personnel.export` |  |  |  | N | N |  |  |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |
| `manpower.view` |  | N | N | N | N |  |  |  | S | S | S | S | S | S | S |  |  |  |  |  | S | S | S | S |  |  | S | S |  |  |  |
| `manpower.create` |  |  |  | U | U |  |  |  |  |  | U | U |  |  | U |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |
| `manpower.review` |  |  |  | N | N |  |  |  |  |  | S |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |
| `manpower.contribute` |  |  |  |  |  |  |  |  |  |  | S | S | S | S | S |  |  |  |  |  | S | S | S | S |  |  | S | S |  |  |  |
| `roster.view` |  |  | N | N | N |  |  |  | S | S | S | S | S | S | S |  |  |  |  |  | S | S | S | S |  |  | S | S |  |  |  |
| `roster.build` |  |  |  | N | N |  |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  |  | S | S |  |  |  |  |  |  |  |
| `roster.review` |  |  | N | N | N |  |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `roster.export` |  |  | N | N | N |  |  |  |  | S | S |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `area.view` |  |  | N | N | N |  |  |  | S | S | S | S |  |  | S |  |  |  |  |  | S | S | S | S |  |  | S |  |  |  |  |
| `area.manage` |  |  |  | N |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.view` |  |  | N | N | N |  |  |  | S | S | S | S | S |  | S |  |  |  |  |  | S | S | S | S |  |  | S | S |  |  |  |
| `assignment.propose` |  |  |  | N | N |  |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  | S | S | S |  |  |  |  |  |  |  |
| `assignment.transfer` |  |  |  | N | N |  |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  |  | S | S |  |  |  |  |  |  |  |
| `assignment.renew` |  |  |  | N | N |  |  |  |  |  | S | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.receive` |  |  |  | N |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |
| `disposition.change` |  |  |  | N |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |
| `stores.view` |  |  | N | N |  |  |  |  | S | S |  |  |  |  |  | S |  |  |  |  | S |  |  |  | S |  | S |  | S |  |  |
| `stores.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |
| `stores.requisition` |  |  |  |  |  |  |  |  |  |  | S |  |  |  | S |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |
| `stores.approve` |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  | S |  |  |  |  |
| `schedule.view` |  | N | N | N | N |  |  |  | S | S | S | S | S | S | S | S |  | S |  |  | S | S | S | S | S |  | S | S | S |  |  |
| `schedule.manage` |  |  |  | N | N |  |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  |  | S | S |  |  |  | S | S |  |  |
| `correspondence.view` |  | N | N | N | N |  |  |  | S | S | S | S | S |  | S |  |  |  |  |  | S | S | S | S |  |  | S | S | S |  |  |
| `correspondence.register` |  |  |  | N | N |  |  |  |  |  | S | S |  |  | S |  |  |  |  |  |  |  | S | S |  |  |  | S | S |  |  |
| `correspondence.manage` |  |  | N | N | N |  |  |  | S | S | S |  |  |  |  |  |  |  |  |  | S | S | S |  |  |  | S |  |  |  |  |
| `liaison.metadata.view` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.metadata.create` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.metadata.update_own` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.submission.acknowledge` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.reference.route` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.status.view` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `liaison.audit.view` |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S | U |
| `contact.view` | N |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `contact.manage` | N |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

Role numbers: R01 Superadmin · R02 Inspector General of Police (IG) · R03 Deputy Inspector General of Police - Operations (DIG Operations) · R04 Commissioner – Operations HQ · R05 Deputy Commissioner – Operations HQ · R06 System Administrator – HQ Tech · R07 National Police Intelligence Officer · R08 Divisional/Unit System Administrator (Tech) · R09 Formation Commanding Officer · R10 Deputy Division Commander · R11 Division Senior Staff Officer – Operations (Staff I) · R12 Deputy Division Staff Officer – Operations (Staff II) · R13 Company Commander · R14 Section Head · R15 Formation Operations Staff Administrator · R16 Divisional Quarter Masters Stores Officer · R17 Divisional Principal Armourer · R18 Divisional MTO Officer-in-Charge · R19 Division Police Intelligence Officer · R20 District System Administrator (Tech) · R21 Officer Commanding — District · R22 Deputy OC — District · R23 Operations Officer — District · R24 Deputy Operations Officer — District · R25 Stores Officer — District · R26 Police Station System Administrator · R27 Officer-in-Charge — Police Station GD · R28 Station Inspector — Police Station GD · R29 Police Station Administrator (Stores and Admin) · R30 District Police Intelligence Officer · R31 Police Intelligence Officer
