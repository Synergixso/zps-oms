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
  perKit: await id("SELECT id FROM personnel_records WHERE home_unit_id='org_cb_kitwe_central' ORDER BY id LIMIT 1"),
  perLsk: await id("SELECT id FROM personnel_records WHERE home_unit_id='org_lsk_central_stn' ORDER BY id LIMIT 1"),
  asgKcm: await id("SELECT id FROM personnel_assignments WHERE area_id='area_kcm' ORDER BY reference LIMIT 1"),
  asgLsk: await id("SELECT id FROM personnel_assignments WHERE area_id='area_lsk_cbd' ORDER BY reference LIMIT 1"),
  mprCb: await id("SELECT id FROM manpower_requests WHERE requesting_unit_id='org_cb' AND status='COMPLETED' LIMIT 1"),
  mprHq: await id("SELECT id FROM manpower_requests WHERE requesting_unit_id='org_hq' LIMIT 1"),
  contrib: await id("SELECT c.id FROM manpower_contributions c JOIN manpower_requests m ON m.id=c.request_id WHERE m.requesting_unit_id='org_hq' AND c.contributing_unit_id='org_mu_a' LIMIT 1"),
  roster: await id("SELECT id FROM roster_versions WHERE status='FINALISED' LIMIT 1"),
  transfer: await id("SELECT id FROM assignment_transfers WHERE status='COMPLETED' LIMIT 1"),
  stoKit: await id("SELECT id FROM store_items WHERE org_unit_id='org_cb_kitwe' ORDER BY code LIMIT 1"),
  stoLsk: await id("SELECT id FROM store_items WHERE org_unit_id='org_lsk' ORDER BY code LIMIT 1"),
  srqKit: await id("SELECT id FROM store_requisitions WHERE store_unit_id='org_cb_kitwe' ORDER BY reference LIMIT 1"),
  // Liaison administration (roles 07, 19, 30, 31): a Copperbelt record routed to the Division, and a Lusaka draft.
  liaCb: await id("SELECT id FROM liaison_records WHERE external_reference='SYN-KCS-LIA-0001'"),
  liaLsk: await id("SELECT id FROM liaison_records WHERE external_reference='SYN-LSK-LIA-0005'"),
  // Command and reporting: the IG's directive at the top of the seeded chain, and the Area Commander's parallel report.
  dir: await id("SELECT id FROM command_directives WHERE parent_id IS NULL ORDER BY created_at LIMIT 1"),
  rpt: await id("SELECT id FROM status_reports WHERE reporter_position_id='pos_mu_area_a' ORDER BY created_at LIMIT 1"),
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
  "/app/personnel", "/app/personnel/new", `/app/personnel/${R.perKit}`, `/app/personnel/${R.perLsk}`, "/app/personnel/export",
  "/app/manpower", "/app/manpower/new", `/app/manpower/${R.mprCb}`, `/app/manpower/${R.mprHq}`, "/app/manpower/contributions", `/app/manpower/contributions/${R.contrib}`,
  "/app/rosters", `/app/rosters/${R.roster}`, `/app/rosters/${R.roster}/print`, `/app/rosters/${R.roster}/export`,
  "/app/assignments", "/app/assignments/new", `/app/assignments/${R.asgKcm}`, `/app/assignments/${R.asgLsk}`,
  "/app/transfers", `/app/transfers/${R.transfer}`, "/app/areas",
  "/app/areas/area_kcm", "/app/personnel/review", "/app/tasks", "/app/audit/history", "/app/org/tenants", "/app/reports/ASSIGNMENTS_BY_AREA", "/app/reports/PERSONNEL_BY_UNIT",
  "/app/assets/reconciliation", `/app/rosters/${R.roster}/pdf`, "/app/platform", "/app/workflows", "/app/notifications", "/app/search?q=kcm",
  "/app/stores", `/app/stores/${R.stoKit}`, `/app/stores/${R.stoLsk}`, "/app/stores/requisitions", "/app/stores/requisitions/new", `/app/stores/requisitions/${R.srqKit}`, "/app/reports/STORES_STOCK", "/app/reports/STORES_REQUISITIONS",
  "/app/calendar", "/app/calendar/new", "/app/correspondence", "/app/correspondence/new",
  "/app/liaison", "/app/liaison/assigned", "/app/liaison/submissions", "/app/liaison/incoming", "/app/liaison/acknowledgements", "/app/liaison/reports",
  "/app/liaison/routing", "/app/liaison/history", "/app/liaison/new", `/app/liaison/records/${R.liaCb}`, `/app/liaison/records/${R.liaLsk}`,
  "/app/command", "/app/command/directives", "/app/command/directives/issued", "/app/command/directives/new", `/app/command/directives/${R.dir}`,
  "/app/command/reports", "/app/command/reports/submitted", "/app/command/reports/new", `/app/command/reports/${R.rpt}`, "/app/command/acting", "/app/command/conflicts", "/app/command/structure",
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
// Two users at a time (each user's routes run sequentially).
const audited = async (u) => {
  const { token, h } = await session(u.id);
  const row = { user: `${u.display_name} (${u.role})`, cells: [] };
  for (const r of routes) {
    let res, body = "", failed = false;
    for (let attempt = 1; ; attempt++) {
      try {
        res = await fetch(base + r, { headers: { cookie: `zps_session=${token}` }, redirect: "manual" });
        body = res.status === 200 ? await res.text() : "";
        break;
      } catch (e) {
        // Transient socket resets while the dev server compiles a route are retried; a persistent failure is an error.
        if (attempt >= 4) { failed = true; console.error(`[audit] ${r} as ${u.id}: ${e.message}`); break; }
        await new Promise((ok) => setTimeout(ok, 2000 * attempt));
      }
    }
    const denied = !failed && (/not authorised to view/.test(body) || res.status === 403);
    // A not-found page delivered with status 200 (e.g. a streaming boundary committed the status first) would make a
    // refusal look like a rendered page; it is counted as an error so the matrix cannot silently misclassify it.
    const wrongStatus = !failed && res.status === 200 && /<h1[^>]*>Record not found or not within your authorised scope<\/h1>/.test(body);
    if (wrongStatus) console.error(`[audit] ${r} as ${u.id}: not-found page served with status 200`);
    const err = failed || wrongStatus || res.status >= 500 || /Application error|Internal Server Error/.test(body);
    if (err) errors++;
    row.cells.push(err ? "ERR" : res.status === 403 ? "✕" : res.status === 404 ? "404" : res.status >= 300 && res.status < 400 ? "→" : denied ? "✕" : "✓");
  }
  await db.query("DELETE FROM sessions WHERE id = ?", [h]);
  return row;
};
const CONC = Number(process.env.AUDIT_CONCURRENCY ?? 2);
for (let i = 0; i < users.length; i += CONC) results.push(...(await Promise.all(users.slice(i, i + CONC).map(audited))));

const header = `| User (primary role) | ${routes.map((r, i) => `R${i + 1}`).join(" | ")} |`;
const sep = `|---|${routes.map(() => ":-:").join("|")}|`;
const md = [
  "# Route audit evidence",
  "",
  `Generated ${new Date().toISOString()} against ${base} with the synthetic dataset. ✓ = rendered, ✕ = access-denied page (audited), 404 = record outside scope (existence not disclosed), → = redirect, ERR = server error, or a not-found page served with status 200.`,
  "",
  `**Server errors: ${errors}**`,
  "",
  "## Routes",
  "",
  ...routes.map((r, i) => `- R${i + 1}: \`${r.replace(/(req|mnt|mpr|mpc|rv|pas|trf)_[a-z0-9]+/g, (m) => m.slice(0, 8) + "…")}\``),
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
