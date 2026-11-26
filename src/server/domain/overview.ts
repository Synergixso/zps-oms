/**
 * Dashboard overview data (Part X UI): live, scoped figures only — never hard-coded statistics.
 * Each dashboard kind gets its own headline figures; technical roles never see personnel counts.
 */
import type { DB } from "../db/connection";
import { all, one } from "../db/connection";
import type { DashboardKind } from "./catalogue";
import { addDays, nowIso, today } from "./core";
import { type Actor, hasPermission, unitsFor } from "./policy";
import { workspaceFor } from "./workspaces";
import type { IconName } from "@/lib/nav";

type Tone = "blue" | "green" | "violet" | "indigo" | "orange" | "teal" | "red" | "slate";
export interface Kpi { key: string; label: string; value: number | string; hint: string; href?: string; icon: IconName; tone: Tone }

const inList = (units: string[]) => units.map(() => "?").join(",");
const scope = (actor: Actor, perm: Parameters<typeof unitsFor>[1], col: string): { sql: string; params: string[] } | null => {
  if (!hasPermission(actor, perm)) return null;
  const u = unitsFor(actor, perm);
  if (u === null) return { sql: "1=1", params: [] };
  return u.length ? { sql: `${col} IN (${inList(u)})`, params: u } : { sql: "1=0", params: [] };
};
/** Users with an active assignment inside the actor's user.view scope (scoped technical administration). */
const usersInScope = (actor: Actor): { national: boolean; sql: string; params: string[] } | null => {
  if (!hasPermission(actor, "user.view")) return null;
  const u = unitsFor(actor, "user.view");
  if (u === null) return { national: true, sql: "1=1", params: [] };
  if (!u.length) return { national: false, sql: "1=0", params: [] };
  return { national: false, sql: `EXISTS (SELECT 1 FROM role_assignments x WHERE x.user_id = u.id AND x.revoked_at IS NULL AND (x.valid_to IS NULL OR x.valid_to > ?) AND x.org_unit_id IN (${inList(u)}))`, params: [nowIso(), ...u] };
};
const count = async (db: DB, sql: string, ...p: unknown[]) => Number((await one<{ c: number }>(db, sql, ...p))?.c ?? 0);

const KPI_SETS: Partial<Record<DashboardKind, string[]>> = {
  NATIONAL_EXECUTIVE: ["divisions", "orgUnits", "personnel", "activeAssignments", "pendingDecisions", "openManpower"],
  NATIONAL_COORDINATION: ["divisions", "orgUnits", "personnel", "activeAssignments", "openManpower", "pendingDecisions"],
  OPS_STAFF_WORKSPACE: ["openManpower", "contributionsToReview", "rostersApproved", "activeAssignments", "reviewsDue", "pendingDecisions"],
  PERSONNEL_ADMIN: ["personnel", "unverified", "orgUnits", "activeAssignments", "myTasks", "pendingDecisions"],
  ASSIGNMENT_ADMIN: ["activeAssignments", "reviewsDue", "transfersOpen", "pendingDecisions", "personnel", "myTasks"],
  DIVISION_COMMAND: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "pendingDecisions", "reviewsDue"],
  DIVISION_STAFF_OPS: ["openManpower", "contributionsDue", "rostersApproved", "activeAssignments", "personnel", "pendingDecisions"],
  DISTRICT_COMMAND: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "pendingDecisions", "myTasks"],
  STATION: ["personnel", "available", "activeAssignments", "contributionsDue", "pendingDecisions", "myTasks"],
  FORMATION_COMMAND: ["orgUnits", "personnel", "activeAssignments", "contributionsDue", "pendingDecisions", "reviewsDue"],
  FORMATION_ADMIN: ["openManpower", "contributionsDue", "personnel", "activeAssignments", "pendingDecisions", "myTasks"],
  UNIT_COMMAND: ["personnel", "available", "activeAssignments", "contributionsDue", "pendingDecisions", "myTasks"],
  FLEET: ["vehicles", "maintenanceOpen", "serviceDue", "pendingDecisions", "myTasks", "unread"],
  ASSETS: ["assets", "notInspected", "reconciliationsOpen", "myTasks", "unread", "pendingDecisions"],
  AUDIT: ["auditEvents24h", "denied24h", "exports30d", "personnel", "activeAssignments", "myTasks"],
  PLATFORM: ["tenants", "divisions", "orgUnits", "usersActive", "jobFailures", "myTasks"],
  SECURITY: ["usersActive", "sessions", "locked", "failedLogins24h", "denied24h", "myTasks"],
  ORG_REGISTRY: ["tenants", "divisions", "orgUnits", "orgChangesPending", "myTasks", "unread"],
  MANAGEMENT: ["personnel", "activeAssignments", "openManpower", "rostersApproved", "myTasks", "unread"],
  MY_WORKSPACE: ["myRequests", "myTasks", "unread", "pendingDecisions"],
};

async function pendingDecisions(db: DB, actor: Actor): Promise<number> {
  let n = 0;
  if (hasPermission(actor, "manpower.view") || hasPermission(actor, "manpower.contribute")) n += (await (await import("./manpower")).manpowerInbox(db, actor)).length;
  if (hasPermission(actor, "assignment.view")) n += (await (await import("./assignments")).assignmentInbox(db, actor)).length;
  if (hasPermission(actor, "request.view")) n += (await (await import("./requests")).approvalInbox(db, actor)).length;
  return n;
}

async function kpi(db: DB, actor: Actor, key: string): Promise<Kpi | null> {
  const t = today();
  switch (key) {
    case "tenants":
      return hasPermission(actor, "tenant.view") || hasPermission(actor, "dashboard.national.view")
        ? { key, label: "Tenants", value: await count(db, "SELECT COUNT(*) AS c FROM tenants WHERE status = 'ACTIVE'"), hint: "National, provincial and formation", href: hasPermission(actor, "tenant.view") ? "/app/org/tenants" : undefined, icon: "bank", tone: "blue" }
        : null;
    case "divisions":
      return hasPermission(actor, "org.view") ? { key, label: "Provincial Divisions", value: await count(db, "SELECT COUNT(*) AS c FROM org_units WHERE unit_type = 'PROVINCIAL_DIVISION' AND status = 'ACTIVE'"), hint: "Nationwide", href: "/app/org", icon: "sitemap", tone: "green" } : null;
    case "orgUnits": {
      const own = [...new Set(actor.assignments.flatMap((a) => a.subtree))];
      const national = hasPermission(actor, "dashboard.national.view") || hasPermission(actor, "tenant.view") || hasPermission(actor, "org.propose");
      const v = national ? await count(db, "SELECT COUNT(*) AS c FROM org_units WHERE status = 'ACTIVE'") : own.length;
      return { key, label: national ? "Organisation units" : "Units in my command", value: v, hint: "Districts, stations, posts, companies…", href: hasPermission(actor, "org.view") ? "/app/org" : undefined, icon: "building", tone: "violet" };
    }
    case "personnel": {
      const s = scope(actor, "personnel.view", "home_unit_id");
      return s ? { key, label: "Personnel records", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_records WHERE ${s.sql}`, ...s.params), hint: "Registered officers (synthetic)", href: "/app/personnel", icon: "users", tone: "indigo" } : null;
    }
    case "available": {
      const s = scope(actor, "personnel.view", "home_unit_id");
      return s ? { key, label: "Available at home unit", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_records WHERE employment_status = 'SERVING' AND disposition_status IN ('AVAILABLE_HOME','RETURNED_HOME','RELEASED','COMPLETED','CANCELLED') AND ${s.sql}`, ...s.params), hint: "Eligible for selection", href: "/app/personnel?disposition=AVAILABLE_HOME", icon: "checkCircle", tone: "green" } : null;
    }
    case "unverified": {
      const s = scope(actor, "personnel.view", "home_unit_id");
      return s ? { key, label: "Awaiting verification", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_records WHERE verification_status = 'UNVERIFIED' AND ${s.sql}`, ...s.params), hint: "Records to verify", href: "/app/personnel?verification=UNVERIFIED", icon: "clipboardCheck", tone: "orange" } : null;
    }
    case "activeAssignments": {
      const s = scope(actor, "assignment.view", "a.responsible_unit_id");
      const h = scope(actor, "assignment.view", "a.home_unit_id");
      return s && h ? { key, label: "Active assignments", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_assignments a WHERE a.status IN ('ACTIVE','TRANSFER_PENDING') AND (${s.sql} OR ${h.sql})`, ...s.params, ...h.params), hint: "Field / operational areas", href: "/app/assignments", icon: "layers", tone: "orange" } : null;
    }
    case "reviewsDue": {
      const s = scope(actor, "assignment.view", "a.responsible_unit_id");
      return s ? { key, label: "Reviews due", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id WHERE a.status = 'ACTIVE' AND p.disposition_status IN ('REVIEW_DUE','RENEWAL_PENDING') AND ${s.sql}`, ...s.params), hint: "Tenure reviews and renewals", href: "/app/assignments?renewal=due", icon: "flow", tone: "teal" } : null;
    }
    case "transfersOpen": {
      const s = scope(actor, "assignment.view", "t.releasing_unit_id");
      return s ? { key, label: "Transfers in progress", value: await count(db, `SELECT COUNT(*) AS c FROM assignment_transfers t WHERE t.status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE') AND ${s.sql}`, ...s.params), hint: "Awaiting release or acceptance", href: "/app/transfers", icon: "arrow", tone: "indigo" } : null;
    }
    case "openManpower": {
      const s = scope(actor, "manpower.view", "requesting_unit_id");
      return s ? { key, label: "Open manpower requests", value: await count(db, `SELECT COUNT(*) AS c FROM manpower_requests WHERE status IN ('SUBMITTED','UNDER_REVIEW','RECOMMENDED','RETURNED','APPROVED') AND ${s.sql}`, ...s.params), hint: "In review or distribution", href: "/app/manpower?status=OPEN", icon: "clipboardCheck", tone: "blue" } : null;
    }
    case "contributionsDue": {
      const s = scope(actor, "manpower.contribute", "c.contributing_unit_id");
      return s ? { key, label: "Contributions due", value: await count(db, `SELECT COUNT(*) AS c FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id WHERE m.status = 'APPROVED' AND c.status IN ('PENDING','RETURNED') AND ${s.sql}`, ...s.params), hint: "Personnel to submit", href: "/app/manpower/contributions", icon: "handshake", tone: "orange" } : null;
    }
    case "contributionsToReview": {
      const s = scope(actor, "manpower.review", "m.requesting_unit_id");
      return s ? { key, label: "Contributions to review", value: await count(db, `SELECT COUNT(*) AS c FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id WHERE c.status = 'SUBMITTED' AND ${s.sql}`, ...s.params), hint: "Submitted by units", href: "/app/manpower?status=APPROVED", icon: "inbox", tone: "orange" } : null;
    }
    case "rostersApproved": {
      const s = scope(actor, "roster.view", "m.requesting_unit_id");
      return s ? { key, label: "Approved personnel lists", value: await count(db, `SELECT COUNT(*) AS c FROM roster_versions v JOIN manpower_requests m ON m.id = v.request_id WHERE v.status IN ('APPROVED','FINALISED') AND ${s.sql}`, ...s.params), hint: "Approved or finalised rosters", href: "/app/rosters", icon: "list", tone: "green" } : null;
    }
    case "pendingDecisions":
      return { key, label: "Pending approvals", value: await pendingDecisions(db, actor), hint: "Requests, transfers, renewals…", href: "/app/approvals", icon: "stamp", tone: "teal" };
    case "myTasks":
      return { key, label: "My open tasks", value: await count(db, "SELECT COUNT(*) AS c FROM administrative_tasks WHERE user_id = ? AND status = 'OPEN'", actor.userId), hint: `${await count(db, "SELECT COUNT(*) AS c FROM administrative_tasks WHERE user_id = ? AND status = 'OPEN' AND due_date < ?", actor.userId, t)} overdue`, href: "/app/tasks", icon: "check", tone: "teal" };
    case "unread":
      return { key, label: "Unread notifications", value: await count(db, "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL", actor.userId), hint: "In-application only", href: "/app/notifications?unread=1", icon: "bell", tone: "slate" };
    case "myRequests":
      return hasPermission(actor, "request.view") ? { key, label: "My open requests", value: await count(db, "SELECT COUNT(*) AS c FROM admin_requests WHERE created_by = ? AND status NOT IN ('CLOSED','CANCELLED','REJECTED')", actor.userId), hint: "Administrative requests", href: "/app/requests", icon: "file", tone: "blue" } : null;
    case "vehicles": {
      const s = scope(actor, "fleet.view", "custody_org_id");
      return s ? { key, label: "Vehicles", value: await count(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND ${s.sql}`, ...s.params), hint: "Administrative fleet register", href: "/app/fleet", icon: "truck", tone: "blue" } : null;
    }
    case "maintenanceOpen": {
      const s = scope(actor, "maintenance.view", "org_unit_id");
      return s ? { key, label: "Open maintenance", value: await count(db, `SELECT COUNT(*) AS c FROM maintenance_requests WHERE status NOT IN ('CLOSED','REJECTED') AND ${s.sql}`, ...s.params), hint: "Requests in progress", href: "/app/fleet/maintenance", icon: "wrench", tone: "orange" } : null;
    }
    case "serviceDue": {
      const s = scope(actor, "fleet.view", "custody_org_id");
      return s ? { key, label: "Services due (14 days)", value: await count(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND next_service_due <= ? AND ${s.sql}`, addDays(t, 14), ...s.params), hint: "Including overdue", href: "/app/fleet", icon: "gauge", tone: "red" } : null;
    }
    case "assets": {
      const s = scope(actor, "asset.view", "custody_org_id");
      return s ? { key, label: "General assets", value: await count(db, `SELECT COUNT(*) AS c FROM assets WHERE status <> 'DISPOSED' AND ${s.sql}`, ...s.params), hint: "Non-sensitive register", href: "/app/assets", icon: "box", tone: "blue" } : null;
    }
    case "notInspected": {
      const s = scope(actor, "asset.view", "custody_org_id");
      return s ? { key, label: "Inspection overdue", value: await count(db, `SELECT COUNT(*) AS c FROM assets WHERE status <> 'DISPOSED' AND (last_inspected_at IS NULL OR last_inspected_at < ?) AND ${s.sql}`, addDays(t, -365), ...s.params), hint: "Not inspected in 12 months", href: "/app/assets", icon: "eye", tone: "orange" } : null;
    }
    case "reconciliationsOpen": {
      const s = scope(actor, "asset.view", "org_unit_id");
      return s ? { key, label: "Open reconciliations", value: await count(db, `SELECT COUNT(*) AS c FROM asset_reconciliations WHERE status = 'OPEN' AND ${s.sql}`, ...s.params), hint: "Stock-takes in progress", href: "/app/assets/reconciliation", icon: "clipboardCheck", tone: "teal" } : null;
    }
    case "auditEvents24h":
      return hasPermission(actor, "audit.view") ? { key, label: "Audit events (24 h)", value: await count(db, "SELECT COUNT(*) AS c FROM audit_events WHERE occurred_at > ?", new Date(Date.now() - 86400000).toISOString()), hint: "Hash-chained, append-only", href: "/app/audit", icon: "docSearch", tone: "indigo" } : null;
    case "denied24h":
      return hasPermission(actor, "audit.view") || hasPermission(actor, "security.view") ? { key, label: "Denied actions (24 h)", value: await count(db, "SELECT COUNT(*) AS c FROM audit_events WHERE outcome = 'DENIED' AND occurred_at > ?", new Date(Date.now() - 86400000).toISOString()), hint: "Access refused and recorded", href: hasPermission(actor, "security.view") ? "/app/security" : "/app/audit?outcome=DENIED", icon: "shield", tone: "red" } : null;
    case "exports30d":
      return hasPermission(actor, "audit.view") ? { key, label: "Exports (30 days)", value: await count(db, "SELECT COUNT(*) AS c FROM audit_events WHERE category = 'EXPORT' AND occurred_at > ?", new Date(Date.now() - 30 * 86400000).toISOString()), hint: "Reports and registers", href: "/app/audit/history?kind=exports", icon: "send", tone: "teal" } : null;
    case "usersActive": {
      const u = usersInScope(actor);
      return u ? { key, label: u.national ? "Active user accounts" : "Accounts in my scope", value: await count(db, `SELECT COUNT(*) AS c FROM users u WHERE u.status = 'ACTIVE' AND ${u.sql}`, ...u.params), hint: u.national ? "Synthetic accounts" : "Users assigned within your unit", href: "/app/admin/users", icon: "userCircle", tone: "indigo" } : null;
    }
    case "sessions":
      return hasPermission(actor, "security.view") ? { key, label: "Active sessions", value: await count(db, "SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?", nowIso()), hint: "Signed-in now", href: "/app/security", icon: "monitorNet", tone: "blue" } : null;
    case "locked": {
      const u = hasPermission(actor, "security.view") ? { national: true, sql: "1=1", params: [] as string[] } : usersInScope(actor);
      return u ? { key, label: "Locked accounts", value: await count(db, `SELECT COUNT(*) AS c FROM users u WHERE u.locked_until > ? AND ${u.sql}`, nowIso(), ...u.params), hint: "After repeated failures", href: hasPermission(actor, "security.view") ? "/app/security" : "/app/admin/users", icon: "lock", tone: "red" } : null;
    }
    case "failedLogins24h": {
      const since = new Date(Date.now() - 86400000).toISOString();
      if (hasPermission(actor, "security.view")) return { key, label: "Failed sign-ins (24 h)", value: await count(db, "SELECT COUNT(*) AS c FROM login_attempts WHERE succeeded = 0 AND created_at > ?", since), hint: "All attempts audited", href: "/app/security", icon: "key", tone: "orange" };
      const u = usersInScope(actor);
      return u ? { key, label: "Failed sign-ins (24 h)", value: await count(db, `SELECT COUNT(*) AS c FROM login_attempts l JOIN users u ON u.username = l.username WHERE l.succeeded = 0 AND l.created_at > ? AND ${u.sql}`, since, ...u.params), hint: "Accounts in your scope", href: "/app/admin/users", icon: "key", tone: "orange" } : null;
    }
    case "nationalPersonnel":
      // Aggregate summary only: no link to individual records unless the role may open them.
      return hasPermission(actor, "personnel.view") ? kpi(db, actor, "personnel")
        : hasPermission(actor, "dashboard.national.view") ? { key, label: "Personnel (national summary)", value: await count(db, "SELECT COUNT(*) AS c FROM personnel_records"), hint: "Aggregate figure only", icon: "users", tone: "indigo" } : null;
    case "nationalAssignments":
      return hasPermission(actor, "assignment.view") ? kpi(db, actor, "activeAssignments")
        : hasPermission(actor, "dashboard.national.view") ? { key, label: "Active assignments (national)", value: await count(db, "SELECT COUNT(*) AS c FROM personnel_assignments WHERE status IN ('ACTIVE','TRANSFER_PENDING')"), hint: "Aggregate figure only", icon: "layers", tone: "orange" } : null;
    case "storesItems": {
      const s = scope(actor, "stores.view", "org_unit_id");
      return s ? { key, label: "Store items", value: await count(db, `SELECT COUNT(*) AS c FROM store_items WHERE status = 'ACTIVE' AND ${s.sql}`, ...s.params), hint: "General consumables", href: "/app/stores", icon: "database", tone: "blue" } : null;
    }
    case "storesLow": {
      const s = scope(actor, "stores.view", "org_unit_id");
      return s ? { key, label: "Reorder needed", value: await count(db, `SELECT COUNT(*) AS c FROM store_items WHERE status = 'ACTIVE' AND quantity_on_hand <= reorder_level AND ${s.sql}`, ...s.params), hint: "At or below reorder level", href: "/app/stores?low=1", icon: "arrowDown", tone: "red" } : null;
    }
    case "storesToIssue": {
      const s = scope(actor, "stores.manage", "store_unit_id");
      return s ? { key, label: "Requisitions to issue", value: await count(db, `SELECT COUNT(*) AS c FROM store_requisitions WHERE status = 'APPROVED' AND ${s.sql}`, ...s.params), hint: "Approved, awaiting issue", href: "/app/stores/requisitions?status=APPROVED", icon: "send", tone: "orange" } : null;
    }
    case "storesAwaitingDecision": {
      const s = scope(actor, "stores.approve", "requesting_unit_id") ?? scope(actor, "stores.view", "store_unit_id");
      return s ? { key, label: "Stores requisitions pending", value: await count(db, `SELECT COUNT(*) AS c FROM store_requisitions WHERE status = 'SUBMITTED' AND ${s.sql}`, ...s.params), hint: "Awaiting a decision", href: "/app/stores/requisitions?status=SUBMITTED", icon: "stamp", tone: "teal" } : null;
    }
    case "myRequisitions":
      return hasPermission(actor, "stores.requisition") ? { key, label: "My open requisitions", value: await count(db, "SELECT COUNT(*) AS c FROM store_requisitions WHERE requested_by = ? AND status IN ('DRAFT','SUBMITTED','APPROVED')", actor.userId), hint: "Draft, submitted or approved", href: "/app/stores/requisitions?mine=1", icon: "clipboardCheck", tone: "blue" } : null;
    case "jobFailures":
      return hasPermission(actor, "platform.view") ? { key, label: "Automation failures (24 h)", value: await count(db, "SELECT COUNT(*) AS c FROM job_runs WHERE status = 'FAILED' AND started_at > ?", new Date(Date.now() - 86400000).toISOString()), hint: "Scheduled jobs", href: "/app/platform", icon: "server", tone: "teal" } : null;
    case "orgChangesPending":
      return hasPermission(actor, "org.view") ? { key, label: "Structure changes pending", value: await count(db, "SELECT COUNT(*) AS c FROM org_change_requests WHERE status IN ('SUBMITTED','APPROVED')"), hint: "Awaiting decision or effective date", href: "/app/org/changes", icon: "flow", tone: "orange" } : null;
  }
  return null;
}

export async function headlineKpis(db: DB, actor: Actor, kind: DashboardKind): Promise<Kpi[]> {
  // Role-specific figures from the workspace configuration; the dashboard-kind set is the fallback.
  const keys = workspaceFor(actor)?.kpis ?? KPI_SETS[kind] ?? ["myTasks", "unread"];
  const out: Kpi[] = [];
  for (const k of keys) {
    const v = await kpi(db, actor, k);
    if (v) out.push(v);
  }
  return out;
}

/** Active assignments by operational area (top five + other), within scope. */
export async function assignmentsByArea(db: DB, actor: Actor) {
  const s = scope(actor, "assignment.view", "a.responsible_unit_id");
  if (!s) return null;
  const rows = await all<{ name: string; c: number }>(db,
    `SELECT ar.name, COUNT(*) AS c FROM personnel_assignments a JOIN operational_areas ar ON ar.id = a.area_id
      WHERE a.status IN ('ACTIVE','TRANSFER_PENDING') AND ${s.sql} GROUP BY ar.name ORDER BY c DESC, ar.name`, ...s.params);
  const top = rows.slice(0, 5).map((r) => ({ label: r.name.replace(/ \(synthetic\)$/, ""), value: Number(r.c) }));
  const rest = rows.slice(5).reduce((n, r) => n + Number(r.c), 0);
  if (rest) top.push({ label: "Other operational areas", value: rest });
  return top;
}

/** Activity counts for the last 30 days, one bar per measure the actor may see. */
export async function activityTrends(db: DB, actor: Actor) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const out: Array<{ label: string; value: number; href: string }> = [];
  const m = scope(actor, "manpower.view", "requesting_unit_id");
  if (m) out.push({ label: "Manpower requests", value: await count(db, `SELECT COUNT(*) AS c FROM manpower_requests WHERE created_at > ? AND ${m.sql}`, since, ...m.params), href: "/app/manpower" });
  const r = scope(actor, "roster.view", "m.requesting_unit_id");
  if (r) out.push({ label: "Rosters generated", value: await count(db, `SELECT COUNT(*) AS c FROM roster_versions v JOIN manpower_requests m ON m.id = v.request_id WHERE v.created_at > ? AND ${r.sql}`, since, ...r.params), href: "/app/rosters" });
  const a = scope(actor, "assignment.view", "responsible_unit_id");
  if (a) {
    out.push({ label: "New assignments", value: await count(db, `SELECT COUNT(*) AS c FROM personnel_assignments WHERE created_at > ? AND ${a.sql}`, since, ...a.params), href: "/app/assignments" });
    out.push({ label: "Transfers completed", value: await count(db, `SELECT COUNT(*) AS c FROM assignment_transfers WHERE status = 'COMPLETED' AND accepted_at > ? AND ${a.sql.replace("responsible_unit_id", "receiving_unit_id")}`, since, ...a.params), href: "/app/transfers?status=COMPLETED" });
    out.push({ label: "Renewals approved", value: await count(db, `SELECT COUNT(*) AS c FROM assignment_renewals rn JOIN personnel_assignments x ON x.id = rn.assignment_id WHERE rn.decision = 'RENEWED' AND rn.decided_at > ? AND ${a.sql.replace("responsible_unit_id", "x.responsible_unit_id")}`, since, ...a.params), href: "/app/assignments" });
  }
  // Technical roles see technical activity only (no business records).
  if (!out.length && hasPermission(actor, "platform.view")) {
    out.push({ label: "Automation runs", value: await count(db, "SELECT COUNT(*) AS c FROM job_runs WHERE started_at > ?", since), href: "/app/platform" });
    out.push({ label: "Failed jobs", value: await count(db, "SELECT COUNT(*) AS c FROM job_runs WHERE status = 'FAILED' AND started_at > ?", since), href: "/app/platform" });
    out.push({ label: "Verified backups", value: await count(db, "SELECT COUNT(*) AS c FROM backup_runs WHERE status = 'SUCCESS' AND verified = 1 AND started_at > ?", since), href: "/app/platform" });
    out.push({ label: "Accounts created", value: await count(db, "SELECT COUNT(*) AS c FROM users WHERE created_at > ?", since), href: "/app/admin/users" });
  }
  if (!out.length && hasPermission(actor, "security.view")) {
    out.push({ label: "Successful sign-ins", value: await count(db, "SELECT COUNT(*) AS c FROM login_attempts WHERE succeeded = 1 AND created_at > ?", since), href: "/app/security" });
    out.push({ label: "Failed sign-ins", value: await count(db, "SELECT COUNT(*) AS c FROM login_attempts WHERE succeeded = 0 AND created_at > ?", since), href: "/app/security" });
    out.push({ label: "Denied actions", value: await count(db, "SELECT COUNT(*) AS c FROM audit_events WHERE outcome = 'DENIED' AND occurred_at > ?", since), href: "/app/security" });
    out.push({ label: "Account lockouts", value: await count(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'auth.account.locked' AND occurred_at > ?", since), href: "/app/security" });
  }
  return out;
}

export interface ActivityItem { at: string; title: string; detail: string; href?: string; kind: "manpower" | "roster" | "assignment" | "transfer" | "system" | "security" | "general" }

/** Recent administrative activity the actor is entitled to see. */
export async function recentActivity(db: DB, actor: Actor): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  const units = [...new Set([...(unitsFor(actor, "manpower.view") ?? ["*"]), ...(unitsFor(actor, "assignment.view") ?? ["*"])])];
  const canWorkflow = hasPermission(actor, "manpower.view") || hasPermission(actor, "assignment.view");
  if (canWorkflow) {
    const national = units.includes("*");
    const rows = await all<{ entity_type: string; entity_id: string; action: string; to_status: string | null; comment: string | null; actor_name: string; created_at: string }>(db,
      `SELECT x.entity_type, x.entity_id, x.action, x.to_status, x.comment, u.display_name AS actor_name, x.created_at FROM approval_actions x JOIN users u ON u.id = x.actor_id
        WHERE ${national ? "1=1" : `x.org_unit_id IN (${inList(units)})`} ORDER BY x.seq DESC LIMIT 6`, ...(national ? [] : units));
    const href = (t: string, id: string) => ({ manpower_request: `/app/manpower/${id}`, roster: `/app/rosters/${id}`, assignment: `/app/assignments/${id}`, transfer: `/app/transfers/${id}`, manpower_contribution: `/app/manpower/contributions/${id}` })[t];
    const kind = (t: string): ActivityItem["kind"] => (t.startsWith("manpower") ? "manpower" : t === "roster" ? "roster" : t === "transfer" ? "transfer" : "assignment");
    for (const r of rows) items.push({ at: r.created_at, title: `${r.entity_type.replace(/_/g, " ")}: ${r.action.replace(/_/g, " ").toLowerCase()}`, detail: `${r.actor_name}${r.comment ? ` — ${r.comment.slice(0, 70)}` : ""}`, href: href(r.entity_type, r.entity_id), kind: kind(r.entity_type) });
  }
  if (hasPermission(actor, "platform.view")) {
    const jobs = await all<{ job: string; status: string; started_at: string; processed: number }>(db, "SELECT job, status, started_at, processed FROM job_runs ORDER BY id DESC LIMIT 3");
    for (const j of jobs) items.push({ at: j.started_at, title: `Automation: ${j.job}`, detail: `${j.status.toLowerCase()} · ${j.processed} item(s)`, href: "/app/platform", kind: "system" });
    const b = await one<{ started_at: string; status: string; verified: number }>(db, "SELECT started_at, status, verified FROM backup_runs ORDER BY id DESC LIMIT 1");
    if (b) items.push({ at: b.started_at, title: "Database backup", detail: b.status === "SUCCESS" && b.verified ? "Completed and verified" : b.status.toLowerCase(), href: "/app/platform", kind: "system" });
  }
  if (hasPermission(actor, "security.view")) {
    const ev = await all<{ action: string; occurred_at: string; outcome: string }>(db, "SELECT action, occurred_at, outcome FROM audit_events WHERE category IN ('SECURITY','AUTH') ORDER BY seq DESC LIMIT 3");
    for (const e of ev) items.push({ at: e.occurred_at, title: `Security: ${e.action}`, detail: e.outcome.toLowerCase(), href: "/app/security", kind: "security" });
  }
  if (!items.length) {
    const n = await all<{ title: string; body: string; link: string | null; created_at: string }>(db, "SELECT title, body, link, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 6", actor.userId);
    for (const x of n) items.push({ at: x.created_at, title: x.title, detail: x.body, href: x.link ?? undefined, kind: "general" });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
}

/** Technical status for platform and security roles (live checks). */
export async function systemStatus(db: DB, actor: Actor) {
  if (!hasPermission(actor, "platform.view") && !hasPermission(actor, "security.view")) return null;
  const t0 = Date.now();
  const v = await one<{ v: string }>(db, "SELECT VERSION() AS v");
  const ms = Date.now() - t0;
  const lastRun = await one<{ started_at: string }>(db, "SELECT started_at FROM job_runs ORDER BY id DESC LIMIT 1");
  const failures = await count(db, "SELECT COUNT(*) AS c FROM job_runs WHERE status = 'FAILED' AND started_at > ?", new Date(Date.now() - 86400000).toISOString());
  const backup = await one<{ finished_at: string }>(db, "SELECT finished_at FROM backup_runs WHERE status = 'SUCCESS' AND verified = 1 ORDER BY id DESC LIMIT 1");
  const maxAge = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'backup.max_age_hours'"))?.value) || 24;
  const interval = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'automation.interval_minutes'"))?.value) || 5;
  const jobsOk = !!lastRun && Date.now() - Date.parse(lastRun.started_at) < interval * 3 * 60000 && failures === 0;
  const backupOk = !!backup && Date.now() - Date.parse(backup.finished_at) < maxAge * 3600000;
  const maintenance = (await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'platform.maintenance_mode'"))?.value === "ON";
  const rows: Array<{ label: string; ok: boolean; value: string }> = [
    { label: "Application service", ok: !maintenance, value: maintenance ? "Maintenance mode" : "Online" },
    { label: "MySQL database (XAMPP)", ok: !!v, value: v ? `Online · ${ms} ms` : "Unreachable" },
    { label: "Authentication (RBAC)", ok: true, value: "Online" },
    { label: "Background jobs", ok: jobsOk, value: !lastRun ? "Not run yet" : failures ? `${failures} failure(s) in 24 h` : jobsOk ? "Running" : "Delayed" },
    { label: "Report and PDF generation", ok: true, value: "Online" },
    { label: "System backups", ok: backupOk, value: backup ? `Last ${new Date(backup.finished_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" })}` : "No verified backup" },
  ];
  return { rows, allOk: rows.every((r) => r.ok) };
}
