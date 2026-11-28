/**
 * Action-level permission catalogue and the FOUR-LEVEL 31-ROLE catalogue (owner directive 27 Nov 2026, DEC-072;
 * extends the 27-role catalogue of DEC-049 with four Police Intelligence Officer liaison roles).
 *
 * The 31 roles are the only ACTIVE role configuration. Any other role definition (including the superseded
 * 41-role catalogue) is RETIRED by bootstrap.syncCatalogue: no permission, removed from assignment options,
 * active assignments revoked and flagged for authorised reassignment, history kept.
 *
 * The four liaison roles hold the restricted liaison.* namespace only: administrative metadata (references,
 * units, dates, status, routing). It grants no access to intelligence content, which ZPS-OMS cannot store, and
 * none to personnel, manpower, roster or assignment registers (DEC-073).
 * Permissions are never inferred from rank; approval authority additionally requires a recorded
 * delegation and a BUSINESS role at the delegating unit (policy.approvalUnitFor).
 *
 * Coverage:
 *   UNIT     - records owned by the assignment's org unit only.
 *   SUBTREE  - the assignment's unit and every descendant (org_unit_closure).
 *   NATIONAL - every unit, but ONLY when the assignment is held at Service HQ; elsewhere SUBTREE.
 */

export const PERMISSIONS = {
  // Dashboards
  "dashboard.national.view": "View national aggregate dashboard",
  "dashboard.division.view": "View own provincial division dashboard",
  "dashboard.formation.view": "View own formation dashboard",
  "dashboard.district.view": "View own district command dashboard",
  "dashboard.station.view": "View own police station dashboard",
  "dashboard.unit.view": "View own unit (post, department, company, detachment, platoon, section) dashboard",
  // M01 Organisation registry
  "org.view": "View organisation directory",
  "org.propose": "Propose an organisational change",
  "tenant.view": "View tenants (administrative environments) and their organisational coverage",
  "tenant.manage": "Provision tenants and assign formation structures to them",
  // Approval authority is NOT a role permission: see policy.canApprove (delegation + business assignment).
  // M02 Identity and access
  "user.view": "View user accounts and assignments",
  "user.provision": "Provision a user account",
  "user.suspend": "Suspend or reactivate a user account",
  "user.deactivate": "Deactivate a user account",
  "grant.assign": "Assign a role + organisational scope",
  "grant.revoke": "Revoke a role assignment",
  "delegation.grant": "Record an approved delegation of approval authority",
  "delegation.revoke": "Revoke a delegation",
  "accessreview.manage": "Open and decide access recertification reviews",
  "user.support": "Technical account support within scope: temporary password, unlock, end sessions",
  // M03 Administrative requests
  "request.view": "View administrative requests",
  "request.create": "Create a draft administrative request",
  "request.edit": "Edit own draft or returned request",
  "request.submit": "Submit a request for review",
  "request.assign": "Assign a submitted request to a processor (moves to Under Review)",
  "request.cancel": "Cancel a draft/submitted/returned request",
  "request.progress": "Start work on, and complete, an approved request",
  "request.close": "Close a completed request",
  "request.reopen": "Reopen a closed request through controlled reopening",
  // M04 Fleet
  "fleet.view": "View vehicle register",
  "fleet.manage": "Create and edit vehicle administrative records",
  "maintenance.view": "View maintenance requests",
  "maintenance.create": "Raise a maintenance request",
  "maintenance.process": "Validate, refer to workshop, record progress and completion",
  "maintenance.verify": "Verify completed maintenance and close",
  "service.record": "Record vehicle service history",
  // M05 Assets
  "asset.view": "View general asset register",
  "asset.register": "Register an asset in an approved category",
  "asset.custody": "Issue, return and transfer assets",
  "asset.inspect": "Record inspection / condition",
  "asset.dispose": "Record approved disposal",
  // M06 Reports
  "report.view": "View management reports",
  "report.export": "Export an approved report definition (audited)",
  // M10 Audit and security
  "audit.view": "Search audit events",
  "audit.export": "Export audit evidence",
  "security.view": "View security events and access-control activity",
  // M11 Platform
  "platform.view": "View system health and configuration",
  "platform.configure": "Change non-security application settings",
  "platform.operate": "Run automation jobs and review job and backup status (technical operations)",
  "health.view": "View system health indicators for the assigned scope",
  "workflow.view": "View workflow definitions",
  "workflow.configure": "Publish new versions of manpower approval chains (audited; in-flight requests keep their version)",
  // Personnel registry
  "personnel.view": "View personnel registers within scope",
  "personnel.register": "Register a personnel record",
  "personnel.edit": "Correct personnel details and record home-unit membership changes",
  "personnel.verify": "Verify personnel records",
  "personnel.export": "Export authorised personnel registers (audited)",
  // Manpower requests, contributions and rosters
  "manpower.view": "View manpower requests and contribution requirements",
  "manpower.create": "Originate, edit and submit manpower requests",
  "manpower.review": "Review manpower requests, route contribution requirements and accept or return contributions",
  "manpower.contribute": "Prepare and submit a unit's personnel contribution",
  "roster.view": "View consolidated rosters",
  "roster.build": "Build, amend and submit roster versions",
  "roster.review": "Record roster review",
  "roster.export": "Print and export rosters (audited)",
  // Duty areas, assignments, transfers, tenure and disposition
  "area.view": "View operational (administrative duty) areas",
  "area.manage": "Create and maintain operational areas",
  "assignment.view": "View the assignment register",
  "assignment.propose": "Propose assignments and raise tenure exceptions",
  "assignment.transfer": "Initiate and withdraw transfers between operational areas",
  "assignment.renew": "Put assignments forward for review and renewal",
  "assignment.receive": "Accept transfers into a receiving area",
  "disposition.change": "Record disposition status changes",
  // General stores (non-sensitive consumables only; firearms, ammunition and sensitive equipment are not representable)
  "stores.view": "View general store items, stock balances, transactions and requisitions",
  "stores.manage": "Maintain store items; record receipts, issues, returns and adjustments",
  "stores.requisition": "Raise and submit stores requisitions for own unit",
  "stores.approve": "Approve or reject stores requisitions (requires a business role; never self-approval)",
  // Module 16 — administrative scheduling (non-sensitive; no locations, patrols or deployments) (DEC-068)
  "schedule.view": "View the administrative calendar: events and dated items of units in scope",
  "schedule.manage": "Schedule, cancel and complete non-sensitive administrative events",
  // Module 17 — administrative correspondence (DEC-068)
  "correspondence.view": "View the administrative correspondence register (RESTRICTED records need correspondence.manage)",
  "correspondence.register": "Register incoming and outgoing correspondence and attach screened PDF documents",
  "correspondence.manage": "Assign, file and manage correspondence, including RESTRICTED records",
  // Intelligence-liaison ADMINISTRATION (roles 07, 19, 30, 31; DEC-073). Metadata only: no content exists to view.
  "liaison.metadata.view": "View liaison administrative metadata (references, units, dates, status) within scope",
  "liaison.metadata.create": "Record a liaison administrative reference for own organisation unit",
  "liaison.metadata.update_own": "Correct the metadata of a draft liaison record for which the user is responsible",
  "liaison.submission.acknowledge": "Record receipt and acknowledgement of liaison submissions routed to a unit in scope",
  "liaison.reference.route": "Submit and route liaison references through approved organisational channels",
  "liaison.status.view": "View liaison submission and acknowledgement status and summaries within scope",
  "liaison.audit.view": "View the liaison administrative transaction history within scope",
  // Training and professional development (DIG Administration portfolio; DEC-086). Administration of the national
  // catalogue, sessions, needs decisions and nomination approvals belongs to the DIG Administration OFFICE (appointment).
  "training.view": "View training needs, courses, sessions and nominations within scope",
  "training.need.submit": "Submit training needs for units in scope",
  "training.nominate": "Nominate officers in scope for training sessions",
  "training.recommend": "Recommend or not recommend nominations from units in scope",
  "training.deliver": "Record attendance and results for sessions delivered by units in scope",
  // Operations administration (DIG Operations portfolio; DEC-087): administrative records only — no tactical plans,
  // locations, routes, deployments, intelligence or investigation content.
  "opsadmin.view": "View the operations administration register (public order, illegal mining) within scope",
  "opsadmin.manage": "Register and update operations administration records for units in scope",
  "secservice.view": "View partner organisations and mining security service agreements within scope",
  "secservice.manage": "Maintain mining security service agreements and service reports for units in scope",
  // Command and reporting (DEC-074): the STRUCTURE only. Instruction and reporting authority comes from appointments to
  // command offices (domain/command.ts), never from a role permission.
  "command.structure.view": "View command offices, appointments and reporting relationships within scope",
  "command.structure.manage": "Record command offices, appointments and reporting relationships (loops refused)",
  // Public Contact page inbox
  "contact.view": "View messages submitted through the public Contact page",
  "contact.manage": "Mark public contact messages as handled",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Coverage = "UNIT" | "SUBTREE" | "NATIONAL";

export const UNIT_TYPES = ["SERVICE_HQ", "HQ_OFFICE", "PROVINCIAL_DIVISION", "DISTRICT", "STATION", "POST", "FORMATION", "DEPARTMENT", "COMPANY", "DETACHMENT", "PLATOON", "SECTION"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

/** The authoritative four-level catalogue (31 roles, owner directive 27 Nov 2026). Codes are stable identifiers. */
export type RoleCode =
  // Tier 1 — National Headquarters (7)
  | "SUPERADMIN" | "INSPECTOR_GENERAL" | "DIG_OPERATIONS" | "COMMISSIONER_OPS_HQ" | "DEPUTY_COMMISSIONER_OPS_HQ" | "HQ_TECH_ADMIN" | "NATIONAL_INTEL_OFFICER"
  // Tier 2 — Provincial Divisions and Unit Formations (12)
  | "UNIT_TECH_ADMIN" | "FORMATION_COMMANDING_OFFICER" | "DEPUTY_DIVISION_COMMANDER" | "DIVISION_STAFF_I" | "DIVISION_STAFF_II" | "COMPANY_COMMANDER"
  | "SECTION_HEAD" | "FORMATION_OPS_STAFF_ADMIN" | "QM_STORES_OFFICER" | "PRINCIPAL_ARMOURER" | "MTO_OIC" | "DIVISION_INTEL_OFFICER"
  // Tier 3 — District Commands and Police Stations (11)
  | "DISTRICT_TECH_ADMIN" | "OC_DISTRICT" | "DEPUTY_OC_DISTRICT" | "OPS_OFFICER_DISTRICT" | "DEPUTY_OPS_OFFICER_DISTRICT" | "STORES_OFFICER_DISTRICT"
  | "STATION_TECH_ADMIN" | "OIC_STATION_GD" | "STATION_INSPECTOR_GD" | "STATION_ADMIN_STORES" | "DISTRICT_INTEL_OFFICER"
  // Tier 4 — Section / Police Station (1)
  | "INTEL_OFFICER";

/** Reusable working-panel sets shown below each role's command overview. */
export type DashboardKind =
  | "NATIONAL_EXECUTIVE" | "NATIONAL_COORDINATION" | "OPS_STAFF_WORKSPACE" | "PERSONNEL_ADMIN" | "ASSIGNMENT_ADMIN" | "DIVISION_COMMAND" | "DIVISION_STAFF_OPS"
  | "DISTRICT_COMMAND" | "STATION" | "FORMATION_COMMAND" | "FORMATION_ADMIN" | "UNIT_COMMAND" | "FLEET" | "ASSETS" | "AUDIT" | "PLATFORM" | "SECURITY"
  | "ORG_REGISTRY" | "MANAGEMENT" | "MY_WORKSPACE" | "TECH_LOCAL" | "STORES" | "LIAISON";

export type Tier = 1 | 2 | 3 | 4;
export type RoleLevel = "NATIONAL" | "DIVISION_FORMATION" | "DISTRICT_STATION" | "SECTION_STATION";

/** Official tier names (directive Part 4). */
export const TIER_NAMES: Record<Tier, string> = {
  1: "National Headquarters",
  2: "Provincial Divisions and Unit Formations",
  3: "District Commands and Police Stations",
  4: "Section / Police Station",
};

export interface RoleDef {
  code: RoleCode;
  /** Directive catalogue number (1–31). */
  no: number;
  tier: Tier;
  level: RoleLevel;
  name: string;
  /** Official back-office (workspace) name. */
  backOffice: string;
  /** Organisational context the role applies to. */
  context: string;
  category: "BUSINESS" | "FUNCTIONAL" | "AUDIT" | "TECHNICAL" | "SECURITY";
  dashboard: DashboardKind;
  dashboardTitle: string;
  description: string;
  requiresExpiry?: boolean;
  assignableTo: UnitType[];
  permissions: Partial<Record<Permission, Coverage>>;
}

const U: Coverage = "UNIT";
const S: Coverage = "SUBTREE";
const N: Coverage = "NATIONAL";
const HQ: UnitType[] = ["SERVICE_HQ"];
const DIV_OR_FORMATION: UnitType[] = ["PROVINCIAL_DIVISION", "FORMATION"];
const STATION_OR_POST: UnitType[] = ["STATION", "POST"];

/** Permission bundles. Approval authority is never a permission: it needs a delegation (policy.approvalUnitFor). */
const P = {
  personnelRead: (c: Coverage) => ({ "personnel.view": c }) as const,
  personnelAdmin: (c: Coverage) => ({ "personnel.view": c, "personnel.register": c, "personnel.edit": c }) as const,
  contributor: (c: Coverage) => ({ "manpower.view": c, "manpower.contribute": c, "roster.view": c }) as const,
  oversight: (c: Coverage) => ({ "personnel.view": c, "manpower.view": c, "roster.view": c, "area.view": c, "assignment.view": c }) as const,
  requests: (c: Coverage) => ({ "request.view": c, "request.create": c, "request.edit": c, "request.submit": c, "request.cancel": c }) as const,
  storesOps: (c: Coverage) => ({ "stores.view": c, "stores.manage": c, "asset.view": c, "asset.register": c, "asset.custody": c, "asset.inspect": c }) as const,
  localTech: (c: Coverage) => ({ "user.view": c, "user.support": c, "health.view": c }) as const,
  /** The complete restricted liaison template at one coverage. Nothing outside liaison.* is ever added to it. */
  liaison: (c: Coverage) => ({
    "liaison.metadata.view": c, "liaison.metadata.create": c, "liaison.metadata.update_own": c, "liaison.submission.acknowledge": c,
    "liaison.reference.route": c, "liaison.status.view": c, "liaison.audit.view": c,
  }) as const,
};
const LIAISON_BOUNDARY = "Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.";

export const ROLES: RoleDef[] = [
  // ── TIER 1 — NATIONAL HEADQUARTERS ───────────────────────────────────────
  {
    code: "SUPERADMIN", no: 1, tier: 1, level: "NATIONAL",
    name: "Superadmin", backOffice: "ZPS-OMS Superadmin Dashboard", context: "National Headquarters (platform-wide)",
    category: "TECHNICAL", dashboard: "PLATFORM", dashboardTitle: "ZPS-OMS Superadmin Dashboard",
    description: "Overall technical platform administration and national tenant configuration. No access to personnel records, sensitive operational information or business approval authority.",
    assignableTo: HQ,
    permissions: {
      "user.view": N, "user.provision": N, "user.suspend": N, "user.deactivate": N, "user.support": N, "grant.assign": N, "grant.revoke": N, "delegation.grant": N, "delegation.revoke": N,
      "accessreview.manage": N, "platform.view": N, "platform.configure": N, "platform.operate": N, "health.view": N, "tenant.view": N, "tenant.manage": N,
      "org.view": N, "org.propose": N, "workflow.view": U, "security.view": N, "contact.view": N, "contact.manage": N,
    },
  },
  {
    code: "INSPECTOR_GENERAL", no: 2, tier: 1, level: "NATIONAL",
    name: "Inspector General of Police (IG)", backOffice: "Inspector General Executive Dashboard", context: "National Headquarters",
    category: "BUSINESS", dashboard: "NATIONAL_EXECUTIVE", dashboardTitle: "Inspector General Executive Dashboard",
    description: "National executive oversight of authorised ZPS-OMS management information. Consolidated summaries, not individual personnel records; decisions only where a delegation is configured.",
    assignableTo: HQ,
    permissions: { "training.view": N, "opsadmin.view": N, "secservice.view": N, "command.structure.view": N, "schedule.view": N, "correspondence.view": N, "dashboard.national.view": N, "org.view": N, "manpower.view": N, "report.view": N, "report.export": N, "workflow.view": U, "audit.view": N, "audit.export": N },
  },
  {
    code: "DIG_OPERATIONS", no: 3, tier: 1, level: "NATIONAL",
    name: "Deputy Inspector General of Police - Operations (DIG Operations)", backOffice: "DIG Operations National Executive Dashboard", context: "Office of the DIG Operations, National Headquarters",
    category: "BUSINESS", dashboard: "NATIONAL_EXECUTIVE", dashboardTitle: "DIG Operations National Executive Dashboard",
    description: "National Operations administration, coordination and oversight; approves within configured delegations. No platform technical configuration.",
    assignableTo: HQ,
    permissions: { "training.view": N, "opsadmin.view": N, "opsadmin.manage": N, "secservice.view": N, "secservice.manage": N, "command.structure.view": N, "schedule.view": N, "correspondence.view": N, "correspondence.manage": N,
      "dashboard.national.view": N, "org.view": N, "request.view": U, "report.view": N, "report.export": N, "workflow.view": U, "audit.view": N,
      ...P.oversight(N), "roster.review": N, "roster.export": N, "fleet.view": N, "asset.view": N, "stores.view": N,
    },
  },
  {
    code: "COMMISSIONER_OPS_HQ", no: 4, tier: 1, level: "NATIONAL",
    name: "Commissioner – Operations HQ", backOffice: "Commissioner Operations Headquarters Dashboard", context: "Operations Headquarters",
    category: "BUSINESS", dashboard: "NATIONAL_COORDINATION", dashboardTitle: "Commissioner Operations Headquarters Dashboard",
    description: "Senior administration and coordination of Operations Headquarters business processes. Approval authority only through configured delegations.",
    assignableTo: HQ,
    permissions: { "training.view": N, "training.need.submit": N, "training.nominate": N, "opsadmin.view": N, "opsadmin.manage": N, "secservice.view": N, "secservice.manage": N, "command.structure.view": N, "command.structure.manage": N, "schedule.view": N, "schedule.manage": N, "correspondence.view": N, "correspondence.register": N, "correspondence.manage": N,
      "dashboard.national.view": N, "org.view": N, ...P.requests(U), "request.view": N, "request.assign": N, "request.progress": U, "request.close": N,
      "fleet.view": N, "maintenance.view": N, "asset.view": N, "stores.view": N, "report.view": N, "report.export": N, "workflow.view": U, "workflow.configure": N, "contact.view": N, "contact.manage": N,
      ...P.oversight(N), "personnel.export": N, "manpower.create": U, "manpower.review": N, "roster.build": N, "roster.review": N, "roster.export": N,
      "area.manage": N, "assignment.propose": N, "assignment.transfer": N, "assignment.renew": N, "assignment.receive": N, "disposition.change": N,
    },
  },
  {
    code: "DEPUTY_COMMISSIONER_OPS_HQ", no: 5, tier: 1, level: "NATIONAL",
    name: "Deputy Commissioner – Operations HQ", backOffice: "Deputy Commissioner Operations HQ Dashboard", context: "Operations Headquarters",
    category: "BUSINESS", dashboard: "OPS_STAFF_WORKSPACE", dashboardTitle: "Deputy Commissioner Operations HQ Dashboard",
    description: "Day-to-day administrative coordination and processing within Operations Headquarters; recommends or approves only where delegated.",
    assignableTo: HQ,
    permissions: { "training.view": N, "training.nominate": N, "opsadmin.view": N, "opsadmin.manage": N, "secservice.view": N, "command.structure.view": N, "schedule.view": N, "schedule.manage": N, "correspondence.view": N, "correspondence.register": N, "correspondence.manage": N,
      "dashboard.national.view": N, "org.view": N, "report.view": N, "report.export": N,
      ...P.oversight(N), ...P.personnelAdmin(N), "personnel.verify": N, "personnel.export": N, "manpower.create": U, "manpower.review": N,
      "roster.build": N, "roster.review": N, "roster.export": N, "assignment.propose": N, "assignment.transfer": N, "assignment.renew": N,
    },
  },
  {
    code: "HQ_TECH_ADMIN", no: 6, tier: 1, level: "NATIONAL",
    name: "System Administrator – HQ Tech", backOffice: "Headquarters Technical Administration Dashboard", context: "National Headquarters (technical)",
    category: "TECHNICAL", dashboard: "SECURITY", dashboardTitle: "Headquarters Technical Administration Dashboard",
    description: "Institutionally scoped technical administration at Headquarters: health, database, jobs, backups, authentication monitoring and account support. No personnel access, approvals or tenant provisioning.",
    assignableTo: HQ,
    permissions: {
      "platform.view": N, "platform.operate": N, "health.view": N, "security.view": N, "user.view": N, "user.support": N, "user.suspend": N,
      "grant.revoke": N, "delegation.revoke": N, "accessreview.manage": N, "org.view": N,
    },
  },
  {
    code: "NATIONAL_INTEL_OFFICER", no: 7, tier: 1, level: "NATIONAL",
    name: "National Police Intelligence Officer", backOffice: "National Police Intelligence Officer Dashboard", context: "National Headquarters (intelligence liaison administration)",
    category: "FUNCTIONAL", dashboard: "LIAISON", dashboardTitle: "National Police Intelligence Officer Dashboard",
    description: `Authorised national-level intelligence liaison administration within the permitted ZPS-OMS information boundary. ${LIAISON_BOUNDARY}`,
    assignableTo: HQ, permissions: { ...P.liaison(N) },
  },
  // ── TIER 2 — PROVINCIAL DIVISIONS AND UNIT FORMATIONS ────────────────────
  {
    code: "UNIT_TECH_ADMIN", no: 8, tier: 2, level: "DIVISION_FORMATION",
    name: "Divisional/Unit System Administrator (Tech)", backOffice: "Division and Unit Technical Administration", context: "Assigned Provincial Division or Unit/Formation only",
    category: "TECHNICAL", dashboard: "TECH_LOCAL", dashboardTitle: "Division and Unit Technical Administration",
    description: "Technical accounts and access support within the assigned Division or Formation; refers higher-level issues to HQ Tech. No personnel, assignment or approval authority.",
    assignableTo: DIV_OR_FORMATION, permissions: { ...P.localTech(S), "org.view": N },
  },
  {
    code: "FORMATION_COMMANDING_OFFICER", no: 9, tier: 2, level: "DIVISION_FORMATION",
    name: "Formation Commanding Officer", backOffice: "Formation Command Headquarters", context: "Provincial Division or Unit/Formation (commanding officer)",
    category: "BUSINESS", dashboard: "FORMATION_COMMAND", dashboardTitle: "Formation Command Headquarters",
    description: "Oversight of the assigned Division or Formation and everything under it. Approves only within configured delegations; no access to unrelated formations or Provinces.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "training.view": S, "training.need.submit": S, "training.nominate": S, "training.recommend": S, "training.deliver": S, "opsadmin.view": S, "opsadmin.manage": S, "secservice.view": S, "secservice.manage": S, "command.structure.view": S, "schedule.view": S, "correspondence.view": S, "correspondence.manage": S,
      "dashboard.division.view": U, "dashboard.formation.view": U, "org.view": N, "request.view": U, "request.assign": U, "request.close": U, "request.reopen": U,
      "fleet.view": U, "maintenance.view": U, "asset.view": S, "stores.view": S, "stores.approve": S, "report.view": S, "report.export": S,
      ...P.oversight(S), "roster.review": S,
    },
  },
  {
    code: "DEPUTY_DIVISION_COMMANDER", no: 10, tier: 2, level: "DIVISION_FORMATION",
    name: "Deputy Division Commander", backOffice: "Deputy Division Commander Dashboard", context: "Provincial Division or Unit/Formation (deputy)",
    category: "BUSINESS", dashboard: "DIVISION_COMMAND", dashboardTitle: "Deputy Division Commander Dashboard",
    description: "Supports the commanding officer: monitors performance, reviews outstanding matters and Staff I/II workflows; approves only where separately delegated.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "training.view": S, "training.recommend": S, "opsadmin.view": S, "secservice.view": S, "command.structure.view": S, "schedule.view": S, "correspondence.view": S, "correspondence.manage": S, "dashboard.division.view": U, "org.view": N, "request.view": U, "report.view": S, "report.export": S, ...P.oversight(S), "roster.review": S, "roster.export": S, "personnel.export": S, "stores.view": S },
  },
  {
    code: "DIVISION_STAFF_I", no: 11, tier: 2, level: "DIVISION_FORMATION",
    name: "Division Senior Staff Officer – Operations (Staff I)", backOffice: "Division Senior Staff Officer – Operations", context: "Provincial Division or Unit/Formation",
    category: "BUSINESS", dashboard: "DIVISION_STAFF_OPS", dashboardTitle: "Division Senior Staff Officer – Operations",
    description: "Coordinates Divisional Operations administration: manpower requirements, contributions, rosters, assignments, transfers, tenure and renewals; supervises Staff II. No approval outside delegations.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "training.view": S, "training.need.submit": S, "training.nominate": S, "opsadmin.view": S, "opsadmin.manage": S, "secservice.view": S, "secservice.manage": S, "command.structure.view": S, "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S, "correspondence.manage": S,
      "dashboard.division.view": U, "org.view": N, ...P.requests(U), "request.progress": U, "fleet.view": U, "maintenance.view": U, "maintenance.create": U, "asset.view": U,
      "report.view": S, "report.export": S, ...P.oversight(S), ...P.contributor(S), ...P.personnelAdmin(S), "personnel.verify": S, "personnel.export": S,
      "manpower.create": U, "manpower.review": S, "roster.build": S, "roster.export": S, "area.manage": S,
      "assignment.propose": S, "assignment.transfer": S, "assignment.renew": S, "assignment.receive": S, "disposition.change": S, "stores.requisition": S,
    },
  },
  {
    code: "DIVISION_STAFF_II", no: 12, tier: 2, level: "DIVISION_FORMATION",
    name: "Deputy Division Staff Officer – Operations (Staff II)", backOffice: "Deputy Division Staff Officer – Operations", context: "Provincial Division or Unit/Formation",
    category: "BUSINESS", dashboard: "ASSIGNMENT_ADMIN", dashboardTitle: "Deputy Division Staff Officer – Operations",
    description: "Assists Staff I: prepares personnel information, compiles draft lists, verifies submissions, prepares transfer and renewal documentation. No Staff I approval authority.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "training.view": S, "training.nominate": S, "opsadmin.view": S, "opsadmin.manage": S, "secservice.view": S, "command.structure.view": S, "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S,
      "dashboard.division.view": U, "org.view": N, ...P.personnelAdmin(S), "personnel.verify": S, ...P.contributor(S), "manpower.create": U, "roster.build": S,
      "area.view": S, "assignment.view": S, "assignment.propose": S, "assignment.transfer": S, "assignment.renew": S, "report.view": S,
    },
  },
  {
    code: "COMPANY_COMMANDER", no: 13, tier: 2, level: "DIVISION_FORMATION",
    name: "Company Commander", backOffice: "Company Command Administration", context: "Company within a Unit/Formation",
    category: "BUSINESS", dashboard: "UNIT_COMMAND", dashboardTitle: "Company Command Administration",
    description: "Company administration: personnel register, contributions and submissions for the company and its platoons and sections. No access to other companies.",
    assignableTo: ["COMPANY"],
    permissions: { "training.view": S, "training.need.submit": S, "training.nominate": S, "schedule.view": S, "correspondence.view": S, "dashboard.unit.view": U, ...P.contributor(S), ...P.personnelAdmin(S), "assignment.view": S, "report.view": S },
  },
  {
    code: "SECTION_HEAD", no: 14, tier: 2, level: "DIVISION_FORMATION",
    name: "Section Head", backOffice: "Section Administration Dashboard", context: "Section (or department, detachment or platoon where configured)",
    category: "BUSINESS", dashboard: "UNIT_COMMAND", dashboardTitle: "Section Administration Dashboard",
    description: "Section administrative records: selects personnel from the registry, prepares and verifies manpower contributions, tracks requests.",
    assignableTo: ["SECTION", "PLATOON", "DETACHMENT", "DEPARTMENT"],
    permissions: { "training.view": S, "training.nominate": S, "schedule.view": S, "dashboard.unit.view": U, ...P.contributor(S), ...P.personnelAdmin(S) },
  },
  {
    code: "FORMATION_OPS_STAFF_ADMIN", no: 15, tier: 2, level: "DIVISION_FORMATION",
    name: "Formation Operations Staff Administrator", backOffice: "Formation Operations Staff Administration", context: "Unit/Formation",
    category: "BUSINESS", dashboard: "FORMATION_ADMIN", dashboardTitle: "Formation Operations Staff Administration",
    description: "Formation-level Operations administration: contributions, rosters, assignment documentation and subordinate submissions. No commanding-officer approval authority.",
    assignableTo: ["FORMATION"],
    permissions: { "training.view": S, "training.deliver": S, "opsadmin.view": S, "command.structure.view": S, "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S,
      "dashboard.formation.view": U, "org.view": N, ...P.requests(U), "request.progress": U, "fleet.view": U, "maintenance.view": U, "maintenance.create": U, "asset.view": U, "report.view": S,
      ...P.oversight(S), ...P.personnelAdmin(S), ...P.contributor(S), "manpower.create": U, "manpower.review": S, "roster.build": S, "roster.export": S,
      "assignment.propose": S, "assignment.transfer": S, "stores.requisition": S,
    },
  },
  {
    code: "QM_STORES_OFFICER", no: 16, tier: 2, level: "DIVISION_FORMATION",
    name: "Divisional Quarter Masters Stores Officer", backOffice: "Divisional Quarter Masters and Stores Administration", context: "Provincial Division or Unit/Formation stores",
    category: "FUNCTIONAL", dashboard: "STORES", dashboardTitle: "Divisional Quarter Masters and Stores Administration",
    description: "General stores and non-sensitive assets: receipts, issue and return, requisitions, custody and reconciliation. Firearms, ammunition and sensitive equipment are excluded.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "schedule.view": S, ...P.storesOps(S), "asset.dispose": S, "report.view": U, "report.export": U },
  },
  {
    code: "PRINCIPAL_ARMOURER", no: 17, tier: 2, level: "DIVISION_FORMATION",
    name: "Divisional Principal Armourer", backOffice: "Divisional Armourer Administration", context: "Provincial Division or Unit/Formation",
    category: "FUNCTIONAL", dashboard: "MY_WORKSPACE", dashboardTitle: "Divisional Armourer Administration",
    description: "Role-specific workspace for explicitly approved NON-SENSITIVE administrative functions only (administrative requests, tasks, notifications). No firearms, ammunition or armoury records exist in ZPS-OMS.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { ...P.requests(U) },
  },
  {
    code: "MTO_OIC", no: 18, tier: 2, level: "DIVISION_FORMATION",
    name: "Divisional MTO Officer-in-Charge", backOffice: "Divisional Motor Transport Administration", context: "Provincial Division or Unit/Formation transport",
    category: "FUNCTIONAL", dashboard: "FLEET", dashboardTitle: "Divisional Motor Transport Administration",
    description: "General fleet administration: vehicle register, documentation, maintenance, workshop referrals and service history. No GPS, movement or deployment information.",
    assignableTo: DIV_OR_FORMATION,
    permissions: { "schedule.view": S, "fleet.view": U, "fleet.manage": U, "maintenance.view": U, "maintenance.create": U, "maintenance.process": U, "maintenance.verify": U, "service.record": U, "report.view": U, "report.export": U },
  },
  {
    code: "DIVISION_INTEL_OFFICER", no: 19, tier: 2, level: "DIVISION_FORMATION",
    name: "Division Police Intelligence Officer", backOffice: "Division Police Intelligence Officer Dashboard", context: "Assigned Provincial Division or Unit/Formation only",
    category: "FUNCTIONAL", dashboard: "LIAISON", dashboardTitle: "Division Police Intelligence Officer Dashboard",
    description: `Division-level intelligence liaison administration, restricted to the assigned Province or Unit/Formation; no cross-divisional access. ${LIAISON_BOUNDARY}`,
    assignableTo: DIV_OR_FORMATION, permissions: { ...P.liaison(S) },
  },
  // ── TIER 3 — DISTRICT COMMANDS AND POLICE STATIONS ───────────────────────
  {
    code: "DISTRICT_TECH_ADMIN", no: 20, tier: 3, level: "DISTRICT_STATION",
    name: "District System Administrator (Tech)", backOffice: "District Technical Administration", context: "Assigned District Command only",
    category: "TECHNICAL", dashboard: "TECH_LOCAL", dashboardTitle: "District Technical Administration",
    description: "Permitted technical functions and account support within the assigned District. No personnel-record or assignment access.",
    assignableTo: ["DISTRICT"], permissions: { ...P.localTech(S), "org.view": N },
  },
  {
    code: "OC_DISTRICT", no: 21, tier: 3, level: "DISTRICT_STATION",
    name: "Officer Commanding — District", backOffice: "District Command Dashboard", context: "District Command",
    category: "BUSINESS", dashboard: "DISTRICT_COMMAND", dashboardTitle: "District Command Dashboard",
    description: "District oversight: stations and posts, personnel, contributions, assignments and stores. Approves only within configured delegations; no access to other Districts.",
    assignableTo: ["DISTRICT"],
    permissions: { "training.view": S, "training.need.submit": S, "training.nominate": S, "training.recommend": S, "opsadmin.view": S, "opsadmin.manage": S, "secservice.view": S, "command.structure.view": S, "schedule.view": S, "correspondence.view": S, "correspondence.manage": S, "dashboard.district.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "personnel.verify": S, "report.view": S, "stores.view": S, "stores.approve": S, "asset.view": S },
  },
  {
    code: "DEPUTY_OC_DISTRICT", no: 22, tier: 3, level: "DISTRICT_STATION",
    name: "Deputy OC — District", backOffice: "Deputy District Commander Dashboard", context: "District Command",
    category: "BUSINESS", dashboard: "DISTRICT_COMMAND", dashboardTitle: "Deputy District Commander Dashboard",
    description: "Assists the District Commander; reviews subordinate submissions and processes delegated matters. Does not inherit the OC's approvals.",
    assignableTo: ["DISTRICT"],
    permissions: { "training.view": S, "command.structure.view": S, "schedule.view": S, "correspondence.view": S, "correspondence.manage": S, "dashboard.district.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "assignment.propose": S, "report.view": S },
  },
  {
    code: "OPS_OFFICER_DISTRICT", no: 23, tier: 3, level: "DISTRICT_STATION",
    name: "Operations Officer — District", backOffice: "District Operations Officer Workspace", context: "District Command",
    category: "BUSINESS", dashboard: "DISTRICT_COMMAND", dashboardTitle: "District Operations Officer Workspace",
    description: "District Operations administration: manpower requests, station contributions, district lists, assignment records and reviews. No tactical deployment, patrol scheduling or tracking.",
    assignableTo: ["DISTRICT"],
    permissions: { "training.view": S, "opsadmin.view": S, "opsadmin.manage": S, "secservice.view": S, "command.structure.view": S, "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S, "correspondence.manage": S,
      "dashboard.district.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), ...P.personnelAdmin(S), "personnel.verify": S, "manpower.create": U, "manpower.review": S,
      "roster.build": S, "assignment.propose": S, "assignment.transfer": S, "assignment.receive": S, "disposition.change": S, "report.view": S, "stores.requisition": S,
    },
  },
  {
    code: "DEPUTY_OPS_OFFICER_DISTRICT", no: 24, tier: 3, level: "DISTRICT_STATION",
    name: "Deputy Operations Officer — District", backOffice: "Deputy District Operations Workspace", context: "District Command",
    category: "BUSINESS", dashboard: "PERSONNEL_ADMIN", dashboardTitle: "Deputy District Operations Workspace",
    description: "Assists the Operations Officer: prepares submissions, verifies contributions, maintains workflow records. No Operations Officer approval authority.",
    assignableTo: ["DISTRICT"],
    permissions: { "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S, "dashboard.district.view": U, "org.view": N, ...P.personnelAdmin(S), "personnel.export": S, ...P.contributor(S), "roster.build": S, "area.view": S, "assignment.view": S, "assignment.propose": S, "assignment.transfer": S, "report.view": S },
  },
  {
    code: "STORES_OFFICER_DISTRICT", no: 25, tier: 3, level: "DISTRICT_STATION",
    name: "Stores Officer — District", backOffice: "District Stores Administration", context: "District Command stores",
    category: "FUNCTIONAL", dashboard: "STORES", dashboardTitle: "District Stores Administration",
    description: "General stores records, requisitions, receipts and issues, and non-sensitive asset custody for the District. Sensitive equipment is excluded.",
    assignableTo: ["DISTRICT"], permissions: { "schedule.view": S, ...P.storesOps(S), "report.view": U },
  },
  {
    code: "STATION_TECH_ADMIN", no: 26, tier: 3, level: "DISTRICT_STATION",
    name: "Police Station System Administrator", backOffice: "Police Station Technical Administration", context: "Assigned Police Station only",
    category: "TECHNICAL", dashboard: "TECH_LOCAL", dashboardTitle: "Police Station Technical Administration",
    description: "Permitted technical functions and local account support for the assigned Station. No personnel management or assignment decisions.",
    assignableTo: STATION_OR_POST, permissions: { ...P.localTech(S), "org.view": N },
  },
  {
    code: "OIC_STATION_GD", no: 27, tier: 3, level: "DISTRICT_STATION",
    name: "Officer-in-Charge — Police Station GD", backOffice: "Police Station General Duties Administration", context: "Police Station (and its posts)",
    category: "BUSINESS", dashboard: "STATION", dashboardTitle: "Police Station General Duties Administration",
    description: "Station-level general duties administrative oversight: personnel, contributions, submissions; approves specifically delegated matters.",
    assignableTo: STATION_OR_POST,
    permissions: { "training.view": S, "training.nominate": S, "schedule.view": S, "correspondence.view": S, "correspondence.manage": S, "dashboard.station.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "personnel.verify": S, "report.view": S, "stores.view": S, "stores.approve": S, "asset.view": S },
  },
  {
    code: "STATION_INSPECTOR_GD", no: 28, tier: 3, level: "DISTRICT_STATION",
    name: "Station Inspector — Police Station GD", backOffice: "Station Inspector Operations Administration", context: "Police Station or Police Post",
    category: "BUSINESS", dashboard: "STATION", dashboardTitle: "Station Inspector Operations Administration",
    description: "Supports Station administration: personnel register, contributions and submissions; delegated supervisory functions only. Does not inherit OIC approvals.",
    assignableTo: STATION_OR_POST,
    permissions: { "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S, "dashboard.station.view": U, "org.view": N, ...P.personnelAdmin(S), ...P.contributor(S), "assignment.view": S, "report.view": S },
  },
  {
    code: "STATION_ADMIN_STORES", no: 29, tier: 3, level: "DISTRICT_STATION",
    name: "Police Station Administrator (Stores and Admin)", backOffice: "Police Station Stores and Administration", context: "Police Station",
    category: "FUNCTIONAL", dashboard: "STORES", dashboardTitle: "Police Station Stores and Administration",
    description: "Station administrative records, general stores and non-sensitive assets: issue and return, requisitions, reconciliation. No sensitive equipment, firearms or ammunition.",
    assignableTo: STATION_OR_POST, permissions: { "schedule.view": S, "schedule.manage": S, "correspondence.view": S, "correspondence.register": S, ...P.storesOps(S), "stores.requisition": S, ...P.requests(U), "report.view": U },
  },
  {
    code: "DISTRICT_INTEL_OFFICER", no: 30, tier: 3, level: "DISTRICT_STATION",
    name: "District Police Intelligence Officer", backOffice: "District Police Intelligence Officer Dashboard", context: "Assigned District Command only",
    category: "FUNCTIONAL", dashboard: "LIAISON", dashboardTitle: "District Police Intelligence Officer Dashboard",
    description: `District-level restricted intelligence liaison administration for the assigned District; no other District, Province or national records. ${LIAISON_BOUNDARY}`,
    assignableTo: ["DISTRICT"], permissions: { ...P.liaison(S) },
  },
  // ── TIER 4 — SECTION / POLICE STATION ────────────────────────────────────
  {
    code: "INTEL_OFFICER", no: 31, tier: 4, level: "SECTION_STATION",
    name: "Police Intelligence Officer", backOffice: "Police Intelligence Officer Dashboard", context: "Assigned Section or Police Station only",
    category: "FUNCTIONAL", dashboard: "LIAISON", dashboardTitle: "Police Intelligence Officer Dashboard",
    description: `Restricted local intelligence liaison administration for the assigned Section or Police Station only (one role profile; scope follows the assignment). No access to the parent District or Division. ${LIAISON_BOUNDARY}`,
    assignableTo: ["SECTION", "STATION"], permissions: { ...P.liaison(U) },
  },
];

export const ROLE_BY_CODE = Object.fromEntries(ROLES.map((r) => [r.code, r])) as Record<RoleCode, RoleDef>;

/** Default landing order when a user holds several roles (the active context can be switched). */
export const DASHBOARD_PRECEDENCE: RoleCode[] = [
  "INSPECTOR_GENERAL", "DIG_OPERATIONS", "COMMISSIONER_OPS_HQ", "DEPUTY_COMMISSIONER_OPS_HQ",
  "FORMATION_COMMANDING_OFFICER", "DEPUTY_DIVISION_COMMANDER", "DIVISION_STAFF_I", "DIVISION_STAFF_II", "FORMATION_OPS_STAFF_ADMIN", "COMPANY_COMMANDER", "SECTION_HEAD",
  "OC_DISTRICT", "DEPUTY_OC_DISTRICT", "OPS_OFFICER_DISTRICT", "DEPUTY_OPS_OFFICER_DISTRICT", "OIC_STATION_GD", "STATION_INSPECTOR_GD",
  "QM_STORES_OFFICER", "STORES_OFFICER_DISTRICT", "STATION_ADMIN_STORES", "MTO_OIC", "PRINCIPAL_ARMOURER",
  "NATIONAL_INTEL_OFFICER", "DIVISION_INTEL_OFFICER", "DISTRICT_INTEL_OFFICER", "INTEL_OFFICER",
  "SUPERADMIN", "HQ_TECH_ADMIN", "UNIT_TECH_ADMIN", "DISTRICT_TECH_ADMIN", "STATION_TECH_ADMIN",
];

/** The superseded 41-role catalogue (DEC-033). Retired: history only, never any permission. */
export const RETIRED_ROLE_CODES = [
  "PLATFORM_ADMIN", "SECURITY_ADMIN", "ORG_REGISTRY_ADMIN", "DIG_OPS_EXECUTIVE", "HQ_OPS_COORDINATOR", "HQ_OPS_STAFF", "NATIONAL_PERSONNEL_ADMIN", "NATIONAL_ASSIGNMENT_ADMIN", "PROVINCIAL_COMMANDER", "DIVISION_STAFF_OPS", "PROVINCIAL_PERSONNEL_OFFICER", "PROVINCIAL_ASSIGNMENT_COORDINATOR", "PROVINCIAL_REPORTING_OFFICER", "DISTRICT_COMMANDER", "DISTRICT_OPS_OFFICER", "DISTRICT_PERSONNEL_OFFICER", "DISTRICT_ASSIGNMENT_COORDINATOR", "STATION_COMMANDER", "STATION_OPS_ADMIN", "STATION_PERSONNEL_OFFICER", "POST_SUPERVISOR", "FORMATION_COMMANDER", "FORMATION_ADMIN_OFFICER", "DEPARTMENT_HEAD", "COMPANY_COMMANDER", "COMPANY_ADMIN_OFFICER", "DETACHMENT_COMMANDER", "DETACHMENT_ADMIN_OFFICER", "PLATOON_COMMANDER", "PLATOON_ADMIN_OFFICER", "SECTION_COMMANDER", "SECTION_ADMIN_OFFICER", "MANPOWER_ORIGINATOR", "ROSTER_COORDINATOR", "ASSIGNMENT_APPROVER", "RECEIVING_AREA_OFFICER", "FLEET_OFFICER", "ASSET_CUSTODIAN", "INTERNAL_AUDITOR", "READ_ONLY_MANAGEMENT", "OPERATIONS_STAFF",
] as const;

/** Approved non-sensitive request categories (demonstration allowlist, DEC-011). */
export const REQUEST_CATEGORIES = [
  { code: "OFFICE_SUPPLIES", name: "Office stores and consumables", description: "Routine stationery and office consumables." },
  { code: "FACILITY_REPAIR", name: "Office facility repair", description: "Minor repairs to administrative office premises." },
  { code: "ICT_SUPPORT", name: "General ICT support", description: "Non-sensitive office ICT peripheral or support needs." },
  { code: "ADMIN_RETURN", name: "Administrative return / report submission", description: "Submission of a routine administrative return to a higher office." },
] as const;

/** Approved asset category allowlist (demonstration). Sensitive classes are not representable. */
export const ASSET_CATEGORIES = [
  { code: "OFFICE_FURNITURE", name: "Office furniture" },
  { code: "ICT_PERIPHERAL", name: "ICT peripherals (non-communications)" },
  { code: "OFFICE_EQUIPMENT", name: "General office equipment" },
  { code: "GENERAL_STORES", name: "General stores (non-controlled)" },
] as const;

/** Terms that must never appear as categories or free-text-driven classes. */
export const PROHIBITED_TERMS = [
  "firearm", "rifle", "pistol", "ammunition", "armoury", "armory", "weapon", "grenade",
  "radio", "body armour", "body armor", "tactical", "surveillance", "informant", "informer", "covert", "patrol", "gps",
];

export const SERVICE_TYPES = ["Routine service", "Brake and tyre check", "Electrical fault", "Body repair", "Engine repair", "Licence/inspection renewal"] as const;
