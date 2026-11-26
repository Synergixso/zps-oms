/**
 * M01 — Organisation and Formation Registry (effective-dated, approval-controlled).
 * Structural changes never grant access: role assignments are untouched by org changes.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, today } from "./core";
import { type Actor, HQ_ID, canApprove, requirePermission } from "./policy";

export interface OrgUnit {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  unit_type: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  approval_ref: string | null;
  validation_note: string | null;
  parent_id: string | null;
  parent_name: string | null;
}

export const UNIT_TYPE_LABEL: Record<string, string> = {
  SERVICE_HQ: "Service Headquarters",
  HQ_OFFICE: "HQ office",
  PROVINCIAL_DIVISION: "Provincial Police Division",
  FORMATION: "Divisional Unit / formation",
  DISTRICT: "District Command",
  STATION: "Police Station",
  POST: "Police Post",
  DEPARTMENT: "Department",
  COMPANY: "Company",
  DETACHMENT: "Detachment",
  PLATOON: "Platoon",
  SECTION: "Section",
};

/** Directory as at a given date (defaults to today) – supports historical reporting. */
export async function listOrgUnits(db: DB, actor: Actor, opts: { asAt?: string; includeInactive?: boolean } = {}): Promise<OrgUnit[]> {
  await requirePermission(db, actor, "org.view");
  const asAt = opts.asAt ?? today();
  return await all<OrgUnit>(
    db,
    `SELECT o.*, r.parent_id, p.name AS parent_name
       FROM org_units o
       LEFT JOIN org_relationships r ON r.child_id = o.id AND r.effective_from <= ? AND (r.effective_to IS NULL OR r.effective_to > ?)
       LEFT JOIN org_units p ON p.id = r.parent_id
      WHERE o.effective_from <= ? ${opts.includeInactive ? "" : "AND o.status = 'ACTIVE' AND (o.effective_to IS NULL OR o.effective_to > ?)"}
      ORDER BY CASE o.unit_type WHEN 'SERVICE_HQ' THEN 0 WHEN 'HQ_OFFICE' THEN 1 WHEN 'PROVINCIAL_DIVISION' THEN 2 ELSE 3 END, o.name`,
    asAt, asAt, asAt, ...(opts.includeInactive ? [] : [asAt]),
  );
}

export async function getOrgUnit(db: DB, actor: Actor, id: string): Promise<OrgUnit> {
  await requirePermission(db, actor, "org.view");
  const u = await one<OrgUnit>(
    db,
    `SELECT o.*, r.parent_id, p.name AS parent_name FROM org_units o
       LEFT JOIN org_relationships r ON r.child_id = o.id AND r.effective_to IS NULL
       LEFT JOIN org_units p ON p.id = r.parent_id WHERE o.id = ?`,
    id,
  );
  if (!u) throw notFound();
  return u;
}

export async function relationshipHistory(db: DB, actor: Actor, id: string) {
  await requirePermission(db, actor, "org.view");
  return await all<{ id: string; parent_name: string; relationship: string; effective_from: string; effective_to: string | null; approval_ref: string | null }>(
    db,
    `SELECT r.*, p.name AS parent_name FROM org_relationships r JOIN org_units p ON p.id = r.parent_id WHERE r.child_id = ? ORDER BY r.effective_from DESC`,
    id,
  );
}

export interface ChangeRow {
  id: string;
  reference: string;
  change_type: string;
  target_unit_id: string | null;
  target_name: string | null;
  payload: string;
  reason: string;
  effective_date: string;
  status: string;
  proposed_by: string;
  proposer_name: string;
  decided_by: string | null;
  decider_name: string | null;
  decision_reason: string | null;
  approval_ref: string | null;
  created_at: string;
}

const C_SELECT = `SELECT c.*, t.name AS target_name, u.display_name AS proposer_name, d.display_name AS decider_name
  FROM org_change_requests c LEFT JOIN org_units t ON t.id = c.target_unit_id JOIN users u ON u.id = c.proposed_by LEFT JOIN users d ON d.id = c.decided_by`;

export async function listChanges(db: DB, actor: Actor): Promise<ChangeRow[]> {
  await requirePermission(db, actor, "org.view");
  return await all<ChangeRow>(db, `${C_SELECT} ORDER BY c.created_at DESC`);
}

export const changeSchema = z.discriminatedUnion("changeType", [
  z.object({
    changeType: z.literal("CREATE_UNIT"),
    code: z.string().trim().regex(/^[A-Z0-9-]{3,20}$/, "Code: 3–20 upper-case letters, digits or hyphens."),
    name: z.string().trim().min(3).max(120),
    unitType: z.enum(["HQ_OFFICE", "PROVINCIAL_DIVISION", "DISTRICT", "STATION", "POST", "FORMATION", "DEPARTMENT", "COMPANY", "DETACHMENT", "PLATOON", "SECTION"]),
    parentId: z.string().min(1),
    reason: z.string().trim().min(10, "Give a reason of at least 10 characters."),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    changeType: z.literal("RENAME_UNIT"),
    targetId: z.string().min(1),
    name: z.string().trim().min(3).max(120),
    reason: z.string().trim().min(10, "Give a reason of at least 10 characters."),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    changeType: z.literal("CHANGE_PARENT"),
    targetId: z.string().min(1),
    parentId: z.string().min(1),
    reason: z.string().trim().min(10, "Give a reason of at least 10 characters."),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    changeType: z.literal("DEACTIVATE_UNIT"),
    targetId: z.string().min(1),
    reason: z.string().trim().min(10, "Give a reason of at least 10 characters."),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);

export async function proposeChange(db: DB, actor: Actor, input: z.input<typeof changeSchema>): Promise<ChangeRow> {
  await requirePermission(db, actor, "org.propose");
  const d = changeSchema.parse(input);
  const target = "targetId" in d ? d.targetId : null;
  if (target) {
    const t = await one<{ status: string; unit_type: string }>(db, "SELECT status, unit_type FROM org_units WHERE id = ?", target);
    if (!t) throw invalid("Target organisation not found.");
    if (t.unit_type === "SERVICE_HQ" && d.changeType !== "RENAME_UNIT") throw invalid("Service Headquarters cannot be re-parented or deactivated in this system.");
  }
  if ("parentId" in d) {
    if (!await one(db, "SELECT id FROM org_units WHERE id = ? AND status = 'ACTIVE'", d.parentId)) throw invalid("Parent organisation must be active.");
    if (target && d.parentId === target) throw invalid("A unit cannot report to itself.");
    if (target && await one(db, "SELECT 1 AS x FROM org_unit_closure WHERE ancestor_id = ? AND descendant_id = ?", target, d.parentId)) {
      throw invalid("A unit cannot report to one of its own subordinate units.");
    }
  }
  if (d.changeType === "CREATE_UNIT" && await one(db, "SELECT id FROM org_units WHERE code = ?", d.code)) throw conflict("Organisation code already exists.");
  // Parent/child type pairs are configuration (org_type_rules), checked for creation and re-parenting.
  if ("parentId" in d) {
    const parentType = (await one<{ unit_type: string }>(db, "SELECT unit_type FROM org_units WHERE id = ?", d.parentId))!.unit_type;
    const childType = d.changeType === "CREATE_UNIT" ? d.unitType : (await one<{ unit_type: string }>(db, "SELECT unit_type FROM org_units WHERE id = ?", target))!.unit_type;
    if (!(await one(db, "SELECT 1 AS ok FROM org_type_rules WHERE parent_type = ? AND child_type = ?", parentType, childType))) {
      throw invalid(`A ${UNIT_TYPE_LABEL[childType] ?? childType} cannot be placed under a ${UNIT_TYPE_LABEL[parentType] ?? parentType} (organisation type rules).`);
    }
  }
  const id = newId("ocr");
  await tx(db, async (db) => {
    const ref = await nextReference(db, "ORG", "org_change_requests");
    const { reason, effectiveDate, changeType, ...payload } = d as Record<string, string>;
    await run(db, `INSERT INTO org_change_requests (id, reference, change_type, target_unit_id, payload, reason, effective_date, status, proposed_by, created_at)
             VALUES (?,?,?,?,?,?,?, 'SUBMITTED', ?, ?)`, id, ref, changeType, target, JSON.stringify(payload), reason, effectiveDate, actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "org.change.propose", category: "ORG", entityType: "org_change", entityId: id, details: { reference: ref, changeType } });
    const approvers = await all<{ user_id: string }>(db, "SELECT DISTINCT user_id FROM delegations WHERE domain = 'ORG_CHANGE' AND revoked_at IS NULL");
    for (const a of approvers) if (a.user_id !== actor.userId) await notify(db, a.user_id, `Organisation change ${ref} proposed`, `${changeType.replace(/_/g, " ").toLowerCase()} awaiting decision`, "/app/org/changes");
  });
  return (await one<ChangeRow>(db, `${C_SELECT} WHERE c.id = ?`, id))!;
}

export async function decideChange(db: DB, actor: Actor, id: string, decision: "APPROVE" | "REJECT", reason: string, approvalRef?: string) {
  if (!await canApprove(db, actor, "ORG_CHANGE", HQ_ID)) throw forbidden("No recorded delegation to approve organisational changes.");
  const c = await one<ChangeRow>(db, `${C_SELECT} WHERE c.id = ?`, id);
  if (!c) throw notFound();
  if (c.status !== "SUBMITTED") throw conflict("This change has already been decided.");
  if (c.proposed_by === actor.userId) throw forbidden("Separation of duties: you cannot approve a change you proposed.");
  if (decision === "REJECT" && reason.trim().length < 5) throw invalid("A rejection reason is required.");
  if (decision === "APPROVE" && !approvalRef?.trim()) throw invalid("An approval reference (e.g. signed establishment directive) is required.");
  await tx(db, async (db) => {
    const t = nowIso();
    await run(db, "UPDATE org_change_requests SET status = ?, decided_by = ?, decision_reason = ?, approval_ref = ?, decided_at = ? WHERE id = ?",
      decision === "APPROVE" ? "APPROVED" : "REJECTED", actor.userId, reason.trim() || null, approvalRef?.trim() || null, t, id);
    await audit(db, { actorId: actor.userId, action: `org.change.${decision.toLowerCase()}`, category: "ORG", entityType: "org_change", entityId: id, details: { reference: c.reference } });
    await notify(db, c.proposed_by, `Organisation change ${c.reference} ${decision === "APPROVE" ? "approved" : "rejected"}`, reason || "", "/app/org/changes");
  });
  if (decision === "APPROVE") await applyDueChanges(db);
}

/**
 * Recomputes org_unit_closure from the current (open-ended) reporting lines.
 * Every unit is its own ancestor at depth 0. Computed in application code (portable, small tree);
 * a cycle in the data is refused rather than looped over.
 */
export async function rebuildClosure(db: DB) {
  await tx(db, async (db) => {
    const units = await all<{ id: string }>(db, "SELECT id FROM org_units");
    const rels = await all<{ child_id: string; parent_id: string }>(db, "SELECT child_id, parent_id FROM org_relationships WHERE effective_to IS NULL");
    const parentOf = new Map(rels.map((r) => [r.child_id, r.parent_id]));
    const rows: Array<[string, string, number]> = [];
    for (const { id } of units) {
      let cur: string | undefined = id;
      let depth = 0;
      const seen = new Set<string>();
      while (cur) {
        if (seen.has(cur)) throw conflict(`Reporting-line cycle detected at ${cur}.`);
        seen.add(cur);
        rows.push([cur, id, depth]);
        cur = parentOf.get(cur);
        depth++;
      }
    }
    await run(db, "DELETE FROM org_unit_closure");
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      await run(db, `INSERT INTO org_unit_closure (ancestor_id, descendant_id, depth) VALUES ${chunk.map(() => "(?,?,?)").join(",")}`, ...chunk.flat());
    }
  });
}

/** Applies approved changes whose effective date has arrived. Historical rows are end-dated, never deleted. */
export async function applyDueChanges(db: DB) {
  const due = await all<ChangeRow>(db, `${C_SELECT} WHERE c.status = 'APPROVED' AND c.effective_date <= ?`, today());
  for (const c of due) {
    await tx(db, async (db) => {
      const p = JSON.parse(c.payload) as Record<string, string>;
      const t = nowIso();
      const eff = c.effective_date;
      const endRel = (child: string) => run(db,"UPDATE org_relationships SET effective_to = ? WHERE child_id = ? AND effective_to IS NULL", eff, child);
      switch (c.change_type) {
        case "CREATE_UNIT": {
          const id = newId("org");
          const parent = (await one<{ tenant_id: string; branch: string }>(db, "SELECT tenant_id, branch FROM org_units WHERE id = ?", p.parentId))!;
          const branch = p.unitType === "PROVINCIAL_DIVISION" || ["DISTRICT", "STATION", "POST"].includes(p.unitType) ? "TERRITORIAL"
            : p.unitType === "HQ_OFFICE" ? "HQ" : parent.branch === "HQ" ? "FORMATION" : parent.branch;
          await run(db, `INSERT INTO org_units (id, tenant_id, code, name, unit_type, branch, status, effective_from, approval_ref, validation_note, created_at)
                   VALUES (?,?,?,?,?,?, 'ACTIVE', ?,?,?,?)`, id, parent.tenant_id, p.code, p.name, p.unitType, branch, eff, c.approval_ref, "Created via approved change " + c.reference, t);
          await run(db, "INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?, 'REPORTS_TO', ?,?,?)",
            newId("rel"), id, p.parentId, eff, c.approval_ref, t);
          break;
        }
        case "RENAME_UNIT": {
          // Superseded name is retained in the audit trail; stable ID is unchanged.
          const prev = await one<{ name: string }>(db, "SELECT name FROM org_units WHERE id = ?", c.target_unit_id);
          await run(db, "UPDATE org_units SET name = ?, approval_ref = ? WHERE id = ?", p.name, c.approval_ref, c.target_unit_id);
          await audit(db, { actorId: c.decided_by, action: "org.unit.renamed", category: "ORG", entityType: "org_unit", entityId: c.target_unit_id!, details: { before: prev?.name, after: p.name } });
          break;
        }
        case "CHANGE_PARENT":
          await endRel(c.target_unit_id!);
          await run(db, "INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?, 'REPORTS_TO', ?,?,?)",
            newId("rel"), c.target_unit_id, p.parentId, eff, c.approval_ref, t);
          break;
        case "DEACTIVATE_UNIT":
          await run(db, "UPDATE org_units SET status = 'INACTIVE', effective_to = ? WHERE id = ?", eff, c.target_unit_id);
          await endRel(c.target_unit_id!);
          break;
      }
      if (c.change_type !== "RENAME_UNIT") await rebuildClosure(db);
      await run(db, "UPDATE org_change_requests SET status = 'APPLIED', applied_at = ? WHERE id = ?", t, c.id);
      await audit(db, { actorId: c.decided_by, action: "org.change.apply", category: "ORG", entityType: "org_change", entityId: c.id, details: { reference: c.reference } });
    });
  }
}
