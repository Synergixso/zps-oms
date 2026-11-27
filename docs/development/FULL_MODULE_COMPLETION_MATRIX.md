# Full Module Completion Matrix

Recorded 27 November 2026 for v0.9.0 against the owner's directive of 27 November 2026 (§6, seventeen modules). Statuses use the directive's scale: Not Started · In Progress · Partially Implemented · Implemented · Tested · Completed and Verified · Blocked by External Dependency. "Completed and Verified" means implemented, integrated with MySQL and the interface, enforced server-side, and covered by passing automated tests and the route audit; evidence is in `END_TO_END_TEST_RESULTS.md` and `docs/evidence/`. Institutional validation of the *content* (roles, delegations, policy values) is a separate matter recorded in `INSTITUTIONAL_APPROVAL_STATUS.md`.

| # | Module | Status | Outstanding (external) |
|--:|---|---|---|
| 01 | National organisation and multi-tenant management | Completed and Verified | Organisation names and reporting lines await the signed establishment (DEC-004) |
| 02 | User, roles and access management | Completed and Verified | Identity provider for SSO/MFA (DEC-039) |
| 03 | Central personnel registry | Completed and Verified | Production service-number format (DEC-069) |
| 04 | Manpower request and contribution management | Completed and Verified | — |
| 05 | Personnel roster builder | Completed and Verified | Licensed-Excel check of .xlsx output (owner) |
| 06 | Operational area administration | Completed and Verified | — |
| 07 | Personnel assignment and disposition | Completed and Verified | — |
| 08 | Transfers, tenure and renewals | Completed and Verified | Tenure policy values await authorisation (DEC-041) |
| 09 | Administrative approval and workflow engine | Completed and Verified | Delegation matrix awaits validation (DEC-008) |
| 10 | Fleet and transport administration | Completed and Verified | Production registration format (DEC-069) |
| 11 | General asset and equipment accountability | Completed and Verified | — |
| 12 | Management dashboards and reporting | Completed and Verified | Report owners to be nominated (DEC-012) |
| 13 | Notifications, tasks and reminders | Completed and Verified | External SMS/e-mail disabled by design until approved (DEC-013) |
| 14 | Audit and compliance | Completed and Verified | Off-host / WORM audit storage (infrastructure) |
| 15 | Platform administration and monitoring | Completed and Verified | Central logging/SIEM (infrastructure) |
| 16 | Administrative scheduling and availability | Completed and Verified (new in 0.9.0) | — |
| 17 | Administrative correspondence management | Completed and Verified (new in 0.9.0) | Malware scanning and an information-security decision before production document storage (DEC-068) |

## Detail by module

### 01 — National organisation and multi-tenant management
- **Implementation:** national tenant, ten Provincial Divisions, District Commands, Stations, Posts, Formations, Departments, Companies, Detachments, Platoons, Sections (`org_units`, `org_type_rules`, `org_relationships`, closure table `org_unit_closure`); effective-dated structure changes with approval; tenant management, suspension and provisioning (`org.ts`, `tenants.ts`); organisation history.
- **Database / UI:** migrations 001, 003, 007; `/app/org`, `/app/org/[id]`, `/app/org/changes`, `/app/org/tenants`.
- **Permissions:** `org.view`, `org.propose`, `tenant.view`, `tenant.manage` (Superadmin only). **Automation:** `org.effective-changes`.
- **Evidence:** `access-control`, `seed`, `auth-scope` tests; route audit. **Status:** Completed and Verified.

### 02 — User, roles and access management
- **Implementation:** the 27 roles in three tiers (`catalogue.ts`), role-to-permission mapping with UNIT/SUBTREE/NATIONAL coverage, accounts, multi-role assignment with context switching, revocation, suspension and deactivation, temporary (time-limited) assignments, delegations, access reviews, sign-in lockout and throttling. **New in 0.9.0:** active-session list, per-session revocation (own other sessions; account support for users in scope) and sign-in / account history from the audit trail on the profile and account pages (`account-activity.ts`); production account creation no longer marks accounts synthetic; first-account setup for an empty production database (`setup.ts`, `/setup`).
- **Permissions:** `user.*`, `grant.*`, `delegation.*`, `accessreview.manage`. **Automation:** `access.temporary-expiry`, `security.unusual-access`.
- **Evidence:** `auth-scope`, `three-tier-roles`, `context-switching`, `account-activity`, `production-setup` tests; Playwright context-switch and admin-records journeys. **Status:** Completed and Verified.

### 03 — Central personnel registry
- **Implementation:** one canonical record per officer with generated `PER-` reference, rank, home unit and membership history, verification, duplicate detection and review, corrections, search, history and disposition history (`personnel.ts`). **New in 0.9.0:** service-number format by environment (synthetic outside production; the Service's configured format in production).
- **Evidence:** `personnel-assignments`, `identifiers` tests; route audit. **Status:** Completed and Verified.

### 04 — Manpower request and contribution management
- **Implementation:** requests with references, routing and recommendations, contribution requirements per unit with deadlines, contributor selection from the registry, validation, returns and resubmission, tracking and consolidation (`manpower.ts`). **Automation:** `manpower.contribution-reminders`.
- **Evidence:** `manpower` tests; Playwright roster journey. **Status:** Completed and Verified.

### 05 — Personnel roster builder
- **Implementation:** automatic retrieval from contributions, grouping, duplicate, eligibility and assignment-conflict checks, preview, approval, versions (approved versions preserved; amendments create new versions), server-side A4 PDF, print view, CSV and .xlsx export, superseded-version archive.
- **Evidence:** `manpower`, `extensions` tests; Playwright roster journey; A4 print test. **Status:** Completed and Verified.

### 06 — Operational area administration
- **Implementation:** areas with references, responsible unit, profile, activation and closure, edits with reasons and per-area history (`assignments.ts`); synthetic examples KCM Mine Operations (Kitwe) and Mopani Mine Operations (Mufulira). An area is an administrative duty-area record, never a location.
- **Evidence:** `personnel-assignments` tests; route audit. **Status:** Completed and Verified.

### 07 — Personnel assignment and disposition
- **Implementation:** assignment proposal and approval through configurable decision chains, `ASG-` references, home unit and duty area, commencement date, active register, disposition statuses and history, closure and return to home unit.
- **Automation:** `assignment.time-events`, `assignment.review-reminders`. **Evidence:** criteria B/F tests; Playwright assignment journey. **Status:** Completed and Verified.

### 08 — Transfers, tenure and renewals
- **Implementation:** transfer request with current-assignment retrieval, receiving area, justification, review chain, receiving-area acceptance, and a single transaction that closes the old assignment and creates the new one; tenure calculation (365-day configurable default), same-area renewal preserving the original commencement date, early-withdrawal exceptions with documented categories.
- **Evidence:** criteria G/H/I tests; Playwright transfer and renewal journeys (KCM → Mopani). **Status:** Completed and Verified; policy values await authorisation.

### 09 — Administrative approval and workflow engine
- **Implementation:** request workflows, manpower workflows and versioned decision chains for assignments and transfer release: stages, reviewers, recommendation, approval, rejection, return for correction, resubmission, delegated authority (delegation + business role), deadlines, overdue escalation, separation of duties (no self-approval, no two levels by one officer), history.
- **Automation:** `workflow.overdue-approvals`. **Evidence:** `workflows`, `decision-chains` tests. **Status:** Completed and Verified.

### 10 — Fleet and transport administration
- **Implementation:** administrative vehicle register, documentation, custody, maintenance requests with validation, workshop referral, completion and verification, service history and reports. No GPS, tracking or deployment data exists.
- **Automation:** `fleet.maintenance-reminders`. **Evidence:** `workflows` tests; route audit. **Status:** Completed and Verified.

### 11 — General asset and equipment accountability
- **Implementation:** non-sensitive assets (category allowlist, prohibited-term screening), custody, issue and return, transfers, inspections, condition, maintenance, reconciliation (stock-takes), disposal; general stores with ledger and requisitions. Firearms, ammunition and armoury items are not representable; role 16 holds administrative-request functions only.
- **Automation:** `asset.custody-reminders`, `stores.reorder-and-requisitions`. **Evidence:** `extensions`, `stores` tests. **Status:** Completed and Verified.

### 12 — Management dashboards and reporting
- **Implementation:** 27 role dashboards (national, provincial, formation, district, station) whose figures are live SQL counts within scope; personnel, manpower, roster, assignment, disposition, tenure, transfer, fleet, asset, stores, approval and audit reports; column choice, saved views, CSV and .xlsx export, scheduled in-application delivery.
- **Evidence:** `reports` test (figures equal direct SQL), `report-schedules` test, phone review, accessibility scan. **Status:** Completed and Verified.

### 13 — Notifications, tasks and reminders
- **Implementation:** in-application notifications with categories and preferences, paged notification centre, read/unread, My Tasks (automated and assigned), approval queues, and reminders for contributions, reviews, renewals, overdue approvals, maintenance, custody, calendar events and correspondence follow-ups.
- **Evidence:** `automation-platform`, `notifications` tests. **Status:** Completed and Verified.

### 14 — Audit and compliance
- **Implementation:** append-only, hash-chained audit trail covering authentication, account, role, permission, personnel, manpower, roster, assignment, transfer, disposition, renewal, approval, export, document and privileged technical events; audit explorer, record histories, evidence export; serialised appends under concurrency; verification script.
- **Evidence:** `audit-chain` test; `npm run verify:audit` (0 breaks). **Status:** Completed and Verified.

### 15 — Platform administration and monitoring
- **Implementation:** configuration (validated settings), database and schema health, `/api/health`, job monitoring with execution records, error log, backups with verification and restore drills, migration history, version, maintenance mode. **New in 0.9.0:** release stage and institutional status on the console; settings for calendar reminders and correspondence document storage.
- **Permissions:** `platform.view/operate/configure` (technical roles only; no business authority). **Evidence:** `automation-platform`, `release` tests. **Status:** Completed and Verified.

### 16 — Administrative scheduling and availability (new)
- **Original requirement:** administrative calendar, review dates, deadlines, non-sensitive meetings, review appointments, renewal deadlines, task schedules, calendar views, notifications; no tactical schedules, patrols or officer locations.
- **Implementation:** `admin_calendar_events` (migration 012) with categories Meeting, Deadline, Review, Training (administrative), Inspection (records) and Other; no location field exists by design, and free text is screened for operational and excluded terms. The calendar (`/app/calendar`, month agenda) merges events with assignment review dates, contribution deadlines, the user's tasks and correspondence follow-ups, each scoped server-side. Cancellation needs a reason; completion is recorded; all changes are audited (`schedule.ts`).
- **Permissions:** `schedule.view` (business roles), `schedule.manage` (staff and administrative roles); technical roles and role 16 have none. **Automation:** `schedule.event-reminders` (reminder before the event; outcome task after it).
- **Evidence:** `scheduling-correspondence` tests (scope, operational-term refusal, cross-Division denial, technical-role refusal, merged calendar equals the scoped register); Playwright admin-records journey; route audit. **Status:** Completed and Verified.

### 17 — Administrative correspondence management (new)
- **Original requirement:** incoming and outgoing registration, references, dates, originating and receiving organisation, assigned officer, status, filing references, history, follow-up, authorised document storage with validation, access control, retention and audit.
- **Implementation:** `correspondence`, `correspondence_events`, `correspondence_files` (migration 012); `CORR-YYYY-NNNNNN` references; duplicate letter-reference check; status flow Registered → Assigned → In progress ⇄ Awaiting reply → Closed → Filed (filing needs a reference; only managers file); assignees must serve at the record's unit or below; RESTRICTED records visible only to managers in scope, the creator and the assignee; PDF documents (5 MB, structural screen including compressed streams, SHA-256 integrity, audited download as a sandboxed attachment, soft removal with reason); retention review flag after `correspondence.retention_years` (nothing deleted automatically); document storage switchable.
- **Permissions:** `correspondence.view`, `correspondence.register`, `correspondence.manage`. **Automation:** `correspondence.follow-ups`.
- **Evidence:** `scheduling-correspondence` tests (flow, separation, RESTRICTED visibility, PDF screen with nine malicious cases, download audit); Playwright admin-records journey (upload refused/accepted, sandboxed download); route audit. **Status:** Completed and Verified; production document storage needs malware scanning and an information-security decision.
