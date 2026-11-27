# All 17 Modules — Verification

Recorded 27 November 2026 for v0.9.1. Each module is checked against the directive's §5.1 implementation standards. Detail of what each module does is in `docs/development/FULL_MODULE_COMPLETION_MATRIX.md`; test evidence is in `COMPLETE_WORKFLOW_TEST_RESULTS.md`.

## Standards common to every module

These are provided once and used by every module; they were verified for the whole application.

| Standard | How it is met | Evidence |
|---|---|---|
| Backend services and database operations | Domain functions `async (db, actor, …)` with parameterised SQL; multi-record changes in transactions | domain tests; `tests/transactions.test.ts` (injected failures roll back) |
| Permission enforcement | Server-side in every domain function (permission + organisational scope); pages only mirror it | route audit (every route × every account); `PERMISSION_VERIFICATION_REPORT.md` |
| Validation | Zod schemas on every input; prohibited-term screening; identifier formats by environment | domain tests |
| Audit events | Every change and refusal audited with actor, time, reference, before/after values and, for decisions, the authorising unit and delegation reference | `tests/transactions.test.ts` (audit values); `npm run verify:audit` |
| Error handling | Domain errors become field and form messages; unexpected errors are logged without payload and shown with a reference; route-level error boundary (v0.9.1) | `src/server/actions/result.ts`; `src/app/app/error.tsx` |
| Loading states | Navigation pending indicator on the sidebar link (v0.9.1, `useLinkStatus`); per-form pending state ("Working…"). A route-level `loading.tsx` was tried and removed because it turned out-of-scope 404 responses into 200 (B11) | `src/components/shell.tsx`; `ActionForm` |
| Empty states | Every table states what is absent and why | route audit renders; accessibility scan |
| Mobile responsiveness | Every page reachable from each role's navigation reflows at 320, 640, 768 and 1024 px | `docs/evidence/reflow.md` |
| Pagination | Server-side pages with a true total on every register (v0.9.1; previously ten registers stopped at 300–500 rows) | `tests/paging.test.ts` |
| Notifications | In-application notifications and tasks; automation jobs with execution records | `tests/automation-platform.test.ts` |

## Module checklist

Legend: ✓ implemented and verified · — not applicable to the module · fixed order = the register has a fixed, purposeful order (no user-selectable sort).

| # | Module | Pages | Search | Filters | Sort | Paging | Create / update | Workflow | Reports | Automation | Unit / integration tests | Browser tests | Status |
|--:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Organisation and tenants | directory, unit, changes, tenants | — (hierarchy) | ✓ | fixed order (hierarchy) | — (bounded by establishment) | ✓ effective-dated change requests | ✓ approval | ✓ | `org.effective-changes` | `access-control`, `seed` | route audit | Completed and Verified |
| 02 | Users, roles and access | users, user, roles, reviews, profile | ✓ | — | fixed order (name) | ✓ | ✓ provision, assign, revoke, suspend | ✓ access reviews | — | `access.temporary-expiry`, `security.unusual-access` | `auth-scope`, `three-tier-roles` (incl. context switching), `account-activity`, `production-setup` | context switch, admin-records | Completed and Verified |
| 03 | Personnel registry | register, record, new, review, export | ✓ | ✓ | ✓ selectable | ✓ | ✓ register, correct, verify | ✓ verification | ✓ | — | `personnel-assignments`, `identifiers` | isolation journey | Completed and Verified |
| 04 | Manpower requests and contributions | requests, request, contributions | ✓ | ✓ | fixed order (newest) | ✓ | ✓ | ✓ submit, review, recommend, approve, return, close | ✓ | `manpower.contribution-reminders` | `manpower` | roster journey | Completed and Verified |
| 05 | Roster builder | rosters, roster, print, PDF, export | — | — | fixed order (newest) | ✓ (v0.9.1) | ✓ build, amend (new version) | ✓ approve, finalise | ✓ | — | `manpower`, `extensions` | roster journey; A4 print | Completed and Verified |
| 06 | Operational areas | areas, area | — | ✓ | fixed order (name) | — (bounded) | ✓ create, edit, close | — | ✓ | — | `personnel-assignments` | route audit | Completed and Verified |
| 07 | Assignments and disposition | register, assignment, new | ✓ | ✓ | fixed order (reference) | ✓ | ✓ propose | ✓ decision chain | ✓ | `assignment.time-events`, `assignment.review-reminders` | criteria B, F | assignment journey | Completed and Verified |
| 08 | Transfers, tenure and renewals | transfers, transfer | — | ✓ | fixed order (newest) | ✓ (v0.9.1) | ✓ initiate | ✓ release chain, acceptance, renewal, exceptions | ✓ | reminders | criteria G, H, I; `transactions` | transfer and renewal journeys | Completed and Verified |
| 09 | Approvals, workflows and requests | approvals, requests, request, workflows | ✓ | ✓ | ✓ selectable (v0.9.1) | ✓ (v0.9.1) | ✓ | ✓ configurable chains, delegation, deadlines, escalation | ✓ | `workflow.overdue-approvals` | `workflows`, `decision-chains`, `paging` | route audit | Completed and Verified |
| 10 | Fleet and transport | register, vehicle, maintenance | ✓ | ✓ | fixed order (fleet ref / updated) | ✓ (v0.9.1) | ✓ | ✓ maintenance workflow | ✓ | `fleet.maintenance-reminders` | `workflows`, `access-control` | route audit | Completed and Verified |
| 11 | Assets and stores | assets, asset, reconciliation, stores, requisitions | ✓ | ✓ | fixed order (tag / code / newest) | ✓ (v0.9.1) | ✓ | ✓ custody, requisition approval, issue | ✓ | `asset.custody-reminders`, `stores.reorder-and-requisitions` | `extensions`, `three-tier-roles` (stores) | route audit | Completed and Verified |
| 12 | Dashboards and reports | 27 dashboards, reports, report, deliveries | — | ✓ | ✓ report sort | ✓ report rows | ✓ saved views, schedules | — | ✓ CSV, .xlsx, PDF, print | `reports.scheduled-delivery` | `reports` (figures equal SQL), `report-schedules` | accessibility, phone review | Completed and Verified |
| 13 | Notifications and tasks | notifications, tasks | — | ✓ | fixed order (newest / due) | ✓ notifications | ✓ preferences, read/unread | — | — | all reminder jobs | `notifications`, `automation-platform` | route audit | Completed and Verified |
| 14 | Audit and compliance | audit explorer, history, security events, export | ✓ | ✓ | fixed order (newest) | ✓ (v0.9.1; previously latest 200) | — (append-only) | — | ✓ evidence export | — | `audit-chain`, `paging` | route audit | Completed and Verified |
| 15 | Platform administration | platform, health API, setup | — | — | — | — | ✓ settings, backups, drills, maintenance mode | — | — | `system.*` jobs | `automation-platform`, `release`, `production-setup` | route audit | Completed and Verified |
| 16 | Administrative scheduling | calendar, event, new | — | ✓ month | fixed order (date) | — (one month per view) | ✓ schedule, cancel, complete | — | — | `schedule.event-reminders` | `scheduling-correspondence` | admin-records | Completed and Verified |
| 17 | Administrative correspondence | register, record, new, document download | ✓ | ✓ | fixed order (register date) | ✓ (v0.9.1) | ✓ register, assign, progress, file, documents | ✓ status flow | — | `correspondence.follow-ups` | `scheduling-correspondence`, `transactions` | admin-records | Completed and Verified; production document storage blocked by malware-scanning decision (DEC-068) |

## Integration between modules

- One personnel identity (Module 03) is used by manpower contributions (04), rosters (05), assignments (07) and transfers (08); no other module stores personnel details.
- Approval decisions in 04, 07, 08, 09 and 11 all use the same delegation and business-role rule (`policy.approvalUnitFor`).
- Dashboards (12) and the calendar (16) read the other modules' records through their scoped queries; no figure is stored separately.
- Every module writes to the single audit trail (14) and notification store (13).
