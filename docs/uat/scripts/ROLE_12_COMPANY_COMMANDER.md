# UAT Script — Role 12: Company Commander

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Company Command Administration |
| Organisational context | Company within a Unit/Formation |
| Category | BUSINESS |
| Synthetic account(s) | `demo.mu.acoy.admin` (A Company, Mobile Unit (synthetic)); `demo.mu.acoy.commander` (A Company, Mobile Unit (synthetic)) |

**Purpose:** Company administration: personnel register, contributions and submissions for your company.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.mu.acoy.admin` with the published development password. | Dashboard titled “Company Command Administration”; heading shows Tier 2 · Role 12. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and contributions (Personnel register, Unit contributions, Manpower requests, Rosters, Assignment register); Reports (Reports); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Available at home unit, Active assignments, Contributions due, Pending approvals, My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Prepare contribution, Register personnel — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Open the Administrative calendar. | Events, review dates and deadlines for your scope only; no option to schedule. | ☐ Pass ☐ Fail | |
| 6 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 7 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 8 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 9 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 10 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 11 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 12 | Open Help (?) in the top bar. | “Your workspace: Company Command Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 13 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
