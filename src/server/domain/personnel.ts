/**
 * M-PER — Personnel Registry and Organisational Membership (Directive §5).
 *
 * - One canonical record per officer: unique personnel reference and unique service number.
 *   In development the service number must be synthetic (`SYN-` + 6 digits).
 * - A similar existing record (same normalised name and rank) blocks registration until the
 *   registering officer confirms it is a different person (duplicate prevention).
 * - Home-unit membership is effective-dated; an assignment elsewhere never creates a new person.
 * - Registers are scoped server-side: an officer sees personnel whose home unit is in their
 *   permitted unit set (UNIT / SUBTREE / NATIONAL).
 * - Every change is written to personnel_history and the audit trail.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, forbidden, invalid, newId, notFound, nowIso, today } from "./core";
import { type Actor, can, requirePermission, unitsFor } from "./policy";
import type { Permission } from "./catalogue";

export const EMPLOYMENT_STATUSES = ["SERVING", "ON_LEAVE", "SECONDED", "SUSPENDED", "RETIRED", "SEPARATED"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  SERVING: "Serving", ON_LEAVE: "On leave", SECONDED: "Seconded", SUSPENDED: "Suspended", RETIRED: "Retired", SEPARATED: "Separated",
};

/** Directive §10.5 suggested disposition statuses (configurable labels in `disposition_statuses`). */
export const DISPOSITIONS = {
  AVAILABLE_HOME: "Available at Home Unit",
  PROPOSED: "Proposed for Assignment",
  AWAITING_APPROVAL: "Awaiting Assignment Approval",
  APPROVED_PENDING: "Approved — Pending Commencement",
  ACTIVE_ASSIGNMENT: "Active Field Assignment",
  REVIEW_DUE: "Assignment Review Due",
  RENEWAL_PENDING: "Renewal Pending",
  RENEWED_ACTIVE: "Renewed — Active",
  TRANSFER_PENDING: "Transfer Pending",
  TEMP_UNAVAILABLE: "Temporarily Unavailable",
  RELEASED: "Released from Assignment",
  RETURNED_HOME: "Returned to Home Unit",
  SUSPENDED_REVIEW: "Suspended Pending Administrative Review",
  COMPLETED: "Assignment Completed",
  CANCELLED: "Assignment Cancelled",
} as const;
export type Disposition = keyof typeof DISPOSITIONS;
/** Statuses in which an officer can be proposed for a new assignment. */
export const AVAILABLE_DISPOSITIONS: Disposition[] = ["AVAILABLE_HOME", "RETURNED_HOME", "RELEASED", "COMPLETED", "CANCELLED"];
/** Statuses an authorised officer may set manually (others follow from assignment events). */
export const MANUAL_DISPOSITIONS: Disposition[] = ["AVAILABLE_HOME", "TEMP_UNAVAILABLE", "SUSPENDED_REVIEW", "RETURNED_HOME"];

export const SYNTHETIC_SERVICE_NO = /^SYN-\d{6}$/;
export const nameKey = (surname: string, firstNames: string) =>
  `${surname} ${firstNames}`.toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

export interface PersonnelRow {
  id: string;
  personnel_ref: string;
  service_number: string;
  surname: string;
  first_names: string;
  rank_code: string;
  rank_name: string;
  seniority: number;
  home_unit_id: string;
  home_unit_name: string;
  employment_status: EmploymentStatus;
  disposition_status: Disposition;
  verification_status: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  created_at: string;
  updated_at: string;
  version: number;
}

const BASE_SELECT = `SELECT p.id, p.personnel_ref, p.service_number, p.surname, p.first_names, p.rank_code, r.name AS rank_name, r.seniority,
       p.home_unit_id, o.name AS home_unit_name, p.employment_status, p.disposition_status, p.verification_status, p.eligibility_note,
       p.created_at, p.updated_at, p.version, p.tenant_id, p.created_by, p.verified_by, p.verified_at
  FROM personnel_records p JOIN ranks r ON r.code = p.rank_code JOIN org_units o ON o.id = p.home_unit_id`;

/** SQL restricting `col` to the actor's unit set for `perm`. */
export function unitFilter(actor: Actor, perm: Permission, col: string): { sql: string; params: string[] } {
  const units = unitsFor(actor, perm);
  if (units === null) return { sql: "1=1", params: [] };
  if (!units.length) return { sql: "1=0", params: [] };
  return { sql: `${col} IN (${units.map(() => "?").join(",")})`, params: units };
}

export interface PersonnelFilters {
  q?: string;
  rank?: string;
  unit?: string; // includes the unit's subtree
  employment?: string;
  disposition?: string;
  verification?: string;
  sort?: "name" | "rank" | "unit" | "ref" | "updated";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const SORTS: Record<NonNullable<PersonnelFilters["sort"]>, string> = {
  name: "p.surname, p.first_names",
  rank: "r.seniority",
  unit: "o.name",
  ref: "p.personnel_ref",
  updated: "p.updated_at",
};

export async function listPersonnel(db: DB, actor: Actor, f: PersonnelFilters = {}): Promise<{ rows: PersonnelRow[]; total: number; page: number; pageSize: number }> {
  await requirePermission(db, actor, "personnel.view");
  const scope = unitFilter(actor, "personnel.view", "p.home_unit_id");
  const where = [scope.sql];
  const params: unknown[] = [...scope.params];
  if (f.q?.trim()) {
    const q = `%${f.q.trim().toLowerCase()}%`;
    where.push("(p.name_key LIKE ? OR LOWER(p.service_number) LIKE ? OR LOWER(p.personnel_ref) LIKE ?)");
    params.push(q, q, q);
  }
  if (f.rank) { where.push("p.rank_code = ?"); params.push(f.rank); }
  if (f.employment) { where.push("p.employment_status = ?"); params.push(f.employment); }
  if (f.disposition) { where.push("p.disposition_status = ?"); params.push(f.disposition); }
  if (f.verification) { where.push("p.verification_status = ?"); params.push(f.verification); }
  if (f.unit) { where.push("p.home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = ?)"); params.push(f.unit); }
  const pageSize = Math.min(Math.max(f.pageSize ?? 25, 5), 200);
  const page = Math.max(f.page ?? 1, 1);
  const order = `${SORTS[f.sort ?? "name"] ?? SORTS.name} ${f.dir === "desc" ? "DESC" : "ASC"}, p.personnel_ref`;
  const total = Number((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM personnel_records p JOIN ranks r ON r.code = p.rank_code JOIN org_units o ON o.id = p.home_unit_id WHERE ${where.join(" AND ")}`, ...params))?.c ?? 0);
  const rows = await all<PersonnelRow>(db, `${BASE_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, ...params);
  return { rows, total, page, pageSize };
}

/** Loads one record, enforcing scope (out-of-scope → NOT_FOUND so existence is not disclosed). */
export async function getPersonnel(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "personnel.view");
  const p = await one<PersonnelRow & { eligibility_note: string | null; tenant_id: string; created_by: string | null; verified_by: string | null; verified_at: string | null }>(db, `${BASE_SELECT} WHERE p.id = ?`, id);
  if (!p || !can(actor, "personnel.view", p.home_unit_id)) throw notFound();
  return p;
}

export async function personnelDetail(db: DB, actor: Actor, id: string) {
  const person = await getPersonnel(db, actor, id);
  const memberships = await all<{ id: string; org_unit_id: string; org_name: string; valid_from: string; valid_to: string | null; reason: string }>(
    db, "SELECT m.*, o.name AS org_name FROM personnel_memberships m JOIN org_units o ON o.id = m.org_unit_id WHERE m.personnel_id = ? ORDER BY m.valid_from DESC, m.created_at DESC", id);
  const history = await all<{ seq: number; field: string; old_value: string | null; new_value: string | null; reason: string | null; actor_name: string | null; created_at: string }>(
    db, "SELECT h.*, u.display_name AS actor_name FROM personnel_history h LEFT JOIN users u ON u.id = h.actor_id WHERE h.personnel_id = ? ORDER BY h.seq DESC", id);
  const dispositions = await all<{ seq: number; previous_status: string | null; new_status: string; reason: string; effective_date: string; reference: string | null; actor_name: string | null; created_at: string }>(
    db, "SELECT d.*, u.display_name AS actor_name FROM disposition_history d LEFT JOIN users u ON u.id = d.authorised_by WHERE d.personnel_id = ? ORDER BY d.seq DESC", id);
  const assignments = await all<{ id: string; reference: string; area_name: string; status: string; commencement_date: string; continuous_start_date: string; review_date: string; ended_on: string | null; close_reason: string | null }>(
    db, "SELECT a.id, a.reference, ar.name AS area_name, a.status, a.commencement_date, a.continuous_start_date, a.review_date, a.ended_on, a.close_reason FROM personnel_assignments a JOIN operational_areas ar ON ar.id = a.area_id WHERE a.personnel_id = ? ORDER BY a.created_at DESC", id);
  return { person, memberships, history, dispositions, assignments };
}

export const registerSchema = z.object({
  serviceNumber: z.string().trim().toUpperCase().regex(SYNTHETIC_SERVICE_NO, "Development records must use a synthetic service number: SYN- followed by 6 digits."),
  surname: z.string().trim().min(2, "Enter the surname.").max(60),
  firstNames: z.string().trim().min(2, "Enter the first name(s).").max(80),
  rankCode: z.string().min(1, "Select a rank."),
  homeUnitId: z.string().min(1, "Select the home unit."),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).default("SERVING"),
  eligibilityNote: z.string().trim().max(200).optional().or(z.literal("")),
  confirmDistinct: z.boolean().optional(),
});

async function nextPersonnelRef(db: DB): Promise<string> {
  const row = await one<{ m: string | null }>(db, "SELECT MAX(personnel_ref) AS m FROM personnel_records");
  const n = row?.m ? Number(row.m.slice(4)) + 1 : 1;
  return `PER-${String(n).padStart(6, "0")}`;
}

export async function recordDisposition(db: DB, input: { personnelId: string; status: Disposition; reason: string; actorId: string | null; effectiveDate?: string; assignmentId?: string | null; reference?: string | null }) {
  const cur = await one<{ disposition_status: string }>(db, "SELECT disposition_status FROM personnel_records WHERE id = ? FOR UPDATE", input.personnelId);
  if (!cur) throw notFound();
  if (cur.disposition_status === input.status && input.assignmentId === undefined) return;
  await run(db, "UPDATE personnel_records SET disposition_status = ?, updated_at = ? WHERE id = ?", input.status, nowIso(), input.personnelId);
  await run(db, `INSERT INTO disposition_history (personnel_id, assignment_id, previous_status, new_status, reason, authorised_by, effective_date, reference, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    input.personnelId, input.assignmentId ?? null, cur.disposition_status, input.status, input.reason, input.actorId, input.effectiveDate ?? today(), input.reference ?? null, nowIso());
}

export async function registerPersonnel(db: DB, actor: Actor, input: z.input<typeof registerSchema>) {
  const d = registerSchema.parse(input);
  await requirePermission(db, actor, "personnel.register", d.homeUnitId, { type: "personnel" });
  const unit = await one<{ tenant_id: string; status: string }>(db, "SELECT tenant_id, status FROM org_units WHERE id = ?", d.homeUnitId);
  if (!unit || unit.status !== "ACTIVE") throw invalid("Select an active home unit.");
  if (!(await one(db, "SELECT code FROM ranks WHERE code = ?", d.rankCode))) throw invalid("Select a valid rank.");
  const existing = await one<{ id: string; personnel_ref: string; home_unit_id: string }>(db, "SELECT id, personnel_ref, home_unit_id FROM personnel_records WHERE service_number = ?", d.serviceNumber);
  if (existing) {
    await audit(db, { actorId: actor.userId, action: "personnel.register.duplicate", outcome: "DENIED", category: "BUSINESS", entityType: "personnel", entityId: existing.id, orgUnitId: d.homeUnitId });
    throw conflict(can(actor, "personnel.view", existing.home_unit_id)
      ? `Service number ${d.serviceNumber} is already registered as ${existing.personnel_ref}. One officer has one canonical record.`
      : `Service number ${d.serviceNumber} is already registered in the national registry. Contact the personnel registry administrator.`);
  }
  const key = nameKey(d.surname, d.firstNames);
  const similar = await all<{ personnel_ref: string }>(db, "SELECT personnel_ref FROM personnel_records WHERE name_key = ? AND rank_code = ?", key, d.rankCode);
  if (similar.length && !d.confirmDistinct) {
    throw conflict(`${similar.length} existing record(s) have the same name and rank. Check the registry; if this is a different officer, tick "This is a different officer" and submit again.`);
  }
  const id = newId("per");
  const t = nowIso();
  await tx(db, async (db) => {
    const ref = await nextPersonnelRef(db);
    await run(db, `INSERT INTO personnel_records (id, tenant_id, personnel_ref, service_number, surname, first_names, name_key, rank_code, home_unit_id, employment_status, disposition_status, verification_status, eligibility_note, synthetic, created_by, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?, 'AVAILABLE_HOME', 'UNVERIFIED', ?, 1, ?, ?, ?)`,
      id, unit.tenant_id, ref, d.serviceNumber, d.surname, d.firstNames, key, d.rankCode, d.homeUnitId, d.employmentStatus, d.eligibilityNote || null, actor.userId, t, t);
    await run(db, "INSERT INTO personnel_memberships (id, personnel_id, org_unit_id, valid_from, reason, recorded_by, created_at) VALUES (?,?,?,?,?,?,?)",
      newId("pmb"), id, d.homeUnitId, today(), "Initial registration", actor.userId, t);
    await run(db, "INSERT INTO personnel_history (personnel_id, field, new_value, reason, actor_id, created_at) VALUES (?,?,?,?,?,?)", id, "record", ref, "Registered", actor.userId, t);
    await run(db, "INSERT INTO disposition_history (personnel_id, previous_status, new_status, reason, authorised_by, effective_date, created_at) VALUES (?,NULL,'AVAILABLE_HOME','Initial registration',?,?,?)", id, actor.userId, today(), t);
    await audit(db, { actorId: actor.userId, action: "personnel.register", category: "BUSINESS", entityType: "personnel", entityId: id, orgUnitId: d.homeUnitId, details: { ref, similarConfirmed: similar.length > 0 } });
  });
  return id;
}

export const updateSchema = z.object({
  surname: z.string().trim().min(2).max(60),
  firstNames: z.string().trim().min(2).max(80),
  rankCode: z.string().min(1),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  eligibilityNote: z.string().trim().max(200).optional().or(z.literal("")),
  reason: z.string().trim().min(5, "Record the reason for the correction."),
  expectedVersion: z.number().int().optional(),
});

export async function updatePersonnel(db: DB, actor: Actor, id: string, input: z.input<typeof updateSchema>) {
  const p = await getPersonnel(db, actor, id);
  await requirePermission(db, actor, "personnel.edit", p.home_unit_id, { type: "personnel", id });
  const d = updateSchema.parse(input);
  if (d.expectedVersion && d.expectedVersion !== p.version) throw conflict("This record was changed by someone else. Reload and try again.");
  if (!(await one(db, "SELECT code FROM ranks WHERE code = ?", d.rankCode))) throw invalid("Select a valid rank.");
  const changes: Array<[string, string | null, string | null]> = [];
  const cmp = (field: string, a: string | null, b: string | null) => { if ((a ?? "") !== (b ?? "")) changes.push([field, a, b]); };
  cmp("surname", p.surname, d.surname);
  cmp("first_names", p.first_names, d.firstNames);
  cmp("rank", p.rank_code, d.rankCode);
  cmp("employment_status", p.employment_status, d.employmentStatus);
  cmp("eligibility_note", p.eligibility_note, d.eligibilityNote || null);
  if (!changes.length) throw invalid("No changes to save.");
  const identityChanged = changes.some(([f]) => f === "surname" || f === "first_names" || f === "rank");
  await tx(db, async (db) => {
    await run(db, `UPDATE personnel_records SET surname = ?, first_names = ?, name_key = ?, rank_code = ?, employment_status = ?, eligibility_note = ?, updated_at = ?, version = version + 1
                   ${identityChanged ? ", verification_status = 'UNVERIFIED', verified_by = NULL, verified_at = NULL" : ""} WHERE id = ?`,
      d.surname, d.firstNames, nameKey(d.surname, d.firstNames), d.rankCode, d.employmentStatus, d.eligibilityNote || null, nowIso(), id);
    for (const [field, a, b] of changes) await run(db, "INSERT INTO personnel_history (personnel_id, field, old_value, new_value, reason, actor_id, created_at) VALUES (?,?,?,?,?,?,?)", id, field, a, b, d.reason, actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "personnel.update", category: "BUSINESS", entityType: "personnel", entityId: id, orgUnitId: p.home_unit_id, details: { fields: changes.map(([f]) => f), reverified: identityChanged } });
  });
}

export async function changeHomeUnit(db: DB, actor: Actor, id: string, input: { newUnitId: string; effectiveDate: string; reason: string }) {
  const p = await getPersonnel(db, actor, id);
  await requirePermission(db, actor, "personnel.edit", p.home_unit_id, { type: "personnel", id });
  if (!can(actor, "personnel.edit", input.newUnitId)) throw forbidden("The new home unit is outside your authorised scope. A national personnel administrator must record this change.");
  if (input.newUnitId === p.home_unit_id) throw invalid("The officer already belongs to this unit.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) throw invalid("Enter the effective date.");
  if (input.reason.trim().length < 5) throw invalid("Record the reason and authority for the change.");
  const unit = await one<{ tenant_id: string; status: string }>(db, "SELECT tenant_id, status FROM org_units WHERE id = ?", input.newUnitId);
  if (!unit || unit.status !== "ACTIVE") throw invalid("Select an active unit.");
  await tx(db, async (db) => {
    await run(db, "UPDATE personnel_memberships SET valid_to = ? WHERE personnel_id = ? AND valid_to IS NULL", input.effectiveDate, id);
    await run(db, "INSERT INTO personnel_memberships (id, personnel_id, org_unit_id, valid_from, reason, recorded_by, created_at) VALUES (?,?,?,?,?,?,?)",
      newId("pmb"), id, input.newUnitId, input.effectiveDate, input.reason.trim(), actor.userId, nowIso());
    await run(db, "UPDATE personnel_records SET home_unit_id = ?, tenant_id = ?, updated_at = ?, version = version + 1 WHERE id = ?", input.newUnitId, unit.tenant_id, nowIso(), id);
    await run(db, "INSERT INTO personnel_history (personnel_id, field, old_value, new_value, reason, actor_id, created_at) VALUES (?,?,?,?,?,?,?)", id, "home_unit", p.home_unit_id, input.newUnitId, input.reason.trim(), actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "personnel.home_unit.change", category: "BUSINESS", entityType: "personnel", entityId: id, orgUnitId: input.newUnitId, details: { from: p.home_unit_id, to: input.newUnitId, effective: input.effectiveDate } });
  });
}

export async function verifyPersonnel(db: DB, actor: Actor, id: string, decision: "VERIFIED" | "REJECTED", note: string) {
  const p = await getPersonnel(db, actor, id);
  await requirePermission(db, actor, "personnel.verify", p.home_unit_id, { type: "personnel", id });
  if (p.created_by === actor.userId) throw forbidden("A record must be verified by an officer other than the one who registered it.");
  if (decision === "REJECTED" && note.trim().length < 5) throw invalid("Record why the record could not be verified.");
  await tx(db, async (db) => {
    await run(db, "UPDATE personnel_records SET verification_status = ?, verified_by = ?, verified_at = ?, updated_at = ?, version = version + 1 WHERE id = ?", decision, actor.userId, nowIso(), nowIso(), id);
    await run(db, "INSERT INTO personnel_history (personnel_id, field, old_value, new_value, reason, actor_id, created_at) VALUES (?,?,?,?,?,?,?)", id, "verification", p.verification_status, decision, note.trim() || null, actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: `personnel.${decision === "VERIFIED" ? "verify" : "verify.reject"}`, category: "BUSINESS", entityType: "personnel", entityId: id, orgUnitId: p.home_unit_id });
  });
}

/** Manual disposition change (statuses not driven by assignment events). */
export async function changeDisposition(db: DB, actor: Actor, id: string, status: Disposition, reason: string, effectiveDate?: string) {
  const p = await getPersonnel(db, actor, id);
  await requirePermission(db, actor, "disposition.change", p.home_unit_id, { type: "personnel", id });
  if (!MANUAL_DISPOSITIONS.includes(status)) throw invalid("This status is set by the assignment workflow, not manually.");
  const active = await one(db, "SELECT id FROM personnel_assignments WHERE personnel_id = ? AND status IN ('ACTIVE','TRANSFER_PENDING','APPROVED')", id);
  if (active && (status === "AVAILABLE_HOME" || status === "RETURNED_HOME")) throw conflict("The officer has a current assignment. Release or complete it through the assignment workflow.");
  if (reason.trim().length < 5) throw invalid("Record the reason for the change.");
  await tx(db, async (db) => {
    await recordDisposition(db, { personnelId: id, status, reason: reason.trim(), actorId: actor.userId, effectiveDate });
    await audit(db, { actorId: actor.userId, action: "personnel.disposition.change", category: "BUSINESS", entityType: "personnel", entityId: id, orgUnitId: p.home_unit_id, details: { from: p.disposition_status, to: status } });
  });
}

export interface Eligibility { eligible: boolean; reasons: string[] }

/** Current eligibility for selection (re-evaluated at every use; never assumed from an earlier list). */
export async function eligibilityOf(db: DB, personnelId: string, ignoreAssignmentId?: string): Promise<Eligibility> {
  const p = await one<{ employment_status: string; disposition_status: Disposition; verification_status: string }>(db, "SELECT employment_status, disposition_status, verification_status FROM personnel_records WHERE id = ?", personnelId);
  if (!p) return { eligible: false, reasons: ["Record no longer exists"] };
  const reasons: string[] = [];
  if (p.employment_status !== "SERVING") reasons.push(`Employment status: ${EMPLOYMENT_LABEL[p.employment_status as EmploymentStatus] ?? p.employment_status}`);
  if (p.verification_status === "REJECTED") reasons.push("Record failed verification");
  const act = await one<{ reference: string; status: string }>(db,
    "SELECT reference, status FROM personnel_assignments WHERE personnel_id = ? AND status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING') AND id <> ? LIMIT 1", personnelId, ignoreAssignmentId ?? "");
  if (act) reasons.push(`Conflicting assignment ${act.reference} (${act.status.toLowerCase().replace(/_/g, " ")})`);
  else if (!AVAILABLE_DISPOSITIONS.includes(p.disposition_status) && !(ignoreAssignmentId ? ["PROPOSED", "AWAITING_APPROVAL", "APPROVED_PENDING"] : ["PROPOSED"]).includes(p.disposition_status)) reasons.push(`Disposition: ${DISPOSITIONS[p.disposition_status] ?? p.disposition_status}`);
  return { eligible: reasons.length === 0, reasons };
}

export async function exportPersonnel(db: DB, actor: Actor, f: PersonnelFilters) {
  await requirePermission(db, actor, "personnel.export");
  const scoped = { ...f, page: 1, pageSize: 200 };
  const out: PersonnelRow[] = [];
  for (let page = 1; ; page++) {
    const r = await listPersonnel(db, actor, { ...scoped, page });
    // listPersonnel is scoped by personnel.view; export must also be within personnel.export scope.
    out.push(...r.rows.filter((p) => can(actor, "personnel.export", p.home_unit_id)));
    if (page * r.pageSize >= r.total) break;
  }
  await audit(db, { actorId: actor.userId, action: "personnel.export", category: "EXPORT", details: { rows: out.length, filters: f } });
  return out;
}

export async function ranks(db: DB) {
  return all<{ code: string; name: string; seniority: number; category: string }>(db, "SELECT * FROM ranks ORDER BY seniority DESC");
}

/** Personnel counts for dashboards (scoped). */
export async function personnelSummary(db: DB, actor: Actor) {
  const s = unitFilter(actor, "personnel.view", "home_unit_id");
  const rows = await all<{ disposition_status: string; employment_status: string; verification_status: string; c: number }>(db,
    `SELECT disposition_status, employment_status, verification_status, COUNT(*) AS c FROM personnel_records WHERE ${s.sql} GROUP BY disposition_status, employment_status, verification_status`, ...s.params);
  const sum = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).reduce((n, r) => n + Number(r.c), 0);
  return {
    total: sum(() => true),
    serving: sum((r) => r.employment_status === "SERVING"),
    unverified: sum((r) => r.verification_status === "UNVERIFIED"),
    available: sum((r) => r.employment_status === "SERVING" && AVAILABLE_DISPOSITIONS.includes(r.disposition_status as Disposition)),
    onAssignment: sum((r) => ["ACTIVE_ASSIGNMENT", "REVIEW_DUE", "RENEWAL_PENDING", "RENEWED_ACTIVE", "TRANSFER_PENDING"].includes(r.disposition_status)),
    byDisposition: Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r.disposition_status] = (m[r.disposition_status] ?? 0) + Number(r.c)), m), {})),
  };
}

/** Possible duplicate identities (same normalised name and rank) and records unverified for over 30 days, within scope. */
export async function registryReview(db: DB, actor: Actor) {
  await requirePermission(db, actor, "personnel.edit");
  const s = unitFilter(actor, "personnel.edit", "p.home_unit_id");
  const groups = await all<{ name_key: string; rank_code: string; c: number }>(db,
    `SELECT p.name_key, p.rank_code, COUNT(*) AS c FROM personnel_records p WHERE ${s.sql} GROUP BY p.name_key, p.rank_code HAVING COUNT(*) > 1 ORDER BY c DESC, p.name_key LIMIT 100`, ...s.params);
  const duplicates: Array<{ key: string; rows: PersonnelRow[] }> = [];
  for (const g of groups) {
    duplicates.push({ key: `${g.name_key}|${g.rank_code}`, rows: await all<PersonnelRow>(db, `${BASE_SELECT} WHERE p.name_key = ? AND p.rank_code = ? AND ${s.sql.replace(/p\.home_unit_id/g, "p.home_unit_id")} ORDER BY p.created_at`, g.name_key, g.rank_code, ...s.params) });
  }
  const stale = await all<PersonnelRow>(db, `${BASE_SELECT} WHERE p.verification_status = 'UNVERIFIED' AND p.created_at < ? AND ${s.sql} ORDER BY p.created_at LIMIT 200`,
    new Date(Date.now() - 30 * 86400000).toISOString(), ...s.params);
  return { duplicates, stale };
}
