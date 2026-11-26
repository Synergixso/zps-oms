# UAT Script — Role 10: Division Senior Staff Officer – Operations (Staff I)

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Division Senior Staff Officer – Operations |
| Organisational context | Provincial Division or Unit/Formation |
| Category | BUSINESS |
| Synthetic account(s) | `demo.cb.staffops` (Copperbelt Division); `demo.cen.staffops` (Central Division); `demo.lsk.staffops` (Lusaka Division) |

**Purpose:** Divisional Operations administration: requirements, contributions, rosters, assignments, transfers and renewals.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.cb.staffops` with the published development password. | Dashboard titled “Division Senior Staff Officer – Operations”; heading shows Tier 2 · Role 10. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and manpower (Personnel register, Manpower requests, Unit contributions, Rosters, Assignment register, Transfers, Operational areas); Administration (Administrative requests, Fleet register, Fleet maintenance, General assets, Stores and stock, Stores requisitions); Reports (Reports); Organisation (Organisation directory) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Open manpower requests, Contributions to review, Approved personnel lists, Active assignments, Reviews due, Pending approvals — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: New manpower request, Register personnel, New stores requisition, Open reports — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 6 | Verify a record registered by another officer. | Status becomes verified; you cannot verify a record you registered. | ☐ Pass ☐ Fail | |
| 7 | Raise a manpower request and submit it. | Request is submitted and appears in the approver's queue; you cannot approve it. | ☐ Pass ☐ Fail | |
| 8 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 9 | Build a roster version from accepted contributions; print and download Excel. | Roster built; Excel and PDF downloads work and are audited. | ☐ Pass ☐ Fail | |
| 10 | Propose a duty-area assignment for an available officer. | Assignment pending approval; minimum tenure and conflicts are enforced. | ☐ Pass ☐ Fail | |
| 11 | Initiate a transfer of an active assignment. | Refused before minimum tenure unless an approved exception exists. | ☐ Pass ☐ Fail | |
| 12 | Create and submit an administrative request. | Request submitted; you cannot approve your own request. | ☐ Pass ☐ Fail | |
| 13 | Raise a stores requisition from your own or a higher store and submit it. | Requisition submitted; you cannot approve or issue it. | ☐ Pass ☐ Fail | |
| 14 | Open a report, download Excel, then schedule a weekly delivery. | Workbook opens in Excel; schedule listed under My scheduled deliveries. | ☐ Pass ☐ Fail | |
| 15 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 16 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 17 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 18 | Open Help (?) in the top bar. | “Your workspace: Division Senior Staff Officer – Operations”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 19 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
