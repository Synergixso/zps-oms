# Tier 3 Implementation — District Commands and Police Stations

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Eleven roles held at a District Command or a Police Station (station roles may also be assigned at a Police Post). Scope never extends to another District or Station. The station and district stores roles keep general consumables only. Role 30 (District Police Intelligence Officer) is a restricted liaison workspace for the assigned District.

Status, tests and evidence per role: `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and `docs/role-architecture/ROLE_TEST_RESULTS.md`.

### Role 20 — District System Administrator (Tech)

- **Code:** `DISTRICT_TECH_ADMIN` · **Tier:** 3 · **Category:** TECHNICAL
- **Back office:** District Technical Administration
- **Organisational context:** Assigned District Command only — assignable at: district
- **Purpose:** Permitted technical functions and account support within the assigned District. No personnel-record or assignment access.
- **Workspace purpose line:** Technical account support within your District.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Technical administration (`/app/admin/users`, `/app/admin/roles`) · Organisation (`/app/org`)
- **Headline figures:** `usersActive`, `locked`, `failedLogins24h`, `myTasks`
- **Quick actions:** Account support
- **Working panels:** dashboard kind `TECH_LOCAL`
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 21 — Officer Commanding — District

- **Code:** `OC_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** District Command Dashboard
- **Organisational context:** District Command — assignable at: district
- **Purpose:** District oversight: stations and posts, personnel, contributions, assignments and stores. Approves only within configured delegations; no access to other Districts.
- **Workspace purpose line:** District oversight: stations and posts, personnel, contributions, assignments and stores.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `orgUnits`, `personnel`, `activeAssignments`, `contributionsDue`, `storesAwaitingDecision`, `pendingDecisions`
- **Quick actions:** Review approvals, Stores and stock, Open reports
- **Working panels:** dashboard kind `DISTRICT_COMMAND`
- **Permissions (16):** `dashboard.district.view` (U), `org.view` (N), `asset.view` (S), `report.view` (S), `personnel.view` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 22 — Deputy OC — District

- **Code:** `DEPUTY_OC_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Deputy District Commander Dashboard
- **Organisational context:** District Command — assignable at: district
- **Purpose:** Assists the District Commander; reviews subordinate submissions and processes delegated matters. Does not inherit the OC's approvals.
- **Workspace purpose line:** Assists the District Commander; reviews subordinate submissions.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `orgUnits`, `personnel`, `activeAssignments`, `contributionsDue`, `pendingDecisions`, `myTasks`
- **Quick actions:** Review approvals, Prepare contribution
- **Working panels:** dashboard kind `DISTRICT_COMMAND`
- **Permissions (13):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 23 — Operations Officer — District

- **Code:** `OPS_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** District Operations Officer Workspace
- **Organisational context:** District Command — assignable at: district
- **Purpose:** District Operations administration: manpower requests, station contributions, district lists, assignment records and reviews. No tactical deployment, patrol scheduling or tracking.
- **Workspace purpose line:** District Operations administration: requests, station contributions, district lists and assignment records.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `openManpower`, `contributionsToReview`, `contributionsDue`, `activeAssignments`, `transfersOpen`, `pendingDecisions`
- **Quick actions:** New manpower request, Register personnel, New stores requisition
- **Working panels:** dashboard kind `DISTRICT_COMMAND`
- **Permissions (25):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.create` (U), `manpower.review` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `assignment.receive` (S), `disposition.change` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S), `correspondence.manage` (S)

### Role 24 — Deputy Operations Officer — District

- **Code:** `DEPUTY_OPS_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Deputy District Operations Workspace
- **Organisational context:** District Command — assignable at: district
- **Purpose:** Assists the Operations Officer: prepares submissions, verifies contributions, maintains workflow records. No Operations Officer approval authority.
- **Workspace purpose line:** Preparation and verification of district submissions and workflow records.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `unverified`, `contributionsDue`, `activeAssignments`, `myTasks`, `unread`
- **Quick actions:** Register personnel, Prepare contribution
- **Working panels:** dashboard kind `PERSONNEL_ADMIN`
- **Permissions (19):** `dashboard.district.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `personnel.export` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `roster.build` (S), `area.view` (S), `assignment.view` (S), `assignment.propose` (S), `assignment.transfer` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 25 — Stores Officer — District

- **Code:** `STORES_OFFICER_DISTRICT` · **Tier:** 3 · **Category:** FUNCTIONAL
- **Back office:** District Stores Administration
- **Organisational context:** District Command stores — assignable at: district
- **Purpose:** General stores records, requisitions, receipts and issues, and non-sensitive asset custody for the District. Sensitive equipment is excluded.
- **Workspace purpose line:** District general stores: stock, receipts and issues, requisitions and non-sensitive custody.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Stores (`/app/stores`, `/app/stores/requisitions`) · Assets (`/app/assets`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `storesItems`, `storesLow`, `storesToIssue`, `storesAwaitingDecision`, `assets`, `myTasks`
- **Quick actions:** Stores and stock, Requisitions to issue
- **Working panels:** dashboard kind `STORES`
- **Permissions (8):** `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `report.view` (U), `stores.view` (S), `stores.manage` (S), `schedule.view` (S)

### Role 26 — Police Station System Administrator

- **Code:** `STATION_TECH_ADMIN` · **Tier:** 3 · **Category:** TECHNICAL
- **Back office:** Police Station Technical Administration
- **Organisational context:** Assigned Police Station only — assignable at: station, post
- **Purpose:** Permitted technical functions and local account support for the assigned Station. No personnel management or assignment decisions.
- **Workspace purpose line:** Technical account support for your Police Station.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Technical administration (`/app/admin/users`, `/app/admin/roles`) · Organisation (`/app/org`)
- **Headline figures:** `usersActive`, `locked`, `failedLogins24h`, `myTasks`
- **Quick actions:** Account support
- **Working panels:** dashboard kind `TECH_LOCAL`
- **Permissions (4):** `org.view` (N), `user.view` (S), `user.support` (S), `health.view` (S)

### Role 27 — Officer-in-Charge — Police Station GD

- **Code:** `OIC_STATION_GD` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Police Station General Duties Administration
- **Organisational context:** Police Station (and its posts) — assignable at: station, post
- **Purpose:** Station-level general duties administrative oversight: personnel, contributions, submissions; approves specifically delegated matters.
- **Workspace purpose line:** Station general duties administrative oversight: personnel, contributions and submissions.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and contributions (`/app/personnel`, `/app/manpower/contributions`, `/app/manpower`, `/app/rosters`, `/app/assignments`) · Administration (`/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `available`, `activeAssignments`, `contributionsDue`, `storesAwaitingDecision`, `pendingDecisions`
- **Quick actions:** Review approvals, Prepare contribution, Stores and stock
- **Working panels:** dashboard kind `STATION`
- **Permissions (16):** `dashboard.station.view` (U), `org.view` (N), `asset.view` (S), `report.view` (S), `personnel.view` (S), `personnel.verify` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `area.view` (S), `assignment.view` (S), `stores.view` (S), `stores.approve` (S), `schedule.view` (S), `correspondence.view` (S), `correspondence.manage` (S)

### Role 28 — Station Inspector — Police Station GD

- **Code:** `STATION_INSPECTOR_GD` · **Tier:** 3 · **Category:** BUSINESS
- **Back office:** Station Inspector Operations Administration
- **Organisational context:** Police Station or Police Post — assignable at: station, post
- **Purpose:** Supports Station administration: personnel register, contributions and submissions; delegated supervisory functions only. Does not inherit OIC approvals.
- **Workspace purpose line:** Station administration support: personnel register, contributions and submissions.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and contributions (`/app/personnel`, `/app/manpower/contributions`, `/app/manpower`, `/app/rosters`, `/app/assignments`) · Reports (`/app/reports`) · Organisation (`/app/org`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `personnel`, `available`, `unverified`, `contributionsDue`, `myTasks`, `unread`
- **Quick actions:** Register personnel, Prepare contribution
- **Working panels:** dashboard kind `STATION`
- **Permissions (14):** `dashboard.station.view` (U), `org.view` (N), `report.view` (S), `personnel.view` (S), `personnel.register` (S), `personnel.edit` (S), `manpower.view` (S), `manpower.contribute` (S), `roster.view` (S), `assignment.view` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 29 — Police Station Administrator (Stores and Admin)

- **Code:** `STATION_ADMIN_STORES` · **Tier:** 3 · **Category:** FUNCTIONAL
- **Back office:** Police Station Stores and Administration
- **Organisational context:** Police Station — assignable at: station, post
- **Purpose:** Station administrative records, general stores and non-sensitive assets: issue and return, requisitions, reconciliation. No sensitive equipment, firearms or ammunition.
- **Workspace purpose line:** Station administrative records, general stores and non-sensitive assets.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Stores and assets (`/app/stores`, `/app/stores/requisitions`, `/app/assets`) · Administration (`/app/requests`) · Reports (`/app/reports`) · Administrative records (`/app/calendar`, `/app/correspondence`)
- **Headline figures:** `storesItems`, `storesLow`, `myRequisitions`, `assets`, `myRequests`, `myTasks`
- **Quick actions:** New stores requisition, Stores and stock, New administrative request
- **Working panels:** dashboard kind `STORES`
- **Permissions (17):** `request.view` (U), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.cancel` (U), `asset.view` (S), `asset.register` (S), `asset.custody` (S), `asset.inspect` (S), `report.view` (U), `stores.view` (S), `stores.manage` (S), `stores.requisition` (S), `schedule.view` (S), `schedule.manage` (S), `correspondence.view` (S), `correspondence.register` (S)

### Role 30 — District Police Intelligence Officer

- **Code:** `DISTRICT_INTEL_OFFICER` · **Tier:** 3 · **Category:** FUNCTIONAL
- **Back office:** District Police Intelligence Officer Dashboard
- **Organisational context:** Assigned District Command only — assignable at: district
- **Purpose:** District-level restricted intelligence liaison administration for the assigned District; no other District, Province or national records. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.
- **Workspace purpose line:** District-level intelligence liaison administration for your District only. Metadata only.
- **Navigation:** Overview (`/app`, `/app/tasks`) · Liaison administration (`/app/liaison/assigned`, `/app/liaison`, `/app/liaison/submissions`, `/app/liaison/acknowledgements`, `/app/liaison/history`) · Account (`/app/notifications`, `/app/profile`)
- **Headline figures:** `liaisonAssigned`, `liaisonIncoming`, `liaisonToAcknowledge`, `liaisonAwaiting`, `liaisonReports`, `unread`
- **Quick actions:** Record a liaison reference, Outstanding acknowledgements, Liaison history
- **Working panels:** dashboard kind `LIAISON`
- **Permissions (7):** `liaison.metadata.view` (S), `liaison.metadata.create` (S), `liaison.metadata.update_own` (S), `liaison.submission.acknowledge` (S), `liaison.reference.route` (S), `liaison.status.view` (S), `liaison.audit.view` (S)

