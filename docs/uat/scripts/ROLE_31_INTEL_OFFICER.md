# UAT Script — Role 31: Police Intelligence Officer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 4 |
| Back office | Police Intelligence Officer Dashboard |
| Organisational context | Assigned Section or Police Station only |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.kitwec.pio` (Kitwe Central Police Station (synthetic)); `demo.mu.section.pio` (1 Section, 1 Platoon (synthetic)) |

**Purpose:** Local intelligence liaison administration for your Section or Police Station only. Metadata only.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwec.pio` with the published development password. | Dashboard titled “Police Intelligence Officer Dashboard”; heading shows Tier 4 · Role 31. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Liaison administration (Assigned references, Liaison register, Submission status, Acknowledgements); Account (Notifications, My profile). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Assigned references, Awaiting receipt, To acknowledge, Awaiting acknowledgement elsewhere, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Record a liaison reference, Outstanding acknowledgements — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Use each page in your navigation once. | Each page opens and shows only your own work. | ☐ Pass ☐ Fail | |
| 6 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 7 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 8 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 9 | Open Help (?) in the top bar. | “Your workspace: Police Intelligence Officer Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 10 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
