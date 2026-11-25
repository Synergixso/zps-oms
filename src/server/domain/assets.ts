/**
 * M05 — General Non-sensitive Asset Management.
 * Only categories on the approved allowlist can be registered; prohibited
 * classes (firearms, ammunition, armoury, communications, tactical) are
 * not representable and descriptions are screened.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS } from "./catalogue";
import { conflict, forbidden, invalid, newId, nowIso } from "./core";
import { notFound } from "./core";
import { type Actor, can, requirePermission, scopeFor } from "./policy";

export const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;
export const ASSET_STATUS_LABEL: Record<string, string> = {
  IN_STORE: "In store",
  ISSUED: "Issued",
  IN_TRANSFER: "In transfer",
  UNDER_REPAIR: "Under repair",
  DISPOSED: "Disposed",
};

export interface AssetRow {
  id: string;
  asset_tag: string;
  category_code: string;
  category_name: string;
  description: string;
  condition: string;
  status: string;
  custody_org_id: string;
  custody_name: string;
  custodian_ref: string | null;
  transfer_to_org_id: string | null;
  transfer_to_name: string | null;
  last_inspected_at: string | null;
  updated_at: string;
}

const A_SELECT = `SELECT a.*, c.name AS category_name, o.name AS custody_name, t.name AS transfer_to_name
  FROM assets a JOIN asset_categories c ON c.code = a.category_code JOIN org_units o ON o.id = a.custody_org_id
  LEFT JOIN org_units t ON t.id = a.transfer_to_org_id`;

function assetScope(actor: Actor) {
  return scopeFor(actor, "asset.view");
}

export function listAssets(db: DB, actor: Actor, f: { q?: string; status?: string; category?: string } = {}): AssetRow[] {
  requirePermission(db, actor, "asset.view");
  const s = assetScope(actor);
  const where: string[] = [];
  const params: unknown[] = [];
  if (!s.national) {
    const ph = s.units.map(() => "?").join(",");
    // Inbound transfers are visible to the receiving unit.
    where.push(`(a.custody_org_id IN (${ph}) OR a.transfer_to_org_id IN (${ph}))`);
    params.push(...s.units, ...s.units);
  }
  if (f.q) { where.push("(a.asset_tag LIKE ? OR a.description LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.status) { where.push("a.status = ?"); params.push(f.status); }
  if (f.category) { where.push("a.category_code = ?"); params.push(f.category); }
  return all<AssetRow>(db, `${A_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.asset_tag LIMIT 500`, ...params);
}

export function getAsset(db: DB, actor: Actor, id: string): AssetRow {
  const a = one<AssetRow>(db, `${A_SELECT} WHERE a.id = ?`, id);
  if (!a || !(can(actor, "asset.view", a.custody_org_id) || (a.transfer_to_org_id && can(actor, "asset.view", a.transfer_to_org_id)))) {
    audit(db, { actorId: actor.userId, action: "asset.view", outcome: "DENIED", category: "SECURITY", entityType: "asset", entityId: id });
    throw notFound();
  }
  return a;
}

export function assetEvents(db: DB, actor: Actor, id: string) {
  getAsset(db, actor, id);
  return all<{ id: string; event_type: string; before_state: string | null; after_state: string | null; reference: string | null; note: string | null; created_at: string; actor_name: string }>(
    db,
    "SELECT e.*, u.display_name AS actor_name FROM asset_events e JOIN users u ON u.id = e.actor_id WHERE e.asset_id = ? ORDER BY e.created_at DESC, e.rowid DESC",
    id,
  );
}

function screen(text: string) {
  const lower = text.toLowerCase();
  const hit = PROHIBITED_TERMS.find((t) => lower.includes(t));
  if (hit) throw invalid(`"${hit}" relates to an excluded asset class. Sensitive or controlled equipment cannot be recorded in ZPS-OMS.`);
}

export const assetSchema = z.object({
  assetTag: z.string().trim().regex(/^SYN-AST-\d{5}$/, "Asset tag must follow the synthetic pattern SYN-AST-00000."),
  categoryCode: z.string().min(1, "Select a category."),
  description: z.string().trim().min(3).max(120),
  condition: z.enum(CONDITIONS),
  custodyOrgId: z.string().min(1),
  custodianRef: z.string().trim().max(60).optional(),
});

function snapshot(a: AssetRow) {
  return JSON.stringify({ status: a.status, condition: a.condition, custody: a.custody_name, custodian: a.custodian_ref });
}

export function registerAsset(db: DB, actor: Actor, input: z.input<typeof assetSchema>): AssetRow {
  const d = assetSchema.parse(input);
  requirePermission(db, actor, "asset.register", d.custodyOrgId);
  const cat = one<{ allowed: number }>(db, "SELECT allowed FROM asset_categories WHERE code = ?", d.categoryCode);
  if (!cat || !cat.allowed) throw invalid("Category is not on the approved asset category allowlist.");
  screen(d.description);
  if (d.custodianRef) screen(d.custodianRef);
  if (one(db, "SELECT id FROM assets WHERE asset_tag = ?", d.assetTag)) throw conflict("Asset tag already exists.");
  const id = newId("ast");
  tx(db, () => {
    const t = nowIso();
    run(db, `INSERT INTO assets (id, asset_tag, category_code, description, condition, status, custody_org_id, custodian_ref, created_at, updated_at)
             VALUES (?,?,?,?,?, 'IN_STORE', ?,?,?,?)`, id, d.assetTag, d.categoryCode, d.description, d.condition, d.custodyOrgId, d.custodianRef || null, t, t);
    run(db, "INSERT INTO asset_events (id, asset_id, event_type, actor_id, after_state, created_at) VALUES (?,?,?,?,?,?)",
      newId("ase"), id, "REGISTER", actor.userId, JSON.stringify({ status: "IN_STORE", condition: d.condition }), t);
    audit(db, { actorId: actor.userId, action: "asset.register", category: "BUSINESS", entityType: "asset", entityId: id, orgUnitId: d.custodyOrgId, details: { tag: d.assetTag } });
  });
  return getAsset(db, actor, id);
}

export type AssetAction = "ISSUE" | "RETURN" | "TRANSFER" | "RECEIVE" | "INSPECT" | "SEND_REPAIR" | "REPAIRED" | "DISPOSE";

export interface AssetActionInput {
  custodianRef?: string;
  toOrgId?: string;
  condition?: string;
  reference?: string;
  note?: string;
}

export function assetAction(db: DB, actor: Actor, id: string, action: AssetAction, input: AssetActionInput = {}): AssetRow {
  const a = getAsset(db, actor, id);
  const ent = { type: "asset", id };
  if (a.status === "DISPOSED") throw conflict("Disposed assets cannot be changed. Their history is preserved.");
  const note = input.note?.trim() || null;
  if (note) screen(note);
  let set: Record<string, unknown> = {};
  let eventOrg = a.custody_org_id;
  switch (action) {
    case "ISSUE":
      requirePermission(db, actor, "asset.custody", a.custody_org_id, ent);
      if (a.status !== "IN_STORE") throw conflict("Only assets in store can be issued.");
      if (!input.custodianRef?.trim()) throw invalid("Enter the receiving office/post reference.");
      screen(input.custodianRef);
      set = { status: "ISSUED", custodian_ref: input.custodianRef.trim() };
      break;
    case "RETURN":
      requirePermission(db, actor, "asset.custody", a.custody_org_id, ent);
      if (a.status !== "ISSUED") throw conflict("Only issued assets can be returned.");
      set = { status: "IN_STORE", custodian_ref: null, condition: input.condition ?? a.condition };
      break;
    case "TRANSFER": {
      requirePermission(db, actor, "asset.custody", a.custody_org_id, ent);
      if (a.status !== "IN_STORE") throw conflict("Return the asset to store before transferring it.");
      const to = input.toOrgId;
      if (!to || to === a.custody_org_id) throw invalid("Select a different receiving organisation.");
      const org = one<{ status: string }>(db, "SELECT status FROM org_units WHERE id = ?", to);
      if (!org || org.status !== "ACTIVE") throw invalid("Receiving organisation is not active.");
      if (!input.reference?.trim()) throw invalid("A transfer authority reference is required.");
      set = { status: "IN_TRANSFER", transfer_to_org_id: to };
      break;
    }
    case "RECEIVE":
      if (a.status !== "IN_TRANSFER" || !a.transfer_to_org_id) throw conflict("Asset is not in transfer.");
      requirePermission(db, actor, "asset.custody", a.transfer_to_org_id, ent);
      set = { status: "IN_STORE", custody_org_id: a.transfer_to_org_id, transfer_to_org_id: null, custodian_ref: null, condition: input.condition ?? a.condition };
      eventOrg = a.transfer_to_org_id;
      break;
    case "INSPECT":
      requirePermission(db, actor, "asset.inspect", a.custody_org_id, ent);
      if (!input.condition || !(CONDITIONS as readonly string[]).includes(input.condition)) throw invalid("Select the inspected condition.");
      set = { condition: input.condition, last_inspected_at: nowIso() };
      break;
    case "SEND_REPAIR":
      requirePermission(db, actor, "asset.custody", a.custody_org_id, ent);
      if (a.status !== "IN_STORE") throw conflict("Only assets in store can be sent for repair.");
      set = { status: "UNDER_REPAIR" };
      break;
    case "REPAIRED":
      requirePermission(db, actor, "asset.custody", a.custody_org_id, ent);
      if (a.status !== "UNDER_REPAIR") throw conflict("Asset is not under repair.");
      set = { status: "IN_STORE", condition: input.condition ?? a.condition };
      break;
    case "DISPOSE":
      requirePermission(db, actor, "asset.dispose", a.custody_org_id, ent);
      if (a.status !== "IN_STORE") throw conflict("Only assets in store can be disposed of.");
      if (!input.reference?.trim()) throw invalid("A disposal authority reference is required.");
      set = { status: "DISPOSED" };
      break;
    default:
      throw forbidden();
  }
  tx(db, () => {
    const t = nowIso();
    const cols = Object.keys(set);
    run(db, `UPDATE assets SET ${cols.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...cols.map((c) => set[c]), t, id);
    const after = one<AssetRow>(db, `${A_SELECT} WHERE a.id = ?`, id)!;
    run(db, "INSERT INTO asset_events (id, asset_id, event_type, actor_id, before_state, after_state, reference, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      newId("ase"), id, action, actor.userId, snapshot(a), snapshot(after), input.reference?.trim() || null, note, t);
    audit(db, { actorId: actor.userId, action: `asset.${action.toLowerCase()}`, category: "BUSINESS", entityType: "asset", entityId: id, orgUnitId: eventOrg, details: { tag: a.asset_tag, from: a.status, to: after.status } });
  });
  return one<AssetRow>(db, `${A_SELECT} WHERE a.id = ?`, id)!;
}

export function assetActionsFor(actor: Actor, a: AssetRow): AssetAction[] {
  const out: AssetAction[] = [];
  if (a.status === "DISPOSED") return out;
  const c = (p: "asset.custody" | "asset.inspect" | "asset.dispose") => can(actor, p, a.custody_org_id);
  if (a.status === "IN_STORE" && c("asset.custody")) out.push("ISSUE", "TRANSFER", "SEND_REPAIR");
  if (a.status === "ISSUED" && c("asset.custody")) out.push("RETURN");
  if (a.status === "UNDER_REPAIR" && c("asset.custody")) out.push("REPAIRED");
  if (a.status === "IN_TRANSFER" && a.transfer_to_org_id && can(actor, "asset.custody", a.transfer_to_org_id)) out.push("RECEIVE");
  if (a.status !== "IN_TRANSFER" && c("asset.inspect")) out.push("INSPECT");
  if (a.status === "IN_STORE" && c("asset.dispose")) out.push("DISPOSE");
  return out;
}
