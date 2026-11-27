# UAT Script — Role 01: Superadmin

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | ZPS-OMS Superadmin Dashboard |
| Organisational context | National Headquarters (platform-wide) |
| Category | TECHNICAL |
| Synthetic account(s) | `demo.org.registry` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)); `demo.platform.admin` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** Platform configuration, tenants, organisation structure and access administration. No personnel records or business approvals.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.org.registry` with the published development password. | Dashboard titled “ZPS-OMS Superadmin Dashboard”; heading shows Tier 1 · Role 01. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks); Platform (System health, Tenant management, Workflow definitions); Organisation (Organisation directory, Structure changes); Access (Users & access, Roles & permissions, Access reviews, Security events); Public site (Contact messages). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Tenants, Provincial Divisions, Organisation units / Units in my command, Active user accounts / Accounts in my scope, Automation failures (24 h), Structure changes pending — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Account support, Tenants, Propose structure change, System health, Security events — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Users & access: issue a temporary password to an account in your unit. | Password shown once; the user must change it at next sign-in. | ☐ Pass ☐ Fail | |
| 6 | Open an account outside your unit by URL. | Not found (existence not disclosed). | ☐ Pass ☐ Fail | |
| 7 | System health: create a backup, then run a restore drill. | Backup verified (SHA-256); restore drill passes and the scratch database is removed. | ☐ Pass ☐ Fail | |
| 8 | System health: change an editable setting. | Setting saved and audited; policy settings cannot be changed here. | ☐ Pass ☐ Fail | |
| 9 | Tenant management: review tenants and their units. | Tenants listed; provisioning is audited. | ☐ Pass ☐ Fail | |
| 10 | Open /app/personnel and /app/approvals directly. | Access-denied page (audited); no business records shown. | ☐ Pass ☐ Fail | |
| 11 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 12 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 13 | Open Help (?) in the top bar. | “Your workspace: ZPS-OMS Superadmin Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 14 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
