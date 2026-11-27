/**
 * First-account setup for a new, empty database (DEC-069).
 *
 * A production database starts with the reference baseline only (seed-baseline.ts): no accounts. The first
 * Superadmin is created once through /setup, which needs:
 *  - an empty users table (the page and this function refuse otherwise, forever after);
 *  - the one-time setup token from the server's environment (ZPS_SETUP_TOKEN, at least 24 characters),
 *    compared in constant time, so only whoever controls the server configuration can complete it.
 * The account receives a temporary password shown once and must change it at first sign-in. The Superadmin
 * holds technical administration only (no business authority); further accounts are provisioned normally.
 * A database lock serialises concurrent attempts.
 */
import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { hashPassword, temporaryPassword } from "./auth";
import { conflict, forbidden, newId, nowIso } from "./core";
import { assignMissingUserRefs } from "./iam";
import { HQ_ID } from "./policy";
import { identifierField } from "../lib/identifiers";
import { isProduction } from "../lib/environment";
import { z } from "zod";

export const setupSchema = z.object({
  token: z.string().min(1, "Enter the setup token."),
  username: identifierField("username"),
  displayName: z.string().trim().min(3, "Enter the full name.").max(120),
  positionTitle: z.string().trim().min(3, "Enter the position title.").max(120),
});

const tokenConfigured = () => (process.env.ZPS_SETUP_TOKEN ?? "").trim().length >= 24;

/** Whether first-account setup can be offered: no accounts exist and a setup token is configured. */
export async function setupState(db: DB): Promise<"AVAILABLE" | "NO_TOKEN" | "COMPLETED"> {
  const n = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM users"))?.n ?? 0);
  if (n > 0) return "COMPLETED";
  return tokenConfigured() ? "AVAILABLE" : "NO_TOKEN";
}

function tokenMatches(given: string) {
  const want = Buffer.from((process.env.ZPS_SETUP_TOKEN ?? "").trim());
  const got = Buffer.from(given.trim());
  return want.length >= 24 && got.length === want.length && crypto.timingSafeEqual(want, got);
}

export async function createFirstSuperadmin(db: DB, input: z.input<typeof setupSchema>): Promise<{ username: string; temporaryPassword: string }> {
  const d = setupSchema.parse(input);
  if (!tokenConfigured()) throw forbidden("Setup is not enabled on this server.");
  if (!tokenMatches(d.token)) {
    await audit(db, { actorId: null, action: "setup.first-admin", outcome: "DENIED", category: "SECURITY", details: { reason: "bad_token" } });
    throw forbidden("The setup token is not correct.");
  }
  if (!await one(db, "SELECT id FROM org_units WHERE id = ?", HQ_ID)) throw conflict("The Service Headquarters unit is missing: run the database migrations and reference baseline first.");
  // A named lock belongs to one connection: hold one dedicated connection for the lock and the work.
  const conn = "getConnection" in db ? await db.getConnection() : db;
  try {
  const lock = await one<{ l: number }>(conn, "SELECT GET_LOCK('zps_oms_setup', 5) AS l");
  if (Number(lock?.l) !== 1) throw conflict("Another setup attempt is in progress. Try again.");
  try {
    if (Number((await one<{ n: number }>(conn, "SELECT COUNT(*) AS n FROM users"))?.n ?? 0) > 0) throw conflict("Setup has already been completed. Sign in instead.");
    const id = newId("usr");
    const pw = temporaryPassword();
    const t = nowIso();
    await tx(conn, async (db) => {
      await run(db, `INSERT INTO users (id, username, display_name, position_title, status, password_hash, password_changed_at, must_change_password, synthetic, created_at)
                     VALUES (?,?,?,?, 'ACTIVE', ?, ?, 1, ?, ?)`, id, d.username, d.displayName, d.positionTitle, await hashPassword(pw), t, isProduction() ? 0 : 1, t);
      await run(db, `INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, granted_by, created_at)
                     VALUES (?,?, 'SUPERADMIN', ?, ?, ?, NULL, ?)`, newId("asg"), id, HQ_ID, t, "First account created through one-time setup (ZPS_SETUP_TOKEN).", t);
      await assignMissingUserRefs(db);
      await audit(db, { actorId: null, action: "setup.first-admin", category: "IAM", entityType: "user", entityId: id, details: { username: d.username } });
    });
    return { username: d.username, temporaryPassword: pw };
  } finally {
    await run(conn, "SELECT RELEASE_LOCK('zps_oms_setup')");
  }
  } finally {
    if ("release" in conn && conn !== db) conn.release();
  }
}
