/**
 * Action-level permission catalogue and PROPOSED role catalogue.
 *
 * Status: proposed starting matrix for institutional review (DEC-007).
 * It is NOT an approved Zambia Police Service delegation. Role names are
 * configurable labels; permissions are never inferred from rank.
 *
 * Coverage:
 *   UNIT     – applies only to records owned by the org unit named on the
 *              user's role assignment (no inheritance to child units).
 *   SUBTREE  – applies to the assignment's unit and every descendant unit
 *              (resolved through org_unit_closure).
 *   NATIONAL – applies to every unit, but ONLY when the assignment is held at
 *              Service HQ. A NATIONAL permission on a non-HQ assignment is
 *              evaluated as SUBTREE of that unit.
 *
 * The 41 roles follow the Master Development Directive §11 catalogue (DEC-033).
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
  "workflow.view": "View workflow definitions",
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
  "assignment.propose": "Propose assignments, initiate transfers, raise exceptions and request renewals",
  "assignment.receive": "Accept transfers into a receiving area",
  "disposition.change": "Record disposition status changes",
  // Public Contact page inbox
  "contact.view": "View messages submitted through the public Contact page",
  "contact.manage": "Mark public contact messages as handled",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Coverage = "UNIT" | "SUBTREE" | "NATIONAL";

export const UNIT_TYPES = ["SERVICE_HQ", "HQ_OFFICE", "PROVINCIAL_DIVISION", "DISTRICT", "STATION", "POST", "FORMATION", "DEPARTMENT", "COMPANY", "DETACHMENT", "PLATOON", "SECTION"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export type RoleCode =
  // 11.1 National
  | "PLATFORM_ADMIN" | "SECURITY_ADMIN" | "ORG_REGISTRY_ADMIN" | "DIG_OPS_EXECUTIVE" | "HQ_OPS_COORDINATOR" | "HQ_OPS_STAFF" | "NATIONAL_PERSONNEL_ADMIN" | "NATIONAL_ASSIGNMENT_ADMIN"
  // 11.2 Provincial
  | "PROVINCIAL_COMMANDER" | "DIVISION_STAFF_OPS" | "PROVINCIAL_PERSONNEL_OFFICER" | "PROVINCIAL_ASSIGNMENT_COORDINATOR" | "PROVINCIAL_REPORTING_OFFICER"
  // 11.3 District
  | "DISTRICT_COMMANDER" | "DISTRICT_OPS_OFFICER" | "DISTRICT_PERSONNEL_OFFICER" | "DISTRICT_ASSIGNMENT_COORDINATOR"
  // 11.4 Station, 11.5 Post
  | "STATION_COMMANDER" | "STATION_OPS_ADMIN" | "STATION_PERSONNEL_OFFICER" | "POST_SUPERVISOR"
  // 11.6 Formation
  | "FORMATION_COMMANDER" | "FORMATION_ADMIN_OFFICER" | "DEPARTMENT_HEAD" | "COMPANY_COMMANDER" | "COMPANY_ADMIN_OFFICER" | "DETACHMENT_COMMANDER" | "DETACHMENT_ADMIN_OFFICER"
  | "PLATOON_COMMANDER" | "PLATOON_ADMIN_OFFICER" | "SECTION_COMMANDER" | "SECTION_ADMIN_OFFICER"
  // 11.7 Functional
  | "MANPOWER_ORIGINATOR" | "ROSTER_COORDINATOR" | "ASSIGNMENT_APPROVER" | "RECEIVING_AREA_OFFICER" | "FLEET_OFFICER" | "ASSET_CUSTODIAN" | "INTERNAL_AUDITOR" | "READ_ONLY_MANAGEMENT" | "OPERATIONS_STAFF";

export type DashboardKind =
  | "NATIONAL_EXECUTIVE"
  | "NATIONAL_COORDINATION"
  | "OPS_STAFF_WORKSPACE"
  | "PERSONNEL_ADMIN"
  | "ASSIGNMENT_ADMIN"
  | "DIVISION_COMMAND"
  | "DIVISION_STAFF_OPS"
  | "DISTRICT_COMMAND"
  | "STATION"
  | "FORMATION_COMMAND"
  | "FORMATION_ADMIN"
  | "UNIT_COMMAND"
  | "FLEET"
  | "ASSETS"
  | "AUDIT"
  | "PLATFORM"
  | "SECURITY"
  | "ORG_REGISTRY"
  | "MANAGEMENT"
  | "MY_WORKSPACE";

export type RoleLevel = "NATIONAL" | "PROVINCIAL" | "DISTRICT" | "STATION" | "POST" | "FORMATION" | "FUNCTIONAL";

export interface RoleDef {
  code: RoleCode;
  /** Directive §11 catalogue number (1–41). */
  no: number;
  level: RoleLevel;
  name: string;
  category: "BUSINESS" | "FUNCTIONAL" | "AUDIT" | "TECHNICAL" | "SECURITY";
  dashboard: DashboardKind;
  dashboardTitle: string;
  description: string;
  /** Assignments for this role must carry an expiry date. */
  requiresExpiry?: boolean;
  /** Org unit types this role may be assigned to. */
  assignableTo: UnitType[];
  permissions: Partial<Record<Permission, Coverage>>;
}

const U: Coverage = "UNIT";
const S: Coverage = "SUBTREE";
const N: Coverage = "NATIONAL";
const ANY: UnitType[] = [...UNIT_TYPES];

/** Permission bundles reused by several roles. */
const P = {
  personnelRead: (c: Coverage) => ({ "personnel.view": c }) as const,
  personnelAdmin: (c: Coverage) => ({ "personnel.view": c, "personnel.register": c, "personnel.edit": c }) as const,
  contributor: (c: Coverage) => ({ "manpower.view": c, "manpower.contribute": c, "roster.view": c }) as const,
  assignmentAdmin: (c: Coverage) => ({ "personnel.view": c, "area.view": c, "assignment.view": c, "assignment.propose": c, "assignment.receive": c, "disposition.change": c }) as const,
  oversight: (c: Coverage) => ({ "personnel.view": c, "manpower.view": c, "roster.view": c, "area.view": c, "assignment.view": c }) as const,
};

export const ROLES: RoleDef[] = [
  // ── 11.1 National-level roles ────────────────────────────────────────────
  {
    code: "PLATFORM_ADMIN", no: 1, level: "NATIONAL",
    name: "Platform Super Administrator",
    category: "TECHNICAL",
    dashboard: "PLATFORM",
    dashboardTitle: "Platform Administration Workspace",
    description: "Technical configuration, tenant provisioning, approved user provisioning and system health. No access to personnel records and no approval authority.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "user.view": N, "user.provision": N, "user.deactivate": N, "grant.assign": N, "grant.revoke": N, "delegation.grant": N,
      "platform.view": N, "platform.configure": N, "workflow.view": U, "org.view": N, "contact.view": N, "contact.manage": N,
    },
  },
  {
    code: "SECURITY_ADMIN", no: 2, level: "NATIONAL",
    name: "National Security Administrator",
    category: "SECURITY",
    dashboard: "SECURITY",
    dashboardTitle: "Security Administration Workspace",
    description: "Authentication policy, account security, session monitoring, access recertification, suspension and revocation. No routine business approval.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "user.view": N, "user.suspend": N, "grant.revoke": N, "delegation.revoke": N, "accessreview.manage": N, "security.view": N, "audit.view": N, "org.view": N,
    },
  },
  {
    code: "ORG_REGISTRY_ADMIN", no: 3, level: "NATIONAL",
    name: "National Organisation Registry Administrator",
    category: "BUSINESS",
    dashboard: "ORG_REGISTRY",
    dashboardTitle: "Organisation and Formation Administration",
    description: "Maintains the approved organisational directory, tenant structure and relationships through effective-dated proposals. Cannot approve own proposals.",
    assignableTo: ["SERVICE_HQ"],
    permissions: { "org.view": N, "org.propose": N, "area.view": N },
  },
  {
    code: "DIG_OPS_EXECUTIVE", no: 4, level: "NATIONAL",
    name: "DIG Operations Executive / National Operations Approver",
    category: "BUSINESS",
    dashboard: "NATIONAL_EXECUTIVE",
    dashboardTitle: "National Operations Dashboard",
    description: "National oversight and executive approval of manpower, roster and assignment matters where a recorded delegation exists.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "dashboard.national.view": N, "org.view": N, "request.view": U, "report.view": N, "report.export": N, "workflow.view": U,
      ...P.oversight(N), "roster.review": N, "roster.export": N,
    },
  },
  {
    code: "HQ_OPS_COORDINATOR", no: 5, level: "NATIONAL",
    name: "HQ Operations Administrator / Coordinator",
    category: "BUSINESS",
    dashboard: "NATIONAL_COORDINATION",
    dashboardTitle: "National Operations Coordination Workspace",
    description: "National Operations administration, manpower request management and workflow coordination within delegated authority.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "dashboard.national.view": N, "org.view": N,
      "request.view": N, "request.create": U, "request.edit": U, "request.submit": U, "request.assign": N, "request.cancel": U, "request.progress": U, "request.close": N,
      "fleet.view": N, "maintenance.view": N, "asset.view": N, "report.view": N, "report.export": N, "workflow.view": U, "contact.view": N, "contact.manage": N,
      ...P.oversight(N), "manpower.create": U, "manpower.review": N, "roster.build": N, "roster.review": N, "roster.export": N,
      "area.manage": N, "assignment.propose": N, "disposition.change": N, "personnel.export": N,
    },
  },
  {
    code: "HQ_OPS_STAFF", no: 6, level: "NATIONAL",
    name: "HQ Operations Staff / Manpower Planning Officer",
    category: "BUSINESS",
    dashboard: "OPS_STAFF_WORKSPACE",
    dashboardTitle: "Operations Staff Workspace",
    description: "Prepares manpower requests, consolidates contributions, builds rosters, monitors assignment registers and produces administrative reports.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "dashboard.national.view": N, "org.view": N, "report.view": N, "report.export": N,
      ...P.oversight(N), "personnel.export": N, "manpower.create": U, "manpower.review": N, "roster.build": N, "roster.export": N, "assignment.propose": N,
    },
  },
  {
    code: "NATIONAL_PERSONNEL_ADMIN", no: 7, level: "NATIONAL",
    name: "National Personnel Registry Administrator",
    category: "BUSINESS",
    dashboard: "PERSONNEL_ADMIN",
    dashboardTitle: "Personnel Registry Administration",
    description: "Maintains verified personnel master records and authorised organisational memberships nationally.",
    assignableTo: ["SERVICE_HQ"],
    permissions: { "org.view": N, ...P.personnelAdmin(N), "personnel.verify": N, "personnel.export": N, "report.view": N },
  },
  {
    code: "NATIONAL_ASSIGNMENT_ADMIN", no: 8, level: "NATIONAL",
    name: "National Assignment and Disposition Administrator",
    category: "BUSINESS",
    dashboard: "ASSIGNMENT_ADMIN",
    dashboardTitle: "Assignment and Disposition Administration",
    description: "Assignment administration, transfer records, disposition management, tenure reviews and renewal processing.",
    assignableTo: ["SERVICE_HQ"],
    permissions: { "org.view": N, ...P.assignmentAdmin(N), "area.manage": N, "manpower.view": N, "roster.view": N, "report.view": N },
  },
  // ── 11.2 Provincial-level roles ──────────────────────────────────────────
  {
    code: "PROVINCIAL_COMMANDER", no: 9, level: "PROVINCIAL",
    name: "Provincial Division Commander",
    category: "BUSINESS",
    dashboard: "DIVISION_COMMAND",
    dashboardTitle: "Provincial Division Dashboard",
    description: "Oversight of the Provincial Division and its districts, stations and posts. Approves within formally delegated authority (delegation record required).",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: {
      "dashboard.division.view": U, "org.view": N, "request.view": U, "request.assign": U, "request.close": U, "request.reopen": U,
      "fleet.view": U, "maintenance.view": U, "asset.view": U, "report.view": U, "report.export": U,
      ...P.oversight(S), "roster.review": S,
    },
  },
  {
    code: "DIVISION_STAFF_OPS", no: 10, level: "PROVINCIAL",
    name: "Provincial Staff Ops / Provincial Operations Coordinator",
    category: "BUSINESS",
    dashboard: "DIVISION_STAFF_OPS",
    dashboardTitle: "Provincial Operations Staff Workspace",
    description: "Divisional administrative matters, manpower contributions, personnel submissions and divisional rosters. No approval authority unless a delegation is recorded.",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: {
      "dashboard.division.view": U, "org.view": N, "request.view": U, "request.create": U, "request.edit": U, "request.submit": U, "request.cancel": U, "request.progress": U,
      "fleet.view": U, "maintenance.view": U, "maintenance.create": U, "asset.view": U, "report.view": U,
      ...P.oversight(S), ...P.contributor(S), "manpower.create": U, "manpower.review": S, "roster.build": S, "roster.export": S, "assignment.propose": S,
    },
  },
  {
    code: "PROVINCIAL_PERSONNEL_OFFICER", no: 11, level: "PROVINCIAL",
    name: "Provincial Personnel Records Officer",
    category: "BUSINESS",
    dashboard: "PERSONNEL_ADMIN",
    dashboardTitle: "Provincial Personnel Records",
    description: "Maintains approved personnel records and memberships within the assigned Province.",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: { "org.view": N, ...P.personnelAdmin(S), "personnel.verify": S, "personnel.export": S },
  },
  {
    code: "PROVINCIAL_ASSIGNMENT_COORDINATOR", no: 12, level: "PROVINCIAL",
    name: "Provincial Assignment Coordinator",
    category: "BUSINESS",
    dashboard: "ASSIGNMENT_ADMIN",
    dashboardTitle: "Provincial Assignment Coordination",
    description: "Coordinates assignments, transfer requests, status updates and assignment reviews in the Province.",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: { "org.view": N, ...P.assignmentAdmin(S), "area.manage": S },
  },
  {
    code: "PROVINCIAL_REPORTING_OFFICER", no: 13, level: "PROVINCIAL",
    name: "Provincial Reporting Officer",
    category: "BUSINESS",
    dashboard: "MANAGEMENT",
    dashboardTitle: "Provincial Reporting Workspace",
    description: "Prepares Provincial management reports, printable lists and administrative summaries.",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: { "dashboard.division.view": U, "org.view": N, "report.view": U, "report.export": U, ...P.oversight(S), "roster.export": S, "personnel.export": S },
  },
  // ── 11.3 District-level roles ────────────────────────────────────────────
  {
    code: "DISTRICT_COMMANDER", no: 14, level: "DISTRICT",
    name: "District Commander",
    category: "BUSINESS",
    dashboard: "DISTRICT_COMMAND",
    dashboardTitle: "District Command Dashboard",
    description: "Oversight of the District Command, its stations and posts. No access to other districts.",
    assignableTo: ["DISTRICT"],
    permissions: { "dashboard.district.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "report.view": S },
  },
  {
    code: "DISTRICT_OPS_OFFICER", no: 15, level: "DISTRICT",
    name: "District Operations Officer / Staff Ops",
    category: "BUSINESS",
    dashboard: "DISTRICT_COMMAND",
    dashboardTitle: "District Operations Workspace",
    description: "Coordinates administrative matters and personnel contributions within the District.",
    assignableTo: ["DISTRICT"],
    permissions: { "dashboard.district.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "assignment.propose": S, "report.view": S },
  },
  {
    code: "DISTRICT_PERSONNEL_OFFICER", no: 16, level: "DISTRICT",
    name: "District Personnel Records Officer",
    category: "BUSINESS",
    dashboard: "PERSONNEL_ADMIN",
    dashboardTitle: "District Personnel Records",
    description: "Maintains personnel records for the assigned District.",
    assignableTo: ["DISTRICT"],
    permissions: { "org.view": N, ...P.personnelAdmin(S), "personnel.export": S },
  },
  {
    code: "DISTRICT_ASSIGNMENT_COORDINATOR", no: 17, level: "DISTRICT",
    name: "District Assignment Coordinator",
    category: "BUSINESS",
    dashboard: "ASSIGNMENT_ADMIN",
    dashboardTitle: "District Assignment Coordination",
    description: "Processes assignment administration and transfer matters for the District.",
    assignableTo: ["DISTRICT"],
    permissions: { "org.view": N, ...P.assignmentAdmin(S) },
  },
  // ── 11.4 Station / 11.5 Post ─────────────────────────────────────────────
  {
    code: "STATION_COMMANDER", no: 18, level: "STATION",
    name: "Station Commander",
    category: "BUSINESS",
    dashboard: "STATION",
    dashboardTitle: "Police Station Dashboard",
    description: "Oversight of the Police Station and its subordinate posts.",
    assignableTo: ["STATION"],
    permissions: { "dashboard.station.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S) },
  },
  {
    code: "STATION_OPS_ADMIN", no: 19, level: "STATION",
    name: "Station Operations Administrator",
    category: "BUSINESS",
    dashboard: "STATION",
    dashboardTitle: "Station Operations Workspace",
    description: "Administrative submissions, personnel contributions and station reporting.",
    assignableTo: ["STATION"],
    permissions: { "dashboard.station.view": U, "org.view": N, ...P.oversight(S), ...P.contributor(S), "report.view": S },
  },
  {
    code: "STATION_PERSONNEL_OFFICER", no: 20, level: "STATION",
    name: "Station Personnel Records Officer",
    category: "BUSINESS",
    dashboard: "PERSONNEL_ADMIN",
    dashboardTitle: "Station Personnel Register",
    description: "Maintains the approved station personnel register.",
    assignableTo: ["STATION"],
    permissions: { "dashboard.station.view": U, "org.view": N, ...P.personnelAdmin(S) },
  },
  {
    code: "POST_SUPERVISOR", no: 21, level: "POST",
    name: "Police Post Supervisor / Administrative Officer",
    category: "BUSINESS",
    dashboard: "UNIT_COMMAND",
    dashboardTitle: "Police Post Workspace",
    description: "Limited administrative information and personnel records within the assigned Police Post.",
    assignableTo: ["POST"],
    permissions: { "dashboard.unit.view": U, ...P.personnelAdmin(U), ...P.contributor(U) },
  },
  // ── 11.6 Divisional unit and formation roles ─────────────────────────────
  {
    code: "FORMATION_COMMANDER", no: 22, level: "FORMATION",
    name: "Divisional Formation Commander",
    category: "BUSINESS",
    dashboard: "FORMATION_COMMAND",
    dashboardTitle: "Formation Commander Dashboard",
    description: "Oversight of the formation and its departments, companies, detachments, platoons and sections. Approves within delegated authority.",
    assignableTo: ["FORMATION"],
    permissions: {
      "dashboard.formation.view": U, "org.view": N, "request.view": U, "request.assign": U, "request.close": U, "request.reopen": U,
      "fleet.view": U, "maintenance.view": U, "asset.view": U, "report.view": U, "report.export": U,
      ...P.oversight(S), "roster.review": S,
    },
  },
  {
    code: "FORMATION_ADMIN_OFFICER", no: 23, level: "FORMATION",
    name: "Divisional Formation Staff Officer",
    category: "BUSINESS",
    dashboard: "FORMATION_ADMIN",
    dashboardTitle: "Formation Staff Workspace",
    description: "Formation-level administrative matters, personnel coordination, contributions and rosters. No assumed approval powers.",
    assignableTo: ["FORMATION"],
    permissions: {
      "dashboard.formation.view": U, "org.view": N, "request.view": U, "request.create": U, "request.edit": U, "request.submit": U, "request.cancel": U, "request.progress": U,
      "fleet.view": U, "maintenance.view": U, "maintenance.create": U, "asset.view": U, "asset.custody": U, "asset.inspect": U, "report.view": U,
      ...P.oversight(S), ...P.personnelAdmin(S), ...P.contributor(S), "manpower.create": U, "manpower.review": S, "roster.build": S, "roster.export": S, "assignment.propose": S,
    },
  },
  ...([
    ["DEPARTMENT_HEAD", 24, "Unit Department Head", "DEPARTMENT", "commander", "Departmental records and manpower contributions."],
    ["COMPANY_COMMANDER", 25, "Company Commander", "COMPANY", "commander", "Company-level personnel administration and submissions. No access to other companies."],
    ["COMPANY_ADMIN_OFFICER", 26, "Company Administrative Officer", "COMPANY", "admin", "Company records, submissions and personnel registers."],
    ["DETACHMENT_COMMANDER", 27, "Detachment Commander", "DETACHMENT", "commander", "Detachment-level administration."],
    ["DETACHMENT_ADMIN_OFFICER", 28, "Detachment Administrative Officer", "DETACHMENT", "admin", "Detachment personnel registers and submissions."],
    ["PLATOON_COMMANDER", 29, "Platoon Commander", "PLATOON", "commander", "Platoon-level administrative oversight."],
    ["PLATOON_ADMIN_OFFICER", 30, "Platoon Administrative Officer", "PLATOON", "admin", "Platoon personnel records and contributions."],
    ["SECTION_COMMANDER", 31, "Section Commander", "SECTION", "commander", "Section-level personnel administration."],
    ["SECTION_ADMIN_OFFICER", 32, "Section Administrative Officer", "SECTION", "admin", "Section personnel information and submissions."],
  ] as const).map(([code, no, name, type, kind, description]): RoleDef => ({
    code, no, level: "FORMATION", name, category: "BUSINESS",
    dashboard: "UNIT_COMMAND",
    dashboardTitle: `${name} Workspace`,
    description,
    assignableTo: [type],
    permissions: kind === "commander"
      ? { "dashboard.unit.view": U, ...P.contributor(S), "personnel.view": S, "assignment.view": S }
      : { "dashboard.unit.view": U, ...P.contributor(S), ...P.personnelAdmin(S) },
  })),
  // ── 11.7 Functional roles ────────────────────────────────────────────────
  {
    code: "MANPOWER_ORIGINATOR", no: 33, level: "FUNCTIONAL",
    name: "Manpower Request Originator",
    category: "FUNCTIONAL",
    dashboard: "OPS_STAFF_WORKSPACE",
    dashboardTitle: "Manpower Requests Workspace",
    description: "Creates and submits manpower requests for the assigned unit.",
    assignableTo: ANY,
    permissions: { "manpower.view": U, "manpower.create": U, "area.view": S, "org.view": N },
  },
  {
    code: "ROSTER_COORDINATOR", no: 34, level: "FUNCTIONAL",
    name: "Manpower Roster Coordinator",
    category: "FUNCTIONAL",
    dashboard: "OPS_STAFF_WORKSPACE",
    dashboardTitle: "Roster Coordination Workspace",
    description: "Compiles personnel contributions and prepares consolidated rosters.",
    assignableTo: ANY,
    permissions: { "org.view": N, "personnel.view": S, "manpower.view": S, "manpower.review": S, "roster.view": S, "roster.build": S, "roster.export": S, "area.view": S },
  },
  {
    code: "ASSIGNMENT_APPROVER", no: 35, level: "FUNCTIONAL",
    name: "Assignment Approving Officer",
    category: "BUSINESS",
    dashboard: "ASSIGNMENT_ADMIN",
    dashboardTitle: "Assignment Approvals",
    description: "Reviews and approves assignment matters within delegated authority (ASSIGNMENT delegation required).",
    assignableTo: ANY,
    permissions: { "org.view": N, ...P.oversight(S), "roster.review": S },
  },
  {
    code: "RECEIVING_AREA_OFFICER", no: 36, level: "FUNCTIONAL",
    name: "Receiving Area Administrative Officer",
    category: "FUNCTIONAL",
    dashboard: "ASSIGNMENT_ADMIN",
    dashboardTitle: "Receiving Area Administration",
    description: "Processes assignment acceptance and receiving-area administrative records.",
    assignableTo: ANY,
    permissions: { "org.view": N, "personnel.view": S, "area.view": S, "assignment.view": S, "assignment.receive": S, "disposition.change": S },
  },
  {
    code: "FLEET_OFFICER", no: 37, level: "FUNCTIONAL",
    name: "Fleet Administration Officer",
    category: "FUNCTIONAL",
    dashboard: "FLEET",
    dashboardTitle: "Fleet and Transport Management Workspace",
    description: "General fleet administration for granted organisations only. No GPS, location, routes, mission purpose or deployment history.",
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "fleet.view": U, "fleet.manage": U, "maintenance.view": U, "maintenance.create": U, "maintenance.process": U, "maintenance.verify": U, "service.record": U, "report.view": U, "report.export": U,
    },
  },
  {
    code: "ASSET_CUSTODIAN", no: 38, level: "FUNCTIONAL",
    name: "General Asset Custodian",
    category: "FUNCTIONAL",
    dashboard: "ASSETS",
    dashboardTitle: "Assets and Equipment Workspace",
    description: "Non-sensitive general assets in approved categories only. Firearms, ammunition and controlled equipment are excluded.",
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: { "asset.view": U, "asset.register": U, "asset.custody": U, "asset.inspect": U, "asset.dispose": U, "report.view": U, "report.export": U },
  },
  {
    code: "INTERNAL_AUDITOR", no: 39, level: "FUNCTIONAL",
    name: "Internal Auditor",
    category: "AUDIT",
    dashboard: "AUDIT",
    dashboardTitle: "Audit and Compliance Workspace",
    description: "Read-only, time-limited audit scope over transactions, approvals and audit trails. Cannot modify any business record.",
    requiresExpiry: true,
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "org.view": N, "request.view": N, "fleet.view": N, "maintenance.view": N, "asset.view": N, "report.view": N, "audit.view": N, "audit.export": N, "workflow.view": U,
      ...P.oversight(N),
    },
  },
  {
    code: "READ_ONLY_MANAGEMENT", no: 40, level: "FUNCTIONAL",
    name: "Read-Only Management User",
    category: "FUNCTIONAL",
    dashboard: "MANAGEMENT",
    dashboardTitle: "Management Information",
    description: "Views authorised reports, rosters and organisational information without modification privileges.",
    assignableTo: ANY,
    permissions: { "org.view": N, "report.view": S, "manpower.view": S, "roster.view": S, "assignment.view": S },
  },
  {
    code: "OPERATIONS_STAFF", no: 41, level: "FUNCTIONAL",
    name: "General Authorised Staff Member",
    category: "BUSINESS",
    dashboard: "MY_WORKSPACE",
    dashboardTitle: "My Operations Workspace",
    description: "Specifically assigned functionality only: create and track own unit's administrative requests. No access to national manpower registers.",
    assignableTo: ANY,
    permissions: { "request.view": U, "request.create": U, "request.edit": U, "request.submit": U, "request.cancel": U },
  },
];

export const ROLE_BY_CODE = Object.fromEntries(ROLES.map((r) => [r.code, r])) as Record<RoleCode, RoleDef>;

/** Precedence used to choose a user's landing dashboard when they hold several roles. */
export const DASHBOARD_PRECEDENCE: RoleCode[] = [
  "DIG_OPS_EXECUTIVE", "HQ_OPS_COORDINATOR", "HQ_OPS_STAFF", "NATIONAL_ASSIGNMENT_ADMIN", "NATIONAL_PERSONNEL_ADMIN",
  "PROVINCIAL_COMMANDER", "DIVISION_STAFF_OPS", "PROVINCIAL_ASSIGNMENT_COORDINATOR", "PROVINCIAL_PERSONNEL_OFFICER", "PROVINCIAL_REPORTING_OFFICER",
  "DISTRICT_COMMANDER", "DISTRICT_OPS_OFFICER", "DISTRICT_ASSIGNMENT_COORDINATOR", "DISTRICT_PERSONNEL_OFFICER",
  "STATION_COMMANDER", "STATION_OPS_ADMIN", "STATION_PERSONNEL_OFFICER", "POST_SUPERVISOR",
  "FORMATION_COMMANDER", "FORMATION_ADMIN_OFFICER", "DEPARTMENT_HEAD", "COMPANY_COMMANDER", "COMPANY_ADMIN_OFFICER", "DETACHMENT_COMMANDER", "DETACHMENT_ADMIN_OFFICER",
  "PLATOON_COMMANDER", "PLATOON_ADMIN_OFFICER", "SECTION_COMMANDER", "SECTION_ADMIN_OFFICER",
  "ASSIGNMENT_APPROVER", "ROSTER_COORDINATOR", "MANPOWER_ORIGINATOR", "RECEIVING_AREA_OFFICER",
  "FLEET_OFFICER", "ASSET_CUSTODIAN", "ORG_REGISTRY_ADMIN", "INTERNAL_AUDITOR", "READ_ONLY_MANAGEMENT", "SECURITY_ADMIN", "PLATFORM_ADMIN", "OPERATIONS_STAFF",
];

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
  "radio", "body armour", "body armor", "tactical", "surveillance", "informant", "patrol", "gps",
];

export const SERVICE_TYPES = ["Routine service", "Brake and tyre check", "Electrical fault", "Body repair", "Engine repair", "Licence/inspection renewal"] as const;
