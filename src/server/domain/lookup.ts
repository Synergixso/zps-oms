/** Scoped option lists for forms and filters (server-side; never trusted back from the browser). */
import type { DB } from "../db/connection";
import { all } from "../db/connection";
import type { Permission } from "./catalogue";
import { type Actor, unitsFor } from "./policy";

export interface UnitOption { id: string; name: string; unit_type: string; depth: number }

/** Active units where `perm` applies for the actor, in hierarchy (tree) order with their depth below HQ. */
export async function scopedUnits(db: DB, actor: Actor, perm: Permission): Promise<UnitOption[]> {
  const units = unitsFor(actor, perm);
  if (units !== null && !units.length) return [];
  const rows = await all<{ id: string; name: string; unit_type: string; anc_name: string; depth: number }>(db,
    `SELECT o.id, o.name, o.unit_type, a.name AS anc_name, c.depth FROM org_units o
       JOIN org_unit_closure c ON c.descendant_id = o.id JOIN org_units a ON a.id = c.ancestor_id
      WHERE o.status = 'ACTIVE' ORDER BY o.id, c.depth DESC`);
  const byId = new Map<string, { u: UnitOption; path: string[] }>();
  for (const r of rows) {
    const e = byId.get(r.id) ?? { u: { id: r.id, name: r.name, unit_type: r.unit_type, depth: 0 }, path: [] };
    e.path.push(r.anc_name);
    e.u.depth = Math.max(e.u.depth, r.depth);
    byId.set(r.id, e);
  }
  const allowed = units === null ? null : new Set(units);
  return [...byId.values()]
    .filter((e) => !allowed || allowed.has(e.u.id))
    .sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / ")))
    .map((e) => e.u);
}

export const unitOptions = (list: UnitOption[]) => {
  const min = list.length ? Math.min(...list.map((u) => u.depth)) : 0;
  return list.map((u) => ({ value: u.id, label: `${"  ".repeat(Math.min(u.depth - min, 6))}${u.name}` }));
};
