/**
 * M-ASG — Operational (duty) areas, assignments, transfers, tenure, exceptions, renewals (Directive §8–§10).
 *
 * Boundary: an assignment is an ADMINISTRATIVE DUTY-AREA RECORD. No location, route, position,
 * GPS or live-movement data exists anywhere in this module.
 *
 * Rules
 *  - One current assignment per officer (PENDING_APPROVAL/APPROVED/ACTIVE/TRANSFER_PENDING) unless an
 *    APPROVED overlap exception exists. Enforced inside a transaction with the personnel row locked.
 *  - Minimum tenure (setting assignment.minimum_tenure_days, proposed 365) counted from the continuous
 *    start date. Routine release or transfer before it is met is refused unless an APPROVED
 *    EARLY_RELEASE exception for that assignment is linked (it is then consumed: USED).
 *  - Renewal preserves the continuous start date and sets the next review date; a new area
 *    (transfer) starts a new assignment with its own commencement date.
 *  - Approvals require an ASSIGNMENT delegation at the responsible unit or an ancestor plus a business
 *    role there (policy.approvalUnitFor). The proposer/initiator can never approve their own matter.
 *  - Every state change writes approval_actions, disposition_history and the audit trail.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { addDays, conflict, forbidden, invalid, newId, notFound, notify, nowIso, today } from "./core";
import { type Actor, approvalUnitFor, can, requirePermission, unitsFor } from "./policy";
import { eligibilityOf, recordDisposition, type Disposition } from "./personnel";

export const CURRENT_STATUSES = ["PENDING_APPROVAL", "APPROVED", "ACTIVE", "TRANSFER_PENDING"] as const;
export const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved — pending commencement",
  ACTIVE: "Active",
  TRANSFER_PENDING: "Transfer pending",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

// ── Settings ────────────────────────────────────────────────────────────────
export async function setting(db: DB, key: string, fallback: number): Promise<number> {
  const r = await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = ?", key);
  const n = Number(r?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
export async function tenurePolicy(db: DB) {
  return {
    minimumDays: await setting(db, "assignment.minimum_tenure_days", 365),
    renewalDays: await setting(db, "assignment.renewal_period_days", 365),
    reviewWindowDays: await setting(db, "assignment.review_window_days", 30),
  };
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86400000);

export interface Tenure {
  commencement: string;
  continuousStart: string;
  elapsedDays: number;
  minimumDays: number;
  remainingDays: number;
  completionDate: string;
  minimumMet: boolean;
  reviewDate: string;
  reviewEligible: boolean;
  renewalEligible: boolean;
}

/** Directive §10.2 tenure arithmetic, evaluated at `asOf` (default today). */
export function computeTenure(a: { commencement_date: string; continuous_start_date: string; review_date: string }, policy: { minimumDays: number; reviewWindowDays: number }, asOf = today()): Tenure {
  const elapsed = Math.max(0, daysBetween(a.continuous_start_date, asOf));
  const completion = addDays(a.continuous_start_date, policy.minimumDays);
  const reviewEligible = daysBetween(asOf, a.review_date) <= policy.reviewWindowDays;
  return {
    commencement: a.commencement_date,
    continuousStart: a.continuous_start_date,
    elapsedDays: elapsed,
    minimumDays: policy.minimumDays,
    remainingDays: Math.max(0, policy.minimumDays - elapsed),
    completionDate: completion,
    minimumMet: elapsed >= policy.minimumDays,
    reviewDate: a.review_date,
    reviewEligible,
    renewalEligible: reviewEligible && elapsed >= policy.minimumDays - policy.reviewWindowDays,
  };
}

const logAction = (db: DB, entityType: string, entityId: string, action: string, from: string | null, to: string | null, actorId: string, orgUnitId: string | null, comment?: string | null) =>
  run(db, "INSERT INTO approval_actions (entity_type, entity_id, action, from_status, to_status, actor_id, org_unit_id, comment, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    entityType, entityId, action, from, to, actorId, orgUnitId, comment ?? null, nowIso());

async function nextRef(db: DB, prefix: string, table: string): Promise<string> {
  const year = today().slice(0, 4);
  const r = await one<{ m: string | null }>(db, `SELECT MAX(reference) AS m FROM ${table} WHERE reference LIKE ?`, `${prefix}-${year}-%`);
  const n = r?.m ? Number(r.m.split("-")[2]) + 1 : 1;
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

async function notifyApprovers(db: DB, unitId: string, title: string, body: string, link: string) {
  const t = nowIso();
  const users = await all<{ user_id: string }>(db,
    `SELECT DISTINCT d.user_id FROM delegations d JOIN org_unit_closure c ON c.ancestor_id = d.org_unit_id AND c.descendant_id = ?
      WHERE d.domain = 'ASSIGNMENT' AND d.revoked_at IS NULL AND (d.valid_to IS NULL OR d.valid_to > ?)`, unitId, t);
  for (const u of users) await notify(db, u.user_id, title, body, link);
}

// ── Operational areas ───────────────────────────────────────────────────────
export interface AreaRow { id: string; code: string; name: string; description: string | null; responsible_unit_id: string; unit_name: string; status: string; active_count: number }

function scopeIn(actor: Actor, perm: Parameters<typeof unitsFor>[1], cols: string[]): { sql: string; params: string[] } {
  const units = unitsFor(actor, perm);
  if (units === null) return { sql: "1=1", params: [] };
  if (!units.length) return { sql: "1=0", params: [] };
  const ph = units.map(() => "?").join(",");
  return { sql: `(${cols.map((c) => `${c} IN (${ph})`).join(" OR ")})`, params: cols.flatMap(() => units) };
}

export async function listAreas(db: DB, actor: Actor, opts: { includeInactive?: boolean } = {}): Promise<AreaRow[]> {
  await requirePermission(db, actor, "area.view");
  const s = scopeIn(actor, "area.view", ["a.responsible_unit_id"]);
  return all<AreaRow>(db,
    `SELECT a.*, o.name AS unit_name, (SELECT COUNT(*) FROM personnel_assignments x WHERE x.area_id = a.id AND x.status IN ('ACTIVE','TRANSFER_PENDING')) AS active_count
       FROM operational_areas a JOIN org_units o ON o.id = a.responsible_unit_id WHERE ${s.sql} ${opts.includeInactive ? "" : "AND a.status = 'ACTIVE'"} ORDER BY a.name`, ...s.params);
}

/** Areas a user may target when proposing or transferring (active areas, national list; the responsible unit approves). */
export async function selectableAreas(db: DB) {
  return all<{ id: string; code: string; name: string; responsible_unit_id: string; unit_name: string }>(db,
    "SELECT a.id, a.code, a.name, a.responsible_unit_id, o.name AS unit_name FROM operational_areas a JOIN org_units o ON o.id = a.responsible_unit_id WHERE a.status = 'ACTIVE' ORDER BY a.name");
}

export const areaSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, "Use 3–30 capital letters, digits or hyphens."),
  name: z.string().trim().min(5).max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  responsibleUnitId: z.string().min(1, "Select the responsible unit."),
});
const LOCATION_WORDS = /\b(gps|coordinates?|latitude|longitude|grid ref|patrol|route|checkpoint|position)\b/i;

export async function createArea(db: DB, actor: Actor, input: z.input<typeof areaSchema>) {
  const d = areaSchema.parse(input);
  await requirePermission(db, actor, "area.manage", d.responsibleUnitId, { type: "area" });
  if (LOCATION_WORDS.test(`${d.name} ${d.description ?? ""}`)) throw invalid("Operational areas are administrative duty-area records. Do not record coordinates, routes, patrol or position details.");
  if (await one(db, "SELECT id FROM operational_areas WHERE code = ?", d.code)) throw conflict("An operational area with this code already exists.");
  const unit = await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = ? AND status = 'ACTIVE'", d.responsibleUnitId);
  if (!unit) throw invalid("Select an active responsible unit.");
  const id = newId("area");
  await tx(db, async (db) => {
    await run(db, "INSERT INTO operational_areas (id, tenant_id, code, name, description, responsible_unit_id, status, created_by, created_at) VALUES (?,?,?,?,?,?, 'ACTIVE', ?, ?)",
      id, unit.tenant_id, d.code, d.name, d.description || null, d.responsibleUnitId, actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "area.create", category: "BUSINESS", entityType: "area", entityId: id, orgUnitId: d.responsibleUnitId, details: { code: d.code } });
  });
  return id;
}

export async function setAreaStatus(db: DB, actor: Actor, id: string, status: "ACTIVE" | "INACTIVE") {
  const a = await one<{ responsible_unit_id: string; status: string }>(db, "SELECT responsible_unit_id, status FROM operational_areas WHERE id = ?", id);
  if (!a || !can(actor, "area.view", a.responsible_unit_id)) throw notFound();
  await requirePermission(db, actor, "area.manage", a.responsible_unit_id, { type: "area", id });
  if (status === "INACTIVE" && (await one(db, "SELECT id FROM personnel_assignments WHERE area_id = ? AND status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING') LIMIT 1", id))) {
    throw conflict("The area still has current assignments. Transfer or release them first.");
  }
  await run(db, "UPDATE operational_areas SET status = ? WHERE id = ?", status, id);
  await audit(db, { actorId: actor.userId, action: `area.${status.toLowerCase()}`, category: "BUSINESS", entityType: "area", entityId: id, orgUnitId: a.responsible_unit_id });
}

// ── Assignment register ─────────────────────────────────────────────────────
export interface AssignmentRow {
  id: string;
  reference: string;
  personnel_id: string;
  personnel_ref: string;
  service_number: string;
  full_name: string;
  rank_code: string;
  rank_name: string;
  seniority: number;
  home_unit_id: string;
  home_unit_name: string;
  responsible_unit_id: string;
  responsible_unit_name: string;
  area_id: string;
  area_name: string;
  area_code: string;
  request_id: string | null;
  request_ref: string | null;
  overlap_exception_id: string | null;
  roster_version_id: string | null;
  commencement_date: string;
  continuous_start_date: string;
  review_date: string;
  status: string;
  close_reason: string | null;
  ended_on: string | null;
  disposition_status: Disposition;
  notes: string | null;
  authorised_by_name: string | null;
  authorised_unit_name: string | null;
  authorised_at: string | null;
  created_by: string;
  created_at: string;
  version: number;
  renewals: number;
}

const ASG_SELECT = `SELECT a.*, p.personnel_ref, p.service_number, CONCAT(p.surname, ', ', p.first_names) AS full_name, p.rank_code, r.name AS rank_name, r.seniority,
       p.disposition_status, h.name AS home_unit_name, ru.name AS responsible_unit_name, ar.name AS area_name, ar.code AS area_code,
       m.reference AS request_ref, au.display_name AS authorised_by_name, ao.name AS authorised_unit_name,
       (SELECT COUNT(*) FROM assignment_renewals rn WHERE rn.assignment_id = a.id AND rn.decision = 'RENEWED') AS renewals
  FROM personnel_assignments a
  JOIN personnel_records p ON p.id = a.personnel_id
  JOIN ranks r ON r.code = p.rank_code
  JOIN org_units h ON h.id = a.home_unit_id
  JOIN org_units ru ON ru.id = a.responsible_unit_id
  JOIN operational_areas ar ON ar.id = a.area_id
  LEFT JOIN manpower_requests m ON m.id = a.request_id
  LEFT JOIN users au ON au.id = a.authorised_by
  LEFT JOIN org_units ao ON ao.id = a.authorised_unit_id`;

export interface AssignmentFilters {
  q?: string;
  area?: string;
  province?: string;
  homeUnit?: string;
  rank?: string;
  status?: string; // CURRENT | a status
  commencedFrom?: string;
  commencedTo?: string;
  reviewBy?: string;
  renewal?: "renewed" | "never" | "due";
  page?: number;
  pageSize?: number;
}

export async function listAssignments(db: DB, actor: Actor, f: AssignmentFilters = {}) {
  await requirePermission(db, actor, "assignment.view");
  const s = scopeIn(actor, "assignment.view", ["a.responsible_unit_id", "a.home_unit_id"]);
  const where = [s.sql];
  const params: unknown[] = [...s.params];
  if (f.q?.trim()) {
    const q = `%${f.q.trim().toLowerCase()}%`;
    where.push("(p.name_key LIKE ? OR LOWER(p.service_number) LIKE ? OR LOWER(a.reference) LIKE ?)");
    params.push(q, q, q);
  }
  if (f.area) { where.push("a.area_id = ?"); params.push(f.area); }
  if (f.province) { where.push("a.home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = ?)"); params.push(f.province); }
  if (f.homeUnit) { where.push("a.home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = ?)"); params.push(f.homeUnit); }
  if (f.rank) { where.push("p.rank_code = ?"); params.push(f.rank); }
  if (!f.status || f.status === "CURRENT") where.push("a.status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING')");
  else if (f.status !== "ALL") { where.push("a.status = ?"); params.push(f.status); }
  if (f.commencedFrom) { where.push("a.commencement_date >= ?"); params.push(f.commencedFrom); }
  if (f.commencedTo) { where.push("a.commencement_date <= ?"); params.push(f.commencedTo); }
  if (f.reviewBy) { where.push("a.review_date <= ?"); params.push(f.reviewBy); }
  if (f.renewal === "renewed") where.push("EXISTS (SELECT 1 FROM assignment_renewals rn WHERE rn.assignment_id = a.id AND rn.decision = 'RENEWED')");
  if (f.renewal === "never") where.push("NOT EXISTS (SELECT 1 FROM assignment_renewals rn WHERE rn.assignment_id = a.id)");
  if (f.renewal === "due") where.push("p.disposition_status IN ('REVIEW_DUE','RENEWAL_PENDING')");
  const pageSize = Math.min(Math.max(f.pageSize ?? 25, 5), 500);
  const page = Math.max(f.page ?? 1, 1);
  const from = `FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id WHERE ${where.join(" AND ")}`;
  const total = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c ${from}`, ...params))?.c ?? 0);
  const rows = await all<AssignmentRow>(db, `${ASG_SELECT} WHERE ${where.join(" AND ")} ORDER BY ar.name, r.seniority DESC, p.surname LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, ...params);
  return { rows, total, page, pageSize };
}

export async function getAssignment(db: DB, actor: Actor, id: string): Promise<AssignmentRow> {
  await requirePermission(db, actor, "assignment.view");
  const a = await one<AssignmentRow>(db, `${ASG_SELECT} WHERE a.id = ?`, id);
  if (!a || !(can(actor, "assignment.view", a.responsible_unit_id) || can(actor, "assignment.view", a.home_unit_id))) throw notFound();
  return a;
}

export async function assignmentDetail(db: DB, actor: Actor, id: string) {
  const a = await getAssignment(db, actor, id);
  const policy = await tenurePolicy(db);
  const tenure = computeTenure(a, policy);
  const actions = await all<{ seq: number; action: string; from_status: string | null; to_status: string | null; comment: string | null; actor_name: string; created_at: string }>(db,
    "SELECT x.*, u.display_name AS actor_name FROM approval_actions x JOIN users u ON u.id = x.actor_id WHERE x.entity_type = 'assignment' AND x.entity_id = ? ORDER BY x.seq", id);
  const renewals = await all<{ id: string; decision: string; previous_review_date: string; next_review_date: string | null; comment: string; actor_name: string; decided_at: string }>(db,
    "SELECT rn.*, u.display_name AS actor_name FROM assignment_renewals rn JOIN users u ON u.id = rn.decided_by WHERE rn.assignment_id = ? ORDER BY rn.decided_at", id);
  const exceptions = await all<{ id: string; reference: string; purpose: string; category_code: string; category_name: string; justification: string; document_ref: string | null; status: string; raised_by: string; raised_by_name: string; raised_at: string; decided_by_name: string | null; decided_at: string | null; decision_comment: string | null }>(db,
    `SELECT e.*, c.name AS category_name, u.display_name AS raised_by_name, d.display_name AS decided_by_name FROM assignment_exceptions e JOIN exception_categories c ON c.code = e.category_code
       JOIN users u ON u.id = e.raised_by LEFT JOIN users d ON d.id = e.decided_by WHERE e.assignment_id = ? ORDER BY e.raised_at`, id);
  const transfers = await all<TransferRow>(db, `${TR_SELECT} WHERE t.assignment_id = ? OR t.new_assignment_id = ? ORDER BY t.initiated_at`, id, id);
  const dispositions = await all<{ seq: number; previous_status: string | null; new_status: string; reason: string; effective_date: string; actor_name: string | null; created_at: string }>(db,
    "SELECT d.*, u.display_name AS actor_name FROM disposition_history d LEFT JOIN users u ON u.id = d.authorised_by WHERE d.assignment_id = ? ORDER BY d.seq", id);
  const approvalUnit = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  return { assignment: a, tenure, policy, actions, renewals, exceptions, transfers, dispositions, canApprove: !!approvalUnit };
}

// ── Propose / approve ───────────────────────────────────────────────────────
export const proposeSchema = z.object({
  personnelId: z.string().min(1, "Select the officer."),
  areaId: z.string().min(1, "Select the operational area."),
  commencementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the commencement date."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  requestId: z.string().optional().or(z.literal("")),
  overlapExceptionId: z.string().optional().or(z.literal("")),
});

async function lockPerson(db: DB, personnelId: string) {
  const p = await one<{ id: string; home_unit_id: string; tenant_id: string }>(db, "SELECT id, home_unit_id, tenant_id FROM personnel_records WHERE id = ? FOR UPDATE", personnelId);
  if (!p) throw notFound();
  return p;
}

/** Shared insert used by direct proposals and by roster finalisation. */
async function insertAssignment(db: DB, input: {
  personnelId: string; areaId: string; commencementDate: string; notes?: string | null; requestId?: string | null; rosterVersionId?: string | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "ACTIVE"; actorId: string; authorisedBy?: string | null; authorisedUnitId?: string | null; overlapExceptionId?: string | null;
}) {
  const area = await one<{ responsible_unit_id: string; tenant_id: string; status: string; name: string }>(db, "SELECT responsible_unit_id, tenant_id, status, name FROM operational_areas WHERE id = ?", input.areaId);
  if (!area || area.status !== "ACTIVE") throw invalid("Select an active operational area.");
  const person = await lockPerson(db, input.personnelId);
  const elig = await eligibilityOf(db, input.personnelId);
  if (!elig.eligible) {
    const onlyOverlap = elig.reasons.every((r) => r.startsWith("Conflicting assignment"));
    const ex = input.overlapExceptionId
      ? await one<{ status: string; purpose: string }>(db, "SELECT e.status, e.purpose FROM assignment_exceptions e JOIN personnel_assignments a ON a.id = e.assignment_id WHERE e.id = ? AND a.personnel_id = ?", input.overlapExceptionId, input.personnelId)
      : undefined;
    if (!(onlyOverlap && ex?.status === "APPROVED" && ex.purpose === "OVERLAP")) throw conflict(`The officer is not eligible: ${elig.reasons.join("; ")}.`);
  }
  const policy = await tenurePolicy(db);
  const id = newId("pas");
  const ref = await nextRef(db, "ASG", "personnel_assignments");
  const t = nowIso();
  await run(db, `INSERT INTO personnel_assignments (id, tenant_id, reference, personnel_id, home_unit_id, responsible_unit_id, area_id, request_id, roster_version_id, commencement_date, continuous_start_date, review_date, status, overlap_exception_id, authorised_by, authorised_unit_id, authorised_at, notes, created_by, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, area.tenant_id, ref, input.personnelId, person.home_unit_id, area.responsible_unit_id, input.areaId, input.requestId || null, input.rosterVersionId ?? null,
    input.commencementDate, input.commencementDate, addDays(input.commencementDate, policy.minimumDays), input.status, input.overlapExceptionId || null,
    input.authorisedBy ?? null, input.authorisedUnitId ?? null, input.authorisedBy ? t : null, input.notes || null, input.actorId, t, t);
  if (input.overlapExceptionId) await run(db, "UPDATE assignment_exceptions SET status = 'USED' WHERE id = ?", input.overlapExceptionId);
  const disp: Disposition = input.status === "PENDING_APPROVAL" ? "AWAITING_APPROVAL" : input.status === "APPROVED" ? "APPROVED_PENDING" : "ACTIVE_ASSIGNMENT";
  await recordDisposition(db, { personnelId: input.personnelId, status: disp, reason: `Assignment ${ref} to ${area.name}`, actorId: input.actorId, effectiveDate: input.status === "ACTIVE" ? input.commencementDate : today(), assignmentId: id, reference: ref });
  await logAction(db, "assignment", id, input.status === "PENDING_APPROVAL" ? "PROPOSE" : "CREATE_APPROVED", null, input.status, input.actorId, area.responsible_unit_id);
  return { id, ref, responsibleUnitId: area.responsible_unit_id };
}

export { insertAssignment as _insertAssignment };

export async function proposeAssignment(db: DB, actor: Actor, input: z.input<typeof proposeSchema>) {
  const d = proposeSchema.parse(input);
  const area = await one<{ responsible_unit_id: string }>(db, "SELECT responsible_unit_id FROM operational_areas WHERE id = ?", d.areaId);
  if (!area) throw invalid("Select an active operational area.");
  await requirePermission(db, actor, "assignment.propose", area.responsible_unit_id, { type: "assignment" });
  const person = await one<{ home_unit_id: string }>(db, "SELECT home_unit_id FROM personnel_records WHERE id = ?", d.personnelId);
  if (!person || !can(actor, "personnel.view", person.home_unit_id)) throw notFound("Officer not found or not within your authorised scope.");
  if (d.commencementDate < addDays(today(), -30)) throw invalid("The commencement date cannot be more than 30 days in the past. Record older assignments through the registry administrator.");
  const r = await tx(db, async (db) => {
    const r = await insertAssignment(db, { ...d, status: "PENDING_APPROVAL", actorId: actor.userId });
    await audit(db, { actorId: actor.userId, action: "assignment.propose", category: "BUSINESS", entityType: "assignment", entityId: r.id, orgUnitId: r.responsibleUnitId, details: { ref: r.ref, personnel: d.personnelId, area: d.areaId } });
    return r;
  });
  await notifyApprovers(db, r.responsibleUnitId, `Assignment ${r.ref} awaits approval`, "A proposed duty-area assignment needs a decision.", `/app/assignments/${r.id}`);
  return r.id;
}

export async function decideAssignment(db: DB, actor: Actor, id: string, decision: "APPROVE" | "REJECT", comment: string) {
  const a = await getAssignment(db, actor, id);
  if (a.status !== "PENDING_APPROVAL") throw conflict("Only assignments awaiting approval can be decided.");
  const unit = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  if (!unit) {
    await audit(db, { actorId: actor.userId, action: "authz.denied:assignment.approve", outcome: "DENIED", category: "SECURITY", entityType: "assignment", entityId: id });
    throw forbidden("You do not hold delegated assignment approval authority for this unit.");
  }
  if (a.created_by === actor.userId) throw forbidden("You cannot approve an assignment you proposed (separation of duties).");
  if (decision === "REJECT" && comment.trim().length < 5) throw invalid("Record the reason for rejection.");
  await tx(db, async (db) => {
    await lockPerson(db, a.personnel_id);
    if (decision === "APPROVE") {
      const elig = await eligibilityOf(db, a.personnel_id, id);
      if (!elig.eligible && !a.overlap_exception_id) throw conflict(`The officer is no longer eligible: ${elig.reasons.join("; ")}.`);
      const to = a.commencement_date <= today() ? "ACTIVE" : "APPROVED";
      await run(db, "UPDATE personnel_assignments SET status = ?, authorised_by = ?, authorised_unit_id = ?, authorised_at = ?, updated_at = ?, version = version + 1 WHERE id = ?", to, actor.userId, unit, nowIso(), nowIso(), id);
      await recordDisposition(db, { personnelId: a.personnel_id, status: to === "ACTIVE" ? "ACTIVE_ASSIGNMENT" : "APPROVED_PENDING", reason: `Assignment ${a.reference} approved`, actorId: actor.userId, assignmentId: id, reference: a.reference });
      await logAction(db, "assignment", id, "APPROVE", a.status, to, actor.userId, unit, comment);
    } else {
      await run(db, "UPDATE personnel_assignments SET status = 'REJECTED', updated_at = ?, version = version + 1 WHERE id = ?", nowIso(), id);
      await recordDisposition(db, { personnelId: a.personnel_id, status: "AVAILABLE_HOME", reason: `Assignment ${a.reference} rejected: ${comment.trim()}`, actorId: actor.userId, assignmentId: id, reference: a.reference });
      await logAction(db, "assignment", id, "REJECT", a.status, "REJECTED", actor.userId, unit, comment);
    }
    await audit(db, { actorId: actor.userId, action: `assignment.${decision.toLowerCase()}`, category: "BUSINESS", entityType: "assignment", entityId: id, orgUnitId: a.responsible_unit_id, details: { ref: a.reference } });
  });
  await notify(db, a.created_by, `Assignment ${a.reference} ${decision === "APPROVE" ? "approved" : "rejected"}`, comment || "Decision recorded.", `/app/assignments/${id}`);
}

export async function cancelAssignment(db: DB, actor: Actor, id: string, reason: string) {
  const a = await getAssignment(db, actor, id);
  if (!["PENDING_APPROVAL", "APPROVED"].includes(a.status)) throw conflict("Only assignments that have not commenced can be cancelled.");
  const approver = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  if (a.created_by !== actor.userId && !approver) throw forbidden();
  if (reason.trim().length < 5) throw invalid("Record the reason for cancellation.");
  await tx(db, async (db) => {
    await run(db, "UPDATE personnel_assignments SET status = 'CANCELLED', close_reason = 'CANCELLED', ended_on = ?, updated_at = ?, version = version + 1 WHERE id = ?", today(), nowIso(), id);
    await recordDisposition(db, { personnelId: a.personnel_id, status: "CANCELLED", reason: `Assignment ${a.reference} cancelled: ${reason.trim()}`, actorId: actor.userId, assignmentId: id, reference: a.reference });
    await logAction(db, "assignment", id, "CANCEL", a.status, "CANCELLED", actor.userId, a.responsible_unit_id, reason);
    await audit(db, { actorId: actor.userId, action: "assignment.cancel", category: "BUSINESS", entityType: "assignment", entityId: id, orgUnitId: a.responsible_unit_id });
  });
}

/** Time-driven transitions: commencement of approved assignments and review-due flags. Idempotent. */
export async function applyDueAssignmentEvents(db: DB) {
  const t = today();
  const policy = await tenurePolicy(db);
  const starting = await all<{ id: string; personnel_id: string; reference: string; commencement_date: string }>(db, "SELECT id, personnel_id, reference, commencement_date FROM personnel_assignments WHERE status = 'APPROVED' AND commencement_date <= ?", t);
  for (const a of starting) {
    await tx(db, async (db) => {
      const n = await run(db, "UPDATE personnel_assignments SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND status = 'APPROVED'", nowIso(), a.id);
      if (n.changes) await recordDisposition(db, { personnelId: a.personnel_id, status: "ACTIVE_ASSIGNMENT", reason: `Assignment ${a.reference} commenced`, actorId: null, effectiveDate: a.commencement_date, assignmentId: a.id, reference: a.reference });
    });
  }
  const due = await all<{ id: string; personnel_id: string; reference: string }>(db,
    `SELECT a.id, a.personnel_id, a.reference FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id
      WHERE a.status = 'ACTIVE' AND a.review_date <= ? AND p.disposition_status IN ('ACTIVE_ASSIGNMENT','RENEWED_ACTIVE')`, addDays(t, policy.reviewWindowDays));
  for (const a of due) {
    await tx(db, (db) => recordDisposition(db, { personnelId: a.personnel_id, status: "REVIEW_DUE", reason: `Review date of ${a.reference} reached`, actorId: null, assignmentId: a.id, reference: a.reference }));
  }
}

// ── Exceptions ──────────────────────────────────────────────────────────────
export const exceptionSchema = z.object({
  purpose: z.enum(["EARLY_RELEASE", "OVERLAP"]),
  categoryCode: z.string().min(1, "Select the exception category."),
  justification: z.string().trim().min(20, "Give an administrative justification (at least 20 characters)."),
  documentRef: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function exceptionCategories(db: DB) {
  return all<{ code: string; name: string; active: number; always_available: number; requires_document: number }>(db, "SELECT * FROM exception_categories WHERE active = 1 OR always_available = 1 ORDER BY always_available DESC, name");
}

export async function raiseException(db: DB, actor: Actor, assignmentId: string, input: z.input<typeof exceptionSchema>) {
  const a = await getAssignment(db, actor, assignmentId);
  if (!(can(actor, "assignment.propose", a.responsible_unit_id) || can(actor, "assignment.propose", a.home_unit_id))) {
    await requirePermission(db, actor, "assignment.propose", a.responsible_unit_id, { type: "assignment", id: assignmentId });
  }
  const d = exceptionSchema.parse(input);
  const cat = await one<{ active: number; always_available: number; requires_document: number; name: string }>(db, "SELECT * FROM exception_categories WHERE code = ?", d.categoryCode);
  if (!cat || !(cat.active || cat.always_available)) throw invalid("Select an available exception category.");
  if (cat.requires_document && !d.documentRef) throw invalid(`${cat.name} exceptions require a supporting document reference.`);
  if (!["ACTIVE", "APPROVED", "TRANSFER_PENDING"].includes(a.status)) throw conflict("Exceptions can only be raised against a current assignment.");
  if (await one(db, "SELECT id FROM assignment_exceptions WHERE assignment_id = ? AND purpose = ? AND status IN ('PENDING','APPROVED')", assignmentId, d.purpose)) throw conflict("An exception of this type is already pending or approved for this assignment.");
  const id = newId("aex");
  await tx(db, async (db) => {
    const ref = await nextRef(db, "EXC", "assignment_exceptions");
    await run(db, "INSERT INTO assignment_exceptions (id, reference, assignment_id, purpose, category_code, justification, document_ref, status, raised_by, raised_at) VALUES (?,?,?,?,?,?,?, 'PENDING', ?, ?)",
      id, ref, assignmentId, d.purpose, d.categoryCode, d.justification, d.documentRef || null, actor.userId, nowIso());
    await logAction(db, "assignment", assignmentId, `EXCEPTION_RAISED:${d.categoryCode}`, null, null, actor.userId, a.responsible_unit_id, d.justification);
    await audit(db, { actorId: actor.userId, action: "assignment.exception.raise", category: "BUSINESS", entityType: "assignment", entityId: assignmentId, orgUnitId: a.responsible_unit_id, details: { ref, purpose: d.purpose, category: d.categoryCode } });
  });
  await notifyApprovers(db, a.responsible_unit_id, `Exception raised on ${a.reference}`, `${cat.name} exception awaiting decision.`, `/app/assignments/${assignmentId}`);
  return id;
}

export async function decideException(db: DB, actor: Actor, exceptionId: string, decision: "APPROVE" | "REJECT", comment: string) {
  const e = await one<{ assignment_id: string; status: string; raised_by: string; reference: string; category_code: string }>(db, "SELECT * FROM assignment_exceptions WHERE id = ?", exceptionId);
  if (!e) throw notFound();
  const a = await getAssignment(db, actor, e.assignment_id);
  if (e.status !== "PENDING") throw conflict("This exception has already been decided.");
  const unit = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  if (!unit) throw forbidden("You do not hold delegated assignment approval authority for this unit.");
  if (e.raised_by === actor.userId) throw forbidden("You cannot decide an exception you raised (separation of duties).");
  if (comment.trim().length < 5) throw invalid("Record the decision note.");
  await tx(db, async (db) => {
    await run(db, "UPDATE assignment_exceptions SET status = ?, decided_by = ?, decided_at = ?, decision_comment = ? WHERE id = ?", decision === "APPROVE" ? "APPROVED" : "REJECTED", actor.userId, nowIso(), comment.trim(), exceptionId);
    await logAction(db, "assignment", a.id, `EXCEPTION_${decision}`, null, null, actor.userId, unit, `${e.reference}: ${comment.trim()}`);
    await audit(db, { actorId: actor.userId, action: `assignment.exception.${decision.toLowerCase()}`, category: "BUSINESS", entityType: "assignment", entityId: a.id, orgUnitId: a.responsible_unit_id, details: { ref: e.reference, category: e.category_code } });
  });
  await notify(db, e.raised_by, `Exception ${e.reference} ${decision === "APPROVE" ? "approved" : "rejected"}`, comment.trim(), `/app/assignments/${a.id}`);
}

/** Returns the approved, unused EARLY_RELEASE exception for the assignment, if any. */
async function earlyReleaseException(db: DB, assignmentId: string, exceptionId?: string | null) {
  return one<{ id: string; reference: string }>(db,
    `SELECT id, reference FROM assignment_exceptions WHERE assignment_id = ? AND purpose = 'EARLY_RELEASE' AND status = 'APPROVED' ${exceptionId ? "AND id = ?" : ""} LIMIT 1`,
    ...(exceptionId ? [assignmentId, exceptionId] : [assignmentId]));
}

/** Throws unless the minimum tenure is met at `asOf` or an approved early-release exception exists. */
async function assertTenureOrException(db: DB, a: AssignmentRow, asOf: string, exceptionId?: string | null) {
  const t = computeTenure(a, await tenurePolicy(db), asOf);
  if (t.minimumMet) return null;
  const ex = await earlyReleaseException(db, a.id, exceptionId);
  if (!ex) throw conflict(`Minimum tenure not met: ${t.elapsedDays} of ${t.minimumDays} days completed (${t.remainingDays} remaining, completes ${t.completionDate}). Routine withdrawal or transfer requires an approved early-release exception.`);
  return ex;
}

// ── Release / completion ────────────────────────────────────────────────────
export async function releaseAssignment(db: DB, actor: Actor, id: string, input: { outcome: "RELEASED" | "COMPLETED"; reason: string; effectiveDate: string; exceptionId?: string }) {
  const a = await getAssignment(db, actor, id);
  if (a.status !== "ACTIVE") throw conflict("Only active assignments can be released or completed.");
  const unit = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  if (!unit) throw forbidden("You do not hold delegated assignment approval authority for this unit.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate) || input.effectiveDate > today()) throw invalid("Enter an effective date that is not in the future.");
  if (input.effectiveDate < a.commencement_date) throw invalid("The effective date cannot be before the commencement date.");
  if (input.reason.trim().length < 5) throw invalid("Record the reason.");
  await tx(db, async (db) => {
    const ex = await assertTenureOrException(db, a, input.effectiveDate, input.exceptionId);
    await run(db, "UPDATE personnel_assignments SET status = 'CLOSED', close_reason = ?, ended_on = ?, updated_at = ?, version = version + 1 WHERE id = ?", input.outcome, input.effectiveDate, nowIso(), id);
    if (ex) await run(db, "UPDATE assignment_exceptions SET status = 'USED' WHERE id = ?", ex.id);
    await recordDisposition(db, { personnelId: a.personnel_id, status: input.outcome === "COMPLETED" ? "COMPLETED" : "RETURNED_HOME", reason: `${a.reference} ${input.outcome === "COMPLETED" ? "completed" : "released"}: ${input.reason.trim()}${ex ? ` (exception ${ex.reference})` : ""}`, actorId: actor.userId, effectiveDate: input.effectiveDate, assignmentId: id, reference: a.reference });
    await logAction(db, "assignment", id, input.outcome === "COMPLETED" ? "COMPLETE" : "RELEASE", "ACTIVE", "CLOSED", actor.userId, unit, input.reason);
    await audit(db, { actorId: actor.userId, action: `assignment.${input.outcome === "COMPLETED" ? "complete" : "release"}`, category: "BUSINESS", entityType: "assignment", entityId: id, orgUnitId: a.responsible_unit_id, details: { ref: a.reference, effective: input.effectiveDate, exception: ex?.reference ?? null } });
  });
}

// ── Renewal ─────────────────────────────────────────────────────────────────
export async function markRenewalPending(db: DB, actor: Actor, id: string, note: string) {
  const a = await getAssignment(db, actor, id);
  await requirePermission(db, actor, "assignment.propose", a.responsible_unit_id, { type: "assignment", id });
  if (a.status !== "ACTIVE") throw conflict("Only active assignments can be put forward for renewal.");
  const tenure = computeTenure(a, await tenurePolicy(db));
  if (!tenure.reviewEligible) throw conflict(`Not yet in the review window. The review date is ${a.review_date}.`);
  await tx(db, async (db) => {
    await recordDisposition(db, { personnelId: a.personnel_id, status: "RENEWAL_PENDING", reason: `Renewal of ${a.reference} requested${note.trim() ? `: ${note.trim()}` : ""}`, actorId: actor.userId, assignmentId: id, reference: a.reference });
    await logAction(db, "assignment", id, "RENEWAL_REQUESTED", null, null, actor.userId, a.responsible_unit_id, note);
    await audit(db, { actorId: actor.userId, action: "assignment.renewal.request", category: "BUSINESS", entityType: "assignment", entityId: id, orgUnitId: a.responsible_unit_id });
  });
  await notifyApprovers(db, a.responsible_unit_id, `Renewal decision needed: ${a.reference}`, "An assignment is due for review and renewal.", `/app/assignments/${id}`);
}

export async function renewAssignment(db: DB, actor: Actor, id: string, input: { decision: "RENEWED" | "NOT_RENEWED"; comment: string }) {
  const a = await getAssignment(db, actor, id);
  if (a.status !== "ACTIVE") throw conflict("Only active assignments can be reviewed for renewal.");
  const unit = await approvalUnitFor(db, actor, "ASSIGNMENT", a.responsible_unit_id);
  if (!unit) throw forbidden("You do not hold delegated assignment approval authority for this unit.");
  const policy = await tenurePolicy(db);
  const tenure = computeTenure(a, policy);
  if (!tenure.reviewEligible) throw conflict(`The assignment is not due for review until ${addDays(a.review_date, -policy.reviewWindowDays)}.`);
  if (input.comment.trim().length < 5) throw invalid("Record the renewal decision note.");
  await tx(db, async (db) => {
    if (input.decision === "RENEWED") {
      const next = addDays(a.review_date, policy.renewalDays);
      // Continuous start date is preserved: renewal at the same area never resets tenure.
      await run(db, "UPDATE personnel_assignments SET review_date = ?, updated_at = ?, version = version + 1 WHERE id = ?", next, nowIso(), id);
      await run(db, "INSERT INTO assignment_renewals (id, assignment_id, decision, previous_review_date, next_review_date, comment, decided_by, decided_at) VALUES (?,?,?,?,?,?,?,?)",
        newId("arn"), id, "RENEWED", a.review_date, next, input.comment.trim(), actor.userId, nowIso());
      await recordDisposition(db, { personnelId: a.personnel_id, status: "RENEWED_ACTIVE", reason: `${a.reference} renewed to ${next}`, actorId: actor.userId, assignmentId: id, reference: a.reference });
      await logAction(db, "assignment", id, "RENEW", "ACTIVE", "ACTIVE", actor.userId, unit, `Next review ${next}. ${input.comment.trim()}`);
    } else {
      if (!tenure.minimumMet) throw conflict("The minimum tenure is not yet met; the assignment cannot be completed at this review.");
      await run(db, "INSERT INTO assignment_renewals (id, assignment_id, decision, previous_review_date, next_review_date, comment, decided_by, decided_at) VALUES (?,?,?,?,NULL,?,?,?)",
        newId("arn"), id, "NOT_RENEWED", a.review_date, input.comment.trim(), actor.userId, nowIso());
      await run(db, "UPDATE personnel_assignments SET status = 'CLOSED', close_reason = 'COMPLETED', ended_on = ?, updated_at = ?, version = version + 1 WHERE id = ?", today(), nowIso(), id);
      await recordDisposition(db, { personnelId: a.personnel_id, status: "COMPLETED", reason: `${a.reference} not renewed; assignment completed`, actorId: actor.userId, assignmentId: id, reference: a.reference });
      await logAction(db, "assignment", id, "NOT_RENEWED", "ACTIVE", "CLOSED", actor.userId, unit, input.comment.trim());
    }
    await audit(db, { actorId: actor.userId, action: `assignment.renewal.${input.decision === "RENEWED" ? "renew" : "decline"}`, category: "BUSINESS", entityType: "assignment", entityId: id, orgUnitId: a.responsible_unit_id, details: { ref: a.reference, previousReview: a.review_date } });
  });
}

// ── Transfers ───────────────────────────────────────────────────────────────
export interface TransferRow {
  id: string; reference: string; assignment_id: string; assignment_ref: string; personnel_id: string; full_name: string; service_number: string; rank_name: string;
  from_area_name: string; to_area_id: string; to_area_name: string; releasing_unit_id: string; releasing_unit_name: string; receiving_unit_id: string; receiving_unit_name: string;
  justification: string; proposed_date: string; effective_date: string | null; exception_ref: string | null; status: string;
  initiated_by: string; initiated_by_name: string; initiated_at: string; released_by_name: string | null; released_at: string | null; accepted_by_name: string | null; accepted_at: string | null;
  decision_comment: string | null; new_assignment_id: string | null;
}
const TR_SELECT = `SELECT t.*, a.reference AS assignment_ref, CONCAT(p.surname, ', ', p.first_names) AS full_name, p.service_number, r.name AS rank_name,
       fa.name AS from_area_name, ta.name AS to_area_name, ro.name AS releasing_unit_name, rc.name AS receiving_unit_name, e.reference AS exception_ref,
       iu.display_name AS initiated_by_name, ru.display_name AS released_by_name, au.display_name AS accepted_by_name
  FROM assignment_transfers t JOIN personnel_assignments a ON a.id = t.assignment_id JOIN personnel_records p ON p.id = t.personnel_id JOIN ranks r ON r.code = p.rank_code
  JOIN operational_areas fa ON fa.id = t.from_area_id JOIN operational_areas ta ON ta.id = t.to_area_id
  JOIN org_units ro ON ro.id = t.releasing_unit_id JOIN org_units rc ON rc.id = t.receiving_unit_id
  LEFT JOIN assignment_exceptions e ON e.id = t.exception_id
  JOIN users iu ON iu.id = t.initiated_by LEFT JOIN users ru ON ru.id = t.released_by LEFT JOIN users au ON au.id = t.accepted_by`;

export async function listTransfers(db: DB, actor: Actor, status?: string) {
  await requirePermission(db, actor, "assignment.view");
  const s = scopeIn(actor, "assignment.view", ["t.releasing_unit_id", "t.receiving_unit_id", "a.home_unit_id"]);
  const st = status && status !== "ALL" ? status === "OPEN" ? "AND t.status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE')" : "AND t.status = ?" : "";
  return all<TransferRow>(db, `${TR_SELECT} WHERE ${s.sql} ${st} ORDER BY t.initiated_at DESC LIMIT 300`, ...s.params, ...(st.includes("?") ? [status] : []));
}

export async function getTransfer(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "assignment.view");
  const t = await one<TransferRow & { home_unit_id: string }>(db, `${TR_SELECT.replace("SELECT t.*,", "SELECT t.*, a.home_unit_id,")} WHERE t.id = ?`, id);
  if (!t || ![t.releasing_unit_id, t.receiving_unit_id, t.home_unit_id].some((u) => can(actor, "assignment.view", u))) throw notFound();
  const canRelease = t.status === "PENDING_RELEASE" && t.initiated_by !== actor.userId && !!(await approvalUnitFor(db, actor, "ASSIGNMENT", t.releasing_unit_id));
  const canAccept = t.status === "PENDING_ACCEPTANCE" && t.initiated_by !== actor.userId && (can(actor, "assignment.receive", t.receiving_unit_id) || !!(await approvalUnitFor(db, actor, "ASSIGNMENT", t.receiving_unit_id)));
  const actions = await all<{ seq: number; action: string; comment: string | null; actor_name: string; created_at: string }>(db,
    "SELECT x.*, u.display_name AS actor_name FROM approval_actions x JOIN users u ON u.id = x.actor_id WHERE x.entity_type = 'transfer' AND x.entity_id = ? ORDER BY x.seq", id);
  return { transfer: t, canRelease, canAccept, actions };
}

export const transferSchema = z.object({
  toAreaId: z.string().min(1, "Select the receiving operational area."),
  justification: z.string().trim().min(20, "Give an administrative justification (at least 20 characters)."),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the proposed effective date."),
  exceptionId: z.string().optional().or(z.literal("")),
});

export async function initiateTransfer(db: DB, actor: Actor, assignmentId: string, input: z.input<typeof transferSchema>) {
  const a = await getAssignment(db, actor, assignmentId);
  const d = transferSchema.parse(input);
  const to = await one<{ responsible_unit_id: string; status: string; name: string }>(db, "SELECT responsible_unit_id, status, name FROM operational_areas WHERE id = ?", d.toAreaId);
  if (!to || to.status !== "ACTIVE") throw invalid("Select an active receiving area.");
  if (!(can(actor, "assignment.propose", a.responsible_unit_id) || can(actor, "assignment.propose", to.responsible_unit_id))) {
    await requirePermission(db, actor, "assignment.propose", a.responsible_unit_id, { type: "assignment", id: assignmentId });
  }
  if (a.status !== "ACTIVE") throw conflict("Only an active assignment can be transferred.");
  if (d.toAreaId === a.area_id) throw invalid("The receiving area must differ from the current area. Use renewal to continue at the same area.");
  if (await one(db, "SELECT id FROM assignment_transfers WHERE assignment_id = ? AND status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE')", assignmentId)) throw conflict("A transfer is already in progress for this assignment.");
  const id = newId("trf");
  const ref = await tx(db, async (db) => {
    const ex = await assertTenureOrException(db, a, d.proposedDate < today() ? today() : d.proposedDate, d.exceptionId || null);
    const ref = await nextRef(db, "TRF", "assignment_transfers");
    await run(db, `INSERT INTO assignment_transfers (id, reference, assignment_id, personnel_id, from_area_id, to_area_id, releasing_unit_id, receiving_unit_id, justification, proposed_date, exception_id, status, initiated_by, initiated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?, 'PENDING_RELEASE', ?, ?)`,
      id, ref, assignmentId, a.personnel_id, a.area_id, d.toAreaId, a.responsible_unit_id, to.responsible_unit_id, d.justification, d.proposedDate, ex?.id ?? null, actor.userId, nowIso());
    await run(db, "UPDATE personnel_assignments SET status = 'TRANSFER_PENDING', updated_at = ?, version = version + 1 WHERE id = ?", nowIso(), assignmentId);
    await recordDisposition(db, { personnelId: a.personnel_id, status: "TRANSFER_PENDING", reason: `Transfer ${ref} to ${to.name} initiated`, actorId: actor.userId, assignmentId, reference: ref });
    await logAction(db, "transfer", id, "INITIATE", null, "PENDING_RELEASE", actor.userId, a.responsible_unit_id, d.justification);
    await logAction(db, "assignment", assignmentId, "TRANSFER_INITIATED", "ACTIVE", "TRANSFER_PENDING", actor.userId, a.responsible_unit_id, `${ref} → ${to.name}`);
    await audit(db, { actorId: actor.userId, action: "transfer.initiate", category: "BUSINESS", entityType: "transfer", entityId: id, orgUnitId: a.responsible_unit_id, details: { ref, from: a.area_id, to: d.toAreaId, exception: ex?.reference ?? null } });
    return ref;
  });
  await notifyApprovers(db, a.responsible_unit_id, `Transfer ${ref} needs a releasing decision`, `${a.full_name}: ${a.area_name} → ${to.name}`, `/app/transfers/${id}`);
  return id;
}

async function revertTransfer(db: DB, t: TransferRow, actorId: string, reason: string) {
  await run(db, "UPDATE personnel_assignments SET status = 'ACTIVE', updated_at = ?, version = version + 1 WHERE id = ? AND status = 'TRANSFER_PENDING'", nowIso(), t.assignment_id);
  await recordDisposition(db, { personnelId: t.personnel_id, status: "ACTIVE_ASSIGNMENT", reason, actorId, assignmentId: t.assignment_id, reference: t.reference });
}

export async function releaseDecision(db: DB, actor: Actor, transferId: string, decision: "APPROVE" | "REJECT", comment: string) {
  const { transfer: t, canRelease } = await getTransfer(db, actor, transferId);
  if (t.status !== "PENDING_RELEASE") throw conflict("This transfer is not awaiting a releasing decision.");
  if (t.initiated_by === actor.userId) throw forbidden("You cannot decide a transfer you initiated (separation of duties).");
  if (!canRelease) throw forbidden("You do not hold delegated assignment approval authority for the releasing unit.");
  if (comment.trim().length < 5) throw invalid("Record the releasing decision note.");
  await tx(db, async (db) => {
    if (decision === "APPROVE") {
      await run(db, "UPDATE assignment_transfers SET status = 'PENDING_ACCEPTANCE', released_by = ?, released_at = ? WHERE id = ?", actor.userId, nowIso(), transferId);
      await logAction(db, "transfer", transferId, "RELEASE_APPROVED", "PENDING_RELEASE", "PENDING_ACCEPTANCE", actor.userId, t.releasing_unit_id, comment);
    } else {
      await run(db, "UPDATE assignment_transfers SET status = 'REJECTED', released_by = ?, released_at = ?, decision_comment = ? WHERE id = ?", actor.userId, nowIso(), comment.trim(), transferId);
      await revertTransfer(db, t, actor.userId, `Transfer ${t.reference} not released: ${comment.trim()}`);
      await logAction(db, "transfer", transferId, "RELEASE_REJECTED", "PENDING_RELEASE", "REJECTED", actor.userId, t.releasing_unit_id, comment);
    }
    await audit(db, { actorId: actor.userId, action: `transfer.release.${decision.toLowerCase()}`, category: "BUSINESS", entityType: "transfer", entityId: transferId, orgUnitId: t.releasing_unit_id });
  });
  await notify(db, t.initiated_by, `Transfer ${t.reference}: release ${decision === "APPROVE" ? "approved" : "rejected"}`, comment.trim(), `/app/transfers/${transferId}`);
}

/** Receiving acceptance completes the transfer atomically: close old assignment, open new one, update disposition. */
export async function acceptDecision(db: DB, actor: Actor, transferId: string, decision: "ACCEPT" | "DECLINE", input: { effectiveDate?: string; comment: string }) {
  const { transfer: t, canAccept } = await getTransfer(db, actor, transferId);
  if (t.status !== "PENDING_ACCEPTANCE") throw conflict("This transfer is not awaiting receiving acceptance.");
  if (t.initiated_by === actor.userId) throw forbidden("You cannot accept a transfer you initiated (separation of duties).");
  if (!canAccept) throw forbidden("You are not authorised to accept transfers into the receiving area.");
  if (input.comment.trim().length < 5) throw invalid("Record the acceptance note.");
  let newId_: string | null = null;
  await tx(db, async (db) => {
    if (decision === "DECLINE") {
      await run(db, "UPDATE assignment_transfers SET status = 'REJECTED', accepted_by = ?, accepted_at = ?, decision_comment = ? WHERE id = ?", actor.userId, nowIso(), input.comment.trim(), transferId);
      await revertTransfer(db, t, actor.userId, `Transfer ${t.reference} declined by receiving area: ${input.comment.trim()}`);
      await logAction(db, "transfer", transferId, "ACCEPTANCE_DECLINED", "PENDING_ACCEPTANCE", "REJECTED", actor.userId, t.receiving_unit_id, input.comment);
      return;
    }
    const eff = input.effectiveDate ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eff) || eff > today()) throw invalid("Enter the approved effective date (today or earlier).");
    const old = await one<AssignmentRow>(db, `${ASG_SELECT} WHERE a.id = ? FOR UPDATE`, t.assignment_id);
    if (!old || old.status !== "TRANSFER_PENDING") throw conflict("The current assignment is no longer pending transfer.");
    if (eff < old.commencement_date) throw invalid("The effective date cannot be before the current assignment's commencement.");
    // Tenure is re-checked at the actual effective date (an exception linked at initiation is honoured).
    const ex = await assertTenureOrException(db, old, eff, (await one<{ exception_id: string | null }>(db, "SELECT exception_id FROM assignment_transfers WHERE id = ?", transferId))?.exception_id);
    await run(db, "UPDATE personnel_assignments SET status = 'CLOSED', close_reason = 'TRANSFERRED', ended_on = ?, updated_at = ?, version = version + 1 WHERE id = ?", eff, nowIso(), old.id);
    if (ex) await run(db, "UPDATE assignment_exceptions SET status = 'USED' WHERE id = ?", ex.id);
    await logAction(db, "assignment", old.id, "TRANSFERRED_OUT", "TRANSFER_PENDING", "CLOSED", actor.userId, t.receiving_unit_id, `${t.reference} effective ${eff}`);
    await recordDisposition(db, { personnelId: t.personnel_id, status: "RELEASED", reason: `Released from ${t.from_area_name} under transfer ${t.reference}`, actorId: actor.userId, effectiveDate: eff, assignmentId: old.id, reference: t.reference });
    const created = await insertAssignment(db, { personnelId: t.personnel_id, areaId: t.to_area_id, commencementDate: eff, notes: `Transferred from ${t.from_area_name} (${old.reference}) under ${t.reference}.`, requestId: old.request_id, status: "ACTIVE", actorId: actor.userId, authorisedBy: actor.userId, authorisedUnitId: t.receiving_unit_id });
    newId_ = created.id;
    await run(db, "UPDATE assignment_transfers SET status = 'COMPLETED', accepted_by = ?, accepted_at = ?, effective_date = ?, new_assignment_id = ?, decision_comment = ? WHERE id = ?", actor.userId, nowIso(), eff, created.id, input.comment.trim(), transferId);
    await logAction(db, "transfer", transferId, "ACCEPTED_COMPLETED", "PENDING_ACCEPTANCE", "COMPLETED", actor.userId, t.receiving_unit_id, input.comment);
    await audit(db, { actorId: actor.userId, action: "transfer.complete", category: "BUSINESS", entityType: "transfer", entityId: transferId, orgUnitId: t.receiving_unit_id, details: { ref: t.reference, closed: old.reference, opened: created.ref, effective: eff } });
  });
  if (decision === "DECLINE") await audit(db, { actorId: actor.userId, action: "transfer.decline", category: "BUSINESS", entityType: "transfer", entityId: transferId, orgUnitId: t.receiving_unit_id });
  await notify(db, t.initiated_by, `Transfer ${t.reference} ${decision === "ACCEPT" ? "completed" : "declined"}`, input.comment.trim(), `/app/transfers/${transferId}`);
  return newId_;
}

export async function cancelTransfer(db: DB, actor: Actor, transferId: string, reason: string) {
  const { transfer: t } = await getTransfer(db, actor, transferId);
  if (!["PENDING_RELEASE", "PENDING_ACCEPTANCE"].includes(t.status)) throw conflict("Only open transfers can be cancelled.");
  if (t.initiated_by !== actor.userId) throw forbidden("Only the initiating officer can withdraw a transfer.");
  if (reason.trim().length < 5) throw invalid("Record the reason.");
  await tx(db, async (db) => {
    await run(db, "UPDATE assignment_transfers SET status = 'CANCELLED', decision_comment = ? WHERE id = ?", reason.trim(), transferId);
    await revertTransfer(db, t, actor.userId, `Transfer ${t.reference} withdrawn: ${reason.trim()}`);
    await logAction(db, "transfer", transferId, "CANCEL", t.status, "CANCELLED", actor.userId, t.releasing_unit_id, reason);
    await audit(db, { actorId: actor.userId, action: "transfer.cancel", category: "BUSINESS", entityType: "transfer", entityId: transferId, orgUnitId: t.releasing_unit_id });
  });
}

// ── Dashboard summaries ─────────────────────────────────────────────────────
export async function assignmentSummary(db: DB, actor: Actor) {
  const s = scopeIn(actor, "assignment.view", ["a.responsible_unit_id", "a.home_unit_id"]);
  const policy = await tenurePolicy(db);
  const rows = await all<{ status: string; disposition_status: string; c: number }>(db,
    `SELECT a.status, p.disposition_status, COUNT(*) AS c FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id WHERE ${s.sql} GROUP BY a.status, p.disposition_status`, ...s.params);
  const sum = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((n, r) => n + Number(r.c), 0);
  const ts = scopeIn(actor, "assignment.view", ["t.releasing_unit_id", "t.receiving_unit_id"]);
  const transfers = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM assignment_transfers t WHERE t.status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE') AND ${ts.sql}`, ...ts.params))?.c ?? 0);
  const underMin = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM personnel_assignments a WHERE a.status = 'ACTIVE' AND a.continuous_start_date > ? AND ${s.sql}`, addDays(today(), -policy.minimumDays), ...s.params))?.c ?? 0);
  const byArea = await all<{ area_id: string; name: string; c: number }>(db,
    `SELECT ar.id AS area_id, ar.name, COUNT(*) AS c FROM personnel_assignments a JOIN operational_areas ar ON ar.id = a.area_id WHERE a.status IN ('ACTIVE','TRANSFER_PENDING') AND ${s.sql} GROUP BY ar.id, ar.name ORDER BY c DESC LIMIT 8`, ...s.params);
  return {
    active: sum((r) => r.status === "ACTIVE" || r.status === "TRANSFER_PENDING"),
    pendingApproval: sum((r) => r.status === "PENDING_APPROVAL"),
    approvedPending: sum((r) => r.status === "APPROVED"),
    reviewDue: sum((r) => (r.status === "ACTIVE") && (r.disposition_status === "REVIEW_DUE" || r.disposition_status === "RENEWAL_PENDING")),
    transfersOpen: transfers,
    underMinimumTenure: underMin,
    byArea,
    policy,
  };
}

/** Items awaiting this actor's assignment decisions (delegated approvers). */
export async function assignmentInbox(db: DB, actor: Actor) {
  const pending = await all<{ id: string; reference: string; full_name: string; area_name: string; responsible_unit_id: string; created_by: string; kind: string }>(db,
    `SELECT a.id, a.reference, CONCAT(p.surname, ', ', p.first_names) AS full_name, ar.name AS area_name, a.responsible_unit_id, a.created_by, 'Assignment approval' AS kind
       FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id JOIN operational_areas ar ON ar.id = a.area_id WHERE a.status = 'PENDING_APPROVAL'
     UNION ALL
     SELECT a.id, e.reference, CONCAT(p.surname, ', ', p.first_names), ar.name, a.responsible_unit_id, e.raised_by, CONCAT('Exception: ', e.category_code)
       FROM assignment_exceptions e JOIN personnel_assignments a ON a.id = e.assignment_id JOIN personnel_records p ON p.id = a.personnel_id JOIN operational_areas ar ON ar.id = a.area_id WHERE e.status = 'PENDING'
     UNION ALL
     SELECT a.id, a.reference, CONCAT(p.surname, ', ', p.first_names), ar.name, a.responsible_unit_id, '', 'Renewal decision'
       FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id JOIN operational_areas ar ON ar.id = a.area_id WHERE a.status = 'ACTIVE' AND p.disposition_status IN ('REVIEW_DUE','RENEWAL_PENDING')
     LIMIT 500`);
  const out: Array<(typeof pending)[number] & { href: string }> = [];
  for (const r of pending) if (r.created_by !== actor.userId && (await approvalUnitFor(db, actor, "ASSIGNMENT", r.responsible_unit_id))) out.push({ ...r, href: `/app/assignments/${r.id}` });
  const transfers = await all<TransferRow>(db, `${TR_SELECT} WHERE t.status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE') LIMIT 300`);
  for (const t of transfers) {
    if (t.initiated_by === actor.userId) continue;
    const ok = t.status === "PENDING_RELEASE"
      ? !!(await approvalUnitFor(db, actor, "ASSIGNMENT", t.releasing_unit_id))
      : can(actor, "assignment.receive", t.receiving_unit_id) || !!(await approvalUnitFor(db, actor, "ASSIGNMENT", t.receiving_unit_id));
    if (ok) out.push({ id: t.id, reference: t.reference, full_name: t.full_name, area_name: `${t.from_area_name} → ${t.to_area_name}`, responsible_unit_id: t.releasing_unit_id, created_by: t.initiated_by, kind: t.status === "PENDING_RELEASE" ? "Transfer: releasing decision" : "Transfer: receiving acceptance", href: `/app/transfers/${t.id}` });
  }
  return out;
}
