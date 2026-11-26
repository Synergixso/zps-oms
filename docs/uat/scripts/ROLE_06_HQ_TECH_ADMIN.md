# UAT Script — Role 06: System Administrator – HQ Tech

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | Headquarters Technical Administration Dashboard |
| Organisational context | National Headquarters (technical) |
| Category | TECHNICAL |
| Synthetic account(s) | `demo.security.admin` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** Headquarters technical administration: health, jobs, authentication monitoring and account support.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.security.admin` with the published development password. | Dashboard titled “Headquarters Technical Administration Dashboard”; heading shows Tier 1 · Role 06. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Technical operations (System health, Security events); Accounts and access (Users & access, Roles & permissions, Access reviews); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Active user accounts / Accounts in my scope, Active sessions, Locked accounts, Failed sign-ins (24 h), Denied actions (24 h), Automation failures (24 h) — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Account support, Security events, System health — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Users & access: issue a temporary password to an account in your unit. | Password shown once; the user must change it at next sign-in. | ☐ Pass ☐ Fail | |
| 6 | Open an account outside your unit by URL. | Not found (existence not disclosed). | ☐ Pass ☐ Fail | |
| 7 | System health: create a backup, then run a restore drill. | Backup verified (SHA-256); restore drill passes and the scratch database is removed. | ☐ Pass ☐ Fail | |
| 8 | Open /app/personnel and /app/approvals directly. | Access-denied page (audited); no business records shown. | ☐ Pass ☐ Fail | |
| 9 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 10 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 11 | Open Help (?) in the top bar. | “Your workspace: Headquarters Technical Administration Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 12 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
