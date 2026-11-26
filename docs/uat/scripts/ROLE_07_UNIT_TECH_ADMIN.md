# UAT Script — Role 07: Divisional/Unit System Administrator (Tech)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Division and Unit Technical Administration |
| Organisational context | Assigned Provincial Division or Unit/Formation only |
| Category | TECHNICAL |
| Synthetic account(s) | `demo.cb.tech` (Copperbelt Division); `demo.mu.tech` (Mobile Unit Division / SPOM, Kamfinsa) |

**Purpose:** Technical account support within your Division or Formation. Higher-level issues go to HQ Tech.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.tech` with the published development password. | Dashboard titled “Division and Unit Technical Administration”; heading shows Tier 2 · Role 07. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Technical administration (Users & access, Roles & permissions); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Active user accounts / Accounts in my scope, Locked accounts, Failed sign-ins (24 h), My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Account support — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Users & access: issue a temporary password to an account in your unit. | Password shown once; the user must change it at next sign-in. | ☐ Pass ☐ Fail | |
| 6 | Open an account outside your unit by URL. | Not found (existence not disclosed). | ☐ Pass ☐ Fail | |
| 7 | Open /app/personnel and /app/approvals directly. | Access-denied page (audited); no business records shown. | ☐ Pass ☐ Fail | |
| 8 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 9 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 10 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 11 | Open Help (?) in the top bar. | “Your workspace: Division and Unit Technical Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 12 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
