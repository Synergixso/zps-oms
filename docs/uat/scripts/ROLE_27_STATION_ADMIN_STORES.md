# UAT Script — Role 27: Police Station Administrator (Stores and Admin)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | Police Station Stores and Administration |
| Organisational context | Police Station |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.kitwec.stores` (Kitwe Central Police Station (synthetic)) |

**Purpose:** Station administrative records, general stores and non-sensitive assets.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwec.stores` with the published development password. | Dashboard titled “Police Station Stores and Administration”; heading shows Tier 3 · Role 27. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Stores and assets (Stores and stock, Stores requisitions, General assets); Administration (Administrative requests); Reports (Reports) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Store items, Reorder needed, My open requisitions, General assets, My open requests, My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New stores requisition, Stores and stock, New administrative request — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Create and submit an administrative request. | Request submitted; you cannot approve your own request. | ☐ Pass ☐ Fail | |
| 6 | Record a receipt, then try to issue more than the balance. | Receipt updates the balance and ledger; the over-issue is refused. | ☐ Pass ☐ Fail | |
| 7 | Raise a stores requisition from your own or a higher store and submit it. | Requisition submitted; you cannot approve or issue it. | ☐ Pass ☐ Fail | |
| 8 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 9 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 10 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 11 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 12 | Open Help (?) in the top bar. | “Your workspace: Police Station Stores and Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 13 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
