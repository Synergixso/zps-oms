/** Recreates the SYNTHETIC test database once per run: migrate + seed. Tests then run in rolled-back transactions. */
import { createPool } from "@/server/db/connection";
import { migrate, recreateDatabase } from "@/server/db/migrate";
import { runSeedSteps, syncCatalogue } from "@/server/db/bootstrap";
import { testDatabaseUrl } from "./env";

export default async function setup() {
  const url = testDatabaseUrl();
  await recreateDatabase(url);
  await migrate(url);
  const pool = createPool(url);
  try {
    await syncCatalogue(pool);
    await runSeedSteps(pool);
  } finally {
    await pool.end();
  }
}
