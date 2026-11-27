/**
 * Module 02 — session management, authentication history and account activity (directive §6, Module 02).
 *
 * - An officer sees their own active sessions and sign-in history and can end any of their other sessions.
 * - Account administrators see the same for users in their scope (user.view, as on the account page); ending
 *   another user's session needs the account-support right (user.support), like "end all sessions".
 * Session identifiers are SHA-256 hashes of the tokens; a hash cannot be used to sign in. History comes from
 * the append-only audit trail (AUTH events and account changes), so it cannot be edited here.
 */
import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "./audit";
import { forbidden, notFound, notify, nowIso } from "./core";
import { userDetail, userInScope } from "./iam";
import { type Actor, hasPermission } from "./policy";

export interface SessionRow { id: string; short: string; created_at: string; last_seen_at: string; expires_at: string; role_context: string | null; current: boolean }
export interface ActivityRow { occurred_at: string; action: string; outcome: string; category: string; actor_name: string | null; summary: string }

export const tokenHash = (token: string | undefined) => (token ? crypto.createHash("sha256").update(token).digest("hex") : "");

const ACTION_LABEL: Record<string, string> = {
  "auth.signin": "Sign-in", "auth.account.locked": "Account locked after failed sign-ins", "auth.signout": "Sign-out", "auth.session.expired": "Session expired", "auth.password.change": "Password changed",
  "auth.context.switch": "Switched role context", "iam.user.provision": "Account created", "iam.grant.assign": "Role assigned", "iam.grant.revoke": "Role revoked",
  "iam.assignment.expired": "Role assignment expired", "iam.delegation.grant": "Delegation granted", "iam.delegation.revoke": "Delegation revoked",
  "iam.delegation.expired": "Delegation expired", "iam.user.password.issue": "Temporary password issued", "iam.user.unlock": "Account unlocked",
  "iam.sessions.end": "All sessions ended", "iam.session.end": "A session was ended", "iam.user.status": "Account status changed",
};

async function sessionsFor(db: DB, userId: string, currentHash: string): Promise<SessionRow[]> {
  const rows = await all<{ id: string; created_at: string; last_seen_at: string; expires_at: string; role_name: string | null; unit_name: string | null }>(db,
    `SELECT s.id, s.created_at, s.last_seen_at, s.expires_at, r.name AS role_name, o.name AS unit_name FROM sessions s
       LEFT JOIN role_assignments a ON a.id = s.active_assignment_id LEFT JOIN roles r ON r.code = a.role_code LEFT JOIN org_units o ON o.id = a.org_unit_id
      WHERE s.user_id = ? AND s.expires_at > ? ORDER BY s.last_seen_at DESC LIMIT 50`, userId, nowIso());
  return rows.map((r) => ({ id: r.id, short: r.id.slice(0, 8), created_at: r.created_at, last_seen_at: r.last_seen_at, expires_at: r.expires_at,
    role_context: r.role_name ? `${r.role_name}${r.unit_name ? ` · ${r.unit_name}` : ""}` : null, current: r.id === currentHash }));
}

async function historyFor(db: DB, userId: string): Promise<ActivityRow[]> {
  // Sign-in events are recorded under the account (some, such as lockouts, in the SECURITY category);
  // account changes are recorded with the account as their subject.
  const rows = await all<{ occurred_at: string; action: string; outcome: string; category: string; actor_name: string | null; details: string | null }>(db,
    `SELECT e.occurred_at, e.action, e.outcome, e.category, u.display_name AS actor_name, e.details FROM audit_events e LEFT JOIN users u ON u.id = e.actor_id
      WHERE (e.action LIKE 'auth.%' AND e.actor_id = ?)
         OR (e.category IN ('IAM','SECURITY') AND e.entity_type = 'user' AND e.entity_id = ?)
      ORDER BY e.occurred_at DESC LIMIT 100`, userId, userId);
  return rows.map((r) => {
    let reason = "";
    try { reason = (JSON.parse(r.details ?? "{}") as { reason?: string }).reason ?? ""; } catch { /* details are not always JSON */ }
    return { occurred_at: r.occurred_at, action: r.action, outcome: r.outcome, category: r.category, actor_name: r.actor_name,
      summary: `${ACTION_LABEL[r.action] ?? r.action}${r.outcome !== "SUCCESS" ? ` (${r.outcome.toLowerCase()}${reason ? `: ${reason.replace(/_/g, " ")}` : ""})` : ""}` };
  });
}

/** The actor's own sessions and history. */
export async function myAccountActivity(db: DB, actor: Actor, currentToken: string | undefined) {
  return { sessions: await sessionsFor(db, actor.userId, tokenHash(currentToken)), history: await historyFor(db, actor.userId) };
}

/** Another user's sessions and history, for account administrators in scope. */
export async function userAccountActivity(db: DB, actor: Actor, userId: string) {
  await userDetail(db, actor, userId); // enforces user.view and scope, audits denials
  return { sessions: await sessionsFor(db, userId, ""), history: await historyFor(db, userId) };
}

/** Ends one session: the owner may end their own other sessions; account support may end a user's session. */
export async function endSession(db: DB, actor: Actor, sessionId: string, currentToken: string | undefined) {
  const s = await one<{ id: string; user_id: string }>(db, "SELECT id, user_id FROM sessions WHERE id = ?", sessionId);
  if (!s) throw notFound();
  const own = s.user_id === actor.userId;
  if (own && s.id === tokenHash(currentToken)) throw forbidden("Use Sign out to end the session you are using.");
  if (!own && !(hasPermission(actor, "user.support") && await userInScope(db, actor, "user.support", s.user_id, "any"))) {
    await audit(db, { actorId: actor.userId, action: "iam.session.end", outcome: "DENIED", category: "SECURITY", entityType: "user", entityId: s.user_id });
    throw notFound();
  }
  await run(db, "DELETE FROM sessions WHERE id = ?", s.id);
  await audit(db, { actorId: actor.userId, action: "iam.session.end", category: "SECURITY", entityType: "user", entityId: s.user_id, details: { session: s.id.slice(0, 8), own } });
  if (!own) await notify(db, s.user_id, "One of your sessions was ended", "An account administrator signed one of your sessions out. Sign in again on that device to continue.", "/login", { category: "ACCOUNT" });
}
