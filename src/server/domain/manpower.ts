/**
 * M-MPR — Manpower Requests, Contributions and the Roster Builder (Directive §6–§7).
 *
 * Request:      DRAFT → SUBMITTED → UNDER_REVIEW → (RECOMMENDED) → APPROVED → COMPLETED
 *                         └→ RETURNED → SUBMITTED (resubmitted)      └→ REJECTED;  DRAFT/RETURNED → CANCELLED
 * Contribution: PENDING → SUBMITTED → ACCEPTED, or → RETURNED → SUBMITTED; SUBMITTED can be recalled → PENDING.
 * Roster:       DRAFT|AMENDED → SUBMITTED → REVIEWED → APPROVED → FINALISED; an APPROVED roster is never edited:
 *               amending creates a new version (AMENDED) and the earlier one becomes SUPERSEDED when the new one
 *               is approved. Finalising creates the duty-area assignments (when the request names an area).
 *
 * Personnel are always referenced by registry id — names are never re-typed. Roster entries keep a snapshot
 * (service number, name, rank, home unit) for the historical record, traceable to the source record.
 * Eligibility (status, verification, conflicting assignments) is re-validated at contribution, roster build,
 * submission, approval and finalisation; reused lists are revalidated, never assumed.
 * Approval = MANPOWER delegation at the request's approval unit or an ancestor + business role (policy.approvalUnitFor).
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS } from "./catalogue";
import { addDays, conflict, forbidden, invalid, newId, notFound, notify, nowIso, today } from "./core";
import { type Actor, approvalUnitFor, can, requirePermission, unitsFor } from "./policy";
import { eligibilityOf } from "./personnel";
import { _insertAssignment } from "./assignments";

export const MPR_CATEGORIES = {
  NATIONAL_DUTY: "National duty",
  SPECIAL_DUTY: "Special duty",
  AREA_ASSIGNMENT: "Operational-area assignment",
  REINFORCEMENT: "Administrative reinforcement",
  OTHER: "Other authorised duty",
} as const;
export type MprCategory = keyof typeof MPR_CATEGORIES;

export const MPR_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Pending review", RETURNED: "Returned for correction", RECOMMENDED: "Recommended",
  APPROVED: "Approved", REJECTED: "Rejected", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
export const ROSTER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft roster", AMENDED: "Amended roster (draft)", SUBMITTED: "Submitted roster", REVIEWED: "Reviewed roster", APPROVED: "Approved roster",
  FINALISED: "Finalised roster", SUPERSEDED: "Superseded", WITHDRAWN: "Withdrawn",
};

const logAction = (db: DB, entityType: string, entityId: string, action: string, from: string | null, to: string | null, actorId: string, orgUnitId: string | null, comment?: string | null) =>
  run(db, "INSERT INTO approval_actions (entity_type, entity_id, action, from_status, to_status, actor_id, org_unit_id, comment, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    entityType, entityId, action, from, to, actorId, orgUnitId, comment ?? null, nowIso());

function assertAdministrative(...texts: string[]) {
  const t = texts.join(" ").toLowerCase();
  const hit = [...PROHIBITED_TERMS, "deployment instruction", "operational position", "route"].find((w) => new RegExp(`\\b${w}`).test(t));
  if (hit) throw invalid(`Manpower requests are administrative records. Remove references to "${hit}" (tactical plans, positions, routes and live deployment instructions are not recorded).`);
}

async function nextRef(db: DB): Promise<string> {
  const year = today().slice(0, 4);
  const r = await one<{ m: string | null }>(db, "SELECT MAX(reference) AS m FROM manpower_requests WHERE reference LIKE ?", `MPR-${year}-%`);
  const n = r?.m ? Number(r.m.split("-")[2]) + 1 : 1;
  return `MPR-${year}-${String(n).padStart(5, "0")}`;
}

/** Roster reference derived from the request: MPR-2026-00012 v2 → RST-2026-00012-V2. */
export const rosterRef = (requestRef: string, version: number) => `RST-${requestRef.slice(4)}-V${version}`;

const inList = (ids: string[]) => ids.map(() => "?").join(",");

// ── Requests ────────────────────────────────────────────────────────────────
export interface MprRow {
  id: string; reference: string; requesting_unit_id: string; requesting_unit_name: string; requested_by: string; requested_by_name: string;
  category: MprCategory; purpose: string; area_id: string | null; area_name: string | null; total_required: number; personnel_categories: string;
  commencement_date: string; duration_days: number; justification: string; approval_unit_id: string; approval_unit_name: string;
  status: string; submitted_at: string | null; decided_at: string | null; created_at: string; updated_at: string; version: number;
  allocated: number; contributed: number; accepted_units: number; contribution_units: number; contribution_deadline: string | null;
  workflow_id: string | null; current_level: number;
}
const MPR_SELECT = `SELECT m.*, ru.name AS requesting_unit_name, u.display_name AS requested_by_name, ar.name AS area_name, au.name AS approval_unit_name,
       COALESCE((SELECT SUM(c.required_count) FROM manpower_contributions c WHERE c.request_id = m.id), 0) AS allocated,
       COALESCE((SELECT COUNT(*) FROM manpower_contribution_entries e JOIN manpower_contributions c ON c.id = e.contribution_id WHERE c.request_id = m.id AND c.status IN ('SUBMITTED','ACCEPTED')), 0) AS contributed,
       (SELECT COUNT(*) FROM manpower_contributions c WHERE c.request_id = m.id AND c.status = 'ACCEPTED') AS accepted_units,
       (SELECT COUNT(*) FROM manpower_contributions c WHERE c.request_id = m.id) AS contribution_units
  FROM manpower_requests m JOIN org_units ru ON ru.id = m.requesting_unit_id JOIN users u ON u.id = m.requested_by
  JOIN org_units au ON au.id = m.approval_unit_id LEFT JOIN operational_areas ar ON ar.id = m.area_id`;

/** Requests visible to the actor: requesting unit in manpower.view scope, or the actor's units were asked to contribute. */
function mprScope(actor: Actor): { sql: string; params: string[] } {
  const units = unitsFor(actor, "manpower.view");
  if (units === null) return { sql: "1=1", params: [] };
  if (!units.length) return { sql: "1=0", params: [] };
  return {
    sql: `(m.requesting_unit_id IN (${inList(units)}) OR EXISTS (SELECT 1 FROM manpower_contributions c WHERE c.request_id = m.id AND c.contributing_unit_id IN (${inList(units)})))`,
    params: [...units, ...units],
  };
}

export async function listManpowerRequests(db: DB, actor: Actor, f: { status?: string; q?: string } = {}) {
  await requirePermission(db, actor, "manpower.view");
  const s = mprScope(actor);
  const where = [s.sql];
  const params: unknown[] = [...s.params];
  if (f.status === "OPEN") where.push("m.status IN ('SUBMITTED','UNDER_REVIEW','RETURNED','RECOMMENDED','APPROVED')");
  else if (f.status && f.status !== "ALL") { where.push("m.status = ?"); params.push(f.status); }
  if (f.q?.trim()) { where.push("(LOWER(m.reference) LIKE ? OR LOWER(m.purpose) LIKE ?)"); params.push(`%${f.q.trim().toLowerCase()}%`, `%${f.q.trim().toLowerCase()}%`); }
  return all<MprRow>(db, `${MPR_SELECT} WHERE ${where.join(" AND ")} ORDER BY m.created_at DESC LIMIT 300`, ...params);
}

export async function getManpowerRequest(db: DB, actor: Actor, id: string): Promise<MprRow> {
  await requirePermission(db, actor, "manpower.view");
  const s = mprScope(actor);
  const m = await one<MprRow>(db, `${MPR_SELECT} WHERE m.id = ? AND ${s.sql}`, id, ...s.params);
  if (!m) throw notFound();
  return m;
}

export const mprSchema = z.object({
  requestingUnitId: z.string().min(1, "Select the requesting unit."),
  category: z.enum(Object.keys(MPR_CATEGORIES) as [MprCategory, ...MprCategory[]]),
  purpose: z.string().trim().min(10, "Describe the general purpose (at least 10 characters).").max(200),
  areaId: z.string().optional().or(z.literal("")),
  totalRequired: z.coerce.number().int().min(1, "At least one officer is required.").max(5000),
  personnelCategories: z.string().trim().min(3, "State the applicable personnel categories or ranks.").max(200),
  commencementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the proposed commencement date."),
  durationDays: z.coerce.number().int().min(1).max(1095),
  justification: z.string().trim().min(20, "Give an administrative justification (at least 20 characters)."),
  approvalUnitId: z.string().min(1, "Select the approval authority."),
});

async function validateMpr(db: DB, actor: Actor, d: z.output<typeof mprSchema>) {
  await requirePermission(db, actor, "manpower.create", d.requestingUnitId, { type: "manpower_request" });
  assertAdministrative(d.purpose, d.justification, d.personnelCategories);
  const anc = await one(db, "SELECT 1 AS ok FROM org_unit_closure WHERE ancestor_id = ? AND descendant_id = ?", d.approvalUnitId, d.requestingUnitId);
  if (!anc) throw invalid("The approval authority must be the requesting unit or a unit above it.");
  if (d.areaId && !(await one(db, "SELECT id FROM operational_areas WHERE id = ? AND status = 'ACTIVE'", d.areaId))) throw invalid("Select an active operational area.");
  if (d.commencementDate < today()) throw invalid("The proposed commencement date cannot be in the past.");
}

export async function createManpowerRequest(db: DB, actor: Actor, input: z.input<typeof mprSchema>) {
  const d = mprSchema.parse(input);
  await validateMpr(db, actor, d);
  const unit = await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = ?", d.requestingUnitId);
  const id = newId("mpr");
  await tx(db, async (db) => {
    const ref = await nextRef(db);
    const t = nowIso();
    await run(db, `INSERT INTO manpower_requests (id, tenant_id, reference, requesting_unit_id, requested_by, category, purpose, area_id, total_required, personnel_categories, commencement_date, duration_days, justification, approval_unit_id, status, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'DRAFT', ?, ?)`,
      id, unit!.tenant_id, ref, d.requestingUnitId, actor.userId, d.category, d.purpose, d.areaId || null, d.totalRequired, d.personnelCategories, d.commencementDate, d.durationDays, d.justification, d.approvalUnitId, t, t);
    await logAction(db, "manpower_request", id, "CREATE", null, "DRAFT", actor.userId, d.requestingUnitId);
    await audit(db, { actorId: actor.userId, action: "manpower.request.create", category: "BUSINESS", entityType: "manpower_request", entityId: id, orgUnitId: d.requestingUnitId, details: { ref } });
  });
  return id;
}

export async function updateManpowerRequest(db: DB, actor: Actor, id: string, input: z.input<typeof mprSchema>) {
  const m = await getManpowerRequest(db, actor, id);
  if (!["DRAFT", "RETURNED"].includes(m.status)) throw conflict("Only draft or returned requests can be edited.");
  const d = mprSchema.parse({ ...input, requestingUnitId: m.requesting_unit_id });
  await validateMpr(db, actor, d);
  await tx(db, async (db) => {
    await run(db, `UPDATE manpower_requests SET category = ?, purpose = ?, area_id = ?, total_required = ?, personnel_categories = ?, commencement_date = ?, duration_days = ?, justification = ?, approval_unit_id = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      d.category, d.purpose, d.areaId || null, d.totalRequired, d.personnelCategories, d.commencementDate, d.durationDays, d.justification, d.approvalUnitId, nowIso(), id);
    await logAction(db, "manpower_request", id, "EDIT", m.status, m.status, actor.userId, m.requesting_unit_id);
    await audit(db, { actorId: actor.userId, action: "manpower.request.update", category: "BUSINESS", entityType: "manpower_request", entityId: id, orgUnitId: m.requesting_unit_id });
  });
}

export type MprAction = "SUBMIT" | "TAKE_REVIEW" | "RETURN" | "RECOMMEND" | "APPROVE" | "REJECT" | "CANCEL" | "COMPLETE";
const MPR_TRANSITIONS: Record<MprAction, { from: string[]; to: string }> = {
  SUBMIT: { from: ["DRAFT", "RETURNED"], to: "SUBMITTED" },
  TAKE_REVIEW: { from: ["SUBMITTED"], to: "UNDER_REVIEW" },
  RETURN: { from: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"], to: "RETURNED" },
  RECOMMEND: { from: ["UNDER_REVIEW"], to: "RECOMMENDED" },
  APPROVE: { from: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"], to: "APPROVED" },
  REJECT: { from: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"], to: "REJECTED" },
  CANCEL: { from: ["DRAFT", "RETURNED", "SUBMITTED"], to: "CANCELLED" },
  COMPLETE: { from: ["APPROVED"], to: "COMPLETED" },
};

export interface WorkflowStep { level: number; authority: "APPROVAL_UNIT" | "HQ"; label: string }
export interface ManpowerWorkflow { id: string; category: string; version: number; steps: WorkflowStep[]; status: string; note: string | null; created_at: string; created_by_name: string | null }

export async function listManpowerWorkflows(db: DB): Promise<ManpowerWorkflow[]> {
  const rows = await all<Omit<ManpowerWorkflow, "steps"> & { steps: string }>(db,
    "SELECT w.*, u.display_name AS created_by_name FROM manpower_workflows w LEFT JOIN users u ON u.id = w.created_by ORDER BY w.category, w.version DESC");
  return rows.map((r) => ({ ...r, steps: JSON.parse(r.steps) as WorkflowStep[] }));
}

async function workflowFor(db: DB, m: { category: string; workflow_id: string | null }): Promise<{ id: string; steps: WorkflowStep[] }> {
  const row = m.workflow_id
    ? await one<{ id: string; steps: string }>(db, "SELECT id, steps FROM manpower_workflows WHERE id = ?", m.workflow_id)
    : await one<{ id: string; steps: string }>(db, "SELECT id, steps FROM manpower_workflows WHERE category = ? AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1", m.category);
  if (!row) return { id: "", steps: [{ level: 1, authority: "APPROVAL_UNIT", label: "Approval authority named on the request" }] };
  return { id: row.id, steps: JSON.parse(row.steps) as WorkflowStep[] };
}

/** The unit whose MANPOWER delegation decides the request's current level, and the step itself. */
export async function currentApprovalStep(db: DB, m: MprRow) {
  const wf = await workflowFor(db, m);
  const step = wf.steps[Math.min(m.current_level, wf.steps.length) - 1] ?? wf.steps[0];
  return { step, total: wf.steps.length, unitId: step.authority === "HQ" ? "org_hq" : m.approval_unit_id };
}

/** True when the actor may decide the request at its current approval level (delegation, not the originator, not an earlier-level approver). */
export async function canDecideManpower(db: DB, actor: Actor, m: MprRow): Promise<string | null> {
  if (!["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"].includes(m.status) || m.requested_by === actor.userId) return null;
  const { unitId } = await currentApprovalStep(db, m);
  const unit = await approvalUnitFor(db, actor, "MANPOWER", unitId);
  if (!unit) return null;
  const earlier = await one(db, "SELECT 1 AS x FROM approval_actions WHERE entity_type = 'manpower_request' AND entity_id = ? AND actor_id = ? AND action LIKE 'APPROVE_L%' AND seq > COALESCE((SELECT MAX(seq) FROM approval_actions WHERE entity_type = 'manpower_request' AND entity_id = ? AND action IN ('SUBMIT','RESUBMIT')), 0)", m.id, actor.userId, m.id);
  return earlier ? null : unit;
}

const WF_STEP = z.object({ authority: z.enum(["APPROVAL_UNIT", "HQ"]), label: z.string().trim().min(3).max(120) });

/** Publishes a new version of a category's approval chain; the previous active version is retired. Submitted requests keep their version. */
export async function publishManpowerWorkflow(db: DB, actor: Actor, category: string, steps: Array<{ authority: string; label: string }>, note: string) {
  await requirePermission(db, actor, "workflow.configure", "org_hq", { type: "workflow" });
  if (!(category in MPR_CATEGORIES)) throw invalid("Unknown manpower category.");
  const parsed = z.array(WF_STEP).min(1, "Define at least one approval level.").max(3, "At most three approval levels.").parse(steps);
  if (note.trim().length < 10) throw invalid("Record the approval reference and reason for the change (at least 10 characters).");
  const id = newId("mpw");
  await tx(db, async (db) => {
    const v = Number((await one<{ v: number }>(db, "SELECT COALESCE(MAX(version), 0) AS v FROM manpower_workflows WHERE category = ?", category))?.v ?? 0) + 1;
    await run(db, "UPDATE manpower_workflows SET status = 'RETIRED' WHERE category = ? AND status = 'ACTIVE'", category);
    await run(db, "INSERT INTO manpower_workflows (id, category, version, steps, status, note, created_by, created_at) VALUES (?,?,?,?, 'ACTIVE', ?,?,?)",
      id, category, v, JSON.stringify(parsed.map((st, i) => ({ level: i + 1, ...st }))), note.trim(), actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "workflow.manpower.publish", category: "CONFIG", entityType: "workflow", entityId: id, details: { category, version: v, steps: parsed, note: note.trim() } });
  });
  return id;
}

export async function manpowerAction(db: DB, actor: Actor, id: string, action: MprAction, comment = "") {
  const m = await getManpowerRequest(db, actor, id);
  const tr = MPR_TRANSITIONS[action];
  if (!tr) throw invalid("Unknown action.");
  if (!tr.from.includes(m.status)) throw conflict(`This request is ${MPR_STATUS_LABEL[m.status].toLowerCase()}; "${action.toLowerCase().replace("_", " ")}" is not available.`);
  let unit: string | null = m.requesting_unit_id;
  if (action === "SUBMIT" || action === "CANCEL") {
    await requirePermission(db, actor, "manpower.create", m.requesting_unit_id, { type: "manpower_request", id });
    if (action === "SUBMIT") assertAdministrative(m.purpose, m.justification);
  } else if (action === "TAKE_REVIEW" || action === "RETURN" || action === "RECOMMEND") {
    await requirePermission(db, actor, "manpower.review", m.requesting_unit_id, { type: "manpower_request", id });
    if (m.requested_by === actor.userId && action !== "RETURN") throw forbidden("You cannot review a request you originated.");
  } else if (action === "APPROVE" || action === "REJECT") {
    if (m.requested_by === actor.userId) throw forbidden("You cannot approve a request you originated (separation of duties).");
    unit = await canDecideManpower(db, actor, m);
    if (!unit) {
      await audit(db, { actorId: actor.userId, action: "authz.denied:manpower.approve", outcome: "DENIED", category: "SECURITY", entityType: "manpower_request", entityId: id });
      throw forbidden("You do not hold delegated manpower approval authority for this request.");
    }
    if (m.requested_by === actor.userId) throw forbidden("You cannot approve a request you originated (separation of duties).");
  } else if (action === "COMPLETE") {
    await requirePermission(db, actor, "manpower.review", m.requesting_unit_id, { type: "manpower_request", id });
  }
  if (["RETURN", "REJECT"].includes(action) && comment.trim().length < 5) throw invalid("Record the reason.");
  const { step, total } = await currentApprovalStep(db, m);
  const intermediate = action === "APPROVE" && m.current_level < total;
  if (intermediate) {
    await tx(db, async (db) => {
      const n = await run(db, "UPDATE manpower_requests SET status = 'UNDER_REVIEW', current_level = current_level + 1, updated_at = ?, version = version + 1 WHERE id = ? AND status = ? AND current_level = ?", nowIso(), id, m.status, m.current_level);
      if (!n.changes) throw conflict("The request was changed by someone else. Reload and try again.");
      await logAction(db, "manpower_request", id, `APPROVE_L${m.current_level}`, m.status, "UNDER_REVIEW", actor.userId, unit, `${step.label}${comment ? ` — ${comment}` : ""}`);
      await audit(db, { actorId: actor.userId, action: "manpower.request.approve_level", category: "BUSINESS", entityType: "manpower_request", entityId: id, orgUnitId: m.requesting_unit_id, details: { ref: m.reference, level: m.current_level, of: total } });
    });
    const next = await currentApprovalStep(db, { ...m, current_level: m.current_level + 1 });
    const t = nowIso();
    const approvers = await all<{ user_id: string }>(db, `SELECT DISTINCT d.user_id FROM delegations d JOIN org_unit_closure c ON c.ancestor_id = d.org_unit_id AND c.descendant_id = ?
       WHERE d.domain = 'MANPOWER' AND d.revoked_at IS NULL AND (d.valid_to IS NULL OR d.valid_to > ?)`, next.unitId, t);
    for (const a of approvers) if (a.user_id !== actor.userId) await notify(db, a.user_id, `${m.reference}: level ${m.current_level + 1} approval needed`, next.step.label, `/app/manpower/${id}`, { category: "APPROVAL" });
    return;
  }
  const wfId = action === "SUBMIT" && !m.workflow_id ? (await workflowFor(db, m)).id || null : m.workflow_id;
  await tx(db, async (db) => {
    if (action === "SUBMIT" || action === "RETURN") await run(db, "UPDATE manpower_requests SET current_level = 1, workflow_id = ? WHERE id = ?", wfId, id);
    const n = await run(db, `UPDATE manpower_requests SET status = ?, updated_at = ?, version = version + 1 ${action === "SUBMIT" ? ", submitted_at = ?" : ["APPROVE", "REJECT"].includes(action) ? ", decided_at = ?" : ""} WHERE id = ? AND status = ?`,
      ...[tr.to, nowIso(), ...(action === "SUBMIT" || ["APPROVE", "REJECT"].includes(action) ? [nowIso()] : []), id, m.status]);
    if (!n.changes) throw conflict("The request was changed by someone else. Reload and try again.");
    await logAction(db, "manpower_request", id, m.status === "RETURNED" && action === "SUBMIT" ? "RESUBMIT" : action === "APPROVE" && total > 1 ? `APPROVE_L${m.current_level}` : action, m.status, tr.to, actor.userId, unit, comment || null);
    await audit(db, { actorId: actor.userId, action: `manpower.request.${action.toLowerCase()}`, category: "BUSINESS", entityType: "manpower_request", entityId: id, orgUnitId: m.requesting_unit_id, details: { ref: m.reference, from: m.status, to: tr.to } });
  });
  if (action !== "SUBMIT" && action !== "TAKE_REVIEW") await notify(db, m.requested_by, `${m.reference}: ${MPR_STATUS_LABEL[tr.to]}`, comment || `Status changed to ${MPR_STATUS_LABEL[tr.to].toLowerCase()}.`, `/app/manpower/${id}`);
}

export async function requestHistory(db: DB, entityType: string, id: string) {
  return all<{ seq: number; action: string; from_status: string | null; to_status: string | null; comment: string | null; actor_name: string; org_name: string | null; created_at: string }>(db,
    "SELECT x.*, u.display_name AS actor_name, o.name AS org_name FROM approval_actions x JOIN users u ON u.id = x.actor_id LEFT JOIN org_units o ON o.id = x.org_unit_id WHERE x.entity_type = ? AND x.entity_id = ? ORDER BY x.seq", entityType, id);
}

/** Approval units the actor can choose for a new request from `unitId` (the unit and its ancestors). */
export async function approvalUnitsFor(db: DB, unitId: string) {
  return all<{ id: string; name: string; depth: number }>(db, "SELECT o.id, o.name, c.depth FROM org_unit_closure c JOIN org_units o ON o.id = c.ancestor_id WHERE c.descendant_id = ? ORDER BY c.depth", unitId);
}

// ── Distribution of contribution requirements ───────────────────────────────
export interface ContributionRow {
  id: string; request_id: string; request_ref: string; purpose: string; contributing_unit_id: string; unit_name: string; required_count: number; rank_note: string | null;
  status: string; revision: number; submitted_by_name: string | null; submitted_at: string | null; reviewed_by_name: string | null; reviewed_at: string | null; review_comment: string | null;
  entries: number; request_status: string; commencement_date: string; requesting_unit_id: string; contribution_deadline: string | null;
}
const C_SELECT = `SELECT c.*, m.reference AS request_ref, m.purpose, m.status AS request_status, m.commencement_date, m.requesting_unit_id, m.contribution_deadline, o.name AS unit_name,
       su.display_name AS submitted_by_name, rv.display_name AS reviewed_by_name,
       (SELECT COUNT(*) FROM manpower_contribution_entries e WHERE e.contribution_id = c.id) AS entries
  FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id JOIN org_units o ON o.id = c.contributing_unit_id
  LEFT JOIN users su ON su.id = c.submitted_by LEFT JOIN users rv ON rv.id = c.reviewed_by`;

export async function requestContributions(db: DB, actor: Actor, requestId: string) {
  await getManpowerRequest(db, actor, requestId);
  return all<ContributionRow>(db, `${C_SELECT} WHERE c.request_id = ? ORDER BY o.name`, requestId);
}

export async function setRequirement(db: DB, actor: Actor, requestId: string, input: { unitId: string; count: number; rankNote?: string; deadline?: string }) {
  const m = await getManpowerRequest(db, actor, requestId);
  await requirePermission(db, actor, "manpower.review", m.requesting_unit_id, { type: "manpower_request", id: requestId });
  if (m.status !== "APPROVED") throw conflict("Contribution requirements are distributed after the request is approved.");
  if (!can(actor, "manpower.review", input.unitId)) throw forbidden("You can only request contributions from units within your authorised scope.");
  const count = Math.trunc(Number(input.count));
  if (!(count >= 1 && count <= 5000)) throw invalid("Enter the number of officers required from this unit.");
  const unit = await one<{ tenant_id: string; status: string; name: string }>(db, "SELECT tenant_id, status, name FROM org_units WHERE id = ?", input.unitId);
  if (!unit || unit.status !== "ACTIVE") throw invalid("Select an active unit.");
  const existing = await one<{ id: string; status: string; required_count: number }>(db, "SELECT id, status, required_count FROM manpower_contributions WHERE request_id = ? AND contributing_unit_id = ?", requestId, input.unitId);
  const others = Number((await one<{ s: number }>(db, "SELECT COALESCE(SUM(required_count),0) AS s FROM manpower_contributions WHERE request_id = ? AND contributing_unit_id <> ?", requestId, input.unitId))?.s ?? 0);
  if (others + count > m.total_required) throw invalid(`This would allocate ${others + count} officers; the request requires ${m.total_required}.`);
  if (input.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || input.deadline < today())) throw invalid("The contribution deadline must be today or later.");
  const defaultDays = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'manpower.default_deadline_days'"))?.value) || 7;
  await tx(db, async (db) => {
    if (input.deadline) await run(db, "UPDATE manpower_requests SET contribution_deadline = ? WHERE id = ?", input.deadline, requestId);
    else await run(db, "UPDATE manpower_requests SET contribution_deadline = ? WHERE id = ? AND contribution_deadline IS NULL", addDays(today(), defaultDays), requestId);
    if (existing) {
      if (existing.status === "ACCEPTED") throw conflict("This unit's contribution has already been accepted.");
      await run(db, "UPDATE manpower_contributions SET required_count = ?, rank_note = ? WHERE id = ?", count, input.rankNote?.trim() || null, existing.id);
    } else {
      await run(db, "INSERT INTO manpower_contributions (id, request_id, tenant_id, contributing_unit_id, required_count, rank_note, status, created_at) VALUES (?,?,?,?,?,?, 'PENDING', ?)",
        newId("mpc"), requestId, unit.tenant_id, input.unitId, count, input.rankNote?.trim() || null, nowIso());
    }
    await logAction(db, "manpower_request", requestId, "REQUIREMENT_SET", null, null, actor.userId, input.unitId, `${unit.name}: ${count}${input.rankNote ? ` (${input.rankNote})` : ""}`);
    await audit(db, { actorId: actor.userId, action: "manpower.requirement.set", category: "BUSINESS", entityType: "manpower_request", entityId: requestId, orgUnitId: input.unitId, details: { count } });
  });
  // Notify officers who can contribute for that unit.
  const t = nowIso();
  const recipients = await all<{ user_id: string }>(db,
    `SELECT DISTINCT ra.user_id FROM role_assignments ra JOIN org_unit_closure c ON c.ancestor_id = ra.org_unit_id AND c.descendant_id = ?
       JOIN role_permissions rp ON rp.role_code = ra.role_code AND rp.permission = 'manpower.contribute'
      WHERE ra.revoked_at IS NULL AND (ra.valid_to IS NULL OR ra.valid_to > ?) AND (c.depth = 0 OR rp.coverage <> 'UNIT')`, input.unitId, t);
  for (const r of recipients) await notify(db, r.user_id, `Contribution requested: ${m.reference}`, `${unit.name} is asked to contribute ${count} officer(s).`, `/app/manpower/contributions`, { category: "MANPOWER" });
}

export async function removeRequirement(db: DB, actor: Actor, contributionId: string) {
  const c = await one<ContributionRow>(db, `${C_SELECT} WHERE c.id = ?`, contributionId);
  if (!c) throw notFound();
  const m = await getManpowerRequest(db, actor, c.request_id);
  await requirePermission(db, actor, "manpower.review", m.requesting_unit_id, { type: "manpower_request", id: m.id });
  if (c.status !== "PENDING" || Number(c.entries) > 0) throw conflict("Only requirements with no submitted personnel can be removed.");
  await run(db, "DELETE FROM manpower_contributions WHERE id = ?", contributionId);
  await logAction(db, "manpower_request", m.id, "REQUIREMENT_REMOVED", null, null, actor.userId, c.contributing_unit_id, c.unit_name);
  await audit(db, { actorId: actor.userId, action: "manpower.requirement.remove", category: "BUSINESS", entityType: "manpower_request", entityId: m.id, orgUnitId: c.contributing_unit_id });
}

// ── Contributions (unit side) ───────────────────────────────────────────────
export async function myContributions(db: DB, actor: Actor, status?: string) {
  await requirePermission(db, actor, "manpower.contribute");
  const units = unitsFor(actor, "manpower.contribute");
  const scope = units === null ? "1=1" : units.length ? `c.contributing_unit_id IN (${inList(units)})` : "1=0";
  const st = status === "OPEN" ? "AND c.status IN ('PENDING','RETURNED','SUBMITTED') AND m.status = 'APPROVED'" : "";
  return all<ContributionRow>(db, `${C_SELECT} WHERE ${scope} ${st} ORDER BY c.created_at DESC LIMIT 300`, ...(units ?? []));
}

export async function getContribution(db: DB, actor: Actor, id: string) {
  const c = await one<ContributionRow>(db, `${C_SELECT} WHERE c.id = ?`, id);
  if (!c) throw notFound();
  const contributor = can(actor, "manpower.contribute", c.contributing_unit_id);
  const reviewer = can(actor, "manpower.review", c.requesting_unit_id);
  if (!contributor && !reviewer && !can(actor, "manpower.view", c.requesting_unit_id)) throw notFound();
  const entries = await all<{ id: string; personnel_id: string; personnel_ref: string; service_number: string; full_name: string; rank_name: string; seniority: number; home_unit_name: string; added_at: string }>(db,
    `SELECT e.id, e.personnel_id, p.personnel_ref, p.service_number, CONCAT(p.surname, ', ', p.first_names) AS full_name, r.name AS rank_name, r.seniority, o.name AS home_unit_name, e.added_at
       FROM manpower_contribution_entries e JOIN personnel_records p ON p.id = e.personnel_id JOIN ranks r ON r.code = p.rank_code JOIN org_units o ON o.id = p.home_unit_id
      WHERE e.contribution_id = ? ORDER BY r.seniority DESC, p.surname`, id);
  const withEligibility = [];
  for (const e of entries) withEligibility.push({ ...e, eligibility: await eligibilityOf(db, e.personnel_id) });
  return { contribution: c, entries: withEligibility, canEdit: contributor && ["PENDING", "RETURNED"].includes(c.status) && c.request_status === "APPROVED", canRecall: contributor && c.status === "SUBMITTED", canReview: reviewer && c.status === "SUBMITTED" };
}

/** Eligible personnel in the contributing unit's subtree, not already offered for this request. */
export async function eligibleForContribution(db: DB, actor: Actor, contributionId: string, q?: string) {
  const { contribution: c, canEdit } = await getContribution(db, actor, contributionId);
  if (!canEdit) return [];
  const params: unknown[] = [c.contributing_unit_id, c.request_id];
  let extra = "";
  if (q?.trim()) { extra = "AND (p.name_key LIKE ? OR LOWER(p.service_number) LIKE ?)"; params.push(`%${q.trim().toLowerCase()}%`, `%${q.trim().toLowerCase()}%`); }
  const rows = await all<{ id: string; personnel_ref: string; service_number: string; full_name: string; rank_name: string; seniority: number; home_unit_name: string; disposition_status: string }>(db,
    `SELECT p.id, p.personnel_ref, p.service_number, CONCAT(p.surname, ', ', p.first_names) AS full_name, r.name AS rank_name, r.seniority, o.name AS home_unit_name, p.disposition_status
       FROM personnel_records p JOIN ranks r ON r.code = p.rank_code JOIN org_units o ON o.id = p.home_unit_id
      WHERE p.home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = ?)
        AND p.employment_status = 'SERVING' AND p.verification_status <> 'REJECTED'
        AND p.disposition_status IN ('AVAILABLE_HOME','RETURNED_HOME','RELEASED','COMPLETED','CANCELLED')
        AND NOT EXISTS (SELECT 1 FROM personnel_assignments a WHERE a.personnel_id = p.id AND a.status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING'))
        AND NOT EXISTS (SELECT 1 FROM manpower_contribution_entries e JOIN manpower_contributions c2 ON c2.id = e.contribution_id WHERE c2.request_id = ? AND e.personnel_id = p.id)
        ${extra}
      ORDER BY r.seniority DESC, p.surname LIMIT 200`, ...params);
  return rows.filter((p) => can(actor, "personnel.view", c.contributing_unit_id) || can(actor, "manpower.contribute", c.contributing_unit_id) ? true : false);
}

export async function addContributionEntries(db: DB, actor: Actor, contributionId: string, personnelIds: string[]) {
  const { contribution: c, canEdit, entries } = await getContribution(db, actor, contributionId);
  if (!canEdit) throw conflict("This contribution cannot be edited now.");
  const ids = [...new Set(personnelIds.filter(Boolean))];
  if (!ids.length) throw invalid("Select at least one officer.");
  if (entries.length + ids.length > c.required_count) throw invalid(`The requirement is ${c.required_count} officer(s); ${entries.length} already selected.`);
  await tx(db, async (db) => {
    for (const pid of ids) {
      const p = await one<{ home_unit_id: string }>(db, "SELECT home_unit_id FROM personnel_records WHERE id = ?", pid);
      if (!p || !(await one(db, "SELECT 1 AS ok FROM org_unit_closure WHERE ancestor_id = ? AND descendant_id = ?", c.contributing_unit_id, p.home_unit_id))) throw invalid("Only officers whose home unit is within the contributing unit can be submitted.");
      const el = await eligibilityOf(db, pid);
      if (!el.eligible) throw conflict(`An officer is not eligible: ${el.reasons.join("; ")}.`);
      if (await one(db, "SELECT 1 AS ok FROM manpower_contribution_entries e JOIN manpower_contributions c2 ON c2.id = e.contribution_id WHERE c2.request_id = ? AND e.personnel_id = ?", c.request_id, pid)) throw conflict("An officer has already been offered for this request by another unit.");
      await run(db, "INSERT INTO manpower_contribution_entries (id, contribution_id, personnel_id, added_by, added_at) VALUES (?,?,?,?,?)", newId("mce"), contributionId, pid, actor.userId, nowIso());
    }
    await audit(db, { actorId: actor.userId, action: "manpower.contribution.add", category: "BUSINESS", entityType: "manpower_contribution", entityId: contributionId, orgUnitId: c.contributing_unit_id, details: { added: ids.length } });
  });
}

export async function removeContributionEntry(db: DB, actor: Actor, contributionId: string, entryId: string) {
  const { contribution: c, canEdit } = await getContribution(db, actor, contributionId);
  if (!canEdit) throw conflict("This contribution cannot be edited now.");
  const n = await run(db, "DELETE FROM manpower_contribution_entries WHERE id = ? AND contribution_id = ?", entryId, contributionId);
  if (!n.changes) throw notFound();
  await audit(db, { actorId: actor.userId, action: "manpower.contribution.remove", category: "BUSINESS", entityType: "manpower_contribution", entityId: contributionId, orgUnitId: c.contributing_unit_id });
}

/** Reuses a previous FINALISED/APPROVED roster as a reference list: every officer is revalidated; ineligible ones are skipped with reasons. */
export async function reuseRosterList(db: DB, actor: Actor, contributionId: string, rosterVersionId: string) {
  const { contribution: c, canEdit, entries } = await getContribution(db, actor, contributionId);
  if (!canEdit) throw conflict("This contribution cannot be edited now.");
  const v = await one<{ request_id: string; status: string }>(db, "SELECT request_id, status FROM roster_versions WHERE id = ?", rosterVersionId);
  if (!v || !["APPROVED", "FINALISED", "SUPERSEDED"].includes(v.status)) throw invalid("Select a previously approved roster.");
  await getManpowerRequest(db, actor, v.request_id);
  const candidates = await all<{ personnel_id: string; full_name: string; home_unit_id: string }>(db, "SELECT personnel_id, full_name, home_unit_id FROM roster_entries WHERE version_id = ?", rosterVersionId);
  const added: string[] = [];
  const skipped: Array<{ name: string; reasons: string[] }> = [];
  let room = c.required_count - entries.length;
  await tx(db, async (db) => {
    for (const p of candidates) {
      const cur = await one<{ home_unit_id: string; name: string }>(db, "SELECT home_unit_id, CONCAT(surname, ', ', first_names) AS name FROM personnel_records WHERE id = ?", p.personnel_id);
      const reasons: string[] = [];
      if (!cur || !(await one(db, "SELECT 1 AS ok FROM org_unit_closure WHERE ancestor_id = ? AND descendant_id = ?", c.contributing_unit_id, cur.home_unit_id))) reasons.push("No longer a member of this unit");
      const el = await eligibilityOf(db, p.personnel_id);
      reasons.push(...el.reasons);
      if (await one(db, "SELECT 1 AS ok FROM manpower_contribution_entries e JOIN manpower_contributions c2 ON c2.id = e.contribution_id WHERE c2.request_id = ? AND e.personnel_id = ?", c.request_id, p.personnel_id)) reasons.push("Already offered for this request");
      if (!reasons.length && room <= 0) reasons.push("Requirement already filled");
      if (reasons.length) { skipped.push({ name: cur?.name ?? p.full_name, reasons }); continue; }
      await run(db, "INSERT INTO manpower_contribution_entries (id, contribution_id, personnel_id, added_by, added_at) VALUES (?,?,?,?,?)", newId("mce"), contributionId, p.personnel_id, actor.userId, nowIso());
      added.push(p.personnel_id);
      room--;
    }
    await audit(db, { actorId: actor.userId, action: "manpower.contribution.reuse", category: "BUSINESS", entityType: "manpower_contribution", entityId: contributionId, orgUnitId: c.contributing_unit_id, details: { roster: rosterVersionId, added: added.length, skipped: skipped.length } });
  });
  return { added: added.length, skipped };
}

export async function contributionAction(db: DB, actor: Actor, contributionId: string, action: "SUBMIT" | "RECALL" | "ACCEPT" | "RETURN", comment = "") {
  const { contribution: c, entries, canEdit, canRecall, canReview } = await getContribution(db, actor, contributionId);
  const t = nowIso();
  let to: string;
  if (action === "SUBMIT") {
    if (!canEdit) throw conflict("This contribution cannot be submitted now.");
    if (!entries.length) throw invalid("Select at least one officer before submitting.");
    const bad = entries.filter((e) => !e.eligibility.eligible);
    if (bad.length) throw conflict(`${bad.length} selected officer(s) are no longer eligible. Remove them first.`);
    to = "SUBMITTED";
  } else if (action === "RECALL") {
    if (!canRecall) throw conflict("Only a submitted contribution can be recalled by the contributing unit.");
    to = "PENDING";
  } else {
    if (!canReview) throw forbidden("You are not authorised to review this contribution.");
    if ((await one<{ submitted_by: string }>(db, "SELECT submitted_by FROM manpower_contributions WHERE id = ?", contributionId))?.submitted_by === actor.userId) throw forbidden("You cannot review a contribution you submitted.");
    if (action === "RETURN" && comment.trim().length < 5) throw invalid("Record what needs correcting.");
    to = action === "ACCEPT" ? "ACCEPTED" : "RETURNED";
  }
  await tx(db, async (db) => {
    if (action === "SUBMIT") await run(db, "UPDATE manpower_contributions SET status = 'SUBMITTED', revision = revision + 1, submitted_by = ?, submitted_at = ? WHERE id = ?", actor.userId, t, contributionId);
    else if (action === "RECALL") await run(db, "UPDATE manpower_contributions SET status = 'PENDING' WHERE id = ?", contributionId);
    else await run(db, "UPDATE manpower_contributions SET status = ?, reviewed_by = ?, reviewed_at = ?, review_comment = ? WHERE id = ?", to, actor.userId, t, comment.trim() || null, contributionId);
    await logAction(db, "manpower_contribution", contributionId, action, c.status, to, actor.userId, c.contributing_unit_id, comment || `${entries.length} officer(s)`);
    await logAction(db, "manpower_request", c.request_id, `CONTRIBUTION_${action}`, null, null, actor.userId, c.contributing_unit_id, `${c.unit_name}: ${entries.length} officer(s)${comment ? ` — ${comment}` : ""}`);
    await audit(db, { actorId: actor.userId, action: `manpower.contribution.${action.toLowerCase()}`, category: "BUSINESS", entityType: "manpower_contribution", entityId: contributionId, orgUnitId: c.contributing_unit_id, details: { officers: entries.length } });
  });
  if (action === "ACCEPT" || action === "RETURN") {
    const sub = await one<{ submitted_by: string | null }>(db, "SELECT submitted_by FROM manpower_contributions WHERE id = ?", contributionId);
    if (sub?.submitted_by) await notify(db, sub.submitted_by, `Contribution ${action === "ACCEPT" ? "accepted" : "returned"}: ${c.request_ref}`, comment || "Decision recorded.", `/app/manpower/contributions/${contributionId}`);
  }
}

// ── Roster builder ──────────────────────────────────────────────────────────
export interface RosterEntry {
  id: string; personnel_id: string; contribution_id: string | null; source: string; service_number: string; full_name: string; rank_code: string; rank_name: string; seniority: number;
  home_unit_id: string; home_unit_name: string; issues: string | null; current_name: string; current_rank: string; current_home: string; contributor_unit_name: string | null;
}

export async function listRosters(db: DB, actor: Actor, requestId: string) {
  await getManpowerRequest(db, actor, requestId);
  return all<{ id: string; version_no: number; status: string; based_on_id: string | null; amendment_reason: string | null; created_by_name: string; created_at: string; approved_at: string | null; entries: number; issues: number }>(db,
    `SELECT v.*, u.display_name AS created_by_name, (SELECT COUNT(*) FROM roster_entries e WHERE e.version_id = v.id) AS entries,
            (SELECT COUNT(*) FROM roster_entries e WHERE e.version_id = v.id AND e.issues IS NOT NULL) AS issues
       FROM roster_versions v JOIN users u ON u.id = v.created_by WHERE v.request_id = ? ORDER BY v.version_no DESC`, requestId);
}

/** Rosters visible to the actor (for the roster index and reuse pickers). */
export async function rosterIndex(db: DB, actor: Actor, status?: string) {
  await requirePermission(db, actor, "roster.view");
  const units = unitsFor(actor, "roster.view");
  const scope = units === null ? "1=1" : units.length ? `m.requesting_unit_id IN (${inList(units)})` : "1=0";
  const st = status ? `AND v.status IN (${status.split(",").map(() => "?").join(",")})` : "";
  return all<{ id: string; request_id: string; reference: string; purpose: string; version_no: number; status: string; entries: number; created_at: string; approved_at: string | null; area_name: string | null }>(db,
    `SELECT v.id, v.request_id, m.reference, m.purpose, v.version_no, v.status, v.created_at, v.approved_at, ar.name AS area_name, (SELECT COUNT(*) FROM roster_entries e WHERE e.version_id = v.id) AS entries
       FROM roster_versions v JOIN manpower_requests m ON m.id = v.request_id LEFT JOIN operational_areas ar ON ar.id = m.area_id
      WHERE ${scope} ${st} ORDER BY v.created_at DESC LIMIT 300`, ...(units ?? []), ...(status ? status.split(",") : []));
}

export async function getRoster(db: DB, actor: Actor, versionId: string) {
  const v = await one<{ id: string; request_id: string; version_no: number; status: string; based_on_id: string | null; amendment_reason: string | null; created_by: string; created_at: string; submitted_at: string | null; reviewed_by: string | null; reviewed_at: string | null; approved_by: string | null; approved_at: string | null; finalised_at: string | null; created_by_name: string; reviewed_by_name: string | null; approved_by_name: string | null; finalised_by_name: string | null }>(db,
    `SELECT v.*, cu.display_name AS created_by_name, rv.display_name AS reviewed_by_name, ap.display_name AS approved_by_name, fi.display_name AS finalised_by_name
       FROM roster_versions v JOIN users cu ON cu.id = v.created_by LEFT JOIN users rv ON rv.id = v.reviewed_by LEFT JOIN users ap ON ap.id = v.approved_by LEFT JOIN users fi ON fi.id = v.finalised_by WHERE v.id = ?`, versionId);
  if (!v) throw notFound();
  await requirePermission(db, actor, "roster.view");
  const request = await getManpowerRequest(db, actor, v.request_id);
  if (!can(actor, "roster.view", request.requesting_unit_id)) throw notFound();
  const entries = await all<RosterEntry>(db,
    `SELECT e.*, r.name AS rank_name, r.seniority, o.name AS home_unit_name, CONCAT(p.surname, ', ', p.first_names) AS current_name, p.rank_code AS current_rank, p.home_unit_id AS current_home, cu.name AS contributor_unit_name
       FROM roster_entries e JOIN ranks r ON r.code = e.rank_code JOIN org_units o ON o.id = e.home_unit_id JOIN personnel_records p ON p.id = e.personnel_id
       LEFT JOIN manpower_contributions c ON c.id = e.contribution_id LEFT JOIN org_units cu ON cu.id = c.contributing_unit_id
      WHERE e.version_id = ? ORDER BY o.name, r.seniority DESC, e.full_name`, versionId);
  const builder = can(actor, "roster.build", request.requesting_unit_id);
  const approver = await approvalUnitFor(db, actor, "MANPOWER", request.approval_unit_id);
  return {
    version: v, request, entries,
    can: {
      edit: builder && ["DRAFT", "AMENDED"].includes(v.status),
      submit: builder && ["DRAFT", "AMENDED"].includes(v.status),
      review: can(actor, "roster.review", request.requesting_unit_id) && v.status === "SUBMITTED" && v.created_by !== actor.userId,
      ret: (can(actor, "roster.review", request.requesting_unit_id) || !!approver) && ["SUBMITTED", "REVIEWED"].includes(v.status),
      approve: !!approver && v.status === "REVIEWED" && v.created_by !== actor.userId,
      finalise: !!approver && v.status === "APPROVED",
      amend: builder && v.status === "APPROVED",
      export: can(actor, "roster.export", request.requesting_unit_id),
    },
  };
}

/** Recomputes integrity issues for every entry of a version (duplicates, eligibility, conflicts, outdated records). */
async function validateVersion(db: DB, versionId: string) {
  const rows = await all<{ id: string; personnel_id: string; service_number: string; full_name: string; rank_code: string; home_unit_id: string; contribution_id: string | null }>(db, "SELECT * FROM roster_entries WHERE version_id = ?", versionId);
  const counts = new Map<string, number>();
  const dupSvc = new Map<string, number>();
  for (const r of rows) dupSvc.set(r.service_number, (dupSvc.get(r.service_number) ?? 0) + 1);
  let issues = 0;
  for (const r of rows) {
    const list: string[] = [];
    const p = await one<{ service_number: string; surname: string; first_names: string; rank_code: string; home_unit_id: string }>(db, "SELECT service_number, surname, first_names, rank_code, home_unit_id FROM personnel_records WHERE id = ?", r.personnel_id);
    if (!p) list.push("Registry record missing");
    else {
      if (`${p.surname}, ${p.first_names}` !== r.full_name || p.rank_code !== r.rank_code || p.home_unit_id !== r.home_unit_id) list.push("Outdated: registry record changed since it was added");
      const el = await eligibilityOf(db, r.personnel_id);
      list.push(...el.reasons);
    }
    if ((dupSvc.get(r.service_number) ?? 0) > 1) list.push("Duplicate service number in roster");
    counts.set(r.personnel_id, (counts.get(r.personnel_id) ?? 0) + 1);
    const val = list.length ? list.join("; ").slice(0, 300) : null;
    if (val) issues++;
    await run(db, "UPDATE roster_entries SET issues = ? WHERE id = ?", val, r.id);
  }
  return issues;
}

async function snapshot(db: DB, personnelId: string) {
  const p = await one<{ service_number: string; name: string; rank_code: string; home_unit_id: string }>(db, "SELECT service_number, CONCAT(surname, ', ', first_names) AS name, rank_code, home_unit_id FROM personnel_records WHERE id = ?", personnelId);
  if (!p) throw notFound("Officer not found.");
  return p;
}

export async function buildRoster(db: DB, actor: Actor, requestId: string) {
  const m = await getManpowerRequest(db, actor, requestId);
  await requirePermission(db, actor, "roster.build", m.requesting_unit_id, { type: "manpower_request", id: requestId });
  if (m.status !== "APPROVED") throw conflict("Rosters are built from approved manpower requests.");
  if (await one(db, "SELECT id FROM roster_versions WHERE request_id = ? AND status IN ('DRAFT','AMENDED','SUBMITTED','REVIEWED')", requestId)) throw conflict("A roster version is already in preparation for this request.");
  if (await one(db, "SELECT id FROM roster_versions WHERE request_id = ? AND status IN ('APPROVED','FINALISED')", requestId)) throw conflict("An approved roster exists. Amend it to create a new version.");
  const accepted = await all<{ contribution_id: string; personnel_id: string }>(db,
    `SELECT e.contribution_id, e.personnel_id FROM manpower_contribution_entries e JOIN manpower_contributions c ON c.id = e.contribution_id WHERE c.request_id = ? AND c.status = 'ACCEPTED'`, requestId);
  if (!accepted.length) throw conflict("No accepted contributions yet. Accept at least one unit's contribution first.");
  const id = newId("rv");
  await tx(db, async (db) => {
    const no = Number((await one<{ n: number }>(db, "SELECT COALESCE(MAX(version_no),0) AS n FROM roster_versions WHERE request_id = ?", requestId))?.n ?? 0) + 1;
    await run(db, "INSERT INTO roster_versions (id, request_id, version_no, reference, status, created_by, created_at) VALUES (?,?,?,?, 'DRAFT', ?, ?)", id, requestId, no, rosterRef(m.reference, no), actor.userId, nowIso());
    for (const e of accepted) {
      const s = await snapshot(db, e.personnel_id);
      await run(db, "INSERT IGNORE INTO roster_entries (id, version_id, personnel_id, contribution_id, source, service_number, full_name, rank_code, home_unit_id, added_by, added_at) VALUES (?,?,?,?, 'CONTRIBUTION', ?,?,?,?,?,?)",
        newId("re"), id, e.personnel_id, e.contribution_id, s.service_number, s.name, s.rank_code, s.home_unit_id, actor.userId, nowIso());
    }
    const issues = await validateVersion(db, id);
    await logAction(db, "roster", id, "BUILD", null, "DRAFT", actor.userId, m.requesting_unit_id, `${accepted.length} officer(s) from accepted contributions; ${issues} with issues`);
    await logAction(db, "manpower_request", requestId, "ROSTER_BUILT", null, null, actor.userId, m.requesting_unit_id, `Version ${no}`);
    await audit(db, { actorId: actor.userId, action: "roster.build", category: "BUSINESS", entityType: "roster", entityId: id, orgUnitId: m.requesting_unit_id, details: { request: m.reference, version: no, entries: accepted.length } });
  });
  return id;
}

export async function revalidateRoster(db: DB, actor: Actor, versionId: string) {
  const r = await getRoster(db, actor, versionId);
  if (!r.can.edit) throw conflict("Only draft or amended rosters can be revalidated.");
  return tx(db, (db) => validateVersion(db, versionId));
}

export async function addRosterEntry(db: DB, actor: Actor, versionId: string, personnelId: string, reason: string) {
  const r = await getRoster(db, actor, versionId);
  if (!r.can.edit) throw conflict("Only draft or amended rosters can be edited.");
  if (reason.trim().length < 5) throw invalid("Record the authority for the manual adjustment.");
  const p = await one<{ home_unit_id: string }>(db, "SELECT home_unit_id FROM personnel_records WHERE id = ?", personnelId);
  if (!p || !can(actor, "personnel.view", p.home_unit_id)) throw notFound("Officer not found or not within your authorised scope.");
  if (await one(db, "SELECT id FROM roster_entries WHERE version_id = ? AND personnel_id = ?", versionId, personnelId)) throw conflict("Duplicate: this officer is already on the roster.");
  const el = await eligibilityOf(db, personnelId);
  if (!el.eligible) throw conflict(`The officer is not eligible: ${el.reasons.join("; ")}.`);
  await tx(db, async (db) => {
    const s = await snapshot(db, personnelId);
    await run(db, "INSERT INTO roster_entries (id, version_id, personnel_id, source, service_number, full_name, rank_code, home_unit_id, added_by, added_at) VALUES (?,?,?, 'MANUAL', ?,?,?,?,?,?)",
      newId("re"), versionId, personnelId, s.service_number, s.name, s.rank_code, s.home_unit_id, actor.userId, nowIso());
    await logAction(db, "roster", versionId, "MANUAL_ADD", null, null, actor.userId, r.request.requesting_unit_id, `${s.name} (${s.service_number}): ${reason.trim()}`);
    await audit(db, { actorId: actor.userId, action: "roster.entry.add", category: "BUSINESS", entityType: "roster", entityId: versionId, orgUnitId: r.request.requesting_unit_id, details: { personnel: personnelId, reason: reason.trim() } });
  });
}

export async function removeRosterEntry(db: DB, actor: Actor, versionId: string, entryId: string, reason: string) {
  const r = await getRoster(db, actor, versionId);
  if (!r.can.edit) throw conflict("Only draft or amended rosters can be edited.");
  if (reason.trim().length < 5) throw invalid("Record the reason for removing the officer.");
  const e = await one<{ full_name: string; service_number: string }>(db, "SELECT full_name, service_number FROM roster_entries WHERE id = ? AND version_id = ?", entryId, versionId);
  if (!e) throw notFound();
  await tx(db, async (db) => {
    await run(db, "DELETE FROM roster_entries WHERE id = ?", entryId);
    await logAction(db, "roster", versionId, "MANUAL_REMOVE", null, null, actor.userId, r.request.requesting_unit_id, `${e.full_name} (${e.service_number}): ${reason.trim()}`);
    await audit(db, { actorId: actor.userId, action: "roster.entry.remove", category: "BUSINESS", entityType: "roster", entityId: versionId, orgUnitId: r.request.requesting_unit_id, details: { reason: reason.trim() } });
  });
}

export type RosterAction = "SUBMIT" | "REVIEW" | "RETURN" | "APPROVE" | "FINALISE" | "WITHDRAW";

export async function rosterAction(db: DB, actor: Actor, versionId: string, action: RosterAction, comment = "") {
  const r = await getRoster(db, actor, versionId);
  const v = r.version;
  const m = r.request;
  let to: string;
  let unit: string | null = m.requesting_unit_id;
  if (action === "SUBMIT") {
    if (!r.can.submit) throw forbidden();
    if (!r.entries.length) throw invalid("The roster has no officers.");
    const issues = await tx(db, (db) => validateVersion(db, versionId));
    if (issues) throw conflict(`${issues} entr${issues === 1 ? "y has" : "ies have"} integrity issues (duplicates, conflicting assignments or outdated records). Resolve them before submitting.`);
    to = "SUBMITTED";
  } else if (action === "REVIEW") {
    if (!r.can.review) throw forbidden(v.created_by === actor.userId ? "The roster must be reviewed by someone other than its compiler." : undefined);
    to = "REVIEWED";
  } else if (action === "RETURN") {
    if (!r.can.ret) throw forbidden();
    if (comment.trim().length < 5) throw invalid("Record what needs correcting.");
    to = v.based_on_id ? "AMENDED" : "DRAFT";
  } else if (action === "WITHDRAW") {
    if (!r.can.edit) throw forbidden();
    to = "WITHDRAWN";
  } else if (action === "APPROVE") {
    unit = await approvalUnitFor(db, actor, "MANPOWER", m.approval_unit_id);
    if (!unit || !r.can.approve) throw forbidden(v.created_by === actor.userId ? "You cannot approve a roster you compiled." : "You do not hold delegated manpower approval authority for this roster.");
    const issues = await tx(db, (db) => validateVersion(db, versionId));
    if (issues) throw conflict(`${issues} entr${issues === 1 ? "y has" : "ies have"} integrity issues found at approval. Return the roster for correction.`);
    to = "APPROVED";
  } else {
    unit = await approvalUnitFor(db, actor, "MANPOWER", m.approval_unit_id);
    if (!unit || !r.can.finalise) throw forbidden("You do not hold delegated manpower approval authority for this roster.");
    to = "FINALISED";
  }
  let created = 0;
  await tx(db, async (db) => {
    const t = nowIso();
    const cols = action === "SUBMIT" ? ", submitted_by = ?, submitted_at = ?" : action === "REVIEW" ? ", reviewed_by = ?, reviewed_at = ?" : action === "APPROVE" ? ", approved_by = ?, approved_at = ?" : action === "FINALISE" ? ", finalised_by = ?, finalised_at = ?" : "";
    const n = await run(db, `UPDATE roster_versions SET status = ? ${cols} WHERE id = ? AND status = ?`, ...[to, ...(cols ? [actor.userId, t] : []), versionId, v.status]);
    if (!n.changes) throw conflict("The roster was changed by someone else. Reload and try again.");
    if (action === "APPROVE") {
      await run(db, "UPDATE roster_versions SET status = 'SUPERSEDED' WHERE request_id = ? AND id <> ? AND status = 'APPROVED'", m.id, versionId);
    }
    if (action === "FINALISE") {
      if (m.area_id) {
        // Revalidate and create the duty-area assignments in one transaction.
        const problems: string[] = [];
        for (const e of r.entries) {
          const el = await eligibilityOf(db, e.personnel_id);
          if (!el.eligible) problems.push(`${e.full_name}: ${el.reasons.join(", ")}`);
        }
        if (problems.length) throw conflict(`Cannot finalise — ${problems.length} officer(s) are no longer eligible: ${problems.slice(0, 3).join("; ")}${problems.length > 3 ? "…" : ""}. Amend the roster.`);
        const start = m.commencement_date < today() ? today() : m.commencement_date;
        for (const e of r.entries) {
          await _insertAssignment(db, { personnelId: e.personnel_id, areaId: m.area_id, commencementDate: start, notes: `From roster ${m.reference} v${v.version_no}.`, requestId: m.id, rosterVersionId: versionId, status: start <= today() ? "ACTIVE" : "APPROVED", actorId: actor.userId, authorisedBy: actor.userId, authorisedUnitId: unit });
          created++;
        }
      }
      await run(db, "UPDATE manpower_requests SET status = 'COMPLETED', updated_at = ?, version = version + 1 WHERE id = ? AND status = 'APPROVED'", t, m.id);
      await logAction(db, "manpower_request", m.id, "COMPLETE", "APPROVED", "COMPLETED", actor.userId, unit, `Roster v${v.version_no} finalised; ${created} assignment(s) created`);
    }
    await logAction(db, "roster", versionId, action, v.status, to, actor.userId, unit, comment || null);
    await logAction(db, "manpower_request", m.id, `ROSTER_${action}`, null, null, actor.userId, unit, `Version ${v.version_no}${comment ? `: ${comment}` : ""}`);
    await audit(db, { actorId: actor.userId, action: `roster.${action.toLowerCase()}`, category: "BUSINESS", entityType: "roster", entityId: versionId, orgUnitId: m.requesting_unit_id, details: { request: m.reference, version: v.version_no, assignmentsCreated: created } });
  });
  if (["RETURN", "APPROVE", "FINALISE"].includes(action) && v.created_by !== actor.userId) await notify(db, v.created_by, `Roster ${m.reference} v${v.version_no}: ${ROSTER_STATUS_LABEL[to]}`, comment || "Status updated.", `/app/rosters/${versionId}`);
  return { created };
}

/** Creates a new AMENDED version from an approved roster; the approved version is preserved unchanged. */
export async function amendRoster(db: DB, actor: Actor, versionId: string, reason: string) {
  const r = await getRoster(db, actor, versionId);
  if (!r.can.amend) throw conflict("Only an approved (not finalised) roster can be amended.");
  if (reason.trim().length < 10) throw invalid("Record the reason for the amendment (at least 10 characters).");
  if (await one(db, "SELECT id FROM roster_versions WHERE request_id = ? AND status IN ('DRAFT','AMENDED','SUBMITTED','REVIEWED')", r.request.id)) throw conflict("An amendment is already in preparation.");
  const id = newId("rv");
  await tx(db, async (db) => {
    const no = Number((await one<{ n: number }>(db, "SELECT COALESCE(MAX(version_no),0) AS n FROM roster_versions WHERE request_id = ?", r.request.id))?.n ?? 0) + 1;
    await run(db, "INSERT INTO roster_versions (id, request_id, version_no, reference, status, based_on_id, amendment_reason, created_by, created_at) VALUES (?,?,?,?, 'AMENDED', ?,?,?,?)", id, r.request.id, no, rosterRef(r.request.reference, no), versionId, reason.trim(), actor.userId, nowIso());
    for (const e of r.entries) {
      await run(db, "INSERT INTO roster_entries (id, version_id, personnel_id, contribution_id, source, service_number, full_name, rank_code, home_unit_id, added_by, added_at) VALUES (?,?,?,?, 'CARRIED', ?,?,?,?,?,?)",
        newId("re"), id, e.personnel_id, e.contribution_id, e.service_number, e.full_name, e.rank_code, e.home_unit_id, actor.userId, nowIso());
    }
    await validateVersion(db, id);
    await logAction(db, "roster", id, "AMEND", null, "AMENDED", actor.userId, r.request.requesting_unit_id, `From v${r.version.version_no}: ${reason.trim()}`);
    await audit(db, { actorId: actor.userId, action: "roster.amend", category: "BUSINESS", entityType: "roster", entityId: id, orgUnitId: r.request.requesting_unit_id, details: { from: versionId, version: no } });
  });
  return id;
}

/** Auditable export of a roster (CSV). */
export async function exportRoster(db: DB, actor: Actor, versionId: string, format: "csv" | "xlsx" | "print" | "pdf") {
  const r = await getRoster(db, actor, versionId);
  if (!r.can.export) {
    await audit(db, { actorId: actor.userId, action: "authz.denied:roster.export", outcome: "DENIED", category: "SECURITY", entityType: "roster", entityId: versionId });
    throw forbidden("You are not authorised to export this roster.");
  }
  await audit(db, { actorId: actor.userId, action: `roster.export.${format}`, category: "EXPORT", entityType: "roster", entityId: versionId, orgUnitId: r.request.requesting_unit_id, details: { rows: r.entries.length, status: r.version.status } });
  return r;
}

export async function manpowerSummary(db: DB, actor: Actor) {
  const s = mprScope(actor);
  const rows = await all<{ status: string; c: number }>(db, `SELECT m.status, COUNT(*) AS c FROM manpower_requests m WHERE ${s.sql} GROUP BY m.status`, ...s.params);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.c)]));
  const units = unitsFor(actor, "manpower.contribute");
  const contribScope = units === null ? "1=1" : units.length ? `c.contributing_unit_id IN (${inList(units)})` : "1=0";
  const pendingContrib = units === null || units.length
    ? Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id WHERE m.status = 'APPROVED' AND c.status IN ('PENDING','RETURNED') AND ${contribScope}`, ...(units ?? [])))?.c ?? 0)
    : 0;
  const rs = unitsFor(actor, "roster.view");
  const rscope = rs === null ? "1=1" : rs.length ? `m.requesting_unit_id IN (${inList(rs)})` : "1=0";
  const rosters = await all<{ status: string; c: number }>(db, `SELECT v.status, COUNT(*) AS c FROM roster_versions v JOIN manpower_requests m ON m.id = v.request_id WHERE ${rscope} GROUP BY v.status`, ...(rs ?? []));
  const rby = Object.fromEntries(rosters.map((r) => [r.status, Number(r.c)]));
  const awaitingContrib = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id WHERE m.status = 'APPROVED' AND c.status = 'SUBMITTED' AND ${s.sql}`, ...s.params))?.c ?? 0);
  return {
    open: (by.SUBMITTED ?? 0) + (by.UNDER_REVIEW ?? 0) + (by.RECOMMENDED ?? 0) + (by.RETURNED ?? 0),
    approved: by.APPROVED ?? 0,
    completed: by.COMPLETED ?? 0,
    drafts: by.DRAFT ?? 0,
    pendingContributions: pendingContrib,
    contributionsToReview: awaitingContrib,
    rostersInPreparation: (rby.DRAFT ?? 0) + (rby.AMENDED ?? 0) + (rby.SUBMITTED ?? 0) + (rby.REVIEWED ?? 0),
    rostersApproved: (rby.APPROVED ?? 0) + (rby.FINALISED ?? 0),
    byStatus: by,
  };
}

/** Manpower and roster items awaiting this actor (review, approval, contribution). */
export async function manpowerInbox(db: DB, actor: Actor) {
  const out: Array<{ kind: string; reference: string; title: string; href: string }> = [];
  const mine = await listManpowerRequests(db, actor, { status: "OPEN" }).catch(() => []);
  for (const m of mine) {
    if (await canDecideManpower(db, actor, m)) out.push({ kind: "Manpower approval", reference: m.reference, title: m.purpose, href: `/app/manpower/${m.id}` });
    else if (m.status === "SUBMITTED" && m.requested_by !== actor.userId && can(actor, "manpower.review", m.requesting_unit_id)) out.push({ kind: "Manpower review", reference: m.reference, title: m.purpose, href: `/app/manpower/${m.id}` });
  }
  const units = unitsFor(actor, "manpower.contribute");
  if (units === null || units.length) for (const c of await myContributions(db, actor, "OPEN").catch(() => [])) if (c.status !== "SUBMITTED") out.push({ kind: "Contribution required", reference: c.request_ref, title: `${c.unit_name}: ${c.required_count} officer(s)`, href: `/app/manpower/contributions/${c.id}` });
  const rosters = await rosterIndex(db, actor, "SUBMITTED,REVIEWED,APPROVED").catch(() => []);
  for (const v of rosters) {
    const r = await getRoster(db, actor, v.id).catch(() => null);
    if (r && (r.can.review || r.can.approve || r.can.finalise)) out.push({ kind: r.can.review ? "Roster review" : r.can.approve ? "Roster approval" : "Roster finalisation", reference: `${v.reference} v${v.version_no}`, title: v.purpose, href: `/app/rosters/${v.id}` });
  }
  return out;
}

