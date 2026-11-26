/**
 * Route audit (end-to-end, against a running server).
 * For every synthetic user it creates a session directly in the local DB,
 * requests every application route and records: HTTP status, whether the
 * page rendered an access-denied state, and whether any server error occurred.
 *
 * Usage: node scripts/route-audit.mjs [baseUrl]   (DATABASE_URL from the environment or .env.local)
 * Writes docs/evidence/route-audit.md. Synthetic data only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";

const base = process.argv[2] ?? "http://localhost:3100";
if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1].trim();
  }
}
if (!/\/zps_oms_[a-z0-9_]+$/.test(process.env.DATABASE_URL ?? "")) throw new Error("DATABASE_URL must point at a local zps_oms_* synthetic database.");
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL });

const all = async (sql, ...p) => (await db.query(sql, p))[0];
const one = async (sql, ...p) => (await all(sql, ...p))[0];
const id = async (sql, ...p) => (await one(sql, ...p))?.id;

// Representative records per scope (looked up, not hard-coded).
const R = {
  lskReq: await id("SELECT id FROM admin_requests WHERE origin_org_id='org_lsk' AND status<>'DRAFT' LIMIT 1"),
  cbReq: await id("SELECT id FROM admin_requests WHERE origin_org_id='org_cb' LIMIT 1"),
  muReq: await id("SELECT id FROM admin_requests WHERE origin_org_id='org_mu' LIMIT 1"),
  hqReq: await id("SELECT id FROM admin_requests WHERE origin_org_id='org_hq' AND status<>'DRAFT' LIMIT 1"),
  lskMaint: await id("SELECT id FROM maintenance_requests WHERE org_unit_id='org_lsk' LIMIT 1"),
  firstUser: "u_lsk_sops",
};

const routes = [
  "/app", "/app/approvals", "/app/requests", "/app/requests/new",
  `/app/requests/${R.lskReq}`, `/app/requests/${R.cbReq}`, `/app/requests/${R.muReq}`, `/app/requests/${R.hqReq}`,
  "/app/fleet", "/app/fleet/new", "/app/fleet/veh_1", "/app/fleet/veh_7", "/app/fleet/veh_15",
  "/app/fleet/maintenance", "/app/fleet/maintenance/new", `/app/fleet/maintenance/${R.lskMaint}`,
  "/app/assets", "/app/assets/new", "/app/assets/ast_1", "/app/assets/ast_9", "/app/assets/ast_14",
  "/app/reports", "/app/reports/REQ_STATUS_BY_ORG", "/app/reports/FLEET_MAINTENANCE", "/app/reports/ASSET_ACCOUNTABILITY",
  "/app/org", "/app/org/org_taz", "/app/org/changes",
  "/app/admin/users", `/app/admin/users/${R.firstUser}`, "/app/admin/roles", "/app/admin/reviews",
  "/app/audit", "/app/security", "/app/workflows", "/app/platform",
  "/app/messages", "/app/notifications", "/app/profile", "/app/help",
];

const users = await all("SELECT u.id, u.display_name, (SELECT role_code FROM role_assignments a WHERE a.user_id=u.id AND a.revoked_at IS NULL ORDER BY a.id LIMIT 1) AS role FROM users u WHERE u.status='ACTIVE' ORDER BY u.id");

async function session(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const h = crypto.createHash("sha256").update(token).digest("hex");
  const t = new Date();
  await db.query("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)", [h, userId, t.toISOString(), new Date(t.getTime() + 3600e3).toISOString(), t.toISOString()]);
  return { token, h };
}

const results = [];
let errors = 0;
for (const u of users) {
  const { token, h } = await session(u.id);
  const row = { user: `${u.display_name} (${u.role})`, cells: [] };
  for (const r of routes) {
    const res = await fetch(base + r, { headers: { cookie: `zps_session=${token}` }, redirect: "manual" });
    const body = res.status === 200 ? await res.text() : "";
    const denied = /not authorised to view/.test(body);
    const err = res.status >= 500 || /Application error|Internal Server Error/.test(body);
    if (err) errors++;
    row.cells.push(err ? "ERR" : res.status === 404 ? "404" : res.status >= 300 && res.status < 400 ? "→" : denied ? "✕" : "✓");
  }
  await db.query("DELETE FROM sessions WHERE id = ?", [h]);
  results.push(row);
}

const header = `| User (primary role) | ${routes.map((r, i) => `R${i + 1}`).join(" | ")} |`;
const sep = `|---|${routes.map(() => ":-:").join("|")}|`;
const md = [
  "# Route audit evidence",
  "",
  `Generated ${new Date().toISOString()} against ${base} with the synthetic dataset. ✓ = rendered, ✕ = access-denied page (audited), 404 = record outside scope (existence not disclosed), → = redirect, ERR = server error.`,
  "",
  `**Server errors: ${errors}**`,
  "",
  "## Routes",
  "",
  ...routes.map((r, i) => `- R${i + 1}: \`${r.replace(/req_[a-z0-9]+|mnt_[a-z0-9]+/g, (m) => m.slice(0, 8) + "…")}\``),
  "",
  "## Matrix",
  "",
  header,
  sep,
  ...results.map((r) => `| ${r.user} | ${r.cells.join(" | ")} |`),
  "",
].join("\n");
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync("docs/evidence/route-audit.md", md);
console.log(md);
await db.end();
process.exit(errors ? 1 : 0);
