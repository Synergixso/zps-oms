/**
 * Executive portfolio views (final master directive Part B, §8.2). Each executive office gets data appropriate to its
 * mandate — not one generic dashboard with a changed heading:
 *  - Inspector General: the three DIG portfolios side by side (Operations administration, Administration / training,
 *    Special Duties coordination) plus every coordination request (oversight);
 *  - DIG Operations: operations administration, mining security services, coordination;
 *  - DIG Administration: service-wide training, workforce strength (AGGREGATE counts by Division — no individual
 *    records; individual Operations records stay restricted pending H-3, issue #6), coordination;
 *  - DIG Special Duties / State House: its coordination requests with the other portfolios.
 * Office-based (appointment), computed server-side; counts only on the overview.
 */
import type { DB } from "../db/connection";
import { all } from "../db/connection";
import type { Actor } from "./policy";
import { officesHeld } from "./command";
import { opsSummary } from "./ops-admin";
import { listCoordination } from "./coordination";
import { trainingOverview } from "./training";

export type ExecutiveOffice = "IG" | "DIG_OPERATIONS" | "DIG_ADMINISTRATION" | "DIG_SPECIAL_DUTIES";
const EXEC: ExecutiveOffice[] = ["IG", "DIG_OPERATIONS", "DIG_ADMINISTRATION", "DIG_SPECIAL_DUTIES"];

export async function executiveOffices(db: DB, actor: Actor): Promise<ExecutiveOffice[]> {
  return [...new Set((await officesHeld(db, actor)).map((h) => h.positionType).filter((t): t is ExecutiveOffice => (EXEC as string[]).includes(t)))];
}

async function workforceByDivision(db: DB) {
  const rows = await all<{ division: string | null; serving: number }>(db,
    `SELECT d.name AS division, COUNT(*) AS serving FROM personnel_records p
       LEFT JOIN org_units d ON d.id = (SELECT a.id FROM org_unit_closure c JOIN org_units a ON a.id = c.ancestor_id WHERE c.descendant_id = p.home_unit_id AND a.unit_type IN ('PROVINCIAL_DIVISION','FORMATION') ORDER BY c.depth DESC LIMIT 1)
      WHERE p.employment_status = 'SERVING' GROUP BY d.name ORDER BY d.name`);
  return rows.map((r) => ({ division: r.division ?? "Service HQ", serving: Number(r.serving) }));
}

export async function executivePortfolio(db: DB, actor: Actor) {
  const offices = await executiveOffices(db, actor);
  if (!offices.length) return null;
  const has = (o: ExecutiveOffice) => offices.includes(o);
  const coordination = await listCoordination(db, actor);
  const open = coordination.filter((c) => ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(c.status));
  const sees = (o: ExecutiveOffice[]) => o.some(has);
  return {
    offices,
    coordination: { open: open.length, total: coordination.length, recent: coordination.slice(0, 6) },
    operations: sees(["IG", "DIG_OPERATIONS"]) ? await opsSummary(db, actor) : null,
    training: sees(["IG", "DIG_ADMINISTRATION"]) && (has("DIG_ADMINISTRATION") || actor.assignments.length) ? await trainingOverview(db, actor).catch(() => null) : null,
    workforce: has("DIG_ADMINISTRATION") ? await workforceByDivision(db) : null,
  };
}
