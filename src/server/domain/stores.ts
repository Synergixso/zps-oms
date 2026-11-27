/**
 * General Stores — non-sensitive consumables and general stock only (27-role directive: roles 15, 23, 27).
 *
 * Firearms, ammunition, armoury items, communications and tactical equipment are NOT representable:
 * categories come from a fixed allowlist and every free-text field is screened against PROHIBITED_TERMS.
 *
 *  - Store items are held by an org unit (the store). Balances never go below zero; every movement is a
 *    store_transactions row with the balance after it (an append-only stock ledger).
 *  - Requisitions: a unit asks its own store or a store above it. DRAFT → SUBMITTED → APPROVED → ISSUED,
 *    or REJECTED / CANCELLED. Approval = stores.approve + a STORES delegation + a BUSINESS role at the
 *    delegating unit (policy.approvalUnitFor); never the requester. Issue is done by the store keeper.
 */
import { identifierField } from "../lib/identifiers";
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, tenantOf } from "./core";
import { type Actor, approvalUnitFor, can, requirePermission, scopeFor } from "./policy";

export const TXN_TYPES = ["RECEIPT", "ISSUE", "RETURN", "ADJUSTMENT"] as const;
export type TxnType = (typeof TXN_TYPES)[number];
export const TXN_LABEL: Record<TxnType, string> = { RECEIPT: "Receipt", ISSUE: "Issue", RETURN: "Return", ADJUSTMENT: "Adjustment" };
export const REQ_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", ISSUED: "Issued", REJECTED: "Rejected", CANCELLED: "Cancelled",
};

export interface StoreItem {
  id: string;
  org_unit_id: string;
  unit_name: string;
  code: string;
  category_code: string;
  category_name: string;
  name: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  reorder_level: number;
  status: string;
  updated_at: string;
  version: number;
}

export interface StoreTxn {
  id: string;
  txn_type: TxnType;
  quantity: number;
  balance_after: number;
  reference: string | null;
  counterparty: string | null;
  requisition_id: string | null;
  note: string | null;
  actor_name: string;
  created_at: string;
}

export interface Requisition {
  id: string;
  reference: string;
  requesting_unit_id: string;
  requesting_unit_name: string;
  store_unit_id: string;
  store_unit_name: string;
  purpose: string;
  status: string;
  requested_by: string;
  requested_by_name: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  issued_by: string | null;
  issued_at: string | null;
  decision_comment: string | null;
  created_at: string;
}

export interface RequisitionLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  quantity_requested: number;
  quantity_issued: number | null;
}

const ITEM_SELECT = `SELECT i.*, c.name AS category_name, o.name AS unit_name
  FROM store_items i JOIN store_categories c ON c.code = i.category_code JOIN org_units o ON o.id = i.org_unit_id`;
const REQ_SELECT = `SELECT r.*, ro.name AS requesting_unit_name, so.name AS store_unit_name, u.display_name AS requested_by_name, a.display_name AS approved_by_name
  FROM store_requisitions r JOIN org_units ro ON ro.id = r.requesting_unit_id JOIN org_units so ON so.id = r.store_unit_id
  JOIN users u ON u.id = r.requested_by LEFT JOIN users a ON a.id = r.approved_by`;

function screen(text: string | undefined | null) {
  if (!text) return;
  const lower = text.toLowerCase();
  const hit = PROHIBITED_TERMS.find((t) => lower.includes(t));
  if (hit) throw invalid(`"${hit}" relates to an excluded class. Sensitive or controlled equipment cannot be recorded in ZPS-OMS stores.`);
}

function inScope(actor: Actor, units: string[]) {
  const s = scopeFor(actor, "stores.view");
  return s.national || units.some((u) => s.units.includes(u));
}

export async function storeCategories(db: DB) {
  return await all<{ code: string; name: string }>(db, "SELECT code, name FROM store_categories WHERE active = 1 ORDER BY name");
}

/** Units that hold a store the actor can see (for filters and requisition targets). */
export async function storeUnits(db: DB, actor: Actor) {
  const s = scopeFor(actor, "stores.view");
  const where = s.national ? "" : s.units.length ? `WHERE i.org_unit_id IN (${s.units.map(() => "?").join(",")})` : "WHERE 1=0";
  return await all<{ id: string; name: string; items: number }>(db,
    `SELECT o.id, o.name, COUNT(*) AS items FROM store_items i JOIN org_units o ON o.id = i.org_unit_id ${where} GROUP BY o.id, o.name ORDER BY o.name`, ...(s.national ? [] : s.units));
}

export async function listItems(db: DB, actor: Actor, f: { q?: string; category?: string; unit?: string; low?: boolean } = {}): Promise<StoreItem[]> {
  await requirePermission(db, actor, "stores.view");
  const s = scopeFor(actor, "stores.view");
  const where: string[] = [];
  const params: unknown[] = [];
  if (!s.national) { where.push(`i.org_unit_id IN (${s.units.map(() => "?").join(",")})`); params.push(...s.units); }
  if (f.q) { where.push("(i.code LIKE ? OR i.name LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.category) { where.push("i.category_code = ?"); params.push(f.category); }
  if (f.unit) { where.push("i.org_unit_id = ?"); params.push(f.unit); }
  if (f.low) where.push("i.status = 'ACTIVE' AND i.quantity_on_hand <= i.reorder_level");
  return await all<StoreItem>(db, `${ITEM_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY o.name, i.code LIMIT 500`, ...params);
}

export async function getItem(db: DB, actor: Actor, id: string): Promise<StoreItem> {
  const i = await one<StoreItem>(db, `${ITEM_SELECT} WHERE i.id = ?`, id);
  if (!i || !can(actor, "stores.view", i.org_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "stores.item.view", outcome: "DENIED", category: "SECURITY", entityType: "store_item", entityId: id });
    throw notFound();
  }
  return i;
}

export async function itemTransactions(db: DB, actor: Actor, id: string): Promise<StoreTxn[]> {
  await getItem(db, actor, id);
  return await all<StoreTxn>(db,
    "SELECT t.*, u.display_name AS actor_name FROM store_transactions t JOIN users u ON u.id = t.actor_id WHERE t.item_id = ? ORDER BY t.seq DESC LIMIT 200", id);
}

export const itemSchema = z.object({
  orgUnitId: z.string().min(1),
  code: identifierField("storeCode"),
  categoryCode: z.string().min(1, "Select a category."),
  name: z.string().trim().min(3, "Enter the item name.").max(120),
  unitOfMeasure: z.string().trim().min(1, "Enter the unit of measure.").max(20),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000),
});

export async function createItem(db: DB, actor: Actor, input: z.input<typeof itemSchema>): Promise<StoreItem> {
  const d = itemSchema.parse(input);
  await requirePermission(db, actor, "stores.manage", d.orgUnitId, { type: "store_item" });
  if (!await one(db, "SELECT code FROM store_categories WHERE code = ? AND active = 1", d.categoryCode)) throw invalid("Category is not on the approved general-stores allowlist.");
  screen(d.name);
  if (await one(db, "SELECT id FROM store_items WHERE org_unit_id = ? AND code = ?", d.orgUnitId, d.code)) throw conflict("An item with this code already exists in this store.");
  const id = newId("sti");
  const t = nowIso();
  await tx(db, async (db) => {
    await run(db, `INSERT INTO store_items (id, tenant_id, org_unit_id, code, category_code, name, unit_of_measure, quantity_on_hand, reorder_level, status, created_by, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?, 0, ?, 'ACTIVE', ?, ?, ?)`, id, await tenantOf(db, d.orgUnitId), d.orgUnitId, d.code, d.categoryCode, d.name, d.unitOfMeasure, d.reorderLevel, actor.userId, t, t);
    await audit(db, { actorId: actor.userId, action: "stores.item.create", category: "BUSINESS", entityType: "store_item", entityId: id, orgUnitId: d.orgUnitId, details: { code: d.code } });
  });
  return (await one<StoreItem>(db, `${ITEM_SELECT} WHERE i.id = ?`, id))!;
}

export const movementSchema = z.object({
  type: z.enum(TXN_TYPES),
  quantity: z.coerce.number().int().refine((n) => n !== 0, "Quantity cannot be zero.").refine((n) => Math.abs(n) <= 1_000_000, "Quantity is too large."),
  reference: z.string().trim().max(60).optional(),
  counterparty: z.string().trim().max(160).optional(),
  note: z.string().trim().max(300).optional(),
  version: z.coerce.number().int().optional(),
});

/** Records a stock movement in the ledger. Internal callers may link it to a requisition. */
async function applyMovement(db: DB, actor: Actor, item: StoreItem, m: z.output<typeof movementSchema>, requisitionId: string | null) {
  const delta = m.type === "ISSUE" ? -Math.abs(m.quantity) : m.type === "ADJUSTMENT" ? m.quantity : Math.abs(m.quantity);
  const balance = item.quantity_on_hand + delta;
  if (balance < 0) throw conflict(`Insufficient stock: ${item.quantity_on_hand} ${item.unit_of_measure} on hand.`);
  const t = nowIso();
  const r = await run(db, "UPDATE store_items SET quantity_on_hand = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?", balance, t, item.id, item.version);
  if (!r.changes) throw conflict("This item was changed by someone else. Reload and try again.");
  await run(db, `INSERT INTO store_transactions (id, item_id, txn_type, quantity, balance_after, reference, counterparty, requisition_id, note, actor_id, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`, newId("stx"), item.id, m.type, delta, balance, m.reference || null, m.counterparty || null, requisitionId, m.note || null, actor.userId, t);
  await audit(db, { actorId: actor.userId, action: `stores.${m.type.toLowerCase()}`, category: "BUSINESS", entityType: "store_item", entityId: item.id, orgUnitId: item.org_unit_id,
    details: { quantity: delta, balanceAfter: balance, reference: m.reference ?? null, requisitionId } });
  return balance;
}

export async function recordMovement(db: DB, actor: Actor, itemId: string, input: z.input<typeof movementSchema>) {
  const m = movementSchema.parse(input);
  const item = await getItem(db, actor, itemId);
  await requirePermission(db, actor, "stores.manage", item.org_unit_id, { type: "store_item", id: itemId });
  if (item.status !== "ACTIVE") throw conflict("Item is inactive.");
  if (m.type !== "ADJUSTMENT" && m.quantity < 0) throw invalid("Enter a positive quantity.");
  if (m.type === "ADJUSTMENT" && !m.note) throw invalid("An adjustment needs a reason (for example a stock-take count).");
  if (m.type === "RECEIPT" && !m.reference) throw invalid("A receipt needs a delivery or voucher reference.");
  if (m.type === "ISSUE" && !m.counterparty) throw invalid("Record who the items were issued to.");
  screen(m.counterparty); screen(m.note);
  if (m.version !== undefined && m.version !== item.version) throw conflict("This item was changed by someone else. Reload and try again.");
  return await tx(db, async (db) => applyMovement(db, actor, item, m, null));
}

// ── Requisitions ─────────────────────────────────────────────────────────────

export async function listRequisitions(db: DB, actor: Actor, f: { status?: string; mine?: boolean } = {}): Promise<Requisition[]> {
  const v = scopeFor(actor, "stores.view");
  const q = scopeFor(actor, "stores.requisition");
  if (!v.national && !v.units.length && !q.national && !q.units.length) await requirePermission(db, actor, "stores.view");
  const where: string[] = [];
  const params: unknown[] = [];
  if (!v.national) {
    const viewU = v.units.length ? v.units : ["__none__"];
    const reqU = q.units.length ? q.units : ["__none__"];
    where.push(`(r.store_unit_id IN (${viewU.map(() => "?").join(",")}) OR r.requesting_unit_id IN (${viewU.map(() => "?").join(",")}) OR r.requesting_unit_id IN (${reqU.map(() => "?").join(",")}) OR r.requested_by = ?)`);
    params.push(...viewU, ...viewU, ...reqU, actor.userId);
  }
  if (f.status) { where.push("r.status = ?"); params.push(f.status); }
  if (f.mine) { where.push("r.requested_by = ?"); params.push(actor.userId); }
  return await all<Requisition>(db, `${REQ_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY r.created_at DESC LIMIT 300`, ...params);
}

function canSeeRequisition(actor: Actor, r: Requisition) {
  return r.requested_by === actor.userId || inScope(actor, [r.store_unit_id, r.requesting_unit_id]) || can(actor, "stores.requisition", r.requesting_unit_id);
}

export async function getRequisition(db: DB, actor: Actor, id: string): Promise<{ req: Requisition; lines: RequisitionLine[] }> {
  const req = await one<Requisition>(db, `${REQ_SELECT} WHERE r.id = ?`, id);
  if (!req || !canSeeRequisition(actor, req)) {
    await audit(db, { actorId: actor.userId, action: "stores.requisition.view", outcome: "DENIED", category: "SECURITY", entityType: "store_requisition", entityId: id });
    throw notFound();
  }
  const lines = await all<RequisitionLine>(db,
    `SELECT l.*, i.code AS item_code, i.name AS item_name, i.unit_of_measure, i.quantity_on_hand FROM store_requisition_lines l JOIN store_items i ON i.id = l.item_id WHERE l.requisition_id = ? ORDER BY i.code`, id);
  return { req, lines };
}

/** Stores a unit may requisition from: its own unit and its ancestors that hold items. */
export async function requisitionTargets(db: DB, actor: Actor, requestingUnitId: string) {
  if (!can(actor, "stores.requisition", requestingUnitId)) return [];
  return await all<{ id: string; name: string }>(db,
    `SELECT DISTINCT o.id, o.name, c.depth FROM org_unit_closure c JOIN org_units o ON o.id = c.ancestor_id JOIN store_items i ON i.org_unit_id = o.id
      WHERE c.descendant_id = ? AND i.status = 'ACTIVE' ORDER BY c.depth`, requestingUnitId);
}

/** Active items of a store, for building a requisition (the requester sees names and units, not the ledger). */
export async function requisitionableItems(db: DB, actor: Actor, requestingUnitId: string, storeUnitId: string) {
  const targets = await requisitionTargets(db, actor, requestingUnitId);
  if (!targets.some((t) => t.id === storeUnitId)) throw notFound();
  return await all<{ id: string; code: string; name: string; unit_of_measure: string; category_name: string }>(db,
    `SELECT i.id, i.code, i.name, i.unit_of_measure, c.name AS category_name FROM store_items i JOIN store_categories c ON c.code = i.category_code
      WHERE i.org_unit_id = ? AND i.status = 'ACTIVE' ORDER BY c.name, i.name`, storeUnitId);
}

export const requisitionSchema = z.object({
  requestingUnitId: z.string().min(1),
  storeUnitId: z.string().min(1, "Select the store."),
  purpose: z.string().trim().min(5, "State the purpose of the requisition.").max(200),
  lines: z.array(z.object({ itemId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100_000) })).min(1, "Add at least one item."),
});

export async function createRequisition(db: DB, actor: Actor, input: z.input<typeof requisitionSchema>, submit = false) {
  const d = requisitionSchema.parse(input);
  await requirePermission(db, actor, "stores.requisition", d.requestingUnitId, { type: "store_requisition" });
  const targets = await requisitionTargets(db, actor, d.requestingUnitId);
  if (!targets.some((t) => t.id === d.storeUnitId)) throw invalid("A unit can only requisition from its own store or a store above it.");
  screen(d.purpose);
  const ids = [...new Set(d.lines.map((l) => l.itemId))];
  if (ids.length !== d.lines.length) throw invalid("Each item may appear only once.");
  const items = await all<{ id: string }>(db, `SELECT id FROM store_items WHERE org_unit_id = ? AND status = 'ACTIVE' AND id IN (${ids.map(() => "?").join(",")})`, d.storeUnitId, ...ids);
  if (items.length !== ids.length) throw invalid("Every item must be an active item of the selected store.");
  const id = newId("srq");
  await tx(db, async (db) => {
    const t = nowIso();
    const reference = await nextReference(db, "SYN-STR", "store_requisitions");
    await run(db, `INSERT INTO store_requisitions (id, reference, tenant_id, requesting_unit_id, store_unit_id, purpose, status, requested_by, submitted_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, reference, await tenantOf(db, d.requestingUnitId), d.requestingUnitId, d.storeUnitId, d.purpose, submit ? "SUBMITTED" : "DRAFT", actor.userId, submit ? t : null, t);
    for (const l of d.lines) await run(db, "INSERT INTO store_requisition_lines (id, requisition_id, item_id, quantity_requested) VALUES (?,?,?,?)", newId("srl"), id, l.itemId, l.quantity);
    await audit(db, { actorId: actor.userId, action: submit ? "stores.requisition.submit" : "stores.requisition.create", category: "BUSINESS", entityType: "store_requisition", entityId: id, orgUnitId: d.requestingUnitId, details: { reference, lines: d.lines.length } });
  });
  if (submit) await notifyApprovers(db, id);
  return id;
}

/** Approvers: active STORES delegation at the requesting unit or an ancestor, held by a user with stores.approve there. */
async function notifyApprovers(db: DB, id: string) {
  const r = (await one<Requisition>(db, `${REQ_SELECT} WHERE r.id = ?`, id))!;
  const t = nowIso();
  const users = await all<{ user_id: string }>(db,
    `SELECT DISTINCT d.user_id FROM delegations d JOIN org_unit_closure c ON c.ancestor_id = d.org_unit_id AND c.descendant_id = ?
      WHERE d.domain = 'STORES' AND d.revoked_at IS NULL AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?) AND d.user_id <> ?`,
    r.requesting_unit_id, t, t, r.requested_by);
  for (const u of users) await notify(db, u.user_id, `Stores requisition ${r.reference} awaits a decision`, `${r.requesting_unit_name}: ${r.purpose}`, `/app/stores/requisitions/${id}`, { category: "APPROVAL", dedupeKey: `srq-submit|${id}` });
}

export async function canDecideRequisition(db: DB, actor: Actor, r: Requisition) {
  if (r.status !== "SUBMITTED" || r.requested_by === actor.userId) return false;
  if (!can(actor, "stores.approve", r.requesting_unit_id)) return false;
  return !!await approvalUnitFor(db, actor, "STORES", r.requesting_unit_id);
}

export type RequisitionAction = "SUBMIT" | "CANCEL" | "APPROVE" | "REJECT" | "ISSUE";

export async function requisitionAction(db: DB, actor: Actor, id: string, action: RequisitionAction, input: { comment?: string; issued?: Record<string, number> } = {}) {
  const { req, lines } = await getRequisition(db, actor, id);
  const ent = { type: "store_requisition", id };
  const t = nowIso();
  screen(input.comment);
  switch (action) {
    case "SUBMIT":
    case "CANCEL": {
      if (req.requested_by !== actor.userId) await requirePermission(db, actor, "stores.requisition", req.requesting_unit_id, ent);
      if (!can(actor, "stores.requisition", req.requesting_unit_id)) throw forbidden();
      const from = action === "SUBMIT" ? ["DRAFT"] : ["DRAFT", "SUBMITTED"];
      if (!from.includes(req.status)) throw conflict(`A ${REQ_STATUS_LABEL[req.status].toLowerCase()} requisition cannot be ${action === "SUBMIT" ? "submitted" : "cancelled"}.`);
      await tx(db, async (db) => {
        await run(db, `UPDATE store_requisitions SET status = ?, ${action === "SUBMIT" ? "submitted_at" : "decision_comment"} = ? WHERE id = ? AND status = ?`,
          action === "SUBMIT" ? "SUBMITTED" : "CANCELLED", action === "SUBMIT" ? t : (input.comment || "Cancelled by the requesting unit."), id, req.status);
        await audit(db, { actorId: actor.userId, action: `stores.requisition.${action.toLowerCase()}`, category: "BUSINESS", entityType: "store_requisition", entityId: id, orgUnitId: req.requesting_unit_id });
      });
      if (action === "SUBMIT") await notifyApprovers(db, id);
      return;
    }
    case "APPROVE":
    case "REJECT": {
      if (req.requested_by === actor.userId) throw forbidden("You cannot decide a requisition you raised (separation of duties).");
      await requirePermission(db, actor, "stores.approve", req.requesting_unit_id, ent);
      if (req.status !== "SUBMITTED") throw conflict("Only a submitted requisition can be decided.");
      if (!await approvalUnitFor(db, actor, "STORES", req.requesting_unit_id)) {
        await audit(db, { actorId: actor.userId, action: "stores.requisition.decide", outcome: "DENIED", category: "SECURITY", entityType: "store_requisition", entityId: id, orgUnitId: req.requesting_unit_id, details: { reason: "no STORES delegation" } });
        throw forbidden("No recorded stores-approval delegation covers this unit.");
      }
      if (action === "REJECT" && !input.comment?.trim()) throw invalid("Give the reason for rejecting the requisition.");
      await tx(db, async (db) => {
        await run(db, "UPDATE store_requisitions SET status = ?, approved_by = ?, approved_at = ?, decision_comment = ? WHERE id = ? AND status = 'SUBMITTED'",
          action === "APPROVE" ? "APPROVED" : "REJECTED", actor.userId, t, input.comment?.trim() || null, id);
        await audit(db, { actorId: actor.userId, action: `stores.requisition.${action.toLowerCase()}`, category: "BUSINESS", entityType: "store_requisition", entityId: id, orgUnitId: req.requesting_unit_id });
      });
      await notify(db, req.requested_by, `Stores requisition ${req.reference} ${action === "APPROVE" ? "approved" : "rejected"}`, input.comment?.trim() || req.purpose, `/app/stores/requisitions/${id}`, { category: "APPROVAL" });
      if (action === "APPROVE") {
        const keepers = await all<{ user_id: string }>(db,
          `SELECT DISTINCT a.user_id FROM role_assignments a WHERE a.org_unit_id = ? AND a.revoked_at IS NULL AND a.role_code IN ('QM_STORES_OFFICER','STORES_OFFICER_DISTRICT','STATION_ADMIN_STORES') AND (a.valid_to IS NULL OR a.valid_to > ?)`, req.store_unit_id, t);
        for (const k of keepers) await notify(db, k.user_id, `Issue stores for ${req.reference}`, `${req.requesting_unit_name}: ${req.purpose}`, `/app/stores/requisitions/${id}`, { category: "ASSET", dedupeKey: `srq-issue|${id}` });
      }
      return;
    }
    case "ISSUE": {
      await requirePermission(db, actor, "stores.manage", req.store_unit_id, ent);
      if (req.status !== "APPROVED") throw conflict("Only an approved requisition can be issued.");
      if (req.requested_by === actor.userId) throw forbidden("You cannot issue against a requisition you raised (separation of duties).");
      await tx(db, async (db) => {
        let total = 0;
        for (const l of lines) {
          const qty = input.issued?.[l.id] ?? l.quantity_requested;
          if (!Number.isInteger(qty) || qty < 0 || qty > l.quantity_requested) throw invalid(`Issued quantity for ${l.item_code} must be between 0 and ${l.quantity_requested}.`);
          if (qty > 0) {
            const item = (await one<StoreItem>(db, `${ITEM_SELECT} WHERE i.id = ? FOR UPDATE`, l.item_id))!;
            await applyMovement(db, actor, item, { type: "ISSUE", quantity: qty, reference: req.reference, counterparty: req.requesting_unit_name, note: undefined, version: undefined }, id);
          }
          await run(db, "UPDATE store_requisition_lines SET quantity_issued = ? WHERE id = ?", qty, l.id);
          total += qty;
        }
        if (!total) throw invalid("Issue at least one item, or ask the approver to reject the requisition.");
        await run(db, "UPDATE store_requisitions SET status = 'ISSUED', issued_by = ?, issued_at = ? WHERE id = ? AND status = 'APPROVED'", actor.userId, t, id);
        await audit(db, { actorId: actor.userId, action: "stores.requisition.issue", category: "BUSINESS", entityType: "store_requisition", entityId: id, orgUnitId: req.store_unit_id, details: { total } });
      });
      await notify(db, req.requested_by, `Stores issued for ${req.reference}`, `Collect from ${req.store_unit_name}.`, `/app/stores/requisitions/${id}`, { category: "ASSET" });
      return;
    }
    default:
      throw forbidden();
  }
}

/** Headline stock figures for a stores workspace (scoped). */
export async function storesSummary(db: DB, actor: Actor) {
  const s = scopeFor(actor, "stores.view");
  if (!s.national && !s.units.length) return null;
  const w = s.national ? "1=1" : `i.org_unit_id IN (${s.units.map(() => "?").join(",")})`;
  const p = s.national ? [] : s.units;
  const row = (await one<{ items: number; low: number; out: number }>(db,
    `SELECT COUNT(*) AS items, SUM(i.quantity_on_hand <= i.reorder_level AND i.quantity_on_hand > 0) AS low, SUM(i.quantity_on_hand = 0) AS \`out\` FROM store_items i WHERE i.status = 'ACTIVE' AND ${w}`, ...p))!;
  const rw = s.national ? "1=1" : `(r.store_unit_id IN (${s.units.map(() => "?").join(",")}) OR r.requesting_unit_id IN (${s.units.map(() => "?").join(",")}))`;
  const req = (await one<{ submitted: number; approved: number }>(db,
    `SELECT SUM(r.status = 'SUBMITTED') AS submitted, SUM(r.status = 'APPROVED') AS approved FROM store_requisitions r WHERE ${rw}`, ...p, ...p))!;
  const tx30 = (await one<{ c: number }>(db,
    `SELECT COUNT(*) AS c FROM store_transactions t JOIN store_items i ON i.id = t.item_id WHERE t.created_at >= ? AND ${w}`, new Date(Date.now() - 30 * 864e5).toISOString(), ...p))!;
  return { items: Number(row.items ?? 0), low: Number(row.low ?? 0), out: Number(row.out ?? 0), submitted: Number(req.submitted ?? 0), approved: Number(req.approved ?? 0), movements30d: Number(tx30.c ?? 0) };
}
