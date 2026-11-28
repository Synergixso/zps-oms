import type { Permission } from "@/server/domain/catalogue";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Shown when the user holds ANY of these permissions. Server-side checks still apply on every page. */
  any: Permission[];
  /** Command offices: shown only to holders of an office of one of these types (field command, DEC-078). */
  officeTypes?: string[];
  /** Also shown to holders of these office types even without the permissions (executive appointments, DEC-088). */
  alsoOffices?: string[];
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type IconName = "home" | "inbox" | "file" | "building" | "truck" | "wrench" | "box" | "chart" | "users" | "key" | "shield" | "search" | "server" | "flow" | "bell" | "help" | "check" | "layers" | "arrow" | "user" | "lock" | "map" | "eye" | "car" | "play" | "network" | "tools" | "shieldCheck" | "bars" | "gear" | "target" | "scale" | "handshake" | "starShield" | "sitemap" | "clipboardCheck" | "star" | "chevron" | "monitorNet" | "laptop" | "checkCircle" | "userCircle" | "bank" | "phone" | "mail" | "headset" | "globe" | "pin" | "send" | "userPlus" | "info" | "chat" | "list" | "fileEdit" | "docSearch" | "stamp" | "gauge" | "database" | "chartMonitor" | "arrowUp" | "arrowDown" | "calendar";

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: "home", any: [] },
      { href: "/app/tasks", label: "My tasks", icon: "check", any: [] },
      { href: "/app/approvals", label: "Approvals & queues", icon: "inbox", any: ["request.assign", "request.view", "manpower.view", "manpower.contribute", "assignment.view"] },
    ],
  },
  {
    label: "Personnel & manpower",
    items: [
      { href: "/app/personnel", label: "Personnel register", icon: "users", any: ["personnel.view"] },
      { href: "/app/manpower", label: "Manpower requests", icon: "clipboardCheck", any: ["manpower.view"] },
      { href: "/app/manpower/contributions", label: "Unit contributions", icon: "handshake", any: ["manpower.contribute"] },
      { href: "/app/rosters", label: "Rosters", icon: "list", any: ["roster.view"] },
      { href: "/app/assignments", label: "Assignment register", icon: "layers", any: ["assignment.view"] },
      { href: "/app/transfers", label: "Transfers", icon: "arrow", any: ["assignment.view"] },
      { href: "/app/areas", label: "Operational areas", icon: "target", any: ["area.view"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/requests", label: "Administrative requests", icon: "file", any: ["request.view"] },
      { href: "/app/fleet", label: "Fleet register", icon: "truck", any: ["fleet.view"] },
      { href: "/app/fleet/maintenance", label: "Fleet maintenance", icon: "wrench", any: ["maintenance.view"] },
      { href: "/app/assets", label: "General assets", icon: "box", any: ["asset.view"] },
      { href: "/app/stores", label: "Stores and stock", icon: "database", any: ["stores.view"] },
      { href: "/app/stores/requisitions", label: "Stores requisitions", icon: "clipboardCheck", any: ["stores.view", "stores.requisition"] },
      { href: "/app/calendar", label: "Administrative calendar", icon: "calendar", any: ["schedule.view"] },
      { href: "/app/correspondence", label: "Correspondence", icon: "mail", any: ["correspondence.view", "correspondence.register"] },
      { href: "/app/reports", label: "Reports", icon: "chart", any: ["report.view"] },
      { href: "/app/messages", label: "Contact messages", icon: "mail", any: ["contact.view"] },
    ],
  },
  {
    // Command and reporting (DEC-074). Shown only to users who hold a command office (appended by the layout);
    // every page and domain function re-checks the office on the server.
    label: "Command and reporting",
    items: [
      { href: "/app/command", label: "Command overview", icon: "starShield", any: [] },
      { href: "/app/command/directives", label: "Directives received", icon: "inbox", any: [] },
      { href: "/app/command/directives/issued", label: "Directives issued", icon: "send", any: [] },
      { href: "/app/command/reports", label: "Reports received", icon: "clipboardCheck", any: [] },
      { href: "/app/command/reports/submitted", label: "Reports submitted", icon: "fileEdit", any: [] },
      { href: "/app/command/company", label: "Company / detachment command", icon: "building", any: [], officeTypes: ["COMPANY_COMMANDER", "DEPUTY_COMPANY_COMMANDER", "DETACHMENT_COMMANDER"] },
      { href: "/app/command/area", label: "Area command", icon: "target", any: [], officeTypes: ["AREA_COMMANDER"] },
      { href: "/app/command/platoon", label: "Platoon command", icon: "users", any: [], officeTypes: ["SECTION_PLATOON_COMMANDER"] },
      { href: "/app/command/acting", label: "Acting appointments", icon: "userCircle", any: [] },
      { href: "/app/command/conflicts", label: "Command conflicts", icon: "scale", any: [] },
      { href: "/app/command/structure", label: "Command structure", icon: "sitemap", any: ["command.structure.view"] },
    ],
  },
  {
    // Executive portfolios (DEC-086 … DEC-088). Appended by the layout for every user; each item is filtered by permission
    // or by the office held, and every page and domain function re-checks on the server.
    label: "Portfolios",
    items: [
      { href: "/app/training", label: "Training and development", icon: "star", any: ["training.view"], alsoOffices: ["DIG_ADMINISTRATION"] },
      { href: "/app/operations", label: "Operations administration", icon: "flow", any: ["opsadmin.view"] },
      { href: "/app/operations/security-services", label: "Mining security services", icon: "handshake", any: ["secservice.view"] },
      { href: "/app/coordination", label: "Inter-office coordination", icon: "network", any: [], officeTypes: ["IG", "DIG_OPERATIONS", "DIG_ADMINISTRATION", "DIG_SPECIAL_DUTIES", "COMMISSIONER_OPS", "DEPUTY_COMMISSIONER_OPS"] },
    ],
  },
  {
    // Intelligence-liaison administration (roles 07, 19, 30, 31): metadata only (DEC-073).
    label: "Liaison administration",
    items: [
      { href: "/app/liaison", label: "Liaison register", icon: "list", any: ["liaison.metadata.view"] },
      { href: "/app/liaison/assigned", label: "Assigned references", icon: "userCircle", any: ["liaison.metadata.view"] },
      { href: "/app/liaison/submissions", label: "Submission status", icon: "send", any: ["liaison.status.view"] },
      { href: "/app/liaison/incoming", label: "Receiving and review queue", icon: "inbox", any: ["liaison.submission.acknowledge"] },
      { href: "/app/liaison/acknowledgements", label: "Acknowledgements", icon: "checkCircle", any: ["liaison.status.view"] },
      { href: "/app/liaison/reports", label: "Report reference tracking", icon: "docSearch", any: ["liaison.metadata.view"] },
      { href: "/app/liaison/routing", label: "Organisational routing", icon: "sitemap", any: ["liaison.audit.view"] },
      { href: "/app/liaison/history", label: "Liaison history", icon: "docSearch", any: ["liaison.audit.view"] },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/notifications", label: "Notifications", icon: "bell", any: [] },
      { href: "/app/profile", label: "My profile", icon: "userCircle", any: [] },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/app/import", label: "Controlled data import", icon: "arrowUp", any: ["personnel.register", "org.propose"] },
      { href: "/app/org", label: "Organisation directory", icon: "building", any: ["org.view"] },
      { href: "/app/org/changes", label: "Structure changes", icon: "flow", any: ["org.propose", "org.view"] },
      { href: "/app/org/tenants", label: "Tenant management", icon: "network", any: ["tenant.view"] },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/app/admin/users", label: "Users & access", icon: "users", any: ["user.view"] },
      { href: "/app/admin/roles", label: "Roles & permissions", icon: "key", any: ["user.view", "audit.view", "platform.view"] },
      { href: "/app/admin/reviews", label: "Access reviews", icon: "check", any: ["accessreview.manage"] },
      { href: "/app/audit", label: "Audit explorer", icon: "search", any: ["audit.view"] },
      { href: "/app/audit/history", label: "Record history", icon: "docSearch", any: ["audit.view"] },
      { href: "/app/security", label: "Security events", icon: "shield", any: ["security.view"] },
      { href: "/app/workflows", label: "Workflow definitions", icon: "flow", any: ["workflow.view"] },
      { href: "/app/platform", label: "System health", icon: "server", any: ["platform.view"] },
    ],
  },
];

/** Every navigation entry by route, for role-specific workspace navigation (src/server/domain/workspaces.ts). */
export const NAV_ITEMS: Record<string, NavItem> = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.href, i]));
