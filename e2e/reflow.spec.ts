/**
 * Reflow, zoom and tablet layouts (NFR-006; WCAG 2.2 SC 1.4.10 Reflow and SC 1.4.4 Resize Text).
 * Every page is checked at 320 CSS px wide (equivalent to 1280 px at 400 % zoom) and at 640 CSS px
 * (1280 px at 200 % zoom), and at the tablet widths 768 px and 1024 px: the page itself must not scroll sideways. Wide data tables may scroll inside
 * their own focusable region (permitted by SC 1.4.10 for content that needs two-dimensional layout).
 * Covers the public pages and every distinct back-office page reachable from the navigation of one account per role.
 * Writes docs/evidence/reflow.md and fails on any overflow. Synthetic data only.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import mysql from "mysql2/promise";
import { DEV_PASSWORD, e2eDatabaseUrl } from "./env";
import { settle, watch } from "./settle";

// Reflow widths (WCAG) plus the two tablet layouts: portrait, and landscape where the 268 px sidebar first appears.
const WIDTHS = [
  { w: 320, h: 256, label: "320 px (400 %)" },
  { w: 640, h: 450, label: "640 px (200 %)" },
  { w: 768, h: 1024, label: "768 px (tablet portrait)" },
  { w: 1024, h: 768, label: "1024 px (tablet landscape)" },
];
type Finding = { path: string; who: string; width: number; overflow: number; culprit: string };
const findings: Finding[] = [];
let checks = 0;

/** Horizontal overflow of the document, and the widest element that causes it (outside intended scroll regions). */
async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
    let culprit = "";
    if (overflow > 1) {
      let worst = 0;
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
        if (el.closest("nextjs-portal")) continue;
        // Content inside a container that scrolls sideways on its own is allowed (tables, code).
        let p = el.parentElement, scrolls = false;
        while (p && p !== document.body) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") { scrolls = true; break; }
          p = p.parentElement;
        }
        if (scrolls) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const over = r.right - vw;
        if (over > worst) {
          worst = over;
          const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 4).join(".") : "";
          culprit = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
        }
      }
    }
    return { overflow, culprit };
  });
}

async function check(page: Page, path: string, who: string) {
  for (const v of WIDTHS) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.waitForTimeout(150);
    const m = await measure(page);
    checks++;
    if (m.overflow > 1) findings.push({ path, who, width: v.w, overflow: Math.round(m.overflow), culprit: m.culprit });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
}

async function visit(page: Page, path: string) {
  const res = await page.goto(path);
  await settle(page);
  return res?.status() ?? 0;
}

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1366, height: 900 });
  await visit(page, "/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

test.describe.configure({ mode: "serial" });

// Shared across the tests below (serial, one worker): each distinct page is checked once, as the first role whose
// navigation reaches it. The public pages run first, then one test per tier so no single test runs for long.
const seen = new Set<string>();
let pages = 0;
let roleCount = 0;

async function rolesOfTier(tier: number) {
  const db = await mysql.createConnection({ uri: e2eDatabaseUrl() });
  const [rows] = (await db.query(`SELECT r.role_no, r.code, (SELECT u.username FROM role_assignments a JOIN users u ON u.id = a.user_id
      WHERE a.role_code = r.code AND a.revoked_at IS NULL AND u.status = 'ACTIVE' ORDER BY u.username LIMIT 1) AS username
    FROM roles r WHERE r.status = 'ACTIVE' AND r.tier = ? ORDER BY r.role_no`, [tier])) as unknown as [Array<{ role_no: number; code: string; username: string }>];
  await db.end();
  return rows;
}

test("Reflow: public pages", async ({ page }) => {
  test.setTimeout(300_000);
  for (const path of ["/", "/about", "/features", "/technical-team", "/how-it-works", "/contact", "/login"]) {
    await visit(page, path);
    await check(page, path, "public");
  }
});

for (const [tier, expected] of [[1, 7], [2, 12], [3, 11], [4, 1]] as const) {
  test(`Reflow: back-office pages reached by the Tier ${tier} roles`, async ({ page }) => {
    test.setTimeout(900_000);
    const rows = await rolesOfTier(tier);
    expect(rows).toHaveLength(expected);
    roleCount += rows.length;
    for (const r of rows) {
      const who = `${String(r.role_no).padStart(2, "0")} ${r.code}`;
      expect(r.username, who).toBeTruthy();
      await login(page, r.username);
      const links = await page.$$eval("a[href^='/app']", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
      const paths = ["/app", "/app/help", ...links].map((h) => h.split("#")[0]).filter((h) => h && !h.includes("?"));
      for (const path of paths) {
        // One page per route shape: record ids are covered by their list page's route.
        const shape = path.replace(/\/(?:[0-9a-f-]{8,}|[a-z]{3}_[0-9a-z]{8,})(?=\/|$)/gi, "/[id]");
        if (seen.has(shape)) continue;
        seen.add(shape);
        const status = path === page.url().replace(/^https?:\/\/[^/]+/, "") ? 200 : await visit(page, path);
        if (status !== 200) continue;
        await check(page, path, who);
        pages++;
      }
    }
  });
}

test("Reflow: evidence and result", async () => {
  const md = ["# Reflow, zoom and tablet check (WCAG 2.2 SC 1.4.10 and 1.4.4)", "",
    `Generated ${new Date().toISOString()} · 7 public pages and ${pages} distinct back-office pages (reached from the navigation of one account per role, ${roleCount} roles in four tiers), each at 320 CSS px (400 % zoom), 640 CSS px (200 % zoom), 768 px (tablet portrait) and 1024 px (tablet landscape, sidebar shown): ${checks} checks. Synthetic data only.`, "",
    "Pass condition: the page does not scroll sideways. Wide data tables scroll inside their own focusable region, which SC 1.4.10 permits.", "",
    `**Overflowing pages: ${findings.length}**`, ""];
  if (findings.length) {
    md.push("| Page | Role | Width | Overflow (px) | Widest element |", "|---|---|--:|--:|---|");
    for (const f of findings) md.push(`| \`${f.path}\` | ${f.who} | ${f.width} | ${f.overflow} | \`${f.culprit.replace(/\|/g, "\\|")}\` |`);
  } else md.push("No page scrolls sideways at any width.");
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/reflow.md", md.join("\n") + "\n");
  expect(roleCount).toBe(31);
  expect(findings, JSON.stringify(findings.slice(0, 10), null, 1)).toEqual([]);
});

test.beforeEach(({ page }) => watch(page));
