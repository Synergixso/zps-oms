/**
 * Security probes over HTTP (attacker's view, no interface): authentication redirects, cross-Division access,
 * technical-role separation, download-route traversal and injection, setup closure, retired-route redirect,
 * reflected-input escaping, parameter abuse and liaison-administration scope (roles 07, 19, 30, 31). Read-only apart from temporary sessions, which are deleted.
 * Usage: node scripts/security-probe.mjs [baseUrl]   (local server and synthetic zps_oms_* database only). Exits 1 on any failure.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
const base = process.argv[2] ?? "http://localhost:3100";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("Local servers only.");
const url = process.env.DATABASE_URL ?? fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim();
if (!/\/zps_oms_[a-z0-9_]+$/.test(url)) throw new Error("DATABASE_URL must point at a local zps_oms_* synthetic database.");
const db = await mysql.createConnection({ uri: url });
const made = [];
async function session(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const h = crypto.createHash("sha256").update(token).digest("hex");
  const t = new Date();
  await db.query("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)", [h, userId, t.toISOString(), new Date(+t + 6e5).toISOString(), t.toISOString()]);
  made.push(h);
  return token;
}
const get = async (path, token) => {
  const r = await fetch(base + path, { headers: token ? { cookie: `zps_session=${token}` } : {}, redirect: "manual" });
  const body = await r.text();
  return { status: r.status, location: r.headers.get("location"), csp: r.headers.get("content-security-policy"), cd: r.headers.get("content-disposition"), body };
};
const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const [[cbRec]] = await db.query("SELECT id FROM correspondence WHERE org_unit_id = 'org_cb' LIMIT 1");
const [[ev]] = await db.query("SELECT id FROM admin_calendar_events WHERE org_unit_id = 'org_cb' LIMIT 1");
const [[file]] = await db.query("SELECT id FROM correspondence_files WHERE removed_at IS NULL LIMIT 1");

// 1. Unauthenticated access is redirected to sign-in.
for (const p of ["/app/calendar", `/app/correspondence/${cbRec.id}`, file ? `/app/correspondence/files/${file.id}` : "/app/correspondence/files/cfl_x"]) {
  const r = await get(p);
  check(`unauthenticated ${p}`, [302, 303, 307].includes(r.status) && /login/.test(r.location ?? ""), `${r.status} → ${r.location}`);
}
// 2. Another Division cannot open Copperbelt records (neutral 404, existence not disclosed).
const lsk = await session("u_lsk_sops");
for (const p of [`/app/correspondence/${cbRec.id}`, `/app/calendar/${ev.id}`]) {
  const r = await get(p, lsk);
  check(`Lusaka staff → ${p}`, r.status === 404, `${r.status}`);
}
// 3. A technical administrator sees the access-denied page for the business modules.
const tech = await session("u_cb_tech");
for (const p of ["/app/calendar", "/app/correspondence"]) {
  const r = await get(p, tech);
  check(`tech admin → ${p}`, r.status === 200 && /not authorised|Access denied|access to/i.test(r.body) && !/CORR-20/.test(r.body), `${r.status}`);
}
// 4. Path traversal and malformed ids on the download route.
for (const p of ["/app/correspondence/files/..%2F..%2Fpackage.json", "/app/correspondence/files/%27%20OR%201%3D1--", "/app/correspondence/files/cfl_doesnotexist"]) {
  const r = await get(p, await session("u_cb_sops"));
  check(`download probe ${p}`, [404, 400].includes(r.status) && !/"dependencies"/.test(r.body), `${r.status}`);
}
// 4b. Liaison administration (roles 07, 19, 30, 31): another Province gets a neutral 404; a station officer cannot see a
// division-held record outside its unit; liaison officers get the access-denied page for every operational register;
// a non-liaison role cannot open liaison pages; record ids are not guessable through malformed input.
const [[liaCb]] = await db.query("SELECT id FROM liaison_records WHERE external_reference = 'SYN-HQ-RPT-0004'");
if (liaCb) {
  for (const [who, uid] of [["Lusaka district liaison", "u_lsk_pio"], ["Section liaison (Mobile Unit)", "u_mus_pio"], ["Kitwe Central station liaison", "u_kitc_pio"]]) {
    const r = await get(`/app/liaison/records/${liaCb.id}`, await session(uid));
    check(`${who} → Copperbelt/HQ liaison record`, r.status === 404 && !/SYN-HQ-RPT-0004/.test(r.body), `${r.status}`);
  }
  const pio = await session("u_kitc_pio");
  for (const p of ["/app/personnel", "/app/manpower", "/app/assignments", "/app/audit", "/app/correspondence"]) {
    const r = await get(p, pio);
    check(`liaison officer → ${p}`, r.status === 200 && /not authorised to view/i.test(r.body) && !/<td[^>]*>[^<]*SYN-PER/.test(r.body), `${r.status}`);
  }
  const staff = await session("u_cb_sops");
  for (const p of ["/app/liaison", `/app/liaison/records/${liaCb.id}`, "/app/liaison/history"]) {
    const r = await get(p, staff);
    check(`non-liaison role → ${p}`, r.status === 200 && /not authorised to view/i.test(r.body) && !/LIA-20\d\d-/.test(r.body), `${r.status}`);
  }
  for (const p of ["/app/liaison/records/..%2F..%2Fpackage.json", "/app/liaison/records/%27%20OR%201%3D1--"]) {
    const r = await get(p, await session("u_hq_pio"));
    check(`liaison id probe ${p}`, r.status === 404 && !/"dependencies"/.test(r.body), `${r.status}`);
  }
} else check("liaison records seeded", false, "seed step 013 has not run");
// 4c. Command and reporting: offices outside a directive's or report's chain get a neutral 404; technical administrators and
// appointment-only accounts reach nothing outside their own command work.
const [[cmdDir]] = await db.query("SELECT id FROM command_directives WHERE parent_id IS NULL ORDER BY created_at LIMIT 1");
const [[cmdRpt]] = await db.query("SELECT id FROM status_reports WHERE reporter_position_id = 'pos_mu_area_a' ORDER BY created_at LIMIT 1");
if (cmdDir && cmdRpt) {
  for (const [who, uid] of [["Lusaka Divisional Commander", "u_lsk_cmd"], ["Kitwe Central Station Inspector", "u_kitc_ops"], ["Copperbelt technical administrator", "u_cb_tech"]]) {
    const tok = await session(uid);
    for (const p of [`/app/command/directives/${cmdDir.id}`, `/app/command/reports/${cmdRpt.id}`]) {
      const r = await get(p, tok);
      check(`${who} → ${p.replace(/(dir|rpt)_[0-9a-f]+/, "$1_[id]")}`, r.status === 404 && !/DIR-20|RPT-20/.test(r.body), `${r.status}`);
    }
  }
  const cst = await session("u_mu_cst");
  for (const p of ["/app/personnel", "/app/command/structure", "/app/admin/users"]) {
    const r = await get(p, cst);
    check(`appointment-only constable → ${p}`, r.status === 200 && /not authorised to view/i.test(r.body), `${r.status}`);
  }
  const tech = await session("u_cb_tech");
  const r = await get("/app/command", tech);
  check("technical administrator → /app/command (no office)", r.status === 200 && /do not hold a command office/i.test(r.body), `${r.status}`);
} else check("command records seeded", false, "seed step 014 has not run");
// 4c. Field command workspaces (institutional directive 28 Nov 2026): office-based, out-of-scope offices are a neutral 404,
// the Area Commander never receives individual attendance or personnel, and a Detachment cannot open another Company.
const [[kmu]] = await db.query("SELECT COUNT(*) AS c FROM command_positions WHERE id IN ('pos_mu_hq_cc','pos_mu_hq5_dc','pos_mu_d3_dc','pos_mu_plt','pos_mu_area_a')");
if (Number(kmu.c) === 5) {
  const [[member]] = await db.query("SELECT personnel_ref FROM personnel_records WHERE home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_mu_a1p1') AND employment_status = 'SERVING' LIMIT 1");
  const d3 = await session("u_mu_d3"), area = await session("u_mu_acoy"), plt = await session("u_mu_plt");
  for (const p of ["/app/command/company?office=pos_mu_hq_cc", "/app/command/company?office=pos_mu_hq5_dc"]) {
    const r = await get(p, d3);
    check(`D3 Detachment Commander → ${p}`, r.status === 404, `${r.status}`);
  }
  const a = await get("/app/command/platoon?office=pos_mu_plt", area);
  check("Area Commander → Platoon workspace (no platoon office, no personnel)", a.status === 200 && /do not hold a Platoon Commander office/i.test(a.body) && !a.body.includes(member.personnel_ref), `${a.status}`);
  const ar = await get("/app/command/area", area);
  check("Area Commander workspace shows counts, not personnel", ar.status === 200 && /Platoons under this area command/.test(ar.body) && !ar.body.includes(member.personnel_ref), `${ar.status}`);
  const pa = await get("/app/command/area?office=pos_mu_area_a", plt);
  check("Platoon Commander → Area workspace (no area office)", pa.status === 200 && /do not hold an Area Commander office/i.test(pa.body) && !/Partner-organisation engagements/.test(pa.body), `${pa.status}`);
  const pl = await get("/app/command/platoon?office=pos_mu_area_a", plt);
  check("Platoon Commander → foreign office id", pl.status === 404, `${pl.status}`);
} else check("KMU command structure seeded", false, "seed step 016 has not run");
// 4d. Controlled import (#8): technical administrators get the access-denied page; a registry officer gets the form.
{
  const t = await get("/app/import", await session("u_cb_tech"));
  check("tech admin → /app/import", t.status === 200 && /not authorised/i.test(t.body) && !/Validate file/.test(t.body), `${t.status}`);
  const o = await get("/app/import", await session("u_cb_per"));
  check("personnel officer → /app/import (form, synthetic-only notice)", o.status === 200 && /Validate file/.test(o.body) && /synthetic/i.test(o.body), `${o.status}`);
}
// 4e. Executive portfolios (DEC-086 … DEC-088): offices see only their mandate; restricted coordination; scoped registers.
{
  const [[cr]] = await db.query("SELECT id FROM coordination_requests WHERE requesting_position_id = 'pos_dig_ops' AND receiving_position_id = 'pos_dig_sd' LIMIT 1");
  const [[act]] = await db.query("SELECT id FROM ops_activities WHERE responsible_unit_id = 'org_cb' LIMIT 1");
  if (cr && act) {
    const adm = await session("u_digadm"), sd = await session("u_digsd"), lsk = await session("u_lsk_sops"), tech2 = await session("u_cb_tech");
    const a1 = await get("/app/operations", adm);
    check("DIG Administration → operations register (not authorised)", a1.status === 200 && /not authorised/i.test(a1.body), `${a1.status}`);
    const a2 = await get(`/app/coordination/${cr.id}`, adm);
    check("DIG Administration → Ops↔Special Duties request (404)", a2.status === 404, `${a2.status}`);
    const a3 = await get("/app/training", sd);
    check("DIG Special Duties → training (not authorised)", a3.status === 200 && /not authorised/i.test(a3.body), `${a3.status}`);
    const a4 = await get(`/app/operations/${act.id}`, lsk);
    check("Lusaka staff → Copperbelt operations record (404)", a4.status === 404, `${a4.status}`);
    const a5 = await get("/app/training", tech2);
    check("technical administrator → training (not authorised)", a5.status === 200 && /not authorised/i.test(a5.body), `${a5.status}`);
    const a6 = await get(`/app/coordination/${cr.id}`, sd);
    check("DIG Special Duties → its own request (200)", a6.status === 200 && /Respond|Request/.test(a6.body), `${a6.status}`);
  } else check("portfolio data seeded", false, "seed step 019 has not run");
}
// 5. Setup is closed on a database with accounts; /modules redirects.
const s = await get("/setup");
check("/setup closed", s.status === 200 && /Setup has been completed/.test(s.body) && !/name="token"/.test(s.body), `${s.status}`);
const m = await get("/modules");
check("/modules redirect", [301, 308].includes(m.status) && /\/features$/.test(m.location ?? ""), `${m.status} → ${m.location}`);
// 6. Reflected input is escaped (search term echoed in the correspondence filter).
const x = await get("/app/correspondence?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E", await session("u_cb_sops"));
check("reflected search escaped", !x.body.includes("<script>alert(1)</script>"), `${x.status}`);
// 7. Calendar range abuse is bounded (a huge month value falls back, no error).
const c = await get("/app/calendar?month=9999-99", await session("u_cb_sops"));
check("calendar bad month", c.status === 200, `${c.status}`);

// 8. Inline styles are refused in production (KNOWN_ISSUES 14): style-src has no 'unsafe-inline', and the pages send no
// style attributes or inline <style> elements that the policy would block. Development keeps 'unsafe-inline' for the
// Next.js dev server, so this probe applies to production builds only.
const home = await get("/login");
const production = !/'unsafe-eval'/.test(home.csp ?? "");
if (production) {
  const styleSrc = (home.csp ?? "").split("; ").find((d) => d.startsWith("style-src ")) ?? "";
  check("production style-src refuses inline styles", styleSrc === "style-src 'self'", styleSrc);
  const [[asg]] = await db.query("SELECT id FROM personnel_assignments WHERE status = 'ACTIVE' AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb') LIMIT 1");
  const [[dir]] = await db.query("SELECT id FROM command_directives WHERE issuer_position_id = 'pos_ig' LIMIT 1");
  const pages = [
    ["/login"], ["/"], ["/how-it-works"], ["/features"],
    ["/app", "u_cb_sops"], ["/app/org", "u_cb_sops"], ["/app/calendar", "u_cb_sops"], ["/app", "u_rom"], ["/app", "u_hqc"],
    ...(asg ? [[`/app/assignments/${asg.id}`, "u_cb_sops"]] : []), ...(dir ? [[`/app/command/directives/${dir.id}`, "u_rom"]] : []),
  ];
  const inline = [];
  for (const [path, user] of pages) {
    const r = await get(path, user ? await session(user) : undefined);
    if (r.status !== 200) inline.push(`${path}: status ${r.status}`);
    else if (/<[a-z][^>]*\sstyle=|<style[\s>]/i.test(r.body)) inline.push(path);
  }
  check(`no inline styles on ${pages.length} pages`, inline.length === 0, inline.join(", ") || "none");
}

for (const h of made) await db.query("DELETE FROM sessions WHERE id = ?", [h]);
await db.end();
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.detail})`);
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
