# Demonstration data catalogue

Every record below is created by the seed steps (`src/server/db/seed*.ts`) in development databases only — mostly through the domain functions, so it carries the same validation, authority and audit as user input. Names are "Demo …" or "(synthetic)"; service numbers are `SYN-`; references are generated; nothing is real.

| Area | Seed step | Content |
|---|---|---|
| Organisation | 001, 016 | Service HQ; ten Provincial Divisions and the named formations (**established**); synthetic Districts, Stations, Posts; Kamfinsa Mobile Unit's five Companies and six Detachments with duty stations (**established**); two labelled synthetic training detachments with a platoon and sections |
| Accounts and roles | 001–003, 013, 014, 016, 019 | 71 synthetic accounts covering all 31 roles, appointment-only Sergeant and Constable, executive appointees for DIG Administration and DIG Special Duties / State House |
| Personnel | 002, 016 | 300 synthetic officers across units, with history, verification and disposition; 36 in the established Detachments |
| Manpower, rosters, assignments, transfers | 002 | Requests in every state, contributions, roster versions, duty-area assignments (including mine-operations duty areas), transfers, renewals |
| Administrative requests, fleet, assets, stores | 001, 003 | Requests in every workflow state, vehicles and maintenance, general assets, store items and requisitions |
| Calendar and correspondence | 012 | Administrative events and correspondence with screened PDF documents |
| Liaison metadata | 013 | Metadata-only liaison references routed between levels |
| Command structure and traffic | 014, 016–018 | National, Mobile Unit, Company/Detachment and District offices; relationships including the Area Commander's two channels and Company Commander → Staff II → Staff I → Divisional Commander; directives IG → DIG Operations → Commissioner → Mobile Unit; an Area Commander report to three recipients |
| Training | 019 | Lilayi Police Training College, SPOM / Mobile Unit and an external provider; three courses; a completed SPOM session (3 completed with certificates, 1 not completed), an open SPOM session (approved, recommended and new nominations), a planned Lilayi session; needs from Copperbelt, Lusaka and the Mobile Unit in different states |
| Operations administration | 019 | A completed and reviewed public-order record (Lusaka) and an active illegal-mining joint operation (Copperbelt with the Mobile Unit) with progress and a resource request |
| Mining security services | 019 | Two synthetic mining partners; agreements on the Kitwe and Mufulira mine-operations duty areas; a partial-service report with open follow-up |
| Coordination | 019 | DIG Operations → DIG Special Duties personnel-support request (acknowledged); DIG Administration → DIG Operations training-support request (submitted) |
| Audit | all | Hash-chained audit events for every seeded action (`npm run verify:audit`) |
