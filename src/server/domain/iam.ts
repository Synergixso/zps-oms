/**
 * M02 — Identity, Roles and Access Management.
 * - No self-registration and no self-service elevation: an administrator can
 *   never change their own assignments, delegations or account status.
 * - Role assignment = role + org unit + validity window + justification.
 * - Auditor (and other requiresExpiry) roles must be time-limited.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { ROLE_BY_CODE, type RoleCode } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso } from "./core";
import { type Actor, HQ_ID, requirePermission } from "./policy";

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  position_title: string;
  status: string;
  status_reason: string | null;
  created_at: string;
  active_roles: number;
}

export function listUsers(db: DB, actor: Actor, q?: string): UserRow[] {
  requirePermission(db, actor, "user.view", HQ_ID);
  const t = nowIso();
  return all<UserRow>(
    db,
    `SELECT u.*, (SELECT COUNT(*) FROM role_assignments a WHERE a.user_id = u.id AND a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?)) AS active_roles
       FROM users u ${q ? "WHERE u.display_name LIKE ? OR u.username LIKE ?" : ""} ORDER BY u.display_name`,
    t, ...(q ? [`%${q}%`, `%${q}%`] : []),
  );
}

export interface AssignmentRow {
  id: string;
  user_id: string;
  role_code: RoleCode;
  org_unit_id: string;
  org_name: string;
  valid_from: string;
  valid_to: string | null;
  justification: string;
  granted_by_name: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export function userDetail(db: DB, actor: Actor, userId: string) {
  requirePermission(db, actor, "user.view", HQ_ID);
  const user = one<UserRow>(db, "SELECT *, 0 AS active_roles FROM users WHERE id = ?", userId);
  if (!user) throw notFound();
  const assignments = all<AssignmentRow>(
    db,
    `SELECT a.*, o.name AS org_name, g.display_name AS granted_by_name FROM role_assignments a
       JOIN org_units o ON o.id = a.org_unit_id LEFT JOIN users g ON g.id = a.granted_by WHERE a.user_id = ? ORDER BY a.created_at DESC`,
    userId,
  );
  const delegations = all<{ id: string; domain: string; category_code: string | null; org_name: string; valid_from: string; valid_to: string | null; approval_ref: string; revoked_at: string | null }>(
    db,
    "SELECT d.*, o.name AS org_name FROM delegations d JOIN org_units o ON o.id = d.org_unit_id WHERE d.user_id = ? ORDER BY d.created_at DESC",
    userId,
  );
  return { user, assignments, delegations };
}

export const provisionSchema = z.object({
  username: z.string().trim().regex(/^demo\.[a-z0-9.]{3,40}$/, "Synthetic usernames must start with 'demo.' (lower-case letters, digits, dots)."),
  displayName: z.string().trim().min(3).max(80).refine((v) => /synthetic|demo/i.test(v), "Display names must be clearly synthetic (include 'Demo' or 'Synthetic')."),
  positionTitle: z.string().trim().min(3).max(80),
});

export function provisionUser(db: DB, actor: Actor, input: z.input<typeof provisionSchema>) {
  requirePermission(db, actor, "user.provision", HQ_ID);
  const d = provisionSchema.parse(input);
  if (one(db, "SELECT id FROM users WHERE username = ?", d.username)) throw conflict("Username already exists. Shared or duplicate accounts are not permitted.");
  const id = newId("usr");
  tx(db, () => {
    run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, d.username, d.displayName, d.positionTitle, nowIso());
    audit(db, { actorId: actor.userId, action: "iam.user.provision", category: "IAM", entityType: "user", entityId: id, details: { username: d.username } });
  });
  return id;
}

export const assignSchema = z.object({
  userId: z.string().min(1),
  roleCode: z.string().min(1),
  orgUnitId: z.string().min(1),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  justification: z.string().trim().min(10, "Record the approval reference / justification (at least 10 characters)."),
});

export function assignRole(db: DB, actor: Actor, input: z.input<typeof assignSchema>) {
  requirePermission(db, actor, "grant.assign", HQ_ID);
  const d = assignSchema.parse(input);
  if (d.userId === actor.userId) {
    audit(db, { actorId: actor.userId, action: "iam.grant.assign", outcome: "DENIED", category: "SECURITY", entityType: "user", entityId: d.userId, details: { reason: "self_elevation" } });
    throw forbidden("You cannot change your own access. Another authorised administrator must do this.");
  }
  const role = ROLE_BY_CODE[d.roleCode as RoleCode];
  if (!role) throw invalid("Unknown role.");
  const org = one<{ unit_type: string; status: string }>(db, "SELECT unit_type, status FROM org_units WHERE id = ?", d.orgUnitId);
  if (!org || org.status !== "ACTIVE") throw invalid("Organisation must be active.");
  if (!role.assignableTo.includes(org.unit_type as never)) throw invalid(`${role.name} cannot be assigned at this organisation type.`);
  const user = one<{ status: string }>(db, "SELECT status FROM users WHERE id = ?", d.userId);
  if (!user || user.status !== "ACTIVE") throw invalid("Access can only be granted to an active account.");
  const t = nowIso();
  if (role.requiresExpiry) {
    if (!d.validTo) throw invalid(`${role.name} access must be time-limited: set an expiry date.`);
    const maxDays = 180;
    if (new Date(d.validTo).getTime() - Date.parse(t) > maxDays * 86400000) throw invalid(`${role.name} grants are limited to ${maxDays} days.`);
  }
  if (d.validTo && d.validTo <= t.slice(0, 10)) throw invalid("Expiry date must be in the future.");
  const dup = one(db, "SELECT id FROM role_assignments WHERE user_id = ? AND role_code = ? AND org_unit_id = ? AND revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", d.userId, d.roleCode, d.orgUnitId, t);
  if (dup) throw conflict("The user already holds this role for this organisation.");
  const id = newId("asg");
  tx(db, () => {
    run(db, `INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, valid_to, justification, granted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, d.userId, d.roleCode, d.orgUnitId, t, d.validTo ? `${d.validTo}T23:59:59.000Z` : null, d.justification, actor.userId, t);
    audit(db, { actorId: actor.userId, action: "iam.grant.assign", category: "IAM", entityType: "user", entityId: d.userId, orgUnitId: d.orgUnitId, details: { role: d.roleCode, validTo: d.validTo || null, privileged: ["PLATFORM_ADMIN", "SECURITY_ADMIN", "INTERNAL_AUDITOR"].includes(d.roleCode) } });
    notify(db, d.userId, "Access granted", `${role.name} access has been assigned to your account.`, "/app/profile");
  });
  return id;
}

export function revokeAssignment(db: DB, actor: Actor, assignmentId: string, reason: string) {
  requirePermission(db, actor, "grant.revoke", HQ_ID);
  const a = one<{ user_id: string; role_code: string; org_unit_id: string; revoked_at: string | null }>(db, "SELECT * FROM role_assignments WHERE id = ?", assignmentId);
  if (!a) throw notFound();
  if (a.user_id === actor.userId) throw forbidden("You cannot change your own access.");
  if (a.revoked_at) throw conflict("Assignment already revoked.");
  if (reason.trim().length < 5) throw invalid("A revocation reason is required.");
  tx(db, () => {
    run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ?", nowIso(), actor.userId, reason.trim(), assignmentId);
    audit(db, { actorId: actor.userId, action: "iam.grant.revoke", category: "IAM", entityType: "user", entityId: a.user_id, orgUnitId: a.org_unit_id, details: { role: a.role_code, reason } });
  });
}

export const delegationSchema = z.object({
  userId: z.string().min(1),
  orgUnitId: z.string().min(1),
  domain: z.enum(["ADMIN_REQUEST", "MAINTENANCE", "ORG_CHANGE"]),
  categoryCode: z.string().optional().or(z.literal("")),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  approvalRef: z.string().trim().min(5, "Record the reference of the approved delegation instrument."),
});

export function grantDelegation(db: DB, actor: Actor, input: z.input<typeof delegationSchema>) {
  requirePermission(db, actor, "delegation.grant", HQ_ID);
  const d = delegationSchema.parse(input);
  if (d.userId === actor.userId) throw forbidden("You cannot delegate approval authority to yourself.");
  const t = nowIso();
  const business = all<{ role_code: RoleCode }>(db, "SELECT role_code FROM role_assignments WHERE user_id = ? AND org_unit_id = ? AND revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", d.userId, d.orgUnitId, t)
    .some((a) => ROLE_BY_CODE[a.role_code]?.category === "BUSINESS");
  if (!business) throw invalid("Delegations can only be recorded for a user holding an active business role at the same organisation.");
  if (d.domain === "ORG_CHANGE" && d.orgUnitId !== HQ_ID) throw invalid("Organisational-change approval can only be delegated at Service Headquarters.");
  const id = newId("dlg");
  tx(db, () => {
    run(db, "INSERT INTO delegations (id, user_id, org_unit_id, domain, category_code, valid_from, valid_to, approval_ref, granted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      id, d.userId, d.orgUnitId, d.domain, d.categoryCode || null, t, d.validTo ? `${d.validTo}T23:59:59.000Z` : null, d.approvalRef, actor.userId, t);
    audit(db, { actorId: actor.userId, action: "iam.delegation.grant", category: "IAM", entityType: "user", entityId: d.userId, orgUnitId: d.orgUnitId, details: { domain: d.domain, category: d.categoryCode || "ALL", approvalRef: d.approvalRef } });
  });
  return id;
}

export function revokeDelegation(db: DB, actor: Actor, delegationId: string) {
  requirePermission(db, actor, "delegation.revoke", HQ_ID);
  const d = one<{ user_id: string; revoked_at: string | null; org_unit_id: string }>(db, "SELECT * FROM delegations WHERE id = ?", delegationId);
  if (!d) throw notFound();
  if (d.user_id === actor.userId) throw forbidden("You cannot change your own delegations.");
  if (d.revoked_at) throw conflict("Delegation already revoked.");
  tx(db, () => {
    run(db, "UPDATE delegations SET revoked_at = ?, revoked_by = ? WHERE id = ?", nowIso(), actor.userId, delegationId);
    audit(db, { actorId: actor.userId, action: "iam.delegation.revoke", category: "IAM", entityType: "user", entityId: d.user_id, orgUnitId: d.org_unit_id });
  });
}

export function setUserStatus(db: DB, actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED", reason: string) {
  if (status === "DEACTIVATED") requirePermission(db, actor, "user.deactivate", HQ_ID);
  else requirePermission(db, actor, "user.suspend", HQ_ID);
  if (userId === actor.userId) throw forbidden("You cannot change the status of your own account.");
  const u = one<{ status: string }>(db, "SELECT status FROM users WHERE id = ?", userId);
  if (!u) throw notFound();
  if (u.status === "DEACTIVATED") throw conflict("Deactivated accounts cannot be reactivated; provision a new account through the approved process.");
  if (reason.trim().length < 5) throw invalid("A reason is required.");
  tx(db, () => {
    run(db, "UPDATE users SET status = ?, status_reason = ? WHERE id = ?", status, reason.trim(), userId);
    if (status !== "ACTIVE") run(db, "DELETE FROM sessions WHERE user_id = ?", userId); // immediate sign-out
    if (status === "DEACTIVATED") {
      run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = 'Account deactivated' WHERE user_id = ? AND revoked_at IS NULL", nowIso(), actor.userId, userId);
      run(db, "UPDATE delegations SET revoked_at = ?, revoked_by = ? WHERE user_id = ? AND revoked_at IS NULL", nowIso(), actor.userId, userId);
    }
    audit(db, { actorId: actor.userId, action: `iam.user.${status.toLowerCase()}`, category: "IAM", entityType: "user", entityId: userId, details: { from: u.status, to: status, reason } });
  });
}

// ---- Access recertification ------------------------------------------------

export function listReviews(db: DB, actor: Actor) {
  requirePermission(db, actor, "accessreview.manage", HQ_ID);
  return all<{ id: string; reference: string; title: string; status: string; created_at: string; completed_at: string | null; total: number; decided: number }>(
    db,
    `SELECT r.*, (SELECT COUNT(*) FROM access_review_items i WHERE i.review_id = r.id) AS total,
            (SELECT COUNT(*) FROM access_review_items i WHERE i.review_id = r.id AND i.decision IS NOT NULL) AS decided
       FROM access_reviews r ORDER BY r.created_at DESC`,
  );
}

export function openReview(db: DB, actor: Actor, title: string) {
  requirePermission(db, actor, "accessreview.manage", HQ_ID);
  if (title.trim().length < 5) throw invalid("Give the review a title.");
  const id = newId("arv");
  tx(db, () => {
    const t = nowIso();
    const ref = nextReference(db, "ARV", "access_reviews");
    run(db, "INSERT INTO access_reviews (id, reference, title, status, opened_by, created_at) VALUES (?,?,?, 'OPEN', ?, ?)", id, ref, title.trim(), actor.userId, t);
    const active = all<{ id: string; user_id: string }>(db, "SELECT id, user_id FROM role_assignments WHERE revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", t);
    for (const a of active) {
      if (a.user_id === actor.userId) continue; // reviewers do not certify their own access
      run(db, "INSERT INTO access_review_items (id, review_id, assignment_id) VALUES (?,?,?)", newId("ari"), id, a.id);
    }
    audit(db, { actorId: actor.userId, action: "iam.review.open", category: "IAM", entityType: "access_review", entityId: id, details: { reference: ref, items: active.length } });
  });
  return id;
}

export function reviewItems(db: DB, actor: Actor, reviewId: string) {
  requirePermission(db, actor, "accessreview.manage", HQ_ID);
  const review = one<{ id: string; reference: string; title: string; status: string }>(db, "SELECT * FROM access_reviews WHERE id = ?", reviewId);
  if (!review) throw notFound();
  const items = all<{ id: string; decision: string | null; note: string | null; role_code: RoleCode; org_name: string; user_name: string; user_id: string; valid_to: string | null; justification: string }>(
    db,
    `SELECT i.id, i.decision, i.note, a.role_code, o.name AS org_name, u.display_name AS user_name, u.id AS user_id, a.valid_to, a.justification
       FROM access_review_items i JOIN role_assignments a ON a.id = i.assignment_id JOIN org_units o ON o.id = a.org_unit_id JOIN users u ON u.id = a.user_id
      WHERE i.review_id = ? ORDER BY u.display_name`,
    reviewId,
  );
  return { review, items };
}

export function decideReviewItem(db: DB, actor: Actor, itemId: string, decision: "RETAIN" | "REVOKE", note: string) {
  requirePermission(db, actor, "accessreview.manage", HQ_ID);
  const item = one<{ review_id: string; assignment_id: string; decision: string | null; user_id: string; status: string }>(
    db,
    "SELECT i.*, a.user_id, r.status FROM access_review_items i JOIN role_assignments a ON a.id = i.assignment_id JOIN access_reviews r ON r.id = i.review_id WHERE i.id = ?",
    itemId,
  );
  if (!item) throw notFound();
  if (item.status !== "OPEN") throw conflict("This review is closed.");
  if (item.user_id === actor.userId) throw forbidden("You cannot certify your own access.");
  if (decision === "REVOKE" && note.trim().length < 5) throw invalid("Give a reason for revocation.");
  tx(db, () => {
    const t = nowIso();
    run(db, "UPDATE access_review_items SET decision = ?, decided_by = ?, decided_at = ?, note = ? WHERE id = ?", decision, actor.userId, t, note.trim() || null, itemId);
    if (decision === "REVOKE") {
      run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ? AND revoked_at IS NULL", t, actor.userId, `Access review: ${note.trim()}`, item.assignment_id);
      notify(db, item.user_id, "Access removed following review", "One of your role assignments was revoked during access recertification.", "/app/profile");
    }
    audit(db, { actorId: actor.userId, action: `iam.review.${decision.toLowerCase()}`, category: "IAM", entityType: "access_review", entityId: item.review_id, details: { assignment: item.assignment_id } });
    const open = one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM access_review_items WHERE review_id = ? AND decision IS NULL", item.review_id);
    if (open?.c === 0) {
      run(db, "UPDATE access_reviews SET status = 'COMPLETED', completed_at = ? WHERE id = ?", t, item.review_id);
      audit(db, { actorId: actor.userId, action: "iam.review.complete", category: "IAM", entityType: "access_review", entityId: item.review_id });
    }
  });
}
