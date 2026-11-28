/**
 * Training and professional development (DIG Administration portfolio; final master directive Part C §4.2–§4.3;
 * DEC-086). Service-wide, administrative:
 *  - units SUBMIT training needs (training.need.submit over the requesting unit);
 *  - the DIG Administration OFFICE (appointment, DEC-088) keeps the course catalogue, plans sessions, decides needs and
 *    APPROVES nominations within session capacity — national scope, no application role required;
 *  - commanders NOMINATE serving officers in their scope (training.nominate over the officer's home unit);
 *  - a different officer RECOMMENDS (training.recommend over the nominating unit; never the nominator);
 *  - the DELIVERING formation or institution (e.g. Kamfinsa SPOM / Mobile Unit) records attendance and results
 *    (training.deliver over the delivering unit). Delivering training does not make the formation an administrative
 *    subordinate of DIG Administration: its command line is unchanged (§4.3).
 * Free text is screened for excluded terms. No medical or disciplinary detail is held. Every change is audited.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { addDays, conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, today } from "./core";
import { type Actor, can, hasPermission, requirePermission, scopeFor } from "./policy";
import { officesHeld, screen } from "./command";

export const TRAINING_CATEGORY = {
  INDUCTION: "Induction", PUBLIC_ORDER: "Public order", LEADERSHIP: "Leadership and command", ADMINISTRATION: "Administration and HR",
  TECHNICAL: "Technical", REFRESHER: "Refresher", OTHER: "Other",
} as const;
export type TrainingCategory = keyof typeof TRAINING_CATEGORY;
export const NEED_STATUS = { SUBMITTED: "Submitted", ACCEPTED: "Accepted", PLANNED: "Planned", DECLINED: "Declined", MET: "Met" } as const;
export const SESSION_STATUS = { PLANNED: "Planned", OPEN: "Open for nominations", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;
export const NOMINATION_STATUS = {
  NOMINATED: "Nominated", RECOMMENDED: "Recommended", NOT_RECOMMENDED: "Not recommended", APPROVED: "Approved", REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn", ATTENDED: "Attending", COMPLETED: "Completed", NOT_COMPLETED: "Not completed",
} as const;
const CATS = Object.keys(TRAINING_CATEGORY) as [TrainingCategory, ...TrainingCategory[]];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");

/** True when the actor holds the DIG Administration office (substantive or acting): the training administrator. */
export async function administersTraining(db: DB, actor: Actor): Promise<boolean> {
  return (await officesHeld(db, actor)).some((h) => h.positionType === "DIG_ADMINISTRATION");
}
async function requireAdministrator(db: DB, actor: Actor, action: string) {
  if (!(await administersTraining(db, actor))) {
    await audit(db, { actorId: actor.userId, action: `training.${action}`, outcome: "DENIED", category: "SECURITY", entityType: "training" });
    throw forbidden("Only the DIG Administration office administers the training catalogue, sessions, needs decisions and approvals.");
  }
}
/** Units whose training records the actor may see: null = all (administrator or national scope). */
async function visibleUnits(db: DB, actor: Actor): Promise<string[] | null> {
  if (await administersTraining(db, actor)) return null;
  const s = scopeFor(actor, "training.view");
  if (s.national) return null;
  const deliver = scopeFor(actor, "training.deliver");
  return [...new Set([...s.units, ...deliver.units])];
}
async function requireView(db: DB, actor: Actor) {
  if (!(await administersTraining(db, actor))) await requirePermission(db, actor, "training.view");
}
const inList = (xs: unknown[]) => xs.map(() => "?").join(",") || "NULL";

// ── Catalogue ───────────────────────────────────────────────────────────────────────────────────────
export async function listCourses(db: DB, actor: Actor) {
  await requireView(db, actor);
  return all<{ id: string; code: string; title: string; category: TrainingCategory; duration_days: number; institution: string; institution_id: string; certification: string | null; renewal_months: number | null; eligibility: string | null; status: string }>(db,
    `SELECT c.id, c.code, c.title, c.category, c.duration_days, i.name AS institution, i.id AS institution_id, c.certification, c.renewal_months, c.eligibility, c.status
       FROM training_courses c JOIN training_institutions i ON i.id = c.institution_id ORDER BY c.status, c.title`);
}
export async function listInstitutions(db: DB, actor: Actor) {
  await requireView(db, actor);
  return all<{ id: string; code: string; name: string; kind: string; unit: string | null; org_unit_id: string | null }>(db,
    "SELECT i.id, i.code, i.name, i.kind, o.name AS unit, i.org_unit_id FROM training_institutions i LEFT JOIN org_units o ON o.id = i.org_unit_id WHERE i.status = 'ACTIVE' ORDER BY i.name");
}

const courseSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9-]{3,30}$/, "Code: 3–30 upper-case letters, digits or hyphens."),
  title: z.string().trim().min(3, "Enter the course title.").max(160),
  institutionId: z.string().min(1, "Select the institution."),
  category: z.enum(CATS),
  durationDays: z.coerce.number().int().min(1).max(365),
  eligibility: z.string().trim().max(200).optional().transform((v) => v || null),
  certification: z.string().trim().max(120).optional().transform((v) => v || null),
  renewalMonths: z.union([z.coerce.number().int().min(1).max(120), z.literal("").transform(() => null)]).optional().nullable(),
});
export async function createCourse(db: DB, actor: Actor, input: z.input<typeof courseSchema>) {
  await requireAdministrator(db, actor, "course.create");
  const d = courseSchema.parse(input);
  screen(d.title, d.eligibility, d.certification);
  if (!await one(db, "SELECT id FROM training_institutions WHERE id = ? AND status = 'ACTIVE'", d.institutionId)) throw invalid("Select an active institution.");
  if (await one(db, "SELECT id FROM training_courses WHERE code = ?", d.code)) throw conflict("A course with this code already exists.");
  const id = newId("crs");
  const t = nowIso();
  await run(db, `INSERT INTO training_courses (id, code, title, institution_id, category, duration_days, eligibility, certification, renewal_months, created_by, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, id, d.code, d.title, d.institutionId, d.category, d.durationDays, d.eligibility, d.certification, d.renewalMonths ?? null, actor.userId, t, t);
  await audit(db, { actorId: actor.userId, action: "training.course.create", category: "BUSINESS", entityType: "training_course", entityId: id, details: { code: d.code } });
  return id;
}

// ── Sessions ────────────────────────────────────────────────────────────────────────────────────────
const sessionSchema = z.object({
  courseId: z.string().min(1, "Select the course."),
  deliveringUnitId: z.string().min(1, "Select the delivering unit."),
  startDate: date, endDate: date,
  capacity: z.coerce.number().int().min(1).max(1000),
});
export async function createSession(db: DB, actor: Actor, input: z.input<typeof sessionSchema>) {
  await requireAdministrator(db, actor, "session.create");
  const d = sessionSchema.parse(input);
  if (d.endDate < d.startDate) throw invalid("The end date must be on or after the start date.");
  if (!await one(db, "SELECT id FROM training_courses WHERE id = ? AND status = 'ACTIVE'", d.courseId)) throw invalid("Select an active course.");
  if (!await one(db, "SELECT id FROM org_units WHERE id = ? AND status = 'ACTIVE'", d.deliveringUnitId)) throw invalid("Select an active delivering unit.");
  const id = newId("tss");
  const ref = await nextReference(db, "TRN", "training_sessions");
  const t = nowIso();
  await run(db, `INSERT INTO training_sessions (id, reference, course_id, delivering_unit_id, start_date, end_date, capacity, plan_year, status, created_by, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?, 'OPEN', ?,?,?)`, id, ref, d.courseId, d.deliveringUnitId, d.startDate, d.endDate, d.capacity, Number(d.startDate.slice(0, 4)), actor.userId, t, t);
  await audit(db, { actorId: actor.userId, action: "training.session.create", category: "BUSINESS", entityType: "training_session", entityId: id, orgUnitId: d.deliveringUnitId, details: { reference: ref } });
  return { id, reference: ref };
}

export interface SessionRow { id: string; reference: string; course_id: string; title: string; category: TrainingCategory; delivering_unit_id: string; delivering_unit: string; start_date: string; end_date: string; capacity: number; status: string; approved: number; nominated: number }
const SSELECT = `SELECT s.id, s.reference, s.course_id, c.title, c.category, s.delivering_unit_id, o.name AS delivering_unit, s.start_date, s.end_date, s.capacity, s.status,
    (SELECT COUNT(*) FROM training_nominations n WHERE n.session_id = s.id AND n.status IN ('APPROVED','ATTENDED','COMPLETED','NOT_COMPLETED')) AS approved,
    (SELECT COUNT(*) FROM training_nominations n WHERE n.session_id = s.id AND n.status IN ('NOMINATED','RECOMMENDED')) AS nominated
  FROM training_sessions s JOIN training_courses c ON c.id = s.course_id JOIN org_units o ON o.id = s.delivering_unit_id`;
export async function listSessions(db: DB, actor: Actor, f: { status?: string } = {}) {
  await requireView(db, actor);
  const where = f.status && f.status in SESSION_STATUS ? "WHERE s.status = ?" : "";
  return all<SessionRow>(db, `${SSELECT} ${where} ORDER BY s.start_date DESC LIMIT 200`, ...(where ? [f.status] : []));
}
export async function getSession(db: DB, actor: Actor, id: string) {
  await requireView(db, actor);
  const s = await one<SessionRow>(db, `${SSELECT} WHERE s.id = ?`, id);
  if (!s) throw notFound();
  const units = await visibleUnits(db, actor);
  const delivers = can(actor, "training.deliver", s.delivering_unit_id);
  // Nominations: the administrator and the delivering unit see every nominee; others only their own units' nominees.
  const filter = units === null || delivers ? "" : `AND (p.home_unit_id IN (${inList(units)}) OR n.nominating_unit_id IN (${inList(units)}))`;
  const nominations = await all<NominationRow>(db, `${NSELECT} WHERE n.session_id = ? ${filter} ORDER BY n.created_at`, id, ...(filter ? [...units!, ...units!] : []));
  return { session: s, nominations, administers: await administersTraining(db, actor), delivers, canNominate: hasPermission(actor, "training.nominate") && ["OPEN", "PLANNED"].includes(s.status) };
}
export async function setSessionStatus(db: DB, actor: Actor, id: string, status: keyof typeof SESSION_STATUS) {
  const s = await one<{ status: string; delivering_unit_id: string }>(db, "SELECT status, delivering_unit_id FROM training_sessions WHERE id = ?", id);
  if (!s) throw notFound();
  const admin = await administersTraining(db, actor);
  const deliverer = can(actor, "training.deliver", s.delivering_unit_id);
  const ALLOWED: Record<string, string[]> = { PLANNED: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "CANCELLED", "PLANNED"], IN_PROGRESS: ["COMPLETED"], COMPLETED: [], CANCELLED: [] };
  if (!(ALLOWED[s.status] ?? []).includes(status)) throw conflict(`A ${s.status.toLowerCase()} session cannot become ${status.toLowerCase()}.`);
  // The delivering unit starts and completes delivery; opening, re-planning and cancelling are administrative decisions.
  const needsAdmin = ["OPEN", "PLANNED", "CANCELLED"].includes(status);
  if (needsAdmin ? !admin : !(admin || deliverer)) {
    await audit(db, { actorId: actor.userId, action: "training.session.status", outcome: "DENIED", category: "SECURITY", entityType: "training_session", entityId: id });
    throw forbidden("You cannot change this session's status.");
  }
  await run(db, "UPDATE training_sessions SET status = ?, updated_at = ? WHERE id = ?", status, nowIso(), id);
  await audit(db, { actorId: actor.userId, action: "training.session.status", category: "BUSINESS", entityType: "training_session", entityId: id, orgUnitId: s.delivering_unit_id, details: { from: s.status, to: status } });
}

// ── Training needs ──────────────────────────────────────────────────────────────────────────────────
const needSchema = z.object({
  requestingUnitId: z.string().min(1, "Select the requesting unit."),
  topic: z.string().trim().min(5, "Describe the training need.").max(160),
  category: z.enum(CATS),
  courseId: z.string().optional().transform((v) => v || null),
  officersCount: z.coerce.number().int().min(1).max(10000),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  justification: z.string().trim().min(10, "Give the justification.").max(500),
});
export async function submitNeed(db: DB, actor: Actor, input: z.input<typeof needSchema>) {
  const d = needSchema.parse(input);
  await requirePermission(db, actor, "training.need.submit", d.requestingUnitId, { type: "training_need" });
  screen(d.topic, d.justification);
  if (d.courseId && !await one(db, "SELECT id FROM training_courses WHERE id = ?", d.courseId)) throw invalid("Select a valid course.");
  const id = newId("tnd");
  const ref = await nextReference(db, "TND", "training_needs");
  const t = nowIso();
  await run(db, `INSERT INTO training_needs (id, reference, requesting_unit_id, course_id, topic, category, officers_count, priority, justification, submitted_by, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, id, ref, d.requestingUnitId, d.courseId, d.topic, d.category, d.officersCount, d.priority, d.justification, actor.userId, t, t);
  await audit(db, { actorId: actor.userId, action: "training.need.submit", category: "BUSINESS", entityType: "training_need", entityId: id, orgUnitId: d.requestingUnitId, details: { reference: ref, priority: d.priority } });
  for (const u of await administratorUsers(db)) await notify(db, u, `Training need ${ref}`, d.topic, "/app/training?tab=needs");
  return { id, reference: ref };
}
export async function decideNeed(db: DB, actor: Actor, id: string, status: "ACCEPTED" | "PLANNED" | "DECLINED" | "MET", note?: string) {
  await requireAdministrator(db, actor, "need.decide");
  const n = await one<{ status: string; submitted_by: string; reference: string; requesting_unit_id: string }>(db, "SELECT status, submitted_by, reference, requesting_unit_id FROM training_needs WHERE id = ?", id);
  if (!n) throw notFound();
  if (["DECLINED", "MET"].includes(n.status)) throw conflict("This training need is already closed.");
  if (status === "DECLINED" && !note?.trim()) throw invalid("Give the reason for declining.");
  screen(note);
  await run(db, "UPDATE training_needs SET status = ?, decided_by = ?, decision_note = ?, updated_at = ? WHERE id = ?", status, actor.userId, note?.trim() || null, nowIso(), id);
  await audit(db, { actorId: actor.userId, action: "training.need.decide", category: "BUSINESS", entityType: "training_need", entityId: id, orgUnitId: n.requesting_unit_id, details: { from: n.status, to: status } });
  await notify(db, n.submitted_by, `Training need ${n.reference}: ${NEED_STATUS[status].toLowerCase()}`, note ?? "", "/app/training?tab=needs");
}
export async function listNeeds(db: DB, actor: Actor) {
  await requireView(db, actor);
  const units = await visibleUnits(db, actor);
  return all<{ id: string; reference: string; topic: string; category: TrainingCategory; officers_count: number; priority: string; status: string; unit: string; requesting_unit_id: string; justification: string; decision_note: string | null; created_at: string }>(db,
    `SELECT n.id, n.reference, n.topic, n.category, n.officers_count, n.priority, n.status, o.name AS unit, n.requesting_unit_id, n.justification, n.decision_note, n.created_at
       FROM training_needs n JOIN org_units o ON o.id = n.requesting_unit_id ${units === null ? "" : `WHERE n.requesting_unit_id IN (${inList(units)})`}
      ORDER BY FIELD(n.status,'SUBMITTED','ACCEPTED','PLANNED','MET','DECLINED'), FIELD(n.priority,'HIGH','MEDIUM','LOW'), n.created_at DESC LIMIT 300`, ...(units ?? []));
}

// ── Nominations ─────────────────────────────────────────────────────────────────────────────────────
export interface NominationRow { id: string; reference: string; session_id: string; session_ref: string; title: string; personnel_id: string; officer: string; rank_code: string; home_unit: string; nominating_unit: string; nominating_unit_id: string; status: string; nominated_by: string; certificate_ref: string | null; certificate_expiry: string | null; decision_note: string | null }
const NSELECT = `SELECT n.id, n.reference, n.session_id, s.reference AS session_ref, c.title, n.personnel_id, CONCAT(p.surname, ', ', p.first_names) AS officer, p.rank_code,
    ho.name AS home_unit, no.name AS nominating_unit, n.nominating_unit_id, n.status, n.nominated_by, n.certificate_ref, n.certificate_expiry, n.decision_note
  FROM training_nominations n JOIN training_sessions s ON s.id = n.session_id JOIN training_courses c ON c.id = s.course_id
  JOIN personnel_records p ON p.id = n.personnel_id JOIN org_units ho ON ho.id = p.home_unit_id JOIN org_units no ON no.id = n.nominating_unit_id`;

export async function nominate(db: DB, actor: Actor, input: { sessionId: string; personnelId: string }) {
  const s = await one<{ status: string; reference: string }>(db, "SELECT status, reference FROM training_sessions WHERE id = ?", input.sessionId);
  if (!s) throw invalid("Select a session.");
  if (!["OPEN", "PLANNED"].includes(s.status)) throw conflict("Nominations are closed for this session.");
  const p = await one<{ home_unit_id: string; employment_status: string; surname: string }>(db, "SELECT home_unit_id, employment_status, surname FROM personnel_records WHERE id = ?", input.personnelId);
  if (!p) throw invalid("Select an officer.");
  await requirePermission(db, actor, "training.nominate", p.home_unit_id, { type: "training_nomination" });
  if (p.employment_status !== "SERVING") throw invalid("Only serving officers can be nominated.");
  if (await one(db, "SELECT id FROM training_nominations WHERE session_id = ? AND personnel_id = ? AND status NOT IN ('WITHDRAWN','REJECTED','NOT_RECOMMENDED')", input.sessionId, input.personnelId)) throw conflict("This officer is already nominated for this session.");
  const id = newId("tnm");
  const ref = await nextReference(db, "NOM", "training_nominations");
  const t = nowIso();
  await tx(db, async (c) => {
    // A previous withdrawn or refused nomination for the same session is replaced (unique session + officer).
    await run(c, "DELETE FROM training_nominations WHERE session_id = ? AND personnel_id = ? AND status IN ('WITHDRAWN','REJECTED','NOT_RECOMMENDED')", input.sessionId, input.personnelId);
    await run(c, `INSERT INTO training_nominations (id, reference, session_id, personnel_id, nominating_unit_id, nominated_by, status, created_at, updated_at) VALUES (?,?,?,?,?,?, 'NOMINATED', ?, ?)`,
      id, ref, input.sessionId, input.personnelId, p.home_unit_id, actor.userId, t, t);
    await audit(c, { actorId: actor.userId, action: "training.nominate", category: "BUSINESS", entityType: "training_nomination", entityId: id, orgUnitId: p.home_unit_id, details: { reference: ref, session: s.reference } });
  });
  return { id, reference: ref };
}

async function nominationFor(db: DB, id: string) {
  const n = await one<{ id: string; status: string; nominated_by: string; nominating_unit_id: string; session_id: string; reference: string; capacity: number; delivering_unit_id: string; renewal_months: number | null; end_date: string; version: number }>(db,
    `SELECT n.id, n.status, n.nominated_by, n.nominating_unit_id, n.session_id, n.reference, s.capacity, s.delivering_unit_id, c.renewal_months, s.end_date, n.version
       FROM training_nominations n JOIN training_sessions s ON s.id = n.session_id JOIN training_courses c ON c.id = s.course_id WHERE n.id = ?`, id);
  if (!n) throw notFound();
  return n;
}
async function moveNomination(db: DB, actor: Actor, n: { id: string; status: string; version: number; nominating_unit_id: string }, to: string, extra: Record<string, unknown>, action: string) {
  const sets = Object.keys(extra).map((k) => `${k} = ?`).join(", ");
  const r = await run(db, `UPDATE training_nominations SET status = ?, ${sets ? sets + ", " : ""}version = version + 1, updated_at = ? WHERE id = ? AND version = ?`,
    to, ...Object.values(extra), nowIso(), n.id, n.version);
  if (r.changes !== 1) throw conflict("The nomination was changed by someone else; reload and try again.");
  await audit(db, { actorId: actor.userId, action: `training.nomination.${action}`, category: "BUSINESS", entityType: "training_nomination", entityId: n.id, orgUnitId: n.nominating_unit_id, details: { from: n.status, to } });
}

export async function recommendNomination(db: DB, actor: Actor, id: string, recommend: boolean, note?: string) {
  const n = await nominationFor(db, id);
  await requirePermission(db, actor, "training.recommend", n.nominating_unit_id, { type: "training_nomination", id });
  if (n.nominated_by === actor.userId) throw forbidden("The nominating officer cannot also recommend the nomination.");
  if (n.status !== "NOMINATED") throw conflict("Only a new nomination can be recommended.");
  screen(note);
  await moveNomination(db, actor, n, recommend ? "RECOMMENDED" : "NOT_RECOMMENDED", { recommended_by: actor.userId, decision_note: note?.trim() || null }, "recommend");
  await notify(db, n.nominated_by, `Nomination ${n.reference} ${recommend ? "recommended" : "not recommended"}`, note ?? "", "/app/training?tab=nominations");
}

export async function decideNomination(db: DB, actor: Actor, id: string, approve: boolean, note?: string) {
  await requireAdministrator(db, actor, "nomination.decide");
  const n = await nominationFor(db, id);
  if (n.status !== "RECOMMENDED") throw conflict("Only a recommended nomination can be approved or rejected.");
  if (!approve && !note?.trim()) throw invalid("Give the reason for rejection.");
  screen(note);
  if (approve) {
    const taken = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM training_nominations WHERE session_id = ? AND status IN ('APPROVED','ATTENDED','COMPLETED','NOT_COMPLETED')", n.session_id))?.c ?? 0);
    if (taken >= n.capacity) throw conflict("The session is full. Reject, or place the officer on a later session.");
  }
  await moveNomination(db, actor, n, approve ? "APPROVED" : "REJECTED", { decided_by: actor.userId, decision_note: note?.trim() || null }, "decide");
  await notify(db, n.nominated_by, `Nomination ${n.reference} ${approve ? "approved" : "rejected"}`, note ?? "", "/app/training?tab=nominations");
}

export async function withdrawNomination(db: DB, actor: Actor, id: string, note: string) {
  const n = await nominationFor(db, id);
  const admin = await administersTraining(db, actor);
  if (!(admin || n.nominated_by === actor.userId || can(actor, "training.nominate", n.nominating_unit_id))) throw forbidden("You cannot withdraw this nomination.");
  if (!["NOMINATED", "RECOMMENDED", "APPROVED"].includes(n.status)) throw conflict("This nomination can no longer be withdrawn.");
  if (!note.trim()) throw invalid("Give the reason (for example, a substitution or operational commitment).");
  screen(note);
  await moveNomination(db, actor, n, "WITHDRAWN", { decision_note: note.trim() }, "withdraw");
}

/** The delivering unit records attendance (APPROVED → ATTENDED) and results (ATTENDED → COMPLETED / NOT_COMPLETED). */
export async function recordAttendance(db: DB, actor: Actor, id: string) {
  const n = await nominationFor(db, id);
  if (!can(actor, "training.deliver", n.delivering_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "training.nomination.attend", outcome: "DENIED", category: "SECURITY", entityType: "training_nomination", entityId: id });
    throw forbidden("Only the delivering unit records attendance.");
  }
  if (n.status !== "APPROVED") throw conflict("Only an approved nomination can be marked as attending.");
  await moveNomination(db, actor, n, "ATTENDED", {}, "attend");
}
export async function recordResult(db: DB, actor: Actor, id: string, input: { completed: boolean; certificateRef?: string; note?: string }) {
  const n = await nominationFor(db, id);
  if (!can(actor, "training.deliver", n.delivering_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "training.nomination.result", outcome: "DENIED", category: "SECURITY", entityType: "training_nomination", entityId: id });
    throw forbidden("Only the delivering unit records results.");
  }
  if (n.status !== "ATTENDED") throw conflict("Record attendance before the result.");
  screen(input.note, input.certificateRef);
  const cert = input.completed ? (input.certificateRef?.trim() || null) : null;
  if (cert && cert.length > 60) throw invalid("The certificate reference is too long.");
  const expiry = input.completed && n.renewal_months ? addDays(n.end_date, Math.round(n.renewal_months * 30.44)) : null;
  await moveNomination(db, actor, n, input.completed ? "COMPLETED" : "NOT_COMPLETED", { certificate_ref: cert, certificate_expiry: expiry, decision_note: input.note?.trim() || null }, "result");
}

export async function listNominations(db: DB, actor: Actor, f: { status?: string } = {}) {
  await requireView(db, actor);
  const units = await visibleUnits(db, actor);
  const where: string[] = [];
  const params: unknown[] = [];
  if (units !== null) {
    // Own units' nominees, plus nominees of sessions the actor's units deliver.
    where.push(`(p.home_unit_id IN (${inList(units)}) OR n.nominating_unit_id IN (${inList(units)}) OR s.delivering_unit_id IN (${inList(units)}))`);
    params.push(...units, ...units, ...units);
  }
  if (f.status && f.status in NOMINATION_STATUS) { where.push("n.status = ?"); params.push(f.status); }
  return all<NominationRow>(db, `${NSELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY n.updated_at DESC LIMIT 300`, ...params);
}

/** Officers the actor may nominate (serving, in training.nominate scope). */
export async function nominableOfficers(db: DB, actor: Actor) {
  const s = scopeFor(actor, "training.nominate");
  if (!s.national && !s.units.length) return [];
  return all<{ id: string; label: string }>(db,
    `SELECT p.id, CONCAT(p.surname, ', ', p.first_names, ' — ', p.rank_code, ', ', o.name) AS label FROM personnel_records p JOIN org_units o ON o.id = p.home_unit_id
      WHERE p.employment_status = 'SERVING' ${s.national ? "" : `AND p.home_unit_id IN (${inList(s.units)})`} ORDER BY p.surname, p.first_names LIMIT 500`, ...(s.national ? [] : s.units));
}

async function administratorUsers(db: DB) {
  const t = nowIso();
  return (await all<{ user_id: string }>(db,
    `SELECT a.user_id FROM position_appointments a JOIN command_positions p ON p.id = a.position_id
      WHERE p.position_type = 'DIG_ADMINISTRATION' AND a.ended_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?)`, t, t)).map((r) => r.user_id);
}

// ── Oversight ───────────────────────────────────────────────────────────────────────────────────────
/**
 * Service-wide training oversight: counts only (no individual records), grouped by Provincial Division / formation
 * (the top-level unit under Service HQ). National for the administrator; otherwise limited to the actor's scope.
 */
export async function trainingOverview(db: DB, actor: Actor) {
  await requireView(db, actor);
  const units = await visibleUnits(db, actor);
  const scope = (col: string) => (units === null ? { sql: "1=1", params: [] as unknown[] } : { sql: `${col} IN (${inList(units)})`, params: units as unknown[] });
  const top = `(SELECT a.id FROM org_unit_closure c JOIN org_units a ON a.id = c.ancestor_id WHERE c.descendant_id = %COL% AND a.unit_type IN ('PROVINCIAL_DIVISION','FORMATION') ORDER BY c.depth DESC LIMIT 1)`;
  const ns = scope("p.home_unit_id");
  const byDivision = await all<{ division: string | null; nominated: number; approved: number; completed: number; not_completed: number }>(db,
    `SELECT d.name AS division,
            SUM(n.status IN ('NOMINATED','RECOMMENDED')) AS nominated, SUM(n.status IN ('APPROVED','ATTENDED')) AS approved,
            SUM(n.status = 'COMPLETED') AS completed, SUM(n.status = 'NOT_COMPLETED') AS not_completed
       FROM training_nominations n JOIN personnel_records p ON p.id = n.personnel_id
       LEFT JOIN org_units d ON d.id = ${top.replace("%COL%", "p.home_unit_id")}
      WHERE ${ns.sql} GROUP BY d.name ORDER BY d.name`, ...ns.params);
  const nd = scope("n.requesting_unit_id");
  const needs = await all<{ status: string; priority: string; n: number; officers: number }>(db,
    `SELECT n.status, n.priority, COUNT(*) AS n, SUM(n.officers_count) AS officers FROM training_needs n WHERE ${nd.sql} GROUP BY n.status, n.priority`, ...nd.params);
  const sessions = await all<{ status: string; n: number; capacity: number; filled: number }>(db,
    `SELECT s.status, COUNT(*) AS n, SUM(s.capacity) AS capacity,
            SUM((SELECT COUNT(*) FROM training_nominations x WHERE x.session_id = s.id AND x.status IN ('APPROVED','ATTENDED','COMPLETED','NOT_COMPLETED'))) AS filled
       FROM training_sessions s GROUP BY s.status`);
  const renewals = Number((await one<{ c: number }>(db,
    `SELECT COUNT(*) AS c FROM training_nominations n JOIN personnel_records p ON p.id = n.personnel_id WHERE n.status = 'COMPLETED' AND n.certificate_expiry IS NOT NULL AND n.certificate_expiry <= ? AND ${ns.sql}`,
    addDays(today(), 90), ...ns.params))?.c ?? 0);
  const num = (x: unknown) => Number(x ?? 0);
  return {
    byDivision: byDivision.map((r) => ({ division: r.division ?? "Service HQ", nominated: num(r.nominated), approved: num(r.approved), completed: num(r.completed), notCompleted: num(r.not_completed) })),
    needs: needs.map((r) => ({ status: r.status, priority: r.priority, count: num(r.n), officers: num(r.officers) })),
    sessions: sessions.map((r) => ({ status: r.status, count: num(r.n), capacity: num(r.capacity), filled: num(r.filled) })),
    renewalsDue90: renewals,
    national: units === null,
  };
}

/** Training history of one officer (personnel scope applies). */
export async function trainingHistory(db: DB, actor: Actor, personnelId: string) {
  const p = await one<{ home_unit_id: string }>(db, "SELECT home_unit_id FROM personnel_records WHERE id = ?", personnelId);
  if (!p) throw notFound();
  if (!(await administersTraining(db, actor)) && !can(actor, "training.view", p.home_unit_id) && !can(actor, "personnel.view", p.home_unit_id)) throw notFound();
  return all<NominationRow>(db, `${NSELECT} WHERE n.personnel_id = ? ORDER BY s.start_date DESC`, personnelId);
}

/** Choices for the training forms, limited to what the actor may use. */
export async function trainingFormOptions(db: DB, actor: Actor) {
  const s = scopeFor(actor, "training.need.submit");
  const needUnits = s.national
    ? await all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE status = 'ACTIVE' AND unit_type IN ('SERVICE_HQ','PROVINCIAL_DIVISION','FORMATION','DISTRICT','COMPANY') ORDER BY unit_type, name")
    : s.units.length ? await all<{ id: string; name: string }>(db, `SELECT id, name FROM org_units WHERE id IN (${inList(s.units)}) AND status = 'ACTIVE' AND unit_type IN ('PROVINCIAL_DIVISION','FORMATION','DISTRICT','COMPANY','DETACHMENT') ORDER BY name`, ...s.units) : [];
  const admin = await administersTraining(db, actor);
  const deliveringUnits = admin ? await all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE status = 'ACTIVE' AND unit_type IN ('SERVICE_HQ','FORMATION','PROVINCIAL_DIVISION') ORDER BY unit_type, name") : [];
  const courses = await all<{ id: string; title: string }>(db, "SELECT id, CONCAT(code, ' — ', title) AS title FROM training_courses WHERE status = 'ACTIVE' ORDER BY title");
  return { needUnits, deliveringUnits, courses, admin, canSubmitNeed: needUnits.length > 0, canNominate: hasPermission(actor, "training.nominate"), canRecommend: hasPermission(actor, "training.recommend") };
}
