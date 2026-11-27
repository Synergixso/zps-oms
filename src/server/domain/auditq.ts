/** Audit search and evidence export (M10). Read-only; restricted to audit.view / security.view. */
import { pageQuery, splitSelect, type Page, type Paging } from "./paging";
import type { DB } from "../db/connection";
import { all, run } from "../db/connection";
import { audit } from "./audit";
import { addDays, newId, nowIso, today } from "./core";
import { type Actor, requirePermission } from "./policy";

export interface AuditRow {
  seq: number;
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  outcome: string;
  entity_type: string | null;
  entity_id: string | null;
  org_name: string | null;
  category: string;
  details: string | null;
  hash: string;
}

export interface AuditFilters {
  q?: string;
  category?: string;
  outcome?: string;
  actor?: string;
  from?: string;
  to?: string;
}

function build(f: AuditFilters, securityOnly: boolean) {
  const where: string[] = [];
  const p: unknown[] = [];
  if (securityOnly) where.push("e.category IN ('AUTH','IAM','SECURITY','CONFIG')");
  if (f.category) { where.push("e.category = ?"); p.push(f.category); }
  if (f.outcome) { where.push("e.outcome = ?"); p.push(f.outcome); }
  if (f.actor) { where.push("e.actor_id = ?"); p.push(f.actor); }
  if (f.q) { where.push("(e.action LIKE ? OR e.entity_id LIKE ? OR e.details LIKE ?)"); p.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) { where.push("e.occurred_at >= ?"); p.push(f.from); }
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) { where.push("e.occurred_at < ?"); p.push(addDays(f.to, 1)); }
  return { sql: where.length ? "WHERE " + where.join(" AND ") : "", p };
}

const SELECT = `SELECT e.*, u.display_name AS actor_name, o.name AS org_name FROM audit_events e
  LEFT JOIN users u ON u.id = e.actor_id LEFT JOIN org_units o ON o.id = e.org_unit_id`;

/** One page of the audit explorer with the true number of matching events. */
export async function pageAudit(db: DB, actor: Actor, f: AuditFilters, p: Paging = {}): Promise<Page<AuditRow>> {
  await requirePermission(db, actor, "audit.view");
  const { sql, p: params } = build(f, false);
  return pageQuery<AuditRow>(db, { ...splitSelect(SELECT), where: sql ? sql.replace(/^WHERE /, "") : "1=1", params, order: "e.seq DESC" }, p);
}

/** One page of security events with the true number of matching events. */
export async function pageSecurityEvents(db: DB, actor: Actor, f: AuditFilters, p: Paging = {}): Promise<Page<AuditRow>> {
  await requirePermission(db, actor, "security.view");
  const { sql, p: params } = build(f, true);
  return pageQuery<AuditRow>(db, { ...splitSelect(SELECT), where: sql ? sql.replace(/^WHERE /, "") : "1=1", params, order: "e.seq DESC" }, p);
}

export async function searchAudit(db: DB, actor: Actor, f: AuditFilters, limit = 200): Promise<AuditRow[]> {
  await requirePermission(db, actor, "audit.view");
  const { sql, p } = build(f, false);
  return await all<AuditRow>(db, `${SELECT} ${sql} ORDER BY e.seq DESC LIMIT ${Math.min(limit, 1000)}`, ...p);
}

export async function securityEvents(db: DB, actor: Actor, f: AuditFilters, limit = 200): Promise<AuditRow[]> {
  await requirePermission(db, actor, "security.view");
  const { sql, p } = build(f, true);
  return await all<AuditRow>(db, `${SELECT} ${sql} ORDER BY e.seq DESC LIMIT ${Math.min(limit, 1000)}`, ...p);
}

export async function exportAuditEvidence(db: DB, actor: Actor, f: AuditFilters) {
  await requirePermission(db, actor, "audit.export");
  const rows = await searchAudit(db, actor, f, 1000);
  const fields = ["seq", "occurred_at", "actor_name", "action", "outcome", "category", "entity_type", "entity_id", "org_name", "details", "hash"] as const;
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [
    "# ZPS-OMS AUDIT EVIDENCE EXPORT - SYNTHETIC DEMONSTRATION DATA",
    `# exported ${nowIso()} by ${actor.displayName}; filters ${JSON.stringify(f)}`,
    fields.join(","),
    ...rows.map((r) => fields.map((k) => esc(r[k])).join(",")),
  ].join("\n");
  await run(db, "INSERT INTO report_exports (id, report_code, user_id, filters, fields, row_count, created_at) VALUES (?, 'AUDIT_EVIDENCE', ?, ?, ?, ?, ?)",
    newId("exp"), actor.userId, JSON.stringify({ auditEvidence: true, ...f }), JSON.stringify(fields), rows.length, nowIso());
  await audit(db, { actorId: actor.userId, action: "audit.evidence.export", category: "EXPORT", details: { filters: f, rows: rows.length } });
  return { filename: `zps-oms-audit-evidence-${today()}.csv`, csv };
}
