# UAT Script — Role 16: Divisional Principal Armourer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Divisional Armourer Administration |
| Organisational context | Provincial Division or Unit/Formation |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.cen.staff` (Central Division) |

**Purpose:** Approved non-sensitive administrative functions only. No firearms, ammunition or armoury records exist in ZPS-OMS.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cen.staff` with the published development password. | Dashboard titled “Divisional Armourer Administration”; heading shows Tier 2 · Role 16. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Administration (Administrative requests) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: My open requests, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New administrative request — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Create and submit an administrative request. | Request submitted; you cannot approve your own request. | ☐ Pass ☐ Fail | |
| 6 | Look for any firearm, ammunition or armoury function. | None exists; entering such terms in free text is refused. | ☐ Pass ☐ Fail | |
| 7 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 8 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 9 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 10 | Open Help (?) in the top bar. | “Your workspace: Divisional Armourer Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 11 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
