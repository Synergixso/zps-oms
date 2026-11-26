/**
 * Start-up bootstrap:
 *  1. apply pending migrations;
 *  2. synchronise the role catalogue (roles + role_permissions) from the enforced code catalogue;
 *  3. apply named SYNTHETIC seed steps that have not yet run (development databases only).
 * Seed steps only ADD synthetic data; existing records are never modified or removed. A database
 * holding any non-synthetic user is never seeded. A MySQL named lock serialises concurrent workers.
 */
import { all, createPool, one, run, tx, type DB } from "./connection";
import { migrate } from "./migrate";
import { seedDatabase } from "./seed";
import { seedPhase3 } from "./seed-phase3";
import { RETIRED_ROLE_CODES, ROLE_BY_CODE, ROLES, type RoleCode } from "../domain/catalogue";
import { seedThreeTier } from "./seed-three-tier";
import { REPORTS } from "../domain/reports";
import { assignMissingUserRefs } from "../domain/iam";

export const SEED_STEPS: Array<[name: string, fn: (db: DB) => Promise<void>]> = [
  ["001_base", seedDatabase],
  ["002_personnel_manpower", seedPhase3],
  ["003_three_tier_roles", seedThreeTier],
];

/** Upserts every catalogue role and rewrites its informational permission rows. */
export async function syncCatalogue(db: DB) {
  const now = new Date().toISOString();
  await tx(db, async (db) => {
    // The superseded 41-role catalogue: retained for assignment history, never active (DEC-049).
    for (const code of RETIRED_ROLE_CODES) {
      if (ROLE_BY_CODE[code as RoleCode]) continue;
      await run(db, "UPDATE roles SET status = 'RETIRED', tier = NULL, role_no = NULL, updated_at = ? WHERE code = ? AND status <> 'RETIRED'", now, code);
      await run(db, "DELETE FROM role_permissions WHERE role_code = ?", code);
    }
    for (const r of ROLES) {
      await run(db, `INSERT INTO roles (code, name, description, category, requires_expiry, tier, role_no, status, back_office, updated_at) VALUES (?,?,?,?,?,?,?, 'ACTIVE', ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), category = VALUES(category), requires_expiry = VALUES(requires_expiry),
                       tier = VALUES(tier), role_no = VALUES(role_no), status = 'ACTIVE', back_office = VALUES(back_office), updated_at = VALUES(updated_at)`,
        r.code, r.name, r.description, r.category, r.requiresExpiry ? 1 : 0, r.tier, r.no, r.backOffice, now);
      await run(db, "DELETE FROM role_permissions WHERE role_code = ?", r.code);
      for (const [perm, cov] of Object.entries(r.permissions)) await run(db, "INSERT INTO role_permissions (role_code, permission, coverage) VALUES (?,?,?)", r.code, perm, cov);
    }
    // Report definitions are code-defined too (exports reference them).
    for (const r of REPORTS) {
      await run(db, `INSERT INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?, 'report.view', ?, 'Report owner to be nominated by the Service (DEC-012).')
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), fields = VALUES(fields)`, r.code, r.name, r.description, JSON.stringify(r.fields));
    }
  });
}

/** Runs missing synthetic seed steps. Returns the names applied. */
export async function runSeedSteps(db: DB): Promise<string[]> {
  const users = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM users"))?.c ?? 0);
  const real = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM users WHERE synthetic = 0"))?.c ?? 0);
  if (real > 0) return [];
  const done = new Set((await all<{ name: string }>(db, "SELECT name FROM seed_steps")).map((r) => r.name));
  // A database seeded before seed steps existed already holds the base dataset.
  if (users > 0 && !done.has("001_base")) {
    await run(db, "INSERT INTO seed_steps (name, applied_at) VALUES ('001_base', ?)", new Date().toISOString());
    done.add("001_base");
  }
  const applied: string[] = [];
  for (const [name, fn] of SEED_STEPS) {
    if (done.has(name)) continue;
    await fn(db);
    await run(db, "INSERT INTO seed_steps (name, applied_at) VALUES (?, ?)", name, new Date().toISOString());
    applied.push(name);
  }
  if (applied.length) await assignMissingUserRefs(db);
  return applied;
}

/** Kept for callers that only need "seed an empty database". */
export async function seedIfEmpty(db: DB): Promise<boolean> {
  const n = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM users");
  if (Number(n?.c ?? 0) > 0) return false;
  await syncCatalogue(db);
  return (await runSeedSteps(db)).length > 0;
}

export async function bootstrap(url: string): Promise<{ applied: string[]; seeded: boolean; seedSteps: string[] }> {
  const { applied } = await migrate(url);
  const pool = createPool(url);
  const lock = await pool.getConnection();
  try {
    const got = await one<{ l: number }>(lock, "SELECT GET_LOCK('zps_oms_seed', 300) AS l");
    if (Number(got?.l) !== 1) throw new Error("Timed out waiting for the seed lock.");
    await syncCatalogue(pool);
    const seedSteps = await runSeedSteps(pool);
    await lock.query("SELECT RELEASE_LOCK('zps_oms_seed')");
    return { applied, seeded: seedSteps.length > 0, seedSteps };
  } finally {
    lock.release();
    await pool.end();
  }
}
