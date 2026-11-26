/**
 * M14 — Record history views for auditors (read-only, audit.view).
 * Workflow decisions, disposition changes, personnel record changes and report exports, with filters.
 */
import type { DB } from "../db/connection";
import { all } from "../db/connection";
import { addDays } from "./core";
import { type Actor, HQ_ID, requirePermission } from "./policy";

export const HISTORY_KINDS = {
  workflow: "Workflow decisions",
  disposition: "Disposition changes",
  personnel: "Personnel record changes",
  exports: "Report and register exports",
} as const;
export type HistoryKind = keyof typeof HISTORY_KINDS;

export const RECORD_TYPES = ["manpower_request", "manpower_contribution", "roster", "assignment", "transfer"] as const;

export async function recordHistory(db: DB, actor: Actor, kind: HistoryKind, f: { type?: string; from?: string; to?: string; q?: string } = {}) {
  await requirePermission(db, actor, "audit.view", HQ_ID, { type: "history", id: kind });
  const from = f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from) ? f.from : "0000-01-01";
  const to = f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to) ? addDays(f.to, 1) : "9999-12-31";
  const q = f.q?.trim() ? `%${f.q.trim().toLowerCase()}%` : null;
  switch (kind) {
    case "workflow":
      return all<Record<string, string | number | null>>(db,
        `SELECT x.created_at AS time, REPLACE(x.entity_type, '_', ' ') AS record_type, x.entity_id AS record, x.action, CONCAT(COALESCE(x.from_status, '—'), ' → ', COALESCE(x.to_status, '—')) AS transition,
                u.display_name AS actor, o.name AS organisation, x.comment
           FROM approval_actions x JOIN users u ON u.id = x.actor_id LEFT JOIN org_units o ON o.id = x.org_unit_id
          WHERE x.created_at >= ? AND x.created_at < ? ${f.type && (RECORD_TYPES as readonly string[]).includes(f.type) ? "AND x.entity_type = ?" : ""}
            ${q ? "AND (LOWER(x.action) LIKE ? OR LOWER(COALESCE(x.comment, '')) LIKE ? OR LOWER(u.display_name) LIKE ?)" : ""}
          ORDER BY x.seq DESC LIMIT 500`,
        from, to, ...(f.type && (RECORD_TYPES as readonly string[]).includes(f.type) ? [f.type] : []), ...(q ? [q, q, q] : []));
    case "disposition":
      return all<Record<string, string | number | null>>(db,
        `SELECT d.created_at AS time, p.personnel_ref AS officer, COALESCE(d.previous_status, '—') AS previous_status, d.new_status, d.effective_date, d.reason, d.reference, COALESCE(u.display_name, 'System') AS authorised_by
           FROM disposition_history d JOIN personnel_records p ON p.id = d.personnel_id LEFT JOIN users u ON u.id = d.authorised_by
          WHERE d.created_at >= ? AND d.created_at < ? ${q ? "AND (LOWER(p.personnel_ref) LIKE ? OR LOWER(d.reason) LIKE ? OR LOWER(COALESCE(d.reference, '')) LIKE ?)" : ""}
          ORDER BY d.seq DESC LIMIT 500`, from, to, ...(q ? [q, q, q] : []));
    case "personnel":
      return all<Record<string, string | number | null>>(db,
        `SELECT h.created_at AS time, p.personnel_ref AS officer, h.field, COALESCE(h.old_value, '—') AS old_value, COALESCE(h.new_value, '—') AS new_value, h.reason, COALESCE(u.display_name, 'System') AS actor
           FROM personnel_history h JOIN personnel_records p ON p.id = h.personnel_id LEFT JOIN users u ON u.id = h.actor_id
          WHERE h.created_at >= ? AND h.created_at < ? ${q ? "AND (LOWER(p.personnel_ref) LIKE ? OR LOWER(h.field) LIKE ? OR LOWER(COALESCE(h.reason, '')) LIKE ?)" : ""}
          ORDER BY h.seq DESC LIMIT 500`, from, to, ...(q ? [q, q, q] : []));
    case "exports":
      return all<Record<string, string | number | null>>(db,
        `SELECT e.occurred_at AS time, e.action, COALESCE(u.display_name, '—') AS actor, e.entity_type AS record_type, COALESCE(e.entity_id, '') AS record, e.outcome, e.details
           FROM audit_events e LEFT JOIN users u ON u.id = e.actor_id
          WHERE e.category = 'EXPORT' AND e.occurred_at >= ? AND e.occurred_at < ? ${q ? "AND (LOWER(e.action) LIKE ? OR LOWER(COALESCE(u.display_name, '')) LIKE ?)" : ""}
          ORDER BY e.seq DESC LIMIT 500`, from, to, ...(q ? [q, q] : []));
  }
}
