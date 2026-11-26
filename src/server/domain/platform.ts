/**
 * M15 — Platform administration and monitoring.
 * Technical functions only: no access to personnel records or business approvals.
 *
 * Backups use XAMPP's `mysqldump` (free, local). The password is passed through the MYSQL_PWD environment
 * variable, never on the command line or in logs. A backup counts as verified only when the file exists, is
 * non-empty, ends with mysqldump's completion marker and its SHA-256 has been recorded.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "./audit";
import { conflict, forbidden, invalid, nowIso } from "./core";
import { type Actor, HQ_ID, requirePermission } from "./policy";
import { JOBS, runAllJobs, runJob } from "../jobs/engine";

const VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version as string;
  } catch {
    return "unknown";
  }
})();

export async function maintenanceMode(db: DB): Promise<boolean> {
  return (await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'platform.maintenance_mode'"))?.value === "ON";
}

export async function platformOverview(db: DB, actor: Actor) {
  await requirePermission(db, actor, "platform.view", HQ_ID);
  const server = await one<{ v: string }>(db, "SELECT VERSION() AS v");
  const dbName = await one<{ d: string }>(db, "SELECT DATABASE() AS d");
  const tables = await one<{ c: number; bytes: number }>(db, "SELECT COUNT(*) AS c, COALESCE(SUM(data_length + index_length),0) AS bytes FROM information_schema.tables WHERE table_schema = DATABASE()");
  const migrations = await all<{ version: number; name: string; checksum: string; applied_at: string }>(db, "SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version");
  const lastRuns = await all<{ job: string; status: string; started_at: string; finished_at: string | null; processed: number; attempts: number; message: string | null; trigger_type: string }>(db,
    `SELECT r.* FROM job_runs r JOIN (SELECT job, MAX(id) AS id FROM job_runs GROUP BY job) x ON x.id = r.id`);
  const recentRuns = await all<{ id: number; job: string; status: string; started_at: string; processed: number; trigger_type: string; message: string | null }>(db, "SELECT id, job, status, started_at, processed, trigger_type, message FROM job_runs ORDER BY id DESC LIMIT 25");
  const backups = await all<{ id: number; file_name: string | null; size_bytes: number | null; sha256: string | null; started_at: string; finished_at: string | null; status: string; verified: number; message: string | null }>(db, "SELECT * FROM backup_runs ORDER BY id DESC LIMIT 10");
  const errors = await all<{ id: number; occurred_at: string; source: string; error_name: string; message: string }>(db, "SELECT * FROM error_logs ORDER BY id DESC LIMIT 25");
  const settings = await all<{ key: string; value: string; description: string }>(db, "SELECT `key`, value, description FROM app_settings ORDER BY `key`");
  return {
    version: VERSION, node: process.version, env: process.env.NODE_ENV ?? "development", dbVersion: server?.v ?? "unknown", dbName: dbName?.d ?? "unknown",
    tables: Number(tables?.c ?? 0), sizeBytes: Number(tables?.bytes ?? 0), migrations, jobs: JOBS.map((j) => ({ ...j, last: lastRuns.find((r) => r.job === j.name) ?? null })),
    recentRuns, backups, errors, settings, maintenance: await maintenanceMode(db),
  };
}

export async function runJobsNow(db: DB, actor: Actor, job?: string) {
  // Technical operations (Superadmin and HQ Tech); settings and maintenance mode stay platform.configure.
  await requirePermission(db, actor, "platform.operate", HQ_ID);
  if (job && !JOBS.some((j) => j.name === job)) throw invalid("Unknown job.");
  await audit(db, { actorId: actor.userId, action: "platform.jobs.run", category: "CONFIG", details: { job: job ?? "ALL" } });
  if (job) return [{ name: job, ...(await runJob(db, job, "MANUAL", actor.userId)) }];
  const r = await runAllJobs(db, "MANUAL", actor.userId);
  if (!r) throw conflict("An automation run is already in progress. Try again shortly.");
  return r;
}

export async function setMaintenanceMode(db: DB, actor: Actor, on: boolean, reason: string) {
  await requirePermission(db, actor, "platform.configure", HQ_ID);
  if (reason.trim().length < 5) throw invalid("Record the reason for the change.");
  await run(db, "UPDATE app_settings SET value = ? WHERE `key` = 'platform.maintenance_mode'", on ? "ON" : "OFF");
  await audit(db, { actorId: actor.userId, action: `platform.maintenance.${on ? "on" : "off"}`, category: "CONFIG", details: { reason: reason.trim() } });
}

/** Non-security settings a platform administrator may change (whitelist with validation). */
const EDITABLE: Record<string, (v: string) => boolean> = {
  "automation.interval_minutes": (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 1440,
  "manpower.default_deadline_days": (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 90,
  "backup.max_age_hours": (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 720,
  "request.sla_days": (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 90,
};
export const EDITABLE_SETTINGS = Object.keys(EDITABLE);

export async function updateSetting(db: DB, actor: Actor, key: string, value: string) {
  await requirePermission(db, actor, "platform.configure", HQ_ID);
  // Tenure, renewal and exception policy are institutional decisions and are not editable here.
  if (!EDITABLE[key]) throw forbidden("This setting cannot be changed from the platform console.");
  if (!EDITABLE[key](value.trim())) throw invalid("Enter a whole number within the permitted range.");
  const old = (await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = ?", key))?.value;
  await run(db, "UPDATE app_settings SET value = ? WHERE `key` = ?", value.trim(), key);
  await audit(db, { actorId: actor.userId, action: "platform.setting.update", category: "CONFIG", details: { key, from: old, to: value.trim() } });
}

function connectionParts() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const database = url.pathname.replace(/^\//, "");
  if (!/^zps_oms_[a-z0-9_]+$/.test(database)) throw invalid("Backups are only supported for zps_oms_* databases.");
  return { host: url.hostname || "127.0.0.1", port: url.port || "3306", user: decodeURIComponent(url.username || "root"), password: decodeURIComponent(url.password || ""), database };
}

export const backupDir = () => process.env.ZPS_BACKUP_DIR ?? path.join(process.cwd(), "backups");
const dumpBinary = () => process.env.MYSQLDUMP_PATH ?? (process.platform === "win32" ? "C:\\xampp\\mysql\\bin\\mysqldump.exe" : "mysqldump");

/** Runs mysqldump into the backup folder and verifies the result. */
export async function createBackup(db: DB, actor: Actor) {
  await requirePermission(db, actor, "platform.operate", HQ_ID);
  if (await one(db, "SELECT id FROM backup_runs WHERE status = 'RUNNING' AND started_at > ?", new Date(Date.now() - 30 * 60000).toISOString())) throw conflict("A backup is already running.");
  const c = connectionParts();
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = `${c.database}-${nowIso().replace(/[:.]/g, "-")}.sql`;
  const full = path.join(dir, file);
  const { insertId } = await run(db, "INSERT INTO backup_runs (file_name, started_at, status, started_by) VALUES (?,?, 'RUNNING', ?)", file, nowIso(), actor.userId);
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn(dumpBinary(), ["--host", c.host, "--port", c.port, "--user", c.user, "--single-transaction", "--routines", "--triggers", "--default-character-set=utf8mb4", `--result-file=${full}`, c.database], {
        env: { ...process.env, MYSQL_PWD: c.password }, windowsHide: true,
      });
      let err = "";
      p.stderr.on("data", (d) => (err += String(d)));
      p.on("error", (e) => reject(new Error(`mysqldump could not start (${e.message}). Set MYSQLDUMP_PATH if XAMPP is not in C:\\xampp.`)));
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`mysqldump exited with code ${code}: ${err.trim().slice(0, 300)}`))));
    });
    const stat = fs.statSync(full);
    const content = fs.readFileSync(full);
    const tail = content.subarray(Math.max(0, content.length - 400)).toString("utf8");
    const verified = stat.size > 0 && /Dump completed/.test(tail);
    const sha = crypto.createHash("sha256").update(content).digest("hex");
    await run(db, "UPDATE backup_runs SET finished_at = ?, status = ?, size_bytes = ?, sha256 = ?, verified = ?, message = ? WHERE id = ?",
      nowIso(), verified ? "SUCCESS" : "FAILED", stat.size, sha, verified ? 1 : 0, verified ? "Completion marker found; checksum recorded." : "Dump file incomplete (no completion marker).", insertId);
    await audit(db, { actorId: actor.userId, action: "platform.backup.create", outcome: verified ? "SUCCESS" : "FAILURE", category: "CONFIG", details: { file, bytes: stat.size, sha256: sha } });
    if (!verified) throw conflict("The backup file was written but failed verification.");
    return { file, size: stat.size, sha256: sha };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Backup failed";
    await run(db, "UPDATE backup_runs SET finished_at = ?, status = 'FAILED', message = ? WHERE id = ? AND status = 'RUNNING'", nowIso(), msg.slice(0, 500), insertId);
    await run(db, "INSERT INTO error_logs (occurred_at, source, error_name, message) VALUES (?,?,?,?)", nowIso(), "platform.backup", "BackupError", msg.slice(0, 500));
    throw e instanceof Error && "code" in e ? e : conflict(msg);
  }
}

/** Re-verifies an existing backup file against its recorded checksum. */
export async function verifyBackup(db: DB, actor: Actor, id: number) {
  await requirePermission(db, actor, "platform.operate", HQ_ID);
  const b = await one<{ file_name: string; sha256: string | null }>(db, "SELECT file_name, sha256 FROM backup_runs WHERE id = ?", id);
  if (!b?.file_name || !b.sha256) throw invalid("Backup not found or never completed.");
  const full = path.join(backupDir(), path.basename(b.file_name));
  if (!fs.existsSync(full)) {
    await run(db, "UPDATE backup_runs SET verified = 0, message = 'File missing at re-verification' WHERE id = ?", id);
    throw conflict("The backup file is missing.");
  }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
  const ok = sha === b.sha256;
  await run(db, "UPDATE backup_runs SET verified = ?, message = ? WHERE id = ?", ok ? 1 : 0, ok ? `Re-verified ${nowIso()}` : "Checksum mismatch at re-verification", id);
  await audit(db, { actorId: actor.userId, action: "platform.backup.verify", outcome: ok ? "SUCCESS" : "FAILURE", category: "CONFIG", details: { id } });
  if (!ok) throw conflict("Checksum mismatch: the backup file has changed since it was created.");
}

/** Records an unexpected error without request payloads or personal data. */
export async function logError(db: DB, source: string, e: unknown) {
  try {
    await run(db, "INSERT INTO error_logs (occurred_at, source, error_name, message) VALUES (?,?,?,?)", nowIso(), source.slice(0, 80), e instanceof Error ? e.name.slice(0, 80) : "Error", (e instanceof Error ? e.message : String(e)).slice(0, 500));
  } catch {
    /* logging must never throw */
  }
}
