/**
 * Independent audit-chain verifier (operations tool). Recomputes every hash exactly as src/server/domain/audit.ts
 * does and reports the first break and every event whose stored fields no longer match its hash.
 *
 * Usage: node scripts/verify-audit-chain.mjs [databaseUrl]   (default: DATABASE_URL from the environment or .env.local)
 * Read-only. Synthetic local databases (zps_oms_*) only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";

let url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) url = m[1].trim();
  }
}
if (!/\/zps_oms_[a-z0-9_]+$/.test(url ?? "")) throw new Error("Pass a zps_oms_* database URL.");
const db = await mysql.createConnection({ uri: url, dateStrings: true });
const [rows] = await db.query("SELECT * FROM audit_events ORDER BY seq ASC");
let prev = "0".repeat(64);
const broken = [];
for (const e of rows) {
  // Content check against the event's own recorded predecessor; link check against the actual predecessor.
  const canonical = JSON.stringify([e.prev_hash, e.id, e.occurred_at, e.actor_id, e.action, e.outcome, e.entity_type, e.entity_id, e.org_unit_id, e.category, e.details]);
  const contentOk = crypto.createHash("sha256").update(canonical).digest("hex") === e.hash;
  const linkOk = e.prev_hash === prev;
  if (!contentOk || !linkOk) broken.push({ seq: e.seq, kind: !contentOk ? "content" : "link", action: e.action, length: e.action.length });
  prev = e.hash; // follow the stored chain so one bad event does not cascade
}
await db.end();
const by = (k) => broken.filter((b) => b.kind === k);
console.log(JSON.stringify({ events: rows.length, contentMismatches: by("content").length, linkMismatches: by("link").length, firstContent: by("content").slice(0, 3), firstLink: by("link").slice(0, 3) }, null, 2));
process.exitCode = broken.length ? 1 : 0;
