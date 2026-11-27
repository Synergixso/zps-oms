/**
 * Intelligence-liaison ADMINISTRATION for the four Police Intelligence Officer roles (07, 19, 30, 31; DEC-073).
 *
 * Information-governance boundary (owner directive Part 6). A liaison record holds administrative METADATA only:
 * a generated reference (LIA-YYYY-NNNNNN), the reference number of the off-system document, the originating and
 * receiving (holding) organisation units, dates submitted / received / acknowledged, the responsible account, an
 * approved administrative classification, status, an approval reference and the routing history. There is no
 * subject, narrative, note or attachment field anywhere in the model, and reference fields accept reference-number
 * characters only (no spaces), so intelligence content, sources, informants, targets, surveillance, collection
 * methods or tasking cannot be entered. Substantive intelligence handling would be a separate system requiring its
 * own security architecture, legal assessment and institutional authorisation.
 *
 * Scope (server-side, every call): liaison.status.view covering the originating OR the holding unit, or being the
 * responsible account. A DRAFT is visible only at its own office (need to know) until it is submitted. National coverage only for HQ assignments; Division and District officers cover their
 * subtree; the Section/Station officer covers the assigned unit only. Liaison permissions grant nothing else: no
 * personnel, manpower, roster or assignment access.
 *
 * Status flow:  DRAFT → SUBMITTED → RECEIVED → ACKNOWLEDGED → (ROUTE onward → SUBMITTED …) | CLOSED
 *               DRAFT / SUBMITTED → WITHDRAWN (before receipt)
 * Routing follows approved organisational channels: to a unit directly above or below the holding unit in the
 * hierarchy, and only to an office where an active liaison officer is assigned.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS, ROLES } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, tenantOf, today } from "./core";
import { countQuery, firstRows, pageQuery, splitSelect, type Page, type Paging, type Query } from "./paging";
import { type Actor, can, hasPermission, requirePermission, scopeFor } from "./policy";

export const LIAISON_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", RECEIVED: "Received", ACKNOWLEDGED: "Acknowledged", CLOSED: "Closed", WITHDRAWN: "Withdrawn",
};
export type LiaisonStatus = keyof typeof LIAISON_STATUS_LABEL;
export const LIAISON_KIND_LABEL = { SUBMISSION: "Administrative submission", REPORT_REFERENCE: "Report reference" } as const;
export type LiaisonKind = keyof typeof LIAISON_KIND_LABEL;
export const LIAISON_ACTION_LABEL: Record<string, string> = {
  RECORD: "Recorded", UPDATE: "Metadata corrected", SUBMIT: "Submitted", RECEIVE: "Receipt recorded", ACKNOWLEDGE: "Acknowledged",
  ROUTE: "Routed onward", CLOSE: "Closed", WITHDRAW: "Withdrawn",
};
/** The role codes holding the liaison template (derived from the catalogue, so it cannot drift). */
export const LIAISON_ROLES = ROLES.filter((r) => Object.keys(r.permissions).some((p) => p.startsWith("liaison."))).map((r) => r.code);
/** Organisation types at which a liaison office can exist (where a liaison role is assignable). */
const OFFICE_TYPES = [...new Set(ROLES.filter((r) => LIAISON_ROLES.includes(r.code)).flatMap((r) => r.assignableTo))];

export interface LiaisonRecord {
  id: string; reference: string; kind: LiaisonKind; external_reference: string | null;
  origin_unit_id: string; origin_name: string; holding_unit_id: string; holding_name: string;
  responsible_user_id: string; responsible_name: string; classification: "UNCLASSIFIED" | "RESTRICTED"; status: LiaisonStatus;
  date_submitted: string | null; date_received: string | null; date_acknowledged: string | null; approval_reference: string | null;
  version: number; created_by: string; created_at: string; updated_at: string;
}
export interface RoutingEvent {
  id: string; record_id: string; reference: string; seq: number; action: string; from_unit_id: string | null; from_name: string | null;
  to_unit_id: string | null; to_name: string | null; from_status: string | null; to_status: string; approval_reference: string | null; actor_name: string; at: string;
}

const SELECT = `SELECT r.*, o.name AS origin_name, h.name AS holding_name, u.display_name AS responsible_name
  FROM liaison_records r JOIN org_units o ON o.id = r.origin_unit_id JOIN org_units h ON h.id = r.holding_unit_id JOIN users u ON u.id = r.responsible_user_id`;

// ── Validation: reference characters only, never free text ─────────────────────────────────────────────
const REF = /^[A-Za-z0-9][A-Za-z0-9/.\-]{1,39}$/;
function screenRef(v: string | undefined) {
  if (!v) return;
  const lower = v.toLowerCase();
  const hit = PROHIBITED_TERMS.find((t) => lower.includes(t.replace(/\s+/g, "")));
  if (hit) throw invalid("A reference number cannot contain descriptive terms. Enter the reference number only.");
}
const refField = (label: string) => z.string().trim().max(40).optional().transform((v) => v || undefined)
  .refine((v) => v === undefined || REF.test(v), { message: `${label}: letters, digits, "/", "-" and "." only (2–40 characters, no spaces). Enter the reference number only, never content.` });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");

export const createLiaisonSchema = z.object({
  kind: z.enum(["SUBMISSION", "REPORT_REFERENCE"]),
  originUnitId: z.string().min(1, "Select your organisation unit."),
  externalReference: refField("Document reference"),
  classification: z.enum(["UNCLASSIFIED", "RESTRICTED"]).default("UNCLASSIFIED"),
  approvalReference: refField("Approval reference"),
});
export const updateLiaisonSchema = createLiaisonSchema.omit({ originUnitId: true }).extend({ expectedVersion: z.coerce.number().int().optional() });
export const submitLiaisonSchema = z.object({ toUnitId: z.string().min(1, "Select the receiving office."), dateSubmitted: date, approvalReference: refField("Approval reference") });
export const receiveLiaisonSchema = z.object({ dateReceived: date });
export const acknowledgeLiaisonSchema = z.object({ dateAcknowledged: date, approvalReference: refField("Approval reference") });

// ── Scope ──────────────────────────────────────────────────────────────────────────────────────────────
/** The offices at which the actor holds a liaison role (drafts are visible there only: need to know). */
function ownOffices(actor: Actor): string[] {
  return actor.assignments.filter((a) => LIAISON_ROLES.includes(a.roleCode)).map((a) => a.orgUnitId);
}
/**
 * Whether the actor is a liaison officer OF this office. Receipt, acknowledgement, closure and onward routing are
 * acts of the receiving office itself; supervising officers (subtree coverage) see the record but do not act for it.
 */
export function actsAt(actor: Actor, unitId: string): boolean {
  return ownOffices(actor).includes(unitId);
}
function requireOffice(actor: Actor, unitId: string, what: string) {
  if (!actsAt(actor, unitId)) throw forbidden(`Only a liaison officer of the receiving office can ${what}.`);
}
function visible(actor: Actor, r: Pick<LiaisonRecord, "origin_unit_id" | "holding_unit_id" | "responsible_user_id" | "status">) {
  if (r.responsible_user_id === actor.userId) return true;
  // A draft has not been submitted: only its own office sees it, not supervising or national officers.
  if (r.status === "DRAFT") return ownOffices(actor).includes(r.origin_unit_id) && can(actor, "liaison.status.view", r.origin_unit_id);
  return can(actor, "liaison.status.view", r.origin_unit_id) || can(actor, "liaison.status.view", r.holding_unit_id);
}
function scopeSql(actor: Actor): { sql: string; params: unknown[] } {
  const s = scopeFor(actor, "liaison.status.view");
  const own = ownOffices(actor);
  const draftRule = own.length ? `(r.status <> 'DRAFT' OR r.origin_unit_id IN (${own.map(() => "?").join(",")}))` : "r.status <> 'DRAFT'";
  if (s.national) return { sql: `(r.responsible_user_id = ? OR ${draftRule})`, params: [actor.userId, ...own] };
  if (!s.units.length) return { sql: "r.responsible_user_id = ?", params: [actor.userId] };
  const list = s.units.map(() => "?").join(",");
  return { sql: `(r.responsible_user_id = ? OR ((r.origin_unit_id IN (${list}) OR r.holding_unit_id IN (${list})) AND ${draftRule}))`, params: [actor.userId, ...s.units, ...s.units, ...own] };
}
/** Units in the actor's scope for a permission, as SQL over a column (null = national). */
function unitsSql(actor: Actor, perm: Parameters<typeof scopeFor>[1], col: string): { sql: string; params: unknown[] } {
  const s = scopeFor(actor, perm);
  if (s.national) return { sql: "1=1", params: [] };
  return s.units.length ? { sql: `${col} IN (${s.units.map(() => "?").join(",")})`, params: s.units } : { sql: "1=0", params: [] };
}

async function load(db: DB, id: string) {
  return one<LiaisonRecord>(db, `${SELECT} WHERE r.id = ?`, id);
}

export async function getLiaison(db: DB, actor: Actor, id: string): Promise<LiaisonRecord> {
  await requirePermission(db, actor, "liaison.metadata.view", undefined, { type: "liaison", id });
  const r = await load(db, id);
  if (!r || !visible(actor, r)) {
    await audit(db, { actorId: actor.userId, action: "liaison.view", outcome: "DENIED", category: "SECURITY", entityType: "liaison", entityId: id });
    throw notFound();
  }
  return r;
}

async function event(db: DB, recordId: string, actorId: string, action: string, fromStatus: string | null, toStatus: string, from?: string | null, to?: string | null, approvalRef?: string | null) {
  const seq = Number((await one<{ n: number }>(db, "SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM liaison_routing WHERE record_id = ?", recordId))?.n ?? 1);
  await run(db, `INSERT INTO liaison_routing (id, record_id, seq, action, from_unit_id, to_unit_id, from_status, to_status, approval_reference, actor_id, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    newId("lrt"), recordId, seq, action, from ?? null, to ?? null, fromStatus, toStatus, approvalRef ?? null, actorId, nowIso());
}

/** A version-conditional update that must change exactly one row; otherwise another change won and nothing is recorded. */
async function guarded(db: DB, sql: string, ...params: unknown[]) {
  const r = await run(db, sql, ...params);
  if (r.changes !== 1) throw conflict("This record was changed by someone else. Reload and try again.");
}

function checkDate(d: string, label: string, notBefore?: string | null) {
  if (d > today()) throw invalid(`The ${label} cannot be in the future.`);
  if (notBefore && d < notBefore) throw invalid(`The ${label} cannot be before ${notBefore}.`);
}

// ── Routing channels ───────────────────────────────────────────────────────────────────────────────────
/** Liaison officers assigned exactly at a unit (the receiving office), active today. */
async function officersAt(db: DB, unitId: string): Promise<string[]> {
  const t = nowIso();
  const rows = await all<{ user_id: string }>(db, `SELECT DISTINCT a.user_id FROM role_assignments a JOIN users u ON u.id = a.user_id
     WHERE a.org_unit_id = ? AND a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?) AND u.status = 'ACTIVE' AND a.role_code IN (${LIAISON_ROLES.map(() => "?").join(",")})`,
    unitId, t, ...LIAISON_ROLES);
  return rows.map((r) => r.user_id);
}

/** Approved channels from a holding unit: units directly in its line (ancestors and descendants) that have a liaison office. */
export async function routingOptions(db: DB, actor: Actor, id: string): Promise<Array<{ id: string; name: string; direction: "UP" | "DOWN" }>> {
  const r = await getLiaison(db, actor, id);
  const t = nowIso();
  const rows = await all<{ id: string; name: string; dir: string }>(db, `
    SELECT o.id, o.name, CASE WHEN c.ancestor_id = o.id THEN 'UP' ELSE 'DOWN' END AS dir FROM org_unit_closure c
      JOIN org_units o ON o.id = CASE WHEN c.ancestor_id = ? THEN c.descendant_id ELSE c.ancestor_id END
     WHERE (c.ancestor_id = ? OR c.descendant_id = ?) AND c.depth > 0 AND o.status = 'ACTIVE' AND o.unit_type IN (${OFFICE_TYPES.map(() => "?").join(",")})
       AND EXISTS (SELECT 1 FROM role_assignments a JOIN users u ON u.id = a.user_id WHERE a.org_unit_id = o.id AND a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?)
                   AND u.status = 'ACTIVE' AND a.role_code IN (${LIAISON_ROLES.map(() => "?").join(",")}))
     ORDER BY dir DESC, c.depth, o.name`,
    r.holding_unit_id, r.holding_unit_id, r.holding_unit_id, ...OFFICE_TYPES, t, ...LIAISON_ROLES);
  return rows.map((x) => ({ id: x.id, name: x.name, direction: x.dir as "UP" | "DOWN" }));
}

async function checkChannel(db: DB, fromUnit: string, toUnit: string) {
  if (fromUnit === toUnit) throw invalid("Select a different receiving office.");
  const line = await one(db, "SELECT 1 AS ok FROM org_unit_closure WHERE depth > 0 AND ((ancestor_id = ? AND descendant_id = ?) OR (ancestor_id = ? AND descendant_id = ?))", fromUnit, toUnit, toUnit, fromUnit);
  if (!line) throw invalid("Liaison references are routed only through approved organisational channels: to an office directly above or below in the same line of command.");
  const officers = await officersAt(db, toUnit);
  if (!officers.length) throw invalid("No liaison officer is assigned at the selected office. Choose an office with an assigned liaison officer.");
  return officers;
}

// ── Commands ───────────────────────────────────────────────────────────────────────────────────────────
export async function createLiaison(db: DB, actor: Actor, input: z.input<typeof createLiaisonSchema>): Promise<LiaisonRecord> {
  const d = createLiaisonSchema.parse(input);
  await requirePermission(db, actor, "liaison.metadata.create", d.originUnitId, { type: "liaison" });
  // Records are made for the actor's own office only (not any unit below it).
  if (!actor.assignments.some((a) => a.orgUnitId === d.originUnitId && LIAISON_ROLES.includes(a.roleCode))) {
    throw forbidden("Liaison references are recorded for your own office only.");
  }
  screenRef(d.externalReference); screenRef(d.approvalReference);
  if (d.externalReference && await one(db, "SELECT id FROM liaison_records WHERE origin_unit_id = ? AND external_reference = ? AND status <> 'WITHDRAWN'", d.originUnitId, d.externalReference)) {
    throw conflict("This document reference is already recorded by your office. Open the existing record instead.");
  }
  const id = newId("lia");
  const t = nowIso();
  let reference = "";
  await tx(db, async (db) => {
    reference = await nextReference(db, "LIA", "liaison_records");
    await run(db, `INSERT INTO liaison_records (id, reference, tenant_id, kind, external_reference, origin_unit_id, holding_unit_id, responsible_user_id, classification, status,
                     approval_reference, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?, 'DRAFT', ?,?,?,?)`,
      id, reference, await tenantOf(db, d.originUnitId), d.kind, d.externalReference ?? null, d.originUnitId, d.originUnitId, actor.userId, d.classification,
      d.approvalReference ?? null, actor.userId, t, t);
    await event(db, id, actor.userId, "RECORD", null, "DRAFT", null, d.originUnitId, d.approvalReference);
    await audit(db, { actorId: actor.userId, action: "liaison.record", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: d.originUnitId,
      details: { reference, kind: d.kind, classification: d.classification } });
  });
  return (await load(db, id))!;
}

export async function updateLiaison(db: DB, actor: Actor, id: string, input: z.input<typeof updateLiaisonSchema>) {
  const r = await getLiaison(db, actor, id);
  await requirePermission(db, actor, "liaison.metadata.update_own", r.origin_unit_id, { type: "liaison", id });
  if (r.responsible_user_id !== actor.userId) throw forbidden("Only the responsible officer can correct this record.");
  if (r.status !== "DRAFT") throw conflict("Only a draft can be corrected. Submitted records keep their metadata; the routing history records every change.");
  const d = updateLiaisonSchema.parse(input);
  if (d.expectedVersion && d.expectedVersion !== r.version) throw conflict("This record was changed by someone else. Reload and try again.");
  screenRef(d.externalReference); screenRef(d.approvalReference);
  const changes = ([["kind", r.kind, d.kind], ["externalReference", r.external_reference, d.externalReference ?? null], ["classification", r.classification, d.classification],
    ["approvalReference", r.approval_reference, d.approvalReference ?? null]] as Array<[string, string | null, string | null]>).filter(([, a, b]) => (a ?? "") !== (b ?? ""));
  if (!changes.length) return r;
  await tx(db, async (db) => {
    await guarded(db, "UPDATE liaison_records SET kind = ?, external_reference = ?, classification = ?, approval_reference = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      d.kind, d.externalReference ?? null, d.classification, d.approvalReference ?? null, nowIso(), id, r.version);
    await event(db, id, actor.userId, "UPDATE", r.status, r.status);
    await audit(db, { actorId: actor.userId, action: "liaison.update", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: r.origin_unit_id,
      details: { reference: r.reference, changes: changes.map(([field, from, to]) => ({ field, from, to })) } });
  });
  return (await load(db, id))!;
}

/** Initial submission (DRAFT) or onward routing (ACKNOWLEDGED) to an office on an approved channel. */
export async function submitLiaison(db: DB, actor: Actor, id: string, input: z.input<typeof submitLiaisonSchema>) {
  const r = await getLiaison(db, actor, id);
  await requirePermission(db, actor, "liaison.reference.route", r.holding_unit_id, { type: "liaison", id });
  const d = submitLiaisonSchema.parse(input);
  screenRef(d.approvalReference);
  const onward = r.status === "ACKNOWLEDGED";
  if (r.status !== "DRAFT" && !onward) throw conflict(`A ${LIAISON_STATUS_LABEL[r.status].toLowerCase()} record cannot be routed.`);
  if (!onward && r.responsible_user_id !== actor.userId) throw forbidden("Only the responsible officer can submit this record.");
  if (onward) requireOffice(actor, r.holding_unit_id, "route this record onward");
  checkDate(d.dateSubmitted, "date submitted", onward ? r.date_acknowledged : r.created_at.slice(0, 10));
  const officers = await checkChannel(db, r.holding_unit_id, d.toUnitId);
  const toName = (await one<{ name: string }>(db, "SELECT name FROM org_units WHERE id = ?", d.toUnitId))!.name;
  await tx(db, async (db) => {
    await guarded(db, `UPDATE liaison_records SET status = 'SUBMITTED', holding_unit_id = ?, responsible_user_id = ?, date_submitted = ?, date_received = NULL, date_acknowledged = NULL,
                     approval_reference = COALESCE(?, approval_reference), version = version + 1, updated_at = ? WHERE id = ? AND version = ?`,
      d.toUnitId, actor.userId, d.dateSubmitted, d.approvalReference ?? null, nowIso(), id, r.version);
    await event(db, id, actor.userId, onward ? "ROUTE" : "SUBMIT", r.status, "SUBMITTED", r.holding_unit_id, d.toUnitId, d.approvalReference);
    await audit(db, { actorId: actor.userId, action: onward ? "liaison.route" : "liaison.submit", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: r.holding_unit_id,
      details: { reference: r.reference, from: r.holding_unit_id, to: d.toUnitId, previousStatus: r.status, status: "SUBMITTED", approvalReference: d.approvalReference ?? r.approval_reference } });
    for (const u of officers.filter((x) => x !== actor.userId)) {
      await notify(db, u, "Liaison reference received", `${r.reference} has been routed to ${toName}. Record its receipt.`, `/app/liaison/records/${id}`, { dedupeKey: `lia:${id}:${r.version}:${u}` });
    }
  });
  return (await load(db, id))!;
}

export async function receiveLiaison(db: DB, actor: Actor, id: string, input: z.input<typeof receiveLiaisonSchema>) {
  const r = await getLiaison(db, actor, id);
  await requirePermission(db, actor, "liaison.submission.acknowledge", r.holding_unit_id, { type: "liaison", id });
  requireOffice(actor, r.holding_unit_id, "record receipt");
  if (r.status !== "SUBMITTED") throw conflict("Receipt can only be recorded for a submitted record.");
  const d = receiveLiaisonSchema.parse(input);
  checkDate(d.dateReceived, "date received", r.date_submitted);
  await tx(db, async (db) => {
    // The receiving officer becomes the responsible account for the next step.
    await guarded(db, "UPDATE liaison_records SET status = 'RECEIVED', date_received = ?, responsible_user_id = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      d.dateReceived, actor.userId, nowIso(), id, r.version);
    await event(db, id, actor.userId, "RECEIVE", r.status, "RECEIVED", r.holding_unit_id, r.holding_unit_id);
    await audit(db, { actorId: actor.userId, action: "liaison.receive", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: r.holding_unit_id,
      details: { reference: r.reference, previousStatus: r.status, status: "RECEIVED", previousResponsible: r.responsible_user_id } });
  });
  return (await load(db, id))!;
}

export async function acknowledgeLiaison(db: DB, actor: Actor, id: string, input: z.input<typeof acknowledgeLiaisonSchema>) {
  const r = await getLiaison(db, actor, id);
  await requirePermission(db, actor, "liaison.submission.acknowledge", r.holding_unit_id, { type: "liaison", id });
  requireOffice(actor, r.holding_unit_id, "acknowledge");
  if (r.status !== "RECEIVED") throw conflict("Record receipt before acknowledging.");
  const d = acknowledgeLiaisonSchema.parse(input);
  screenRef(d.approvalReference);
  checkDate(d.dateAcknowledged, "acknowledgement date", r.date_received);
  // The officer who submitted is told; found from the routing history, not from the browser.
  const sender = await one<{ actor_id: string }>(db, "SELECT actor_id FROM liaison_routing WHERE record_id = ? AND action IN ('SUBMIT','ROUTE') ORDER BY seq DESC LIMIT 1", id);
  await tx(db, async (db) => {
    await guarded(db, "UPDATE liaison_records SET status = 'ACKNOWLEDGED', date_acknowledged = ?, approval_reference = COALESCE(?, approval_reference), version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      d.dateAcknowledged, d.approvalReference ?? null, nowIso(), id, r.version);
    await event(db, id, actor.userId, "ACKNOWLEDGE", r.status, "ACKNOWLEDGED", r.holding_unit_id, r.holding_unit_id, d.approvalReference);
    await audit(db, { actorId: actor.userId, action: "liaison.acknowledge", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: r.holding_unit_id,
      details: { reference: r.reference, previousStatus: r.status, status: "ACKNOWLEDGED", approvalReference: d.approvalReference ?? r.approval_reference } });
    if (sender && sender.actor_id !== actor.userId) {
      await notify(db, sender.actor_id, "Liaison reference acknowledged", `${r.reference} was acknowledged by ${r.holding_name}.`, `/app/liaison/records/${id}`, { dedupeKey: `lia-ack:${id}:${r.version}` });
    }
  });
  return (await load(db, id))!;
}

export async function closeLiaison(db: DB, actor: Actor, id: string) {
  const r = await getLiaison(db, actor, id);
  await requirePermission(db, actor, "liaison.submission.acknowledge", r.holding_unit_id, { type: "liaison", id });
  requireOffice(actor, r.holding_unit_id, "close this record");
  if (r.status !== "ACKNOWLEDGED") throw conflict("Only an acknowledged record can be closed.");
  await tx(db, async (db) => {
    await guarded(db, "UPDATE liaison_records SET status = 'CLOSED', version = version + 1, updated_at = ? WHERE id = ? AND version = ?", nowIso(), id, r.version);
    await event(db, id, actor.userId, "CLOSE", r.status, "CLOSED", r.holding_unit_id, null);
    await audit(db, { actorId: actor.userId, action: "liaison.close", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: r.holding_unit_id, details: { reference: r.reference, previousStatus: r.status, status: "CLOSED" } });
  });
  return (await load(db, id))!;
}

/** Withdraw a draft, or a submission not yet received, by the officer who holds it. */
export async function withdrawLiaison(db: DB, actor: Actor, id: string) {
  const r = await getLiaison(db, actor, id);
  if (r.status !== "DRAFT" && r.status !== "SUBMITTED") throw conflict("Only a draft or a submission not yet received can be withdrawn.");
  if (r.responsible_user_id !== actor.userId) throw forbidden("Only the responsible officer can withdraw this record.");
  const from = r.status === "SUBMITTED"
    ? (await one<{ from_unit_id: string }>(db, "SELECT from_unit_id FROM liaison_routing WHERE record_id = ? AND action IN ('SUBMIT','ROUTE') ORDER BY seq DESC LIMIT 1", id))?.from_unit_id ?? r.origin_unit_id
    : r.holding_unit_id;
  await requirePermission(db, actor, "liaison.reference.route", from, { type: "liaison", id });
  await tx(db, async (db) => {
    await guarded(db, "UPDATE liaison_records SET status = 'WITHDRAWN', holding_unit_id = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?", from, nowIso(), id, r.version);
    await event(db, id, actor.userId, "WITHDRAW", r.status, "WITHDRAWN", r.holding_unit_id, from);
    await audit(db, { actorId: actor.userId, action: "liaison.withdraw", category: "BUSINESS", entityType: "liaison", entityId: id, orgUnitId: from, details: { reference: r.reference, previousStatus: r.status, status: "WITHDRAWN" } });
  });
  return (await load(db, id))!;
}

// ── Registers and views ───────────────────────────────────────────────────────────────────────────────
/** The directive's pages, as views of one register (each is its own route). */
export const LIAISON_VIEWS = {
  all: { title: "Liaison register", hint: "Every liaison reference in your scope." },
  assigned: { title: "Assigned references", hint: "References for which you are the responsible officer." },
  submissions: { title: "Submission status", hint: "References originated by offices in your scope, with their submission and acknowledgement status." },
  incoming: { title: "Receiving and review queue", hint: "References routed to your office that await receipt or acknowledgement." },
  acknowledgements: { title: "Outstanding acknowledgements", hint: "References routed to your office that await receipt or acknowledgement, and submissions from your scope still awaiting acknowledgement elsewhere." },
  reports: { title: "Report reference tracking", hint: "Report references (reference numbers only) and where they are held." },
} as const;
export type LiaisonView = keyof typeof LIAISON_VIEWS;
export type LiaisonFilters = { view?: LiaisonView; q?: string; status?: string; kind?: string };

function liaisonQuery(actor: Actor, f: LiaisonFilters): Query {
  const sc = scopeSql(actor);
  const where = [sc.sql];
  const params: unknown[] = [...sc.params];
  const own = ownOffices(actor);
  const mineHolding = own.length ? { sql: `r.holding_unit_id IN (${own.map(() => "?").join(",")})`, params: own as unknown[] } : { sql: "1=0", params: [] as unknown[] };
  const mineOrigin = unitsSql(actor, "liaison.status.view", "r.origin_unit_id");
  switch (f.view) {
    case "assigned":
      where.push("r.responsible_user_id = ? AND r.status NOT IN ('CLOSED','WITHDRAWN')"); params.push(actor.userId); break;
    case "submissions":
      where.push(mineOrigin.sql, "r.status <> 'WITHDRAWN'"); params.push(...mineOrigin.params); break;
    case "incoming":
      where.push(mineHolding.sql, "r.status IN ('SUBMITTED','RECEIVED')"); params.push(...mineHolding.params); break;
    case "acknowledgements":
      where.push(`((${mineHolding.sql} OR ${mineOrigin.sql}) AND r.status IN ('SUBMITTED','RECEIVED'))`); params.push(...mineHolding.params, ...mineOrigin.params); break;
    case "reports":
      where.push("r.kind = 'REPORT_REFERENCE'"); break;
  }
  if (f.q) { where.push("(r.reference LIKE ? OR r.external_reference LIKE ? OR r.approval_reference LIKE ?)"); params.push(...Array(3).fill(`%${f.q}%`)); }
  if (f.status && f.status in LIAISON_STATUS_LABEL) { where.push("r.status = ?"); params.push(f.status); }
  if (f.kind && f.kind in LIAISON_KIND_LABEL) { where.push("r.kind = ?"); params.push(f.kind); }
  return { ...splitSelect(SELECT), where: where.join(" AND "), params, order: "r.updated_at DESC, r.reference DESC" };
}

export async function pageLiaison(db: DB, actor: Actor, f: LiaisonFilters & Paging = {}): Promise<Page<LiaisonRecord>> {
  await requirePermission(db, actor, "liaison.metadata.view", undefined, { type: "liaison" });
  return pageQuery<LiaisonRecord>(db, liaisonQuery(actor, f), f);
}
export async function listLiaison(db: DB, actor: Actor, f: LiaisonFilters = {}, limit = 10): Promise<LiaisonRecord[]> {
  await requirePermission(db, actor, "liaison.metadata.view", undefined, { type: "liaison" });
  return firstRows<LiaisonRecord>(db, liaisonQuery(actor, f), limit);
}
export async function countLiaison(db: DB, actor: Actor, f: LiaisonFilters = {}): Promise<number> {
  if (!hasPermission(actor, "liaison.metadata.view")) return 0;
  return countQuery(db, liaisonQuery(actor, f));
}

export async function liaisonRouting(db: DB, actor: Actor, id: string): Promise<RoutingEvent[]> {
  await getLiaison(db, actor, id);
  return all<RoutingEvent>(db, `${ROUTING_SELECT} WHERE e.record_id = ? ORDER BY e.seq`, id);
}
const ROUTING_SELECT = `SELECT e.*, r.reference, f.name AS from_name, t.name AS to_name, u.display_name AS actor_name
  FROM liaison_routing e JOIN liaison_records r ON r.id = e.record_id LEFT JOIN org_units f ON f.id = e.from_unit_id LEFT JOIN org_units t ON t.id = e.to_unit_id JOIN users u ON u.id = e.actor_id`;

/** The administrative transaction history across every record in scope (routing view: submissions and onward routing only). */
export async function pageLiaisonHistory(db: DB, actor: Actor, f: Paging & { routingOnly?: boolean; q?: string } = {}): Promise<Page<RoutingEvent>> {
  await requirePermission(db, actor, "liaison.audit.view", undefined, { type: "liaison" });
  const sc = scopeSql(actor);
  const where = [sc.sql];
  const params: unknown[] = [...sc.params];
  if (f.routingOnly) where.push("e.action IN ('SUBMIT','ROUTE','RECEIVE','ACKNOWLEDGE')");
  if (f.q) { where.push("r.reference LIKE ?"); params.push(`%${f.q}%`); }
  return pageQuery<RoutingEvent>(db, { ...splitSelect(ROUTING_SELECT), where: where.join(" AND "), params, order: "e.at DESC, e.seq DESC" }, f);
}

/** Dashboard figures and summaries (counts only; scope as the register). */
export async function liaisonFigures(db: DB, actor: Actor) {
  if (!hasPermission(actor, "liaison.status.view")) return null;
  const sc = scopeSql(actor);
  const byStatus = await all<{ status: string; c: number }>(db, `SELECT r.status, COUNT(*) AS c FROM liaison_records r WHERE ${sc.sql} GROUP BY r.status`, ...sc.params);
  const status = Object.fromEntries(Object.keys(LIAISON_STATUS_LABEL).map((k) => [k, Number(byStatus.find((x) => x.status === k)?.c ?? 0)]));
  const byOrigin = await all<{ name: string; c: number; open: number }>(db,
    `SELECT o.name, COUNT(*) AS c, SUM(r.status IN ('SUBMITTED','RECEIVED')) AS open FROM liaison_records r JOIN org_units o ON o.id = r.origin_unit_id
      WHERE ${sc.sql} AND r.status <> 'WITHDRAWN' GROUP BY o.name ORDER BY c DESC, o.name LIMIT 8`, ...sc.params);
  return {
    status,
    assigned: await countLiaison(db, actor, { view: "assigned" }),
    incoming: await countLiaison(db, actor, { view: "incoming", status: "SUBMITTED" }),
    toAcknowledge: await countLiaison(db, actor, { view: "incoming", status: "RECEIVED" }),
    awaitingElsewhere: await countLiaison(db, actor, { view: "submissions", status: "SUBMITTED" }) + await countLiaison(db, actor, { view: "submissions", status: "RECEIVED" }),
    reports: await countLiaison(db, actor, { view: "reports" }),
    byOrigin: byOrigin.map((x) => ({ label: x.name.replace(/ \(synthetic\)$/, ""), value: Number(x.c), open: Number(x.open ?? 0) })),
  };
}

/** The offices at which the actor may record a new liaison reference (its own liaison assignments). */
export function liaisonOffices(actor: Actor): Array<{ id: string; name: string }> {
  return actor.assignments.filter((a) => LIAISON_ROLES.includes(a.roleCode) && can(actor, "liaison.metadata.create", a.orgUnitId)).map((a) => ({ id: a.orgUnitId, name: a.orgUnitName ?? a.orgUnitId }));
}

/** Liaison activity in the actor's scope since a date (dashboard activity chart): counts of routing actions only. */
export async function liaisonActivity(db: DB, actor: Actor, since: string): Promise<Array<{ label: string; value: number; href: string }>> {
  if (!hasPermission(actor, "liaison.audit.view")) return [];
  const sc = scopeSql(actor);
  const rows = await all<{ action: string; c: number }>(db,
    `SELECT e.action, COUNT(*) AS c FROM liaison_routing e JOIN liaison_records r ON r.id = e.record_id WHERE e.at > ? AND ${sc.sql} GROUP BY e.action`, since, ...sc.params);
  const n = (...a: string[]) => rows.filter((x) => a.includes(x.action)).reduce((s, x) => s + Number(x.c), 0);
  return [
    { label: "References recorded", value: n("RECORD"), href: "/app/liaison" },
    { label: "Submitted or routed", value: n("SUBMIT", "ROUTE"), href: "/app/liaison/submissions" },
    { label: "Receipts recorded", value: n("RECEIVE"), href: "/app/liaison/acknowledgements" },
    { label: "Acknowledged", value: n("ACKNOWLEDGE"), href: "/app/liaison/history" },
  ];
}
