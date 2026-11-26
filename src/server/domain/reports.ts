/**
 * M06 — Dashboards and management reporting.
 * Aggregate-first: report output is counts by approved dimensions only.
 * No personnel strength, deployment, readiness or capability indicators.
 */
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "./audit";
import type { Permission } from "./catalogue";
import { forbidden, invalid, newId, nowIso, today } from "./core";
import { type Actor, type Scope, hasPermission, requirePermission, scopeFor } from "./policy";

function inScope(scope: Scope, column: string) {
  if (scope.national) return { sql: "1=1", params: [] as string[] };
  if (!scope.units.length) return { sql: "1=0", params: [] as string[] };
  return { sql: `${column} IN (${scope.units.map(() => "?").join(",")})`, params: scope.units };
}

export interface Summary {
  requests: Record<string, number>;
  requestsOpen: number;
  requestsOverdue: number;
  ageing: { band: string; count: number }[];
  avgApprovalDays: number | null;
  maintenance: Record<string, number>;
  vehicles: Record<string, number>;
  vehiclesServiceOverdue: number;
  vehiclesDocsExpiring: number;
  assets: Record<string, number>;
  assetsNotInspected12m: number;
  assetsInTransfer: number;
}

/** Fractional days from an ISO timestamp to a millisecond instant (replaces SQLite julianday arithmetic). */
const daysBetween = (fromIso: string, toMs: number) => (toMs - Date.parse(fromIso)) / 86400000;

const countBy = async (db: DB, sql: string, params: unknown[]) =>
  Object.fromEntries((await all<{ k: string; c: number }>(db, sql, ...params)).map((r) => [r.k, Number(r.c)]));

/** Aggregates for a scope. Callers must have already authorised the scope. */
export async function computeSummary(db: DB, scope: Scope): Promise<Summary> {
  const r = inScope(scope, "origin_org_id");
  const t = today();
  const requests = await countBy(db, `SELECT status AS k, COUNT(*) AS c FROM admin_requests WHERE status <> 'DRAFT' AND ${r.sql} GROUP BY status`, r.params);
  const open = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "RETURNED"];
  const requestsOpen = open.reduce((s, k) => s + (requests[k] ?? 0), 0);
  const requestsOverdue = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM admin_requests WHERE due_date < ? AND status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${r.sql}`, t, ...r.params))?.c ?? 0);
  const now = Date.parse(nowIso());
  const ageRows = (await all<{ submitted_at: string }>(db, `SELECT submitted_at FROM admin_requests WHERE submitted_at IS NOT NULL AND status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${r.sql}`, ...r.params))
    .map((x) => ({ days: daysBetween(x.submitted_at, now) }));
  const bands = [["0–5 days", 5], ["6–10 days", 10], ["11–20 days", 20], ["Over 20 days", Infinity]] as const;
  const bandOf = (d: number) => bands.findIndex(([, hi]) => d <= hi);
  const ageing = bands.map(([band], i) => ({ band, count: ageRows.filter((x) => bandOf(x.days) === i).length }));
  const approvals = await all<{ submitted_at: string; approved_at: string }>(
    db,
    `SELECT r.submitted_at, a.created_at AS approved_at FROM admin_requests r
       JOIN request_actions a ON a.request_id = r.id AND a.to_status = 'APPROVED' WHERE r.submitted_at IS NOT NULL AND ${r.sql}`,
    ...r.params,
  );
  const avg = { d: approvals.length ? approvals.reduce((sum, x) => sum + daysBetween(x.submitted_at, Date.parse(x.approved_at)), 0) / approvals.length : null };
  const m = inScope(scope, "org_unit_id");
  const maintenance = await countBy(db, `SELECT status AS k, COUNT(*) AS c FROM maintenance_requests WHERE ${m.sql} GROUP BY status`, m.params);
  const v = inScope(scope, "custody_org_id");
  const vehicles = await countBy(db, `SELECT status AS k, COUNT(*) AS c FROM vehicles WHERE ${v.sql} GROUP BY status`, v.params);
  const vehiclesServiceOverdue = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND next_service_due < ? AND ${v.sql}`, t, ...v.params))?.c ?? 0);
  const in60 = new Date(Date.parse(t) + 60 * 86400000).toISOString().slice(0, 10);
  const vehiclesDocsExpiring = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND (licence_expiry < ? OR insurance_expiry < ?) AND ${v.sql}`, in60, in60, ...v.params))?.c ?? 0);
  const assets = await countBy(db, `SELECT status AS k, COUNT(*) AS c FROM assets WHERE ${v.sql} GROUP BY status`, v.params);
  const yearAgo = new Date(Date.parse(t) - 365 * 86400000).toISOString();
  const assetsNotInspected12m = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM assets WHERE status <> 'DISPOSED' AND (last_inspected_at IS NULL OR last_inspected_at < ?) AND ${v.sql}`, yearAgo, ...v.params))?.c ?? 0);
  return {
    requests, requestsOpen, requestsOverdue, ageing,
    avgApprovalDays: avg?.d != null ? Math.round(avg.d * 10) / 10 : null,
    maintenance, vehicles, vehiclesServiceOverdue, vehiclesDocsExpiring, assets, assetsNotInspected12m,
    assetsInTransfer: assets.IN_TRANSFER ?? 0,
  };
}

/** Per-organisation breakdown (national/coordination dashboards). */
export async function breakdownByOrg(db: DB, scope: Scope) {
  const o = inScope(scope, "o.id");
  return await all<{ id: string; name: string; unit_type: string; open_requests: number; overdue: number; vehicles: number; maint_open: number; assets: number }>(
    db,
    `SELECT o.id, o.name, o.unit_type,
       (SELECT COUNT(*) FROM admin_requests r WHERE r.origin_org_id = o.id AND r.status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS','RETURNED')) AS open_requests,
       (SELECT COUNT(*) FROM admin_requests r WHERE r.origin_org_id = o.id AND r.due_date < ? AND r.status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS')) AS overdue,
       (SELECT COUNT(*) FROM vehicles v WHERE v.custody_org_id = o.id AND v.status <> 'DISPOSED') AS vehicles,
       (SELECT COUNT(*) FROM maintenance_requests m WHERE m.org_unit_id = o.id AND m.status NOT IN ('CLOSED','REJECTED')) AS maint_open,
       (SELECT COUNT(*) FROM assets a WHERE a.custody_org_id = o.id AND a.status <> 'DISPOSED') AS assets
     FROM org_units o WHERE o.status = 'ACTIVE' AND o.unit_type IN ('PROVINCIAL_DIVISION','FORMATION','SERVICE_HQ') AND ${o.sql}
     ORDER BY CASE o.unit_type WHEN 'SERVICE_HQ' THEN 0 WHEN 'PROVINCIAL_DIVISION' THEN 1 ELSE 2 END, o.name`,
    today(), ...o.params,
  );
}

// ---- Report definitions ----------------------------------------------------

export interface ReportDef {
  code: string;
  name: string;
  description: string;
  /** Any one of these grants eligibility (in addition to report.view). */
  domain: Permission[];
  fields: string[];
}

export const REPORTS: ReportDef[] = [
  {
    code: "REQ_STATUS_BY_ORG",
    name: "Administrative requests by organisation and status",
    description: "Count of non-draft administrative requests per originating organisation and workflow status.",
    domain: ["request.view", "dashboard.national.view", "dashboard.division.view", "dashboard.formation.view"],
    fields: ["organisation", "status", "count"],
  },
  {
    code: "REQ_AGEING",
    name: "Open request ageing",
    description: "Open administrative requests grouped by days since submission.",
    domain: ["request.view", "dashboard.national.view", "dashboard.division.view", "dashboard.formation.view"],
    fields: ["organisation", "age_band", "count"],
  },
  {
    code: "FLEET_MAINTENANCE",
    name: "Fleet maintenance administration",
    description: "Vehicles by administrative status, overdue services and open maintenance requests per organisation.",
    domain: ["fleet.view", "dashboard.national.view", "dashboard.division.view", "dashboard.formation.view"],
    fields: ["organisation", "vehicles_active", "service_overdue", "maintenance_open", "maintenance_closed"],
  },
  {
    code: "ASSET_ACCOUNTABILITY",
    name: "General asset accountability and reconciliation",
    description: "General assets by status and inspection currency per organisation.",
    domain: ["asset.view", "dashboard.national.view", "dashboard.division.view", "dashboard.formation.view"],
    fields: ["organisation", "in_store", "issued", "in_transfer", "under_repair", "not_inspected_12m"],
  },
  {
    code: "PERSONNEL_BY_UNIT",
    name: "Personnel register summary by organisation",
    description: "Officers by home unit: total, serving, verified, available at home unit and on field assignment.",
    domain: ["personnel.view"],
    fields: ["organisation", "unit_type", "total", "serving", "verified", "available", "on_assignment"],
  },
  {
    code: "DISPOSITION_SUMMARY",
    name: "Disposition status summary",
    description: "Officers by current disposition status per home organisation.",
    domain: ["personnel.view"],
    fields: ["organisation", "disposition", "count"],
  },
  {
    code: "MANPOWER_CONTRIBUTIONS",
    name: "Manpower requests and contribution progress",
    description: "Each manpower request with required, allocated, offered and accepted totals and the contribution deadline.",
    domain: ["manpower.view"],
    fields: ["reference", "requesting_unit", "status", "required", "allocated", "offered", "units_accepted", "units_total", "deadline"],
  },
  {
    code: "ASSIGNMENTS_BY_AREA",
    name: "Assignments by operational area",
    description: "Current assignments per duty area: active, awaiting approval, transfer pending, review due and under minimum tenure.",
    domain: ["assignment.view"],
    fields: ["operational_area", "responsible_unit", "active", "awaiting_approval", "transfer_pending", "review_due", "under_minimum_tenure"],
  },
  {
    code: "TENURE_BANDS",
    name: "Assignment tenure and renewals",
    description: "Active assignments per duty area by continuous-tenure band, with renewal counts.",
    domain: ["assignment.view"],
    fields: ["operational_area", "under_6_months", "months_6_to_12", "months_12_to_24", "over_24_months", "renewed_at_least_once"],
  },
  {
    code: "TRANSFERS_SUMMARY",
    name: "Transfers between operational areas",
    description: "Transfers by releasing area, receiving area and status.",
    domain: ["assignment.view"],
    fields: ["from_area", "to_area", "status", "count"],
  },
  {
    code: "APPROVAL_ACTIVITY",
    name: "Approval and workflow activity (last 90 days)",
    description: "Workflow decisions recorded in the last 90 days by record type and action, per organisation.",
    domain: ["manpower.view", "assignment.view", "workflow.view"],
    fields: ["organisation", "record_type", "action", "count"],
  },
];

export function availableReports(actor: Actor): ReportDef[] {
  if (!hasPermission(actor, "report.view")) return [];
  return REPORTS.filter((r) => r.domain.some((p) => hasPermission(actor, p)));
}

async function reportRows(db: DB, code: string, scope: Scope): Promise<Record<string, string | number>[]> {
  const o = inScope(scope, "o.id");
  const t = today();
  switch (code) {
    case "REQ_STATUS_BY_ORG":
      return await all(db, `SELECT o.name AS organisation, r.status AS status, COUNT(*) AS count FROM admin_requests r JOIN org_units o ON o.id = r.origin_org_id
                       WHERE r.status <> 'DRAFT' AND ${o.sql} GROUP BY o.name, r.status ORDER BY o.name, r.status`, ...o.params);
    case "REQ_AGEING": {
      const now = Date.parse(nowIso());
      const rows = await all<{ organisation: string; submitted_at: string }>(db, `SELECT o.name AS organisation, r.submitted_at FROM admin_requests r JOIN org_units o ON o.id = r.origin_org_id
                       WHERE r.submitted_at IS NOT NULL AND r.status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${o.sql} ORDER BY o.name`, ...o.params);
      const band = (d: number) => (d <= 5 ? "0-5 days" : d <= 10 ? "6-10 days" : d <= 20 ? "11-20 days" : "Over 20 days");
      const counts = new Map<string, { organisation: string; age_band: string; count: number }>();
      for (const x of rows) {
        const b = band(daysBetween(x.submitted_at, now));
        const k = `${x.organisation}\u0000${b}`;
        const e = counts.get(k) ?? { organisation: x.organisation, age_band: b, count: 0 };
        e.count++;
        counts.set(k, e);
      }
      return [...counts.values()];
    }
    case "FLEET_MAINTENANCE":
      return await all(db, `SELECT o.name AS organisation,
                        (SELECT COUNT(*) FROM vehicles v WHERE v.custody_org_id = o.id AND v.status <> 'DISPOSED') AS vehicles_active,
                        (SELECT COUNT(*) FROM vehicles v WHERE v.custody_org_id = o.id AND v.status <> 'DISPOSED' AND v.next_service_due < ?) AS service_overdue,
                        (SELECT COUNT(*) FROM maintenance_requests m WHERE m.org_unit_id = o.id AND m.status NOT IN ('CLOSED','REJECTED')) AS maintenance_open,
                        (SELECT COUNT(*) FROM maintenance_requests m WHERE m.org_unit_id = o.id AND m.status = 'CLOSED') AS maintenance_closed
                       FROM org_units o WHERE o.status = 'ACTIVE' AND ${o.sql} ORDER BY o.name`, t, ...o.params);
    case "ASSET_ACCOUNTABILITY": {
      const yearAgo = new Date(Date.parse(t) - 365 * 86400000).toISOString();
      return await all(db, `SELECT o.name AS organisation,
                        SUM(a.status = 'IN_STORE') AS in_store, SUM(a.status = 'ISSUED') AS issued, SUM(a.status = 'IN_TRANSFER') AS in_transfer,
                        SUM(a.status = 'UNDER_REPAIR') AS under_repair,
                        SUM(a.status <> 'DISPOSED' AND (a.last_inspected_at IS NULL OR a.last_inspected_at < ?)) AS not_inspected_12m
                       FROM org_units o JOIN assets a ON a.custody_org_id = o.id WHERE ${o.sql} GROUP BY o.name ORDER BY o.name`, yearAgo, ...o.params);
    }
    case "PERSONNEL_BY_UNIT":
      return await all(db, `SELECT o.name AS organisation, LOWER(REPLACE(o.unit_type, '_', ' ')) AS unit_type, COUNT(*) AS total,
                        SUM(p.employment_status = 'SERVING') AS serving, SUM(p.verification_status = 'VERIFIED') AS verified,
                        SUM(p.employment_status = 'SERVING' AND p.disposition_status IN ('AVAILABLE_HOME','RETURNED_HOME','RELEASED','COMPLETED','CANCELLED')) AS available,
                        SUM(p.disposition_status IN ('ACTIVE_ASSIGNMENT','REVIEW_DUE','RENEWAL_PENDING','RENEWED_ACTIVE','TRANSFER_PENDING')) AS on_assignment
                       FROM personnel_records p JOIN org_units o ON o.id = p.home_unit_id WHERE ${o.sql} GROUP BY o.id, o.name, o.unit_type ORDER BY o.name`, ...o.params);
    case "DISPOSITION_SUMMARY":
      return await all(db, `SELECT o.name AS organisation, d.label AS disposition, COUNT(*) AS count FROM personnel_records p JOIN org_units o ON o.id = p.home_unit_id
                       JOIN disposition_statuses d ON d.code = p.disposition_status WHERE ${o.sql} GROUP BY o.name, d.label, d.sort_order ORDER BY o.name, d.sort_order`, ...o.params);
    case "MANPOWER_CONTRIBUTIONS":
      return await all(db, `SELECT m.reference, o.name AS requesting_unit, m.status, m.total_required AS required,
                        COALESCE((SELECT SUM(c.required_count) FROM manpower_contributions c WHERE c.request_id = m.id), 0) AS allocated,
                        (SELECT COUNT(*) FROM manpower_contribution_entries e JOIN manpower_contributions c ON c.id = e.contribution_id WHERE c.request_id = m.id AND c.status IN ('SUBMITTED','ACCEPTED')) AS offered,
                        (SELECT COUNT(*) FROM manpower_contributions c WHERE c.request_id = m.id AND c.status = 'ACCEPTED') AS units_accepted,
                        (SELECT COUNT(*) FROM manpower_contributions c WHERE c.request_id = m.id) AS units_total, COALESCE(m.contribution_deadline, '') AS deadline
                       FROM manpower_requests m JOIN org_units o ON o.id = m.requesting_unit_id WHERE m.status <> 'DRAFT' AND ${o.sql} ORDER BY m.reference DESC`, ...o.params);
    case "ASSIGNMENTS_BY_AREA": {
      const min = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'assignment.minimum_tenure_days'"))?.value) || 365;
      const cutoff = new Date(Date.parse(t) - min * 86400000).toISOString().slice(0, 10);
      return await all(db, `SELECT ar.name AS operational_area, o.name AS responsible_unit,
                        COALESCE(SUM(a.status = 'ACTIVE'), 0) AS active, COALESCE(SUM(a.status = 'PENDING_APPROVAL'), 0) AS awaiting_approval,
                        COALESCE(SUM(a.status = 'TRANSFER_PENDING'), 0) AS transfer_pending,
                        COALESCE(SUM(a.status = 'ACTIVE' AND p.disposition_status IN ('REVIEW_DUE','RENEWAL_PENDING')), 0) AS review_due,
                        COALESCE(SUM(a.status IN ('ACTIVE','TRANSFER_PENDING') AND a.continuous_start_date > ?), 0) AS under_minimum_tenure
                       FROM operational_areas ar JOIN org_units o ON o.id = ar.responsible_unit_id
                       LEFT JOIN personnel_assignments a ON a.area_id = ar.id AND a.status IN ('ACTIVE','PENDING_APPROVAL','TRANSFER_PENDING')
                       LEFT JOIN personnel_records p ON p.id = a.personnel_id
                      WHERE ${o.sql} GROUP BY ar.id, ar.name, o.name ORDER BY ar.name`, cutoff, ...o.params);
    }
    case "TENURE_BANDS": {
      const d = (days: number) => new Date(Date.parse(t) - days * 86400000).toISOString().slice(0, 10);
      return await all(db, `SELECT ar.name AS operational_area,
                        SUM(a.continuous_start_date > ?) AS under_6_months,
                        SUM(a.continuous_start_date <= ? AND a.continuous_start_date > ?) AS months_6_to_12,
                        SUM(a.continuous_start_date <= ? AND a.continuous_start_date > ?) AS months_12_to_24,
                        SUM(a.continuous_start_date <= ?) AS over_24_months,
                        SUM(EXISTS (SELECT 1 FROM assignment_renewals rn WHERE rn.assignment_id = a.id AND rn.decision = 'RENEWED')) AS renewed_at_least_once
                       FROM personnel_assignments a JOIN operational_areas ar ON ar.id = a.area_id JOIN org_units o ON o.id = ar.responsible_unit_id
                      WHERE a.status IN ('ACTIVE','TRANSFER_PENDING') AND ${o.sql} GROUP BY ar.id, ar.name ORDER BY ar.name`,
        d(182), d(182), d(365), d(365), d(730), d(730), ...o.params);
    }
    case "TRANSFERS_SUMMARY":
      return await all(db, `SELECT fa.name AS from_area, ta.name AS to_area, LOWER(REPLACE(t.status, '_', ' ')) AS status, COUNT(*) AS count
                       FROM assignment_transfers t JOIN operational_areas fa ON fa.id = t.from_area_id JOIN operational_areas ta ON ta.id = t.to_area_id
                       JOIN org_units o ON o.id = t.releasing_unit_id WHERE ${o.sql} GROUP BY fa.name, ta.name, t.status ORDER BY fa.name, ta.name`, ...o.params);
    case "APPROVAL_ACTIVITY":
      return await all(db, `SELECT o.name AS organisation, REPLACE(x.entity_type, '_', ' ') AS record_type, LOWER(REPLACE(x.action, '_', ' ')) AS action, COUNT(*) AS count
                       FROM approval_actions x JOIN org_units o ON o.id = x.org_unit_id WHERE x.created_at >= ? AND ${o.sql}
                       GROUP BY o.name, x.entity_type, x.action ORDER BY o.name, x.entity_type, count DESC`, new Date(Date.parse(t) - 90 * 86400000).toISOString(), ...o.params);
  }
  throw invalid("Unknown report.");
}

export async function runReport(db: DB, actor: Actor, code: string) {
  const def = REPORTS.find((r) => r.code === code);
  if (!def) throw invalid("Unknown report.");
  await requirePermission(db, actor, "report.view", undefined, { type: "report", id: code });
  if (!def.domain.some((p) => hasPermission(actor, p))) {
    await audit(db, { actorId: actor.userId, action: "report.view", outcome: "DENIED", category: "SECURITY", entityType: "report", entityId: code });
    throw forbidden("This report is not within your authorised functions.");
  }
  return { def, rows: await reportRows(db, code, scopeFor(actor, "report.view")) };
}

/** Exports an approved report as CSV. Requested fields outside the definition are refused. */
export async function exportReport(db: DB, actor: Actor, code: string, requestedFields?: string[]) {
  const def = REPORTS.find((r) => r.code === code);
  if (!def) throw invalid("Unknown report.");
  await requirePermission(db, actor, "report.export", undefined, { type: "report", id: code });
  const fields = requestedFields && requestedFields.length ? requestedFields : def.fields;
  const bad = fields.filter((f) => !def.fields.includes(f));
  if (bad.length) {
    await audit(db, { actorId: actor.userId, action: "report.export", outcome: "DENIED", category: "EXPORT", entityType: "report", entityId: code, details: { unauthorisedFields: bad } });
    throw forbidden(`Field(s) not approved for export in this report: ${bad.join(", ")}.`);
  }
  const { rows } = await runReport(db, actor, code);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV formula-injection guard
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const exportScope = scopeFor(actor, "report.export");
  const csv = [
    "# ZPS-OMS SYNTHETIC DEMONSTRATION DATA - not Zambia Police Service records",
    `# Report: ${def.name}; generated ${nowIso()}; scope: ${exportScope.national ? "national" : exportScope.units.join("|")}`,
    fields.join(","),
    ...rows.map((r) => fields.map((f) => esc(r[f])).join(",")),
  ].join("\n");
  const id = newId("exp");
  await run(db, "INSERT INTO report_exports (id, report_code, user_id, filters, fields, row_count, created_at) VALUES (?,?,?,?,?,?,?)",
    id, code, actor.userId, JSON.stringify({ scope: exportScope }), JSON.stringify(fields), rows.length, nowIso());
  await audit(db, { actorId: actor.userId, action: "report.export", category: "EXPORT", entityType: "report", entityId: code, details: { exportId: id, fields, rows: rows.length } });
  return { filename: `zps-oms-${code.toLowerCase()}-${today()}.csv`, csv };
}

// ---- Saved custom reports ---------------------------------------------------

export interface SavedReport { id: string; name: string; report_code: string; fields: string[]; sort_field: string | null; sort_dir: "asc" | "desc"; created_at: string }

/** Projects and sorts report rows to a chosen subset of the report's approved fields. */
export function shapeRows(def: ReportDef, rows: Record<string, string | number>[], fields?: string[], sort?: string | null, dir: "asc" | "desc" = "asc") {
  const cols = fields && fields.length ? def.fields.filter((f) => fields.includes(f)) : def.fields;
  const out = [...rows];
  if (sort && def.fields.includes(sort)) {
    out.sort((a, b) => {
      const x = a[sort], y = b[sort];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      return dir === "desc" ? -c : c;
    });
  }
  return { cols, rows: out };
}

export async function listSavedReports(db: DB, actor: Actor): Promise<SavedReport[]> {
  const rows = await all<Omit<SavedReport, "fields"> & { fields: string }>(db, "SELECT id, name, report_code, fields, sort_field, sort_dir, created_at FROM saved_reports WHERE user_id = ? ORDER BY name", actor.userId);
  const allowed = new Set(availableReports(actor).map((r) => r.code));
  // A saved report whose underlying report is no longer within the user's functions is hidden (never widened).
  return rows.filter((r) => allowed.has(r.report_code)).map((r) => ({ ...r, fields: JSON.parse(r.fields) as string[] }));
}

export async function getSavedReport(db: DB, actor: Actor, id: string): Promise<SavedReport | undefined> {
  return (await listSavedReports(db, actor)).find((r) => r.id === id);
}

export async function saveReport(db: DB, actor: Actor, input: { name: string; code: string; fields: string[]; sortField?: string; sortDir?: string }) {
  const def = REPORTS.find((r) => r.code === input.code);
  if (!def) throw invalid("Unknown report.");
  await runReport(db, actor, input.code); // authorisation: must be able to run the report
  const name = input.name.trim();
  if (name.length < 3 || name.length > 120) throw invalid("Give the saved report a name (3–120 characters).");
  const fields = input.fields.filter((f) => def.fields.includes(f));
  if (!fields.length) throw invalid("Select at least one approved field.");
  if (input.fields.some((f) => !def.fields.includes(f))) throw forbidden("Only the report's approved fields can be used.");
  const sort = input.sortField && def.fields.includes(input.sortField) ? input.sortField : null;
  const id = newId("srp");
  await run(db, "INSERT INTO saved_reports (id, user_id, name, report_code, fields, sort_field, sort_dir, created_at) VALUES (?,?,?,?,?,?,?,?)",
    id, actor.userId, name, def.code, JSON.stringify(fields), sort, input.sortDir === "desc" ? "desc" : "asc", nowIso());
  await audit(db, { actorId: actor.userId, action: "report.saved.create", category: "CONFIG", entityType: "report", entityId: def.code, details: { name, fields } });
  return id;
}

export async function deleteSavedReport(db: DB, actor: Actor, id: string) {
  const n = await run(db, "DELETE FROM saved_reports WHERE id = ? AND user_id = ?", id, actor.userId);
  if (!n.changes) throw invalid("Saved report not found.");
}
