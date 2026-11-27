/**
 * Health and readiness for uptime monitoring (DevOps).
 *
 * Unauthenticated by design, so it discloses nothing sensitive: no host, database name, user, error text,
 * counts of records or configuration — only up/down signals, the schema version and the application version.
 *  - liveness:  the process answers (no database call);
 *  - readiness: the database answers and every migration file has been applied.
 */
import fs from "node:fs";
import path from "node:path";
import type { DB } from "../db/connection";
import { one } from "../db/connection";
import { listMigrationFiles } from "../db/migrate";

import { VERSION } from "./version";
import { RELEASE } from "../lib/release";

export interface Health {
  status: "ok" | "degraded" | "down";
  version: string;
  time: string;
  checks: { database: { ok: boolean; latencyMs: number | null }; schema: { ok: boolean; applied: number | null; expected: number }; maintenance: boolean | null };
}

export function liveness() {
  return { status: "ok" as const, version: VERSION, stage: RELEASE.stage, time: new Date().toISOString() };
}

export async function readiness(db: DB): Promise<Health> {
  const expected = listMigrationFiles().reduce((m, f) => Math.max(m, f.version), 0);
  const t0 = performance.now();
  try {
    const applied = Number((await one<{ v: number }>(db, "SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations"))?.v ?? 0);
    const latencyMs = Math.round(performance.now() - t0);
    const maintenance = (await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'platform.maintenance_mode'"))?.value === "ON";
    const schemaOk = applied === expected;
    return {
      status: schemaOk && !maintenance ? "ok" : "degraded",
      version: VERSION, time: new Date().toISOString(),
      checks: { database: { ok: true, latencyMs }, schema: { ok: schemaOk, applied, expected }, maintenance },
    };
  } catch {
    return { status: "down", version: VERSION, time: new Date().toISOString(), checks: { database: { ok: false, latencyMs: null }, schema: { ok: false, applied: null, expected }, maintenance: null } };
  }
}
