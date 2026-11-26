/** Runs once per server process: migrate the database and load the synthetic seed if empty. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[zps-oms] DATABASE_URL is not set. Copy .env.example to .env.local and start MySQL in XAMPP.");
    return;
  }
  const { bootstrap } = await import("./server/db/bootstrap");
  try {
    const r = await bootstrap(url);
    if (r.applied.length) console.log(`[zps-oms] Applied migrations: ${r.applied.join(", ")}`);
    if (r.seeded) console.log("[zps-oms] Loaded the synthetic demonstration dataset.");
  } catch (e) {
    console.error("[zps-oms] Database bootstrap failed:", e instanceof Error ? e.message : e);
  }
}
