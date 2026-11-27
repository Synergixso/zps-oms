# UAT Script — Role 02: Inspector General of Police (IG)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | Inspector General Executive Dashboard |
| Organisational context | National Headquarters |
| Category | BUSINESS |
| Synthetic account(s) | `demo.auditor` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)); `demo.hq.readonly` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** National executive summaries of authorised management information, with audit oversight.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.auditor` with the published development password. | Dashboard titled “Inspector General Executive Dashboard”; heading shows Tier 1 · Role 02. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); National summaries (Manpower requests, Reports); Organisation (Organisation directory, Structure changes); Oversight (Audit explorer, Record history, Workflow definitions); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Provincial Divisions, Organisation units / Units in my command, Personnel (national summary) / Personnel records, Active assignments (national) / Active assignments, Open manpower requests, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Open reports, Review approvals, Audit explorer — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open the Administrative calendar. | Events, review dates and deadlines for your scope only; no option to schedule. | ☐ Pass ☐ Fail | |
| 6 | Audit explorer: run chain verification. | Chain reported intact. | ☐ Pass ☐ Fail | |
| 7 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 8 | Check the national summary figures on the dashboard. | Aggregate figures shown without links to individual records. | ☐ Pass ☐ Fail | |
| 9 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 10 | Open Help (?) in the top bar. | “Your workspace: Inspector General Executive Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 11 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
