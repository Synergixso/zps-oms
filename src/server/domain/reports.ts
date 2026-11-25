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

const countBy = (db: DB, sql: string, params: unknown[]) =>
  Object.fromEntries(all<{ k: string; c: number }>(db, sql, ...params).map((r) => [r.k, Number(r.c)]));

/** Aggregates for a scope. Callers must have already authorised the scope. */
export function computeSummary(db: DB, scope: Scope): Summary {
  const r = inScope(scope, "origin_org_id");
  const t = today();
  const requests = countBy(db, `SELECT status AS k, COUNT(*) AS c FROM admin_requests WHERE status <> 'DRAFT' AND ${r.sql} GROUP BY status`, r.params);
  const open = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "RETURNED"];
  const requestsOpen = open.reduce((s, k) => s + (requests[k] ?? 0), 0);
  const requestsOverdue = Number(one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM admin_requests WHERE due_date < ? AND status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${r.sql}`, t, ...r.params)?.c ?? 0);
  const ageRows = all<{ days: number }>(db, `SELECT julianday(?) - julianday(submitted_at) AS days FROM admin_requests WHERE submitted_at IS NOT NULL AND status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${r.sql}`, nowIso(), ...r.params);
  const bands = [["0–5 days", 5], ["6–10 days", 10], ["11–20 days", 20], ["Over 20 days", Infinity]] as const;
  const bandOf = (d: number) => bands.findIndex(([, hi]) => d <= hi);
  const ageing = bands.map(([band], i) => ({ band, count: ageRows.filter((x) => bandOf(x.days) === i).length }));
  const avg = one<{ d: number | null }>(
    db,
    `SELECT AVG(julianday(a.created_at) - julianday(r.submitted_at)) AS d FROM admin_requests r
       JOIN request_actions a ON a.request_id = r.id AND a.to_status = 'APPROVED' WHERE ${r.sql}`,
    ...r.params,
  );
  const m = inScope(scope, "org_unit_id");
  const maintenance = countBy(db, `SELECT status AS k, COUNT(*) AS c FROM maintenance_requests WHERE ${m.sql} GROUP BY status`, m.params);
  const v = inScope(scope, "custody_org_id");
  const vehicles = countBy(db, `SELECT status AS k, COUNT(*) AS c FROM vehicles WHERE ${v.sql} GROUP BY status`, v.params);
  const vehiclesServiceOverdue = Number(one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND next_service_due < ? AND ${v.sql}`, t, ...v.params)?.c ?? 0);
  const in60 = new Date(Date.parse(t) + 60 * 86400000).toISOString().slice(0, 10);
  const vehiclesDocsExpiring = Number(one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM vehicles WHERE status <> 'DISPOSED' AND (licence_expiry < ? OR insurance_expiry < ?) AND ${v.sql}`, in60, in60, ...v.params)?.c ?? 0);
  const assets = countBy(db, `SELECT status AS k, COUNT(*) AS c FROM assets WHERE ${v.sql} GROUP BY status`, v.params);
  const yearAgo = new Date(Date.parse(t) - 365 * 86400000).toISOString();
  const assetsNotInspected12m = Number(one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM assets WHERE status <> 'DISPOSED' AND (last_inspected_at IS NULL OR last_inspected_at < ?) AND ${v.sql}`, yearAgo, ...v.params)?.c ?? 0);
  return {
    requests, requestsOpen, requestsOverdue, ageing,
    avgApprovalDays: avg?.d != null ? Math.round(avg.d * 10) / 10 : null,
    maintenance, vehicles, vehiclesServiceOverdue, vehiclesDocsExpiring, assets, assetsNotInspected12m,
    assetsInTransfer: assets.IN_TRANSFER ?? 0,
  };
}

/** Per-organisation breakdown (national/coordination dashboards). */
export function breakdownByOrg(db: DB, scope: Scope) {
  const o = inScope(scope, "o.id");
  return all<{ id: string; name: string; unit_type: string; open_requests: number; overdue: number; vehicles: number; maint_open: number; assets: number }>(
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
];

export function availableReports(actor: Actor): ReportDef[] {
  if (!hasPermission(actor, "report.view")) return [];
  return REPORTS.filter((r) => r.domain.some((p) => hasPermission(actor, p)));
}

function reportRows(db: DB, code: string, scope: Scope): Record<string, string | number>[] {
  const o = inScope(scope, "o.id");
  const t = today();
  switch (code) {
    case "REQ_STATUS_BY_ORG":
      return all(db, `SELECT o.name AS organisation, r.status AS status, COUNT(*) AS count FROM admin_requests r JOIN org_units o ON o.id = r.origin_org_id
                       WHERE r.status <> 'DRAFT' AND ${o.sql} GROUP BY o.name, r.status ORDER BY o.name, r.status`, ...o.params);
    case "REQ_AGEING":
      return all(db, `SELECT o.name AS organisation,
                        CASE WHEN julianday(?) - julianday(r.submitted_at) <= 5 THEN '0-5 days' WHEN julianday(?) - julianday(r.submitted_at) <= 10 THEN '6-10 days'
                             WHEN julianday(?) - julianday(r.submitted_at) <= 20 THEN '11-20 days' ELSE 'Over 20 days' END AS age_band, COUNT(*) AS count
                       FROM admin_requests r JOIN org_units o ON o.id = r.origin_org_id
                       WHERE r.status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') AND ${o.sql} GROUP BY o.name, age_band ORDER BY o.name`, nowIso(), nowIso(), nowIso(), ...o.params);
    case "FLEET_MAINTENANCE":
      return all(db, `SELECT o.name AS organisation,
                        (SELECT COUNT(*) FROM vehicles v WHERE v.custody_org_id = o.id AND v.status <> 'DISPOSED') AS vehicles_active,
                        (SELECT COUNT(*) FROM vehicles v WHERE v.custody_org_id = o.id AND v.status <> 'DISPOSED' AND v.next_service_due < ?) AS service_overdue,
                        (SELECT COUNT(*) FROM maintenance_requests m WHERE m.org_unit_id = o.id AND m.status NOT IN ('CLOSED','REJECTED')) AS maintenance_open,
                        (SELECT COUNT(*) FROM maintenance_requests m WHERE m.org_unit_id = o.id AND m.status = 'CLOSED') AS maintenance_closed
                       FROM org_units o WHERE o.status = 'ACTIVE' AND ${o.sql} ORDER BY o.name`, t, ...o.params);
    case "ASSET_ACCOUNTABILITY": {
      const yearAgo = new Date(Date.parse(t) - 365 * 86400000).toISOString();
      return all(db, `SELECT o.name AS organisation,
                        SUM(a.status = 'IN_STORE') AS in_store, SUM(a.status = 'ISSUED') AS issued, SUM(a.status = 'IN_TRANSFER') AS in_transfer,
                        SUM(a.status = 'UNDER_REPAIR') AS under_repair,
                        SUM(a.status <> 'DISPOSED' AND (a.last_inspected_at IS NULL OR a.last_inspected_at < ?)) AS not_inspected_12m
                       FROM org_units o JOIN assets a ON a.custody_org_id = o.id WHERE ${o.sql} GROUP BY o.name ORDER BY o.name`, yearAgo, ...o.params);
    }
  }
  throw invalid("Unknown report.");
}

export function runReport(db: DB, actor: Actor, code: string) {
  const def = REPORTS.find((r) => r.code === code);
  if (!def) throw invalid("Unknown report.");
  requirePermission(db, actor, "report.view", undefined, { type: "report", id: code });
  if (!def.domain.some((p) => hasPermission(actor, p))) {
    audit(db, { actorId: actor.userId, action: "report.view", outcome: "DENIED", category: "SECURITY", entityType: "report", entityId: code });
    throw forbidden("This report is not within your authorised functions.");
  }
  return { def, rows: reportRows(db, code, scopeFor(actor, "report.view")) };
}

/** Exports an approved report as CSV. Requested fields outside the definition are refused. */
export function exportReport(db: DB, actor: Actor, code: string, requestedFields?: string[]) {
  const def = REPORTS.find((r) => r.code === code);
  if (!def) throw invalid("Unknown report.");
  requirePermission(db, actor, "report.export", undefined, { type: "report", id: code });
  const fields = requestedFields && requestedFields.length ? requestedFields : def.fields;
  const bad = fields.filter((f) => !def.fields.includes(f));
  if (bad.length) {
    audit(db, { actorId: actor.userId, action: "report.export", outcome: "DENIED", category: "EXPORT", entityType: "report", entityId: code, details: { unauthorisedFields: bad } });
    throw forbidden(`Field(s) not approved for export in this report: ${bad.join(", ")}.`);
  }
  const { rows } = runReport(db, actor, code);
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
  run(db, "INSERT INTO report_exports (id, report_code, user_id, filters, fields, row_count, created_at) VALUES (?,?,?,?,?,?,?)",
    id, code, actor.userId, JSON.stringify({ scope: exportScope }), JSON.stringify(fields), rows.length, nowIso());
  audit(db, { actorId: actor.userId, action: "report.export", category: "EXPORT", entityType: "report", entityId: code, details: { exportId: id, fields, rows: rows.length } });
  return { filename: `zps-oms-${code.toLowerCase()}-${today()}.csv`, csv };
}
