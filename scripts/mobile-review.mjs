/**
 * Phone-width review of every role's dashboard (synthetic data only).
 * For one account per role (single assignment preferred) it creates a session in the local DB, opens the
 * given routes at 375×812 in Edge (Playwright), records horizontal overflow (and the elements causing it)
 * and saves a full-page screenshot.
 *
 * Usage: node scripts/mobile-review.mjs [baseUrl] [outDir] [routes...]
 *   default baseUrl http://localhost:3100, outDir docs/evidence/mobile, routes /app
 * Writes <outDir>/MOBILE_REVIEW.md.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { chromium } from "@playwright/test";

const [base = "http://localhost:3100", outDir = "docs/evidence/mobile", ...routeArgs] = process.argv.slice(2);
const routes = routeArgs.length ? routeArgs : ["/app"];
if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1].trim();
  }
}
if (!/\/zps_oms_[a-z0-9_]+$/.test(process.env.DATABASE_URL ?? "")) throw new Error("DATABASE_URL must point at a local zps_oms_* synthetic database.");
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL });
const [roles] = await db.query("SELECT code, role_no, name FROM roles WHERE status = 'ACTIVE' ORDER BY role_no");

// One holder per role, preferring users with a single active assignment.
const [holders] = await db.query(`SELECT a.role_code, a.user_id, u.username,
    (SELECT COUNT(*) FROM role_assignments x WHERE x.user_id = a.user_id AND x.revoked_at IS NULL) AS n
  FROM role_assignments a JOIN users u ON u.id = a.user_id WHERE a.revoked_at IS NULL AND u.status = 'ACTIVE' AND u.synthetic = 1 ORDER BY n, u.username`);

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const rows = [];
for (const r of roles) {
  const h = holders.find((x) => x.role_code === r.code);
  if (!h) { rows.push({ r, user: "—", results: [{ route: "-", note: "NO ACCOUNT" }] }); continue; }
  const token = crypto.randomBytes(32).toString("base64url");
  const t = new Date();
  await db.query("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)",
    [crypto.createHash("sha256").update(token).digest("hex"), h.user_id, t.toISOString(), new Date(t.getTime() + 3600e3).toISOString(), t.toISOString()]);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ name: "zps_session", value: token, url: base }]);
  const page = await ctx.newPage();
  const results = [];
  for (const route of routes) {
    const res = await page.goto(base + route, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const wide = [];
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.right > vw + 1 && getComputedStyle(el).position !== "fixed") {
          let p = el.parentElement, clipped = false;
          while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") { clipped = true; break; } p = p.parentElement; }
          if (!clipped) wide.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).slice(0, 3).join(".") : ""} (${Math.round(b.right)}px)`);
        }
      }
      return { vw, sw, wide: wide.slice(0, 5) };
    });
    const file = `${outDir}/${String(r.role_no).padStart(2, "0")}-${r.code.toLowerCase()}${route === "/app" ? "" : route.replace(/[^a-z0-9]+/gi, "-")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    // Optional screen-height slices for close review (ZPS_SLICES=<dir>).
    if (process.env.ZPS_SLICES) {
      fs.mkdirSync(process.env.ZPS_SLICES, { recursive: true });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, i = 0; y < height && i < 8; y += 1100, i++) {
        await page.screenshot({ path: `${process.env.ZPS_SLICES}/${file.split("/").pop().replace(".png", "")}-${i}.png`, fullPage: true, clip: { x: 0, y, width: 375, height: Math.min(1100, height - y) } });
      }
    }
    results.push({ route, status: res?.status(), overflow: m.sw > m.vw ? m.sw - m.vw : 0, wide: m.wide, file });
  }
  rows.push({ r, user: h.username, results });
  await ctx.close();
}
await browser.close();
await db.end();

const md = ["# Phone-width review (375 × 812)", "", `Generated ${new Date().toISOString()} against ${base}. Overflow = horizontal page overflow in CSS pixels (0 = none). Synthetic data only.`, "",
  "| No. | Role | Account | Route | HTTP | Overflow | Elements past the edge |", "|--:|---|---|---|:-:|--:|---|"];
for (const { r, user, results } of rows) for (const x of results) md.push(`| ${String(r.role_no).padStart(2, "0")} | ${r.name} | ${user} | ${x.route} | ${x.status ?? "-"} | ${x.overflow ?? "-"} | ${(x.wide ?? []).join("; ") || x.note || "—"} |`);
fs.writeFileSync(`${outDir}/MOBILE_REVIEW.md`, md.join("\n") + "\n");
const bad = rows.flatMap((x) => x.results.filter((y) => y.overflow || y.note));
console.log(`Reviewed ${rows.length} roles × ${routes.length} route(s); ${bad.length} with overflow or problems.`);
for (const b of bad) console.log(" -", b.file ?? b.note, b.overflow, b.wide?.join("; "));
