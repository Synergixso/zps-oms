# User Role Catalogue (27 roles, three tiers)

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Every role has a unique code and number, a tier, an official back-office name, the organisation unit types it may be assigned at, and scoped action permissions. A user may hold several roles, each at its own unit and validity period, and switches between them (one active context per session).

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority. Technical, functional and audit roles never approve.

## Tier 1 — National Headquarters

### Role 01 — Superadmin

- **Code:** `SUPERADMIN` · **Tier:** 1 · **Category:** TECHNICAL
- **Back office:** ZPS-OMS Superadmin Dashboard
- **Organisational context:** National Headquarters (platform-wide) — assignable at: service hq
- **Purpose:** Overall technical platform administration and national tenant configuration. No access to personnel records, sensitive operational information or business approval authority.
- **Permissions (22):** `org.view` (N), `org.propose` (N), `tenant.view` (N), `tenant.manage` (N), `user.view` (N), `user.provision` (N), `user.suspend` (N), `user.deactivate` (N), `grant.assign` (N), `grant.revoke` (N), `delegation.grant` (N), `delegation.revoke` (N), `accessreview.manage` (N), `user.support` (N), `security.view` (N), `platform.view` (N), `platform.configure` (N), `platform.operate` (N), `health.view` (N), `workflow.view` (U), `contact.view` (N), `contact.manage` (N)

### Role 02 — Inspector General of Police (IG)

- **Code:** `INSPECTOR_GENERAL` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Inspector General Executive Dashboard
- **Organisational context:** National Headquarters — assignable at: service hq
- **Purpose:** National executive oversight of authorised ZPS-OMS management information. Consolidated summaries, not individual personnel records; decisions only where a delegation is configured.
- **Permissions (10):** `dashboard.national.view` (N), `org.view` (N), `report.view` (N), `report.export` (N), `audit.view` (N), `audit.export` (N), `workflow.view` (U), `manpower.view` (N), `schedule.view` (N), `correspondence.view` (N)

### Role 03 — Deputy Inspector General of Police - Operations (DIG Operations)

- **Code:** `DIG_OPERATIONS` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** DIG Operations National Executive Dashboard
- **Organisational context:** Office of the DIG Operations, National Headquarters — assignable at: service hq
- **Purpose:** National Operations administration, coordination and oversight; approves within configured delegations. No platform technical configuration.
- **Permissions (20):** `dashboard.national.view` (N), `org.view` (N), `request.view` (U), `fleet.view` (N), `asset.view` (N), `report.view` (N), `report.export` (N), `audit.view` (N), `workflow.view` (U), `personnel.view` (N), `manpower.view` (N), `roster.view` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N), `stores.view` (N), `schedule.view` (N), `correspondence.view` (N), `correspondence.manage` (N)

### Role 04 — Commissioner – Operations HQ

- **Code:** `COMMISSIONER_OPS_HQ` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Commissioner Operations Headquarters Dashboard
- **Organisational context:** Operations Headquarters — assignable at: service hq
- **Purpose:** Senior administration and coordination of Operations Headquarters business processes. Approval authority only through configured delegations.
- **Permissions (42):** `dashboard.national.view` (N), `org.view` (N), `request.view` (N), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.assign` (N), `request.cancel` (U), `request.progress` (U), `request.close` (N), `fleet.view` (N), `maintenance.view` (N), `asset.view` (N), `report.view` (N), `report.export` (N), `workflow.view` (U), `workflow.configure` (N), `personnel.view` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `area.manage` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N), `assignment.receive` (N), `disposition.change` (N), `stores.view` (N), `schedule.view` (N), `schedule.manage` (N), `correspondence.view` (N), `correspondence.register` (N), `correspondence.manage` (N), `contact.view` (N), `contact.manage` (N)

### Role 05 — Deputy Commissioner – Operations HQ

- **Code:** `DEPUTY_COMMISSIONER_OPS_HQ` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Deputy Commissioner Operations HQ Dashboard
- **Organisational context:** Operations Headquarters — assignable at: service hq
- **Purpose:** Day-to-day administrative coordination and processing within Operations Headquarters; recommends or approves only where delegated.
- **Permissions (26):** `dashboard.national.view` (N), `org.view` (N), `report.view` (N), `report.export` (N), `personnel.view` (N), `personnel.register` (N), `personnel.edit` (N), `personnel.verify` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N), `schedule.view` (N), `schedule.manage` (N), `correspondence.view` (N), `correspondence.register` (N), `correspondence.manage` (N)

### Role 06 — System Administrator – HQ Tech

- **Code:** `HQ_TECH_ADMIN` · **Tier:** 1 · **Category:** TECHNICAL
- **Back office:** Headquarters Technical Administration Dashboard
- **Organisational context:** National Headquarters (technical) — assignable at: service hq
- **Purpose:** Institutionally scoped technical administration at Headquarters: health, database, jobs, backups, authentication monitoring and account support. No personnel access, approvals or tenant provisioning.
- **Permissions (11):** `org.view` (N), `user.view` (N), `user.suspend` (N), `grant.revoke` (N), `delegation.revoke` (N), `accessreview.manage` (N), `user.support` (N), `security.view` (N), `platform.view` (N), `platform.operate` (N), `health.view` (N)

## Tier 2 — Provincial Divisions and Unit Formations

### Role 07 — Divisional/Unit System Administrator (Tech)

- **Code:** `UNIT_TECH_ADMIN` · **Tier:** 2 · **Category:** TECHNICAL
- **Back office:** Division and Unit Technical Administration
- **Organisational context:** Assigned Provincial Division or Unit/Formation only — assignable at: provincial division, formation
- **Purpose:** Technical accounts and access support within the assigned Division or Formation; refers higher-level issues to HQ Tech. No personnel, assignment or approval authority.
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 08 — Formation Commanding Officer

- **Code:** `FORMATION_COMMANDING_OFFICER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Formation Command Headquarters
- **Organisational context:** Provincial Division or Unit/Formation (commanding officer) — assignable at: provincial division, formation
- **Purpose:** Oversight of the assigned Division or Formation and everything under it. Approves only within configured delegations; no access to unrelated formations or Provinces.
- **Permissions (23):** `dashboard.division.view` (U), `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.assign` (U), `request.close` (U), `request.reopen` (U), `fleet.view` (U), `maintenance.view` (U), `asset.view` (S), `report.view` (S), `report.export` (S), `personnel.view` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 09 — Deputy Division Commander

- **Code:** `DEPUTY_DIVISION_COMMANDER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Deputy Division Commander Dashboard
- **Organisational context:** Provincial Division or Unit/Formation (deputy) — assignable at: provincial division, formation
- **Purpose:** Supports the commanding officer: monitors performance, reviews outstanding matters and Staff I/II workflows; approves only where separately delegated.
- **Permissions (17):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `report.view` (S), `report.export` (S), `personnel.view` (S), `personnel.export` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 10 — Division Senior Staff Officer – Operations (Staff I)

- **Code:** `DIVISION_STAFF_I` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Division Senior Staff Officer – Operations
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Coordinates Divisional Operations administration: manpower requirements, contributions, rosters, assignments, transfers, tenure and renewals; supervises Staff II. No approval outside delegations.
- **Permissions (40):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `report.view` (S), `report.export` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `personnel.export` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `area.manage` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `assignment.receive` (S), `disposition.change` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `correspondence.manage` (S)

### Role 11 — Deputy Division Staff Officer – Operations (Staff II)

- **Code:** `DIVISION_STAFF_II` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Deputy Division Staff Officer – Operations
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Assists Staff I: prepares personnel information, compiles draft lists, verifies submissions, prepares transfer and renewal documentation. No Staff I approval authority.
- **Permissions (21):** `dashboard.division.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.create` (U), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 12 — Company Commander

- **Code:** `COMPANY_COMMANDER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Company Command Administration
- **Organisational context:** Company within a Unit/Formation — assignable at: company
- **Purpose:** Company administration: personnel register, contributions and submissions for the company and its platoons and sections. No access to other companies.
- **Permissions (11):** `dashboard.unit.view` (U), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S), `schedule.view` (S), `correspondence.view` (S)

### Role 13 — Section Head

- **Code:** `SECTION_HEAD` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Section Administration Dashboard
- **Organisational context:** Section (or department, detachment or platoon where configured) — assignable at: section, platoon, detachment, department
- **Purpose:** Section administrative records: selects personnel from the registry, prepares and verifies manpower contributions, tracks requests.
- **Permissions (8):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `schedule.view` (S)

### Role 14 — Formation Operations Staff Administrator

- **Code:** `FORMATION_OPS_STAFF_ADMIN` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Formation Operations Staff Administration
- **Organisational context:** Unit/Formation — assignable at: formation
- **Purpose:** Formation-level Operations administration: contributions, rosters, assignment documentation and subordinate submissions. No commanding-officer approval authority.
- **Permissions (32):** `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 15 — Divisional Quarter Masters Stores Officer

- **Code:** `QM_STORES_OFFICER` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Quarter Masters and Stores Administration
- **Organisational context:** Provincial Division or Unit/Formation stores — assignable at: provincial division, formation
- **Purpose:** General stores and non-sensitive assets: receipts, issue and return, requisitions, custody and reconciliation. Firearms, ammunition and sensitive equipment are excluded.
- **Permissions (10):** `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `asset.dispose` (S), `report.view` (U), `report.export` (U), `stores.view` (S), `stores.manage` (S), `schedule.view` (S)

### Role 16 — Divisional Principal Armourer

- **Code:** `PRINCIPAL_ARMOURER` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Armourer Administration
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Role-specific workspace for explicitly approved NON-SENSITIVE administrative functions only (administrative requests, tasks, notifications). No firearms, ammunition or armoury records exist in ZPS-OMS.
- **Permissions (5):** `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U)

### Role 17 — Divisional MTO Officer-in-Charge

- **Code:** `MTO_OIC` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Motor Transport Administration
- **Organisational context:** Provincial Division or Unit/Formation transport — assignable at: provincial division, formation
- **Purpose:** General fleet administration: vehicle register, documentation, maintenance, workshop referrals and service history. No GPS, movement or deployment information.
- **Permissions (10):** `fleet.view` (U), `fleet.manage` (U), `maintenance.view` (U), `maintenance.create` (U), `maintenance.process` (U), `maintenance.verify` (U), `service.record` (U), `report.view` (U), `report.export` (U), `schedule.view` (S)

## Tier 3 — District Commands and Police Stations

### Role 18 — District System Administrator (Tech)

- **Code:** `DISTRICT_TECH_ADMIN` · **Tier:** 3 · **Category:** TECHNICAL
- **Back office:** District Technical Administration
- **Organisational context:** Assigned District Command only — assignable at: district
- **Purpose:** Permitted technical functions and account support within the assigned District. No personnel-record or assignment access.
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 19 — Officer Commanding — District

- **Code:** `OC_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** District Command Dashboard
- **Organisational context:** District Command — assignable at: district
- **Purpose:** District oversight: stations and posts, personnel, contributions, assignments and stores. Approves only within configured delegations; no access to other Districts.
- **Permissions (16):** `dashboard.district.view` (U), `org.view` (N), `asset.view` (S), `report.view` (S), `personnel.view` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 20 — Deputy OC — District

- **Code:** `DEPUTY_OC_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Deputy District Commander Dashboard
- **Organisational context:** District Command — assignable at: district
- **Purpose:** Assists the District Commander; reviews subordinate submissions and processes delegated matters. Does not inherit the OC's approvals.
- **Permissions (13):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 21 — Operations Officer — District

- **Code:** `OPS_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** District Operations Officer Workspace
- **Organisational context:** District Command — assignable at: district
- **Purpose:** District Operations administration: manpower requests, station contributions, district lists, assignment records and reviews. No tactical deployment, patrol scheduling or tracking.
- **Permissions (25):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.receive` (S), `disposition.change` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `correspondence.manage` (S)

### Role 22 — Deputy Operations Officer — District

- **Code:** `DEPUTY_OPS_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Deputy District Operations Workspace
- **Organisational context:** District Command — assignable at: district
- **Purpose:** Assists the Operations Officer: prepares submissions, verifies contributions, maintains workflow records. No Operations Officer approval authority.
- **Permissions (19):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.export` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 23 — Stores Officer — District

- **Code:** `STORES_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** FUNCTIONAL
- **Back office:** District Stores Administration
- **Organisational context:** District Command stores — assignable at: district
- **Purpose:** General stores records, requisitions, receipts and issues, and non-sensitive asset custody for the District. Sensitive equipment is excluded.
- **Permissions (8):** `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `report.view` (U), `stores.view` (S), `stores.manage` (S), `schedule.view` (S)

### Role 24 — Police Station System Administrator

- **Code:** `STATION_TECH_ADMIN` · **Tier:** 3 · **Category:** TECHNICAL
- **Back office:** Police Station Technical Administration
- **Organisational context:** Assigned Police Station only — assignable at: station, post
- **Purpose:** Permitted technical functions and local account support for the assigned Station. No personnel management or assignment decisions.
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 25 — Officer-in-Charge — Police Station GD

- **Code:** `OIC_STATION_GD` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Police Station General Duties Administration
- **Organisational context:** Police Station (and its posts) — assignable at: station, post
- **Purpose:** Station-level general duties administrative oversight: personnel, contributions, submissions; approves specifically delegated matters.
- **Permissions (16):** `dashboard.station.view` (U), `org.view` (N), `asset.view` (S), `report.view` (S), `personnel.view` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 26 — Station Inspector — Police Station GD

- **Code:** `STATION_INSPECTOR_GD` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Station Inspector Operations Administration
- **Organisational context:** Police Station or Police Post — assignable at: station, post
- **Purpose:** Supports Station administration: personnel register, contributions and submissions; delegated supervisory functions only. Does not inherit OIC approvals.
- **Permissions (14):** `dashboard.station.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 27 — Police Station Administrator (Stores and Admin)

- **Code:** `STATION_ADMIN_STORES` · **Tier:** 3 · **Category:** FUNCTIONAL
- **Back office:** Police Station Stores and Administration
- **Organisational context:** Police Station — assignable at: station, post
- **Purpose:** Station administrative records, general stores and non-sensitive assets: issue and return, requisitions, reconciliation. No sensitive equipment, firearms or ammunition.
- **Permissions (17):** `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `report.view` (U), `stores.view` (S), `stores.manage` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

## Retired roles

The previous 41-role catalogue is retired (status RETIRED in `roles`; kept for assignment history, never any permission): `PLATFORM_ADMIN`, `SECURITY_ADMIN`, `ORG_REGISTRY_ADMIN`, `DIG_OPS_EXECUTIVE`, `HQ_OPS_COORDINATOR`, `HQ_OPS_STAFF`, `NATIONAL_PERSONNEL_ADMIN`, `NATIONAL_ASSIGNMENT_ADMIN`, `PROVINCIAL_COMMANDER`, `DIVISION_STAFF_OPS`, `PROVINCIAL_PERSONNEL_OFFICER`, `PROVINCIAL_ASSIGNMENT_COORDINATOR`, `PROVINCIAL_REPORTING_OFFICER`, `DISTRICT_COMMANDER`, `DISTRICT_OPS_OFFICER`, `DISTRICT_PERSONNEL_OFFICER`, `DISTRICT_ASSIGNMENT_COORDINATOR`, `STATION_COMMANDER`, `STATION_OPS_ADMIN`, `STATION_PERSONNEL_OFFICER`, `POST_SUPERVISOR`, `FORMATION_COMMANDER`, `FORMATION_ADMIN_OFFICER`, `DEPARTMENT_HEAD`, `COMPANY_COMMANDER`, `COMPANY_ADMIN_OFFICER`, `DETACHMENT_COMMANDER`, `DETACHMENT_ADMIN_OFFICER`, `PLATOON_COMMANDER`, `PLATOON_ADMIN_OFFICER`, `SECTION_COMMANDER`, `SECTION_ADMIN_OFFICER`, `MANPOWER_ORIGINATOR`, `ROSTER_COORDINATOR`, `ASSIGNMENT_APPROVER`, `RECEIVING_AREA_OFFICER`, `FLEET_OFFICER`, `ASSET_CUSTODIAN`, `INTERNAL_AUDITOR`, `READ_ONLY_MANAGEMENT`, `OPERATIONS_STAFF`. `COMPANY_COMMANDER` keeps its code as Role 12.
