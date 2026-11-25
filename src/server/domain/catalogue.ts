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
 *   NATIONAL – applies to every unit, but ONLY when the assignment is held at
 *              Service HQ. A NATIONAL permission on a non-HQ assignment is
 *              evaluated as UNIT.
 */

export const PERMISSIONS = {
  // Dashboards
  "dashboard.national.view": "View national aggregate dashboard",
  "dashboard.division.view": "View own provincial division dashboard",
  "dashboard.formation.view": "View own formation dashboard",
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
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Coverage = "UNIT" | "NATIONAL";

export type RoleCode =
  | "DIG_OPS_EXECUTIVE"
  | "HQ_OPS_COORDINATOR"
  | "PROVINCIAL_COMMANDER"
  | "DIVISION_STAFF_OPS"
  | "FORMATION_COMMANDER"
  | "FORMATION_ADMIN_OFFICER"
  | "FLEET_OFFICER"
  | "ASSET_CUSTODIAN"
  | "INTERNAL_AUDITOR"
  | "PLATFORM_ADMIN"
  | "SECURITY_ADMIN"
  | "ORG_REGISTRY_ADMIN"
  | "OPERATIONS_STAFF";

export type DashboardKind =
  | "NATIONAL_EXECUTIVE"
  | "NATIONAL_COORDINATION"
  | "DIVISION_COMMAND"
  | "DIVISION_STAFF_OPS"
  | "FORMATION_COMMAND"
  | "FORMATION_ADMIN"
  | "FLEET"
  | "ASSETS"
  | "AUDIT"
  | "PLATFORM"
  | "SECURITY"
  | "ORG_REGISTRY"
  | "MY_WORKSPACE";

export interface RoleDef {
  code: RoleCode;
  name: string;
  category: "BUSINESS" | "FUNCTIONAL" | "AUDIT" | "TECHNICAL" | "SECURITY";
  dashboard: DashboardKind;
  dashboardTitle: string;
  description: string;
  /** Assignments for this role must carry an expiry date. */
  requiresExpiry?: boolean;
  /** Org unit types this role may be assigned to. */
  assignableTo: Array<"SERVICE_HQ" | "PROVINCIAL_DIVISION" | "FORMATION">;
  permissions: Partial<Record<Permission, Coverage>>;
}

const U: Coverage = "UNIT";
const N: Coverage = "NATIONAL";

export const ROLES: RoleDef[] = [
  {
    code: "DIG_OPS_EXECUTIVE",
    name: "DIG Operations Executive",
    category: "BUSINESS",
    dashboard: "NATIONAL_EXECUTIVE",
    dashboardTitle: "National Operations Executive Dashboard",
    description:
      "National aggregate oversight; approves HQ-level matters only where a recorded delegation exists. No unrestricted record-level access.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "dashboard.national.view": N,
      "org.view": N,
      "request.view": U,
      "report.view": N,
      "report.export": N,
      "workflow.view": U,
    },
  },
  {
    code: "HQ_OPS_COORDINATOR",
    name: "HQ Operations Coordinator / Secretariat Officer",
    category: "BUSINESS",
    dashboard: "NATIONAL_COORDINATION",
    dashboardTitle: "National Operations Coordination Workspace",
    description:
      "Coordinates national administrative registers and queues; processes requests within assigned delegated authority.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "dashboard.national.view": N,
      "org.view": N,
      "request.view": N,
      "request.create": U,
      "request.edit": U,
      "request.submit": U,
      "request.assign": N,
      "request.cancel": U,
      "request.progress": U,
      "request.close": N,
      "fleet.view": N,
      "maintenance.view": N,
      "asset.view": N,
      "report.view": N,
      "report.export": N,
      "workflow.view": U,
    },
  },
  {
    code: "PROVINCIAL_COMMANDER",
    name: "Provincial Division Commander",
    category: "BUSINESS",
    dashboard: "DIVISION_COMMAND",
    dashboardTitle: "Provincial Division Command Dashboard",
    description:
      "Own division only. Approves, returns or rejects within formally delegated authority (delegation record required).",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: {
      "dashboard.division.view": U,
      "org.view": N,
      "request.view": U,
      "request.assign": U,
      "request.close": U,
      "request.reopen": U,
      "fleet.view": U,
      "maintenance.view": U,
      "asset.view": U,
      "report.view": U,
      "report.export": U,
    },
  },
  {
    code: "DIVISION_STAFF_OPS",
    name: "Division Staff Ops",
    category: "BUSINESS",
    dashboard: "DIVISION_STAFF_OPS",
    dashboardTitle: "Division Operations Staff Workspace",
    description:
      "Prepares and tracks divisional administrative submissions and registers. No approval authority unless a separate delegation is recorded.",
    assignableTo: ["PROVINCIAL_DIVISION"],
    permissions: {
      "dashboard.division.view": U,
      "org.view": N,
      "request.view": U,
      "request.create": U,
      "request.edit": U,
      "request.submit": U,
      "request.cancel": U,
      "request.progress": U,
      "fleet.view": U,
      "maintenance.view": U,
      "maintenance.create": U,
      "asset.view": U,
      "report.view": U,
    },
  },
  {
    code: "FORMATION_COMMANDER",
    name: "Formation Commander",
    category: "BUSINESS",
    dashboard: "FORMATION_COMMAND",
    dashboardTitle: "Divisional Formation Command Dashboard",
    description: "Own formation only. Approves within delegated authority.",
    assignableTo: ["FORMATION"],
    permissions: {
      "dashboard.formation.view": U,
      "org.view": N,
      "request.view": U,
      "request.assign": U,
      "request.close": U,
      "request.reopen": U,
      "fleet.view": U,
      "maintenance.view": U,
      "asset.view": U,
      "report.view": U,
      "report.export": U,
    },
  },
  {
    code: "FORMATION_ADMIN_OFFICER",
    name: "Formation Administrative Officer",
    category: "BUSINESS",
    dashboard: "FORMATION_ADMIN",
    dashboardTitle: "Formation Administration Workspace",
    description: "Registers and tracks formation requests; updates assigned general asset registers. No assumed approval powers.",
    assignableTo: ["FORMATION"],
    permissions: {
      "dashboard.formation.view": U,
      "org.view": N,
      "request.view": U,
      "request.create": U,
      "request.edit": U,
      "request.submit": U,
      "request.cancel": U,
      "request.progress": U,
      "fleet.view": U,
      "maintenance.view": U,
      "maintenance.create": U,
      "asset.view": U,
      "asset.custody": U,
      "asset.inspect": U,
      "report.view": U,
    },
  },
  {
    code: "FLEET_OFFICER",
    name: "Fleet Officer",
    category: "FUNCTIONAL",
    dashboard: "FLEET",
    dashboardTitle: "Fleet and Transport Management Workspace",
    description:
      "General fleet administration for granted organisations only. No GPS, location, routes, mission purpose or deployment history.",
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "fleet.view": U,
      "fleet.manage": U,
      "maintenance.view": U,
      "maintenance.create": U,
      "maintenance.process": U,
      "maintenance.verify": U,
      "service.record": U,
      "report.view": U,
      "report.export": U,
    },
  },
  {
    code: "ASSET_CUSTODIAN",
    name: "General Asset Custodian",
    category: "FUNCTIONAL",
    dashboard: "ASSETS",
    dashboardTitle: "Assets and Equipment Workspace",
    description: "Non-sensitive general assets in approved categories only. Firearms, ammunition and controlled equipment are excluded.",
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "asset.view": U,
      "asset.register": U,
      "asset.custody": U,
      "asset.inspect": U,
      "asset.dispose": U,
      "report.view": U,
      "report.export": U,
    },
  },
  {
    code: "INTERNAL_AUDITOR",
    name: "Internal Auditor",
    category: "AUDIT",
    dashboard: "AUDIT",
    dashboardTitle: "Audit and Compliance Workspace",
    description: "Read-only, time-limited audit scope. Cannot modify any business record.",
    requiresExpiry: true,
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "org.view": N,
      "request.view": N,
      "fleet.view": N,
      "maintenance.view": N,
      "asset.view": N,
      "report.view": N,
      "audit.view": N,
      "audit.export": N,
      "workflow.view": U,
    },
  },
  {
    code: "PLATFORM_ADMIN",
    name: "Platform Administrator",
    category: "TECHNICAL",
    dashboard: "PLATFORM",
    dashboardTitle: "Platform Administration Workspace",
    description: "Technical configuration and approved user provisioning. No business-record access by default.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "user.view": N,
      "user.provision": N,
      "user.deactivate": N,
      "grant.assign": N,
      "grant.revoke": N,
      "delegation.grant": N,
      "platform.view": N,
      "platform.configure": N,
      "workflow.view": U,
      "org.view": N,
    },
  },
  {
    code: "SECURITY_ADMIN",
    name: "Security Administrator",
    category: "SECURITY",
    dashboard: "SECURITY",
    dashboardTitle: "Security Administration Workspace",
    description: "Security events, access recertification, suspension and revocation. No routine business approval.",
    assignableTo: ["SERVICE_HQ"],
    permissions: {
      "user.view": N,
      "user.suspend": N,
      "grant.revoke": N,
      "delegation.revoke": N,
      "accessreview.manage": N,
      "security.view": N,
      "audit.view": N,
      "org.view": N,
    },
  },
  {
    code: "ORG_REGISTRY_ADMIN",
    name: "Organisational Registry Administrator",
    category: "BUSINESS",
    dashboard: "ORG_REGISTRY",
    dashboardTitle: "Organisation and Formation Administration",
    description: "Proposes effective-dated structural changes. Cannot approve own proposals.",
    assignableTo: ["SERVICE_HQ"],
    permissions: { "org.view": N, "org.propose": N },
  },
  {
    code: "OPERATIONS_STAFF",
    name: "Authorised Operations Staff",
    category: "BUSINESS",
    dashboard: "MY_WORKSPACE",
    dashboardTitle: "My Operations Workspace",
    description: "Restricted role: create and track own unit's administrative requests only.",
    assignableTo: ["SERVICE_HQ", "PROVINCIAL_DIVISION", "FORMATION"],
    permissions: {
      "request.view": U,
      "request.create": U,
      "request.edit": U,
      "request.submit": U,
      "request.cancel": U,
    },
  },
];

export const ROLE_BY_CODE = Object.fromEntries(ROLES.map((r) => [r.code, r])) as Record<RoleCode, RoleDef>;

/** Precedence used to choose a user's landing dashboard when they hold several roles. */
export const DASHBOARD_PRECEDENCE: RoleCode[] = [
  "DIG_OPS_EXECUTIVE",
  "HQ_OPS_COORDINATOR",
  "PROVINCIAL_COMMANDER",
  "DIVISION_STAFF_OPS",
  "FORMATION_COMMANDER",
  "FORMATION_ADMIN_OFFICER",
  "FLEET_OFFICER",
  "ASSET_CUSTODIAN",
  "ORG_REGISTRY_ADMIN",
  "INTERNAL_AUDITOR",
  "SECURITY_ADMIN",
  "PLATFORM_ADMIN",
  "OPERATIONS_STAFF",
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
