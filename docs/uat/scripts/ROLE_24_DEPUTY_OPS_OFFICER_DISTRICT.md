# UAT Script — Role 24: Deputy Operations Officer — District

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | Deputy District Operations Workspace |
| Organisational context | District Command |
| Category | BUSINESS |
| Synthetic account(s) | `demo.kitwe.personnel` (Kitwe District Command (synthetic)) |

**Purpose:** Preparation and verification of district submissions and workflow records.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwe.personnel` with the published development password. | Dashboard titled “Deputy District Operations Workspace”; heading shows Tier 3 · Role 24. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Reports (Reports); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Awaiting verification, Contributions due, Active assignments, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Register personnel, Prepare contribution — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”. | The meeting appears in the calendar for your unit and the levels above; the operational title is refused. | ☐ Pass ☐ Fail | |
| 6 | Register an incoming letter and attach a small PDF. | A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused. | ☐ Pass ☐ Fail | |
| 7 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 8 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 9 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 10 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 11 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 12 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 13 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 14 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 15 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 16 | Open Help (?) in the top bar. | “Your workspace: Deputy District Operations Workspace”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 17 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
