/**
 * Command and Reporting Management (owner directive 27 Nov 2026, Parts 4–13; DEC-074 … DEC-077).
 *
 * ADMINISTRATIVE instructions downward and status reports upward through configured institutional relationships.
 * It is not a tactical command-and-control system: there are no plans, routes, deployments, locations or
 * intelligence fields, and free text is screened for excluded terms.
 *
 * Authority comes from OFFICES, not ranks or application roles:
 *  - a user holds a command position through a current appointment (SUBSTANTIVE: every command action of the office)
 *    or a current acting appointment (ACTING: only the delegated actions, only until it expires or is revoked);
 *  - a directive may be issued only to an office DIRECTLY below the issuing office: PRIMARY_COMMAND allows every
 *    category; ADMIN_COORDINATION allows administrative instructions and operations administrative tasks only;
 *    reporting relationships (PRIMARY_REPORTING, PARALLEL_REPORTING) never confer instruction authority;
 *  - a report goes automatically to the reporting office's designated superiors: its PRIMARY_REPORTING superior(s),
 *    or else its PRIMARY_COMMAND superior, as primary recipients; PARALLEL_REPORTING and ADMIN_COORDINATION superiors
 *    as parallel recipients. One report, one reference, one recipient record per office. The reporter cannot choose to
 *    skip the designated superior;
 *  - the IG office has no superior: nothing can be addressed to it as an instruction, and DIG offices report to it.
 * Relationships cannot form a loop (checked on every insert). Conflicting tasking is referred to the nearest common
 * superior office; nothing decides precedence automatically.
 *
 * Visibility (server-side): a directive is visible to holders of its issuing or receiving office, or of any office in
 * the chain of directives above it; a report to holders of the reporting office and of each recipient office; a
 * conflict to the receiving office, both issuing offices and the common superior. Structure views need
 * command.structure.view; changes need command.structure.manage.
 *
 * Appointment-only access (DEC-076, owner direction 27 Nov 2026): a user with an appointment but none of the 31
 * application roles may use these functions for their own office only, and only for office types that have no
 * application role (by default Sergeant and Constable), while the policy is on. The policy is changed on the platform
 * console by platform configuration only, with a reason (and in production a Service decision reference), and is
 * audited. Default: on outside production, off in production. It never grants any other module.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS, ROLE_BY_CODE } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, today } from "./core";
import { type Actor, can, hasPermission, requirePermission } from "./policy";
import { isProduction } from "../lib/environment";

// ── Vocabulary ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * Office types. `role` is a PROPOSED correspondence with one of the 31 roles, recorded for institutional validation; it
 * confers nothing. `appointmentOnly` marks the ranks the catalogue deliberately does not represent (DEC-076).
 * `mappingNote` records why a mapping is left undecided (DEC-075 review).
 */
export const POSITION_TYPES: Record<string, { label: string; rank: string; role?: string; appointmentOnly?: true; mappingNote?: string }> = {
  IG: { label: "Inspector General of Police", rank: "Inspector General", role: "INSPECTOR_GENERAL" },
  DIG_OPERATIONS: { label: "Deputy Inspector General of Police - Operations (DIG Operations)", rank: "Deputy Inspector General", role: "DIG_OPERATIONS" },
  DIG_ADMINISTRATION: { label: "Deputy Inspector General – Administration", rank: "Deputy Inspector General" },
  DIG_SPECIAL_DUTIES: { label: "Deputy Inspector General – Special Duties / State House", rank: "Deputy Inspector General" },
  COMMISSIONER_OPS: { label: "Commissioner – Operations HQ", rank: "Commissioner", role: "COMMISSIONER_OPS_HQ" },
  DEPUTY_COMMISSIONER_OPS: { label: "Deputy Commissioner – Operations HQ", rank: "Deputy Commissioner", role: "DEPUTY_COMMISSIONER_OPS_HQ" },
  DIVISIONAL_COMMANDER: { label: "Divisional Commander / Formation Commanding Officer", rank: "Commissioner of Police (published for Provincial Divisions)", role: "FORMATION_COMMANDING_OFFICER" },
  DEPUTY_DIVISION_COMMANDER: { label: "Deputy Division Commander", rank: "Deputy Commissioner of Police (published for Provincial Divisions)", role: "DEPUTY_DIVISION_COMMANDER" },
  STAFF_I: { label: "Division Senior Staff Officer – Operations (Staff I)", rank: "Senior Superintendent", role: "DIVISION_STAFF_I" },
  STAFF_II: { label: "Deputy Division Staff Officer – Operations (Staff II)", rank: "Superintendent", role: "DIVISION_STAFF_II" },
  FORMATION_STAFF_ADMIN: { label: "Formation Operations Staff Administrator", rank: "—", role: "FORMATION_OPS_STAFF_ADMIN" },
  // Kamfinsa Mobile Unit Company and Detachment offices (institutional directive 28 Nov 2026, §9.2–§9.4). The Company
  // Commander is the Section Head / Officer-in-Charge of the Company; the Deputy assumes duties through a dated acting
  // appointment; the Detachment Commander reports to the Company Commander and Deputy Company Commander.
  COMPANY_COMMANDER: { label: "Company Commander", rank: "As appointed", role: "COMPANY_COMMANDER" },
  DEPUTY_COMPANY_COMMANDER: { label: "Deputy Company Commander", rank: "As appointed", role: "COMPANY_COMMANDER" },
  DETACHMENT_COMMANDER: { label: "Detachment Commander", rank: "As appointed", role: "SECTION_HEAD" },
  AREA_COMMANDER: { label: "Area Commander", rank: "Superintendent or Assistant Superintendent", mappingNote: "Not mapped: an Area Commander commands the Mobile Unit elements deployed to an area, which may span companies; Company Commander is company-scoped. The Service is to decide the role (DEC-075 review, item M-3)." },
  // The Platoon Commander is directly in charge of the officers on the ground (directive §11); the rank (Chief Inspector)
  // and the appointment are separate: the office is the appointment, the rank is held in the personnel registry.
  SECTION_PLATOON_COMMANDER: { label: "Platoon Commander (Section/Platoon Commander)", rank: "Chief Inspector", role: "SECTION_HEAD" },
  INSPECTOR: { label: "Inspector", rank: "Inspector", role: "SECTION_HEAD" },
  SERGEANT: { label: "Sergeant", rank: "Sergeant", appointmentOnly: true },
  CONSTABLE: { label: "Police Officer / Constable", rank: "Constable", appointmentOnly: true },
  OC_DISTRICT: { label: "Officer Commanding — District", rank: "Senior Superintendent", role: "OC_DISTRICT" },
  DEPUTY_OC_DISTRICT: { label: "Deputy OC — District", rank: "Superintendent", role: "DEPUTY_OC_DISTRICT" },
  OPS_OFFICER_DISTRICT: { label: "Operations Officer — District", rank: "Superintendent", role: "OPS_OFFICER_DISTRICT" },
  OIC_STATION: { label: "Officer-in-Charge — Police Station GD", rank: "Chief Inspector", role: "OIC_STATION_GD" },
  STATION_INSPECTOR: { label: "Station Inspector — Police Station GD", rank: "Inspector", role: "STATION_INSPECTOR_GD" },
  STATION_ADMINISTRATOR: { label: "Police Station Administrator (Stores and Admin)", rank: "—", role: "STATION_ADMIN_STORES" },
};
export const RELATIONSHIP_LABEL = {
  PRIMARY_COMMAND: "Primary command", PRIMARY_REPORTING: "Primary reporting", PARALLEL_REPORTING: "Parallel reporting", ADMIN_COORDINATION: "Administrative coordination",
} as const;
export type RelationshipType = keyof typeof RELATIONSHIP_LABEL;
export const DIRECTIVE_CATEGORY = {
  COMMAND_DIRECTIVE: "Formal command directive", ADMIN_INSTRUCTION: "Administrative instruction", OPS_ADMIN_TASK: "Operations administrative task", PERSONNEL_ASSIGNMENT: "Personnel-related administrative assignment",
} as const;
export type DirectiveCategory = keyof typeof DIRECTIVE_CATEGORY;
export const DIRECTIVE_STATUS: Record<string, string> = { ISSUED: "Issued", ACKNOWLEDGED: "Acknowledged", IN_PROGRESS: "In progress", COMPLETED: "Completion reported", CLOSED: "Closed", CANCELLED: "Cancelled" };
export const REPORT_CATEGORY = { STATUS: "Status report", PROGRESS: "Progress report", COMPLETION: "Completion report", AREA_STATUS: "Area status report", ESCALATION: "Escalation", RECOMMENDATION: "Administrative recommendation" } as const;
export type ReportCategory = keyof typeof REPORT_CATEGORY;
export const REPORT_STATUS: Record<string, string> = { DRAFT: "Draft", SUBMITTED: "Submitted", RETURNED: "Returned for correction", CLOSED: "Closed" };
export const RECIPIENT_STATUS: Record<string, string> = { PENDING: "Awaiting acknowledgement", ACKNOWLEDGED: "Acknowledged", REVIEWED: "Reviewed", RETURNED: "Returned", FORWARDED: "Forwarded", CLOSED: "Closed" };
export const PROGRESS = { ON_TRACK: "On track", DELAYED: "Delayed", COMPLETED: "Completed", BLOCKED: "Blocked" } as const;
export const COMMAND_ACTIONS = {
  ISSUE_DIRECTIVE: "Issue directives", FORWARD_DIRECTIVE: "Assign or forward directives", ACKNOWLEDGE: "Acknowledge directives and reports", REVIEW_REPORT: "Review, return, forward and close reports",
  SUBMIT_REPORT: "Submit reports", CLOSE_DIRECTIVE: "Close or cancel directives", RESOLVE_CONFLICT: "Decide command conflicts", APPOINT_ACTING: "Appoint acting officers",
  // Field command (institutional directive 28 Nov 2026, §10–§11; field-command.ts): only offices of the matching type use them.
  RECORD_ATTENDANCE: "Record platoon attendance", RECORD_ENGAGEMENT: "Record partner-organisation engagements",
} as const;
export type CommandAction = keyof typeof COMMAND_ACTIONS;
/** Categories an ADMIN_COORDINATION superior may issue (no formal command directives or personnel assignments). */
const COORDINATION_CATEGORIES: DirectiveCategory[] = ["ADMIN_INSTRUCTION", "OPS_ADMIN_TASK"];

/** Rejects free text that touches an excluded class of information (shared with field-command.ts). */
export function screen(...texts: Array<string | null | undefined>) {
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    const hit = PROHIBITED_TERMS.find((t) => new RegExp(`\\b${t}`).test(lower));
    if (hit) throw invalid(`"${hit}" relates to an excluded class of information. Command and reporting records hold administrative matters only.`);
  }
}

// ── Offices held ───────────────────────────────────────────────────────────────────────────────────────
export interface Held { positionId: string; title: string; orgUnitId: string; positionType: string; authority: "SUBSTANTIVE" | "ACTING"; actingId: string | null; actions: CommandAction[] }

/**
 * Users WITH an application role hold every office they are appointed to. Users WITHOUT one (DEC-076) hold only offices
 * of the types the appointment-only policy allows (by default Sergeant and Constable), and only while it is on.
 * Returns null for "no restriction", or the allowed office types.
 */
/**
 * Executive portfolio offices with no application role in the 31-role catalogue (final master directive, Part B/E;
 * DEC-088): the DIG Administration and the DIG Special Duties / State House. Their appointees hold their OWN office —
 * command and reporting with the IG, inter-office coordination and their portfolio workspace — and nothing else. This is
 * office-based authority (DEC-074), not a new role, and it is independent of the Sergeant/Constable policy.
 */
export const EXECUTIVE_APPOINTMENT_TYPES = ["DIG_ADMINISTRATION", "DIG_SPECIAL_DUTIES"];

async function appointmentOnlyTypes(db: DB, actor: Actor): Promise<string[] | null> {
  if (actor.assignments.length) return null;
  const p = await appointmentAccessPolicy(db);
  return [...(p.enabled ? p.types : []), ...EXECUTIVE_APPOINTMENT_TYPES];
}

/** Every office the actor holds now, with the authority and actions it carries. */
export async function officesHeld(db: DB, actor: Actor): Promise<Held[]> {
  const only = await appointmentOnlyTypes(db, actor);
  if (only && !only.length) return [];
  const t = nowIso();
  const subst = await all<{ id: string; title: string; org_unit_id: string; position_type: string }>(db,
    `SELECT p.id, p.title, p.org_unit_id, p.position_type FROM position_appointments a JOIN command_positions p ON p.id = a.position_id
      WHERE a.user_id = ? AND a.ended_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?) AND p.status = 'ACTIVE'`, actor.userId, t, t);
  const acting = await all<{ aid: string; id: string; title: string; org_unit_id: string; position_type: string; actions: string }>(db,
    `SELECT x.id AS aid, p.id, p.title, p.org_unit_id, p.position_type, x.actions FROM acting_appointments x JOIN command_positions p ON p.id = x.position_id
      WHERE x.acting_user_id = ? AND x.revoked_at IS NULL AND x.valid_from <= ? AND x.valid_to > ? AND p.status = 'ACTIVE'`, actor.userId, t, t);
  const held: Held[] = [
    ...subst.map((p) => ({ positionId: p.id, title: p.title, orgUnitId: p.org_unit_id, positionType: p.position_type, authority: "SUBSTANTIVE" as const, actingId: null, actions: Object.keys(COMMAND_ACTIONS) as CommandAction[] })),
    ...acting.map((p) => ({ positionId: p.id, title: p.title, orgUnitId: p.org_unit_id, positionType: p.position_type, authority: "ACTING" as const, actingId: p.aid, actions: p.actions.split(",").filter((a) => a in COMMAND_ACTIONS) as CommandAction[] })),
  ];
  return only ? held.filter((h) => only.includes(h.positionType)) : held;
}

/** The authority under which the actor may perform `action` for `positionId` (substantive preferred), or null. */
export async function authorityFor(db: DB, actor: Actor, positionId: string, action: CommandAction): Promise<Held | null> {
  const held = (await officesHeld(db, actor)).filter((h) => h.positionId === positionId && h.actions.includes(action));
  return held.find((h) => h.authority === "SUBSTANTIVE") ?? held[0] ?? null;
}
async function requireAuthority(db: DB, actor: Actor, positionId: string, action: CommandAction, entity: { type: string; id?: string }) {
  const a = await authorityFor(db, actor, positionId, action);
  if (!a) {
    await audit(db, { actorId: actor.userId, action: `command.${action.toLowerCase()}`, outcome: "DENIED", category: "SECURITY", entityType: entity.type, entityId: entity.id, details: { position: positionId } });
    throw forbidden(`You do not hold this office with authority to ${COMMAND_ACTIONS[action].toLowerCase()}.`);
  }
  return a;
}

/** Users who currently hold an office (substantive, or acting with the action), for notifications. */
export async function holdersOf(db: DB, positionId: string, action?: CommandAction): Promise<string[]> {
  const t = nowIso();
  const s = await all<{ user_id: string }>(db, "SELECT user_id FROM position_appointments WHERE position_id = ? AND ended_at IS NULL AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)", positionId, t, t);
  const a = await all<{ acting_user_id: string; actions: string }>(db, "SELECT acting_user_id, actions FROM acting_appointments WHERE position_id = ? AND revoked_at IS NULL AND valid_from <= ? AND valid_to > ?", positionId, t, t);
  return [...new Set([...s.map((x) => x.user_id), ...a.filter((x) => !action || x.actions.split(",").includes(action)).map((x) => x.acting_user_id)])];
}

// ── Relationships ──────────────────────────────────────────────────────────────────────────────────────
interface Rel { id: string; subordinate_position_id: string; superior_position_id: string; relationship_type: RelationshipType; channel: string | null }
async function activeRelationships(db: DB, where: string, ...params: unknown[]): Promise<Rel[]> {
  const t = nowIso();
  return all<Rel>(db, `SELECT id, subordinate_position_id, superior_position_id, relationship_type, channel FROM reporting_relationships
    WHERE ended_at IS NULL AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?) AND ${where}`, t, t, ...params);
}
/** PRIMARY_COMMAND ancestors of an office, nearest first. */
export async function commandChain(db: DB, positionId: string): Promise<string[]> {
  const out: string[] = [];
  let cur = positionId;
  for (let i = 0; i < 50; i++) {
    const up = (await activeRelationships(db, "subordinate_position_id = ? AND relationship_type = 'PRIMARY_COMMAND'", cur))[0];
    if (!up || out.includes(up.superior_position_id)) break;
    out.push(up.superior_position_id);
    cur = up.superior_position_id;
  }
  return out;
}
/** Every office reachable upward from `positionId` through hierarchical relationships (for loop prevention). */
async function hierarchicalAncestors(db: DB, positionId: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const queue = [positionId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const r of await activeRelationships(db, "subordinate_position_id = ? AND relationship_type IN ('PRIMARY_COMMAND','PRIMARY_REPORTING')", cur)) {
      if (!seen.has(r.superior_position_id)) { seen.add(r.superior_position_id); queue.push(r.superior_position_id); }
    }
  }
  return seen;
}

export const relationshipSchema = z.object({
  subordinatePositionId: z.string().min(1), superiorPositionId: z.string().min(1), relationshipType: z.enum(["PRIMARY_COMMAND", "PRIMARY_REPORTING", "PARALLEL_REPORTING", "ADMIN_COORDINATION"]),
  channel: z.string().trim().max(60).optional().transform((v) => v || undefined), authorisingRef: z.string().trim().min(3, "Record the authorising reference.").max(60),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
/** Records a relationship. Refuses self-relationships, a second primary command superior, the IG under anyone, and loops. */
export async function addRelationship(db: DB, actor: Actor, input: z.input<typeof relationshipSchema>) {
  const d = relationshipSchema.parse(input);
  const sub = await one<{ id: string; org_unit_id: string; position_type: string }>(db, "SELECT id, org_unit_id, position_type FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.subordinatePositionId);
  const sup = await one<{ id: string; org_unit_id: string }>(db, "SELECT id, org_unit_id FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.superiorPositionId);
  if (!sub || !sup) throw invalid("Both offices must exist and be active.");
  await requirePermission(db, actor, "command.structure.manage", sub.org_unit_id, { type: "reporting_relationship" });
  if (d.subordinatePositionId === d.superiorPositionId) throw invalid("An office cannot report to itself.");
  if (sub.position_type === "IG") throw invalid("The Inspector General of Police is the highest command authority and has no superior office.");
  if (d.relationshipType === "PRIMARY_COMMAND" && (await activeRelationships(db, "subordinate_position_id = ? AND relationship_type = 'PRIMARY_COMMAND'", sub.id)).length) {
    throw conflict("This office already has a primary command superior. End that relationship first.");
  }
  // Loop prevention: the new superior must not already be below the subordinate in the hierarchy. Parallel and
  // coordination relationships are non-hierarchical channels but still may not point back down the same line.
  if ((await hierarchicalAncestors(db, sup.id)).has(sub.id)) throw invalid("This relationship would create a reporting loop: the proposed superior already reports, directly or indirectly, to this office.");
  if ((await activeRelationships(db, "subordinate_position_id = ? AND superior_position_id = ? AND relationship_type = ?", sub.id, sup.id, d.relationshipType)).length) throw conflict("This relationship already exists.");
  const id = newId("rel");
  const t = nowIso();
  await run(db, `INSERT INTO reporting_relationships (id, subordinate_position_id, superior_position_id, relationship_type, channel, valid_from, authorising_ref, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id, sub.id, sup.id, d.relationshipType, d.channel ?? null, d.validFrom ? `${d.validFrom}T00:00:00.000Z` : t, d.authorisingRef, actor.userId, t);
  await audit(db, { actorId: actor.userId, action: "command.relationship.add", category: "CONFIG", entityType: "reporting_relationship", entityId: id, orgUnitId: sub.org_unit_id,
    details: { subordinate: sub.id, superior: sup.id, type: d.relationshipType, channel: d.channel ?? null, authorisingRef: d.authorisingRef } });
  return id;
}

export async function endRelationship(db: DB, actor: Actor, id: string, reason: string) {
  const r = await one<{ subordinate_position_id: string; ended_at: string | null; org_unit_id: string }>(db,
    "SELECT r.subordinate_position_id, r.ended_at, p.org_unit_id FROM reporting_relationships r JOIN command_positions p ON p.id = r.subordinate_position_id WHERE r.id = ?", id);
  if (!r) throw notFound();
  await requirePermission(db, actor, "command.structure.manage", r.org_unit_id, { type: "reporting_relationship", id });
  if (r.ended_at) throw conflict("Already ended.");
  if (reason.trim().length < 5) throw invalid("Record why the relationship ends.");
  await run(db, "UPDATE reporting_relationships SET ended_at = ?, ended_by = ? WHERE id = ?", nowIso(), actor.userId, id);
  await audit(db, { actorId: actor.userId, action: "command.relationship.end", category: "CONFIG", entityType: "reporting_relationship", entityId: id, orgUnitId: r.org_unit_id, details: { reason: reason.trim() } });
}

// ── Appointments and acting appointments ───────────────────────────────────────────────────────────────
/** Users whose application roles are all technical or liaison roles cannot hold command offices. */
async function eligibleForCommand(db: DB, userId: string) {
  const roles = (await all<{ role_code: string }>(db, "SELECT role_code FROM role_assignments WHERE user_id = ? AND revoked_at IS NULL", userId)).map((r) => r.role_code);
  return roles.length === 0 || roles.some((c) => { const r = ROLE_BY_CODE[c as keyof typeof ROLE_BY_CODE]; return r && r.category !== "TECHNICAL" && r.dashboard !== "LIAISON"; });
}

export async function appoint(db: DB, actor: Actor, input: { positionId: string; userId: string; authorisingRef: string }) {
  const p = await one<{ id: string; org_unit_id: string }>(db, "SELECT id, org_unit_id FROM command_positions WHERE id = ? AND status = 'ACTIVE'", input.positionId);
  if (!p) throw invalid("Select an active office.");
  await requirePermission(db, actor, "command.structure.manage", p.org_unit_id, { type: "position_appointment" });
  if (input.authorisingRef.trim().length < 3) throw invalid("Record the authorising reference.");
  if (!(await one(db, "SELECT id FROM users WHERE id = ? AND status = 'ACTIVE'", input.userId))) throw invalid("Select an active account.");
  if (!(await eligibleForCommand(db, input.userId))) throw invalid("Technical administrators and liaison officers cannot hold command offices.");
  const t = nowIso();
  const id = newId("pap");
  await tx(db, async (db) => {
    const prev = await one<{ id: string }>(db, "SELECT id FROM position_appointments WHERE position_id = ? AND ended_at IS NULL", p.id);
    if (prev) await run(db, "UPDATE position_appointments SET ended_at = ?, ended_by = ?, end_reason = 'Succeeded by a new appointment' WHERE id = ?", t, actor.userId, prev.id);
    await run(db, "INSERT INTO position_appointments (id, position_id, user_id, valid_from, authorising_ref, created_by, created_at) VALUES (?,?,?,?,?,?,?)", id, p.id, input.userId, t, input.authorisingRef.trim(), actor.userId, t);
    await audit(db, { actorId: actor.userId, action: "command.appoint", category: "IAM", entityType: "command_position", entityId: p.id, orgUnitId: p.org_unit_id,
      details: { user: input.userId, previousAppointment: prev?.id ?? null, authorisingRef: input.authorisingRef.trim() } });
  });
  return id;
}

export const actingSchema = z.object({
  positionId: z.string().min(1), actingUserId: z.string().min(1, "Select the acting officer."),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a start date."), validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter an end date."),
  actions: z.array(z.enum(Object.keys(COMMAND_ACTIONS) as [CommandAction, ...CommandAction[]])).min(1, "Select at least one delegated action."),
  authorisingRef: z.string().trim().min(3, "Record the authorising reference.").max(60),
});
/**
 * Acting appointment. Authorised by the substantive holder of the office, or by a holder of an office directly or
 * indirectly above it in the command chain. Only the listed actions are delegated, for at most 180 days.
 */
export async function appointActing(db: DB, actor: Actor, input: z.input<typeof actingSchema>) {
  const d = actingSchema.parse(input);
  const p = await one<{ id: string; org_unit_id: string; title: string }>(db, "SELECT id, org_unit_id, title FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.positionId);
  if (!p) throw invalid("Select an active office.");
  const held = await officesHeld(db, actor);
  const chain = await commandChain(db, p.id);
  const authoriser = held.find((h) => h.authority === "SUBSTANTIVE" && (h.positionId === p.id || chain.includes(h.positionId)))
    ?? held.find((h) => h.actions.includes("APPOINT_ACTING") && chain.includes(h.positionId));
  if (!authoriser) {
    await audit(db, { actorId: actor.userId, action: "command.acting.appoint", outcome: "DENIED", category: "SECURITY", entityType: "command_position", entityId: p.id });
    throw forbidden("Only the holder of the office, or of an office above it in the command chain, can appoint an acting officer.");
  }
  if (d.validTo <= d.validFrom) throw invalid("The end date must be after the start date.");
  if ((Date.parse(d.validTo) - Date.parse(d.validFrom)) / 86400000 > 180) throw invalid("An acting appointment may last at most 180 days; record a new one to extend it.");
  if (d.validTo < today()) throw invalid("The end date has passed.");
  if (d.actingUserId === actor.userId && authoriser.positionId === p.id) throw invalid("You cannot appoint yourself to act in your own office.");
  if (!(await eligibleForCommand(db, d.actingUserId))) throw invalid("Technical administrators and liaison officers cannot act in command offices.");
  screen(d.authorisingRef);
  const original = await one<{ user_id: string }>(db, "SELECT user_id FROM position_appointments WHERE position_id = ? AND ended_at IS NULL", p.id);
  const id = newId("act");
  const t = nowIso();
  await run(db, `INSERT INTO acting_appointments (id, position_id, acting_user_id, original_user_id, authorised_by, authorising_ref, actions, valid_from, valid_to, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id, p.id, d.actingUserId, original?.user_id ?? null, actor.userId, d.authorisingRef, [...new Set(d.actions)].join(","), `${d.validFrom}T00:00:00.000Z`, `${d.validTo}T23:59:59.000Z`, t);
  await audit(db, { actorId: actor.userId, action: "command.acting.appoint", category: "IAM", entityType: "command_position", entityId: p.id, orgUnitId: p.org_unit_id,
    details: { acting: d.actingUserId, original: original?.user_id ?? null, actions: d.actions, validFrom: d.validFrom, validTo: d.validTo, authorisedFrom: authoriser.positionId, authorisingRef: d.authorisingRef } });
  await notify(db, d.actingUserId, "Acting appointment", `You act as ${p.title} from ${d.validFrom} to ${d.validTo} with delegated actions: ${d.actions.map((a) => COMMAND_ACTIONS[a].toLowerCase()).join(", ")}.`, "/app/command/acting");
  return id;
}

export async function revokeActing(db: DB, actor: Actor, id: string) {
  const a = await one<{ position_id: string; authorised_by: string; revoked_at: string | null; acting_user_id: string }>(db, "SELECT position_id, authorised_by, revoked_at, acting_user_id FROM acting_appointments WHERE id = ?", id);
  if (!a) throw notFound();
  const held = await officesHeld(db, actor);
  const chain = await commandChain(db, a.position_id);
  if (a.authorised_by !== actor.userId && !held.some((h) => h.authority === "SUBSTANTIVE" && (h.positionId === a.position_id || chain.includes(h.positionId)))) throw forbidden("Only the authorising officer, the office holder or a superior can revoke this acting appointment.");
  if (a.revoked_at) throw conflict("Already revoked.");
  await run(db, "UPDATE acting_appointments SET revoked_at = ?, revoked_by = ? WHERE id = ?", nowIso(), actor.userId, id);
  await audit(db, { actorId: actor.userId, action: "command.acting.revoke", category: "IAM", entityType: "command_position", entityId: a.position_id, details: { acting: a.acting_user_id, actingAppointment: id } });
}

export async function actingAppointments(db: DB, actor: Actor) {
  const held = await officesHeld(db, actor);
  const ids = held.map((h) => h.positionId);
  const rows = await all<{ id: string; position_id: string; title: string; acting_user_id: string; acting_name: string; original_name: string | null; authorised_name: string; authorising_ref: string; actions: string; valid_from: string; valid_to: string; revoked_at: string | null }>(db,
    `SELECT x.id, x.position_id, p.title, x.acting_user_id, ua.display_name AS acting_name, uo.display_name AS original_name, ub.display_name AS authorised_name, x.authorising_ref, x.actions, x.valid_from, x.valid_to, x.revoked_at
       FROM acting_appointments x JOIN command_positions p ON p.id = x.position_id JOIN users ua ON ua.id = x.acting_user_id LEFT JOIN users uo ON uo.id = x.original_user_id JOIN users ub ON ub.id = x.authorised_by
      WHERE x.acting_user_id = ? OR x.authorised_by = ? ${ids.length ? `OR x.position_id IN (${ids.map(() => "?").join(",")})` : ""} ORDER BY x.valid_to DESC LIMIT 200`, actor.userId, actor.userId, ...ids);
  const t = nowIso();
  return rows.map((r) => ({ ...r, state: r.revoked_at ? "Revoked" : r.valid_to <= t ? "Expired" : r.valid_from > t ? "Scheduled" : "Active" }));
}

// ── Directives ─────────────────────────────────────────────────────────────────────────────────────────
export interface Directive {
  id: string; reference: string; parent_id: string | null; category: DirectiveCategory; subject: string; instructions: string;
  issuer_user_id: string; issuer_name: string; issuer_position_id: string; issuer_title: string; authority: "SUBSTANTIVE" | "ACTING";
  recipient_position_id: string; recipient_title: string; recipient_unit: string; relationship_type: RelationshipType; channel: string | null;
  effective_date: string; due_date: string | null; ack_required: number; status: string; related_type: string | null; related_reference: string | null;
  completion_report_id: string | null; version: number; created_at: string; updated_at: string;
}
const DSELECT = `SELECT d.*, u.display_name AS issuer_name, pi.title AS issuer_title, pr.title AS recipient_title, o.name AS recipient_unit, rl.relationship_type, rl.channel
  FROM command_directives d JOIN users u ON u.id = d.issuer_user_id JOIN command_positions pi ON pi.id = d.issuer_position_id JOIN command_positions pr ON pr.id = d.recipient_position_id
  JOIN org_units o ON o.id = pr.org_unit_id JOIN reporting_relationships rl ON rl.id = d.relationship_id`;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const directiveSchema = z.object({
  fromPositionId: z.string().min(1, "Select the issuing office."), toPositionId: z.string().min(1, "Select the receiving office."),
  category: z.enum(["COMMAND_DIRECTIVE", "ADMIN_INSTRUCTION", "OPS_ADMIN_TASK", "PERSONNEL_ASSIGNMENT"]),
  subject: z.string().trim().min(5, "Enter a subject of at least 5 characters.").max(160),
  instructions: z.string().trim().min(10, "Enter the general instructions.").max(2000),
  effectiveDate: dateField.optional(), dueDate: dateField.optional().or(z.literal("").transform(() => undefined)),
  ackRequired: z.boolean().default(true),
  relatedType: z.enum(["MANPOWER_REQUEST", "ASSIGNMENT", "TRANSFER"]).optional(), relatedReference: z.string().trim().max(40).optional().transform((v) => v || undefined),
});

/** The relationship that lets `fromPosition` instruct `toPosition` in `category`, or an explanation of why not. */
async function instructionChannel(db: DB, fromPosition: string, toPosition: string, category: DirectiveCategory) {
  const rels = await activeRelationships(db, "subordinate_position_id = ? AND superior_position_id = ?", toPosition, fromPosition);
  const cmd = rels.find((r) => r.relationship_type === "PRIMARY_COMMAND");
  if (cmd) return cmd;
  const coord = rels.find((r) => r.relationship_type === "ADMIN_COORDINATION");
  if (coord && COORDINATION_CATEGORIES.includes(category)) return coord;
  if (coord) throw forbidden("An administrative coordination relationship allows administrative instructions and operations administrative tasks only, not formal command directives or personnel assignments.");
  if (rels.length) throw forbidden("A reporting relationship carries reports upward; it does not give authority to issue instructions.");
  if ((await commandChain(db, fromPosition)).includes(toPosition)) throw forbidden("Instructions flow downward only: the receiving office is senior to the issuing office. Report upward instead.");
  throw forbidden("Directives are issued only to an office directly below the issuing office in a configured command relationship; the receiving office forwards them to the next level.");
}

async function checkRelated(db: DB, actor: Actor, type?: string, ref?: string) {
  if (!type && !ref) return;
  if (!type || !ref) throw invalid("Give both the type and the reference of the related record.");
  const q: Record<string, [string, string, Parameters<typeof can>[1]]> = {
    MANPOWER_REQUEST: ["SELECT requesting_unit_id AS unit FROM manpower_requests WHERE reference = ?", "manpower request", "manpower.view"],
    ASSIGNMENT: ["SELECT responsible_unit_id AS unit FROM personnel_assignments WHERE reference = ?", "assignment", "assignment.view"],
    TRANSFER: ["SELECT receiving_unit_id AS unit FROM assignment_transfers WHERE reference = ?", "transfer", "assignment.view"],
  };
  const [sql, what, perm] = q[type];
  const row = await one<{ unit: string }>(db, sql, ref);
  // Existence is not disclosed: an unknown reference and one outside the issuer's scope give the same answer.
  if (!row || !can(actor, perm, row.unit)) throw invalid(`No ${what} with that reference is within your authorised scope.`);
}

async function devent(db: DB, id: string, action: string, actor: { userId: string | null; positionId: string | null; authority: string | null }, from: string | null, to: string, note?: string | null) {
  const seq = Number((await one<{ n: number }>(db, "SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM directive_events WHERE directive_id = ?", id))?.n ?? 1);
  await run(db, "INSERT INTO directive_events (id, directive_id, seq, action, actor_user_id, actor_position_id, authority, from_status, to_status, note, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    newId("dev"), id, seq, action, actor.userId, actor.positionId, actor.authority, from, to, note ?? null, nowIso());
}
async function guarded(db: DB, sql: string, ...params: unknown[]) {
  const r = await run(db, sql, ...params);
  if (r.changes !== 1) throw conflict("This record was changed by someone else. Reload and try again.");
}

async function createDirective(db: DB, actor: Actor, d: z.output<typeof directiveSchema>, parentId: string | null, action: CommandAction): Promise<Directive> {
  const auth = await requireAuthority(db, actor, d.fromPositionId, action, { type: "command_directive" });
  if (d.fromPositionId === d.toPositionId) throw invalid("Select a subordinate office.");
  const rel = await instructionChannel(db, d.fromPositionId, d.toPositionId, d.category).catch(async (e) => {
    await audit(db, { actorId: actor.userId, action: "command.directive.issue", outcome: "DENIED", category: "SECURITY", entityType: "command_directive", details: { from: d.fromPositionId, to: d.toPositionId, reason: (e as Error).message } });
    throw e;
  });
  screen(d.subject, d.instructions);
  await checkRelated(db, actor, d.relatedType, d.relatedReference);
  const effective = d.effectiveDate ?? today();
  if (d.dueDate && d.dueDate < effective) throw invalid("The due date cannot be before the effective date.");
  const id = newId("dir");
  const t = nowIso();
  let reference = "";
  await tx(db, async (db) => {
    reference = await nextReference(db, "DIR", "command_directives");
    await run(db, `INSERT INTO command_directives (id, reference, parent_id, category, subject, instructions, issuer_user_id, issuer_position_id, authority, acting_id, recipient_position_id, relationship_id,
                     effective_date, due_date, ack_required, related_type, related_reference, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, reference, parentId, d.category, d.subject, d.instructions, actor.userId, d.fromPositionId, auth.authority, auth.actingId, d.toPositionId, rel.id, effective, d.dueDate ?? null,
      d.ackRequired ? 1 : 0, d.relatedType ?? null, d.relatedReference ?? null, t, t);
    await devent(db, id, "ISSUE", { userId: actor.userId, positionId: d.fromPositionId, authority: auth.authority }, null, "ISSUED");
    if (parentId) {
      const parent = (await one<{ status: string; version: number }>(db, "SELECT status, version FROM command_directives WHERE id = ?", parentId))!;
      if (parent.status === "ACKNOWLEDGED" || parent.status === "ISSUED") await run(db, "UPDATE command_directives SET status = 'IN_PROGRESS', version = version + 1, updated_at = ? WHERE id = ?", t, parentId);
      await devent(db, parentId, "FORWARD", { userId: actor.userId, positionId: d.fromPositionId, authority: auth.authority }, parent.status, parent.status === "ACKNOWLEDGED" || parent.status === "ISSUED" ? "IN_PROGRESS" : parent.status, `Assigned onward as ${reference}`);
    }
    await audit(db, { actorId: actor.userId, action: parentId ? "command.directive.forward" : "command.directive.issue", category: "BUSINESS", entityType: "command_directive", entityId: id,
      details: { reference, category: d.category, from: d.fromPositionId, to: d.toPositionId, relationship: rel.relationship_type, authority: auth.authority, actingAppointment: auth.actingId, parent: parentId, related: d.relatedReference ?? null } });
    for (const u of await holdersOf(db, d.toPositionId, "ACKNOWLEDGE")) {
      if (u !== actor.userId) await notify(db, u, "Directive received", `${reference}: ${d.subject}`, `/app/command/directives/${id}`, { dedupeKey: `dir:${id}:${u}` });
    }
  });
  await detectConflicts(db, id);
  return (await one<Directive>(db, `${DSELECT} WHERE d.id = ?`, id))!;
}

export async function issueDirective(db: DB, actor: Actor, input: z.input<typeof directiveSchema>) {
  return createDirective(db, actor, directiveSchema.parse(input), null, "ISSUE_DIRECTIVE");
}

/** The receiving office assigns or forwards a directive to an office directly below it. */
export async function forwardDirective(db: DB, actor: Actor, parentId: string, input: Omit<z.input<typeof directiveSchema>, "fromPositionId">) {
  const p = await getDirective(db, actor, parentId);
  if (!["ACKNOWLEDGED", "IN_PROGRESS", "ISSUED"].includes(p.status)) throw conflict("Only an open directive can be assigned onward.");
  if (p.ack_required && p.status === "ISSUED") throw conflict("Acknowledge the directive before assigning it onward.");
  return createDirective(db, actor, directiveSchema.parse({ ...input, fromPositionId: p.recipient_position_id }), parentId, "FORWARD_DIRECTIVE");
}

async function directiveStep(db: DB, actor: Actor, id: string, action: "ACKNOWLEDGE" | "PROGRESS" | "COMPLETE" | "CLOSE" | "CANCEL", opts: { note?: string; reportId?: string } = {}) {
  const d = await getDirective(db, actor, id);
  const asIssuer = action === "CLOSE" || action === "CANCEL";
  const position = asIssuer ? d.issuer_position_id : d.recipient_position_id;
  const auth = await requireAuthority(db, actor, position, asIssuer ? "CLOSE_DIRECTIVE" : action === "ACKNOWLEDGE" ? "ACKNOWLEDGE" : "FORWARD_DIRECTIVE", { type: "command_directive", id });
  const flow: Record<typeof action, [string[], string]> = {
    ACKNOWLEDGE: [["ISSUED"], "ACKNOWLEDGED"], PROGRESS: [["ACKNOWLEDGED", "IN_PROGRESS", ...(d.ack_required ? [] : ["ISSUED"])], "IN_PROGRESS"],
    COMPLETE: [["ACKNOWLEDGED", "IN_PROGRESS", ...(d.ack_required ? [] : ["ISSUED"])], "COMPLETED"], CLOSE: [["COMPLETED"], "CLOSED"], CANCEL: [["ISSUED", "ACKNOWLEDGED", "IN_PROGRESS"], "CANCELLED"],
  };
  const [from, to] = flow[action];
  if (!from.includes(d.status)) throw conflict(`A directive that is ${DIRECTIVE_STATUS[d.status].toLowerCase()} cannot be ${action === "PROGRESS" ? "updated" : action.toLowerCase() + "d"}.`);
  if (action === "PROGRESS" && !opts.note) throw invalid("Record the progress update.");
  if (action === "CANCEL" && (!opts.note || opts.note.trim().length < 5)) throw invalid("Record why the directive is cancelled.");
  screen(opts.note);
  if (action === "COMPLETE") {
    const open = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM command_directives WHERE parent_id = ? AND status NOT IN ('COMPLETED','CLOSED','CANCELLED')", id);
    if (Number(open?.c ?? 0) > 0) throw conflict("Directives assigned onward are still open; their completion must be reported first.");
    if (opts.reportId && !(await one(db, "SELECT id FROM status_reports WHERE id = ? AND directive_id = ? AND status <> 'DRAFT'", opts.reportId, id))) throw invalid("The completion report must be a submitted report on this directive.");
  }
  await tx(db, async (db) => {
    await guarded(db, `UPDATE command_directives SET status = ?, completion_report_id = COALESCE(?, completion_report_id), version = version + 1, updated_at = ? WHERE id = ? AND version = ?`, to, opts.reportId ?? null, nowIso(), id, d.version);
    await devent(db, id, action, { userId: actor.userId, positionId: position, authority: auth.authority }, d.status, to, opts.note?.trim());
    await audit(db, { actorId: actor.userId, action: `command.directive.${action.toLowerCase()}`, category: "BUSINESS", entityType: "command_directive", entityId: id,
      details: { reference: d.reference, previousStatus: d.status, status: to, position, authority: auth.authority, actingAppointment: auth.actingId } });
    const notifyPos = asIssuer ? d.recipient_position_id : d.issuer_position_id;
    for (const u of await holdersOf(db, notifyPos)) {
      if (u !== actor.userId) await notify(db, u, `Directive ${DIRECTIVE_STATUS[to].toLowerCase()}`, `${d.reference}: ${d.subject}`, `/app/command/directives/${id}`, { dedupeKey: `dir:${id}:${to}:${d.version}:${u}` });
    }
    // Completion travels up the chain: the parent directive's receiving office sees that the assigned part is done.
    if (to === "COMPLETED" && d.parent_id) await devent(db, d.parent_id, "PROGRESS", { userId: null, positionId: null, authority: null }, null, (await one<{ status: string }>(db, "SELECT status FROM command_directives WHERE id = ?", d.parent_id))!.status, `${d.reference} (assigned part) completion reported`);
  });
  return getDirective(db, actor, id);
}
export const acknowledgeDirective = (db: DB, a: Actor, id: string) => directiveStep(db, a, id, "ACKNOWLEDGE");
export const progressDirective = (db: DB, a: Actor, id: string, note: string) => directiveStep(db, a, id, "PROGRESS", { note });
export const completeDirective = (db: DB, a: Actor, id: string, note?: string, reportId?: string) => directiveStep(db, a, id, "COMPLETE", { note, reportId });
export const closeDirective = (db: DB, a: Actor, id: string, note?: string) => directiveStep(db, a, id, "CLOSE", { note });
export const cancelDirective = (db: DB, a: Actor, id: string, note: string) => directiveStep(db, a, id, "CANCEL", { note });

/** Offices whose holders may see a directive: its issuing and receiving offices and those of every directive above it. */
async function directiveOffices(db: DB, id: string): Promise<string[]> {
  const out: string[] = [];
  let cur: string | null = id;
  for (let i = 0; cur && i < 20; i++) {
    const r: { issuer_position_id: string; recipient_position_id: string; parent_id: string | null } | undefined = await one(db, "SELECT issuer_position_id, recipient_position_id, parent_id FROM command_directives WHERE id = ?", cur);
    if (!r) break;
    out.push(r.issuer_position_id, r.recipient_position_id);
    cur = r.parent_id;
  }
  return out;
}

export async function getDirective(db: DB, actor: Actor, id: string): Promise<Directive> {
  const d = await one<Directive>(db, `${DSELECT} WHERE d.id = ?`, id);
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  if (!d || !(await directiveOffices(db, id)).some((p) => held.includes(p))) {
    await audit(db, { actorId: actor.userId, action: "command.directive.view", outcome: "DENIED", category: "SECURITY", entityType: "command_directive", entityId: id });
    throw notFound();
  }
  return d;
}

/** The directive, its history, the directives assigned onward below it (with their status) and conflicts involving it. */
export async function directiveDetail(db: DB, actor: Actor, id: string) {
  const d = await getDirective(db, actor, id);
  const events = await all<{ seq: number; action: string; actor_name: string | null; position_title: string | null; authority: string | null; from_status: string | null; to_status: string; note: string | null; at: string }>(db,
    `SELECT e.seq, e.action, u.display_name AS actor_name, p.title AS position_title, e.authority, e.from_status, e.to_status, e.note, e.at FROM directive_events e
      LEFT JOIN users u ON u.id = e.actor_user_id LEFT JOIN command_positions p ON p.id = e.actor_position_id WHERE e.directive_id = ? ORDER BY e.seq`, id);
  const tree: Array<Directive & { depth: number }> = [];
  const walk = async (pid: string, depth: number) => {
    for (const c of await all<Directive>(db, `${DSELECT} WHERE d.parent_id = ? ORDER BY d.created_at`, pid)) { tree.push({ ...c, depth }); await walk(c.id, depth + 1); }
  };
  await walk(id, 1);
  const parent = d.parent_id ? await one<{ id: string; reference: string; subject: string }>(db, "SELECT id, reference, subject FROM command_directives WHERE id = ?", d.parent_id) : null;
  const conflicts = await all<{ id: string; reference: string; status: string }>(db, "SELECT id, reference, status FROM command_conflicts WHERE directive_a_id = ? OR directive_b_id = ?", id, id);
  const reports = await all<{ id: string; reference: string; status: string; progress_status: string; reporting_date: string }>(db, "SELECT id, reference, status, progress_status, reporting_date FROM status_reports WHERE directive_id = ? AND status <> 'DRAFT' ORDER BY created_at", id);
  const consolidated = tree.reduce<Record<string, number>>((m, c) => ({ ...m, [c.status]: (m[c.status] ?? 0) + 1 }), {});
  return { directive: d, events, tree, parent, conflicts, reports, consolidated, held: await officesHeld(db, actor) };
}

/**
 * Accountability record of a directive (institutional directive 28 Nov 2026, §13.4): originating officer (top of the
 * assignment chain), issuing authority (office, substantive or acting with its reference), responsible officer(s) (the
 * current holders of the receiving office), parent unit, acknowledgement, latest progress, completion, escalation
 * history (reminders to the issuer and overdue notices sent by the automation, conflicts referred) and the number of
 * audit events. Same visibility as the directive itself (getDirective); administrative facts only.
 */
export async function directiveAccountability(db: DB, actor: Actor, id: string) {
  const d = await getDirective(db, actor, id);
  let root = { id: d.id, reference: d.reference, issuer: d.issuer_name, office: d.issuer_title };
  for (let cur = d.parent_id, i = 0; cur && i < 50; i++) {
    const p = await one<{ id: string; reference: string; parent_id: string | null; issuer: string; office: string }>(db,
      `SELECT d.id, d.reference, d.parent_id, u.display_name AS issuer, p.title AS office FROM command_directives d JOIN users u ON u.id = d.issuer_user_id
         JOIN command_positions p ON p.id = d.issuer_position_id WHERE d.id = ?`, cur);
    if (!p) break;
    root = { id: p.id, reference: p.reference, issuer: p.issuer, office: p.office };
    cur = p.parent_id;
  }
  const acting = d.authority === "ACTING"
    ? await one<{ authorising_ref: string; valid_to: string }>(db, "SELECT x.authorising_ref, x.valid_to FROM command_directives d JOIN acting_appointments x ON x.id = d.acting_id WHERE d.id = ?", id)
    : null;
  const responsible = await all<{ name: string; authority: string }>(db,
    `SELECT u.display_name AS name, 'SUBSTANTIVE' AS authority FROM position_appointments a JOIN users u ON u.id = a.user_id
      WHERE a.position_id = ? AND a.ended_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?)
     UNION ALL
     SELECT u.display_name, 'ACTING' FROM acting_appointments x JOIN users u ON u.id = x.acting_user_id
      WHERE x.position_id = ? AND x.revoked_at IS NULL AND x.valid_from <= ? AND x.valid_to > ?`, d.recipient_position_id, nowIso(), nowIso(), d.recipient_position_id, nowIso(), nowIso());
  const unit = await one<{ unit: string; parent: string | null }>(db,
    `SELECT o.name AS unit, po.name AS parent FROM command_positions p JOIN org_units o ON o.id = p.org_unit_id
       LEFT JOIN org_relationships r ON r.child_id = o.id AND r.effective_to IS NULL LEFT JOIN org_units po ON po.id = r.parent_id WHERE p.id = ?`, d.recipient_position_id);
  const step = async (action: string) => (await one<{ at: string; by: string | null }>(db,
    "SELECT e.at, u.display_name AS `by` FROM directive_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.directive_id = ? AND e.action = ? ORDER BY e.seq DESC LIMIT 1", id, action)) ?? null;
  const progress = (await one<{ progress_status: string; reporting_date: string }>(db,
    "SELECT progress_status, reporting_date FROM status_reports WHERE directive_id = ? AND status <> 'DRAFT' ORDER BY created_at DESC LIMIT 1", id)) ?? null;
  const notices = await all<{ kind: string; day: string; n: number }>(db,
    `SELECT SUBSTRING_INDEX(dedupe_key, ':', 1) AS kind, SUBSTRING_INDEX(SUBSTRING_INDEX(dedupe_key, ':', 3), ':', -1) AS day, COUNT(*) AS n FROM notifications
      WHERE dedupe_key LIKE ? OR dedupe_key LIKE ? OR dedupe_key LIKE ? GROUP BY kind, day ORDER BY day`, `dir-ack:${id}:%`, `dir-esc:${id}:%`, `dir-due:${id}:%`);
  const conflicts = await all<{ reference: string; status: string; created_at: string }>(db, "SELECT reference, status, created_at FROM command_conflicts WHERE directive_a_id = ? OR directive_b_id = ? ORDER BY created_at", id, id);
  const ESC: Record<string, string> = { "dir-ack": "Acknowledgement reminder to the receiving office", "dir-esc": "Escalated to the issuing office: not acknowledged", "dir-due": "Overdue notice to the receiving office" };
  const escalations = [
    ...notices.map((x) => ({ at: x.day, what: ESC[x.kind] ?? x.kind, count: Number(x.n) })),
    ...conflicts.map((c) => ({ at: c.created_at.slice(0, 10), what: `Conflict ${c.reference} referred to the common superior (${c.status.toLowerCase()})`, count: 1 })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const auditEvents = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE entity_type = 'command_directive' AND entity_id = ?", id))?.c ?? 0);
  return {
    originating: root, issuing: { office: d.issuer_title, by: d.issuer_name, authority: d.authority, actingRef: acting?.authorising_ref ?? null, actingUntil: acting?.valid_to ?? null },
    responsibleOffice: d.recipient_title, responsible, unit: unit?.unit ?? d.recipient_unit, parentUnit: unit?.parent ?? null,
    issuedAt: d.created_at, acknowledged: await step("ACKNOWLEDGE"), completed: await step("COMPLETE"), closed: await step("CLOSE"),
    progress, escalations, auditEvents, auditLink: hasPermission(actor, "audit.view") ? `/app/audit?q=${encodeURIComponent(id)}` : null,
  };
}

export type DirectiveBox = "received" | "issued" | "all";
export async function listDirectives(db: DB, actor: Actor, f: { box?: DirectiveBox; status?: string; q?: string } = {}) {
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  if (!held.length) return [];
  const list = held.map(() => "?").join(",");
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.box === "received") { where.push(`d.recipient_position_id IN (${list})`); params.push(...held); }
  else if (f.box === "issued") { where.push(`d.issuer_position_id IN (${list})`); params.push(...held); }
  else { where.push(`(d.recipient_position_id IN (${list}) OR d.issuer_position_id IN (${list}))`); params.push(...held, ...held); }
  if (f.status && f.status in DIRECTIVE_STATUS) { where.push("d.status = ?"); params.push(f.status); }
  if (f.q) { where.push("(d.reference LIKE ? OR d.subject LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`); }
  return all<Directive>(db, `${DSELECT} WHERE ${where.join(" AND ")} ORDER BY d.updated_at DESC LIMIT 300`, ...params);
}

/** Offices directly below the actor's offices that the actor may instruct, with the categories allowed. */
export async function instructableOffices(db: DB, actor: Actor) {
  const held = await officesHeld(db, actor);
  const out: Array<{ fromPositionId: string; fromTitle: string; toPositionId: string; toTitle: string; toUnit: string; type: RelationshipType; categories: DirectiveCategory[] }> = [];
  for (const h of held.filter((x) => x.actions.includes("ISSUE_DIRECTIVE") || x.actions.includes("FORWARD_DIRECTIVE"))) {
    const rows = await all<{ id: string; title: string; unit: string; type: RelationshipType }>(db,
      `SELECT p.id, p.title, o.name AS unit, r.relationship_type AS type FROM reporting_relationships r JOIN command_positions p ON p.id = r.subordinate_position_id JOIN org_units o ON o.id = p.org_unit_id
        WHERE r.superior_position_id = ? AND r.relationship_type IN ('PRIMARY_COMMAND','ADMIN_COORDINATION') AND r.ended_at IS NULL AND r.valid_from <= ? AND (r.valid_to IS NULL OR r.valid_to > ?) AND p.status = 'ACTIVE' ORDER BY p.title`,
      h.positionId, nowIso(), nowIso());
    for (const r of rows) out.push({ fromPositionId: h.positionId, fromTitle: `${h.title}${h.authority === "ACTING" ? " (acting)" : ""}`, toPositionId: r.id, toTitle: r.title, toUnit: r.unit, type: r.type, categories: r.type === "PRIMARY_COMMAND" ? (Object.keys(DIRECTIVE_CATEGORY) as DirectiveCategory[]) : COORDINATION_CATEGORIES });
  }
  return out;
}

// ── Reports ────────────────────────────────────────────────────────────────────────────────────────────
export interface Report {
  id: string; reference: string; category: ReportCategory; reporter_user_id: string; reporter_name: string; reporter_position_id: string; reporter_title: string;
  origin_unit_id: string; origin_name: string; directive_id: string | null; reporting_date: string; period_from: string | null; period_to: string | null;
  summary: string; progress_status: keyof typeof PROGRESS; outstanding: string | null; supporting_refs: string | null; status: string; submissions: number; version: number; created_at: string; updated_at: string;
}
const RSELECT = `SELECT r.*, u.display_name AS reporter_name, p.title AS reporter_title, o.name AS origin_name FROM status_reports r JOIN users u ON u.id = r.reporter_user_id
  JOIN command_positions p ON p.id = r.reporter_position_id JOIN org_units o ON o.id = r.origin_unit_id`;
export const reportSchema = z.object({
  positionId: z.string().min(1, "Select the reporting office."), category: z.enum(["STATUS", "PROGRESS", "COMPLETION", "AREA_STATUS", "ESCALATION", "RECOMMENDATION"]),
  directiveId: z.string().optional().transform((v) => v || undefined), reportingDate: dateField.optional(),
  periodFrom: dateField.optional().or(z.literal("").transform(() => undefined)), periodTo: dateField.optional().or(z.literal("").transform(() => undefined)),
  summary: z.string().trim().min(10, "Enter the administrative summary.").max(2000), progressStatus: z.enum(["ON_TRACK", "DELAYED", "COMPLETED", "BLOCKED"]),
  outstanding: z.string().trim().max(1000).optional().transform((v) => v || undefined),
  supportingRefs: z.string().trim().max(200).optional().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[A-Za-z0-9/.\-, ]+$/.test(v), { message: "Supporting references: reference numbers only, separated by commas." }),
});

async function revent(db: DB, reportId: string, action: string, actor: { userId: string | null; positionId: string | null; authority: string | null }, recipientId?: string | null, note?: string | null) {
  const seq = Number((await one<{ n: number }>(db, "SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM report_events WHERE report_id = ?", reportId))?.n ?? 1);
  await run(db, "INSERT INTO report_events (id, report_id, recipient_id, seq, action, actor_user_id, actor_position_id, authority, note, at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    newId("rev"), reportId, recipientId ?? null, seq, action, actor.userId, actor.positionId, actor.authority, note ?? null, nowIso());
}

/** The designated recipients of a report from an office: primary (reporting or command superior) and parallel. */
export async function designatedRecipients(db: DB, positionId: string) {
  const rels = await activeRelationships(db, "subordinate_position_id = ?", positionId);
  const primaryReporting = rels.filter((r) => r.relationship_type === "PRIMARY_REPORTING");
  const primary = primaryReporting.length ? primaryReporting : rels.filter((r) => r.relationship_type === "PRIMARY_COMMAND");
  const parallel = rels.filter((r) => (r.relationship_type === "PARALLEL_REPORTING" || r.relationship_type === "ADMIN_COORDINATION") && !primary.some((p) => p.superior_position_id === r.superior_position_id));
  const seen = new Set<string>();
  const dedupe = (list: Rel[]) => list.filter((r) => (seen.has(r.superior_position_id) ? false : (seen.add(r.superior_position_id), true)));
  return { primary: dedupe(primary), parallel: dedupe(parallel) };
}

export async function createReport(db: DB, actor: Actor, input: z.input<typeof reportSchema>): Promise<Report> {
  const d = reportSchema.parse(input);
  const auth = await requireAuthority(db, actor, d.positionId, "SUBMIT_REPORT", { type: "status_report" });
  screen(d.summary, d.outstanding, d.supportingRefs);
  if (d.directiveId) {
    const dir = await one<{ recipient_position_id: string }>(db, "SELECT recipient_position_id FROM command_directives WHERE id = ?", d.directiveId);
    if (!dir || dir.recipient_position_id !== d.positionId) throw invalid("A report on a directive comes from the office that received it.");
  }
  const reportingDate = d.reportingDate ?? today();
  if (reportingDate > today()) throw invalid("The reporting date cannot be in the future.");
  if (d.periodFrom && d.periodTo && d.periodTo < d.periodFrom) throw invalid("The reporting period ends before it starts.");
  const pos = (await one<{ org_unit_id: string }>(db, "SELECT org_unit_id FROM command_positions WHERE id = ?", d.positionId))!;
  const id = newId("rpt");
  const t = nowIso();
  await tx(db, async (db) => {
    const reference = await nextReference(db, "RPT", "status_reports");
    await run(db, `INSERT INTO status_reports (id, reference, category, reporter_user_id, reporter_position_id, origin_unit_id, directive_id, reporting_date, period_from, period_to, summary, progress_status, outstanding, supporting_refs, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, reference, d.category, actor.userId, d.positionId, pos.org_unit_id, d.directiveId ?? null, reportingDate, d.periodFrom ?? null, d.periodTo ?? null,
      d.summary, d.progressStatus, d.outstanding ?? null, d.supportingRefs ?? null, t, t);
    await revent(db, id, "CREATE", { userId: actor.userId, positionId: d.positionId, authority: auth.authority });
    await audit(db, { actorId: actor.userId, action: "command.report.create", category: "BUSINESS", entityType: "status_report", entityId: id, orgUnitId: pos.org_unit_id, details: { reference, category: d.category, position: d.positionId } });
  });
  return (await one<Report>(db, `${RSELECT} WHERE r.id = ?`, id))!;
}

/** Submits (or resubmits after return) to the designated recipients: one report, one recipient record per office. */
export async function submitReport(db: DB, actor: Actor, id: string, changes?: Partial<Pick<z.input<typeof reportSchema>, "summary" | "outstanding" | "progressStatus">>) {
  const r = await getReport(db, actor, id);
  const auth = await requireAuthority(db, actor, r.reporter_position_id, "SUBMIT_REPORT", { type: "status_report", id });
  if (r.status !== "DRAFT" && r.status !== "RETURNED") throw conflict("Only a draft or a returned report can be submitted.");
  const resubmit = r.status === "RETURNED";
  const { primary, parallel } = await designatedRecipients(db, r.reporter_position_id);
  if (!primary.length) throw invalid("This office has no designated superior to report to. Ask for the reporting relationship to be configured.");
  if (changes?.summary !== undefined || changes?.outstanding !== undefined) screen(changes.summary, changes.outstanding);
  if (changes?.summary !== undefined && changes.summary.trim().length < 10) throw invalid("Enter the administrative summary.");
  const t = nowIso();
  await tx(db, async (db) => {
    await guarded(db, `UPDATE status_reports SET status = 'SUBMITTED', submissions = submissions + 1, summary = COALESCE(?, summary), outstanding = COALESCE(?, outstanding), progress_status = COALESCE(?, progress_status),
                         version = version + 1, updated_at = ? WHERE id = ? AND version = ?`, changes?.summary?.trim() ?? null, changes?.outstanding?.trim() ?? null, changes?.progressStatus ?? null, t, id, r.version);
    if (resubmit) {
      // The corrected report goes back to the same offices; each acknowledges and reviews it afresh.
      await run(db, "UPDATE report_recipients SET status = 'PENDING', acknowledged_at = NULL, acknowledged_by = NULL, reviewed_at = NULL, reviewed_by = NULL, review_outcome = NULL, review_note = NULL WHERE report_id = ? AND recipient_kind <> 'FORWARDED'", id);
      await run(db, "DELETE FROM report_recipients WHERE report_id = ? AND recipient_kind = 'FORWARDED' AND id NOT IN (SELECT recipient_id FROM report_events WHERE report_id = ? AND recipient_id IS NOT NULL)", id, id);
    } else {
      for (const [list, kind] of [[primary, "PRIMARY"], [parallel, "PARALLEL"]] as const) for (const rel of list) {
        await run(db, "INSERT INTO report_recipients (id, report_id, position_id, relationship_id, recipient_kind, created_at) VALUES (?,?,?,?,?,?)", newId("rcp"), id, rel.superior_position_id, rel.id, kind, t);
      }
    }
    await revent(db, id, resubmit ? "RESUBMIT" : "SUBMIT", { userId: actor.userId, positionId: r.reporter_position_id, authority: auth.authority });
    await audit(db, { actorId: actor.userId, action: resubmit ? "command.report.resubmit" : "command.report.submit", category: "BUSINESS", entityType: "status_report", entityId: id, orgUnitId: r.origin_unit_id,
      details: { reference: r.reference, primary: primary.map((x) => x.superior_position_id), parallel: parallel.map((x) => x.superior_position_id), previousStatus: r.status } });
    for (const rel of [...primary, ...parallel]) for (const u of await holdersOf(db, rel.superior_position_id, "ACKNOWLEDGE")) {
      if (u !== actor.userId) await notify(db, u, resubmit ? "Report resubmitted" : "Report received", `${r.reference} from ${r.reporter_title}`, `/app/command/reports/${id}`, { dedupeKey: `rpt:${id}:${r.version}:${u}` });
    }
  });
  return getReport(db, actor, id);
}

async function recipientFor(db: DB, actor: Actor, recipientId: string, action: CommandAction) {
  const rc = await one<{ id: string; report_id: string; position_id: string; recipient_kind: string; status: string; title: string }>(db,
    "SELECT rc.id, rc.report_id, rc.position_id, rc.recipient_kind, rc.status, p.title FROM report_recipients rc JOIN command_positions p ON p.id = rc.position_id WHERE rc.id = ?", recipientId);
  if (!rc) throw notFound();
  const r = await getReport(db, actor, rc.report_id);
  const auth = await requireAuthority(db, actor, rc.position_id, action, { type: "status_report", id: rc.report_id });
  return { rc, r, auth };
}

export async function acknowledgeReport(db: DB, actor: Actor, recipientId: string) {
  const { rc, r, auth } = await recipientFor(db, actor, recipientId, "ACKNOWLEDGE");
  if (r.status !== "SUBMITTED") throw conflict("Only a submitted report can be acknowledged.");
  if (rc.status !== "PENDING") throw conflict("This office has already acknowledged the report.");
  await tx(db, async (db) => {
    await guarded(db, "UPDATE report_recipients SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by = ? WHERE id = ? AND status = 'PENDING'", nowIso(), actor.userId, rc.id);
    await revent(db, r.id, "ACKNOWLEDGE", { userId: actor.userId, positionId: rc.position_id, authority: auth.authority }, rc.id);
    await audit(db, { actorId: actor.userId, action: "command.report.acknowledge", category: "BUSINESS", entityType: "status_report", entityId: r.id, details: { reference: r.reference, recipient: rc.position_id, kind: rc.recipient_kind, authority: auth.authority } });
  });
  return getReport(db, actor, r.id);
}

/** Review by a recipient office. Returning is for primary or forwarded recipients; a parallel recipient notes or recommends. */
export async function reviewReport(db: DB, actor: Actor, recipientId: string, outcome: "NOTED" | "RECOMMENDED" | "RETURNED", note?: string) {
  const { rc, r, auth } = await recipientFor(db, actor, recipientId, "REVIEW_REPORT");
  if (r.status !== "SUBMITTED") throw conflict("Only a submitted report can be reviewed.");
  if (rc.status !== "ACKNOWLEDGED") throw conflict(rc.status === "PENDING" ? "Acknowledge receipt before reviewing." : "This office has already reviewed the report.");
  if (outcome === "RETURNED" && rc.recipient_kind === "PARALLEL") throw forbidden("A parallel recipient records its own review; only the designated superior returns a report for correction.");
  if (outcome === "RETURNED" && (!note || note.trim().length < 5)) throw invalid("Say what must be corrected.");
  screen(note);
  await tx(db, async (db) => {
    await guarded(db, "UPDATE report_recipients SET status = ?, reviewed_at = ?, reviewed_by = ?, review_outcome = ?, review_note = ? WHERE id = ? AND status = 'ACKNOWLEDGED'",
      outcome === "RETURNED" ? "RETURNED" : "REVIEWED", nowIso(), actor.userId, outcome, note?.trim() ?? null, rc.id);
    if (outcome === "RETURNED") await guarded(db, "UPDATE status_reports SET status = 'RETURNED', version = version + 1, updated_at = ? WHERE id = ? AND version = ?", nowIso(), r.id, r.version);
    await revent(db, r.id, outcome === "RETURNED" ? "RETURN" : "REVIEW", { userId: actor.userId, positionId: rc.position_id, authority: auth.authority }, rc.id, `${outcome}${note ? `: ${note.trim()}` : ""}`);
    await audit(db, { actorId: actor.userId, action: outcome === "RETURNED" ? "command.report.return" : "command.report.review", category: "BUSINESS", entityType: "status_report", entityId: r.id,
      details: { reference: r.reference, recipient: rc.position_id, outcome, authority: auth.authority } });
    if (outcome === "RETURNED") for (const u of await holdersOf(db, r.reporter_position_id)) await notify(db, u, "Report returned for correction", `${r.reference}: ${note?.trim()}`, `/app/command/reports/${r.id}`, { dedupeKey: `rpt-ret:${r.id}:${r.version}:${u}` });
  });
  return getReport(db, actor, r.id);
}

/** A reviewed primary or forwarded recipient forwards the report to its own designated superior(s): the same report travels up. */
export async function forwardReport(db: DB, actor: Actor, recipientId: string, note?: string) {
  const { rc, r, auth } = await recipientFor(db, actor, recipientId, "REVIEW_REPORT");
  if (r.status !== "SUBMITTED") throw conflict("Only a submitted report can be forwarded.");
  if (rc.recipient_kind === "PARALLEL") throw forbidden("A parallel recipient does not forward the report along the other channel.");
  if (rc.status !== "REVIEWED") throw conflict("Review the report before forwarding it.");
  screen(note);
  const { primary } = await designatedRecipients(db, rc.position_id);
  if (!primary.length) throw invalid("This office has no superior to forward to.");
  const t = nowIso();
  await tx(db, async (db) => {
    await guarded(db, "UPDATE report_recipients SET status = 'FORWARDED' WHERE id = ? AND status = 'REVIEWED'", rc.id);
    for (const rel of primary) {
      if (await one(db, "SELECT id FROM report_recipients WHERE report_id = ? AND position_id = ?", r.id, rel.superior_position_id)) continue;
      await run(db, "INSERT INTO report_recipients (id, report_id, position_id, relationship_id, recipient_kind, forwarded_from_id, created_at) VALUES (?,?,?,?, 'FORWARDED', ?, ?)", newId("rcp"), r.id, rel.superior_position_id, rel.id, rc.id, t);
      for (const u of await holdersOf(db, rel.superior_position_id, "ACKNOWLEDGE")) if (u !== actor.userId) await notify(db, u, "Report forwarded to you", `${r.reference} via ${rc.title}`, `/app/command/reports/${r.id}`, { dedupeKey: `rpt-fwd:${r.id}:${rel.superior_position_id}:${u}` });
    }
    await revent(db, r.id, "FORWARD", { userId: actor.userId, positionId: rc.position_id, authority: auth.authority }, rc.id, note?.trim() ?? null);
    await audit(db, { actorId: actor.userId, action: "command.report.forward", category: "BUSINESS", entityType: "status_report", entityId: r.id, details: { reference: r.reference, from: rc.position_id, to: primary.map((p) => p.superior_position_id), authority: auth.authority } });
  });
  return getReport(db, actor, r.id);
}

/** Closure by a primary or forwarded recipient that has reviewed the report (no further action needed). */
export async function closeReport(db: DB, actor: Actor, recipientId: string, note?: string) {
  const { rc, r, auth } = await recipientFor(db, actor, recipientId, "REVIEW_REPORT");
  if (r.status !== "SUBMITTED") throw conflict("Only a submitted report can be closed.");
  if (rc.recipient_kind === "PARALLEL") throw forbidden("Only the designated reporting chain closes a report.");
  if (rc.status !== "REVIEWED") throw conflict("Review the report before closing it.");
  screen(note);
  await tx(db, async (db) => {
    await guarded(db, "UPDATE status_reports SET status = 'CLOSED', version = version + 1, updated_at = ? WHERE id = ? AND version = ?", nowIso(), r.id, r.version);
    await run(db, "UPDATE report_recipients SET status = 'CLOSED' WHERE report_id = ? AND status IN ('REVIEWED')", r.id);
    await revent(db, r.id, "CLOSE", { userId: actor.userId, positionId: rc.position_id, authority: auth.authority }, rc.id, note?.trim() ?? null);
    await audit(db, { actorId: actor.userId, action: "command.report.close", category: "BUSINESS", entityType: "status_report", entityId: r.id, details: { reference: r.reference, by: rc.position_id, authority: auth.authority } });
    for (const u of await holdersOf(db, r.reporter_position_id)) if (u !== actor.userId) await notify(db, u, "Report closed", r.reference, `/app/command/reports/${r.id}`, { dedupeKey: `rpt-close:${r.id}:${u}` });
  });
  return getReport(db, actor, r.id);
}

export async function getReport(db: DB, actor: Actor, id: string): Promise<Report> {
  const r = await one<Report>(db, `${RSELECT} WHERE r.id = ?`, id);
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  const recipients = r ? (await all<{ position_id: string }>(db, "SELECT position_id FROM report_recipients WHERE report_id = ?", id)).map((x) => x.position_id) : [];
  if (!r || !(held.includes(r.reporter_position_id) || recipients.some((p) => held.includes(p)))) {
    await audit(db, { actorId: actor.userId, action: "command.report.view", outcome: "DENIED", category: "SECURITY", entityType: "status_report", entityId: id });
    throw notFound();
  }
  return r;
}

export async function reportDetail(db: DB, actor: Actor, id: string) {
  const report = await getReport(db, actor, id);
  const recipients = await all<{ id: string; position_id: string; title: string; unit: string; recipient_kind: string; status: string; channel: string | null; relationship_type: string | null;
    acknowledged_at: string | null; ack_name: string | null; reviewed_at: string | null; review_name: string | null; review_outcome: string | null; review_note: string | null; forwarded_from_id: string | null }>(db,
    `SELECT rc.id, rc.position_id, p.title, o.name AS unit, rc.recipient_kind, rc.status, rl.channel, rl.relationship_type, rc.acknowledged_at, ua.display_name AS ack_name, rc.reviewed_at, ur.display_name AS review_name,
            rc.review_outcome, rc.review_note, rc.forwarded_from_id
       FROM report_recipients rc JOIN command_positions p ON p.id = rc.position_id JOIN org_units o ON o.id = p.org_unit_id LEFT JOIN reporting_relationships rl ON rl.id = rc.relationship_id
       LEFT JOIN users ua ON ua.id = rc.acknowledged_by LEFT JOIN users ur ON ur.id = rc.reviewed_by WHERE rc.report_id = ? ORDER BY rc.created_at, p.title`, id);
  const events = await all<{ seq: number; action: string; actor_name: string | null; position_title: string | null; authority: string | null; note: string | null; at: string }>(db,
    `SELECT e.seq, e.action, u.display_name AS actor_name, p.title AS position_title, e.authority, e.note, e.at FROM report_events e LEFT JOIN users u ON u.id = e.actor_user_id
      LEFT JOIN command_positions p ON p.id = e.actor_position_id WHERE e.report_id = ? ORDER BY e.seq`, id);
  const directive = report.directive_id ? await one<{ id: string; reference: string; subject: string }>(db, "SELECT id, reference, subject FROM command_directives WHERE id = ?", report.directive_id) : null;
  return { report, recipients, events, directive, held: await officesHeld(db, actor) };
}

export type ReportBox = "inbox" | "submitted" | "all";
export async function listReports(db: DB, actor: Actor, f: { box?: ReportBox; status?: string; q?: string } = {}) {
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  if (!held.length) return [];
  const list = held.map(() => "?").join(",");
  const inbox = `EXISTS (SELECT 1 FROM report_recipients rc WHERE rc.report_id = r.id AND rc.position_id IN (${list}))`;
  const mine = `r.reporter_position_id IN (${list})`;
  const where = [f.box === "inbox" ? `${inbox} AND r.status <> 'DRAFT'` : f.box === "submitted" ? mine : `((${inbox} AND r.status <> 'DRAFT') OR ${mine})`];
  const params: unknown[] = f.box === "inbox" ? [...held] : f.box === "submitted" ? [...held] : [...held, ...held];
  if (f.status && f.status in REPORT_STATUS) { where.push("r.status = ?"); params.push(f.status); }
  if (f.q) { where.push("(r.reference LIKE ? OR r.summary LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`); }
  const rows = await all<Report & { my_status: string | null }>(db, `SELECT r.*, u.display_name AS reporter_name, p.title AS reporter_title, o.name AS origin_name,
      (SELECT GROUP_CONCAT(rc.status) FROM report_recipients rc WHERE rc.report_id = r.id AND rc.position_id IN (${list})) AS my_status
    FROM status_reports r JOIN users u ON u.id = r.reporter_user_id JOIN command_positions p ON p.id = r.reporter_position_id JOIN org_units o ON o.id = r.origin_unit_id
    WHERE ${where.join(" AND ")} ORDER BY r.updated_at DESC LIMIT 300`, ...held, ...params);
  return rows;
}

// ── Conflicts ──────────────────────────────────────────────────────────────────────────────────────────
/** Nearest office that is (or is above) both issuing offices in the command chain. */
export async function commonSuperior(db: DB, a: string, b: string): Promise<string | null> {
  const ca = [a, ...(await commandChain(db, a))];
  const cb = new Set([b, ...(await commandChain(db, b))]);
  return ca.find((p) => cb.has(p)) ?? null;
}

async function openConflict(db: DB, recipient: string, aId: string, bId: string, source: "RECIPIENT" | "AUTOMATIC", reason: string, flaggedBy: string | null) {
  const a = (await one<{ issuer_position_id: string; reference: string }>(db, "SELECT issuer_position_id, reference FROM command_directives WHERE id = ?", aId))!;
  const b = (await one<{ issuer_position_id: string; reference: string }>(db, "SELECT issuer_position_id, reference FROM command_directives WHERE id = ?", bId))!;
  if (await one(db, "SELECT id FROM command_conflicts WHERE status = 'OPEN' AND ((directive_a_id = ? AND directive_b_id = ?) OR (directive_a_id = ? AND directive_b_id = ?))", aId, bId, bId, aId)) throw conflict("These directives are already referred as a conflict.");
  const superior = await commonSuperior(db, a.issuer_position_id, b.issuer_position_id);
  const id = newId("cnf");
  let reference = "";
  await tx(db, async (db) => {
    reference = await nextReference(db, "CNF", "command_conflicts");
    await run(db, `INSERT INTO command_conflicts (id, reference, recipient_position_id, directive_a_id, directive_b_id, common_superior_position_id, source, reason, flagged_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, reference, recipient, aId, bId, superior, source, reason, flaggedBy, nowIso());
    for (const did of [aId, bId]) await devent(db, did, "CONFLICT", { userId: flaggedBy, positionId: source === "RECIPIENT" ? recipient : null, authority: null }, null, (await one<{ status: string }>(db, "SELECT status FROM command_directives WHERE id = ?", did))!.status, `Referred as ${reference} to the common superior office`);
    await audit(db, { actorId: flaggedBy, action: "command.conflict.flag", category: "BUSINESS", entityType: "command_conflict", entityId: id, details: { reference, recipient, a: a.reference, b: b.reference, commonSuperior: superior, source } });
    if (superior) for (const u of await holdersOf(db, superior, "RESOLVE_CONFLICT")) await notify(db, u, "Command conflict referred to you", `${reference}: ${a.reference} and ${b.reference}`, `/app/command/conflicts/${id}`, { dedupeKey: `cnf:${id}:${u}` });
  });
  return id;
}

/** The receiving office flags two open directives from different issuing offices as conflicting. */
export async function flagConflict(db: DB, actor: Actor, input: { directiveAId: string; directiveBId: string; reason: string }) {
  if (input.directiveAId === input.directiveBId) throw invalid("Select two different directives.");
  const a = await getDirective(db, actor, input.directiveAId);
  const b = await getDirective(db, actor, input.directiveBId);
  if (a.recipient_position_id !== b.recipient_position_id) throw invalid("Both directives must be addressed to the same office.");
  await requireAuthority(db, actor, a.recipient_position_id, "ACKNOWLEDGE", { type: "command_conflict" });
  if (a.issuer_position_id === b.issuer_position_id) throw invalid("Both directives come from the same office; ask that office to clarify instead.");
  for (const d of [a, b]) if (["CLOSED", "CANCELLED", "COMPLETED"].includes(d.status)) throw conflict(`${d.reference} is no longer open.`);
  if (input.reason.trim().length < 10) throw invalid("Describe the conflict.");
  screen(input.reason);
  return openConflict(db, a.recipient_position_id, a.id, b.id, "RECIPIENT", input.reason.trim(), actor.userId);
}

/** Automatic flag: an office receives open directives about the same related record from different issuing offices. */
async function detectConflicts(db: DB, directiveId: string) {
  const d = (await one<{ recipient_position_id: string; issuer_position_id: string; related_type: string | null; related_reference: string | null }>(db, "SELECT recipient_position_id, issuer_position_id, related_type, related_reference FROM command_directives WHERE id = ?", directiveId))!;
  if (!d.related_reference) return;
  const others = await all<{ id: string }>(db, `SELECT id FROM command_directives WHERE id <> ? AND recipient_position_id = ? AND issuer_position_id <> ? AND related_type = ? AND related_reference = ?
     AND status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS')`, directiveId, d.recipient_position_id, d.issuer_position_id, d.related_type, d.related_reference);
  for (const o of others) {
    if (await one(db, "SELECT id FROM command_conflicts WHERE (directive_a_id = ? AND directive_b_id = ?) OR (directive_a_id = ? AND directive_b_id = ?)", o.id, directiveId, directiveId, o.id)) continue;
    await openConflict(db, d.recipient_position_id, o.id, directiveId, "AUTOMATIC", `Open directives about the same record (${d.related_reference}) arrived from different issuing offices.`, null);
  }
}

export async function resolveConflict(db: DB, actor: Actor, id: string, decision: "A_PRECEDES" | "B_PRECEDES" | "BOTH_STAND" | "WITHDRAW_A" | "WITHDRAW_B", note: string) {
  const c = await getConflict(db, actor, id);
  if (c.status !== "OPEN") throw conflict("This conflict has already been decided.");
  if (!c.common_superior_position_id) throw invalid("No common superior office is configured; the structure must be corrected first.");
  const auth = await requireAuthority(db, actor, c.common_superior_position_id, "RESOLVE_CONFLICT", { type: "command_conflict", id });
  if (note.trim().length < 10) throw invalid("Record the reasons for the decision.");
  screen(note);
  await tx(db, async (db) => {
    await guarded(db, "UPDATE command_conflicts SET status = 'RESOLVED', decision = ?, decision_note = ?, decided_by = ?, decided_position_id = ?, decided_authority = ?, decided_at = ? WHERE id = ? AND status = 'OPEN'",
      decision, note.trim(), actor.userId, c.common_superior_position_id, auth.authority, nowIso(), id);
    const withdraw = decision === "WITHDRAW_A" ? c.directive_a_id : decision === "WITHDRAW_B" ? c.directive_b_id : null;
    if (withdraw) {
      const w = (await one<{ status: string; version: number }>(db, "SELECT status, version FROM command_directives WHERE id = ?", withdraw))!;
      if (!["CLOSED", "CANCELLED", "COMPLETED"].includes(w.status)) {
        await guarded(db, "UPDATE command_directives SET status = 'CANCELLED', version = version + 1, updated_at = ? WHERE id = ? AND version = ?", nowIso(), withdraw, w.version);
        await devent(db, withdraw, "CANCEL", { userId: actor.userId, positionId: c.common_superior_position_id, authority: auth.authority }, w.status, "CANCELLED", `Withdrawn by decision on ${c.reference}`);
      }
    }
    await audit(db, { actorId: actor.userId, action: "command.conflict.resolve", category: "BUSINESS", entityType: "command_conflict", entityId: id, details: { reference: c.reference, decision, by: c.common_superior_position_id, authority: auth.authority } });
    for (const p of [c.recipient_position_id, c.issuer_a, c.issuer_b]) for (const u of await holdersOf(db, p)) if (u !== actor.userId) await notify(db, u, "Command conflict decided", `${c.reference}: ${decision.replace(/_/g, " ").toLowerCase()}`, `/app/command/conflicts/${id}`, { dedupeKey: `cnf-dec:${id}:${u}` });
  });
  return getConflict(db, actor, id);
}

export interface Conflict { id: string; reference: string; recipient_position_id: string; recipient_title: string; directive_a_id: string; a_reference: string; a_subject: string; issuer_a: string; issuer_a_title: string;
  directive_b_id: string; b_reference: string; b_subject: string; issuer_b: string; issuer_b_title: string; common_superior_position_id: string | null; superior_title: string | null; source: string; reason: string; status: string;
  decision: string | null; decision_note: string | null; decided_name: string | null; decided_authority: string | null; decided_at: string | null; created_at: string }
const CSELECT = `SELECT c.*, pr.title AS recipient_title, da.reference AS a_reference, da.subject AS a_subject, da.issuer_position_id AS issuer_a, pa.title AS issuer_a_title,
  db2.reference AS b_reference, db2.subject AS b_subject, db2.issuer_position_id AS issuer_b, pb.title AS issuer_b_title, ps.title AS superior_title, ud.display_name AS decided_name
  FROM command_conflicts c JOIN command_positions pr ON pr.id = c.recipient_position_id JOIN command_directives da ON da.id = c.directive_a_id JOIN command_positions pa ON pa.id = da.issuer_position_id
  JOIN command_directives db2 ON db2.id = c.directive_b_id JOIN command_positions pb ON pb.id = db2.issuer_position_id LEFT JOIN command_positions ps ON ps.id = c.common_superior_position_id LEFT JOIN users ud ON ud.id = c.decided_by`;
export async function getConflict(db: DB, actor: Actor, id: string): Promise<Conflict> {
  const c = await one<Conflict>(db, `${CSELECT} WHERE c.id = ?`, id);
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  if (!c || ![c.recipient_position_id, c.issuer_a, c.issuer_b, c.common_superior_position_id].some((p) => p && held.includes(p))) {
    await audit(db, { actorId: actor.userId, action: "command.conflict.view", outcome: "DENIED", category: "SECURITY", entityType: "command_conflict", entityId: id });
    throw notFound();
  }
  return c;
}
export async function listConflicts(db: DB, actor: Actor) {
  const held = (await officesHeld(db, actor)).map((h) => h.positionId);
  if (!held.length) return [];
  const l = held.map(() => "?").join(",");
  return all<Conflict>(db, `${CSELECT} WHERE c.recipient_position_id IN (${l}) OR da.issuer_position_id IN (${l}) OR db2.issuer_position_id IN (${l}) OR c.common_superior_position_id IN (${l}) ORDER BY c.status, c.created_at DESC LIMIT 200`, ...held, ...held, ...held, ...held);
}

// ── Structure (read) and overview ──────────────────────────────────────────────────────────────────────
export async function structure(db: DB, actor: Actor) {
  await requirePermission(db, actor, "command.structure.view", undefined, { type: "command_position" });
  const s = (await import("./policy")).scopeFor(actor, "command.structure.view");
  const t = nowIso();
  const positions = await all<{ id: string; code: string; title: string; position_type: string; org_unit_id: string; unit: string; mapped_role_code: string | null; mapping_validated: number; holder: string | null; holder_id: string | null }>(db,
    `SELECT p.id, p.code, p.title, p.position_type, p.org_unit_id, o.name AS unit, p.mapped_role_code, p.mapping_validated, u.display_name AS holder, u.id AS holder_id FROM command_positions p JOIN org_units o ON o.id = p.org_unit_id
       LEFT JOIN position_appointments a ON a.position_id = p.id AND a.ended_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?) LEFT JOIN users u ON u.id = a.user_id
      WHERE p.status = 'ACTIVE' ${s.national ? "" : s.units.length ? `AND p.org_unit_id IN (${s.units.map(() => "?").join(",")})` : "AND 1=0"} ORDER BY p.title`, t, t, ...(s.national ? [] : s.units));
  const ids = new Set(positions.map((p) => p.id));
  const rels = (await all<Rel & { authorising_ref: string; valid_from: string }>(db, `SELECT id, subordinate_position_id, superior_position_id, relationship_type, channel, authorising_ref, valid_from FROM reporting_relationships
     WHERE ended_at IS NULL AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)`, t, t)).filter((r) => ids.has(r.subordinate_position_id) || ids.has(r.superior_position_id));
  return { positions, relationships: rels, canManage: hasPermission(actor, "command.structure.manage") };
}

/** Dashboard figures for the actor's offices. */
export async function commandOverview(db: DB, actor: Actor) {
  const held = await officesHeld(db, actor);
  if (!held.length) return null;
  const ids = held.map((h) => h.positionId);
  const l = ids.map(() => "?").join(",");
  const n = async (sql: string, ...p: unknown[]) => Number((await one<{ c: number }>(db, sql, ...p))?.c ?? 0);
  return {
    held,
    toAcknowledge: await n(`SELECT COUNT(*) AS c FROM command_directives WHERE recipient_position_id IN (${l}) AND status = 'ISSUED'`, ...ids),
    openReceived: await n(`SELECT COUNT(*) AS c FROM command_directives WHERE recipient_position_id IN (${l}) AND status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS')`, ...ids),
    openIssued: await n(`SELECT COUNT(*) AS c FROM command_directives WHERE issuer_position_id IN (${l}) AND status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS','COMPLETED')`, ...ids),
    reportsToAct: await n(`SELECT COUNT(*) AS c FROM report_recipients rc JOIN status_reports r ON r.id = rc.report_id WHERE rc.position_id IN (${l}) AND rc.status IN ('PENDING','ACKNOWLEDGED') AND r.status = 'SUBMITTED'`, ...ids),
    returned: await n(`SELECT COUNT(*) AS c FROM status_reports WHERE reporter_position_id IN (${l}) AND status = 'RETURNED'`, ...ids),
    conflicts: await n(`SELECT COUNT(*) AS c FROM command_conflicts WHERE status = 'OPEN' AND (common_superior_position_id IN (${l}) OR recipient_position_id IN (${l}))`, ...ids, ...ids),
    overdue: await n(`SELECT COUNT(*) AS c FROM command_directives WHERE recipient_position_id IN (${l}) AND status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS') AND due_date < ?`, ...ids, today()),
  };
}

// ── Appointment-only access policy (DEC-076) ───────────────────────────────────────────────────────────
/**
 * Office types that MAY give command access without an application role: only those explicitly flagged
 * `appointmentOnly` in POSITION_TYPES (Sergeant and Constable: the ranks the 31-role catalogue deliberately does not
 * represent). Deliberately NOT derived from "has no mapped role": an office whose role mapping is still undecided (for
 * example the Area Commander, DEC-075) must never become appointment-only by default.
 */
export const APPOINTMENT_ONLY_ELIGIBLE = Object.entries(POSITION_TYPES).filter(([, v]) => v.appointmentOnly).map(([k]) => k);
const DEFAULT_TYPES = ["SERGEANT", "CONSTABLE"];

export interface AppointmentAccessPolicy {
  enabled: boolean; source: "setting" | "environment default"; types: string[];
  lastChange: { at: string; by: string | null; reason: string | null; reference: string | null } | null;
}

export async function appointmentAccessPolicy(db: DB): Promise<AppointmentAccessPolicy> {
  const rows = await all<{ key: string; value: string }>(db, "SELECT `key`, value FROM app_settings WHERE `key` IN ('command.appointment_access','command.appointment_access_types')");
  const on = rows.find((r) => r.key === "command.appointment_access");
  const types = rows.find((r) => r.key === "command.appointment_access_types")?.value.split(",").map((t) => t.trim()).filter((t) => APPOINTMENT_ONLY_ELIGIBLE.includes(t)) ?? DEFAULT_TYPES;
  const last = await one<{ occurred_at: string; display_name: string | null; details: string }>(db,
    "SELECT e.occurred_at, u.display_name, e.details FROM audit_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.action = 'command.appointment_access.update' AND e.outcome = 'SUCCESS' ORDER BY e.seq DESC LIMIT 1");
  const d = last ? (JSON.parse(last.details || "{}") as { reason?: string; reference?: string }) : null;
  return {
    enabled: on ? on.value === "on" : !isProduction(), source: on ? "setting" : "environment default", types,
    lastChange: last ? { at: last.occurred_at, by: last.display_name, reason: d?.reason ?? null, reference: d?.reference ?? null } : null,
  };
}

export const appointmentAccessSchema = z.object({
  enabled: z.boolean(),
  types: z.array(z.string()).min(1, "Select at least one office type."),
  reason: z.string().trim().min(10, "Record why the policy changes (at least 10 characters)."),
  reference: z.string().trim().max(60).optional().transform((v) => v || undefined),
});
/**
 * Changes the policy. Platform configuration (Superadmin) only; a reason is always recorded and, in production,
 * switching it on also needs the reference of the Service decision that authorises it. Takes effect on the next
 * request of every affected account (authority is evaluated per request). Audited with before and after values.
 */
export async function setAppointmentAccess(db: DB, actor: Actor, input: z.input<typeof appointmentAccessSchema>) {
  await requirePermission(db, actor, "platform.configure", undefined, { type: "app_setting", id: "command.appointment_access" });
  const d = appointmentAccessSchema.parse(input);
  const bad = d.types.filter((t) => !APPOINTMENT_ONLY_ELIGIBLE.includes(t));
  if (bad.length) throw invalid(`${bad.map((t) => POSITION_TYPES[t]?.label ?? t).join(", ")}: not an appointment-only office type. Its holder needs an application role (or, where the mapping is undecided, a Service decision first).`);
  if (d.enabled && isProduction() && !d.reference) throw invalid("In production, switching appointment-only access on needs the reference of the Service decision that authorises it.");
  screen(d.reason, d.reference);
  const before = await appointmentAccessPolicy(db);
  const types = [...new Set(d.types)].sort();
  await tx(db, async (db) => {
    await run(db, "INSERT INTO app_settings (`key`, value, description) VALUES ('command.appointment_access', ?, 'Appointment-only command access for offices without an application role (DEC-076): on or off') ON DUPLICATE KEY UPDATE value = VALUES(value)", d.enabled ? "on" : "off");
    await run(db, "INSERT INTO app_settings (`key`, value, description) VALUES ('command.appointment_access_types', ?, 'Office types that give appointment-only command access (DEC-076)') ON DUPLICATE KEY UPDATE value = VALUES(value)", types.join(","));
    await audit(db, { actorId: actor.userId, action: "command.appointment_access.update", category: "CONFIG", entityType: "app_setting", entityId: "command.appointment_access",
      details: { from: { enabled: before.enabled, types: before.types, source: before.source }, to: { enabled: d.enabled, types }, reason: d.reason, reference: d.reference ?? null, environment: isProduction() ? "production" : "non-production" } });
  });
  return appointmentAccessPolicy(db);
}

export interface AppointmentOnlyAccount { user_id: string; display_name: string; username: string; status: string; position_id: string; title: string; position_type: string; unit: string; org_unit_id: string; since: string; effective: boolean }
/** Accounts that hold a command office but no application role, with whether the current policy gives them access. */
export async function listAppointmentOnlyAccounts(db: DB, actor: Actor): Promise<AppointmentOnlyAccount[]> {
  await requirePermission(db, actor, "user.view");
  const s = (await import("./policy")).scopeFor(actor, "user.view");
  const policy = await appointmentAccessPolicy(db);
  const t = nowIso();
  const rows = await all<Omit<AppointmentOnlyAccount, "effective">>(db,
    `SELECT u.id AS user_id, u.display_name, u.username, u.status, p.id AS position_id, p.title, p.position_type, o.name AS unit, p.org_unit_id, a.valid_from AS since
       FROM position_appointments a JOIN users u ON u.id = a.user_id JOIN command_positions p ON p.id = a.position_id JOIN org_units o ON o.id = p.org_unit_id
      WHERE a.ended_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?)
        AND NOT EXISTS (SELECT 1 FROM role_assignments r WHERE r.user_id = u.id AND r.revoked_at IS NULL AND (r.valid_to IS NULL OR r.valid_to > ?))
      ORDER BY u.display_name`, t, t);
  return rows.filter((r) => s.national || s.units.includes(r.org_unit_id))
    .map((r) => ({ ...r, effective: policy.enabled && policy.types.includes(r.position_type) && r.status === "ACTIVE" }));
}

/** Command offices a user holds or acts in (for the account page), within the viewer's user.view scope. */
export async function appointmentsOfUser(db: DB, actor: Actor, userId: string) {
  await requirePermission(db, actor, "user.view");
  return all<{ kind: string; title: string; unit: string; valid_from: string; valid_to: string | null; ended_at: string | null; reference: string; actions: string | null }>(db,
    `SELECT 'Appointment' AS kind, p.title, o.name AS unit, a.valid_from, a.valid_to, a.ended_at, a.authorising_ref AS reference, NULL AS actions
       FROM position_appointments a JOIN command_positions p ON p.id = a.position_id JOIN org_units o ON o.id = p.org_unit_id WHERE a.user_id = ?
     UNION ALL
     SELECT 'Acting', p.title, o.name, x.valid_from, x.valid_to, x.revoked_at, x.authorising_ref, x.actions
       FROM acting_appointments x JOIN command_positions p ON p.id = x.position_id JOIN org_units o ON o.id = p.org_unit_id WHERE x.acting_user_id = ?
     ORDER BY valid_from DESC LIMIT 50`, userId, userId);
}
