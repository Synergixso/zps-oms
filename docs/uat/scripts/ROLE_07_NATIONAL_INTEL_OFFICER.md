# UAT Script — Role 07: National Police Intelligence Officer

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | National Police Intelligence Officer Dashboard |
| Organisational context | National Headquarters (intelligence liaison administration) |
| Category | FUNCTIONAL |
| Synthetic account(s) | `demo.hq.pio` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** National intelligence liaison administration: administrative references, submissions, routing and acknowledgements. Metadata only.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.hq.pio` with the published development password. | Dashboard titled “National Police Intelligence Officer Dashboard”; heading shows Tier 1 · Role 07. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Liaison administration (Assigned references, Liaison register, Submission status, Report reference tracking, Organisational routing, Acknowledgements, Receiving and review queue, Liaison history); Account (Notifications, My profile). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Assigned references, Awaiting receipt, To acknowledge, Awaiting acknowledgement elsewhere, Report references, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Record a liaison reference, Receiving and review queue, Outstanding acknowledgements, Liaison history — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Use each page in your navigation once. | Each page opens and shows only your own work. | ☐ Pass ☐ Fail | |
| 6 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 7 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 8 | Open Help (?) in the top bar. | “Your workspace: National Police Intelligence Officer Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 9 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
