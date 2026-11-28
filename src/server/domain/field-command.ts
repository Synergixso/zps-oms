/**
 * Kamfinsa Mobile Unit field command workspaces (institutional compliance directive, 28 Nov 2026, §9–§13).
 *
 * Three workspaces, each available only to holders (substantive, or acting with the delegated action) of the matching
 * command OFFICE — never by role or rank alone:
 *  - Platoon Commander: directly in charge of the officers on the ground. Sees the field chain below the office, the
 *    platoon's personnel and availability (only where the holder's personnel scope also covers the platoon), and keeps
 *    the daily attendance (muster) register: one administrative status per officer per day.
 *  - Area Commander: area-level coordination. Sees the platoons under the area command with attendance COUNTS (no
 *    individual records, no personnel management — that remains the Platoon Commander's), reports awaiting it, both
 *    reporting channels, and keeps the partner-organisation engagement register (metadata only, no content field).
 *  - Company / Deputy Company / Detachment Commander: subordinate Detachments or Platoons with duty stations, commander
 *    offices and holders, serving strength (counts), reports received.
 * Administrative only: no location, route, deployment, tactical or intelligence fields; free text is screened.
 * Every change is audited; every refusal is a SECURITY audit event; out-of-scope ids are "not found".
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { addDays, forbidden, invalid, newId, nextReference, notFound, nowIso, today } from "./core";
import { type Actor, can } from "./policy";
import { type CommandAction, type Held, POSITION_TYPES, RELATIONSHIP_LABEL, authorityFor, designatedRecipients, officesHeld, screen } from "./command";
import { availabilityGroup, type AvailabilityGroup } from "./schedule";

export const MUSTER_STATUS = { PRESENT: "Present", ON_LEAVE: "On leave", SICK: "Sick", OFF_DUTY: "Off duty", ON_COURSE: "On course", ABSENT: "Absent" } as const;
export type MusterStatus = keyof typeof MUSTER_STATUS;
export const ENGAGEMENT_TYPE = {
  SECURITY_COORDINATION_MEETING: "Security coordination meeting", PARTNER_LIAISON_MEETING: "Partner liaison meeting", COURTESY_CALL: "Courtesy call",
  JOINT_ADMIN_MEETING: "Joint administrative meeting", CORRESPONDENCE: "Official correspondence",
} as const;
export type EngagementType = keyof typeof ENGAGEMENT_TYPE;
export const FOLLOW_UP = { NONE: "No follow-up", OPEN: "Follow-up open", DONE: "Follow-up completed" } as const;
/** How far back a muster may be recorded or corrected (administrative control against late rewriting). */
export const MUSTER_CORRECTION_DAYS = 7;

export type FieldKind = "platoon" | "area" | "company";
export const FIELD_OFFICE_TYPES: Record<FieldKind, string[]> = {
  platoon: ["SECTION_PLATOON_COMMANDER"],
  area: ["AREA_COMMANDER"],
  company: ["COMPANY_COMMANDER", "DEPUTY_COMPANY_COMMANDER", "DETACHMENT_COMMANDER"],
};

/** Offices of the given kind the actor holds now (one row per office; substantive preferred over acting). */
export async function fieldOffices(db: DB, actor: Actor, kind: FieldKind): Promise<Held[]> {
  const held = (await officesHeld(db, actor)).filter((h) => FIELD_OFFICE_TYPES[kind].includes(h.positionType));
  const out = new Map<string, Held>();
  for (const h of held) if (!out.has(h.positionId) || h.authority === "SUBSTANTIVE") out.set(h.positionId, h);
  return [...out.values()];
}

/** The held office, or "not found" (with a SECURITY audit event) when the actor does not hold it. */
async function heldOffice(db: DB, actor: Actor, positionId: string, kind: FieldKind): Promise<Held> {
  const h = (await fieldOffices(db, actor, kind)).find((x) => x.positionId === positionId);
  if (!h) {
    await audit(db, { actorId: actor.userId, action: `field.${kind}.view`, outcome: "DENIED", category: "SECURITY", entityType: "command_position", entityId: positionId });
    throw notFound();
  }
  return h;
}

async function requireAction(db: DB, actor: Actor, positionId: string, action: CommandAction, entityType: string) {
  const a = await authorityFor(db, actor, positionId, action);
  if (!a) {
    await audit(db, { actorId: actor.userId, action: `field.${action.toLowerCase()}`, outcome: "DENIED", category: "SECURITY", entityType, details: { position: positionId } });
    throw forbidden("You do not hold this office with authority for this action.");
  }
  return a;
}

const now = () => nowIso();
async function holders(db: DB, positionId: string) {
  return all<{ name: string; authority: "SUBSTANTIVE" | "ACTING" }>(db,
    `SELECT u.display_name AS name, 'SUBSTANTIVE' AS authority FROM position_appointments a JOIN users u ON u.id = a.user_id
      WHERE a.position_id = ? AND a.ended_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?)
     UNION ALL
     SELECT u.display_name, 'ACTING' FROM acting_appointments x JOIN users u ON u.id = x.acting_user_id
      WHERE x.position_id = ? AND x.revoked_at IS NULL AND x.valid_from <= ? AND x.valid_to > ?`, positionId, now(), now(), positionId, now(), now());
}
async function position(db: DB, id: string) {
  return (await one<{ id: string; title: string; position_type: string; org_unit_id: string; unit: string; duty_station: string | null }>(db,
    "SELECT p.id, p.title, p.position_type, p.org_unit_id, o.name AS unit, o.duty_station FROM command_positions p JOIN org_units o ON o.id = p.org_unit_id WHERE p.id = ?", id))!;
}
const subtree = async (db: DB, unitId: string) => (await all<{ d: string }>(db, "SELECT descendant_id AS d FROM org_unit_closure WHERE ancestor_id = ?", unitId)).map((r) => r.d);
const inList = (xs: unknown[]) => xs.map(() => "?").join(",") || "NULL";
const servingCount = async (db: DB, unitId: string) => {
  const units = await subtree(db, unitId);
  return Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM personnel_records WHERE employment_status = 'SERVING' AND home_unit_id IN (${inList(units)})`, ...units))?.c ?? 0);
};

/** Offices below this one through PRIMARY_COMMAND (the field chain), depth-first, with their current holders. */
export async function commandSubordinates(db: DB, positionId: string) {
  const out: Array<{ positionId: string; title: string; type: string; typeLabel: string; unit: string; depth: number; holders: Awaited<ReturnType<typeof holders>> }> = [];
  const seen = new Set([positionId]);
  const walk = async (id: string, depth: number) => {
    const rows = await all<{ id: string; title: string; position_type: string; unit: string }>(db,
      `SELECT p.id, p.title, p.position_type, o.name AS unit FROM reporting_relationships r JOIN command_positions p ON p.id = r.subordinate_position_id JOIN org_units o ON o.id = p.org_unit_id
        WHERE r.superior_position_id = ? AND r.relationship_type = 'PRIMARY_COMMAND' AND r.ended_at IS NULL AND r.valid_from <= ? AND (r.valid_to IS NULL OR r.valid_to > ?) AND p.status = 'ACTIVE'
        ORDER BY p.title`, id, now(), now());
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ positionId: r.id, title: r.title, type: r.position_type, typeLabel: POSITION_TYPES[r.position_type]?.label ?? r.position_type, unit: r.unit, depth, holders: await holders(db, r.id) });
      await walk(r.id, depth + 1);
    }
  };
  await walk(positionId, 1);
  return out;
}

async function pendingReports(db: DB, positionId: string) {
  return all<{ report_id: string; reference: string; category: string; reporter: string; submitted: string; recipient_status: string; recipient_kind: string }>(db,
    `SELECT r.id AS report_id, r.reference, r.category, p.title AS reporter, r.updated_at AS submitted, rc.status AS recipient_status, rc.recipient_kind
       FROM report_recipients rc JOIN status_reports r ON r.id = rc.report_id JOIN command_positions p ON p.id = r.reporter_position_id
      WHERE rc.position_id = ? AND r.status = 'SUBMITTED' AND rc.status IN ('PENDING','ACKNOWLEDGED') ORDER BY r.updated_at DESC LIMIT 50`, positionId);
}
async function openDirectives(db: DB, positionId: string) {
  return all<{ id: string; reference: string; subject: string; status: string; due_date: string | null; direction: "RECEIVED" | "ISSUED"; counterpart: string }>(db,
    `SELECT d.id, d.reference, d.subject, d.status, d.due_date, IF(d.recipient_position_id = ?, 'RECEIVED', 'ISSUED') AS direction,
            IF(d.recipient_position_id = ?, ip.title, rp.title) AS counterpart
       FROM command_directives d JOIN command_positions ip ON ip.id = d.issuer_position_id JOIN command_positions rp ON rp.id = d.recipient_position_id
      WHERE (d.recipient_position_id = ? OR d.issuer_position_id = ?) AND d.status IN ('ISSUED','ACKNOWLEDGED','IN_PROGRESS') ORDER BY d.updated_at DESC LIMIT 50`,
    positionId, positionId, positionId, positionId);
}
async function musterCounts(db: DB, unitId: string, date: string) {
  const m = await one<{ id: string; recorded: string; by: string }>(db,
    "SELECT m.id, m.updated_at AS recorded, u.display_name AS `by` FROM platoon_musters m JOIN users u ON u.id = m.recorded_by WHERE m.unit_id = ? AND m.muster_date = ?", unitId, date);
  if (!m) return null;
  const rows = await all<{ status: MusterStatus; n: number }>(db, "SELECT status, COUNT(*) AS n FROM platoon_muster_entries WHERE muster_id = ? GROUP BY status", m.id);
  const counts = Object.fromEntries(Object.keys(MUSTER_STATUS).map((k) => [k, 0])) as Record<MusterStatus, number>;
  for (const r of rows) counts[r.status] = Number(r.n);
  return { recorded: m.recorded, by: m.by, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

// ── Platoon Commander ───────────────────────────────────────────────────────────────────────────────────
export async function platoonWorkspace(db: DB, actor: Actor, positionId: string, date = today()) {
  const held = await heldOffice(db, actor, positionId, "platoon");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) date = today();
  const pos = await position(db, positionId);
  const units = await subtree(db, pos.org_unit_id);
  // Personnel data: the office confers command authority; reading the registry additionally needs personnel scope.
  const personnelVisible = can(actor, "personnel.view", pos.org_unit_id);
  const personnel = personnelVisible
    ? await all<{ id: string; personnel_ref: string; surname: string; first_names: string; rank_code: string; unit: string; disposition_status: string }>(db,
      `SELECT p.id, p.personnel_ref, p.surname, p.first_names, p.rank_code, o.name AS unit, p.disposition_status FROM personnel_records p JOIN org_units o ON o.id = p.home_unit_id
        WHERE p.employment_status = 'SERVING' AND p.home_unit_id IN (${inList(units)}) ORDER BY o.name, p.surname, p.first_names`, ...units)
    : [];
  const availability = personnel.reduce<Record<AvailabilityGroup, number>>((m, p) => ({ ...m, [availabilityGroup(p.disposition_status)]: m[availabilityGroup(p.disposition_status)] + 1 }),
    { AVAILABLE: 0, IN_PROCESS: 0, ON_ASSIGNMENT: 0, UNAVAILABLE: 0 });
  const muster = await one<{ id: string; version: number; updated_at: string; by: string; authority: string }>(db,
    "SELECT m.id, m.version, m.updated_at, u.display_name AS `by`, m.authority FROM platoon_musters m JOIN users u ON u.id = m.recorded_by WHERE m.unit_id = ? AND m.muster_date = ?", pos.org_unit_id, date);
  const entries = muster && personnelVisible
    ? Object.fromEntries((await all<{ personnel_id: string; status: MusterStatus }>(db, "SELECT personnel_id, status FROM platoon_muster_entries WHERE muster_id = ?", muster.id)).map((e) => [e.personnel_id, e.status]))
    : {};
  const history = await all<{ muster_date: string; present: number; total: number }>(db,
    `SELECT m.muster_date, SUM(e.status = 'PRESENT') AS present, COUNT(*) AS total FROM platoon_musters m JOIN platoon_muster_entries e ON e.muster_id = m.id
      WHERE m.unit_id = ? AND m.muster_date >= ? GROUP BY m.muster_date ORDER BY m.muster_date DESC`, pos.org_unit_id, addDays(today(), -13));
  return {
    office: { ...pos, authority: held.authority }, date, canRecord: held.actions.includes("RECORD_ATTENDANCE") && personnelVisible && date >= addDays(today(), -MUSTER_CORRECTION_DAYS),
    chain: await commandSubordinates(db, positionId), superiors: await superiorsOf(db, positionId),
    personnelVisible, personnel, availability, muster: muster ? { ...muster, entries } : null,
    history: history.map((h) => ({ date: h.muster_date, present: Number(h.present), total: Number(h.total) })),
    pending: await pendingReports(db, positionId), directives: await openDirectives(db, positionId),
  };
}

async function superiorsOf(db: DB, positionId: string) {
  const r = await designatedRecipients(db, positionId);
  const one_ = async (rel: { superior_position_id: string; relationship_type: keyof typeof RELATIONSHIP_LABEL; channel: string | null }, kind: "PRIMARY" | "PARALLEL") => {
    const p = await position(db, rel.superior_position_id);
    return { positionId: p.id, title: p.title, unit: p.unit, kind, relationship: RELATIONSHIP_LABEL[rel.relationship_type], channel: rel.channel, holders: await holders(db, p.id) };
  };
  return [...await Promise.all(r.primary.map((x) => one_(x, "PRIMARY"))), ...await Promise.all(r.parallel.map((x) => one_(x, "PARALLEL")))];
}

const musterSchema = z.object({
  positionId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the muster date."),
  entries: z.record(z.string(), z.enum(Object.keys(MUSTER_STATUS) as [MusterStatus, ...MusterStatus[]])),
});

/**
 * Records (or corrects, within MUSTER_CORRECTION_DAYS) the platoon's attendance for one day. Needs the Platoon
 * Commander office with RECORD_ATTENDANCE (substantive holders have it; acting holders only if delegated) AND personnel
 * scope over the platoon. Every serving officer of the platoon must have exactly one status; no one else may.
 */
export async function recordMuster(db: DB, actor: Actor, input: z.input<typeof musterSchema>) {
  const d = musterSchema.parse(input);
  const pos = await one<{ id: string; position_type: string; org_unit_id: string }>(db, "SELECT id, position_type, org_unit_id FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.positionId);
  if (!pos || pos.position_type !== "SECTION_PLATOON_COMMANDER") throw invalid("Attendance is recorded by a Platoon Commander office.");
  const auth = await requireAction(db, actor, pos.id, "RECORD_ATTENDANCE", "platoon_muster");
  if (!can(actor, "personnel.view", pos.org_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "field.muster.record", outcome: "DENIED", category: "SECURITY", entityType: "platoon_muster", orgUnitId: pos.org_unit_id, details: { reason: "no personnel scope" } });
    throw forbidden("Your personnel scope does not cover this platoon.");
  }
  if (d.date > today()) throw invalid("Attendance cannot be recorded for a future date.");
  if (d.date < addDays(today(), -MUSTER_CORRECTION_DAYS)) throw invalid(`Attendance can be recorded or corrected for the last ${MUSTER_CORRECTION_DAYS} days only.`);
  const units = await subtree(db, pos.org_unit_id);
  const members = new Set((await all<{ id: string }>(db, `SELECT id FROM personnel_records WHERE employment_status = 'SERVING' AND home_unit_id IN (${inList(units)})`, ...units)).map((r) => r.id));
  const given = Object.keys(d.entries);
  const outsiders = given.filter((id) => !members.has(id));
  if (outsiders.length) {
    await audit(db, { actorId: actor.userId, action: "field.muster.record", outcome: "DENIED", category: "SECURITY", entityType: "platoon_muster", orgUnitId: pos.org_unit_id, details: { outsiders: outsiders.length } });
    throw invalid("Only serving officers of this platoon can be recorded.");
  }
  const missing = [...members].filter((id) => !(id in d.entries));
  if (missing.length) throw invalid(`Record a status for every serving officer of the platoon (${missing.length} missing).`);
  const t = nowIso();
  return tx(db, async (c) => {
    const existing = await one<{ id: string; version: number }>(c, "SELECT id, version FROM platoon_musters WHERE unit_id = ? AND muster_date = ? FOR UPDATE", pos.org_unit_id, d.date);
    const id = existing?.id ?? newId("mst");
    if (existing) {
      await run(c, "UPDATE platoon_musters SET recorded_by = ?, position_id = ?, authority = ?, version = version + 1, updated_at = ? WHERE id = ?", actor.userId, pos.id, auth.authority, t, id);
      await run(c, "DELETE FROM platoon_muster_entries WHERE muster_id = ?", id);
    } else {
      await run(c, "INSERT INTO platoon_musters (id, unit_id, position_id, muster_date, recorded_by, authority, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", id, pos.org_unit_id, pos.id, d.date, actor.userId, auth.authority, t, t);
    }
    for (const [pid, status] of Object.entries(d.entries)) await run(c, "INSERT INTO platoon_muster_entries (muster_id, personnel_id, status) VALUES (?,?,?)", id, pid, status);
    const counts = Object.values(d.entries).reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {});
    await audit(c, { actorId: actor.userId, action: existing ? "field.muster.correct" : "field.muster.record", category: "BUSINESS", entityType: "platoon_muster", entityId: id, orgUnitId: pos.org_unit_id,
      details: { date: d.date, office: pos.id, authority: auth.authority, counts, version: (existing?.version ?? 0) + 1 } });
    return id;
  });
}

// ── Area Commander ──────────────────────────────────────────────────────────────────────────────────────
export async function areaWorkspace(db: DB, actor: Actor, positionId: string) {
  const held = await heldOffice(db, actor, positionId, "area");
  const pos = await position(db, positionId);
  const t = today();
  const platoons = [];
  for (const s of (await commandSubordinates(db, positionId)).filter((x) => x.type === "SECTION_PLATOON_COMMANDER")) {
    const p = await position(db, s.positionId);
    // Counts only: the Area Commander coordinates; individual attendance and personnel management stay with the Platoon Commander.
    platoons.push({ ...s, strength: await servingCount(db, p.org_unit_id), today: await musterCounts(db, p.org_unit_id, t), lastMuster: (await one<{ d: string }>(db, "SELECT MAX(muster_date) AS d FROM platoon_musters WHERE unit_id = ?", p.org_unit_id))?.d ?? null });
  }
  const submitted = await all<{ id: string; reference: string; category: string; status: string; updated_at: string }>(db,
    "SELECT id, reference, category, status, updated_at FROM status_reports WHERE reporter_position_id = ? AND status <> 'DRAFT' ORDER BY updated_at DESC LIMIT 10", positionId);
  const recipients = submitted.length
    ? await all<{ report_id: string; title: string; recipient_kind: string; status: string }>(db,
      `SELECT rc.report_id, p.title, rc.recipient_kind, rc.status FROM report_recipients rc JOIN command_positions p ON p.id = rc.position_id WHERE rc.report_id IN (${inList(submitted)}) ORDER BY rc.recipient_kind DESC, p.title`, ...submitted.map((r) => r.id))
    : [];
  return {
    office: { ...pos, authority: held.authority }, canRecordEngagement: held.actions.includes("RECORD_ENGAGEMENT"),
    platoons, channels: await superiorsOf(db, positionId), pending: await pendingReports(db, positionId), directives: await openDirectives(db, positionId),
    submitted: submitted.map((r) => ({ ...r, recipients: recipients.filter((x) => x.report_id === r.id) })),
    engagements: await all<{ id: string; reference: string; engagement_date: string; partner: string; engagement_type: EngagementType; record_reference: string | null; follow_up: keyof typeof FOLLOW_UP; recorded_by: string }>(db,
      `SELECT e.id, e.reference, e.engagement_date, e.partner, e.engagement_type, e.record_reference, e.follow_up, u.display_name AS recorded_by FROM area_engagements e JOIN users u ON u.id = e.recorded_by
        WHERE e.position_id = ? ORDER BY e.engagement_date DESC, e.created_at DESC LIMIT 100`, positionId),
  };
}

const engagementSchema = z.object({
  positionId: z.string().min(1),
  engagementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date."),
  partner: z.string().trim().min(2, "Enter the partner organisation.").max(120),
  engagementType: z.enum(Object.keys(ENGAGEMENT_TYPE) as [EngagementType, ...EngagementType[]]),
  recordReference: z.string().trim().max(60).optional().transform((v) => v || null),
  followUp: z.enum(["NONE", "OPEN", "DONE"]).default("NONE"),
});

/** Records a partner-organisation engagement of the Area Commander office: metadata only (no minutes or content). */
export async function recordEngagement(db: DB, actor: Actor, input: z.input<typeof engagementSchema>) {
  const d = engagementSchema.parse(input);
  const pos = await one<{ id: string; position_type: string; org_unit_id: string }>(db, "SELECT id, position_type, org_unit_id FROM command_positions WHERE id = ? AND status = 'ACTIVE'", d.positionId);
  if (!pos || pos.position_type !== "AREA_COMMANDER") throw invalid("Engagements are recorded by an Area Commander office.");
  const auth = await requireAction(db, actor, pos.id, "RECORD_ENGAGEMENT", "area_engagement");
  screen(d.partner, d.recordReference);
  if (d.engagementDate > addDays(today(), 60)) throw invalid("An engagement can be recorded at most 60 days ahead.");
  const id = newId("eng");
  const ref = await nextReference(db, "ENG", "area_engagements");
  const t = nowIso();
  await run(db, `INSERT INTO area_engagements (id, reference, position_id, engagement_date, partner, engagement_type, record_reference, follow_up, recorded_by, authority, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, id, ref, pos.id, d.engagementDate, d.partner, d.engagementType, d.recordReference, d.followUp, actor.userId, auth.authority, t, t);
  await audit(db, { actorId: actor.userId, action: "field.engagement.record", category: "BUSINESS", entityType: "area_engagement", entityId: id, orgUnitId: pos.org_unit_id,
    details: { reference: ref, type: d.engagementType, date: d.engagementDate, authority: auth.authority } });
  return { id, reference: ref };
}

export async function setEngagementFollowUp(db: DB, actor: Actor, id: string, followUp: keyof typeof FOLLOW_UP) {
  if (!(followUp in FOLLOW_UP)) throw invalid("Select a follow-up status.");
  const e = await one<{ id: string; position_id: string; follow_up: string; org_unit_id: string }>(db,
    "SELECT e.id, e.position_id, e.follow_up, p.org_unit_id FROM area_engagements e JOIN command_positions p ON p.id = e.position_id WHERE e.id = ?", id);
  if (!e || !(await fieldOffices(db, actor, "area")).some((h) => h.positionId === e.position_id)) {
    await audit(db, { actorId: actor.userId, action: "field.engagement.update", outcome: "DENIED", category: "SECURITY", entityType: "area_engagement", entityId: id });
    throw notFound();
  }
  await requireAction(db, actor, e.position_id, "RECORD_ENGAGEMENT", "area_engagement");
  await run(db, "UPDATE area_engagements SET follow_up = ?, version = version + 1, updated_at = ? WHERE id = ?", followUp, nowIso(), id);
  await audit(db, { actorId: actor.userId, action: "field.engagement.update", category: "BUSINESS", entityType: "area_engagement", entityId: id, orgUnitId: e.org_unit_id, details: { from: e.follow_up, to: followUp } });
}

// ── Company, Deputy Company and Detachment Commanders ───────────────────────────────────────────────────
export async function companyWorkspace(db: DB, actor: Actor, positionId: string) {
  const held = await heldOffice(db, actor, positionId, "company");
  const pos = await position(db, positionId);
  const childType = pos.position_type === "DETACHMENT_COMMANDER" ? "PLATOON" : "DETACHMENT";
  const children = await all<{ id: string; name: string; duty_station: string | null }>(db,
    `SELECT o.id, o.name, o.duty_station FROM org_relationships r JOIN org_units o ON o.id = r.child_id
      WHERE r.parent_id = ? AND r.effective_to IS NULL AND o.unit_type = ? AND o.status = 'ACTIVE' ORDER BY o.synthetic, o.name`, pos.org_unit_id, childType);
  const units = [];
  for (const c of children) {
    const offices = await all<{ id: string; title: string }>(db, "SELECT id, title FROM command_positions WHERE org_unit_id = ? AND status = 'ACTIVE' AND position_type IN ('DETACHMENT_COMMANDER','SECTION_PLATOON_COMMANDER') ORDER BY title", c.id);
    const commanders = await Promise.all(offices.map(async (o) => ({ ...o, holders: await holders(db, o.id) })));
    // Latest report from the unit's commander that was addressed to THIS office (nothing beyond what it received).
    const latest = offices.length
      ? await one<{ id: string; reference: string; progress_status: string; reporting_date: string }>(db,
        `SELECT r.id, r.reference, r.progress_status, r.reporting_date FROM status_reports r JOIN report_recipients rc ON rc.report_id = r.id AND rc.position_id = ?
          WHERE r.reporter_position_id IN (${inList(offices)}) AND r.status <> 'DRAFT' ORDER BY r.created_at DESC LIMIT 1`, positionId, ...offices.map((o) => o.id))
      : null;
    units.push({ ...c, strength: await servingCount(db, c.id), commanders, latest: latest ?? null });
  }
  return {
    office: { ...pos, authority: held.authority }, childLabel: childType === "PLATOON" ? "Platoons" : "Detachments", units,
    strength: await servingCount(db, pos.org_unit_id), superiors: await superiorsOf(db, positionId), chain: await commandSubordinates(db, positionId),
    pending: await pendingReports(db, positionId), directives: await openDirectives(db, positionId),
  };
}
