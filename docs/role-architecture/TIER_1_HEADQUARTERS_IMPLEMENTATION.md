# Tier 1 Implementation — National Headquarters

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

Six roles held at Service Headquarters. NATIONAL coverage applies only to assignments at HQ. Superadmin and HQ Tech are TECHNICAL (no personnel records, no approvals); the Inspector General sees national summaries and audit evidence, not individual records; DIG Operations, the Commissioner and the Deputy Commissioner work the national Operations processes and decide only within delegations.

Status, tests and evidence per role: `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and `docs/role-architecture/ROLE_TEST_RESULTS.md`.

### Role 01 — Superadmin

- **Code:** `SUPERADMIN` · **Tier:** 1 · **Category:** TECHNICAL
- **Back office:** ZPS-OMS Superadmin Dashboard
- **Organisational context:** National Headquarters (platform-wide) — assignable at: service hq
- **Purpose:** Overall technical platform administration and national tenant configuration. No access to personnel records, sensitive operational information or business approval authority.
- **Workspace purpose line:** Platform configuration, tenants, organisation structure and access administration. No personnel records or business approvals.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Platform (`/app/platform`, `/app/org/tenants`, `/app/workflows`) · Organisation (`/app/org`, `/app/org/changes`) · Access (`/app/admin/users`, `/app/admin/roles`, `/app/admin/reviews`, `/app/security`) · Public site (`/app/messages`)
- **Headline figures:** `tenants`, `divisions`, `orgUnits`, `usersActive`, `jobFailures`, `orgChangesPending`
- **Quick actions:** Account support, Tenants, Propose structure change, System health, Security events
- **Working panels:** dashboard kind `PLATFORM`
- **Permissions (22):** `org.view` (N), `org.propose` (N), `tenant.view` (N), `tenant.manage` (N), `user.view` (N), `user.provision` (N), `user.suspend` (N), `user.deactivate` (N), `grant.assign` (N), `grant.revoke` (N), `delegation.grant` (N), `delegation.revoke` (N), `accessreview.manage` (N), `user.support` (N), `security.view` (N), `platform.view` (N), `platform.configure` (N), `platform.operate` (N), `health.view` (N), `workflow.view` (U), `contact.view` (N), `contact.manage` (N)

### Role 02 — Inspector General of Police (IG)

- **Code:** `INSPECTOR_GENERAL` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Inspector General Executive Dashboard
- **Organisational context:** National Headquarters — assignable at: service hq
- **Purpose:** National executive oversight of authorised ZPS-OMS management information. Consolidated summaries, not individual personnel records; decisions only where a delegation is configured.
- **Workspace purpose line:** National executive summaries of authorised management information, with audit oversight.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · National summaries (`/app/manpower`, `/app/reports`) · Organisation (`/app/org`, `/app/org/changes`) · Oversight (`/app/audit`, `/app/audit/history`, `/app/workflows`)
- **Headline figures:** `divisions`, `orgUnits`, `nationalPersonnel`, `nationalAssignments`, `openManpower`, `pendingDecisions`
- **Quick actions:** Open reports, Review approvals, Audit explorer
- **Working panels:** dashboard kind `NATIONAL_EXECUTIVE`
- **Permissions (8):** `dashboard.national.view` (N), `org.view` (N), `report.view` (N), `report.export` (N), `audit.view` (N), `audit.export` (N), `workflow.view` (U), `manpower.view` (N)

### Role 03 — Deputy Inspector General of Police - Operations (DIG Operations)

- **Code:** `DIG_OPERATIONS` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** DIG Operations National Executive Dashboard
- **Organisational context:** Office of the DIG Operations, National Headquarters — assignable at: service hq
- **Purpose:** National Operations administration, coordination and oversight; approves within configured delegations. No platform technical configuration.
- **Workspace purpose line:** National Operations administration, coordination and oversight; decisions within configured delegations.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/fleet`, `/app/assets`, `/app/stores`) · Reports (`/app/reports`) · Organisation (`/app/org`, `/app/org/changes`) · Oversight (`/app/audit`, `/app/audit/history`, `/app/workflows`)
- **Headline figures:** `divisions`, `personnel`, `activeAssignments`, `openManpower`, `reviewsDue`, `pendingDecisions`
- **Quick actions:** Review approvals, Open reports, Transfers, Audit explorer
- **Working panels:** dashboard kind `NATIONAL_EXECUTIVE`
- **Permissions (17):** `dashboard.national.view` (N), `org.view` (N), `request.view` (U), `fleet.view` (N), `asset.view` (N), `report.view` (N), `report.export` (N), `audit.view` (N), `workflow.view` (U), `personnel.view` (N), `manpower.view` (N), `roster.view` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N), `stores.view` (N)

### Role 04 — Commissioner – Operations HQ

- **Code:** `COMMISSIONER_OPS_HQ` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Commissioner Operations Headquarters Dashboard
- **Organisational context:** Operations Headquarters — assignable at: service hq
- **Purpose:** Senior administration and coordination of Operations Headquarters business processes. Approval authority only through configured delegations.
- **Workspace purpose line:** Senior coordination of Operations Headquarters business processes.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Administration (`/app/requests`, `/app/fleet`, `/app/fleet/maintenance`, `/app/assets`, `/app/stores`, `/app/stores/requisitions`) · Reports (`/app/reports`) · Organisation (`/app/org`, `/app/org/changes`) · Configuration (`/app/workflows`, `/app/messages`)
- **Headline figures:** `divisions`, `personnel`, `activeAssignments`, `openManpower`, `contributionsToReview`, `pendingDecisions`
- **Quick actions:** New manpower request, Review approvals, New administrative request, Open reports
- **Working panels:** dashboard kind `NATIONAL_COORDINATION`
- **Permissions (37):** `dashboard.national.view` (N), `org.view` (N), `request.view` (N), `request.create` (U), `request.edit` (U), `request.submit` (U), `request.assign` (N), `request.cancel` (U), `request.progress` (U), `request.close` (N), `fleet.view` (N), `maintenance.view` (N), `asset.view` (N), `report.view` (N), `report.export` (N), `workflow.view` (U), `workflow.configure` (N), `personnel.view` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `area.manage` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N), `assignment.receive` (N), `disposition.change` (N), `stores.view` (N), `contact.view` (N), `contact.manage` (N)

### Role 05 — Deputy Commissioner – Operations HQ

- **Code:** `DEPUTY_COMMISSIONER_OPS_HQ` · **Tier:** 1 · **Category:** BUSINESS
- **Back office:** Deputy Commissioner Operations HQ Dashboard
- **Organisational context:** Operations Headquarters — assignable at: service hq
- **Purpose:** Day-to-day administrative coordination and processing within Operations Headquarters; recommends or approves only where delegated.
- **Workspace purpose line:** Day-to-day coordination and processing within Operations Headquarters.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Personnel and manpower (`/app/personnel`, `/app/manpower`, `/app/manpower/contributions`, `/app/rosters`, `/app/assignments`, `/app/transfers`, `/app/areas`) · Reports (`/app/reports`) · Organisation (`/app/org`, `/app/org/changes`)
- **Headline figures:** `openManpower`, `contributionsToReview`, `rostersApproved`, `personnel`, `unverified`, `pendingDecisions`
- **Quick actions:** New manpower request, Register personnel, Review approvals, Open reports
- **Working panels:** dashboard kind `OPS_STAFF_WORKSPACE`
- **Permissions (21):** `dashboard.national.view` (N), `org.view` (N), `report.view` (N), `report.export` (N), `personnel.view` (N), `personnel.register` (N), `personnel.edit` (N), `personnel.verify` (N), `personnel.export` (N), `manpower.view` (N), `manpower.create` (U), `manpower.review` (N), `roster.view` (N), `roster.build` (N), `roster.review` (N), `roster.export` (N), `area.view` (N), `assignment.view` (N), `assignment.propose` (N), `assignment.transfer` (N), `assignment.renew` (N)

### Role 06 — System Administrator – HQ Tech

- **Code:** `HQ_TECH_ADMIN` · **Tier:** 1 · **Category:** TECHNICAL
- **Back office:** Headquarters Technical Administration Dashboard
- **Organisational context:** National Headquarters (technical) — assignable at: service hq
- **Purpose:** Institutionally scoped technical administration at Headquarters: health, database, jobs, backups, authentication monitoring and account support. No personnel access, approvals or tenant provisioning.
- **Workspace purpose line:** Headquarters technical administration: health, jobs, authentication monitoring and account support.
- **Navigation:** Overview (`/app`, `/app/tasks`, `/app/approvals`) · Technical operations (`/app/platform`, `/app/security`) · Accounts and access (`/app/admin/users`, `/app/admin/roles`, `/app/admin/reviews`) · Organisation (`/app/org`)
- **Headline figures:** `usersActive`, `sessions`, `locked`, `failedLogins24h`, `denied24h`, `jobFailures`
- **Quick actions:** Account support, Security events, System health
- **Working panels:** dashboard kind `SECURITY`
- **Permissions (11):** `org.view` (N), `user.view` (N), `user.suspend` (N), `grant.revoke` (N), `delegation.revoke` (N), `accessreview.manage` (N), `user.support` (N), `security.view` (N), `platform.view` (N), `platform.operate` (N), `health.view` (N)

