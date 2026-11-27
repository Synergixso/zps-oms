/**
 * WCAG 2.2 A/AA automated rules (axe-core) on the pages added in v0.9.0: calendar, correspondence (list, form,
 * record with documents and history), the profile page's session and history tables, and the public setup page.
 * Appends to docs/evidence/accessibility-modules.md and fails on any violation. Synthetic data only.
 */
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page) {
  await page.waitForLoadState("networkidle");
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  return r.violations.map((v) => ({ id: v.id, impact: v.impact ?? "", help: v.help, target: String(v.nodes[0]?.target ?? "") }));
}

test("WCAG 2.2 AA: calendar, correspondence, sessions and setup pages", async ({ page }) => {
  test.setTimeout(300_000);
  const rows: string[] = [];
  const all: Array<{ path: string; id: string }> = [];
  const record = async (path: string) => {
    const v = await scan(page);
    for (const x of v) all.push({ path, id: x.id });
    rows.push(`| \`${path.replace(/(cor|ace)_[0-9a-f]+/, "$1_[id]")}\` | ${v.length} | ${v.map((x) => `\`${x.id}\``).join(", ") || "—"} |`);
  };
  await page.goto("/setup");
  await record("/setup");
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("demo.cb.staffops");
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
  for (const path of ["/app/calendar", "/app/calendar/new", "/app/correspondence", "/app/correspondence/new", "/app/profile"]) {
    await page.goto(path);
    await record(path);
  }
  // A record page with history, actions and the document form.
  await page.goto("/app/correspondence");
  const first = page.getByRole("link", { name: /^CORR-/ }).first();
  await page.goto((await first.getAttribute("href"))!);
  await record(page.url().replace(/^https?:\/\/[^/]+/, ""));
  await page.goto("/app/calendar");
  const ev = page.locator("a[href^='/app/calendar/ace_']").first();
  if (await ev.count()) {
    await page.goto((await ev.getAttribute("href"))!);
    await record(page.url().replace(/^https?:\/\/[^/]+/, ""));
  }
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility-modules.md", [
    "# Accessibility scan — v0.9.0 pages (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "",
    `Generated ${new Date().toISOString()} as role 10 (Division Staff Officer, Copperbelt). Synthetic data only.`, "",
    `**Violations: ${all.length}**`, "", "| Page | Violations | Rules |", "|---|--:|---|", ...rows, "",
  ].join("\n"));
  expect(all, JSON.stringify(all)).toEqual([]);
});
