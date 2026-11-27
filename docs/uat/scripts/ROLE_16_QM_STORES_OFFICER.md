# UAT Script — Role 16: Divisional Quarter Masters Stores Officer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Divisional Quarter Masters and Stores Administration |
| Organisational context | Provincial Division or Unit/Formation stores |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.asset.cb` (Copperbelt Division); `demo.asset.custodian` (Lusaka Division) |

**Purpose:** Divisional general stores and non-sensitive assets: stock, requisitions, custody and reconciliation.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.asset.cb` with the published development password. | Dashboard titled “Divisional Quarter Masters and Stores Administration”; heading shows Tier 2 · Role 16. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Stores (Stores and stock, Stores requisitions); Assets (General assets); Reports (Reports); Administrative records (Administrative calendar). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Store items, Reorder needed, Requisitions to issue, General assets, Inspection overdue, Open reconciliations — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Stores and stock, Requisitions to issue, Asset reconciliation — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open the Administrative calendar. | Events, review dates and deadlines for your scope only; no option to schedule. | ☐ Pass ☐ Fail | |
| 6 | Record a receipt, then try to issue more than the balance. | Receipt updates the balance and ledger; the over-issue is refused. | ☐ Pass ☐ Fail | |
| 7 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 8 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 9 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 10 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 11 | Open Help (?) in the top bar. | “Your workspace: Divisional Quarter Masters and Stores Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 12 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
