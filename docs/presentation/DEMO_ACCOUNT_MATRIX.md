# Demonstration account matrix

All accounts are **synthetic** (`demo.*`, "Demo" names) and exist only in local development databases. The development password is shown on the local sign-in page of a development build and defined in `src/server/db/constants.ts`; it is **not** written here and must never be used outside the local demonstration environment. Production builds hide the account list and refuse synthetic data.

| # | Profile (directive §10.2) | Username | Application role | Command office (appointment) | Lands on |
|---|---|---|---|---|---|
| 1 | Inspector General | `demo.hq.readonly` | 02 Inspector General | Inspector General of Police | National command overview + IG portfolio oversight |
| 2 | DIG Administration | `demo.dig.admin` | — (executive appointment, DEC-088) | Deputy Inspector General – Administration | Administration portfolio: training, workforce strength, coordination |
| 3 | DIG Operations | `demo.dig.exec` | 03 DIG Operations | DIG Operations | Operations Command Dashboard + operations administration |
| 4 | DIG Special Duties / State House | `demo.dig.specialduties` | — (executive appointment) | Deputy Inspector General – Special Duties / State House | Coordination portfolio |
| 5 | Commissioner – Operations HQ | `demo.hq.coord` | 04 | Commissioner – Operations HQ | Operations HQ dashboard |
| 6 | Deputy Commissioner – Operations HQ | `demo.hq.staff` | 05 | Deputy Commissioner – Operations HQ | Operations HQ staff workspace |
| 7 | Divisional Commander | `demo.cb.commander` (Copperbelt), `demo.mu.commander` (Mobile Unit) | 09 | Divisional Commander | Division / formation dashboard |
| 8 | Deputy Divisional Commander | `demo.cb.approver`, `demo.mu.deputy` | 10 | Deputy Division Commander | Approvals; acts only under acting appointment |
| 9 | Senior Operations Officer – Staff I / Staff II | `demo.cb.staffops`, `demo.mu.staff1` / `demo.cb.assignments`, `demo.mu.staff2` | 11 / 12 | Staff I / Staff II | Staff workspace |
| 10 | Company Commander | `demo.mu.hqcoy.commander` | 13 | Company Commander, HQ Company | Company / detachment command |
| 11 | Deputy Company Commander | `demo.mu.hqcoy.deputy` | 13 | Deputy Company Commander, HQ Company | Company command (acting only when appointed) |
| 12 | Detachment Commander | `demo.mu.hq5.commander` (Kitwe), `demo.mu.d3.commander` (Mufulira) | 14 | Detachment Commander | Company / detachment command |
| 13 | Area Commander | `demo.mu.acoy.commander` | 13 (account role; the office has no mapped role, #4) | Area Commander, A Company area (Kitwe) | Area command |
| 14 | Platoon Commander | `demo.mu.plt.commander` | 14 | Platoon Commander (Section/Platoon Commander), 1 Platoon | Platoon command |
| 15 | Chief Inspector | `demo.mu.plt.commander` | — | The Platoon Commander office is the Chief Inspector appointment (rank ≠ appointment) | as above |
| 16 | Inspector | `demo.mu.sec.commander` | 14 | Inspector, 1 Section | Command and reporting |
| 17 | Sergeant | `demo.mu.sergeant` | — (appointment-only, DEC-076) | Sergeant, 1 Section | Own command work only |
| 18 | Police Officer / Constable | `demo.mu.constable` | — (appointment-only) | Police Officer / Constable, 1 Section | Own command work only |
| 19a | District command | `demo.kitwe.commander`, `demo.kitwe.ops` | 21 / 23 | OC / Operations Officer, Kitwe District | District dashboard; Area Commander parallel recipients |
| 19b | Station | `demo.kitwec.commander`, `demo.kitwec.stores` | 27 / 29 | OIC / Station Administrator | Station dashboard |
| 19c | Personnel registry | `demo.cb.personnel` | 12 | — | Personnel; controlled import |
| 19d | Fleet / stores | `demo.fleet.officer`, `demo.asset.custodian` | 18 / 16 | — | Fleet; stores |
| 19e | Technical administration | `demo.platform.admin`, `demo.security.admin` | 01 / 06 | — (technical roles hold no office) | Platform / security consoles |
| 19f | Police Intelligence Officer (liaison) | `demo.hq.pio` | 07 | — | Metadata-only liaison workspace |
