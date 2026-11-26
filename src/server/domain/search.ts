/** Global search (top bar). Every category is permission- and scope-filtered on the server; nothing outside scope is returned. */
import type { DB } from "../db/connection";
import { all } from "../db/connection";
import { audit } from "./audit";
import { type Actor, hasPermission, unitsFor } from "./policy";
import type { Permission } from "./catalogue";

export interface SearchHit { title: string; subtitle: string; href: string }
export interface SearchGroup { key: string; label: string; hits: SearchHit[] }

const LIMIT = 8;

function scope(actor: Actor, perm: Permission, cols: string[]): { sql: string; params: string[] } | null {
  if (!hasPermission(actor, perm)) return null;
  const u = unitsFor(actor, perm);
  if (u === null) return { sql: "1=1", params: [] };
  if (!u.length) return null;
  const ph = u.map(() => "?").join(",");
  return { sql: `(${cols.map((c) => `${c} IN (${ph})`).join(" OR ")})`, params: cols.flatMap(() => u) };
}

export async function globalSearch(db: DB, actor: Actor, raw: string): Promise<SearchGroup[]> {
  const q = raw.trim().slice(0, 60);
  if (q.length < 2) return [];
  const like = `%${q.toLowerCase()}%`;
  const groups: SearchGroup[] = [];
  const add = (key: string, label: string, hits: SearchHit[]) => hits.length && groups.push({ key, label, hits });

  const per = scope(actor, "personnel.view", ["p.home_unit_id"]);
  if (per) {
    const rows = await all<{ id: string; ref: string; svc: string; name: string; rank: string; unit: string }>(db,
      `SELECT p.id, p.personnel_ref AS ref, p.service_number AS svc, CONCAT(p.surname, ', ', p.first_names) AS name, r.name AS rank, o.name AS unit
         FROM personnel_records p JOIN ranks r ON r.code = p.rank_code JOIN org_units o ON o.id = p.home_unit_id
        WHERE ${per.sql} AND (p.name_key LIKE ? OR LOWER(p.service_number) LIKE ? OR LOWER(p.personnel_ref) LIKE ?) ORDER BY p.surname LIMIT ${LIMIT}`, ...per.params, like, like, like);
    add("personnel", "Personnel", rows.map((r) => ({ title: `${r.rank} ${r.name}`, subtitle: `${r.ref} · ${r.svc} · ${r.unit}`, href: `/app/personnel/${r.id}` })));
  }
  const mpr = scope(actor, "manpower.view", ["m.requesting_unit_id"]);
  if (mpr) {
    const rows = await all<{ id: string; reference: string; purpose: string; status: string }>(db,
      `SELECT m.id, m.reference, m.purpose, m.status FROM manpower_requests m WHERE ${mpr.sql} AND (LOWER(m.reference) LIKE ? OR LOWER(m.purpose) LIKE ?) ORDER BY m.created_at DESC LIMIT ${LIMIT}`, ...mpr.params, like, like);
    add("manpower", "Manpower requests", rows.map((r) => ({ title: r.reference, subtitle: `${r.purpose} · ${r.status.toLowerCase().replace(/_/g, " ")}`, href: `/app/manpower/${r.id}` })));
  }
  const asg = scope(actor, "assignment.view", ["a.responsible_unit_id", "a.home_unit_id"]);
  if (asg) {
    const rows = await all<{ id: string; reference: string; name: string; area: string; status: string }>(db,
      `SELECT a.id, a.reference, CONCAT(p.surname, ', ', p.first_names) AS name, ar.name AS area, a.status FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id
         JOIN operational_areas ar ON ar.id = a.area_id WHERE ${asg.sql} AND (LOWER(a.reference) LIKE ? OR p.name_key LIKE ? OR LOWER(ar.name) LIKE ?) ORDER BY a.created_at DESC LIMIT ${LIMIT}`, ...asg.params, like, like, like);
    add("assignments", "Assignments", rows.map((r) => ({ title: `${r.reference} — ${r.name}`, subtitle: `${r.area} · ${r.status.toLowerCase().replace(/_/g, " ")}`, href: `/app/assignments/${r.id}` })));
    const tr = await all<{ id: string; reference: string; name: string; status: string }>(db,
      `SELECT t.id, t.reference, CONCAT(p.surname, ', ', p.first_names) AS name, t.status FROM assignment_transfers t JOIN personnel_records p ON p.id = t.personnel_id JOIN personnel_assignments a ON a.id = t.assignment_id
        WHERE ${asg.sql} AND (LOWER(t.reference) LIKE ? OR p.name_key LIKE ?) ORDER BY t.initiated_at DESC LIMIT ${LIMIT}`, ...asg.params, like, like);
    add("transfers", "Transfers", tr.map((r) => ({ title: `${r.reference} — ${r.name}`, subtitle: r.status.toLowerCase().replace(/_/g, " "), href: `/app/transfers/${r.id}` })));
  }
  const area = scope(actor, "area.view", ["responsible_unit_id"]);
  if (area) {
    const rows = await all<{ id: string; code: string; name: string }>(db, `SELECT id, code, name FROM operational_areas WHERE ${area.sql} AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ?) ORDER BY name LIMIT ${LIMIT}`, ...area.params, like, like);
    add("areas", "Operational areas", rows.map((r) => ({ title: r.name, subtitle: r.code, href: `/app/areas/${r.id}` })));
  }
  if (hasPermission(actor, "org.view")) {
    const rows = await all<{ id: string; code: string; name: string; unit_type: string }>(db, "SELECT id, code, name, unit_type FROM org_units WHERE status = 'ACTIVE' AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ?) ORDER BY name LIMIT 8", like, like);
    add("org", "Organisation units", rows.map((r) => ({ title: r.name, subtitle: `${r.code} · ${r.unit_type.toLowerCase().replace(/_/g, " ")}`, href: `/app/org/${r.id}` })));
  }
  if (hasPermission(actor, "user.view")) {
    const rows = await all<{ id: string; username: string; display_name: string; user_ref: string | null }>(db, "SELECT id, username, display_name, user_ref FROM users WHERE LOWER(display_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(COALESCE(user_ref, '')) LIKE ? ORDER BY display_name LIMIT 8", like, like, like);
    add("users", "User accounts", rows.map((r) => ({ title: r.display_name, subtitle: `${r.user_ref ?? ""} · ${r.username}`, href: `/app/admin/users/${r.id}` })));
  }
  if (hasPermission(actor, "personnel.view")) {
    await audit(db, { actorId: actor.userId, action: "search.global", category: "BUSINESS", details: { length: q.length, groups: groups.map((g) => `${g.key}:${g.hits.length}`) } });
  }
  return groups;
}
