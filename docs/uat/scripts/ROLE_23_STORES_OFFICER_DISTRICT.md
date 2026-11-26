# UAT Script — Role 23: Stores Officer — District

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | District Stores Administration |
| Organisational context | District Command stores |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.kitwe.stores` (Kitwe District Command (synthetic)) |

**Purpose:** District general stores: stock, receipts and issues, requisitions and non-sensitive custody.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwe.stores` with the published development password. | Dashboard titled “District Stores Administration”; heading shows Tier 3 · Role 23. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Stores (Stores and stock, Stores requisitions); Assets (General assets); Reports (Reports) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Store items, Reorder needed, Requisitions to issue, Stores requisitions pending, General assets, My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Stores and stock, Requisitions to issue — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Record a receipt, then try to issue more than the balance. | Receipt updates the balance and ledger; the over-issue is refused. | ☐ Pass ☐ Fail | |
| 6 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 7 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 8 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 9 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 10 | Open Help (?) in the top bar. | “Your workspace: District Stores Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 11 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
