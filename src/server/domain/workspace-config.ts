/**
 * Role → back-office workspace DATA for the 27 roles (navigation, headline figures, quick actions).
 * Dependency-free (type imports only) so documentation generators can read it; see workspaces.ts.
 */
import type { Permission, RoleCode } from "./catalogue";

export interface WorkspaceNavGroup { label: string; items: string[] }
export interface QuickAction { href: string; label: string; any: Permission[] }
export interface Workspace {
  role: RoleCode;
  backOffice: string;
  /** One line under the back-office name: what this workspace is for. */
  purpose: string;
  /** Headline figure keys (overview.kpi). */
  kpis: string[];
  nav: WorkspaceNavGroup[];
  quick: QuickAction[];
}

// Reusable navigation sections (hrefs resolve to NAV_ITEMS in src/lib/nav.ts).
const OVERVIEW = { label: "Overview", items: ["/app", "/app/tasks", "/app/approvals"] };
const PERSONNEL_OPS = { label: "Personnel and manpower", items: ["/app/personnel", "/app/manpower", "/app/manpower/contributions", "/app/rosters", "/app/assignments", "/app/transfers", "/app/areas"] };
const CONTRIBUTIONS = { label: "Personnel and contributions", items: ["/app/personnel", "/app/manpower/contributions", "/app/manpower", "/app/rosters", "/app/assignments"] };
const ADMIN = { label: "Administration", items: ["/app/requests", "/app/fleet", "/app/fleet/maintenance", "/app/assets", "/app/stores", "/app/stores/requisitions"] };
const REPORTS = { label: "Reports", items: ["/app/reports"] };
const ORG = { label: "Organisation", items: ["/app/org", "/app/org/changes"] };
const OVERSIGHT = { label: "Oversight", items: ["/app/audit", "/app/audit/history", "/app/workflows"] };
const TECH_LOCAL = { label: "Technical administration", items: ["/app/admin/users", "/app/admin/roles"] };

const Q = {
  manpower: { href: "/app/manpower/new", label: "New manpower request", any: ["manpower.create"] as Permission[] },
  personnel: { href: "/app/personnel/new", label: "Register personnel", any: ["personnel.register"] as Permission[] },
  contribute: { href: "/app/manpower/contributions", label: "Prepare contribution", any: ["manpower.contribute"] as Permission[] },
  approvals: { href: "/app/approvals", label: "Review approvals", any: [] as Permission[] },
  reports: { href: "/app/reports", label: "Open reports", any: ["report.view"] as Permission[] },
  request: { href: "/app/requests/new", label: "New administrative request", any: ["request.create"] as Permission[] },
  requisition: { href: "/app/stores/requisitions/new", label: "New stores requisition", any: ["stores.requisition"] as Permission[] },
  stores: { href: "/app/stores", label: "Stores and stock", any: ["stores.view"] as Permission[] },
  storesQueue: { href: "/app/stores/requisitions?status=APPROVED", label: "Requisitions to issue", any: ["stores.manage"] as Permission[] },
  users: { href: "/app/admin/users", label: "Account support", any: ["user.view"] as Permission[] },
  security: { href: "/app/security", label: "Security events", any: ["security.view"] as Permission[] },
  health: { href: "/app/platform", label: "System health", any: ["platform.view"] as Permission[] },
  tenants: { href: "/app/org/tenants", label: "Tenants", any: ["tenant.view"] as Permission[] },
  org: { href: "/app/org/changes", label: "Propose structure change", any: ["org.propose"] as Permission[] },
  audit: { href: "/app/audit", label: "Audit explorer", any: ["audit.view"] as Permission[] },
  vehicles: { href: "/app/fleet", label: "Vehicle register", any: ["fleet.view"] as Permission[] },
  maintenance: { href: "/app/fleet/maintenance", label: "Maintenance requests", any: ["maintenance.view"] as Permission[] },
  transfers: { href: "/app/transfers", label: "Transfers", any: ["assignment.view"] as Permission[] },
};

const BASE_CONFIG: Omit<Workspace, "backOffice">[] = [
  // ── Tier 1 ──
  { role: "SUPERADMIN", purpose: "Platform configuration, tenants, organisation structure and access administration. No personnel records or business approvals.",
    kpis: ["tenants", "divisions", "orgUnits", "usersActive", "jobFailures", "orgChangesPending"],
    nav: [OVERVIEW, { label: "Platform", items: ["/app/platform", "/app/org/tenants", "/app/workflows"] }, { label: "Organisation", items: ["/app/org", "/app/org/changes"] },
      { label: "Access", items: ["/app/admin/users", "/app/admin/roles", "/app/admin/reviews", "/app/security"] }, { label: "Public site", items: ["/app/messages"] }],
    quick: [Q.users, Q.tenants, Q.org, Q.health, Q.security] },
  { role: "INSPECTOR_GENERAL", purpose: "National executive summaries of authorised management information, with audit oversight.",
    kpis: ["divisions", "orgUnits", "nationalPersonnel", "nationalAssignments", "openManpower", "pendingDecisions"],
    nav: [OVERVIEW, { label: "National summaries", items: ["/app/manpower", "/app/reports"] }, ORG, OVERSIGHT],
    quick: [Q.reports, Q.approvals, Q.audit] },
  { role: "DIG_OPERATIONS", purpose: "National Operations administration, coordination and oversight; decisions within configured delegations.",
    kpis: ["divisions", "personnel", "activeAssignments", "openManpower", "reviewsDue", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, { label: "Administration", items: ["/app/requests", "/app/fleet", "/app/assets", "/app/stores"] }, REPORTS, ORG, OVERSIGHT],
    quick: [Q.approvals, Q.reports, Q.transfers, Q.audit] },
  { role: "COMMISSIONER_OPS_HQ", purpose: "Senior coordination of Operations Headquarters business processes.",
    kpis: ["divisions", "personnel", "activeAssignments", "openManpower", "contributionsToReview", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, ADMIN, REPORTS, ORG, { label: "Configuration", items: ["/app/workflows", "/app/messages"] }],
    quick: [Q.manpower, Q.approvals, Q.request, Q.reports] },
  { role: "DEPUTY_COMMISSIONER_OPS_HQ", purpose: "Day-to-day coordination and processing within Operations Headquarters.",
    kpis: ["openManpower", "contributionsToReview", "rostersApproved", "personnel", "unverified", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, REPORTS, ORG],
    quick: [Q.manpower, Q.personnel, Q.approvals, Q.reports] },
  { role: "HQ_TECH_ADMIN", purpose: "Headquarters technical administration: health, jobs, authentication monitoring and account support.",
    kpis: ["usersActive", "sessions", "locked", "failedLogins24h", "denied24h", "jobFailures"],
    nav: [OVERVIEW, { label: "Technical operations", items: ["/app/platform", "/app/security"] }, { label: "Accounts and access", items: ["/app/admin/users", "/app/admin/roles", "/app/admin/reviews"] }, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.users, Q.security, Q.health] },
  // ── Tier 2 ──
  { role: "UNIT_TECH_ADMIN", purpose: "Technical account support within your Division or Formation. Higher-level issues go to HQ Tech.",
    kpis: ["usersActive", "locked", "failedLogins24h", "myTasks"], nav: [OVERVIEW, TECH_LOCAL, { label: "Organisation", items: ["/app/org"] }], quick: [Q.users] },
  { role: "FORMATION_COMMANDING_OFFICER", purpose: "Command oversight of your Division or Formation and everything under it.",
    kpis: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "storesAwaitingDecision", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, ADMIN, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.approvals, Q.reports, Q.stores] },
  { role: "DEPUTY_DIVISION_COMMANDER", purpose: "Support to the commanding officer: performance, outstanding matters and Staff I/II workflows.",
    kpis: ["orgUnits", "personnel", "activeAssignments", "openManpower", "reviewsDue", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, { label: "Administration", items: ["/app/requests", "/app/stores"] }, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.approvals, Q.reports, Q.transfers] },
  { role: "DIVISION_STAFF_I", purpose: "Divisional Operations administration: requirements, contributions, rosters, assignments, transfers and renewals.",
    kpis: ["openManpower", "contributionsToReview", "rostersApproved", "activeAssignments", "reviewsDue", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, ADMIN, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.manpower, Q.personnel, Q.requisition, Q.reports] },
  { role: "DIVISION_STAFF_II", purpose: "Preparation and verification support for Staff I: personnel information, draft lists and documentation.",
    kpis: ["personnel", "unverified", "contributionsDue", "activeAssignments", "transfersOpen", "myTasks"],
    nav: [OVERVIEW, PERSONNEL_OPS, REPORTS], quick: [Q.personnel, Q.manpower, Q.contribute] },
  { role: "COMPANY_COMMANDER", purpose: "Company administration: personnel register, contributions and submissions for your company.",
    kpis: ["personnel", "available", "activeAssignments", "contributionsDue", "pendingDecisions", "myTasks"],
    nav: [OVERVIEW, CONTRIBUTIONS, REPORTS], quick: [Q.contribute, Q.personnel] },
  { role: "SECTION_HEAD", purpose: "Section administrative records: personnel selection and manpower contributions.",
    kpis: ["personnel", "available", "contributionsDue", "myTasks", "unread"],
    nav: [OVERVIEW, CONTRIBUTIONS], quick: [Q.contribute, Q.personnel] },
  { role: "FORMATION_OPS_STAFF_ADMIN", purpose: "Formation-level Operations administration and subordinate submissions.",
    kpis: ["openManpower", "contributionsDue", "personnel", "activeAssignments", "pendingDecisions", "myTasks"],
    nav: [OVERVIEW, PERSONNEL_OPS, ADMIN, REPORTS, { label: "Organisation", items: ["/app/org"] }], quick: [Q.manpower, Q.personnel, Q.request, Q.requisition] },
  { role: "QM_STORES_OFFICER", purpose: "Divisional general stores and non-sensitive assets: stock, requisitions, custody and reconciliation.",
    kpis: ["storesItems", "storesLow", "storesToIssue", "assets", "notInspected", "reconciliationsOpen"],
    nav: [OVERVIEW, { label: "Stores", items: ["/app/stores", "/app/stores/requisitions"] }, { label: "Assets", items: ["/app/assets"] }, REPORTS],
    quick: [Q.stores, Q.storesQueue, { href: "/app/assets/reconciliation", label: "Asset reconciliation", any: ["asset.custody"] }] },
  { role: "PRINCIPAL_ARMOURER", purpose: "Approved non-sensitive administrative functions only. No firearms, ammunition or armoury records exist in ZPS-OMS.",
    kpis: ["myRequests", "myTasks", "unread"], nav: [OVERVIEW, { label: "Administration", items: ["/app/requests"] }], quick: [Q.request] },
  { role: "MTO_OIC", purpose: "Divisional motor transport administration: vehicle register, documentation, maintenance and service history.",
    kpis: ["vehicles", "maintenanceOpen", "serviceDue", "pendingDecisions", "myTasks", "unread"],
    nav: [OVERVIEW, { label: "Motor transport", items: ["/app/fleet", "/app/fleet/maintenance"] }, REPORTS], quick: [Q.vehicles, Q.maintenance, Q.reports] },
  // ── Tier 3 ──
  { role: "DISTRICT_TECH_ADMIN", purpose: "Technical account support within your District.",
    kpis: ["usersActive", "locked", "failedLogins24h", "myTasks"], nav: [OVERVIEW, TECH_LOCAL, { label: "Organisation", items: ["/app/org"] }], quick: [Q.users] },
  { role: "OC_DISTRICT", purpose: "District oversight: stations and posts, personnel, contributions, assignments and stores.",
    kpis: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "storesAwaitingDecision", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, { label: "Administration", items: ["/app/assets", "/app/stores", "/app/stores/requisitions"] }, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.approvals, Q.stores, Q.reports] },
  { role: "DEPUTY_OC_DISTRICT", purpose: "Assists the District Commander; reviews subordinate submissions.",
    kpis: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "pendingDecisions", "myTasks"],
    nav: [OVERVIEW, PERSONNEL_OPS, REPORTS, { label: "Organisation", items: ["/app/org"] }], quick: [Q.approvals, Q.contribute] },
  { role: "OPS_OFFICER_DISTRICT", purpose: "District Operations administration: requests, station contributions, district lists and assignment records.",
    kpis: ["openManpower", "contributionsToReview", "contributionsDue", "activeAssignments", "transfersOpen", "pendingDecisions"],
    nav: [OVERVIEW, PERSONNEL_OPS, { label: "Administration", items: ["/app/stores/requisitions"] }, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.manpower, Q.personnel, Q.requisition] },
  { role: "DEPUTY_OPS_OFFICER_DISTRICT", purpose: "Preparation and verification of district submissions and workflow records.",
    kpis: ["personnel", "unverified", "contributionsDue", "activeAssignments", "myTasks", "unread"],
    nav: [OVERVIEW, PERSONNEL_OPS, REPORTS], quick: [Q.personnel, Q.contribute] },
  { role: "STORES_OFFICER_DISTRICT", purpose: "District general stores: stock, receipts and issues, requisitions and non-sensitive custody.",
    kpis: ["storesItems", "storesLow", "storesToIssue", "storesAwaitingDecision", "assets", "myTasks"],
    nav: [OVERVIEW, { label: "Stores", items: ["/app/stores", "/app/stores/requisitions"] }, { label: "Assets", items: ["/app/assets"] }, REPORTS], quick: [Q.stores, Q.storesQueue] },
  { role: "STATION_TECH_ADMIN", purpose: "Technical account support for your Police Station.",
    kpis: ["usersActive", "locked", "failedLogins24h", "myTasks"], nav: [OVERVIEW, TECH_LOCAL, { label: "Organisation", items: ["/app/org"] }], quick: [Q.users] },
  { role: "OIC_STATION_GD", purpose: "Station general duties administrative oversight: personnel, contributions and submissions.",
    kpis: ["personnel", "available", "activeAssignments", "contributionsDue", "storesAwaitingDecision", "pendingDecisions"],
    nav: [OVERVIEW, CONTRIBUTIONS, { label: "Administration", items: ["/app/assets", "/app/stores", "/app/stores/requisitions"] }, REPORTS, { label: "Organisation", items: ["/app/org"] }],
    quick: [Q.approvals, Q.contribute, Q.stores] },
  { role: "STATION_INSPECTOR_GD", purpose: "Station administration support: personnel register, contributions and submissions.",
    kpis: ["personnel", "available", "unverified", "contributionsDue", "myTasks", "unread"],
    nav: [OVERVIEW, CONTRIBUTIONS, REPORTS, { label: "Organisation", items: ["/app/org"] }], quick: [Q.personnel, Q.contribute] },
  { role: "STATION_ADMIN_STORES", purpose: "Station administrative records, general stores and non-sensitive assets.",
    kpis: ["storesItems", "storesLow", "myRequisitions", "assets", "myRequests", "myTasks"],
    nav: [OVERVIEW, { label: "Stores and assets", items: ["/app/stores", "/app/stores/requisitions", "/app/assets"] }, { label: "Administration", items: ["/app/requests"] }, REPORTS],
    quick: [Q.requisition, Q.stores, Q.request] },
];

/**
 * Modules 16 and 17: the "Administrative records" section for roles holding schedule.* or correspondence.*
 * (technical roles and role 16 hold neither). Kept equal to the catalogue by tests/three-tier-roles.test.ts;
 * the layout also filters each entry by permission.
 */
export const ADMIN_RECORDS_ROLES: RoleCode[] = [
  "INSPECTOR_GENERAL", "DIG_OPERATIONS", "COMMISSIONER_OPS_HQ", "DEPUTY_COMMISSIONER_OPS_HQ", "FORMATION_COMMANDING_OFFICER", "DEPUTY_DIVISION_COMMANDER",
  "DIVISION_STAFF_I", "DIVISION_STAFF_II", "COMPANY_COMMANDER", "SECTION_HEAD", "FORMATION_OPS_STAFF_ADMIN", "QM_STORES_OFFICER", "MTO_OIC",
  "OC_DISTRICT", "DEPUTY_OC_DISTRICT", "OPS_OFFICER_DISTRICT", "DEPUTY_OPS_OFFICER_DISTRICT", "STORES_OFFICER_DISTRICT", "OIC_STATION_GD", "STATION_INSPECTOR_GD", "STATION_ADMIN_STORES",
];
const ADMIN_RECORDS = { label: "Administrative records", items: ["/app/calendar", "/app/correspondence"] };
export const WORKSPACE_CONFIG: Omit<Workspace, "backOffice">[] = BASE_CONFIG.map((w) => (ADMIN_RECORDS_ROLES.includes(w.role) ? { ...w, nav: [...w.nav, ADMIN_RECORDS] } : w));

/** Tile labels as shown on dashboards (alternatives separated by " / "); a test keeps them equal to overview.ts. */
export const KPI_LABELS: Record<string, string> = {
  tenants: "Tenants",
  divisions: "Provincial Divisions",
  orgUnits: "Organisation units / Units in my command",
  personnel: "Personnel records",
  available: "Available at home unit",
  unverified: "Awaiting verification",
  activeAssignments: "Active assignments",
  reviewsDue: "Reviews due",
  transfersOpen: "Transfers in progress",
  openManpower: "Open manpower requests",
  contributionsDue: "Contributions due",
  contributionsToReview: "Contributions to review",
  rostersApproved: "Approved personnel lists",
  pendingDecisions: "Pending approvals",
  myTasks: "My open tasks",
  unread: "Unread notifications",
  myRequests: "My open requests",
  vehicles: "Vehicles",
  maintenanceOpen: "Open maintenance",
  serviceDue: "Services due (14 days)",
  assets: "General assets",
  notInspected: "Inspection overdue",
  reconciliationsOpen: "Open reconciliations",
  auditEvents24h: "Audit events (24 h)",
  denied24h: "Denied actions (24 h)",
  exports30d: "Exports (30 days)",
  usersActive: "Active user accounts / Accounts in my scope",
  sessions: "Active sessions",
  locked: "Locked accounts",
  failedLogins24h: "Failed sign-ins (24 h)",
  nationalPersonnel: "Personnel (national summary) / Personnel records",
  nationalAssignments: "Active assignments (national) / Active assignments",
  storesItems: "Store items",
  storesLow: "Reorder needed",
  storesToIssue: "Requisitions to issue",
  storesAwaitingDecision: "Stores requisitions pending",
  myRequisitions: "My open requisitions",
  jobFailures: "Automation failures (24 h)",
  orgChangesPending: "Structure changes pending",
};
