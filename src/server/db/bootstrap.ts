/**
 * Start-up bootstrap: apply pending migrations, then load the SYNTHETIC seed
 * only when the database has no users. Existing data is never modified.
 * A MySQL named lock prevents two server workers seeding concurrently.
 */
import { createPool, one, type DB } from "./connection";
import { migrate } from "./migrate";
import { seedDatabase } from "./seed";

export async function seedIfEmpty(db: DB): Promise<boolean> {
  const n = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM users");
  if (Number(n?.c ?? 0) > 0) return false;
  await seedDatabase(db);
  return true;
}

export async function bootstrap(url: string): Promise<{ applied: string[]; seeded: boolean }> {
  const { applied } = await migrate(url);
  const pool = createPool(url);
  const lock = await pool.getConnection();
  try {
    const got = await one<{ l: number }>(lock, "SELECT GET_LOCK('zps_oms_seed', 120) AS l");
    if (Number(got?.l) !== 1) throw new Error("Timed out waiting for the seed lock.");
    const seeded = await seedIfEmpty(pool);
    await lock.query("SELECT RELEASE_LOCK('zps_oms_seed')");
    return { applied, seeded };
  } finally {
    lock.release();
    await pool.end();
  }
}
