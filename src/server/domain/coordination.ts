/**
 * Inter-office coordination between executive portfolio offices (final master directive Part D §5.6, Part E; DEC-088).
 *
 * The three DIG portfolios report directly to the IG and are never placed under one another. When one must support
 * another — typically DIG Operations facilitating authorised Police personnel or administrative support for DIG Special
 * Duties / State House, or DIG Administration and DIG Operations coordinating training — the request is a
 * COORDINATION record, not an instruction: it confers no command authority, the receiving office decides how to
 * respond, and either side keeps its own mandate.
 *
 * Who: holders (substantive, or acting with the delegated action) of the portfolio offices in COORDINATION_OFFICE_TYPES.
 * Visibility: the requesting office, the receiving office and the Inspector General only (restricted recipients).
 * Content: administrative requirement, officer COUNT, authorisation reference, dates and status — screened free text.
 * There are no fields for protection plans, VVIP schedules, routes, deployments, vulnerabilities or protective
 * intelligence, and the screen refuses such terms. Every action is audited.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso } from "./core";
import type { Actor } from "./policy";
import { type Held, holdersOf, officesHeld, screen } from "./command";

/** Portfolio offices that may exchange coordination requests. */
export const COORDINATION_OFFICE_TYPES = ["IG", "DIG_OPERATIONS", "DIG_ADMINISTRATION", "DIG_SPECIAL_DUTIES", "COMMISSIONER_OPS", "DEPUTY_COMMISSIONER_OPS"];
export const COORDINATION_CATEGORY = {
  PERSONNEL_SUPPORT: "Provision of authorised Police personnel", ADMIN_SUPPORT: "Administrative support", TRAINING_SUPPORT: "Training coordination",
  INFORMATION: "Administrative information", OTHER: "Other",
} as const;
export const COORDINATION_STATUS = { SUBMITTED: "Submitted", ACKNOWLEDGED: "Acknowledged", IN_PROGRESS: "In progress", COMPLETED: "Completed", DECLINED: "Declined", CANCELLED: "Cancelled" } as const;
// Terms beyond the general excluded list that must never appear in coordination records.
const PROTECTION_TERMS = ["route", "itinerary", "motorcade", "convoy", "vulnerab", "threat assessment", "protection plan", "close protection", "escort plan", "safe house", "schedule of the president", "movement"];

function screenProtection(...texts: Array<string | null | undefined>) {
  screen(...texts);
  for (const t of texts) {
    if (!t) continue;
    const hit = PROTECTION_TERMS.find((x) => t.toLowerCase().includes(x));
    if (hit) throw invalid(`"${hit}" relates to protection or movement details, which ZPS-OMS must not hold. Record only the administrative requirement.`);
  }
}

async function portfolioOffices(db: DB, actor: Actor): Promise<Held[]> {
  return (await officesHeld(db, actor)).filter((h) => COORDINATION_OFFICE_TYPES.includes(h.positionType));
}
/** Offices this actor may address a coordination request to (every other portfolio office except its own). */
export async function coordinationTargets(db: DB, actor: Actor) {
  const mine = await portfolioOffices(db, actor);
  if (!mine.length) return { from: [], to: [] };
  const to = await all<{ id: string; title: string; position_type: string }>(db,
    `SELECT id, title, position_type FROM command_positions WHERE status = 'ACTIVE' AND position_type IN (${COORDINATION_OFFICE_TYPES.map(() => "?").join(",")}) AND position_type <> 'IG' ORDER BY title`, ...COORDINATION_OFFICE_TYPES);
  return { from: mine.map((h) => ({ id: h.positionId, title: h.title })), to: to.filter((x) => !mine.some((m) => m.positionId === x.id)) };
}

const requestSchema = z.object({
  fromPositionId: z.string().min(1, "Select your office."),
  toPositionId: z.string().min(1, "Select the receiving office."),
  category: z.enum(Object.keys(COORDINATION_CATEGORY) as [keyof typeof COORDINATION_CATEGORY, ...Array<keyof typeof COORDINATION_CATEGORY>]),
  subject: z.string().trim().min(5, "Enter the subject.").max(160),
  requirement: z.string().trim().min(10, "Describe the administrative requirement.").max(500),
  officersRequired: z.union([z.coerce.number().int().min(1).max(10000), z.literal("").transform(() => null)]).optional().nullable(),
  authorisationRef: z.string().trim().min(3, "Record the authorisation reference.").max(60),
  requiredBy: z.string().optional().transform((v) => v || null),
});

export async function submitCoordination(db: DB, actor: Actor, input: z.input<typeof requestSchema>) {
  const d = requestSchema.parse(input);
  const from = (await portfolioOffices(db, actor)).find((h) => h.positionId === d.fromPositionId && h.actions.includes("ISSUE_DIRECTIVE"));
  if (!from) {
    await audit(db, { actorId: actor.userId, action: "coordination.submit", outcome: "DENIED", category: "SECURITY", entityType: "coordination_request", details: { from: d.fromPositionId } });
    throw forbidden("You do not hold this portfolio office with authority to raise requests.");
  }
  const to = await one<{ id: string; position_type: string }>(db, "SELECT id, position_type FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.toPositionId);
  if (!to || !COORDINATION_OFFICE_TYPES.includes(to.position_type) || to.position_type === "IG" || to.id === from.positionId) throw invalid("Select another portfolio office as the receiving office.");
  screenProtection(d.subject, d.requirement, d.authorisationRef);
  const id = newId("crq");
  const ref = await nextReference(db, "CRD", "coordination_requests");
  const t = nowIso();
  await tx(db, async (c) => {
    await run(c, `INSERT INTO coordination_requests (id, reference, requesting_position_id, receiving_position_id, category, subject, requirement, officers_required, authorisation_ref, required_by, created_by, created_at, updated_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, ref, from.positionId, to.id, d.category, d.subject, d.requirement, d.officersRequired ?? null, d.authorisationRef, d.requiredBy, actor.userId, t, t);
    await run(c, "INSERT INTO coordination_events (id, request_id, seq, action, actor_user_id, actor_position_id, to_status, at) VALUES (?,?,1,'SUBMIT',?,?, 'SUBMITTED', ?)", newId("cev"), id, actor.userId, from.positionId, t);
    await audit(c, { actorId: actor.userId, action: "coordination.submit", category: "BUSINESS", entityType: "coordination_request", entityId: id, details: { reference: ref, from: from.positionId, to: to.id } });
  });
  for (const u of await holdersOf(db, to.id)) await notify(db, u, `Coordination request ${ref}`, d.subject, `/app/coordination/${id}`);
  return { id, reference: ref };
}

interface RequestRow { id: string; reference: string; requesting_position_id: string; receiving_position_id: string; from_title: string; to_title: string; category: string; subject: string; requirement: string; officers_required: number | null; authorisation_ref: string; required_by: string | null; status: string; version: number; created_at: string; updated_at: string }
const RSELECT = `SELECT r.id, r.reference, r.requesting_position_id, r.receiving_position_id, f.title AS from_title, t.title AS to_title, r.category, r.subject, r.requirement, r.officers_required,
    r.authorisation_ref, r.required_by, r.status, r.version, r.created_at, r.updated_at
  FROM coordination_requests r JOIN command_positions f ON f.id = r.requesting_position_id JOIN command_positions t ON t.id = r.receiving_position_id`;

/** Requests visible to the actor: those of its portfolio offices; all of them for the Inspector General. */
export async function listCoordination(db: DB, actor: Actor) {
  const mine = await portfolioOffices(db, actor);
  if (!mine.length) return [];
  if (mine.some((h) => h.positionType === "IG")) return all<RequestRow>(db, `${RSELECT} ORDER BY r.updated_at DESC LIMIT 300`);
  const ids = mine.map((h) => h.positionId);
  const l = ids.map(() => "?").join(",");
  return all<RequestRow>(db, `${RSELECT} WHERE r.requesting_position_id IN (${l}) OR r.receiving_position_id IN (${l}) ORDER BY r.updated_at DESC LIMIT 300`, ...ids, ...ids);
}

export async function getCoordination(db: DB, actor: Actor, id: string) {
  const r = await one<RequestRow>(db, `${RSELECT} WHERE r.id = ?`, id);
  const mine = await portfolioOffices(db, actor);
  const ig = mine.some((h) => h.positionType === "IG");
  const side = r ? mine.find((h) => h.positionId === r.receiving_position_id) ? "RECEIVER" : mine.find((h) => h.positionId === r.requesting_position_id) ? "REQUESTER" : null : null;
  if (!r || !(side || ig)) {
    await audit(db, { actorId: actor.userId, action: "coordination.view", outcome: "DENIED", category: "SECURITY", entityType: "coordination_request", entityId: id });
    throw notFound();
  }
  const events = await all<{ seq: number; action: string; note: string | null; by: string; office: string; to_status: string; at: string }>(db,
    `SELECT e.seq, e.action, e.note, u.display_name AS \`by\`, p.title AS office, e.to_status, e.at FROM coordination_events e JOIN users u ON u.id = e.actor_user_id
       JOIN command_positions p ON p.id = e.actor_position_id WHERE e.request_id = ? ORDER BY e.seq`, id);
  return { request: r, events, side, observer: !side && ig };
}

const MOVES: Record<string, { from: string[]; to: string; side: "RECEIVER" | "REQUESTER"; noteRequired?: boolean }> = {
  ACKNOWLEDGE: { from: ["SUBMITTED"], to: "ACKNOWLEDGED", side: "RECEIVER" },
  PROGRESS: { from: ["ACKNOWLEDGED", "IN_PROGRESS"], to: "IN_PROGRESS", side: "RECEIVER", noteRequired: true },
  COMPLETE: { from: ["ACKNOWLEDGED", "IN_PROGRESS"], to: "COMPLETED", side: "RECEIVER", noteRequired: true },
  DECLINE: { from: ["SUBMITTED", "ACKNOWLEDGED"], to: "DECLINED", side: "RECEIVER", noteRequired: true },
  CANCEL: { from: ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"], to: "CANCELLED", side: "REQUESTER", noteRequired: true },
};
export async function actOnCoordination(db: DB, actor: Actor, id: string, action: keyof typeof MOVES, note?: string) {
  const m = MOVES[action];
  if (!m) throw invalid("Unknown action.");
  const r = await one<{ status: string; requesting_position_id: string; receiving_position_id: string; reference: string; version: number }>(db,
    "SELECT status, requesting_position_id, receiving_position_id, reference, version FROM coordination_requests WHERE id = ?", id);
  if (!r) throw notFound();
  const office = m.side === "RECEIVER" ? r.receiving_position_id : r.requesting_position_id;
  const held = (await portfolioOffices(db, actor)).find((h) => h.positionId === office && h.actions.includes(m.side === "RECEIVER" ? "ACKNOWLEDGE" : "ISSUE_DIRECTIVE"));
  if (!held) {
    await audit(db, { actorId: actor.userId, action: `coordination.${action.toLowerCase()}`, outcome: "DENIED", category: "SECURITY", entityType: "coordination_request", entityId: id });
    throw forbidden(m.side === "RECEIVER" ? "Only the receiving office can do this." : "Only the requesting office can do this.");
  }
  if (!m.from.includes(r.status)) throw conflict(`A ${r.status.toLowerCase()} request cannot be ${m.to.toLowerCase()}.`);
  if (m.noteRequired && !note?.trim()) throw invalid("Enter a short administrative note.");
  screenProtection(note);
  const t = nowIso();
  await tx(db, async (c) => {
    const u = await run(c, "UPDATE coordination_requests SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?", m.to, t, id, r.version);
    if (u.changes !== 1) throw conflict("The request was changed by someone else; reload and try again.");
    const seq = Number((await one<{ s: number }>(c, "SELECT COALESCE(MAX(seq),0) + 1 AS s FROM coordination_events WHERE request_id = ?", id))!.s);
    await run(c, "INSERT INTO coordination_events (id, request_id, seq, action, note, actor_user_id, actor_position_id, from_status, to_status, at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      newId("cev"), id, seq, action, note?.trim() || null, actor.userId, held.positionId, r.status, m.to, t);
    await audit(c, { actorId: actor.userId, action: `coordination.${action.toLowerCase()}`, category: "BUSINESS", entityType: "coordination_request", entityId: id, details: { from: r.status, to: m.to } });
  });
  const other = m.side === "RECEIVER" ? r.requesting_position_id : r.receiving_position_id;
  for (const u of await holdersOf(db, other)) await notify(db, u, `Coordination request ${r.reference}: ${COORDINATION_STATUS[m.to as keyof typeof COORDINATION_STATUS].toLowerCase()}`, note ?? "", `/app/coordination/${id}`);
}
