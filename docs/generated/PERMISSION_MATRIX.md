# Generated permission matrix

> Generated from `src/server/domain/catalogue.ts`. Do not edit by hand.

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER or ASSIGNMENT) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority.

| Permission | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 | R28 | R29 | R30 | R31 | R32 | R33 | R34 | R35 | R36 | R37 | R38 | R39 | R40 | R41 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.national.view` |  |  |  | N | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.division.view` |  |  |  |  |  |  |  |  | U | U |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.formation.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.district.view` |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.station.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.unit.view` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  | U | U | U | U | U | U | U | U | U |  |  |  |  |  |  |  |  |  |
| `org.view` | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |  | N | N |  |  |  |  |  |  |  |  |  | N | N | N | N |  |  | N | N |  |
| `org.propose` |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.view` | N |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `tenant.manage` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.view` | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.provision` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.suspend` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `user.deactivate` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.assign` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `grant.revoke` | N | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.grant` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `delegation.revoke` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `accessreview.manage` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.view` |  |  |  | U | N |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  | U |
| `request.create` |  |  |  |  | U |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |
| `request.edit` |  |  |  |  | U |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |
| `request.submit` |  |  |  |  | U |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |
| `request.assign` |  |  |  |  | N |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.cancel` |  |  |  |  | U |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |
| `request.progress` |  |  |  |  | U |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.close` |  |  |  |  | N |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `request.reopen` |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `fleet.view` |  |  |  |  | N |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  | N |  |  |
| `fleet.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |
| `maintenance.view` |  |  |  |  | N |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  | N |  |  |
| `maintenance.create` |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |
| `maintenance.process` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |
| `maintenance.verify` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |
| `service.record` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |
| `asset.view` |  |  |  |  | N |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | N |  |  |
| `asset.register` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |
| `asset.custody` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |
| `asset.inspect` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |
| `asset.dispose` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |
| `report.view` |  |  |  | N | N | N | N | N | U | U |  |  | U | S | S |  |  |  | S |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U | N | S |  |
| `report.export` |  |  |  | N | N | N |  |  | U |  |  |  | U |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U | U |  |  |  |
| `audit.view` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `audit.export` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `security.view` |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.view` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.configure` | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `workflow.view` | U |  |  | U | U |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |
| `workflow.configure` |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `personnel.view` |  |  |  | N | N | N | N | N | S | S | S | S | S | S | S | S | S | S | S | S | U | S | S | S | S | S | S | S | S | S | S | S |  | S | S | S |  |  | N |  |  |
| `personnel.register` |  |  |  |  |  |  | N |  |  |  | S |  |  |  |  | S |  |  |  | S | U |  | S |  |  | S |  | S |  | S |  | S |  |  |  |  |  |  |  |  |  |
| `personnel.edit` |  |  |  |  |  |  | N |  |  |  | S |  |  |  |  | S |  |  |  | S | U |  | S |  |  | S |  | S |  | S |  | S |  |  |  |  |  |  |  |  |  |
| `personnel.verify` |  |  |  |  |  |  | N |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `personnel.export` |  |  |  |  | N | N | N |  |  |  | S |  | S |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `manpower.view` |  |  |  | N | N | N |  | N | S | S |  |  | S | S | S |  |  | S | S |  | U | S | S | S | S | S | S | S | S | S | S | S | U | S | S |  |  |  | N | S |  |
| `manpower.create` |  |  |  |  | U | U |  |  |  | U |  |  |  |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |  | U |  |  |  |  |  |  |  |  |
| `manpower.review` |  |  |  |  | N | N |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |
| `manpower.contribute` |  |  |  |  |  |  |  |  |  | S |  |  |  | S | S |  |  | S | S |  | U |  | S | S | S | S | S | S | S | S | S | S |  |  |  |  |  |  |  |  |  |
| `roster.view` |  |  |  | N | N | N |  | N | S | S |  |  | S | S | S |  |  | S | S |  | U | S | S | S | S | S | S | S | S | S | S | S |  | S | S |  |  |  | N | S |  |
| `roster.build` |  |  |  |  | N | N |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |
| `roster.review` |  |  |  | N | N |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |
| `roster.export` |  |  |  | N | N | N |  |  |  | S |  |  | S |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |  |  |
| `area.view` |  |  | N | N | N | N |  | N | S | S |  | S | S | S | S |  | S | S | S |  |  | S | S |  |  |  |  |  |  |  |  |  | S | S | S | S |  |  | N |  |  |
| `area.manage` |  |  |  |  | N |  |  | N |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.view` |  |  |  | N | N | N |  | N | S | S |  | S | S | S | S |  | S | S | S |  |  | S | S | S | S |  | S |  | S |  | S |  |  |  | S | S |  |  | N | S |  |
| `assignment.propose` |  |  |  |  | N | N |  | N |  | S |  | S |  |  | S |  | S |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.transfer` |  |  |  |  | N |  |  | N |  | S |  | S |  |  | S |  | S |  |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.renew` |  |  |  |  | N |  |  | N |  |  |  | S |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `assignment.receive` |  |  |  |  |  |  |  | N |  |  |  | S |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |
| `disposition.change` |  |  |  |  | N |  |  | N |  |  |  | S |  |  |  |  | S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S |  |  |  |  |  |
| `contact.view` | N |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `contact.manage` | N |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

Role numbers: R01 Platform Super Administrator · R02 National Security Administrator · R03 National Organisation Registry Administrator · R04 DIG Operations Executive / National Operations Approver · R05 HQ Operations Administrator / Coordinator · R06 HQ Operations Staff / Manpower Planning Officer · R07 National Personnel Registry Administrator · R08 National Assignment and Disposition Administrator · R09 Provincial Division Commander · R10 Provincial Staff Ops / Provincial Operations Coordinator · R11 Provincial Personnel Records Officer · R12 Provincial Assignment Coordinator · R13 Provincial Reporting Officer · R14 District Commander · R15 District Operations Officer / Staff Ops · R16 District Personnel Records Officer · R17 District Assignment Coordinator · R18 Station Commander · R19 Station Operations Administrator · R20 Station Personnel Records Officer · R21 Police Post Supervisor / Administrative Officer · R22 Divisional Formation Commander · R23 Divisional Formation Staff Officer · R24 Unit Department Head · R25 Company Commander · R26 Company Administrative Officer · R27 Detachment Commander · R28 Detachment Administrative Officer · R29 Platoon Commander · R30 Platoon Administrative Officer · R31 Section Commander · R32 Section Administrative Officer · R33 Manpower Request Originator · R34 Manpower Roster Coordinator · R35 Assignment Approving Officer · R36 Receiving Area Administrative Officer · R37 Fleet Administration Officer · R38 General Asset Custodian · R39 Internal Auditor · R40 Read-Only Management User · R41 General Authorised Staff Member
