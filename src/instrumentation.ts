/**
 * Runs once per server process:
 *  0. check the deployment configuration (lib/config-check.ts) and log any finding;
 *  1. migrate the database, synchronise the role catalogue and apply missing synthetic seed steps;
 *  2. start the in-process automation engine (initial run, then every `automation.interval_minutes`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[zps-oms] DATABASE_URL is not set. Copy .env.example to .env.local and start MySQL in XAMPP.");
    return;
  }
  // Deployment configuration check (issue #11): findings are logged; secrets are never printed.
  const { checkConfig } = await import("./server/lib/config-check");
  for (const f of checkConfig()) if (f.level !== "OK") console[f.level === "ERROR" ? "error" : "warn"](`[zps-oms] config ${f.level} ${f.code}: ${f.message}`);
  const { bootstrap } = await import("./server/db/bootstrap");
  try {
    const r = await bootstrap(url);
    if (r.applied.length) console.log(`[zps-oms] Applied migrations: ${r.applied.join(", ")}`);
    if (r.seeded) console.log(`[zps-oms] Loaded synthetic seed steps: ${r.seedSteps.join(", ")}`);
  } catch (e) {
    console.error("[zps-oms] Database bootstrap failed:", e instanceof Error ? e.message : e);
    return;
  }
  if (process.env.ZPS_AUTOMATION === "off") return;
  try {
    const { getDb, one } = await import("./server/db/connection");
    const { runAllJobs, startScheduler } = await import("./server/jobs/engine");
    const db = getDb();
    const minutes = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'automation.interval_minutes'"))?.value) || 5;
    startScheduler(db, minutes);
    // Initial run shortly after start-up so the first page loads are not delayed.
    setTimeout(() => runAllJobs(db, "STARTUP").catch((e) => console.error("[zps-oms] automation start-up run failed:", e instanceof Error ? e.message : e)), 15000).unref?.();
    console.log(`[zps-oms] Automation engine scheduled every ${minutes} minute(s).`);
  } catch (e) {
    console.error("[zps-oms] Automation engine failed to start:", e instanceof Error ? e.message : e);
  }
}
