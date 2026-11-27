# Tier 2 Implementation — Provincial Divisions and Unit Formations

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Twelve roles held at a Provincial Division or Unit Formation (Company Commander at a company; Section Head at a section, platoon, detachment or department). SUBTREE coverage reaches every subordinate unit and never a sibling Division or Formation. Role 17 (Principal Armourer) is a non-sensitive administrative workspace only. Role 19 (Division Police Intelligence Officer) is a restricted liaison workspace for the assigned Division or Formation.

Status, tests and evidence per role: `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and `docs/role-architecture/ROLE_TEST_RESULTS.md`.

### Role 08 — Divisional/Unit System Administrator (Tech)

- **Code:** `UNIT_TECH_ADMIN` · **Tier:** 2 · **Category:** TECHNICAL
- **Back office:** Division and Unit Technical Administration
- **Organisational context:** Assigned Provincial Division or Unit/Formation only — assignable at: provincial division, formation
- **Purpose:** Technical accounts and access support within the assigned Division or Formation; refers higher-level issues to HQ Tech. No personnel, assignment or approval authority.
- **Workspace purpose line:** Technical account support within your Division or Formation. Higher-level issues go to HQ Tech.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Technical administration (`/app/admin/users`, `/app/admin/roles`) · Organisation (`/app/org`)
- **Headline figures:** `usersActive`, `locked`, `failedLogins24h`, `myTasks`
- **Quick actions:** Account support
- **Working panels:** dashboard kind `TECH_LOCAL`
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 09 — Formation Commanding Officer

- **Code:** `FORMATION_COMMANDING_OFFICER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Formation Command Headquarters
- **Organisational context:** Provincial Division or Unit/Formation (commanding officer) — assignable at: provincial division, formation
- **Purpose:** Oversight of the assigned Division or Formation and everything under it. Approves only within configured delegations; no access to unrelated formations or Provinces.
- **Workspace purpose line:** Command oversight of your Division or Formation and everything under it.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/fleet`, `/app/fleet/maintenance`, `/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `orgUnits`, `personnel`, `activeAssignments`, `contributionsDue`, `storesAwaitingDecision`, `pendingDecisions`
- **Quick actions:** Review approvals, Open reports, Stores and stock
- **Working panels:** dashboard kind `FORMATION_COMMAND`
- **Permissions (24):** `dashboard.division.view` (U), `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.assign` (U), `request.close` (U), `request.reopen` (U), `fleet.view` (U), `maintenance.view` (U), `asset.view` (S), `report.view` (S), `report.export` (S), `personnel.view` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S), `command.structure.view` (S)

### Role 10 — Deputy Division Commander

- **Code:** `DEPUTY_DIVISION_COMMANDER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Deputy Division Commander Dashboard
- **Organisational context:** Provincial Division or Unit/Formation (deputy) — assignable at: provincial division, formation
- **Purpose:** Supports the commanding officer: monitors performance, reviews outstanding matters and Staff I/II workflows; approves only where separately delegated.
- **Workspace purpose line:** Support to the commanding officer: performance, outstanding matters and Staff I/II workflows.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/stores`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `orgUnits`, `personnel`, `activeAssignments`, `openManpower`, `reviewsDue`, `pendingDecisions`
- **Quick actions:** Review approvals, Open reports, Transfers
- **Working panels:** dashboard kind `DIVISION_COMMAND`
- **Permissions (18):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `report.view` (S), `report.export` (S), `personnel.view` (S), `personnel.export` (S), `manpower.view` (S), `roster.view` (S), `roster.review` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S), `command.structure.view` (S)

### Role 11 — Division Senior Staff Officer – Operations (Staff I)

- **Code:** `DIVISION_STAFF_I` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Division Senior Staff Officer – Operations
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Coordinates Divisional Operations administration: manpower requirements, contributions, rosters, assignments, transfers, tenure and renewals; supervises Staff II. No approval outside delegations.
- **Workspace purpose line:** Divisional Operations administration: requirements, contributions, rosters, assignments, transfers and renewals.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/fleet`, `/app/fleet/maintenance`, `/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `openManpower`, `contributionsToReview`, `rostersApproved`, `activeAssignments`, `reviewsDue`, `pendingDecisions`
- **Quick actions:** New manpower request, Register personnel, New stores requisition, Open reports
- **Working panels:** dashboard kind `DIVISION_STAFF_OPS`
- **Permissions (41):** `dashboard.division.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `report.view` (S), `report.export` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `personnel.export` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `area.manage` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `assignment.receive` (S), `disposition.change` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `correspondence.manage` (S), `command.structure.view` (S)

### Role 12 — Deputy Division Staff Officer – Operations (Staff II)

- **Code:** `DIVISION_STAFF_II` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Deputy Division Staff Officer – Operations
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Assists Staff I: prepares personnel information, compiles draft lists, verifies submissions, prepares transfer and renewal documentation. No Staff I approval authority.
- **Workspace purpose line:** Preparation and verification support for Staff I: personnel information, draft lists and documentation.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `unverified`, `contributionsDue`, `activeAssignments`, `transfersOpen`, `myTasks`
- **Quick actions:** Register personnel, New manpower request, Prepare contribution
- **Working panels:** dashboard kind `ASSIGNMENT_ADMIN`
- **Permissions (22):** `dashboard.division.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.create` (U), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.renew` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `command.structure.view` (S)

### Role 13 — Company Commander

- **Code:** `COMPANY_COMMANDER` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Company Command Administration
- **Organisational context:** Company within a Unit/Formation — assignable at: company
- **Purpose:** Company administration: personnel register, contributions and submissions for the company and its platoons and sections. No access to other companies.
- **Workspace purpose line:** Company administration: personnel register, contributions and submissions for your company.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and contributions (`/app/personnel`, `/app/manpower/contributions`, `/app/manpower`, `/app/rosters`, `/app/assignments`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `available`, `activeAssignments`, `contributionsDue`, `pendingDecisions`, `myTasks`
- **Quick actions:** Prepare contribution, Register personnel
- **Working panels:** dashboard kind `UNIT_COMMAND`
- **Permissions (11):** `dashboard.unit.view` (U), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S), `schedule.view` (S), `correspondence.view` (S)

### Role 14 — Section Head

- **Code:** `SECTION_HEAD` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Section Administration Dashboard
- **Organisational context:** Section (or department, detachment or platoon where configured) — assignable at: section, platoon, detachment, department
- **Purpose:** Section administrative records: selects personnel from the registry, prepares and verifies manpower contributions, tracks requests.
- **Workspace purpose line:** Section administrative records: personnel selection and manpower contributions.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and contributions (`/app/personnel`, `/app/manpower/contributions`, `/app/manpower`, `/app/rosters`, `/app/assignments`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `available`, `contributionsDue`, `myTasks`, `unread`
- **Quick actions:** Prepare contribution, Register personnel
- **Working panels:** dashboard kind `UNIT_COMMAND`
- **Permissions (8):** `dashboard.unit.view` (U), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `schedule.view` (S)

### Role 15 — Formation Operations Staff Administrator

- **Code:** `FORMATION_OPS_STAFF_ADMIN` · **Tier:** 2 · **Category:** BUSINESS
- **Back office:** Formation Operations Staff Administration
- **Organisational context:** Unit/Formation — assignable at: formation
- **Purpose:** Formation-level Operations administration: contributions, rosters, assignment documentation and subordinate submissions. No commanding-officer approval authority.
- **Workspace purpose line:** Formation-level Operations administration and subordinate submissions.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/fleet`, `/app/fleet/maintenance`, `/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `openManpower`, `contributionsDue`, `personnel`, `activeAssignments`, `pendingDecisions`, `myTasks`
- **Quick actions:** New manpower request, Register personnel, New administrative request, New stores requisition
- **Working panels:** dashboard kind `FORMATION_ADMIN`
- **Permissions (33):** `dashboard.formation.view` (U), `org.view` (N), `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `request.progress` (U), `fleet.view` (U), `maintenance.view` (U), `maintenance.create` (U), `asset.view` (U), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `roster.export` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `command.structure.view` (S)

### Role 16 — Divisional Quarter Masters Stores Officer

- **Code:** `QM_STORES_OFFICER` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Quarter Masters and Stores Administration
- **Organisational context:** Provincial Division or Unit/Formation stores — assignable at: provincial division, formation
- **Purpose:** General stores and non-sensitive assets: receipts, issue and return, requisitions, custody and reconciliation. Firearms, ammunition and sensitive equipment are excluded.
- **Workspace purpose line:** Divisional general stores and non-sensitive assets: stock, requisitions, custody and reconciliation.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Stores (`/app/stores`, `/app/stores/requisitions`) · Assets (`/app/assets`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `storesItems`, `storesLow`, `storesToIssue`, `assets`, `notInspected`, `reconciliationsOpen`
- **Quick actions:** Stores and stock, Requisitions to issue, Asset reconciliation
- **Working panels:** dashboard kind `STORES`
- **Permissions (10):** `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `asset.dispose` (S), `report.view` (U), `report.export` (U), `stores.view` (S), `stores.manage` (S), `schedule.view` (S)

### Role 17 — Divisional Principal Armourer

- **Code:** `PRINCIPAL_ARMOURER` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Armourer Administration
- **Organisational context:** Provincial Division or Unit/Formation — assignable at: provincial division, formation
- **Purpose:** Role-specific workspace for explicitly approved NON-SENSITIVE administrative functions only (administrative requests, tasks, notifications). No firearms, ammunition or armoury records exist in ZPS-OMS.
- **Workspace purpose line:** Approved non-sensitive administrative functions only. No firearms, ammunition or armoury records exist in ZPS-OMS.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Administration (`/app/requests`)
- **Headline figures:** `myRequests`, `myTasks`, `unread`
- **Quick actions:** New administrative request
- **Working panels:** dashboard kind `MY_WORKSPACE`
- **Permissions (5):** `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U)

### Role 18 — Divisional MTO Officer-in-Charge

- **Code:** `MTO_OIC` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Divisional Motor Transport Administration
- **Organisational context:** Provincial Division or Unit/Formation transport — assignable at: provincial division, formation
- **Purpose:** General fleet administration: vehicle register, documentation, maintenance, workshop referrals and service history. No GPS, movement or deployment information.
- **Workspace purpose line:** Divisional motor transport administration: vehicle register, documentation, maintenance and service history.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Motor transport (`/app/fleet`, `/app/fleet/maintenance`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `vehicles`, `maintenanceOpen`, `serviceDue`, `pendingDecisions`, `myTasks`, `unread`
- **Quick actions:** Vehicle register, Maintenance requests, Open reports
- **Working panels:** dashboard kind `FLEET`
- **Permissions (10):** `fleet.view` (U), `fleet.manage` (U), `maintenance.view` (U), `maintenance.create` (U), `maintenance.process` (U), `maintenance.verify` (U), `service.record` (U), `report.view` (U), `report.export` (U), `schedule.view` (S)

### Role 19 — Division Police Intelligence Officer

- **Code:** `DIVISION_INTEL_OFFICER` · **Tier:** 2 · **Category:** FUNCTIONAL
- **Back office:** Division Police Intelligence Officer Dashboard
- **Organisational context:** Assigned Provincial Division or Unit/Formation only — assignable at: provincial division, formation
- **Purpose:** Division-level intelligence liaison administration, restricted to the assigned Province or Unit/Formation; no cross-divisional access. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.
- **Workspace purpose line:** Division-level intelligence liaison administration within your Province or Unit/Formation. Metadata only; no cross-divisional access.
- **Navigation:** Overview (`/app`, `/app/tasks`) · Liaison administration (`/app/liaison/assigned`, `/app/liaison`, `/app/liaison/submissions`, `/app/liaison/incoming`, `/app/liaison/acknowledgements`, `/app/liaison/history`) · Account (`/app/notifications`, `/app/profile`)
- **Headline figures:** `liaisonAssigned`, `liaisonIncoming`, `liaisonToAcknowledge`, `liaisonAwaiting`, `liaisonReports`, `unread`
- **Quick actions:** Record a liaison reference, Receiving and review queue, Outstanding acknowledgements, Liaison history
- **Working panels:** dashboard kind `LIAISON`
- **Permissions (7):** `liaison.metadata.view` (S), `liaison.metadata.create` (S), `liaison.metadata.update_own` (S), `liaison.submission.acknowledge` (S), `liaison.reference.route` (S), `liaison.status.view` (S), `liaison.audit.view` (S)

