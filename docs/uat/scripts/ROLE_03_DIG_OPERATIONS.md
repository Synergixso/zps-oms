# UAT Script — Role 03: Deputy Inspector General of Police - Operations (DIG Operations)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | DIG Operations National Executive Dashboard |
| Organisational context | Office of the DIG Operations, National Headquarters |
| Category | BUSINESS |
| Synthetic account(s) | `demo.dig.exec` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** National Operations administration, coordination and oversight; decisions within configured delegations.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.dig.exec` with the published development password. | Dashboard titled “DIG Operations National Executive Dashboard”; heading shows Tier 1 · Role 03. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Administrative requests, Fleet register, General assets, Stores and stock); Reports (Reports); Organisation (Organisation directory, Structure changes); Oversight (Audit explorer, Record history, Workflow definitions) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Provincial Divisions, Personnel records, Active assignments, Open manpower requests, Reviews due, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Open reports, Transfers, Audit explorer — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Audit explorer: run chain verification. | Chain reported intact. | ☐ Pass ☐ Fail | |
| 6 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 7 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 8 | Open Help (?) in the top bar. | “Your workspace: DIG Operations National Executive Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 9 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
