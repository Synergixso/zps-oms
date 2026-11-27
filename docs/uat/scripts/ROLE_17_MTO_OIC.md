# UAT Script — Role 17: Divisional MTO Officer-in-Charge

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Divisional Motor Transport Administration |
| Organisational context | Provincial Division or Unit/Formation transport |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.fleet.officer` (Mobile Unit Division / SPOM, Kamfinsa); `demo.fleet.officer` (Lusaka Division); `demo.fleet.verifier` (Lusaka Division) |

**Purpose:** Divisional motor transport administration: vehicle register, documentation, maintenance and service history.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.fleet.officer` with the published development password. | Dashboard titled “Divisional Motor Transport Administration”; heading shows Tier 2 · Role 17. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Motor transport (Fleet register, Fleet maintenance); Reports (Reports); Administrative records (Administrative calendar). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Vehicles, Open maintenance, Services due (14 days), Pending approvals, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Vehicle register, Maintenance requests, Open reports — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open the Administrative calendar. | Events, review dates and deadlines for your scope only; no option to schedule. | ☐ Pass ☐ Fail | |
| 6 | Validate a maintenance request and record its progress. | Status advances; verification must be done by a different officer. | ☐ Pass ☐ Fail | |
| 7 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 8 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 9 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 10 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 11 | Open Help (?) in the top bar. | “Your workspace: Divisional Motor Transport Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 12 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
