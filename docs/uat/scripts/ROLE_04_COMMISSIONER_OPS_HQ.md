# UAT Script — Role 04: Commissioner – Operations HQ

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | Commissioner Operations Headquarters Dashboard |
| Organisational context | Operations Headquarters |
| Category | BUSINESS |
| Synthetic account(s) | `demo.hq.assignments` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)); `demo.hq.coord` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** Senior coordination of Operations Headquarters business processes.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.hq.assignments` with the published development password. | Dashboard titled “Commissioner Operations Headquarters Dashboard”; heading shows Tier 1 · Role 04. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Administrative requests, Fleet register, Fleet maintenance, General assets, Stores and stock, Stores requisitions); Reports (Reports); Organisation (Organisation directory, Structure changes); Configuration (Workflow definitions, Contact messages) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Provincial Divisions, Personnel records, Active assignments, Open manpower requests, Contributions to review, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New manpower request, Review approvals, New administrative request, Open reports — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Raise a manpower request and submit it. | Request is submitted and appears in the approver's queue; you cannot approve it. | ☐ Pass ☐ Fail | |
| 6 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 7 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 8 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 9 | Create and submit an administrative request. | Request submitted; you cannot approve your own request. | ☐ Pass ☐ Fail | |
| 10 | Workflow definitions: review approval chains (do not publish unless instructed). | Versions and levels shown; publishing would apply only to new matters. | ☐ Pass ☐ Fail | |
| 11 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 12 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 13 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 14 | Open Help (?) in the top bar. | “Your workspace: Commissioner Operations Headquarters Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 15 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
