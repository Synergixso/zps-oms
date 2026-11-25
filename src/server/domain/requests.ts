/**
 * M03 — Administrative Request and Approval Workflow.
 *
 * State model (versioned workflow definitions, WORKFLOW_SPECIFICATIONS.md §WF-04..08):
 *   DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED → CLOSED
 *                         ├→ RETURNED → (edit) → SUBMITTED
 *                         └→ REJECTED (terminal)
 *   DRAFT|SUBMITTED|RETURNED → CANCELLED (terminal)
 *   CLOSED → IN_PROGRESS (controlled reopen, reason mandatory)
 * Multi-level definitions keep the request UNDER_REVIEW until every level approves, in order.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { REQUEST_CATEGORIES } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso } from "./core";
import { type Actor, HQ_ID, can, canApprove, requirePermission, scopeFor } from "./policy";

export const REQUEST_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  RETURNED: "Returned",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export type RequestAction = "SUBMIT" | "ASSIGN" | "APPROVE" | "RETURN" | "REJECT" | "START" | "COMPLETE" | "CLOSE" | "CANCEL" | "REOPEN";

/** Allowed transitions. Anything not listed is rejected. */
export const TRANSITIONS: Record<RequestAction, { from: RequestStatus[]; to: RequestStatus }> = {
  SUBMIT: { from: ["DRAFT", "RETURNED"], to: "SUBMITTED" },
  ASSIGN: { from: ["SUBMITTED"], to: "UNDER_REVIEW" },
  APPROVE: { from: ["UNDER_REVIEW"], to: "APPROVED" },
  RETURN: { from: ["UNDER_REVIEW"], to: "RETURNED" },
  REJECT: { from: ["UNDER_REVIEW"], to: "REJECTED" },
  START: { from: ["APPROVED"], to: "IN_PROGRESS" },
  COMPLETE: { from: ["IN_PROGRESS"], to: "COMPLETED" },
  CLOSE: { from: ["COMPLETED"], to: "CLOSED" },
  CANCEL: { from: ["DRAFT", "SUBMITTED", "RETURNED"], to: "CANCELLED" },
  REOPEN: { from: ["CLOSED"], to: "IN_PROGRESS" },
};

export interface ApprovalStep {
  level: number;
  approverScope: "ORIGIN" | "HQ";
  label: string;
}

export interface RequestRow {
  id: string;
  reference: string;
  category_code: string;
  workflow_id: string;
  title: string;
  details: string;
  priority: "ROUTINE" | "PRIORITY";
  origin_org_id: string;
  origin_name: string;
  status: RequestStatus;
  current_level: number;
  created_by: string;
  creator_name: string;
  assigned_to: string | null;
  assignee_name: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
  row_version: number;
  workflow_version: number;
  approval_steps: string;
}

const BASE_SELECT = `
  SELECT r.*, o.name AS origin_name, u.display_name AS creator_name, a.display_name AS assignee_name,
         w.version AS workflow_version, w.approval_steps
    FROM admin_requests r
    JOIN org_units o ON o.id = r.origin_org_id
    JOIN users u ON u.id = r.created_by
    LEFT JOIN users a ON a.id = r.assigned_to
    JOIN workflow_definitions w ON w.id = r.workflow_id`;

export function stepsOf(r: Pick<RequestRow, "approval_steps" | "origin_org_id">): ApprovalStep[] {
  const steps = JSON.parse(r.approval_steps) as ApprovalStep[];
  // A request originating at HQ does not route to HQ twice.
  if (r.origin_org_id === HQ_ID) return steps.filter((s, i) => !(s.approverScope === "HQ" && i > 0));
  return steps;
}

/** Org unit whose delegation is required for the current approval level. */
export function approverOrgFor(r: RequestRow): string | null {
  if (r.status !== "UNDER_REVIEW") return null;
  const step = stepsOf(r)[r.current_level - 1];
  if (!step) return null;
  return step.approverScope === "HQ" ? HQ_ID : r.origin_org_id;
}

function isPendingWithActor(db: DB, actor: Actor, r: RequestRow): boolean {
  const org = approverOrgFor(r);
  return !!org && canApprove(db, actor, "ADMIN_REQUEST", org, r.category_code);
}

export function canViewRequest(db: DB, actor: Actor, r: RequestRow): boolean {
  return can(actor, "request.view", r.origin_org_id) || isPendingWithActor(db, actor, r);
}

export interface RequestFilters {
  status?: string;
  category?: string;
  q?: string;
  orgUnitId?: string;
}

export function listRequests(db: DB, actor: Actor, f: RequestFilters = {}): RequestRow[] {
  requirePermission(db, actor, "request.view");
  const s = scopeFor(actor, "request.view");
  const where: string[] = [];
  const params: unknown[] = [];
  if (!s.national) {
    where.push(`r.origin_org_id IN (${s.units.map(() => "?").join(",") || "''"})`);
    params.push(...s.units);
  }
  // Drafts are private to their author.
  where.push("(r.status <> 'DRAFT' OR r.created_by = ?)");
  params.push(actor.userId);
  if (f.status && (REQUEST_STATUSES as readonly string[]).includes(f.status)) {
    where.push("r.status = ?");
    params.push(f.status);
  }
  if (f.category) {
    where.push("r.category_code = ?");
    params.push(f.category);
  }
  if (f.orgUnitId) {
    where.push("r.origin_org_id = ?");
    params.push(f.orgUnitId);
  }
  if (f.q) {
    where.push("(r.reference LIKE ? OR r.title LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  return all<RequestRow>(db, `${BASE_SELECT} WHERE ${where.join(" AND ")} ORDER BY r.updated_at DESC LIMIT 500`, ...params);
}

/** Items awaiting this actor's decision (approval inbox), across levels. */
export function approvalInbox(db: DB, actor: Actor): RequestRow[] {
  const rows = all<RequestRow>(db, `${BASE_SELECT} WHERE r.status = 'UNDER_REVIEW' ORDER BY r.submitted_at ASC`);
  return rows.filter((r) => isPendingWithActor(db, actor, r) && r.created_by !== actor.userId);
}

/** Submitted items this actor may assign for review. */
export function assignmentQueue(db: DB, actor: Actor): RequestRow[] {
  const sc = scopeFor(actor, "request.assign");
  if (!sc.national && sc.units.length === 0) return [];
  const rows = all<RequestRow>(db, `${BASE_SELECT} WHERE r.status = 'SUBMITTED' ORDER BY r.submitted_at ASC`);
  return rows.filter((r) => can(actor, "request.assign", r.origin_org_id));
}

export function getRequest(db: DB, actor: Actor, id: string): RequestRow {
  const r = one<RequestRow>(db, `${BASE_SELECT} WHERE r.id = ?`, id);
  if (!r || !canViewRequest(db, actor, r) || (r.status === "DRAFT" && r.created_by !== actor.userId)) {
    audit(db, { actorId: actor.userId, action: "request.view", outcome: "DENIED", category: "SECURITY", entityType: "admin_request", entityId: id });
    throw notFound();
  }
  return r;
}

export function requestHistory(db: DB, actor: Actor, id: string) {
  getRequest(db, actor, id); // scope check
  return all<{ id: string; action: string; from_status: string | null; to_status: string; reason: string | null; created_at: string; actor_name: string; approval_level: number | null; workflow_version: number; approval_ref: string | null }>(
    db,
    `SELECT h.*, u.display_name AS actor_name FROM request_actions h JOIN users u ON u.id = h.actor_id
      WHERE h.request_id = ? ORDER BY h.created_at ASC, h.rowid ASC`,
    id,
  );
}

export const createRequestSchema = z.object({
  categoryCode: z.enum(REQUEST_CATEGORIES.map((c) => c.code) as [string, ...string[]], { message: "Select an approved category." }),
  title: z.string().trim().min(5, "Title must be at least 5 characters.").max(120, "Title must be 120 characters or fewer."),
  details: z.string().trim().min(10, "Provide at least 10 characters of supporting information.").max(2000, "Supporting information is limited to 2,000 characters."),
  priority: z.enum(["ROUTINE", "PRIORITY"]).default("ROUTINE"),
  originOrgId: z.string().optional(),
});
export type CreateRequestInput = z.input<typeof createRequestSchema>;

function resolveOrigin(db: DB, actor: Actor, requested?: string): string {
  const s = scopeFor(actor, "request.create");
  if (requested) {
    if (!s.units.includes(requested)) {
      requirePermission(db, actor, "request.create", requested); // audits + throws
    }
    return requested;
  }
  if (s.units.length === 1) return s.units[0];
  if (s.units.length === 0) {
    requirePermission(db, actor, "request.create");
  }
  throw invalid("Select the originating organisation.");
}

export function createDraft(db: DB, actor: Actor, input: CreateRequestInput): RequestRow {
  const data = createRequestSchema.parse(input);
  const origin = resolveOrigin(db, actor, data.originOrgId || undefined);
  requirePermission(db, actor, "request.create", origin);
  const wf = one<{ id: string; version: number }>(
    db,
    "SELECT id, version FROM workflow_definitions WHERE category_code = ? AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1",
    data.categoryCode,
  );
  if (!wf) throw invalid("No active workflow definition exists for this category.");
  const id = newId("req");
  tx(db, () => {
    const t = nowIso();
    const ref = nextReference(db, "REQ", "admin_requests");
    run(
      db,
      `INSERT INTO admin_requests (id, reference, category_code, workflow_id, title, details, priority, origin_org_id, status, current_level, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?, 'DRAFT', 0, ?, ?, ?)`,
      id, ref, data.categoryCode, wf.id, data.title, data.details, data.priority, origin, actor.userId, t, t,
    );
    run(db, "INSERT INTO request_actions (id, request_id, actor_id, action, from_status, to_status, workflow_version, created_at) VALUES (?,?,?,?,?,?,?,?)",
      newId("rqa"), id, actor.userId, "CREATE", null, "DRAFT", wf.version, t);
    audit(db, { actorId: actor.userId, action: "request.create", category: "BUSINESS", entityType: "admin_request", entityId: id, orgUnitId: origin, details: { reference: ref } });
  });
  return getRequest(db, actor, id);
}

export function updateDraft(db: DB, actor: Actor, id: string, input: Omit<CreateRequestInput, "originOrgId">): RequestRow {
  const r = getRequest(db, actor, id);
  if (!["DRAFT", "RETURNED"].includes(r.status)) throw conflict("Only draft or returned requests can be edited. Approved or closed requests require the controlled reopening workflow.");
  if (r.created_by !== actor.userId) throw forbidden("Only the request author can edit this request.");
  requirePermission(db, actor, "request.edit", r.origin_org_id, { type: "admin_request", id });
  const data = createRequestSchema.parse({ ...input, originOrgId: r.origin_org_id });
  if (data.categoryCode !== r.category_code) throw invalid("The category cannot be changed after creation. Cancel and create a new request.");
  tx(db, () => {
    run(db, "UPDATE admin_requests SET title = ?, details = ?, priority = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ?",
      data.title, data.details, data.priority, nowIso(), id);
    audit(db, {
      actorId: actor.userId, action: "request.edit", category: "BUSINESS", entityType: "admin_request", entityId: id, orgUnitId: r.origin_org_id,
      details: { before: { title: r.title, priority: r.priority }, after: { title: data.title, priority: data.priority } },
    });
  });
  return getRequest(db, actor, id);
}

export interface ActionInput {
  reason?: string;
  assigneeId?: string;
  expectedVersion?: number;
}

function usersWithDelegation(db: DB, orgId: string, category: string): string[] {
  const t = nowIso();
  return all<{ user_id: string }>(
    db,
    `SELECT DISTINCT d.user_id FROM delegations d JOIN users u ON u.id = d.user_id
      WHERE d.domain = 'ADMIN_REQUEST' AND d.org_unit_id = ? AND d.revoked_at IS NULL AND u.status = 'ACTIVE'
        AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?) AND (d.category_code IS NULL OR d.category_code = ?)`,
    orgId, t, t, category,
  ).map((x) => x.user_id);
}

function usersWithAssign(db: DB, orgId: string): string[] {
  const t = nowIso();
  return all<{ user_id: string }>(
    db,
    `SELECT DISTINCT a.user_id FROM role_assignments a JOIN users u ON u.id = a.user_id
      WHERE a.org_unit_id = ? AND a.role_code IN ('PROVINCIAL_COMMANDER','FORMATION_COMMANDER','HQ_OPS_COORDINATOR')
        AND a.revoked_at IS NULL AND u.status = 'ACTIVE' AND (a.valid_to IS NULL OR a.valid_to > ?)`,
    orgId, t,
  ).map((x) => x.user_id);
}

/** Executes a workflow action. All checks happen here, server-side, in one transaction. */
export function performAction(db: DB, actor: Actor, id: string, action: RequestAction, input: ActionInput = {}): RequestRow {
  const r = getRequest(db, actor, id);
  const rule = TRANSITIONS[action];
  if (!rule) throw invalid("Unknown workflow action.");
  if (input.expectedVersion && input.expectedVersion !== r.row_version) {
    throw conflict("This request was changed by someone else. Reload and try again.");
  }
  if (!rule.from.includes(r.status)) {
    audit(db, { actorId: actor.userId, action: `request.${action.toLowerCase()}`, outcome: "DENIED", category: "BUSINESS", entityType: "admin_request", entityId: id, details: { reason: "invalid_transition", from: r.status } });
    throw conflict(`A request in status "${STATUS_LABEL[r.status]}" cannot be ${action.toLowerCase()}ed.`);
  }
  const reason = input.reason?.trim() ?? "";
  const ent = { type: "admin_request", id };
  let to: RequestStatus = rule.to;
  let level: number | null = null;
  let nextLevel = r.current_level;
  let assignee: string | null = r.assigned_to;
  const notes: Array<[string, string, string]> = [];
  const link = `/app/requests/${r.id}`;

  switch (action) {
    case "SUBMIT": {
      if (r.created_by !== actor.userId) throw forbidden("Only the request author can submit this request.");
      requirePermission(db, actor, "request.submit", r.origin_org_id, ent);
      nextLevel = 0;
      for (const u of usersWithAssign(db, r.origin_org_id)) notes.push([u, `Request ${r.reference} submitted`, `"${r.title}" is awaiting assignment for review.`]);
      break;
    }
    case "ASSIGN": {
      requirePermission(db, actor, "request.assign", r.origin_org_id, ent);
      assignee = input.assigneeId || actor.userId;
      if (assignee !== actor.userId) {
        const target = one<{ id: string }>(db, "SELECT id FROM users WHERE id = ? AND status = 'ACTIVE'", assignee);
        if (!target) throw invalid("The selected processor is not an active user.");
      }
      nextLevel = 1;
      notes.push([r.created_by, `Request ${r.reference} under review`, "Your request has been assigned for review."]);
      for (const u of usersWithDelegation(db, r.origin_org_id, r.category_code)) {
        if (u !== r.created_by) notes.push([u, `Approval required: ${r.reference}`, `"${r.title}" awaits your decision (level 1).`]);
      }
      break;
    }
    case "APPROVE":
    case "RETURN":
    case "REJECT": {
      const org = approverOrgFor(r);
      if (!org) throw conflict("This request has no pending approval level.");
      if (!canApprove(db, actor, "ADMIN_REQUEST", org, r.category_code)) {
        audit(db, { actorId: actor.userId, action: `request.${action.toLowerCase()}`, outcome: "DENIED", category: "SECURITY", entityType: "admin_request", entityId: id, orgUnitId: org, details: { reason: "no_delegation", level: r.current_level } });
        throw forbidden("You do not hold a recorded delegation of approval authority for this organisation, category and approval level.");
      }
      if (r.created_by === actor.userId) {
        audit(db, { actorId: actor.userId, action: `request.${action.toLowerCase()}`, outcome: "DENIED", category: "SECURITY", entityType: "admin_request", entityId: id, details: { reason: "self_approval" } });
        throw forbidden("Self-approval is not permitted. A different delegated approver must decide this request.");
      }
      if (action !== "APPROVE" && reason.length < 5) throw invalid("A reason of at least 5 characters is required to return or reject a request.");
      level = r.current_level;
      if (action === "APPROVE") {
        const steps = stepsOf(r);
        if (r.current_level < steps.length) {
          to = "UNDER_REVIEW";
          nextLevel = r.current_level + 1;
          const nextOrg = steps[nextLevel - 1].approverScope === "HQ" ? HQ_ID : r.origin_org_id;
          for (const u of usersWithDelegation(db, nextOrg, r.category_code)) {
            if (u !== r.created_by) notes.push([u, `Approval required: ${r.reference}`, `"${r.title}" awaits your decision (level ${nextLevel}).`]);
          }
          notes.push([r.created_by, `Request ${r.reference} approved at level ${r.current_level}`, `Forwarded for level ${nextLevel} decision.`]);
        } else {
          notes.push([r.created_by, `Request ${r.reference} approved`, "Your request has been approved."]);
        }
      } else {
        nextLevel = 0;
        notes.push([r.created_by, `Request ${r.reference} ${action === "RETURN" ? "returned for correction" : "rejected"}`, reason]);
      }
      break;
    }
    case "START":
    case "COMPLETE": {
      requirePermission(db, actor, "request.progress", r.origin_org_id, ent);
      if (action === "COMPLETE") notes.push([r.created_by, `Request ${r.reference} completed`, "Work on your request has been completed."]);
      break;
    }
    case "CLOSE": {
      requirePermission(db, actor, "request.close", r.origin_org_id, ent);
      break;
    }
    case "CANCEL": {
      if (r.created_by !== actor.userId) requirePermission(db, actor, "request.cancel", r.origin_org_id, ent);
      if (r.created_by !== actor.userId && !can(actor, "request.assign", r.origin_org_id)) throw forbidden("Only the author or an authorised processor may cancel this request.");
      if (reason.length < 5) throw invalid("A cancellation reason of at least 5 characters is required.");
      break;
    }
    case "REOPEN": {
      requirePermission(db, actor, "request.reopen", r.origin_org_id, ent);
      if (reason.length < 10) throw invalid("Controlled reopening requires a justification of at least 10 characters.");
      notes.push([r.created_by, `Request ${r.reference} reopened`, reason]);
      break;
    }
  }

  tx(db, () => {
    const t = nowIso();
    const terminal = ["CLOSED", "REJECTED", "CANCELLED"].includes(to);
    const res = run(
      db,
      `UPDATE admin_requests SET status = ?, current_level = ?, assigned_to = ?, updated_at = ?, row_version = row_version + 1,
              submitted_at = CASE WHEN ? = 'SUBMIT' THEN ? ELSE submitted_at END,
              due_date = CASE WHEN ? = 'SUBMIT' THEN date(?, '+10 days') ELSE due_date END,
              closed_at = CASE WHEN ? THEN ? WHEN ? = 'REOPEN' THEN NULL ELSE closed_at END
        WHERE id = ? AND row_version = ?`,
      to, nextLevel, assignee, t, action, t, action, t, terminal ? 1 : 0, t, action, id, r.row_version,
    );
    if (Number(res.changes) !== 1) throw conflict("This request was changed by someone else. Reload and try again.");
    run(
      db,
      "INSERT INTO request_actions (id, request_id, actor_id, action, from_status, to_status, approval_level, reason, workflow_version, approval_ref, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      newId("rqa"), id, actor.userId, action, r.status, to, level, reason || null, r.workflow_version,
      action === "APPROVE" ? `APR-${r.reference}-L${level}` : null, t,
    );
    for (const [u, title, body] of notes) notify(db, u, title, body, link);
    audit(db, {
      actorId: actor.userId, action: `request.${action.toLowerCase()}`, category: "BUSINESS", entityType: "admin_request", entityId: id,
      orgUnitId: r.origin_org_id, details: { reference: r.reference, from: r.status, to, level, workflowVersion: r.workflow_version },
    });
  });
  return one<RequestRow>(db, `${BASE_SELECT} WHERE r.id = ?`, id)!;
}

/** Which actions the UI should offer. The server re-validates every action regardless. */
export function availableActions(db: DB, actor: Actor, r: RequestRow): RequestAction[] {
  const out: RequestAction[] = [];
  const mine = r.created_by === actor.userId;
  const st = r.status;
  if (TRANSITIONS.SUBMIT.from.includes(st) && mine && can(actor, "request.submit", r.origin_org_id)) out.push("SUBMIT");
  if (st === "SUBMITTED" && can(actor, "request.assign", r.origin_org_id)) out.push("ASSIGN");
  if (st === "UNDER_REVIEW" && !mine && isPendingWithActor(db, actor, r)) out.push("APPROVE", "RETURN", "REJECT");
  if ((st === "APPROVED" && can(actor, "request.progress", r.origin_org_id))) out.push("START");
  if (st === "IN_PROGRESS" && can(actor, "request.progress", r.origin_org_id)) out.push("COMPLETE");
  if (st === "COMPLETED" && can(actor, "request.close", r.origin_org_id)) out.push("CLOSE");
  if (TRANSITIONS.CANCEL.from.includes(st) && (mine || can(actor, "request.assign", r.origin_org_id))) out.push("CANCEL");
  if (st === "CLOSED" && can(actor, "request.reopen", r.origin_org_id)) out.push("REOPEN");
  return out;
}

export function overdueRequests(rows: RequestRow[]): RequestRow[] {
  const d = nowIso().slice(0, 10);
  return rows.filter((r) => r.due_date && r.due_date < d && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"].includes(r.status));
}
