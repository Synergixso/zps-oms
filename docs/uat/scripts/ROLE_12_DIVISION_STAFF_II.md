# UAT Script — Role 12: Deputy Division Staff Officer – Operations (Staff II)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Deputy Division Staff Officer – Operations |
| Organisational context | Provincial Division or Unit/Formation |
| Category | BUSINESS |
| Synthetic account(s) | `demo.cb.assignments` (Copperbelt Division); `demo.cb.originator` (Copperbelt Division); `demo.cb.personnel` (Copperbelt Division) |

**Purpose:** Preparation and verification support for Staff I: personnel information, draft lists and documentation.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.assignments` with the published development password. | Dashboard titled “Deputy Division Staff Officer – Operations”; heading shows Tier 2 · Role 12. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Reports (Reports); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Awaiting verification, Contributions due, Active assignments, Transfers in progress, My open tasks — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Register personnel, New manpower request, Prepare contribution — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”. | The meeting appears in the calendar for your unit and the levels above; the operational title is refused. | ☐ Pass ☐ Fail | |
| 6 | Register an incoming letter and attach a small PDF. | A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused. | ☐ Pass ☐ Fail | |
| 7 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 8 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 9 | Raise a manpower request and submit it. | Request is submitted and appears in the approver's queue; you cannot approve it. | ☐ Pass ☐ Fail | |
| 10 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 11 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 12 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 13 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 14 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 15 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 16 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 17 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 18 | Open Help (?) in the top bar. | “Your workspace: Deputy Division Staff Officer – Operations”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 19 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
