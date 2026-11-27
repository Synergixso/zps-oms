# Role Catalogue — 31-Role Configuration (four role-scope levels)

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

This is the only active role configuration (DEC-049). Roles are not added, removed or renamed without project-owner approval.

| No. | Tier | Role | Code | Category | Back office | Assignable at |
|--:|:-:|---|---|---|---|---|
| 01 | 1 | Superadmin | `SUPERADMIN` | TECHNICAL | ZPS-OMS Superadmin Dashboard | service hq |
| 02 | 1 | Inspector General of Police (IG) | `INSPECTOR_GENERAL` | BUSINESS | Inspector General Executive Dashboard | service hq |
| 03 | 1 | Deputy Inspector General of Police - Operations (DIG Operations) | `DIG_OPERATIONS` | BUSINESS | DIG Operations National Executive Dashboard | service hq |
| 04 | 1 | Commissioner – Operations HQ | `COMMISSIONER_OPS_HQ` | BUSINESS | Commissioner Operations Headquarters Dashboard | service hq |
| 05 | 1 | Deputy Commissioner – Operations HQ | `DEPUTY_COMMISSIONER_OPS_HQ` | BUSINESS | Deputy Commissioner Operations HQ Dashboard | service hq |
| 06 | 1 | System Administrator – HQ Tech | `HQ_TECH_ADMIN` | TECHNICAL | Headquarters Technical Administration Dashboard | service hq |
| 07 | 1 | National Police Intelligence Officer | `NATIONAL_INTEL_OFFICER` | FUNCTIONAL | National Police Intelligence Officer Dashboard | service hq |
| 08 | 2 | Divisional/Unit System Administrator (Tech) | `UNIT_TECH_ADMIN` | TECHNICAL | Division and Unit Technical Administration | provincial division, formation |
| 09 | 2 | Formation Commanding Officer | `FORMATION_COMMANDING_OFFICER` | BUSINESS | Formation Command Headquarters | provincial division, formation |
| 10 | 2 | Deputy Division Commander | `DEPUTY_DIVISION_COMMANDER` | BUSINESS | Deputy Division Commander Dashboard | provincial division, formation |
| 11 | 2 | Division Senior Staff Officer – Operations (Staff I) | `DIVISION_STAFF_I` | BUSINESS | Division Senior Staff Officer – Operations | provincial division, formation |
| 12 | 2 | Deputy Division Staff Officer – Operations (Staff II) | `DIVISION_STAFF_II` | BUSINESS | Deputy Division Staff Officer – Operations | provincial division, formation |
| 13 | 2 | Company Commander | `COMPANY_COMMANDER` | BUSINESS | Company Command Administration | company |
| 14 | 2 | Section Head | `SECTION_HEAD` | BUSINESS | Section Administration Dashboard | section, platoon, detachment, department |
| 15 | 2 | Formation Operations Staff Administrator | `FORMATION_OPS_STAFF_ADMIN` | BUSINESS | Formation Operations Staff Administration | formation |
| 16 | 2 | Divisional Quarter Masters Stores Officer | `QM_STORES_OFFICER` | FUNCTIONAL | Divisional Quarter Masters and Stores Administration | provincial division, formation |
| 17 | 2 | Divisional Principal Armourer | `PRINCIPAL_ARMOURER` | FUNCTIONAL | Divisional Armourer Administration | provincial division, formation |
| 18 | 2 | Divisional MTO Officer-in-Charge | `MTO_OIC` | FUNCTIONAL | Divisional Motor Transport Administration | provincial division, formation |
| 19 | 2 | Division Police Intelligence Officer | `DIVISION_INTEL_OFFICER` | FUNCTIONAL | Division Police Intelligence Officer Dashboard | provincial division, formation |
| 20 | 3 | District System Administrator (Tech) | `DISTRICT_TECH_ADMIN` | TECHNICAL | District Technical Administration | district |
| 21 | 3 | Officer Commanding — District | `OC_DISTRICT` | BUSINESS | District Command Dashboard | district |
| 22 | 3 | Deputy OC — District | `DEPUTY_OC_DISTRICT` | BUSINESS | Deputy District Commander Dashboard | district |
| 23 | 3 | Operations Officer — District | `OPS_OFFICER_DISTRICT` | BUSINESS | District Operations Officer Workspace | district |
| 24 | 3 | Deputy Operations Officer — District | `DEPUTY_OPS_OFFICER_DISTRICT` | BUSINESS | Deputy District Operations Workspace | district |
| 25 | 3 | Stores Officer — District | `STORES_OFFICER_DISTRICT` | FUNCTIONAL | District Stores Administration | district |
| 26 | 3 | Police Station System Administrator | `STATION_TECH_ADMIN` | TECHNICAL | Police Station Technical Administration | station, post |
| 27 | 3 | Officer-in-Charge — Police Station GD | `OIC_STATION_GD` | BUSINESS | Police Station General Duties Administration | station, post |
| 28 | 3 | Station Inspector — Police Station GD | `STATION_INSPECTOR_GD` | BUSINESS | Station Inspector Operations Administration | station, post |
| 29 | 3 | Police Station Administrator (Stores and Admin) | `STATION_ADMIN_STORES` | FUNCTIONAL | Police Station Stores and Administration | station, post |
| 30 | 3 | District Police Intelligence Officer | `DISTRICT_INTEL_OFFICER` | FUNCTIONAL | District Police Intelligence Officer Dashboard | district |
| 31 | 4 | Police Intelligence Officer | `INTEL_OFFICER` | FUNCTIONAL | Police Intelligence Officer Dashboard | section, station |

## Role descriptions

### Tier 1 — National Headquarters

- **01 Superadmin** — Overall technical platform administration and national tenant configuration. No access to personnel records, sensitive operational information or business approval authority.
- **02 Inspector General of Police (IG)** — National executive oversight of authorised ZPS-OMS management information. Consolidated summaries, not individual personnel records; decisions only where a delegation is configured.
- **03 Deputy Inspector General of Police - Operations (DIG Operations)** — National Operations administration, coordination and oversight; approves within configured delegations. No platform technical configuration.
- **04 Commissioner – Operations HQ** — Senior administration and coordination of Operations Headquarters business processes. Approval authority only through configured delegations.
- **05 Deputy Commissioner – Operations HQ** — Day-to-day administrative coordination and processing within Operations Headquarters; recommends or approves only where delegated.
- **06 System Administrator – HQ Tech** — Institutionally scoped technical administration at Headquarters: health, database, jobs, backups, authentication monitoring and account support. No personnel access, approvals or tenant provisioning.
- **07 National Police Intelligence Officer** — Authorised national-level intelligence liaison administration within the permitted ZPS-OMS information boundary. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.

### Tier 2 — Provincial Divisions and Unit Formations

- **08 Divisional/Unit System Administrator (Tech)** — Technical accounts and access support within the assigned Division or Formation; refers higher-level issues to HQ Tech. No personnel, assignment or approval authority.
- **09 Formation Commanding Officer** — Oversight of the assigned Division or Formation and everything under it. Approves only within configured delegations; no access to unrelated formations or Provinces.
- **10 Deputy Division Commander** — Supports the commanding officer: monitors performance, reviews outstanding matters and Staff I/II workflows; approves only where separately delegated.
- **11 Division Senior Staff Officer – Operations (Staff I)** — Coordinates Divisional Operations administration: manpower requirements, contributions, rosters, assignments, transfers, tenure and renewals; supervises Staff II. No approval outside delegations.
- **12 Deputy Division Staff Officer – Operations (Staff II)** — Assists Staff I: prepares personnel information, compiles draft lists, verifies submissions, prepares transfer and renewal documentation. No Staff I approval authority.
- **13 Company Commander** — Company administration: personnel register, contributions and submissions for the company and its platoons and sections. No access to other companies.
- **14 Section Head** — Section administrative records: selects personnel from the registry, prepares and verifies manpower contributions, tracks requests.
- **15 Formation Operations Staff Administrator** — Formation-level Operations administration: contributions, rosters, assignment documentation and subordinate submissions. No commanding-officer approval authority.
- **16 Divisional Quarter Masters Stores Officer** — General stores and non-sensitive assets: receipts, issue and return, requisitions, custody and reconciliation. Firearms, ammunition and sensitive equipment are excluded.
- **17 Divisional Principal Armourer** — Role-specific workspace for explicitly approved NON-SENSITIVE administrative functions only (administrative requests, tasks, notifications). No firearms, ammunition or armoury records exist in ZPS-OMS.
- **18 Divisional MTO Officer-in-Charge** — General fleet administration: vehicle register, documentation, maintenance, workshop referrals and service history. No GPS, movement or deployment information.
- **19 Division Police Intelligence Officer** — Division-level intelligence liaison administration, restricted to the assigned Province or Unit/Formation; no cross-divisional access. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.

### Tier 3 — District Commands and Police Stations

- **20 District System Administrator (Tech)** — Permitted technical functions and account support within the assigned District. No personnel-record or assignment access.
- **21 Officer Commanding — District** — District oversight: stations and posts, personnel, contributions, assignments and stores. Approves only within configured delegations; no access to other Districts.
- **22 Deputy OC — District** — Assists the District Commander; reviews subordinate submissions and processes delegated matters. Does not inherit the OC's approvals.
- **23 Operations Officer — District** — District Operations administration: manpower requests, station contributions, district lists, assignment records and reviews. No tactical deployment, patrol scheduling or tracking.
- **24 Deputy Operations Officer — District** — Assists the Operations Officer: prepares submissions, verifies contributions, maintains workflow records. No Operations Officer approval authority.
- **25 Stores Officer — District** — General stores records, requisitions, receipts and issues, and non-sensitive asset custody for the District. Sensitive equipment is excluded.
- **26 Police Station System Administrator** — Permitted technical functions and local account support for the assigned Station. No personnel management or assignment decisions.
- **27 Officer-in-Charge — Police Station GD** — Station-level general duties administrative oversight: personnel, contributions, submissions; approves specifically delegated matters.
- **28 Station Inspector — Police Station GD** — Supports Station administration: personnel register, contributions and submissions; delegated supervisory functions only. Does not inherit OIC approvals.
- **29 Police Station Administrator (Stores and Admin)** — Station administrative records, general stores and non-sensitive assets: issue and return, requisitions, reconciliation. No sensitive equipment, firearms or ammunition.
- **30 District Police Intelligence Officer** — District-level restricted intelligence liaison administration for the assigned District; no other District, Province or national records. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.

### Tier 4 — Section / Police Station

- **31 Police Intelligence Officer** — Restricted local intelligence liaison administration for the assigned Section or Police Station only (one role profile; scope follows the assignment). No access to the parent District or Division. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.

