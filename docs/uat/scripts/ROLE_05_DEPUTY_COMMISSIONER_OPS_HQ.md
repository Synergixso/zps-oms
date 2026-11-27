# UAT Script — Role 05: Deputy Commissioner – Operations HQ

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 1 |
| Back office | Deputy Commissioner Operations HQ Dashboard |
| Organisational context | Operations Headquarters |
| Category | BUSINESS |
| Synthetic account(s) | `demo.hq.personnel` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)); `demo.hq.roster` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)); `demo.hq.staff` (Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations)) |

**Purpose:** Day-to-day coordination and processing within Operations Headquarters.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.hq.personnel` with the published development password. | Dashboard titled “Deputy Commissioner Operations HQ Dashboard”; heading shows Tier 1 · Role 05. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Rosters, Assignment register, Transfers, Operational areas); Reports (Reports); Organisation (Organisation directory, Structure changes); Administrative records (Administrative calendar, Correspondence). No other sections appear. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Open manpower requests, Contributions to review, Approved personnel lists, Personnel records, Awaiting verification, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New manpower request, Register personnel, Review approvals, Open reports — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”. | The meeting appears in the calendar for your unit and the levels above; the operational title is refused. | ☐ Pass ☐ Fail | |
| 6 | Register an incoming letter and attach a small PDF. | A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused. | ☐ Pass ☐ Fail | |
| 7 | Assign a registered letter to an officer of your unit, then close and file it with a filing reference. | The officer is notified; only officers of your unit or below are offered; the history shows each step. | ☐ Pass ☐ Fail | |
| 8 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 9 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 10 | Raise a manpower request and submit it. | Request is submitted and appears in the approver's queue; you cannot approve it. | ☐ Pass ☐ Fail | |
| 11 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 12 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 13 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 14 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 15 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 16 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 17 | Open Help (?) in the top bar. | “Your workspace: Deputy Commissioner Operations HQ Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 18 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
