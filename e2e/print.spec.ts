/**
 * A4 print output (UI_UX_DESIGN_SYSTEM print rules; PRD roster print requirement).
 * For the roster print view, a report, the dashboard and the public pages:
 *  - with print media emulated at the A4 printable width (210 mm − 2 × 15 mm = 180 mm = 680 CSS px), nothing is
 *    wider than the paper, no scroll region hides content, and on-screen chrome (navigation, sidebar, buttons) is hidden;
 *  - the browser's PDF output is A4 portrait (595 × 842 pt) and has at least one page.
 * Writes docs/evidence/print.md and fails on any finding. Synthetic data only.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import mysql from "mysql2/promise";
import { DEV_PASSWORD, e2eDatabaseUrl } from "./env";

const A4_PRINTABLE_PX = 680; // 180 mm at 96 CSS px per inch
type Result = { path: string; pages: number; mediaBox: string; findings: string[] };
const results: Result[] = [];

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

async function checkPrint(page: Page, path: string, mustContain: string, app = false) {
  await page.setViewportSize({ width: A4_PRINTABLE_PX, height: 1000 });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.emulateMedia({ media: "print" });
  const findings = await page.evaluate(({ max, text, app }) => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > max + 1) out.push(`document is ${doc.scrollWidth}px wide (> ${max}px)`);
    if (!document.body.innerText.includes(text)) out.push(`missing expected content "${text}"`);
    // On-screen chrome must not print: site navigation everywhere; in the back office also the sidebar and buttons.
    for (const sel of ["header nav", "nav[aria-label='Main']", "[aria-label='Breadcrumb']", ...(app ? ["aside", "button"] : [])]) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") { out.push(`visible on paper: ${sel} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`); break; }
      }
    }
    // A region that scrolls sideways on screen would cut its content off on paper.
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const ox = getComputedStyle(el).overflowX;
      // Visually hidden helpers (skip link, sr-only text) are 1 px boxes by design and do not print.
      if (el.clientWidth <= 1) continue;
      if ((ox === "auto" || ox === "scroll" || ox === "hidden") && el.scrollWidth > el.clientWidth + 1) {
        out.push(`content cut off: ${el.tagName.toLowerCase()} needs ${el.scrollWidth}px, has ${el.clientWidth}px`);
        break;
      }
    }
    return out;
  }, { max: A4_PRINTABLE_PX, text: mustContain, app });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const raw = pdf.toString("latin1");
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  const box = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  const mediaBox = box ? `${Math.round(Number(box[1]))} × ${Math.round(Number(box[2]))} pt` : "unknown";
  if (pages < 1) findings.push("PDF has no pages");
  if (!box || Math.abs(Number(box[1]) - 595) > 2 || Math.abs(Number(box[2]) - 842) > 2) findings.push(`page size ${mediaBox}, expected A4 portrait 595 × 842 pt`);
  await page.emulateMedia({ media: "screen" });
  results.push({ path, pages, mediaBox, findings });
}

test.describe.configure({ mode: "serial" });

test("A4 print: roster print view, report, dashboard and public pages", async ({ page }) => {
  test.setTimeout(600_000);
  const db = await mysql.createConnection({ uri: e2eDatabaseUrl() });
  const [[roster]] = (await db.query("SELECT v.id, r.reference FROM roster_versions v JOIN manpower_requests r ON r.id = v.request_id WHERE v.status = 'FINALISED' ORDER BY v.created_at LIMIT 1")) as unknown as [[{ id: string; reference: string }]];
  const [[user]] = (await db.query("SELECT username FROM users WHERE id = 'u_cb_sops'")) as unknown as [[{ username: string }]];
  await db.end();

  for (const [path, text] of [["/", "ZPS-OMS"], ["/about", "ZPS-OMS"], ["/features", "ZPS-OMS"], ["/contact", "ZPS-OMS"]]) await checkPrint(page, path, text);
  await login(page, user.username);
  await checkPrint(page, `/app/rosters/${roster.id}/print`, roster.reference, true);
  await checkPrint(page, "/app/reports/PERSONNEL_BY_UNIT", "Personnel", true);
  await checkPrint(page, "/app", "ZPS-OMS", true);

  const md = ["# A4 print check", "", `Generated ${new Date().toISOString()} · print media emulated at the A4 printable width (180 mm = ${A4_PRINTABLE_PX} CSS px, 15 mm margins); PDF produced by the browser's print engine. Synthetic data only.`, "",
    "| Page | PDF pages | Page size | Findings |", "|---|--:|---|---|"];
  for (const r of results) md.push(`| \`${r.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}|rv_[a-z0-9_]+/gi, "[id]")}\` | ${r.pages} | ${r.mediaBox} | ${r.findings.length ? r.findings.join("; ").replace(/\|/g, "\\|") : "None"} |`);
  const total = results.reduce((n, r) => n + r.findings.length, 0);
  md.push("", `**Findings: ${total}**`, "");
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/print.md", md.join("\n"));
  expect(results.filter((r) => r.findings.length), JSON.stringify(results, null, 1)).toEqual([]);
});
