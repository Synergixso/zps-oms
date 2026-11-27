# UAT Script — Role 23: Operations Officer — District

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | District Operations Officer Workspace |
| Organisational context | District Command |
| Category | BUSINESS |
| Synthetic account(s) | `demo.kitwe.ops` (Kitwe District Command (synthetic)); `demo.mufulira.receiving` (Mufulira District Command (synthetic)) |

**Purpose:** District Operations administration: requests, station contributions, district lists and assignment records.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.kitwe.ops` with the published development password. | Dashboard titled “District Operations Officer Workspace”; heading shows Tier 3 · Role 23. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Stores requisitions); Reports (Reports); Organisation (Organisation directory); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Open manpower requests, Contributions to review, Contributions due, Active assignments, Transfers in progress, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New manpower request, Register personnel, New stores requisition — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”. | The meeting appears in the calendar for your unit and the levels above; the operational title is refused. | ☐ Pass ☐ Fail | |
| 6 | Register an incoming letter and attach a small PDF. | A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused. | ☐ Pass ☐ Fail | |
| 7 | Assign a registered letter to an officer of your unit, then close and file it with a filing reference. | The officer is notified; only officers of your unit or below are offered; the history shows each step. | ☐ Pass ☐ Fail | |
| 8 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 9 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 10 | Raise a manpower request and submit it. | Request is submitted and appears in the approver's queue; you cannot approve it. | ☐ Pass ☐ Fail | |
| 11 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 12 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 13 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 14 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 15 | Raise a stores requisition from your own or a higher store and submit it. | Requisition submitted; you cannot approve or issue it. | ☐ Pass ☐ Fail | |
| 16 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 17 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 18 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 19 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 20 | Open Help (?) in the top bar. | “Your workspace: District Operations Officer Workspace”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 21 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
