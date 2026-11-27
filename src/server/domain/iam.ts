/**
 * M02 — Identity, Roles and Access Management.
 * - No self-registration and no self-service elevation: an administrator can
 *   never change their own assignments, delegations or account status.
 * - Role assignment = role + org unit + validity window + justification.
 * - Auditor (and other requiresExpiry) roles must be time-limited.
 */
import type { Page, Paging, Query } from "./paging";
import { identifierField } from "../lib/identifiers";
import { isProduction } from "../lib/environment";
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { ROLE_BY_CODE, type RoleCode } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso } from "./core";
import { type Actor, HQ_ID, requirePermission, scopeFor } from "./policy";
import type { Permission } from "./catalogue";

/**
 * Scoped technical administration (27-role directive, roles 06/07/18/24).
 * A user is within an administrator's scope for `perm` when:
 *  - mode "any": at least one of the user's active assignments lies inside the scope (viewing);
 *  - mode "all": EVERY active assignment lies inside it, and (for non-national administrators) the user holds
 *    no technical role — local administrators escalate other administrators' accounts to HQ Tech (support).
 * National scope covers every user. Users without active assignments are national-only.
 */
export async function userInScope(db: DB, actor: Actor, perm: Permission, userId: string, mode: "any" | "all"): Promise<boolean> {
  const s = scopeFor(actor, perm);
  if (s.national) return true;
  if (!s.units.length) return false;
  const t = nowIso();
  const rows = await all<{ org_unit_id: string; role_code: string }>(db,
    "SELECT org_unit_id, role_code FROM role_assignments WHERE user_id = ? AND revoked_at IS NULL AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)", userId, t, t);
  const live = rows.filter((r) => ROLE_BY_CODE[r.role_code as RoleCode]);
  if (!live.length) return false;
  if (mode === "any") return live.some((r) => s.units.includes(r.org_unit_id));
  return live.every((r) => s.units.includes(r.org_unit_id) && ROLE_BY_CODE[r.role_code as RoleCode].category !== "TECHNICAL");
}

async function requireSupport(db: DB, actor: Actor, userId: string) {
  await requirePermission(db, actor, "user.support", undefined, { type: "user", id: userId });
  if (!await userInScope(db, actor, "user.support", userId, "all")) {
    await audit(db, { actorId: actor.userId, action: "authz.denied:user.support", outcome: "DENIED", category: "SECURITY", entityType: "user", entityId: userId, details: { reason: "outside technical-support scope" } });
    throw notFound();
  }
}
import { hashPassword, temporaryPassword } from "./auth";

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

function userQuery(actor: Actor, q?: string): Query {
  const t = nowIso();
  const s = scopeFor(actor, "user.view");
  const where: string[] = [];
  const params: unknown[] = [t];
  if (q) { where.push("(u.display_name LIKE ? OR u.username LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  if (!s.national) {
    where.push(`EXISTS (SELECT 1 FROM role_assignments x WHERE x.user_id = u.id AND x.revoked_at IS NULL AND (x.valid_to IS NULL OR x.valid_to > ?) AND x.org_unit_id IN (${s.units.map(() => "?").join(",")}))`);
    params.push(t, ...s.units);
  }
  // The first parameter belongs to the active_roles subquery in the column list.
  return { columns: "u.*, (SELECT COUNT(*) FROM role_assignments a WHERE a.user_id = u.id AND a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?)) AS active_roles",
    from: "FROM users u", where: where.length ? where.join(" AND ") : "1=1", params, order: "u.display_name" };
}

/** Every user in scope (used by panels that need the complete set). */
export async function listUsers(db: DB, actor: Actor, q?: string): Promise<UserRow[]> {
  await requirePermission(db, actor, "user.view");
  const u = userQuery(actor, q);
  return await all<UserRow>(db, `SELECT ${u.columns} ${u.from} WHERE ${u.where} ORDER BY ${u.order}`, ...u.params);
}
export async function pageUsers(db: DB, actor: Actor, q: string | undefined, p: Paging = {}): Promise<Page<UserRow>> {
  await requirePermission(db, actor, "user.view");
  const u = userQuery(actor, q);
  // COUNT does not include the column-list subquery, so drop its parameter for the count.
  const total = Number((await one<{ n: number }>(db, `SELECT COUNT(*) AS n ${u.from} WHERE ${u.where}`, ...u.params.slice(1)))?.n ?? 0);
  const pageSize = Math.min(200, Math.max(5, Math.floor(Number(p.pageSize) || 50)));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(p.page) || 1)));
  const rows = await all<UserRow>(db, `SELECT ${u.columns} ${u.from} WHERE ${u.where} ORDER BY ${u.order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, ...u.params);
  return { rows, total, page, pages, pageSize };
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

export async function userDetail(db: DB, actor: Actor, userId: string) {
  await requirePermission(db, actor, "user.view");
  if (!await userInScope(db, actor, "user.view", userId, "any")) {
    await audit(db, { actorId: actor.userId, action: "iam.user.view", outcome: "DENIED", category: "SECURITY", entityType: "user", entityId: userId });
    throw notFound();
  }
  const user = await one<UserRow & { locked_until: string | null; must_change_password: number; last_login_at: string | null; has_password: number; failed_logins: number }>(db,
    "SELECT id, username, display_name, position_title, status, status_reason, created_at, 0 AS active_roles, locked_until, must_change_password, last_login_at, failed_logins, (password_hash IS NOT NULL) AS has_password FROM users WHERE id = ?", userId);
  if (!user) throw notFound();
  const assignments = await all<AssignmentRow>(
    db,
    `SELECT a.*, o.name AS org_name, g.display_name AS granted_by_name FROM role_assignments a
       JOIN org_units o ON o.id = a.org_unit_id LEFT JOIN users g ON g.id = a.granted_by WHERE a.user_id = ? ORDER BY a.created_at DESC`,
    userId,
  );
  const delegations = await all<{ id: string; domain: string; category_code: string | null; org_name: string; valid_from: string; valid_to: string | null; approval_ref: string; revoked_at: string | null }>(
    db,
    "SELECT d.*, o.name AS org_name FROM delegations d JOIN org_units o ON o.id = d.org_unit_id WHERE d.user_id = ? ORDER BY d.created_at DESC",
    userId,
  );
  return { user, assignments, delegations };
}

export const provisionSchema = z.object({
  username: identifierField("username"),
  displayName: z.string().trim().min(3).max(80).refine((v) => /synthetic|demo/i.test(v), "Display names must be clearly synthetic (include 'Demo' or 'Synthetic')."),
  positionTitle: z.string().trim().min(3).max(80),
});

export async function provisionUser(db: DB, actor: Actor, input: z.input<typeof provisionSchema>) {
  await requirePermission(db, actor, "user.provision", HQ_ID);
  const d = provisionSchema.parse(input);
  if (await one(db, "SELECT id FROM users WHERE username = ?", d.username)) throw conflict("Username already exists. Shared or duplicate accounts are not permitted.");
  const id = newId("usr");
  await tx(db, async (db) => {
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, synthetic, created_at) VALUES (?,?,?,?, 'ACTIVE', ?, ?)", id, d.username, d.displayName, d.positionTitle, isProduction() ? 0 : 1, nowIso());
    await assignMissingUserRefs(db);
    await audit(db, { actorId: actor.userId, action: "iam.user.provision", category: "IAM", entityType: "user", entityId: id, details: { username: d.username } });
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

export async function assignRole(db: DB, actor: Actor, input: z.input<typeof assignSchema>) {
  await requirePermission(db, actor, "grant.assign", HQ_ID);
  const d = assignSchema.parse(input);
  if (d.userId === actor.userId) {
    await audit(db, { actorId: actor.userId, action: "iam.grant.assign", outcome: "DENIED", category: "SECURITY", entityType: "user", entityId: d.userId, details: { reason: "self_elevation" } });
    throw forbidden("You cannot change your own access. Another authorised administrator must do this.");
  }
  const role = ROLE_BY_CODE[d.roleCode as RoleCode];
  if (!role) throw invalid("Unknown role.");
  const org = await one<{ unit_type: string; status: string }>(db, "SELECT unit_type, status FROM org_units WHERE id = ?", d.orgUnitId);
  if (!org || org.status !== "ACTIVE") throw invalid("Organisation must be active.");
  if (!role.assignableTo.includes(org.unit_type as never)) throw invalid(`${role.name} cannot be assigned at this organisation type.`);
  const user = await one<{ status: string }>(db, "SELECT status FROM users WHERE id = ?", d.userId);
  if (!user || user.status !== "ACTIVE") throw invalid("Access can only be granted to an active account.");
  const t = nowIso();
  if (role.requiresExpiry) {
    if (!d.validTo) throw invalid(`${role.name} access must be time-limited: set an expiry date.`);
    const maxDays = 180;
    if (new Date(d.validTo).getTime() - Date.parse(t) > maxDays * 86400000) throw invalid(`${role.name} grants are limited to ${maxDays} days.`);
  }
  if (d.validTo && d.validTo <= t.slice(0, 10)) throw invalid("Expiry date must be in the future.");
  const dup = await one(db, "SELECT id FROM role_assignments WHERE user_id = ? AND role_code = ? AND org_unit_id = ? AND revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", d.userId, d.roleCode, d.orgUnitId, t);
  if (dup) throw conflict("The user already holds this role for this organisation.");
  const id = newId("asg");
  await tx(db, async (db) => {
    await run(db, `INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, valid_to, justification, granted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, d.userId, d.roleCode, d.orgUnitId, t, d.validTo ? `${d.validTo}T23:59:59.000Z` : null, d.justification, actor.userId, t);
    await audit(db, { actorId: actor.userId, action: "iam.grant.assign", category: "IAM", entityType: "user", entityId: d.userId, orgUnitId: d.orgUnitId, details: { role: d.roleCode, validTo: d.validTo || null, privileged: ["PLATFORM_ADMIN", "SECURITY_ADMIN", "INTERNAL_AUDITOR"].includes(d.roleCode) } });
    await notify(db, d.userId, "Access granted", `${role.name} access has been assigned to your account.`, "/app/profile");
  });
  return id;
}

export async function revokeAssignment(db: DB, actor: Actor, assignmentId: string, reason: string) {
  await requirePermission(db, actor, "grant.revoke", HQ_ID);
  const a = await one<{ user_id: string; role_code: string; org_unit_id: string; revoked_at: string | null }>(db, "SELECT * FROM role_assignments WHERE id = ?", assignmentId);
  if (!a) throw notFound();
  if (a.user_id === actor.userId) throw forbidden("You cannot change your own access.");
  if (a.revoked_at) throw conflict("Assignment already revoked.");
  if (reason.trim().length < 5) throw invalid("A revocation reason is required.");
  await tx(db, async (db) => {
    await run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ?", nowIso(), actor.userId, reason.trim(), assignmentId);
    await audit(db, { actorId: actor.userId, action: "iam.grant.revoke", category: "IAM", entityType: "user", entityId: a.user_id, orgUnitId: a.org_unit_id, details: { role: a.role_code, reason } });
  });
}

export const delegationSchema = z.object({
  userId: z.string().min(1),
  orgUnitId: z.string().min(1),
  domain: z.enum(["ADMIN_REQUEST", "MAINTENANCE", "ORG_CHANGE", "MANPOWER", "ASSIGNMENT", "STORES"]),
  categoryCode: z.string().optional().or(z.literal("")),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  approvalRef: z.string().trim().min(5, "Record the reference of the approved delegation instrument."),
});

export async function grantDelegation(db: DB, actor: Actor, input: z.input<typeof delegationSchema>) {
  await requirePermission(db, actor, "delegation.grant", HQ_ID);
  const d = delegationSchema.parse(input);
  if (d.userId === actor.userId) throw forbidden("You cannot delegate approval authority to yourself.");
  const t = nowIso();
  const business = (await all<{ role_code: RoleCode }>(db, "SELECT role_code FROM role_assignments WHERE user_id = ? AND org_unit_id = ? AND revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", d.userId, d.orgUnitId, t))
    .some((a) => ROLE_BY_CODE[a.role_code]?.category === "BUSINESS");
  if (!business) throw invalid("Delegations can only be recorded for a user holding an active business role at the same organisation.");
  if (d.domain === "ORG_CHANGE" && d.orgUnitId !== HQ_ID) throw invalid("Organisational-change approval can only be delegated at Service Headquarters.");
  const id = newId("dlg");
  await tx(db, async (db) => {
    await run(db, "INSERT INTO delegations (id, user_id, org_unit_id, domain, category_code, valid_from, valid_to, approval_ref, granted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      id, d.userId, d.orgUnitId, d.domain, d.categoryCode || null, t, d.validTo ? `${d.validTo}T23:59:59.000Z` : null, d.approvalRef, actor.userId, t);
    await audit(db, { actorId: actor.userId, action: "iam.delegation.grant", category: "IAM", entityType: "user", entityId: d.userId, orgUnitId: d.orgUnitId, details: { domain: d.domain, category: d.categoryCode || "ALL", approvalRef: d.approvalRef } });
  });
  return id;
}

export async function revokeDelegation(db: DB, actor: Actor, delegationId: string) {
  await requirePermission(db, actor, "delegation.revoke", HQ_ID);
  const d = await one<{ user_id: string; revoked_at: string | null; org_unit_id: string }>(db, "SELECT * FROM delegations WHERE id = ?", delegationId);
  if (!d) throw notFound();
  if (d.user_id === actor.userId) throw forbidden("You cannot change your own delegations.");
  if (d.revoked_at) throw conflict("Delegation already revoked.");
  await tx(db, async (db) => {
    await run(db, "UPDATE delegations SET revoked_at = ?, revoked_by = ? WHERE id = ?", nowIso(), actor.userId, delegationId);
    await audit(db, { actorId: actor.userId, action: "iam.delegation.revoke", category: "IAM", entityType: "user", entityId: d.user_id, orgUnitId: d.org_unit_id });
  });
}

export async function setUserStatus(db: DB, actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED", reason: string) {
  if (status === "DEACTIVATED") await requirePermission(db, actor, "user.deactivate", HQ_ID);
  else await requirePermission(db, actor, "user.suspend", HQ_ID);
  if (userId === actor.userId) throw forbidden("You cannot change the status of your own account.");
  const u = await one<{ status: string }>(db, "SELECT status FROM users WHERE id = ?", userId);
  if (!u) throw notFound();
  if (u.status === "DEACTIVATED") throw conflict("Deactivated accounts cannot be reactivated; provision a new account through the approved process.");
  if (reason.trim().length < 5) throw invalid("A reason is required.");
  await tx(db, async (db) => {
    await run(db, "UPDATE users SET status = ?, status_reason = ? WHERE id = ?", status, reason.trim(), userId);
    if (status !== "ACTIVE") await run(db, "DELETE FROM sessions WHERE user_id = ?", userId); // immediate sign-out
    if (status === "DEACTIVATED") {
      await run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = 'Account deactivated' WHERE user_id = ? AND revoked_at IS NULL", nowIso(), actor.userId, userId);
      await run(db, "UPDATE delegations SET revoked_at = ?, revoked_by = ? WHERE user_id = ? AND revoked_at IS NULL", nowIso(), actor.userId, userId);
    }
    await audit(db, { actorId: actor.userId, action: `iam.user.${status.toLowerCase()}`, category: "IAM", entityType: "user", entityId: userId, details: { from: u.status, to: status, reason } });
  });
}

// ---- Access recertification ------------------------------------------------

export async function listReviews(db: DB, actor: Actor) {
  await requirePermission(db, actor, "accessreview.manage", HQ_ID);
  return await all<{ id: string; reference: string; title: string; status: string; created_at: string; completed_at: string | null; total: number; decided: number }>(
    db,
    `SELECT r.*, (SELECT COUNT(*) FROM access_review_items i WHERE i.review_id = r.id) AS total,
            (SELECT COUNT(*) FROM access_review_items i WHERE i.review_id = r.id AND i.decision IS NOT NULL) AS decided
       FROM access_reviews r ORDER BY r.created_at DESC`,
  );
}

export async function openReview(db: DB, actor: Actor, title: string) {
  await requirePermission(db, actor, "accessreview.manage", HQ_ID);
  if (title.trim().length < 5) throw invalid("Give the review a title.");
  const id = newId("arv");
  await tx(db, async (db) => {
    const t = nowIso();
    const ref = await nextReference(db, "ARV", "access_reviews");
    await run(db, "INSERT INTO access_reviews (id, reference, title, status, opened_by, created_at) VALUES (?,?,?, 'OPEN', ?, ?)", id, ref, title.trim(), actor.userId, t);
    const active = await all<{ id: string; user_id: string }>(db, "SELECT id, user_id FROM role_assignments WHERE revoked_at IS NULL AND (valid_to IS NULL OR valid_to > ?)", t);
    for (const a of active) {
      if (a.user_id === actor.userId) continue; // reviewers do not certify their own access
      await run(db, "INSERT INTO access_review_items (id, review_id, assignment_id) VALUES (?,?,?)", newId("ari"), id, a.id);
    }
    await audit(db, { actorId: actor.userId, action: "iam.review.open", category: "IAM", entityType: "access_review", entityId: id, details: { reference: ref, items: active.length } });
  });
  return id;
}

export async function reviewItems(db: DB, actor: Actor, reviewId: string) {
  await requirePermission(db, actor, "accessreview.manage", HQ_ID);
  const review = await one<{ id: string; reference: string; title: string; status: string }>(db, "SELECT * FROM access_reviews WHERE id = ?", reviewId);
  if (!review) throw notFound();
  const items = await all<{ id: string; decision: string | null; note: string | null; role_code: RoleCode; org_name: string; user_name: string; user_id: string; valid_to: string | null; justification: string }>(
    db,
    `SELECT i.id, i.decision, i.note, a.role_code, o.name AS org_name, u.display_name AS user_name, u.id AS user_id, a.valid_to, a.justification
       FROM access_review_items i JOIN role_assignments a ON a.id = i.assignment_id JOIN org_units o ON o.id = a.org_unit_id JOIN users u ON u.id = a.user_id
      WHERE i.review_id = ? ORDER BY u.display_name`,
    reviewId,
  );
  return { review, items };
}

export async function decideReviewItem(db: DB, actor: Actor, itemId: string, decision: "RETAIN" | "REVOKE", note: string) {
  await requirePermission(db, actor, "accessreview.manage", HQ_ID);
  const item = await one<{ review_id: string; assignment_id: string; decision: string | null; user_id: string; status: string }>(
    db,
    "SELECT i.*, a.user_id, r.status FROM access_review_items i JOIN role_assignments a ON a.id = i.assignment_id JOIN access_reviews r ON r.id = i.review_id WHERE i.id = ?",
    itemId,
  );
  if (!item) throw notFound();
  if (item.status !== "OPEN") throw conflict("This review is closed.");
  if (item.user_id === actor.userId) throw forbidden("You cannot certify your own access.");
  if (decision === "REVOKE" && note.trim().length < 5) throw invalid("Give a reason for revocation.");
  await tx(db, async (db) => {
    const t = nowIso();
    await run(db, "UPDATE access_review_items SET decision = ?, decided_by = ?, decided_at = ?, note = ? WHERE id = ?", decision, actor.userId, t, note.trim() || null, itemId);
    if (decision === "REVOKE") {
      await run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ? AND revoked_at IS NULL", t, actor.userId, `Access review: ${note.trim()}`, item.assignment_id);
      await notify(db, item.user_id, "Access removed following review", "One of your role assignments was revoked during access recertification.", "/app/profile");
    }
    await audit(db, { actorId: actor.userId, action: `iam.review.${decision.toLowerCase()}`, category: "IAM", entityType: "access_review", entityId: item.review_id, details: { assignment: item.assignment_id } });
    const open = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM access_review_items WHERE review_id = ? AND decision IS NULL", item.review_id);
    if (open?.c === 0) {
      await run(db, "UPDATE access_reviews SET status = 'COMPLETED', completed_at = ? WHERE id = ?", t, item.review_id);
      await audit(db, { actorId: actor.userId, action: "iam.review.complete", category: "IAM", entityType: "access_review", entityId: item.review_id });
    }
  });
}

/**
 * Issues a one-time temporary password (shown once to the administrator, never stored in clear).
 * The holder must change it at next sign-in. Existing sessions end and any lockout is cleared.
 */
/** Gives every user without one a sequential USR-###### reference. */
export async function assignMissingUserRefs(db: DB) {
  const max = await one<{ m: string | null }>(db, "SELECT MAX(user_ref) AS m FROM users");
  let n = max?.m ? Number(max.m.slice(4)) : 0;
  for (const u of await all<{ id: string }>(db, "SELECT id FROM users WHERE user_ref IS NULL ORDER BY created_at, id")) {
    await run(db, "UPDATE users SET user_ref = ? WHERE id = ?", `USR-${String(++n).padStart(6, "0")}`, u.id);
  }
}

export async function issueTemporaryPassword(db: DB, actor: Actor, userId: string): Promise<string> {
  await requireSupport(db, actor, userId);
  if (userId === actor.userId) throw forbidden("Use the change-password form on your profile for your own account.");
  const u = await one<{ status: string }>(db, "SELECT status FROM users WHERE id = ?", userId);
  if (!u) throw notFound();
  if (u.status !== "ACTIVE") throw conflict("Temporary passwords can only be issued to active accounts.");
  const pw = temporaryPassword();
  await tx(db, async (db) => {
    await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL WHERE id = ?", await hashPassword(pw), nowIso(), userId);
    await run(db, "DELETE FROM sessions WHERE user_id = ?", userId);
    await audit(db, { actorId: actor.userId, action: "iam.user.password.issue", category: "SECURITY", entityType: "user", entityId: userId });
  });
  return pw;
}

/** Clears a sign-in lockout before it expires (security administration). */
export async function unlockAccount(db: DB, actor: Actor, userId: string) {
  await requireSupport(db, actor, userId);
  const u = await one<{ locked_until: string | null }>(db, "SELECT locked_until FROM users WHERE id = ?", userId);
  if (!u) throw notFound();
  await run(db, "UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", userId);
  await audit(db, { actorId: actor.userId, action: "iam.user.unlock", category: "SECURITY", entityType: "user", entityId: userId });
}

/** Ends every active session of a user (security administration; e.g. suspected compromise). */
export async function endUserSessions(db: DB, actor: Actor, userId: string) {
  await requireSupport(db, actor, userId);
  if (userId === actor.userId) throw forbidden("Use Sign out to end your own session.");
  const n = await run(db, "DELETE FROM sessions WHERE user_id = ?", userId);
  await audit(db, { actorId: actor.userId, action: "iam.sessions.end", category: "SECURITY", entityType: "user", entityId: userId, details: { sessions: n.changes } });
  await notify(db, userId, "Your sessions were ended", "A security administrator signed you out of all devices. Sign in again to continue.", "/login", { category: "ACCOUNT" });
  return n.changes;
}
