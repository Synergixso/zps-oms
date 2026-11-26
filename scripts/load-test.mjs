/**
 * Load and page-weight baseline (NFR-002 Performance, NFR-003 Scalability). Dependency-free.
 *
 * Runs against a RUNNING server, ideally the production build (`npm run build && npm run start`), and a
 * local synthetic database. It signs in one account per role by creating sessions directly in the
 * database (as the route audit does), then for each concurrency level issues requests to a fixed mix of
 * public, health and back-office pages, and records latency percentiles, throughput, errors and the
 * size of each page as sent (gzip, as a low-bandwidth client would receive it).
 *
 * Usage: node scripts/load-test.mjs [baseUrl] [--levels 1,10,25] [--requests 300]
 * Writes docs/evidence/load-test.md. Exits 1 if a budget is missed. Sessions it creates are deleted.
 *
 * The budgets are PROVISIONAL development budgets (NFR-002 asks for targets "after load model"):
 * no server errors; p95 <= 1500 ms for back-office pages and <= 500 ms for the health probe at 10 concurrent users.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import zlib from "node:zlib";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:/.test(a)) ?? "http://localhost:3100";
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const LEVELS = opt("levels", "1,10,25").split(",").map(Number);
const REQUESTS = Number(opt("requests", "300"));
const BUDGET = { level: 10, appP95: 1500, healthP95: 500 };

if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1].trim();
  }
}
if (!/\/zps_oms_[a-z0-9_]+$/.test(process.env.DATABASE_URL ?? "")) throw new Error("DATABASE_URL must point at a local zps_oms_* synthetic database.");
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(base)) throw new Error("The load test only runs against a local server.");
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL });

// One active account per role (27), so the mix exercises every workspace and scope.
const [accounts] = await db.query(`SELECT r.role_no, (SELECT u.id FROM role_assignments a JOIN users u ON u.id = a.user_id
    WHERE a.role_code = r.code AND a.revoked_at IS NULL AND u.status = 'ACTIVE' ORDER BY u.username LIMIT 1) AS user_id
  FROM roles r WHERE r.status = 'ACTIVE' ORDER BY r.role_no`);
const sessions = [];
for (const a of accounts.filter((x) => x.user_id)) {
  const token = crypto.randomBytes(32).toString("base64url");
  const h = crypto.createHash("sha256").update(token).digest("hex");
  const t = new Date();
  await db.query("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)",
    [h, a.user_id, t.toISOString(), new Date(t.getTime() + 3600e3).toISOString(), t.toISOString()]);
  sessions.push({ token, h, roleNo: a.role_no });
}

// Request mix: what a working day looks like (mostly dashboards and registers), plus public and health traffic.
const MIX = [
  { group: "health", path: "/api/health?probe=live", auth: false, weight: 1 },
  { group: "health", path: "/api/health", auth: false, weight: 1 },
  { group: "public", path: "/", auth: false, weight: 1 },
  { group: "public", path: "/login", auth: false, weight: 1 },
  { group: "app", path: "/app", auth: true, weight: 4 },
  { group: "app", path: "/app/tasks", auth: true, weight: 2 },
  { group: "app", path: "/app/notifications", auth: true, weight: 1 },
  { group: "app", path: "/app/requests", auth: true, weight: 1 },
  { group: "app", path: "/app/personnel", auth: true, weight: 1 },
  { group: "app", path: "/app/help", auth: true, weight: 1 },
];
const bag = MIX.flatMap((m) => Array(m.weight).fill(m));

async function hit(m, i) {
  const headers = { "accept-encoding": "gzip" };
  if (m.auth) headers.cookie = `zps_session=${sessions[i % sessions.length].token}`;
  const t0 = performance.now();
  try {
    const res = await fetch(base + m.path, { headers, redirect: "manual" });
    const body = Buffer.from(await res.arrayBuffer());
    const ms = performance.now() - t0;
    // A page the role may not open answers 200 with an access-denied state, or 404; neither is a server error.
    return { m, ms, status: res.status, bytes: body.length, error: res.status >= 500 };
  } catch (e) {
    return { m, ms: performance.now() - t0, status: 0, bytes: 0, error: true, reason: String(e?.cause?.code ?? e) };
  }
}

async function level(concurrency) {
  const results = [];
  let next = 0;
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < REQUESTS) {
      const i = next++;
      results.push(await hit(bag[i % bag.length], i));
    }
  }));
  return { concurrency, seconds: (performance.now() - t0) / 1000, results };
}

const pct = (xs, p) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const r0 = (x) => Math.round(x);

// Warm-up: compile/cache every page once so the figures describe steady state, not first render.
for (const m of MIX) await hit(m, 0);

const runs = [];
for (const c of LEVELS) runs.push(await level(c));

// Page weight as received by a low-bandwidth client: the HTML document, gzip-compressed (the size is
// measured by compressing the body ourselves, because fetch decodes the transfer encoding).
// Measured as role 03 (DIG Operations, national business scope), so registers show real content rather than an access notice.
const weigher = sessions.find((s) => s.roleNo === 3) ?? sessions[0];
const weights = [];
for (const m of MIX.filter((x, i, a) => a.findIndex((y) => y.path === x.path) === i)) {
  const headers = m.auth ? { cookie: `zps_session=${weigher.token}` } : {};
  const res = await fetch(base + m.path, { headers, redirect: "manual" });
  const body = Buffer.from(await res.arrayBuffer());
  weights.push({ path: m.path, status: res.status, raw: body.length, gzip: zlib.gzipSync(body).length });
}

for (const s of sessions) await db.query("DELETE FROM sessions WHERE id = ?", [s.h]);
await db.end();

const lines = ["# Load and page-weight baseline (NFR-002, NFR-003)", "",
  `Generated ${new Date().toISOString()} against \`${base}\` · ${sessions.length} signed-in accounts (one per role) · ${REQUESTS} requests per level · host: ${os.cpus().length} logical CPUs, ${Math.round(os.totalmem() / 2 ** 30)} GiB RAM, ${os.platform()} · database: local synthetic. Synthetic data only.`, "",
  "Request mix per 14 requests: dashboard ×4, tasks ×2, notifications, requests register, personnel register, Help, home, sign-in, health (live), health (readiness).", "",
  "| Concurrent users | Group | Requests | Server errors | p50 ms | p95 ms | p99 ms | Max ms | Throughput (req/s) |", "|--:|---|--:|--:|--:|--:|--:|--:|--:|"];
const failures = [];
for (const run of runs) {
  for (const g of ["app", "public", "health"]) {
    const rs = run.results.filter((r) => r.m.group === g);
    const ms = rs.map((r) => r.ms);
    const errors = rs.filter((r) => r.error).length;
    lines.push(`| ${run.concurrency} | ${g} | ${rs.length} | ${errors} | ${r0(pct(ms, 50))} | ${r0(pct(ms, 95))} | ${r0(pct(ms, 99))} | ${r0(Math.max(...ms))} | ${(rs.length / run.seconds).toFixed(1)} |`);
    if (errors) failures.push(`${errors} server error(s) in ${g} at ${run.concurrency} concurrent users`);
    if (run.concurrency === BUDGET.level && g === "app" && pct(ms, 95) > BUDGET.appP95) failures.push(`app p95 ${r0(pct(ms, 95))} ms > ${BUDGET.appP95} ms`);
    if (run.concurrency === BUDGET.level && g === "health" && pct(ms, 95) > BUDGET.healthP95) failures.push(`health p95 ${r0(pct(ms, 95))} ms > ${BUDGET.healthP95} ms`);
  }
}
lines.push("", `## Page weight (HTML document, as role ${String(weigher.roleNo).padStart(2, "0")})`, "", "| Page | Status | Uncompressed KB | Gzip KB |", "|---|--:|--:|--:|");
for (const w of weights) lines.push(`| \`${w.path}\` | ${w.status} | ${(w.raw / 1024).toFixed(1)} | ${(w.gzip / 1024).toFixed(1)} |`);
lines.push("", "Scripts, styles and images are cached by the browser after the first visit (immutable, hashed file names) and are not included above.",
  "", "## Budgets (provisional, development)", "",
  `No server errors at any level; at ${BUDGET.level} concurrent users p95 ≤ ${BUDGET.appP95} ms for back-office pages and ≤ ${BUDGET.healthP95} ms for the health probe. Production targets must be set from the Service's load model on the target infrastructure (NFR-002).`, "",
  `**Result: ${failures.length ? "FAIL: " + failures.join("; ") : "PASS"}**`, "");
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync("docs/evidence/load-test.md", lines.join("\n"));
console.log(lines.join("\n"));
process.exit(failures.length ? 1 : 0);
