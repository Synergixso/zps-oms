/**
 * Operations administration (DIG Operations portfolio; final master directive Part D §5.2–§5.4; DEC-087).
 *
 * An ADMINISTRATIVE register — not a tactical system:
 *  - public-order incidents and illegal-mining operations: classification, authorising office and reference,
 *    responsible (and coordinating) unit, dates, personnel committed as a COUNT, status, dated progress / resource /
 *    review updates, a short screened outcome and post-event review;
 *  - mining security services: partner organisations, service agreements tied to an administrative DUTY AREA
 *    (operational_areas) and responsible unit, officers required (count), and periodic service-delivery reports.
 * There are deliberately no fields for plans, routes, positions, live locations, site layouts or vulnerabilities,
 * intelligence or investigation content; free text is screened for excluded terms. Personnel assigned to a service
 * are managed through the existing duty-area assignment module (administrative duty station, never a location).
 * Scope: opsadmin.* / secservice.* over the responsible unit; NATIONAL for HQ roles. Every change is audited.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, invalid, newId, nextReference, notFound, nowIso, today } from "./core";
import { type Actor, can, requirePermission, scopeFor } from "./policy";
import { officesHeld, screen } from "./command";

export const OPS_CATEGORY = { PUBLIC_ORDER: "Public order", ILLEGAL_MINING: "Illegal mining enforcement" } as const;
export type OpsCategory = keyof typeof OPS_CATEGORY;
export const CLASSIFICATION: Record<OpsCategory, Record<string, string>> = {
  PUBLIC_ORDER: { PUBLIC_GATHERING: "Public gathering / event", DEMONSTRATION: "Demonstration", CIVIL_UNREST: "Civil unrest", RIOT: "Riot", OTHER: "Other public-order matter" },
  ILLEGAL_MINING: { ENFORCEMENT: "Enforcement operation", JOINT_OPERATION: "Joint inter-agency operation", AWARENESS: "Community awareness activity", OTHER: "Other" },
};
export const OPS_STATUS = { REGISTERED: "Registered", ACTIVE: "Active", COMPLETED: "Completed", REVIEWED: "Post-event review recorded", CLOSED: "Closed" } as const;
const NEXT: Record<string, string[]> = { REGISTERED: ["ACTIVE", "CLOSED"], ACTIVE: ["COMPLETED"], COMPLETED: ["REVIEWED"], REVIEWED: ["CLOSED"], CLOSED: [] };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");
const inList = (xs: unknown[]) => xs.map(() => "?").join(",") || "NULL";

function scopeWhere(actor: Actor, perm: "opsadmin.view" | "secservice.view", col: string) {
  const s = scopeFor(actor, perm);
  if (s.national) return { sql: "1=1", params: [] as unknown[] };
  return { sql: s.units.length ? `${col} IN (${inList(s.units)})` : "1=0", params: s.units as unknown[] };
}

// ── Public-order and illegal-mining register ────────────────────────────────────────────────────────
const activitySchema = z.object({
  category: z.enum(["PUBLIC_ORDER", "ILLEGAL_MINING"]),
  classification: z.string().min(1, "Select the classification."),
  title: z.string().trim().min(5, "Enter an administrative title.").max(160),
  authorisingRef: z.string().trim().min(3, "Record the authorising reference.").max(60),
  authorisingOffice: z.string().optional().transform((v) => v || null),
  responsibleUnitId: z.string().min(1, "Select the responsible unit."),
  coordinatingUnitId: z.string().optional().transform((v) => v || null),
  startDate: date,
  endDate: z.string().optional().transform((v) => v || null),
  personnelCommitted: z.coerce.number().int().min(0).max(100000),
});
export async function registerActivity(db: DB, actor: Actor, input: z.input<typeof activitySchema>) {
  const d = activitySchema.parse(input);
  await requirePermission(db, actor, "opsadmin.manage", d.responsibleUnitId, { type: "ops_activity" });
  if (!(d.classification in CLASSIFICATION[d.category])) throw invalid("Select a valid classification.");
  if (d.endDate && d.endDate < d.startDate) throw invalid("The end date must be on or after the start date.");
  screen(d.title, d.authorisingRef);
  if (d.authorisingOffice && !await one(db, "SELECT id FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.authorisingOffice)) throw invalid("Select a valid authorising office.");
  if (d.coordinatingUnitId && !await one(db, "SELECT id FROM org_units WHERE id = ?", d.coordinatingUnitId)) throw invalid("Select a valid coordinating unit.");
  const id = newId("ops");
  const ref = await nextReference(db, d.category === "PUBLIC_ORDER" ? "POA" : "IMA", "ops_activities");
  const t = nowIso();
  await tx(db, async (c) => {
    await run(c, `INSERT INTO ops_activities (id, reference, category, classification, title, authorising_ref, authorising_office, responsible_unit_id, coordinating_unit_id, start_date, end_date, personnel_committed, created_by, created_at, updated_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, ref, d.category, d.classification, d.title, d.authorisingRef, d.authorisingOffice, d.responsibleUnitId, d.coordinatingUnitId, d.startDate, d.endDate, d.personnelCommitted, actor.userId, t, t);
    await run(c, "INSERT INTO ops_activity_updates (id, activity_id, seq, kind, note, personnel, to_status, recorded_by, at) VALUES (?,?,1,'REGISTER',?,?, 'REGISTERED', ?, ?)", newId("oau"), id, null, d.personnelCommitted, actor.userId, t);
    await audit(c, { actorId: actor.userId, action: "opsadmin.register", category: "BUSINESS", entityType: "ops_activity", entityId: id, orgUnitId: d.responsibleUnitId, details: { reference: ref, category: d.category } });
  });
  return { id, reference: ref };
}

export interface ActivityRow { id: string; reference: string; category: OpsCategory; classification: string; title: string; authorising_ref: string; authorising_office_title: string | null; responsible_unit_id: string; responsible_unit: string; coordinating_unit: string | null; start_date: string; end_date: string | null; personnel_committed: number; status: string; outcome_summary: string | null; review_summary: string | null; version: number; updated_at: string }
const ASELECT = `SELECT a.id, a.reference, a.category, a.classification, a.title, a.authorising_ref, p.title AS authorising_office_title, a.responsible_unit_id, o.name AS responsible_unit,
    co.name AS coordinating_unit, a.start_date, a.end_date, a.personnel_committed, a.status, a.outcome_summary, a.review_summary, a.version, a.updated_at
  FROM ops_activities a JOIN org_units o ON o.id = a.responsible_unit_id LEFT JOIN org_units co ON co.id = a.coordinating_unit_id LEFT JOIN command_positions p ON p.id = a.authorising_office`;

export async function listActivities(db: DB, actor: Actor, f: { category?: string; status?: string } = {}) {
  await requirePermission(db, actor, "opsadmin.view");
  const s = scopeWhere(actor, "opsadmin.view", "a.responsible_unit_id");
  const where = [s.sql];
  const params = [...s.params];
  if (f.category && f.category in OPS_CATEGORY) { where.push("a.category = ?"); params.push(f.category); }
  if (f.status && f.status in OPS_STATUS) { where.push("a.status = ?"); params.push(f.status); }
  return all<ActivityRow>(db, `${ASELECT} WHERE ${where.join(" AND ")} ORDER BY a.start_date DESC, a.created_at DESC LIMIT 300`, ...params);
}

export async function getActivity(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "opsadmin.view");
  const a = await one<ActivityRow>(db, `${ASELECT} WHERE a.id = ?`, id);
  if (!a || !can(actor, "opsadmin.view", a.responsible_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "opsadmin.view", outcome: "DENIED", category: "SECURITY", entityType: "ops_activity", entityId: id });
    throw notFound();
  }
  const updates = await all<{ seq: number; kind: string; note: string | null; personnel: number | null; from_status: string | null; to_status: string | null; by: string; at: string }>(db,
    "SELECT u.seq, u.kind, u.note, u.personnel, u.from_status, u.to_status, x.display_name AS `by`, u.at FROM ops_activity_updates u JOIN users x ON x.id = u.recorded_by WHERE u.activity_id = ? ORDER BY u.seq", id);
  return { activity: a, updates, canManage: can(actor, "opsadmin.manage", a.responsible_unit_id) };
}

const updateSchema = z.object({
  kind: z.enum(["PROGRESS", "RESOURCE_REQUEST", "STATUS", "REVIEW"]),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
  personnel: z.union([z.coerce.number().int().min(0).max(100000), z.literal("").transform(() => null)]).optional().nullable(),
  toStatus: z.string().optional(),
  outcome: z.string().trim().max(500).optional().transform((v) => v || null),
});
export async function updateActivity(db: DB, actor: Actor, id: string, input: z.input<typeof updateSchema>, expectedVersion?: number) {
  const d = updateSchema.parse(input);
  const a = await one<{ status: string; responsible_unit_id: string; version: number; end_date: string | null }>(db, "SELECT status, responsible_unit_id, version, end_date FROM ops_activities WHERE id = ?", id);
  if (!a) throw notFound();
  await requirePermission(db, actor, "opsadmin.manage", a.responsible_unit_id, { type: "ops_activity", id });
  if (expectedVersion !== undefined && expectedVersion !== a.version) throw conflict("The record was changed by someone else; reload and try again.");
  screen(d.note, d.outcome);
  if (a.status === "CLOSED") throw conflict("A closed record cannot be updated.");
  let to: string | null = null;
  if (d.kind === "STATUS") {
    to = d.toStatus ?? "";
    if (!(NEXT[a.status] ?? []).includes(to)) throw conflict(`A ${a.status.toLowerCase()} record cannot become ${to.toLowerCase() || "that"}.`);
    if (to === "COMPLETED" && !d.outcome) throw invalid("Record the administrative outcome when completing.");
  }
  if (d.kind === "REVIEW") {
    if (a.status !== "COMPLETED") throw conflict("The post-event review is recorded after completion.");
    if (!d.note) throw invalid("Record the post-event review summary.");
    to = "REVIEWED";
  }
  if (["PROGRESS", "RESOURCE_REQUEST"].includes(d.kind) && !d.note) throw invalid("Enter the update.");
  const t = nowIso();
  await tx(db, async (c) => {
    const seq = Number((await one<{ s: number }>(c, "SELECT COALESCE(MAX(seq),0) + 1 AS s FROM ops_activity_updates WHERE activity_id = ?", id))!.s);
    await run(c, "INSERT INTO ops_activity_updates (id, activity_id, seq, kind, note, personnel, from_status, to_status, recorded_by, at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      newId("oau"), id, seq, d.kind, d.note ?? d.outcome, d.personnel ?? null, to ? a.status : null, to, actor.userId, t);
    const sets = ["version = version + 1", "updated_at = ?"];
    const params: unknown[] = [t];
    if (to) { sets.push("status = ?"); params.push(to); }
    if (to === "COMPLETED") { sets.push("outcome_summary = ?", "end_date = COALESCE(end_date, ?)"); params.push(d.outcome, today()); }
    if (d.kind === "REVIEW") { sets.push("review_summary = ?"); params.push(d.note); }
    if (d.personnel !== null && d.personnel !== undefined) { sets.push("personnel_committed = ?"); params.push(d.personnel); }
    await run(c, `UPDATE ops_activities SET ${sets.join(", ")} WHERE id = ?`, ...params, id);
    await audit(c, { actorId: actor.userId, action: `opsadmin.${d.kind.toLowerCase()}`, category: "BUSINESS", entityType: "ops_activity", entityId: id, orgUnitId: a.responsible_unit_id, details: { from: a.status, to } });
  });
}

/** Counts for dashboards (scope-limited). */
export async function opsSummary(db: DB, actor: Actor) {
  const s = scopeFor(actor, "opsadmin.view");
  if (!s.national && !s.units.length) return null;
  const w = scopeWhere(actor, "opsadmin.view", "responsible_unit_id");
  const rows = await all<{ category: OpsCategory; status: string; n: number; personnel: number }>(db,
    `SELECT category, status, COUNT(*) AS n, SUM(personnel_committed) AS personnel FROM ops_activities WHERE ${w.sql} GROUP BY category, status`, ...w.params);
  return rows.map((r) => ({ ...r, n: Number(r.n), personnel: Number(r.personnel ?? 0) }));
}

// ── Mining security services ────────────────────────────────────────────────────────────────────────
export async function listPartners(db: DB, actor: Actor) {
  await requirePermission(db, actor, "secservice.view");
  return all<{ id: string; code: string; name: string; sector: string }>(db, "SELECT id, code, name, sector FROM partner_organisations WHERE status = 'ACTIVE' ORDER BY name");
}
export interface AgreementRow { id: string; reference: string; partner: string; partner_id: string; area: string; area_id: string; responsible_unit: string; responsible_unit_id: string; authorisation_ref: string; valid_from: string; valid_to: string | null; officers_required: number; officers_assigned: number; status: string; last_report: string | null }
const GSELECT = `SELECT g.id, g.reference, p.name AS partner, g.partner_id, a.name AS area, g.area_id, o.name AS responsible_unit, g.responsible_unit_id, g.authorisation_ref, g.valid_from, g.valid_to,
    g.officers_required, (SELECT COUNT(*) FROM personnel_assignments x WHERE x.area_id = g.area_id AND x.status IN ('APPROVED','ACTIVE')) AS officers_assigned, g.status,
    (SELECT MAX(r.period_to) FROM security_service_reports r WHERE r.agreement_id = g.id) AS last_report
  FROM security_service_agreements g JOIN partner_organisations p ON p.id = g.partner_id JOIN operational_areas a ON a.id = g.area_id JOIN org_units o ON o.id = g.responsible_unit_id`;
export async function listAgreements(db: DB, actor: Actor) {
  await requirePermission(db, actor, "secservice.view");
  const w = scopeWhere(actor, "secservice.view", "g.responsible_unit_id");
  return all<AgreementRow>(db, `${GSELECT} WHERE ${w.sql} ORDER BY g.status, p.name`, ...w.params);
}
export async function getAgreement(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "secservice.view");
  const g = await one<AgreementRow>(db, `${GSELECT} WHERE g.id = ?`, id);
  if (!g || !can(actor, "secservice.view", g.responsible_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "secservice.view", outcome: "DENIED", category: "SECURITY", entityType: "security_service_agreement", entityId: id });
    throw notFound();
  }
  const reports = await all<{ id: string; period_from: string; period_to: string; officers_provided: number; service_status: string; follow_up: string; summary: string | null; by: string; created_at: string }>(db,
    "SELECT r.id, r.period_from, r.period_to, r.officers_provided, r.service_status, r.follow_up, r.summary, u.display_name AS `by`, r.created_at FROM security_service_reports r JOIN users u ON u.id = r.recorded_by WHERE r.agreement_id = ? ORDER BY r.period_to DESC", id);
  return { agreement: g, reports, canManage: can(actor, "secservice.manage", g.responsible_unit_id) };
}

const agreementSchema = z.object({
  partnerId: z.string().min(1, "Select the partner organisation."),
  areaId: z.string().min(1, "Select the administrative duty area."),
  authorisationRef: z.string().trim().min(3, "Record the authorisation reference.").max(60),
  validFrom: date,
  validTo: z.string().optional().transform((v) => v || null),
  officersRequired: z.coerce.number().int().min(0).max(10000),
});
export async function createAgreement(db: DB, actor: Actor, input: z.input<typeof agreementSchema>) {
  const d = agreementSchema.parse(input);
  const area = await one<{ responsible_unit_id: string }>(db, "SELECT responsible_unit_id FROM operational_areas WHERE id = ? AND status = 'ACTIVE'", d.areaId);
  if (!area) throw invalid("Select an active duty area.");
  await requirePermission(db, actor, "secservice.manage", area.responsible_unit_id, { type: "security_service_agreement" });
  if (!await one(db, "SELECT id FROM partner_organisations WHERE id = ? AND status = 'ACTIVE'", d.partnerId)) throw invalid("Select an active partner organisation.");
  if (d.validTo && d.validTo < d.validFrom) throw invalid("The end date must be after the start date.");
  screen(d.authorisationRef);
  const id = newId("ssa");
  const ref = await nextReference(db, "MSS", "security_service_agreements");
  const t = nowIso();
  await run(db, `INSERT INTO security_service_agreements (id, reference, partner_id, area_id, responsible_unit_id, authorisation_ref, valid_from, valid_to, officers_required, status, created_by, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?, 'ACTIVE', ?,?,?)`, id, ref, d.partnerId, d.areaId, area.responsible_unit_id, d.authorisationRef, d.validFrom, d.validTo, d.officersRequired, actor.userId, t, t);
  await audit(db, { actorId: actor.userId, action: "secservice.agreement.create", category: "BUSINESS", entityType: "security_service_agreement", entityId: id, orgUnitId: area.responsible_unit_id, details: { reference: ref } });
  return { id, reference: ref };
}

const reportSchema = z.object({
  periodFrom: date, periodTo: date,
  officersProvided: z.coerce.number().int().min(0).max(10000),
  serviceStatus: z.enum(["DELIVERED", "PARTIAL", "NOT_DELIVERED"]),
  followUp: z.enum(["NONE", "OPEN", "DONE"]).default("NONE"),
  summary: z.string().trim().max(300).optional().transform((v) => v || null),
});
export async function recordServiceReport(db: DB, actor: Actor, agreementId: string, input: z.input<typeof reportSchema>) {
  const d = reportSchema.parse(input);
  const g = await one<{ responsible_unit_id: string; status: string }>(db, "SELECT responsible_unit_id, status FROM security_service_agreements WHERE id = ?", agreementId);
  if (!g) throw notFound();
  await requirePermission(db, actor, "secservice.manage", g.responsible_unit_id, { type: "security_service_agreement", id: agreementId });
  if (d.periodTo < d.periodFrom) throw invalid("The period end must be after its start.");
  if (d.periodTo > today()) throw invalid("A service report covers a past period.");
  if (d.serviceStatus !== "DELIVERED" && !d.summary) throw invalid("Explain a partial or undelivered service in the summary.");
  screen(d.summary);
  const id = newId("ssr");
  await run(db, "INSERT INTO security_service_reports (id, agreement_id, period_from, period_to, officers_provided, service_status, follow_up, summary, recorded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    id, agreementId, d.periodFrom, d.periodTo, d.officersProvided, d.serviceStatus, d.followUp, d.summary, actor.userId, nowIso());
  await audit(db, { actorId: actor.userId, action: "secservice.report", category: "BUSINESS", entityType: "security_service_agreement", entityId: agreementId, orgUnitId: g.responsible_unit_id, details: { status: d.serviceStatus } });
  return id;
}

/** Offices a user could name as the authorising office (held offices plus those above them) — for the register form. */
export async function authorisingOffices(db: DB, actor: Actor) {
  const held = await officesHeld(db, actor);
  return held.map((h) => ({ id: h.positionId, title: h.title }));
}

/** Choices for the operations-administration forms, limited to the actor's management scope. */
export async function opsFormOptions(db: DB, actor: Actor) {
  const unitsFor = async (perm: "opsadmin.manage" | "secservice.manage") => {
    const s = scopeFor(actor, perm);
    if (s.national) return all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE status = 'ACTIVE' AND unit_type IN ('SERVICE_HQ','PROVINCIAL_DIVISION','FORMATION','DISTRICT','COMPANY','DETACHMENT') ORDER BY unit_type, name");
    if (!s.units.length) return [];
    return all<{ id: string; name: string }>(db, `SELECT id, name FROM org_units WHERE status = 'ACTIVE' AND id IN (${inList(s.units)}) AND unit_type IN ('PROVINCIAL_DIVISION','FORMATION','DISTRICT','STATION','COMPANY','DETACHMENT') ORDER BY name`, ...s.units);
  };
  const manageUnits = await unitsFor("opsadmin.manage");
  const serviceUnits = await unitsFor("secservice.manage");
  const areas = serviceUnits.length
    ? await all<{ id: string; name: string }>(db, `SELECT id, name FROM operational_areas WHERE status = 'ACTIVE' ${scopeFor(actor, "secservice.manage").national ? "" : `AND responsible_unit_id IN (${inList(serviceUnits.map((u) => u.id))})`} ORDER BY name`, ...(scopeFor(actor, "secservice.manage").national ? [] : serviceUnits.map((u) => u.id)))
    : [];
  const partners = serviceUnits.length ? await all<{ id: string; name: string }>(db, "SELECT id, name FROM partner_organisations WHERE status = 'ACTIVE' ORDER BY name") : [];
  const allUnits = manageUnits.length ? await all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE status = 'ACTIVE' AND unit_type IN ('PROVINCIAL_DIVISION','FORMATION','DISTRICT','COMPANY') ORDER BY name") : [];
  return { manageUnits, serviceUnits, areas, partners, coordinatingUnits: allUnits, offices: await authorisingOffices(db, actor) };
}
