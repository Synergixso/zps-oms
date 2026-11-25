// Deletes the local SYNTHETIC database so it is recreated (migrated + seeded) on next start.
// Stop the dev server first. Never point this at a real database.
import fs from "node:fs";
const base = process.env.ZPS_DB_FILE ?? "data/zps-oms-synthetic.db";
for (const f of [base, `${base}-wal`, `${base}-shm`]) if (fs.existsSync(f)) { fs.rmSync(f); console.log("removed", f); }
console.log("Synthetic database reset. Start the app to recreate it.");
