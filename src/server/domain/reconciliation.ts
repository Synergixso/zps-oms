/**
 * M11 — Asset reconciliation (stock-take). Non-sensitive general assets only.
 * A custodian opens a reconciliation for a unit; every non-disposed asset in that unit's custody becomes a
 * checklist item; each is recorded FOUND / DAMAGED / MISSING; closing requires every item to be checked,
 * records an asset event per finding, refreshes inspection dates and is audited.
 */
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, invalid, newId, notFound, nowIso, today } from "./core";
import { type Actor, can, requirePermission, unitsFor } from "./policy";

export interface ReconRow { id: string; reference: string; org_unit_id: string; unit_name: string; status: string; opened_by_name: string; opened_at: string; closed_by_name: string | null; closed_at: string | null; summary: string | null; note: string | null; items: number; checked: number }

const SELECT = `SELECT r.*, o.name AS unit_name, ob.display_name AS opened_by_name, cb.display_name AS closed_by_name,
       (SELECT COUNT(*) FROM asset_reconciliation_items i WHERE i.reconciliation_id = r.id) AS items,
       (SELECT COUNT(*) FROM asset_reconciliation_items i WHERE i.reconciliation_id = r.id AND i.result IS NOT NULL) AS checked
  FROM asset_reconciliations r JOIN org_units o ON o.id = r.org_unit_id JOIN users ob ON ob.id = r.opened_by LEFT JOIN users cb ON cb.id = r.closed_by`;

export async function listReconciliations(db: DB, actor: Actor) {
  await requirePermission(db, actor, "asset.view");
  const units = unitsFor(actor, "asset.view");
  const scope = units === null ? "1=1" : units.length ? `r.org_unit_id IN (${units.map(() => "?").join(",")})` : "1=0";
  return all<ReconRow>(db, `${SELECT} WHERE ${scope} ORDER BY r.opened_at DESC LIMIT 200`, ...(units ?? []));
}

export async function reconciliationDetail(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "asset.view");
  const r = await one<ReconRow>(db, `${SELECT} WHERE r.id = ?`, id);
  if (!r || !can(actor, "asset.view", r.org_unit_id)) throw notFound();
  const items = await all<{ id: string; asset_id: string; asset_tag: string; description: string; category_code: string; expected_status: string; result: string | null; note: string | null; checked_by_name: string | null; checked_at: string | null }>(db,
    `SELECT i.*, a.asset_tag, a.description, a.category_code, u.display_name AS checked_by_name FROM asset_reconciliation_items i JOIN assets a ON a.id = i.asset_id
       LEFT JOIN users u ON u.id = i.checked_by WHERE i.reconciliation_id = ? ORDER BY a.asset_tag`, id);
  return { reconciliation: r, items, canRecord: r.status === "OPEN" && can(actor, "asset.inspect", r.org_unit_id) };
}

export async function openReconciliation(db: DB, actor: Actor, unitId: string, note: string) {
  await requirePermission(db, actor, "asset.inspect", unitId, { type: "asset_reconciliation" });
  if (await one(db, "SELECT id FROM asset_reconciliations WHERE org_unit_id = ? AND status = 'OPEN'", unitId)) throw conflict("A reconciliation is already open for this unit.");
  const unit = await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = ? AND status = 'ACTIVE'", unitId);
  if (!unit) throw invalid("Select an active unit.");
  const assets = await all<{ id: string; status: string }>(db, "SELECT id, status FROM assets WHERE custody_org_id = ? AND status <> 'DISPOSED'", unitId);
  if (!assets.length) throw invalid("There are no assets in this unit's custody to reconcile.");
  const id = newId("arc");
  await tx(db, async (db) => {
    const year = today().slice(0, 4);
    const max = await one<{ m: string | null }>(db, "SELECT MAX(reference) AS m FROM asset_reconciliations WHERE reference LIKE ?", `REC-${year}-%`);
    const ref = `REC-${year}-${String((max?.m ? Number(max.m.split("-")[2]) : 0) + 1).padStart(5, "0")}`;
    await run(db, "INSERT INTO asset_reconciliations (id, reference, tenant_id, org_unit_id, status, opened_by, opened_at, note) VALUES (?,?,?,?, 'OPEN', ?,?,?)", id, ref, unit.tenant_id, unitId, actor.userId, nowIso(), note.trim() || null);
    for (const a of assets) await run(db, "INSERT INTO asset_reconciliation_items (id, reconciliation_id, asset_id, expected_status) VALUES (?,?,?,?)", newId("ari"), id, a.id, a.status);
    await audit(db, { actorId: actor.userId, action: "asset.reconciliation.open", category: "BUSINESS", entityType: "asset_reconciliation", entityId: id, orgUnitId: unitId, details: { ref, assets: assets.length } });
  });
  return id;
}

export async function recordItem(db: DB, actor: Actor, reconciliationId: string, itemId: string, result: "FOUND" | "DAMAGED" | "MISSING", note: string) {
  const { reconciliation: r, canRecord } = await reconciliationDetail(db, actor, reconciliationId);
  if (!canRecord) throw conflict("This reconciliation cannot be updated.");
  if (!["FOUND", "DAMAGED", "MISSING"].includes(result)) throw invalid("Choose found, damaged or missing.");
  if (result !== "FOUND" && note.trim().length < 3) throw invalid("Add a note for damaged or missing items.");
  const n = await run(db, "UPDATE asset_reconciliation_items SET result = ?, note = ?, checked_by = ?, checked_at = ? WHERE id = ? AND reconciliation_id = ?", result, note.trim() || null, actor.userId, nowIso(), itemId, r.id);
  if (!n.changes) throw notFound();
}

export async function closeReconciliation(db: DB, actor: Actor, reconciliationId: string) {
  const { reconciliation: r, items, canRecord } = await reconciliationDetail(db, actor, reconciliationId);
  if (!canRecord) throw conflict("This reconciliation cannot be closed.");
  const pending = items.filter((i) => !i.result).length;
  if (pending) throw conflict(`${pending} item(s) have not been checked yet.`);
  const count = (k: string) => items.filter((i) => i.result === k).length;
  const summary = `${count("FOUND")} found, ${count("DAMAGED")} damaged, ${count("MISSING")} missing of ${items.length}`;
  await tx(db, async (db) => {
    const t = nowIso();
    for (const i of items) {
      await run(db, "INSERT INTO asset_events (id, asset_id, event_type, actor_id, reference, note, created_at) VALUES (?,?, 'RECONCILE', ?,?,?,?)", newId("ase"), i.asset_id, actor.userId, r.reference, `${i.result}${i.note ? `: ${i.note}` : ""}`, t);
      if (i.result !== "MISSING") await run(db, "UPDATE assets SET last_inspected_at = ? WHERE id = ?", t, i.asset_id);
    }
    await run(db, "UPDATE asset_reconciliations SET status = 'CLOSED', closed_by = ?, closed_at = ?, summary = ? WHERE id = ?", actor.userId, t, summary, r.id);
    await audit(db, { actorId: actor.userId, action: "asset.reconciliation.close", category: "BUSINESS", entityType: "asset_reconciliation", entityId: r.id, orgUnitId: r.org_unit_id, details: { ref: r.reference, summary } });
  });
  return summary;
}
