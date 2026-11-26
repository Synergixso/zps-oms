/** Recreates the SYNTHETIC zps_oms_e2e database, migrates and seeds it before the dev server starts. */
import { bootstrap } from "../src/server/db/bootstrap";
import { recreateDatabase } from "../src/server/db/migrate";
import { e2eDatabaseUrl } from "./env";

export default async function globalSetup() {
  const url = e2eDatabaseUrl();
  await recreateDatabase(url);
  await bootstrap(url);
}
