/**
 * Password authentication (Phase 3 §2.8).
 *
 * - scrypt (Node built-in) with a per-user 16-byte salt; format `scrypt$N$r$p$salt$hash` (base64url).
 * - Constant-time comparison; a dummy hash is checked for unknown accounts so timing does not
 *   reveal whether a username exists. Messages never distinguish "unknown user" from "wrong password".
 * - Account lockout: LOCKOUT_THRESHOLD consecutive failures lock the account for LOCKOUT_MINUTES.
 * - Client throttling: more than CLIENT_LIMIT failures from one client key in CLIENT_WINDOW_MINUTES are refused.
 * - Every attempt is written to login_attempts and to the audit trail (passwords are never logged).
 */
import crypto from "node:crypto";
import { promisify } from "node:util";
import type { DB } from "../db/connection";
import { one, run } from "../db/connection";
import { audit } from "./audit";
import { DomainError, invalid, now, nowIso } from "./core";
import type { Actor } from "./policy";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MINUTES = 15;
export const CLIENT_LIMIT = 20;
export const CLIENT_WINDOW_MINUTES = 15;
export const PASSWORD_MIN_LENGTH = 12;

const N = 16384, R = 8, PAR = 1, KEYLEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: PAR, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${PAR}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? DUMMY).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(key, expected) && stored != null;
}
// A valid-format hash of a random value, used to equalise timing for unknown accounts.
const DUMMY = `scrypt$${N}$${R}$${PAR}$${crypto.randomBytes(16).toString("base64url")}$${crypto.randomBytes(KEYLEN).toString("base64url")}`;

/** Password policy: length, mixed character classes, not the username. Returns a user-safe message or null. */
export function passwordProblem(password: string, username?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 128) return "Use at most 128 characters.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return "Use at least three of: lower-case letters, upper-case letters, digits and symbols.";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "The password must not contain the username.";
  return null;
}

export const clientKey = (raw: string) => crypto.createHash("sha256").update(raw || "unknown").digest("hex");

export type AuthResult = { ok: true; userId: string; mustChangePassword: boolean } | { ok: false; reason: "invalid" | "locked" | "throttled" | "inactive" };

export async function authenticate(db: DB, usernameRaw: string, password: string, client: string): Promise<AuthResult> {
  const username = usernameRaw.trim().toLowerCase().slice(0, 80);
  const t = now();
  const since = new Date(t.getTime() - CLIENT_WINDOW_MINUTES * 60000).toISOString();
  const record = async (ok: boolean) =>
    run(db, "INSERT INTO login_attempts (username, client_key, succeeded, created_at) VALUES (?,?,?,?)", username, client, ok ? 1 : 0, t.toISOString());

  const recent = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM login_attempts WHERE client_key = ? AND succeeded = 0 AND created_at > ?", client, since);
  if (Number(recent?.c ?? 0) >= CLIENT_LIMIT) {
    await record(false);
    await audit(db, { actorId: null, action: "auth.signin", outcome: "DENIED", category: "SECURITY", details: { reason: "client_throttled", username } });
    return { ok: false, reason: "throttled" };
  }

  const user = await one<{ id: string; status: string; password_hash: string | null; failed_logins: number; locked_until: string | null; must_change_password: number }>(
    db, "SELECT id, status, password_hash, failed_logins, locked_until, must_change_password FROM users WHERE username = ?", username);
  const good = await verifyPassword(password, user?.password_hash);

  if (user?.locked_until && Date.parse(user.locked_until) > t.getTime()) {
    await record(false);
    await audit(db, { actorId: user.id, action: "auth.signin", outcome: "DENIED", category: "SECURITY", details: { reason: "account_locked" } });
    return { ok: false, reason: "locked" };
  }
  if (!user || !good) {
    await record(false);
    if (user) {
      const failures = (user.locked_until ? 0 : user.failed_logins) + 1;
      const lock = failures >= LOCKOUT_THRESHOLD ? new Date(t.getTime() + LOCKOUT_MINUTES * 60000).toISOString() : null;
      await run(db, "UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?", lock ? 0 : failures, lock, user.id);
      await audit(db, { actorId: user.id, action: lock ? "auth.account.locked" : "auth.signin", outcome: "DENIED", category: lock ? "SECURITY" : "AUTH", details: { reason: "bad_password", failures } });
      if (lock) return { ok: false, reason: "locked" };
    } else {
      await audit(db, { actorId: null, action: "auth.signin", outcome: "DENIED", category: "AUTH", details: { reason: "unknown_account", username } });
    }
    return { ok: false, reason: "invalid" };
  }
  if (user.status !== "ACTIVE") {
    await record(false);
    await audit(db, { actorId: user.id, action: "auth.signin", outcome: "DENIED", category: "AUTH", details: { reason: "account_not_active" } });
    return { ok: false, reason: "inactive" };
  }
  await record(true);
  await run(db, "UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?", t.toISOString(), user.id);
  await audit(db, { actorId: user.id, action: "auth.signin", category: "AUTH", details: { method: "password" } });
  return { ok: true, userId: user.id, mustChangePassword: user.must_change_password === 1 };
}

/** Self-service password change; requires the current password. */
export async function changePassword(db: DB, actor: Actor, current: string, next: string) {
  const u = await one<{ username: string; password_hash: string | null }>(db, "SELECT username, password_hash FROM users WHERE id = ?", actor.userId);
  if (!u || !(await verifyPassword(current, u.password_hash))) {
    await audit(db, { actorId: actor.userId, action: "auth.password.change", outcome: "DENIED", category: "SECURITY", details: { reason: "bad_current_password" } });
    throw new DomainError("INVALID", "The current password is not correct.");
  }
  const problem = passwordProblem(next, u.username);
  if (problem) throw invalid(problem);
  if (await verifyPassword(next, u.password_hash)) throw invalid("Choose a password different from the current one.");
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ?, must_change_password = 0 WHERE id = ?", await hashPassword(next), nowIso(), actor.userId);
  await audit(db, { actorId: actor.userId, action: "auth.password.change", category: "SECURITY" });
}

/** Generates a random temporary password that satisfies the policy (shown once to the provisioning administrator). */
export function temporaryPassword(): string {
  const raw = crypto.randomBytes(12).toString("base64url").replace(/[-_]/g, "x");
  return `Tmp-${raw.slice(0, 4)}${raw.slice(4, 8).toUpperCase()}${raw.slice(8)}7!`;
}
