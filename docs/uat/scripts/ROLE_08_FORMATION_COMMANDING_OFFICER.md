# UAT Script — Role 08: Formation Commanding Officer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Formation Command Headquarters |
| Organisational context | Provincial Division or Unit/Formation (commanding officer) |
| Category | BUSINESS |
| Synthetic account(s) | `demo.cb.commander` (Copperbelt Division); `demo.cen.commander` (Central Division); `demo.lsk.commander` (Lusaka Division); `demo.mu.commander` (Mobile Unit Division / SPOM, Kamfinsa) |

**Purpose:** Command oversight of your Division or Formation and everything under it.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.commander` with the published development password. | Dashboard titled “Formation Command Headquarters”; heading shows Tier 2 · Role 08. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Administrative requests, Fleet register, Fleet maintenance, General assets, Stores and stock, Stores requisitions); Reports (Reports); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Organisation units / Units in my command, Personnel records, Active assignments, Contributions due, Stores requisitions pending, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Open reports, Stores and stock — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open a submitted requisition from a unit under you and approve or reject it. | Decision recorded only if you hold a STORES delegation; otherwise refused. | ☐ Pass ☐ Fail | |
| 6 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 7 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 8 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 9 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 10 | Open Help (?) in the top bar. | “Your workspace: Formation Command Headquarters”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 11 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
