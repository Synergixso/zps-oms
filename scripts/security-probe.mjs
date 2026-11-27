/**
 * Security probes over HTTP (attacker's view, no interface): authentication redirects, cross-Division access,
 * technical-role separation, download-route traversal and injection, setup closure, retired-route redirect,
 * reflected-input escaping and parameter abuse. Read-only apart from temporary sessions, which are deleted.
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

for (const h of made) await db.query("DELETE FROM sessions WHERE id = ?", [h]);
await db.end();
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.detail})`);
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
