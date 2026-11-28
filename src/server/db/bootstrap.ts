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
import { seedAdminRecords } from "./seed-admin-records";
import { seedReferenceBaseline } from "./seed-baseline";
import { isProduction } from "../lib/environment";
import { ROLES } from "../domain/catalogue";
import { audit } from "../domain/audit";
import { seedThreeTier } from "./seed-three-tier";
import { seedLiaison } from "./seed-liaison";
import { seedCommand } from "./seed-command";
import { seedCompanyRoute, seedKmu, seedKmuCorrections } from "./seed-kmu";
import { seedPortfolios } from "./seed-portfolios";
import { REPORTS } from "../domain/reports";
import { assignMissingUserRefs } from "../domain/iam";

export const SEED_STEPS: Array<[name: string, fn: (db: DB) => Promise<void>]> = [
  ["001_base", seedDatabase],
  ["002_personnel_manpower", seedPhase3],
  ["003_three_tier_roles", seedThreeTier],
  ["012_calendar_correspondence", seedAdminRecords],
  ["013_liaison_roles", seedLiaison],
  ["014_command_structure", seedCommand],
  ["016_kmu_establishment", seedKmu],
  ["017_kmu_corrections", seedKmuCorrections],
  ["018_company_commander_route", seedCompanyRoute],
  ["019_portfolios", seedPortfolios],
];

/**
 * Synchronises the role catalogue with the enforced code catalogue (31 roles, DEC-072) — the safe role migration:
 *  1. every catalogue role is upserted ACTIVE with its permission rows rewritten;
 *  2. every OTHER role definition in the database (the superseded 41-role catalogue, or anything left by an earlier
 *     implementation) is RETIRED: its permission rows are removed and it disappears from assignment options;
 *  3. each still-active assignment of a retired role is revoked (the row is kept as history) and recorded in
 *     role_reassignments for AUTHORISED reassignment. No replacement role is granted: access stays denied until an
 *     administrator grants an approved role and scope (iam.grantRole resolves the flag);
 *  4. a retired role row that nothing references (no assignment, no reassignment record) is physically deleted;
 *     referenced rows are kept so audit and referential integrity are never compromised.
 * Runs in one transaction; it is idempotent. Returns what it changed (for the migration report and tests).
 */
export async function syncCatalogue(db: DB) {
  const now = new Date().toISOString();
  const report = { retired: [] as string[], flagged: [] as Array<{ userId: string; roleCode: string; assignmentId: string }>, deleted: [] as string[] };
  await tx(db, async (db) => {
    const active = new Set<string>(ROLES.map((r) => r.code));
    for (const r of ROLES) {
      await run(db, `INSERT INTO roles (code, name, description, category, requires_expiry, tier, role_no, status, back_office, updated_at) VALUES (?,?,?,?,?,?,?, 'ACTIVE', ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), category = VALUES(category), requires_expiry = VALUES(requires_expiry),
                       tier = VALUES(tier), role_no = VALUES(role_no), status = 'ACTIVE', back_office = VALUES(back_office), updated_at = VALUES(updated_at)`,
        r.code, r.name, r.description, r.category, r.requiresExpiry ? 1 : 0, r.tier, r.no, r.backOffice, now);
      await run(db, "DELETE FROM role_permissions WHERE role_code = ?", r.code);
      for (const [perm, cov] of Object.entries(r.permissions)) await run(db, "INSERT INTO role_permissions (role_code, permission, coverage) VALUES (?,?,?)", r.code, perm, cov);
    }
    const others = (await all<{ code: string; status: string }>(db, "SELECT code, status FROM roles")).filter((x) => !active.has(x.code));
    for (const { code, status } of others) {
      if (status !== "RETIRED") {
        await run(db, "UPDATE roles SET status = 'RETIRED', tier = NULL, role_no = NULL, updated_at = ? WHERE code = ?", now, code);
        report.retired.push(code);
      }
      await run(db, "DELETE FROM role_permissions WHERE role_code = ?", code);
      const live = await all<{ id: string; user_id: string; org_unit_id: string }>(db, "SELECT id, user_id, org_unit_id FROM role_assignments WHERE role_code = ? AND revoked_at IS NULL", code);
      for (const a of live) {
        const reason = `Role ${code} is not in the authorised 31-role catalogue. Reassignment to an approved role and scope requires authorisation.`;
        await run(db, "UPDATE role_assignments SET revoked_at = ?, revoke_reason = ? WHERE id = ? AND revoked_at IS NULL", now, reason, a.id);
        await run(db, `INSERT IGNORE INTO role_reassignments (id, user_id, role_code, org_unit_id, assignment_id, reason, flagged_at) VALUES (?,?,?,?,?,?,?)`,
          `rra_${a.id}`.slice(0, 40), a.user_id, code, a.org_unit_id, a.id, reason, now);
        report.flagged.push({ userId: a.user_id, roleCode: code, assignmentId: a.id });
      }
      const refs = await one<{ c: number }>(db, `SELECT (SELECT COUNT(*) FROM role_assignments WHERE role_code = ?) + (SELECT COUNT(*) FROM role_reassignments WHERE role_code = ?) AS c`, code, code);
      if (Number(refs?.c ?? 0) === 0) {
        await run(db, "DELETE FROM roles WHERE code = ?", code);
        report.deleted.push(code);
      }
    }
    if (report.retired.length || report.flagged.length || report.deleted.length) {
      await audit(db, { actorId: null, action: "role.catalogue.sync", category: "CONFIG", details: { activeRoles: ROLES.length, retired: report.retired, flaggedAssignments: report.flagged.length, deletedUnreferenced: report.deleted } });
    }
    // Report definitions are code-defined too (exports reference them).
    for (const r of REPORTS) {
      await run(db, `INSERT INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?, 'report.view', ?, 'Report owner to be nominated by the Service (DEC-012).')
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), fields = VALUES(fields)`, r.code, r.name, r.description, JSON.stringify(r.fields));
    }
  });
  return report;
}

/** Runs missing synthetic seed steps. Returns the names applied. */
export async function runSeedSteps(db: DB): Promise<string[]> {
  if (isProduction()) {
    // Production: the reference baseline only (national tenant, HQ unit, catalogues). Never synthetic data.
    const done = new Set((await all<{ name: string }>(db, "SELECT name FROM seed_steps")).map((r) => r.name));
    if (done.has("000_reference_baseline")) return [];
    await seedReferenceBaseline(db);
    await run(db, "INSERT INTO seed_steps (name, applied_at) VALUES ('000_reference_baseline', ?)", new Date().toISOString());
    return ["000_reference_baseline"];
  }
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
