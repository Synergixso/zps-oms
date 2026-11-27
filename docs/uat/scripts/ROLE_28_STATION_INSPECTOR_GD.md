# UAT Script — Role 28: Station Inspector — Police Station GD

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 3 |
| Back office | Station Inspector Operations Administration |
| Organisational context | Police Station or Police Post |
| Category | BUSINESS |
| Synthetic account(s) | `demo.chimwemwe.post` (Chimwemwe Police Post (synthetic)); `demo.kitwec.ops` (Kitwe Central Police Station (synthetic)); `demo.kitwec.personnel` (Kitwe Central Police Station (synthetic)) |

**Purpose:** Station administration support: personnel register, contributions and submissions.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.chimwemwe.post` with the published development password. | Dashboard titled “Station Inspector Operations Administration”; heading shows Tier 3 · Role 28. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and contributions (Personnel register, Unit contributions, Manpower requests, Rosters, Assignment register); Reports (Reports); Organisation (Organisation directory); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Available at home unit, Awaiting verification, Contributions due, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Register personnel, Prepare contribution — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”. | The meeting appears in the calendar for your unit and the levels above; the operational title is refused. | ☐ Pass ☐ Fail | |
| 6 | Register an incoming letter and attach a small PDF. | A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused. | ☐ Pass ☐ Fail | |
| 7 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 8 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 9 | Open a report available to you. | Figures limited to your scope; no export button. | ☐ Pass ☐ Fail | |
| 10 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 11 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 12 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 13 | Open Help (?) in the top bar. | “Your workspace: Station Inspector Operations Administration”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 14 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
