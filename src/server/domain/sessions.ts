import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { one, run } from "../db/connection";
import { audit } from "./audit";
import { now, nowIso } from "./core";

export const SESSION_IDLE_MINUTES = 30;
export const SESSION_ABSOLUTE_HOURS = 8;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Creates a session; only the SHA-256 of the token is stored server-side. */
export async function createSession(db: DB, userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const t = now();
  await run(db, "INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)",
    hash(token), userId, t.toISOString(), new Date(t.getTime() + SESSION_ABSOLUTE_HOURS * 3600000).toISOString(), t.toISOString());
  return token;
}

/** Returns the user id for a valid, unexpired, non-idle session, refreshing last-seen. */
export async function resolveSession(db: DB, token: string | undefined): Promise<string | null> {
  return (await resolveSessionContext(db, token))?.userId ?? null;
}

/** As resolveSession, plus the organisational context (role assignment) the session has selected. */
export async function resolveSessionContext(db: DB, token: string | undefined): Promise<{ userId: string; activeAssignmentId: string | null } | null> {
  if (!token || token.length > 200) return null;
  const s = await one<{ id: string; user_id: string; expires_at: string; last_seen_at: string; active_assignment_id: string | null }>(db, "SELECT * FROM sessions WHERE id = ?", hash(token));
  if (!s) return null;
  const t = now().getTime();
  if (Date.parse(s.expires_at) < t || Date.parse(s.last_seen_at) + SESSION_IDLE_MINUTES * 60000 < t) {
    await run(db, "DELETE FROM sessions WHERE id = ?", s.id);
    await audit(db, { actorId: s.user_id, action: "auth.session.expired", category: "AUTH" });
    return null;
  }
  await run(db, "UPDATE sessions SET last_seen_at = ? WHERE id = ?", nowIso(), s.id);
  return { userId: s.user_id, activeAssignmentId: s.active_assignment_id };
}

/**
 * Switches the session to one of the user's own valid assignments. The id from the browser is only a
 * selector: it must be an active, unexpired, unrevoked assignment of THIS user, otherwise it is refused.
 */
export async function setSessionContext(db: DB, token: string | undefined, assignmentId: string): Promise<boolean> {
  const ctx = await resolveSessionContext(db, token);
  if (!ctx || !token) return false;
  const t = nowIso();
  const ok = await one(db, `SELECT a.id FROM role_assignments a JOIN roles r ON r.code = a.role_code JOIN org_units o ON o.id = a.org_unit_id
     WHERE a.id = ? AND a.user_id = ? AND a.revoked_at IS NULL AND a.valid_from <= ? AND (a.valid_to IS NULL OR a.valid_to > ?) AND r.status = 'ACTIVE' AND o.status = 'ACTIVE'`,
    assignmentId, ctx.userId, t, t);
  if (!ok) {
    await audit(db, { actorId: ctx.userId, action: "auth.context.switch", outcome: "DENIED", category: "SECURITY", entityType: "role_assignment", entityId: assignmentId.slice(0, 40) });
    return false;
  }
  await run(db, "UPDATE sessions SET active_assignment_id = ? WHERE id = ?", assignmentId, hash(token));
  await audit(db, { actorId: ctx.userId, action: "auth.context.switch", category: "AUTH", entityType: "role_assignment", entityId: assignmentId });
  return true;
}

export async function destroySession(db: DB, token: string | undefined) {
  if (!token) return;
  const s = await one<{ user_id: string }>(db, "SELECT user_id FROM sessions WHERE id = ?", hash(token));
  await run(db, "DELETE FROM sessions WHERE id = ?", hash(token));
  if (s) await audit(db, { actorId: s.user_id, action: "auth.signout", category: "AUTH" });
}
