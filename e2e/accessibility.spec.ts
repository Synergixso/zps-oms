/**
 * Automated accessibility scan (NFR-006, WCAG 2.2 AA) with axe-core.
 * Public pages and the sign-in page, then the dashboard and Help page of one account per role (27 roles).
 * Writes docs/evidence/accessibility.md and fails on any violation. Synthetic data only.
 */
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import mysql from "mysql2/promise";
import { DEV_PASSWORD, e2eDatabaseUrl } from "./env";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
type Finding = { page: string; who: string; id: string; impact: string; help: string; nodes: number; target: string };
const findings: Finding[] = [];
let scanned = 0;

async function scan(page: Page, label: string, who: string) {
  await page.waitForLoadState("networkidle");
  // The Next.js development badge is not part of the application.
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  scanned++;
  for (const v of r.violations) findings.push({ page: label, who, id: v.id, impact: v.impact ?? "", help: v.help, nodes: v.nodes.length, target: String(v.nodes[0]?.target ?? "") });
}

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

test.describe.configure({ mode: "serial" });

test("WCAG 2.2 AA: public pages, sign-in, and every role's dashboard and Help page", async ({ page }) => {
  test.setTimeout(900_000);
  for (const path of ["/", "/about", "/features", "/technical-team", "/how-it-works", "/contact", "/login"]) {
    await page.goto(path);
    await scan(page, path, "public");
  }
  const db = await mysql.createConnection({ uri: e2eDatabaseUrl() });
  const [rows] = (await db.query(`SELECT r.role_no, r.code, (SELECT u.username FROM role_assignments a JOIN users u ON u.id = a.user_id
      WHERE a.role_code = r.code AND a.revoked_at IS NULL AND u.status = 'ACTIVE' ORDER BY u.username LIMIT 1) AS username
    FROM roles r WHERE r.status = 'ACTIVE' ORDER BY r.role_no`)) as unknown as [Array<{ role_no: number; code: string; username: string }>];
  await db.end();
  expect(rows).toHaveLength(27);
  for (const r of rows) {
    await login(page, r.username);
    await scan(page, "/app", `${String(r.role_no).padStart(2, "0")} ${r.code}`);
    await page.goto("/app/help");
    await scan(page, "/app/help", `${String(r.role_no).padStart(2, "0")} ${r.code}`);
  }

  // Evidence report: one row per rule, with where it occurred.
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) byRule.set(f.id, [...(byRule.get(f.id) ?? []), f]);
  const md = ["# Accessibility scan (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "", `Generated ${new Date().toISOString()} · ${scanned} page views scanned (7 public pages; dashboard and Help page for one account per role, 27 roles). Synthetic data only.`, "",
    `**Violations: ${findings.length}**`, ""];
  if (byRule.size) {
    md.push("| Rule | Impact | Description | Occurrences | Example page / role | Example element |", "|---|---|---|--:|---|---|");
    for (const [id, fs_] of byRule) md.push(`| \`${id}\` | ${fs_[0].impact} | ${fs_[0].help} | ${fs_.length} | ${fs_[0].page} (${fs_[0].who}) | \`${fs_[0].target.replace(/\|/g, "\\|").slice(0, 80)}\` |`);
  } else md.push("No violations of the automated WCAG A/AA rules. Automated rules cover part of WCAG; a manual review (keyboard, screen reader, content) is still required.");
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility.md", md.join("\n") + "\n");
  expect(findings, JSON.stringify([...byRule.keys()])).toEqual([]);
});
