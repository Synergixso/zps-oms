# UAT Script — Role 20: Deputy OC — District

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | Deputy District Commander Dashboard |
| Organisational context | District Command |
| Category | BUSINESS |
| Synthetic account(s) | `demo.kitwe.assignments` (Kitwe District Command (synthetic)) |

**Purpose:** Assists the District Commander; reviews subordinate submissions.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwe.assignments` with the published development password. | Dashboard titled “Deputy District Commander Dashboard”; heading shows Tier 3 · Role 20. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Reports (Reports); Organisation (Organisation directory); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Organisation units / Units in my command, Personnel records, Active assignments, Contributions due, Pending approvals, My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Review approvals, Prepare contribution — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open the Administrative calendar. | Events, review dates and deadlines for your scope only; no option to schedule. | ☐ Pass ☐ Fail | |
| 6 | Assign a registered letter to an officer of your unit, then close and file it with a filing reference. | The officer is notified; only officers of your unit or below are offered; the history shows each step. | ☐ Pass ☐ Fail | |
| 7 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 8 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 9 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 10 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 11 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 12 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 13 | Open Help (?) in the top bar. | “Your workspace: Deputy District Commander Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 14 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
