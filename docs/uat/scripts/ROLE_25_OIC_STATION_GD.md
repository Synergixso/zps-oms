# UAT Script — Role 25: Officer-in-Charge — Police Station GD

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | Police Station General Duties Administration |
| Organisational context | Police Station (and its posts) |
| Category | BUSINESS |
| Synthetic account(s) | `demo.kitwec.commander` (Kitwe Central Police Station (synthetic)) |

**Purpose:** Station general duties administrative oversight: personnel, contributions and submissions.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwec.commander` with the published development password. | Dashboard titled “Police Station General Duties Administration”; heading shows Tier 3 · Role 25. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and contributions (Personnel register, Unit contributions, Manpower requests, Rosters, Assignment register); Administration (General assets, Stores and stock, Stores requisitions); Reports (Reports); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Available at home unit, Active assignments, Contributions due, Stores requisitions pending, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Prepare contribution, Stores and stock — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 6 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 7 | Open a submitted requisition from a unit under you and approve or reject it. | Decision recorded only if you hold a STORES delegation; otherwise refused. | ☐ Pass ☐ Fail | |
| 8 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 9 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 10 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 11 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 12 | Open Help (?) in the top bar. | “Your workspace: Police Station General Duties Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 13 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
