import fs from "node:fs";

/** Synthetic e2e database URL: DATABASE_URL_TEST with the database renamed to zps_oms_e2e. */
export function e2eDatabaseUrl(): string {
  let url = process.env.DATABASE_URL_TEST;
  if (!url && fs.existsSync(".env.local")) {
    for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL_TEST=(.*)$/);
      if (m) url = m[1].trim();
    }
  }
  if (!url) throw new Error("DATABASE_URL_TEST is not set (see .env.example).");
  return url.replace(/\/[^/?]+(\?.*)?$/, "/zps_oms_e2e$1");
}

export const DEV_PASSWORD = "ZpsDemo!2026";
