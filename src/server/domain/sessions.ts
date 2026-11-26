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
  if (!token || token.length > 200) return null;
  const s = await one<{ id: string; user_id: string; expires_at: string; last_seen_at: string }>(db, "SELECT * FROM sessions WHERE id = ?", hash(token));
  if (!s) return null;
  const t = now().getTime();
  if (Date.parse(s.expires_at) < t || Date.parse(s.last_seen_at) + SESSION_IDLE_MINUTES * 60000 < t) {
    await run(db, "DELETE FROM sessions WHERE id = ?", s.id);
    await audit(db, { actorId: s.user_id, action: "auth.session.expired", category: "AUTH" });
    return null;
  }
  await run(db, "UPDATE sessions SET last_seen_at = ? WHERE id = ?", nowIso(), s.id);
  return s.user_id;
}

export async function destroySession(db: DB, token: string | undefined) {
  if (!token) return;
  const s = await one<{ user_id: string }>(db, "SELECT user_id FROM sessions WHERE id = ?", hash(token));
  await run(db, "DELETE FROM sessions WHERE id = ?", hash(token));
  if (s) await audit(db, { actorId: s.user_id, action: "auth.signout", category: "AUTH" });
}
