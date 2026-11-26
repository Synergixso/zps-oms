# User Role Catalogue (41 roles)

> Generated from `src/server/domain/catalogue.ts` — the catalogue the server enforces and synchronises to the `roles` / `role_permissions` tables at start-up. Do not edit by hand; run `npm run docs:permissions`.

Every role has a unique code, official name, category, workspace (dashboard), the organisation unit types it may be assigned at, and scoped action permissions. A user may hold several roles, each at its own unit and with its own validity period.

Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.

Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER or ASSIGNMENT) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority.

## National Headquarters

### Role 01 — Platform Super Administrator

- **Code:** `PLATFORM_ADMIN` · **Category:** TECHNICAL
- **Workspace:** Platform Administration Workspace
- **Assignable at:** service hq
- **Purpose:** Technical configuration, tenant provisioning, approved user provisioning and system health. No access to personnel records and no approval authority.
- **Permissions (14):** `org.view` (N), `tenant.view` (N), `tenant.manage` (N), `user.view` (N), `user.provision` (N), `user.deactivate` (N), `grant.assign` (N), `grant.revoke` (N), `delegation.grant` (N), `platform.view` (N), `platform.configure` (N), `workflow.view` (U), `contact.view` (N), `contact.manage` (N)

### Role 02 — National Security Administrator

- **Code:** `SECURITY_ADMIN` · **Category:** SECURITY
- **Workspace:** Security Administration Workspace
- **Assignable at:** service hq
- **Purpose:** Authentication policy, account security, session monitoring, access recertification, suspension and revocation. No routine business approval.
- **Permissions (8):** `org.view` (N), `user.view` (N), `user.suspend` (N), `grant.revoke` (N), `delegation.revoke` (N), `accessreview.manage` (N), `audit.view` (N), `security.view` (N)

### Role 03 — National Organisation Registry Administrator

- **Code:** `ORG_REGISTRY_ADMIN` · **Category:** BUSINESS
- **Workspace:** Organisation and Formation Administration
- **Assignable at:** service hq
- **Purpose:** Maintains the approved organisational directory, tenant structure and relationships through effective-dated proposals. Cannot approve own proposals.
- **Permissions (4):** `org.view` (N), `org.propose` (N), `tenant.view` (N), `area.view` (N)

### Role 04 — DIG Operations Executive / National Operations Approver

- **Code:** `DIG_OPS_EXECUTIVE` · **Category:** BUSINESS
- **Workspace:** National Operations Dashboard
- **Assignable at:** service hq
- **Purpose:** National oversight and executive approval of manpower, roster and assignment matters where a recorded delegation exists.
- **Permissions (13):** `dashboard.national.view` (N), `org.view` (N), `request.view` (U), `report.view` (N), `report.export` (N), `workflow.view` (U), `personnel.view` (N), `manpower.view` (N), `roster.view` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N)

### Role 05 — HQ Operations Administrator / Coordinator

- **Code:** `HQ_OPS_COORDINATOR` · **Category:** BUSINESS
- **Workspace:** National Operations Coordination Workspace
- **Assignable at:** service hq
- **Purpose:** National Operations administration, manpower request management and workflow coordination within delegated authority.
- **Permissions (35):** `dashboard.national.view` (N), `org.view` (N), `request.view` (N), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.assign` (N), `request.cancel` (U), `request.progress` (U), `request.close` (N), `fleet.view` (N), `maintenance.view` (N), `asset.view` (N), `report.view` (N), `report.export` (N), `workflow.view` (U), `workflow.configure` (N), `personnel.view` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `area.manage` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N), `disposition.change` (N), `contact.view` (N), `contact.manage` (N)

### Role 06 — HQ Operations Staff / Manpower Planning Officer

- **Code:** `HQ_OPS_STAFF` · **Category:** BUSINESS
- **Workspace:** Operations Staff Workspace
- **Assignable at:** service hq
- **Purpose:** Prepares manpower requests, consolidates contributions, builds rosters, monitors assignment registers and produces administrative reports.
- **Permissions (15):** `dashboard.national.view` (N), `org.view` (N), `report.view` (N), `report.export` (N), `personnel.view` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N), `assignment.propose` (N)

### Role 07 — National Personnel Registry Administrator

- **Code:** `NATIONAL_PERSONNEL_ADMIN` · **Category:** BUSINESS
- **Workspace:** Personnel Registry Administration
- **Assignable at:** service hq
- **Purpose:** Maintains verified personnel master records and authorised organisational memberships nationally.
- **Permissions (7):** `org.view` (N), `report.view` (N), `personnel.view` (N), `personnel.register` (N), `personnel.edit` (N), `personnel.verify` (N), `personnel.export` (N)

### Role 08 — National Assignment and Disposition Administrator

- **Code:** `NATIONAL_ASSIGNMENT_ADMIN` · **Category:** BUSINESS
- **Workspace:** Assignment and Disposition Administration
- **Assignable at:** service hq
- **Purpose:** Assignment administration, transfer records, disposition management, tenure reviews and renewal processing.
- **Permissions (13):** `org.view` (N), `report.view` (N), `personnel.view` (N), `manpower.view` (N), `roster.view` (N), `area.view` (N), `area.manage` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N), `assignment.receive` (N), `disposition.change` (N)

## Provincial level

### Role 09 — Provincial Division Commander

- **Code:** `PROVINCIAL_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Provincial Division Dashboard
- **Assignable at:** provincial division
- **Purpose:** Oversight of the Provincial Division and its districts, stations and posts. Approves within formally delegated authority (delegation record required).
- **Permissions (17):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `request.assign` (U), `request.close` (U), `request.reopen` (U), `fleet.view` (U), `maintenance.view` (U), `asset.view` (U), `report.view` (U), `report.export` (U), `personnel.view` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `area.view` (S), `assignment.view` (S)

### Role 10 — Provincial Staff Ops / Provincial Operations Coordinator

- **Code:** `DIVISION_STAFF_OPS` · **Category:** BUSINESS
- **Workspace:** Provincial Operations Staff Workspace
- **Assignable at:** provincial division
- **Purpose:** Divisional administrative matters, manpower contributions, personnel submissions and divisional rosters. No approval authority unless a delegation is recorded.
- **Permissions (25):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `report.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S)

### Role 11 — Provincial Personnel Records Officer

- **Code:** `PROVINCIAL_PERSONNEL_OFFICER` · **Category:** BUSINESS
- **Workspace:** Provincial Personnel Records
- **Assignable at:** provincial division
- **Purpose:** Maintains approved personnel records and memberships within the assigned Province.
- **Permissions (6):** `org.view` (N), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `personnel.export` (S)

### Role 12 — Provincial Assignment Coordinator

- **Code:** `PROVINCIAL_ASSIGNMENT_COORDINATOR` · **Category:** BUSINESS
- **Workspace:** Provincial Assignment Coordination
- **Assignable at:** provincial division
- **Purpose:** Coordinates assignments, transfer requests, status updates and assignment reviews in the Province.
- **Permissions (10):** `org.view` (N), `personnel.view` (S), `area.view` (S), `area.manage` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `assignment.receive` (S), `disposition.change` (S)

### Role 13 — Provincial Reporting Officer

- **Code:** `PROVINCIAL_REPORTING_OFFICER` · **Category:** BUSINESS
- **Workspace:** Provincial Reporting Workspace
- **Assignable at:** provincial division
- **Purpose:** Prepares Provincial management reports, printable lists and administrative summaries.
- **Permissions (11):** `dashboard.division.view` (U), `org.view` (N), `report.view` (U), `report.export` (U), `personnel.view` (S), `personnel.export` (S), `manpower.view` (S), `roster.view` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S)

## District level

### Role 14 — District Commander

- **Code:** `DISTRICT_COMMANDER` · **Category:** BUSINESS
- **Workspace:** District Command Dashboard
- **Assignable at:** district
- **Purpose:** Oversight of the District Command, its stations and posts. No access to other districts.
- **Permissions (9):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S)

### Role 15 — District Operations Officer / Staff Ops

- **Code:** `DISTRICT_OPS_OFFICER` · **Category:** BUSINESS
- **Workspace:** District Operations Workspace
- **Assignable at:** district
- **Purpose:** Coordinates administrative matters and personnel contributions within the District.
- **Permissions (11):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S)

### Role 16 — District Personnel Records Officer

- **Code:** `DISTRICT_PERSONNEL_OFFICER` · **Category:** BUSINESS
- **Workspace:** District Personnel Records
- **Assignable at:** district
- **Purpose:** Maintains personnel records for the assigned District.
- **Permissions (5):** `org.view` (N), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.export` (S)

### Role 17 — District Assignment Coordinator

- **Code:** `DISTRICT_ASSIGNMENT_COORDINATOR` · **Category:** BUSINESS
- **Workspace:** District Assignment Coordination
- **Assignable at:** district
- **Purpose:** Processes assignment administration and transfer matters for the District.
- **Permissions (9):** `org.view` (N), `personnel.view` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `assignment.receive` (S), `disposition.change` (S)

## Police Station level

### Role 18 — Station Commander

- **Code:** `STATION_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Police Station Dashboard
- **Assignable at:** station
- **Purpose:** Oversight of the Police Station and its subordinate posts.
- **Permissions (8):** `dashboard.station.view` (U), `org.view` (N), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S)

### Role 19 — Station Operations Administrator

- **Code:** `STATION_OPS_ADMIN` · **Category:** BUSINESS
- **Workspace:** Station Operations Workspace
- **Assignable at:** station
- **Purpose:** Administrative submissions, personnel contributions and station reporting.
- **Permissions (9):** `dashboard.station.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S)

### Role 20 — Station Personnel Records Officer

- **Code:** `STATION_PERSONNEL_OFFICER` · **Category:** BUSINESS
- **Workspace:** Station Personnel Register
- **Assignable at:** station
- **Purpose:** Maintains the approved station personnel register.
- **Permissions (5):** `dashboard.station.view` (U), `org.view` (N), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S)

## Police Post level

### Role 21 — Police Post Supervisor / Administrative Officer

- **Code:** `POST_SUPERVISOR` · **Category:** BUSINESS
- **Workspace:** Police Post Workspace
- **Assignable at:** post
- **Purpose:** Limited administrative information and personnel records within the assigned Police Post.
- **Permissions (7):** `dashboard.unit.view` (U), `personnel.view` (U), `personnel.register` (U), `personnel.edit` (U), `manpower.view` (U), `manpower.contribute` (U), `roster.view` (U)

## Divisional formations

### Role 22 — Divisional Formation Commander

- **Code:** `FORMATION_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Formation Commander Dashboard
- **Assignable at:** formation
- **Purpose:** Oversight of the formation and its departments, companies, detachments, platoons and sections. Approves within delegated authority.
- **Permissions (17):** `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.assign` (U), `request.close` (U), `request.reopen` (U), `fleet.view` (U), `maintenance.view` (U), `asset.view` (U), `report.view` (U), `report.export` (U), `personnel.view` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `area.view` (S), `assignment.view` (S)

### Role 23 — Divisional Formation Staff Officer

- **Code:** `FORMATION_ADMIN_OFFICER` · **Category:** BUSINESS
- **Workspace:** Formation Staff Workspace
- **Assignable at:** formation
- **Purpose:** Formation-level administrative matters, personnel coordination, contributions and rosters. No assumed approval powers.
- **Permissions (29):** `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `asset.custody` (U), `asset.inspect` (U), `report.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S)

### Role 24 — Unit Department Head

- **Code:** `DEPARTMENT_HEAD` · **Category:** BUSINESS
- **Workspace:** Unit Department Head Workspace
- **Assignable at:** department
- **Purpose:** Departmental records and manpower contributions.
- **Permissions (6):** `dashboard.unit.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S)

### Role 25 — Company Commander

- **Code:** `COMPANY_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Company Commander Workspace
- **Assignable at:** company
- **Purpose:** Company-level personnel administration and submissions. No access to other companies.
- **Permissions (6):** `dashboard.unit.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S)

### Role 26 — Company Administrative Officer

- **Code:** `COMPANY_ADMIN_OFFICER` · **Category:** BUSINESS
- **Workspace:** Company Administrative Officer Workspace
- **Assignable at:** company
- **Purpose:** Company records, submissions and personnel registers.
- **Permissions (7):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S)

### Role 27 — Detachment Commander

- **Code:** `DETACHMENT_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Detachment Commander Workspace
- **Assignable at:** detachment
- **Purpose:** Detachment-level administration.
- **Permissions (6):** `dashboard.unit.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S)

### Role 28 — Detachment Administrative Officer

- **Code:** `DETACHMENT_ADMIN_OFFICER` · **Category:** BUSINESS
- **Workspace:** Detachment Administrative Officer Workspace
- **Assignable at:** detachment
- **Purpose:** Detachment personnel registers and submissions.
- **Permissions (7):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S)

### Role 29 — Platoon Commander

- **Code:** `PLATOON_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Platoon Commander Workspace
- **Assignable at:** platoon
- **Purpose:** Platoon-level administrative oversight.
- **Permissions (6):** `dashboard.unit.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S)

### Role 30 — Platoon Administrative Officer

- **Code:** `PLATOON_ADMIN_OFFICER` · **Category:** BUSINESS
- **Workspace:** Platoon Administrative Officer Workspace
- **Assignable at:** platoon
- **Purpose:** Platoon personnel records and contributions.
- **Permissions (7):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S)

### Role 31 — Section Commander

- **Code:** `SECTION_COMMANDER` · **Category:** BUSINESS
- **Workspace:** Section Commander Workspace
- **Assignable at:** section
- **Purpose:** Section-level personnel administration.
- **Permissions (6):** `dashboard.unit.view` (U), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S)

### Role 32 — Section Administrative Officer

- **Code:** `SECTION_ADMIN_OFFICER` · **Category:** BUSINESS
- **Workspace:** Section Administrative Officer Workspace
- **Assignable at:** section
- **Purpose:** Section personnel information and submissions.
- **Permissions (7):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S)

## Specialist and functional roles

### Role 33 — Manpower Request Originator

- **Code:** `MANPOWER_ORIGINATOR` · **Category:** FUNCTIONAL
- **Workspace:** Manpower Requests Workspace
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Creates and submits manpower requests for the assigned unit.
- **Permissions (4):** `org.view` (N), `manpower.view` (U), `manpower.create` (U), `area.view` (S)

### Role 34 — Manpower Roster Coordinator

- **Code:** `ROSTER_COORDINATOR` · **Category:** FUNCTIONAL
- **Workspace:** Roster Coordination Workspace
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Compiles personnel contributions and prepares consolidated rosters.
- **Permissions (8):** `org.view` (N), `personnel.view` (S), `manpower.view` (S), `manpower.review` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S)

### Role 35 — Assignment Approving Officer

- **Code:** `ASSIGNMENT_APPROVER` · **Category:** BUSINESS
- **Workspace:** Assignment Approvals
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Reviews and approves assignment matters within delegated authority (ASSIGNMENT delegation required).
- **Permissions (7):** `org.view` (N), `personnel.view` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `area.view` (S), `assignment.view` (S)

### Role 36 — Receiving Area Administrative Officer

- **Code:** `RECEIVING_AREA_OFFICER` · **Category:** FUNCTIONAL
- **Workspace:** Receiving Area Administration
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Processes assignment acceptance and receiving-area administrative records.
- **Permissions (6):** `org.view` (N), `personnel.view` (S), `area.view` (S), `assignment.view` (S), `assignment.receive` (S), `disposition.change` (S)

### Role 37 — Fleet Administration Officer

- **Code:** `FLEET_OFFICER` · **Category:** FUNCTIONAL
- **Workspace:** Fleet and Transport Management Workspace
- **Assignable at:** service hq, provincial division, formation
- **Purpose:** General fleet administration for granted organisations only. No GPS, location, routes, mission purpose or deployment history.
- **Permissions (9):** `fleet.view` (U), `fleet.manage` (U), `maintenance.view` (U), `maintenance.create` (U), `maintenance.process` (U), `maintenance.verify` (U), `service.record` (U), `report.view` (U), `report.export` (U)

### Role 38 — General Asset Custodian

- **Code:** `ASSET_CUSTODIAN` · **Category:** FUNCTIONAL
- **Workspace:** Assets and Equipment Workspace
- **Assignable at:** service hq, provincial division, formation
- **Purpose:** Non-sensitive general assets in approved categories only. Firearms, ammunition and controlled equipment are excluded.
- **Permissions (7):** `asset.view` (U), `asset.register` (U), `asset.custody` (U), `asset.inspect` (U), `asset.dispose` (U), `report.view` (U), `report.export` (U)

### Role 39 — Internal Auditor

- **Code:** `INTERNAL_AUDITOR` · **Category:** AUDIT · **Time-limited assignment**
- **Workspace:** Audit and Compliance Workspace
- **Assignable at:** service hq, provincial division, formation
- **Purpose:** Read-only, time-limited audit scope over transactions, approvals and audit trails. Cannot modify any business record.
- **Permissions (14):** `org.view` (N), `request.view` (N), `fleet.view` (N), `maintenance.view` (N), `asset.view` (N), `report.view` (N), `audit.view` (N), `audit.export` (N), `workflow.view` (U), `personnel.view` (N), `manpower.view` (N), `roster.view` (N), `area.view` (N), `assignment.view` (N)

### Role 40 — Read-Only Management User

- **Code:** `READ_ONLY_MANAGEMENT` · **Category:** FUNCTIONAL
- **Workspace:** Management Information
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Views authorised reports, rosters and organisational information without modification privileges.
- **Permissions (5):** `org.view` (N), `report.view` (S), `manpower.view` (S), `roster.view` (S), `assignment.view` (S)

### Role 41 — General Authorised Staff Member

- **Code:** `OPERATIONS_STAFF` · **Category:** BUSINESS
- **Workspace:** My Operations Workspace
- **Assignable at:** service hq, hq office, provincial division, district, station, post, formation, department, company, detachment, platoon, section
- **Purpose:** Specifically assigned functionality only: create and track own unit's administrative requests. No access to national manpower registers.
- **Permissions (5):** `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U)
