# UAT Script — Role 13: Section Head

> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.

| | |
|---|---|
| Tier | 2 |
| Back office | Section Administration Dashboard |
| Organisational context | Section (or department, detachment or platoon where configured) |
| Category | BUSINESS |
| Synthetic account(s) | `demo.mu.det.admin` (1 Detachment, A Company (synthetic)); `demo.mu.det.commander` (1 Detachment, A Company (synthetic)); `demo.mu.opsdept` (Operations Department, Mobile Unit (synthetic)); `demo.mu.plt.admin` (1 Platoon, 1 Detachment (synthetic)); `demo.mu.plt.commander` (1 Platoon, 1 Detachment (synthetic)); `demo.mu.sec.admin` (1 Section, 1 Platoon (synthetic)); `demo.mu.sec.commander` (1 Section, 1 Platoon (synthetic)) |

**Purpose:** Section administrative records: personnel selection and manpower contributions.

| # | Action | Expected result | Result | Notes / defect ref |
|--:|---|---|---|---|
| 1 | Sign in as `demo.mu.det.admin` with the published development password. | Dashboard titled “Section Administration Dashboard”; heading shows Tier 2 · Role 13. | ☐ Pass ☐ Fail | |
| 2 | Check the side navigation sections. | Sections: Overview (Dashboard, My tasks, Approvals & queues); Personnel and contributions (Personnel register, Unit contributions, Manpower requests, Rosters, Assignment register) — entries the role is not permitted to open are hidden. | ☐ Pass ☐ Fail | |
| 3 | Check the headline figures. | Tiles for: Personnel records, Available at home unit, Contributions due, My open tasks, Unread notifications — figures for your scope only. | ☐ Pass ☐ Fail | |
| 4 | Use each quick action once. | Quick actions: Prepare contribution, Register personnel — each opens the right page. | ☐ Pass ☐ Fail | |
| 5 | Register a synthetic officer in your unit (Personnel register → Register). | Record saved as unverified; duplicate service numbers are refused. | ☐ Pass ☐ Fail | |
| 6 | Open Unit contributions, select eligible officers for an open requirement and submit. | Only eligible officers in your scope can be selected; contribution submitted. | ☐ Pass ☐ Fail | |
| 7 | Open /app/audit directly. | Access-denied page. | ☐ Pass ☐ Fail | |
| 8 | Open a record from another Division/District by pasting its URL (ask the test lead for one). | Not found — existence not disclosed. | ☐ Pass ☐ Fail | |
| 9 | Try to approve or issue something you raised yourself. | Refused: separation of duties. | ☐ Pass ☐ Fail | |
| 10 | Open Help (?) in the top bar. | “Your workspace: Section Administration Dashboard”, with your pages, approval authority, limits and support contact. | ☐ Pass ☐ Fail | |
| 11 | Open the dashboard on a phone (or a narrow browser window). | No sideways scrolling; quick actions and tasks appear near the top. | ☐ Pass ☐ Fail | |

**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected
