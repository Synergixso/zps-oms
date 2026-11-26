# UAT Script — Role 09: Deputy Division Commander

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Deputy Division Commander Dashboard |
| Organisational context | Provincial Division or Unit/Formation (deputy) |
| Category | BUSINESS |
| Synthetic account(s) | `demo.cb.approver` (Copperbelt Division); `demo.cb.reporting` (Copperbelt Division) |

**Purpose:** Support to the commanding officer: performance, outstanding matters and Staff I/II workflows.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.approver` with the published development password. | Dashboard titled “Deputy Division Commander Dashboard”; heading shows Tier 2 · Role 09. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Administrative requests, Stores and stock); Reports (Reports); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Organisation units / Units in my command, Personnel records, Active assignments, Open manpower requests, Reviews due, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Open reports, Transfers — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 6 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 7 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 8 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 9 | Open Help (?) in the top bar. | “Your workspace: Deputy Division Commander Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 10 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
