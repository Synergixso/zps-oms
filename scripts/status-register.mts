/**
 * Evidence-based requirement register for the development status report (owner directive 27 Nov 2026, Part 3).
 *
 * Every approved requirement is broken into acceptance criteria with a weight (3 critical · 2 standard · 1 minor)
 * and two statuses: `baseline` (as audited at the start of the command-and-reporting directive, v0.10.0) and
 * `current` (after the work recorded since). Status codes:
 *   V        implemented, connected and passing automated tests (and browser/route-audit evidence where applicable)
 *   I        implemented and connected, not yet covered by a passing test
 *   P:a[:b]  partially implemented: fraction a of the criterion is implemented, fraction b of it verified (b defaults to a)
 *   N        not developed
 *   B        blocked by an external dependency (counts as not implemented; the blocker is named)
 * `validate: true` marks a criterion whose implementation is complete but whose institutional values (allocations,
 * policies, relationships) still need formal validation by the Service. It counts as implemented and verified.
 * Percentages: Σ(weight × implemented fraction) / Σ(weight) and Σ(weight × verified fraction) / Σ(weight), over ALL
 * approved criteria including blocked ones (so blocked work lowers the figure honestly).
 */
export type Status = "V" | "I" | "N" | "B" | `P:${string}`;
export interface Criterion {
  id: string; area: string; criterion: string; weight: 1 | 2 | 3;
  baseline: Status; current: Status; evidence: string; blocker?: string; validate?: boolean; roles?: string;
}

const M = (n: number, name: string) => `${String(n).padStart(2, "0")} ${name}`;
const m1 = M(1, "National Organisation and Multi-Tenant Management");
const m2 = M(2, "User, Roles and Access Management");
const m3 = M(3, "Central Personnel Registry");
const m4 = M(4, "Manpower Request and Contribution Management");
const m5 = M(5, "Personnel Roster Builder");
const m6 = M(6, "Operational Area Administration");
const m7 = M(7, "Field Assignment and Disposition Management");
const m8 = M(8, "Transfer, Tenure and Renewal Management");
const m9 = M(9, "Administrative Approval and Workflow Engine");
const m10 = M(10, "Fleet and Transport Administration");
const m11 = M(11, "General Asset and Equipment Accountability");
const m12 = M(12, "Management Dashboards and Reporting");
const m13 = M(13, "Notifications, Tasks and Reminders");
const m14 = M(14, "Audit and Compliance Management");
const m15 = M(15, "Platform Administration and System Monitoring");
const m16 = M(16, "Administrative Scheduling and Availability");
const m17 = M(17, "Administrative Correspondence Management");
export const MODULES = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17];
export const CMD = "Command and Reporting (new direction)";
export const XC = "Cross-cutting: security, quality, operations";
export const ROLES_AREA = "31 role back offices";

const c = (id: string, area: string, criterion: string, weight: 1 | 2 | 3, baseline: Status, current: Status, evidence: string, extra: Partial<Criterion> = {}): Criterion =>
  ({ id, area, criterion, weight, baseline, current, evidence, ...extra });

export const CRITERIA: Criterion[] = [
  // ── 01 Organisation and tenants ──
  c("M01-1", m1, "Hierarchy HQ → Divisions/Formations → Districts → Stations/Posts → Departments, Companies, Detachments, Platoons, Sections, with closure table", 3, "V", "V", "`org.ts`; `access-control`, `seed` tests"),
  c("M01-2", m1, "Tenants over sub-trees; tenant isolation server-side", 3, "V", "V", "`tenants.ts`; `access-control`; security probes"),
  c("M01-3", m1, "Effective-dated structure changes with approval and automation", 2, "V", "V", "`org.effective-changes` job; `automation-platform`"),
  c("M01-4", m1, "Organisation directory and unit pages", 2, "V", "V", "`/app/org`; route audit"),
  c("M01-5", m1, "Authoritative national establishment loaded (all Districts, Stations, Posts)", 3, "B", "B", "synthetic establishment only (3 Districts, 4 Stations, 2 Posts)", { blocker: "Signed establishment from the Service (DEC-004)" }),
  // ── 02 Users, roles, access ──
  c("M02-1", m2, "Individual accounts, provisioning, suspension, deactivation; no self-registration", 3, "V", "V", "`iam.ts`; `auth-scope`"),
  c("M02-2", m2, "Exactly 31 roles in four levels; obsolete roles retired safely with reassignment flags", 3, "V", "V", "`three-tier-roles`, `role-migration`", { validate: true }),
  c("M02-3", m2, "Role + organisational scope + validity; deny by default; NATIONAL only at HQ", 3, "V", "V", "`policy.ts`; `auth-scope`; route audit"),
  c("M02-4", m2, "Delegations of approval authority; separation of duties", 3, "V", "V", "`policy.approvalUnitFor`; `workflows`, `decision-chains`", { validate: true }),
  c("M02-5", m2, "Sign-in security: hashing, lockout, throttling, sessions, revocation, history", 3, "V", "V", "`auth-scope`, `account-activity`"),
  c("M02-6", m2, "Access recertification reviews; scoped technical administration", 2, "V", "V", "`three-tier-roles`"),
  c("M02-7", m2, "Context switching between assignments", 2, "V", "V", "`three-tier-roles`; browser journey"),
  c("M02-8", m2, "Single sign-on and multi-factor authentication", 3, "B", "B", "SSO button present, disabled", { blocker: "Approved identity provider (DEC-039, X02)" }),
  c("M02-9", m2, "Police rank, organisational position and command appointment recorded separately from the application role", 3, "P:0.3", "P:0.3", "rank on personnel records only; no position or appointment model at baseline"),
  // ── 03 Personnel ──
  c("M03-1", m3, "One canonical identity per officer, duplicate check", 3, "V", "V", "`personnel.ts`; criterion B"),
  c("M03-2", m3, "Register, correct (with before/after history), verify, home-unit membership history", 3, "V", "V", "`personnel-assignments`, `transactions`"),
  c("M03-3", m3, "Search, filter, sort, paging; export (audited)", 2, "V", "V", "`paging`; route audit"),
  c("M03-4", m3, "Disposition history", 2, "V", "V", "criterion F"),
  c("M03-5", m3, "Production service-number format", 2, "B", "B", "format refused until configured", { blocker: "Service identifier formats (DEC-069, X05)" }),
  // ── 04 Manpower ──
  c("M04-1", m4, "Request lifecycle: create, submit, review, recommend, approve, return, close", 3, "V", "V", "`manpower` tests; roster journey"),
  c("M04-2", m4, "Contribution requirements routed to units; contributions validated, returned, resubmitted", 3, "V", "V", "`manpower`"),
  c("M04-3", m4, "Contribution reminders (automation)", 2, "V", "V", "`manpower.contribution-reminders`"),
  c("M04-4", m4, "Configurable approval chains with versioning", 2, "V", "V", "`workflows`", { validate: true }),
  // ── 05 Rosters ──
  c("M05-1", m5, "Roster compiled from registry records and accepted contributions (no retyping)", 3, "V", "V", "`manpower`; roster journey"),
  c("M05-2", m5, "Duplicate, membership, eligibility and conflicting-assignment checks", 3, "V", "V", "criteria C–E"),
  c("M05-3", m5, "Versions, approval, finalisation", 2, "V", "V", "`manpower`"),
  c("M05-4", m5, "Print (A4), PDF, CSV, .xlsx (audited)", 2, "V", "V", "`extensions`, `xlsx`; A4 print test"),
  c("M05-5", m5, ".xlsx opened in licensed Microsoft Excel", 1, "P:1:0", "P:1:0", "file generated and parsed by tests; not opened in Excel (no licence in this environment)"),
  // ── 06 Areas ──
  c("M06-1", m6, "Administrative duty-area directory (no locations)", 3, "V", "V", "`/app/areas`; `personnel-assignments`"),
  c("M06-2", m6, "Create, edit, close areas; scoped", 2, "V", "V", "route audit"),
  // ── 07 Assignments ──
  c("M07-1", m7, "Assignment proposal → decision chain → commencement", 3, "V", "V", "criterion F; assignment journey"),
  c("M07-2", m7, "Disposition changes with history and refusals", 3, "V", "V", "`transactions`"),
  c("M07-3", m7, "Time events (commencement, review) automation", 2, "V", "V", "`assignment.time-events`"),
  // ── 08 Transfers, tenure, renewals ──
  c("M08-1", m8, "365-day tenure, review dates, reminders, exceptions incl. misconduct", 3, "V", "V", "criteria H, I", { validate: true }),
  c("M08-2", m8, "Renewal: same area keeps commencement; new area new commencement", 3, "V", "V", "renewal journey"),
  c("M08-3", m8, "Transactional transfer with release chain and acceptance; history kept", 3, "V", "V", "criterion G; `transactions`; transfer journey"),
  // ── 09 Approvals and workflow ──
  c("M09-1", m9, "Configurable approval chains; delegation + business role; no rank authority; no self-approval", 3, "V", "V", "`decision-chains`, `workflows`"),
  c("M09-2", m9, "Deadlines and overdue escalation", 2, "V", "V", "`workflow.overdue-approvals`"),
  c("M09-3", m9, "Administrative requests lifecycle", 2, "V", "V", "`workflows`; route audit"),
  c("M09-4", m9, "Formal acting appointments (original holder, acting holder, position, scope, authoriser, dates, delegated actions, history)", 3, "N", "N", "approval delegations exist; no acting-appointment model at baseline"),
  // ── 10 Fleet ──
  c("M10-1", m10, "Vehicle register, documentation, service history (no GPS or movement)", 3, "V", "V", "`fleet.ts`; route audit"),
  c("M10-2", m10, "Maintenance workflow and reminders", 2, "V", "V", "`fleet.maintenance-reminders`"),
  c("M10-3", m10, "Production registration format", 1, "B", "B", "format refused until configured", { blocker: "Service identifier formats (X05)" }),
  // ── 11 Assets and stores ──
  c("M11-1", m11, "General asset register, custody, inspection, disposal, reconciliation", 3, "V", "V", "`extensions`; route audit"),
  c("M11-2", m11, "General stores: items, ledger, requisitions, approval, issue, reorder automation", 3, "V", "V", "`three-tier-roles` (stores)"),
  // ── 12 Dashboards and reports ──
  c("M12-1", m12, "31 role-specific dashboards with live, scoped SQL figures", 3, "V", "V", "tier verification documents; `three-tier-roles`"),
  c("M12-2", m12, "Reports: figures equal SQL; saved views; schedules; CSV, .xlsx, PDF", 3, "V", "V", "`reports`, `report-schedules`"),
  c("M12-3", m12, "Command and reporting dashboards for the command chain (Part 8)", 3, "N", "N", "not developed at baseline"),
  // ── 13 Notifications ──
  c("M13-1", m13, "In-application notifications, preferences, tasks; 16 reminder jobs", 3, "V", "V", "`notifications`, `automation-platform`"),
  c("M13-2", m13, "Directive and report notifications and reminders (Part 12)", 2, "N", "N", "not developed at baseline"),
  // ── 14 Audit ──
  c("M14-1", m14, "Hash-chained append-only audit; verification", 3, "V", "V", "`audit-chain`; `npm run verify:audit`"),
  c("M14-2", m14, "Before/after values, approval references, refused access audited", 3, "V", "V", "`transactions`"),
  c("M14-3", m14, "Audit explorer, record history, security events (paged)", 2, "V", "V", "`paging`"),
  c("M14-4", m14, "Off-host / WORM audit storage and central logging", 2, "B", "B", "", { blocker: "Production infrastructure (X01)" }),
  // ── 15 Platform ──
  c("M15-1", m15, "Health, settings, jobs console, backups with tamper detection, restore drills", 3, "V", "V", "`automation-platform`"),
  c("M15-2", m15, "Environments, production baseline seed, first-Superadmin setup, release record", 3, "V", "V", "`release`, `production-setup`, `identifiers`"),
  c("M15-3", m15, "Production hosting, TLS, least-privilege DB account, monitoring", 3, "B", "B", "`DEPLOYMENT_READINESS.md`", { blocker: "Production infrastructure (X01)" }),
  // ── 16 Scheduling ──
  c("M16-1", m16, "Non-sensitive administrative events; derived dates; tasks; reminders", 3, "V", "V", "`scheduling-correspondence`; admin-records journey"),
  c("M16-2", m16, "Personnel availability shown in scheduling (derived from disposition)", 2, "P:0.5", "P:0.5", "availability exists as disposition status in the registry; not presented in the calendar"),
  // ── 17 Correspondence ──
  c("M17-1", m17, "Register, assign, progress, file; RESTRICTED handling; history", 3, "V", "V", "`scheduling-correspondence`, `transactions`"),
  c("M17-2", m17, "PDF documents with structural screening; download sandboxed", 2, "V", "V", "security probes; `scheduling-correspondence`"),
  c("M17-3", m17, "Malware scanning before production document storage", 2, "B", "B", "", { blocker: "Scanner and information-security decision (DEC-068, X04)" }),

  // ── Command and reporting (new direction, Parts 4–13) ──
  c("C-01", CMD, "IG represented as the highest command authority; DIG Operations reports to the IG; other DIG offices subordinate and outside the Operations chain", 3, "P:0.2", "P:0.2", "baseline: role catalogue orders IG above DIG in name only; no command model", { roles: "IG, DIG Operations" }),
  c("C-02", CMD, "Command positions separate from roles; appointments of users to positions with history", 3, "N", "N", "", { validate: true }),
  c("C-03", CMD, "Configurable reporting relationships (primary command, primary reporting, parallel reporting, administrative coordination) with dates, authorising reference and history", 3, "N", "N", "", { validate: true }),
  c("C-04", CMD, "Reporting-loop prevention", 2, "N", "N", ""),
  c("C-05", CMD, "Directives: authority validated against the command relationship; downward only; unique reference; categories distinct", 3, "N", "N", ""),
  c("C-06", CMD, "Directive lifecycle: acknowledge, assign/forward to the next level, progress, completion reported, consolidated status, closure, history", 3, "N", "N", ""),
  c("C-07", CMD, "Status reports upward to the designated superior: submit, acknowledge, review, return, resubmit, forward, close", 3, "N", "N", ""),
  c("C-08", CMD, "Parallel reporting: one report, one reference, several recipients with separate acknowledgement and review records", 3, "N", "N", ""),
  c("C-09", CMD, "Mobile Unit chain Constable → Sergeant → Inspector → Chief Inspector (Section/Platoon Commander) → Area Commander, and the Area Commander's two channels", 3, "N", "N", "", { validate: true }),
  c("C-10", CMD, "Acting appointments and delegated authority with expiry restoring ordinary authority", 3, "N", "N", ""),
  c("C-11", CMD, "Conflicting tasking flagged and referred to the common superior; decision recorded; no automatic precedence", 3, "N", "N", ""),
  c("C-12", CMD, "Command pages and dashboards for the roles in Part 8", 3, "N", "N", ""),
  c("C-13", CMD, "Automations: routing, reminders, overdue escalation, acting expiry", 2, "N", "N", ""),
  c("C-14", CMD, "Security: visibility limited to issuer/recipient chain; technical and liaison roles excluded; refusals audited", 3, "N", "N", ""),
  c("C-15", CMD, "Integration: directives and reports referencing manpower requests, assignments and transfers without exposing sensitive data", 2, "N", "N", ""),
  c("C-16", CMD, "Tests A–J", 3, "N", "N", ""),
  c("C-17", CMD, "Access for appointment holders without an application role (Inspector, Sergeant, Constable, Area Commander)", 2, "N", "N", "requires an owner decision: the 31-role catalogue has no role for these ranks", { validate: true }),

  // ── Cross-cutting ──
  c("X-01", XC, "Server-side authorisation and scope in every domain function; route audit with 0 server errors", 3, "V", "V", "route audit"),
  c("X-02", XC, "CSP with per-request nonce, secure headers, CSRF via server actions, injection-safe SQL", 3, "V", "V", "`csp` tests; security probes"),
  c("X-03", XC, "Accessibility WCAG 2.2 AA automated rules on every role's dashboard, Help and v0.9/v0.10 pages", 2, "V", "V", "`e2e/accessibility*.spec.ts`"),
  c("X-04", XC, "Manual accessibility audit with assistive technology", 1, "N", "N", "not performed"),
  c("X-05", XC, "Reflow 320–1024 px for every page in every role's navigation", 2, "V", "V", "`e2e/reflow.spec.ts`"),
  c("X-06", XC, "Load baseline on the production build within provisional budgets", 2, "V", "V", "`npm run test:load`"),
  c("X-07", XC, "CI: type check, lint, tests on MariaDB, dependency audit, build", 2, "P:1:0.5", "P:1:0.5", "pipeline defined and each step passes locally; a run on GitHub has not been observed from here"),
  c("X-08", XC, "Independent penetration test and DPIA", 3, "B", "B", "", { blocker: "Assessor and production-configured environment (X03)" }),
  c("X-09", XC, "Liaison updates refuse a lost concurrent update (no orphan history)", 2, "P:0.8:0.8", "V", "baseline: version condition present but row count not checked; fixed 27 Nov (`guarded`), `liaison` › concurrency test"),
  c("X-10", XC, "Institutional approval and deployment authorisation", 3, "B", "B", "`INSTITUTIONAL_APPROVAL_STATUS.md`", { blocker: "Service decision (X06)" }),
];

/** Roles in the command chain that the directive gives command pages (Part 8). */
export const COMMAND_ROLES = ["INSPECTOR_GENERAL", "DIG_OPERATIONS", "COMMISSIONER_OPS_HQ", "DEPUTY_COMMISSIONER_OPS_HQ", "DIVISION_STAFF_I", "DIVISION_STAFF_II",
  "FORMATION_COMMANDING_OFFICER", "DEPUTY_DIVISION_COMMANDER", "FORMATION_OPS_STAFF_ADMIN", "OC_DISTRICT", "OPS_OFFICER_DISTRICT", "DEPUTY_OC_DISTRICT", "OIC_STATION_GD",
  "STATION_INSPECTOR_GD", "STATION_ADMIN_STORES"];
