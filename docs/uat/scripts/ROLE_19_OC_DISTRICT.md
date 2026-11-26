# UAT Script — Role 19: Officer Commanding — District

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | District Command Dashboard |
| Organisational context | District Command |
| Category | BUSINESS |
| Synthetic account(s) | `demo.kitwe.commander` (Kitwe District Command (synthetic)) |

**Purpose:** District oversight: stations and posts, personnel, contributions, assignments and stores.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwe.commander` with the published development password. | Dashboard titled “District Command Dashboard”; heading shows Tier 3 · Role 19. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (General assets, Stores and stock, Stores requisitions); Reports (Reports); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Organisation units / Units in my command, Personnel records, Active assignments, Contributions due, Stores requisitions pending, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Stores and stock, Open reports — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 6 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 7 | Open a submitted requisition from a unit under you and approve or reject it. | Decision recorded only if you hold a STORES delegation; otherwise refused. | ☐ Pass ☐ Fail | |
| 8 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 9 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 10 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 11 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 12 | Open Help (?) in the top bar. | “Your workspace: District Command Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 13 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
