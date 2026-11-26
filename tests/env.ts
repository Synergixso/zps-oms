import fs from "node:fs";
import path from "node:path";

/** Test database URL from the environment or .env.local. Must name a zps_oms_test* database. */
export function testDatabaseUrl(): string {
  if (!process.env.DATABASE_URL_TEST) {
    const env = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(env)) {
      for (const line of fs.readFileSync(env, "utf8").split(/\r?\n/)) {
        const m = line.match(/^DATABASE_URL_TEST=(.*)$/);
        if (m) process.env.DATABASE_URL_TEST = m[1].trim();
      }
    }
  }
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set (see .env.example). Start MySQL in XAMPP.");
  if (!/\/zps_oms_test[a-z0-9_]*$/.test(new URL(url).pathname)) throw new Error("DATABASE_URL_TEST must point at a zps_oms_test* database.");
  return url;
}
