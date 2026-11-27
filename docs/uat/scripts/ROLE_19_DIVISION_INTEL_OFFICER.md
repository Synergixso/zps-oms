# UAT Script — Role 19: Division Police Intelligence Officer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Division Police Intelligence Officer Dashboard |
| Organisational context | Assigned Provincial Division or Unit/Formation only |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.cb.pio` (Copperbelt Division) |

**Purpose:** Division-level intelligence liaison administration within your Province or Unit/Formation. Metadata only; no cross-divisional access.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.pio` with the published development password. | Dashboard titled “Division Police Intelligence Officer Dashboard”; heading shows Tier 2 · Role 19. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Liaison administration (Assigned references, Liaison register, Submission status, Receiving and review queue, Acknowledgements, Liaison history); Account (Notifications, My profile). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Assigned references, Awaiting receipt, To acknowledge, Awaiting acknowledgement elsewhere, Report references, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Record a liaison reference, Receiving and review queue, Outstanding acknowledgements, Liaison history — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Use each page in your navigation once. | Each page opens and shows only your own work. | ☐ Pass ☐ Fail | |
| 6 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 7 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 8 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 9 | Open Help (?) in the top bar. | “Your workspace: Division Police Intelligence Officer Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 10 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
