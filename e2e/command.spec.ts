/**
 * Command and reporting in a real browser (DEC-074 … DEC-077): the IG's national command overview, a directive issued
 * downward and acknowledged, the Area Commander's parallel report acknowledged separately by both channels and forwarded
 * by the primary chain, an appointment-only Constable, and a refused out-of-chain report. axe-core WCAG 2.2 AA on every
 * command page visited. Writes docs/evidence/accessibility-command.md. Synthetic data only.
 */
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const rows: string[] = [];
const violations: Array<{ path: string; id: string }> = [];
async function scan(page: Page, who: string) {
  await page.waitForLoadState("networkidle");
  const path = page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  for (const v of r.violations) violations.push({ path, id: v.id });
  rows.push(`| \`${path.replace(/(dir|rpt|cnf)_[0-9a-f]+/, "$1_[id]")}\` | ${who} | ${r.violations.length} | ${r.violations.map((v) => `\`${v.id}\``).join(", ") || "—"} |`);
}

test.describe.configure({ mode: "serial" });
let reportPath = "";

test("IG: national command overview; a directive issued downward to DIG Operations; no upward route offered", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.hq.readonly");
  await expect(page.getByRole("heading", { name: "National command" })).toBeVisible();
  await page.goto("/app/command");
  await expect(page.getByRole("heading", { name: "National Command Overview" })).toBeVisible();
  await scan(page, "IG");
  await page.goto("/app/command/directives/new");
  const options = await page.getByLabel("From → to").locator("option").allTextContents();
  expect(options.some((o) => o.includes("Inspector General of Police → Deputy Inspector General of Police - Operations"))).toBe(true);
  expect(options.some((o) => / → Inspector General/.test(o))).toBe(false);
  await scan(page, "IG");
  await page.getByLabel("From → to").selectOption("pos_ig|pos_dig_ops");
  await page.getByLabel("Administrative subject").fill("Browser test: national administrative instruction");
  await page.getByLabel("General instructions").fill("Synthetic instruction issued from the browser test.");
  await page.getByRole("button", { name: "Issue directive" }).click();
  await page.waitForURL(/\/app\/command\/directives\/dir_/, { timeout: 120_000 });
  await expect(page.getByText("Directive issued. The receiving office has been notified.")).toBeVisible();
  await scan(page, "IG");
  await page.goto("/app/command/structure");
  await expect(page.getByText("is the highest command authority and has no superior office")).toBeVisible();
  await scan(page, "IG");
});

test("DIG Operations acknowledges the directive and cannot instruct the IG", async ({ page }) => {
  await login(page, "demo.dig.exec");
  await page.goto("/app/command/directives");
  await page.getByRole("row", { name: /Browser test: national administrative instruction/ }).getByRole("link").first().click();
  await page.waitForURL(/\/app\/command\/directives\/dir_/);
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await page.waitForURL(/done=/, { timeout: 120_000 });
  await expect(page.getByText("Acknowledged.")).toBeVisible();
  await page.goto("/app/command/directives/new");
  const options = await page.getByLabel("From → to").locator("option").allTextContents();
  expect(options.some((o) => / → Inspector General/.test(o))).toBe(false);
});

test("Area Commander: one report to three offices; separate acknowledgements; primary review and forward", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.mu.acoy.commander");
  await page.goto("/app/command/reports/new");
  await expect(page.getByText("Parallel: Operations Officer, Kitwe District, Officer Commanding, Kitwe District")).toBeVisible();
  await scan(page, "Area Commander");
  await page.getByLabel("General administrative summary").fill("Browser test: weekly area administrative status (synthetic).");
  await page.getByRole("button", { name: "Save report" }).click();
  await page.waitForURL(/\/app\/command\/reports\/rpt_/, { timeout: 120_000 });
  await expect(page.getByText("Report submitted to the designated recipients.")).toBeVisible();
  reportPath = page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const recipients = page.getByRole("table", { name: "Report recipients" });
  await expect(recipients.getByRole("row")).toHaveCount(4);
  await scan(page, "Area Commander");

  for (const user of ["demo.kitwe.ops", "demo.kitwe.commander"]) {
    await login(page, user);
    await page.goto(reportPath);
    await page.getByRole("button", { name: "Acknowledge receipt" }).click();
    await page.waitForURL(/done=/, { timeout: 120_000 });
    await expect(page.getByText("Receipt acknowledged.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Return for correction" })).toHaveCount(0);
  }
  await login(page, "demo.mu.staff2");
  await page.goto(reportPath);
  await page.getByRole("button", { name: "Acknowledge receipt" }).click();
  await page.waitForURL(/done=Receipt/, { timeout: 120_000 });
  await page.getByRole("button", { name: "Recommend" }).click();
  await page.waitForURL(/done=Review/, { timeout: 120_000 });
  await page.getByRole("button", { name: "Forward to next superior" }).click();
  await page.waitForURL(/done=Report%20forwarded/, { timeout: 120_000 });
  await expect(page.getByText("Report forwarded to the next superior office.")).toBeVisible();
  const table = page.getByRole("table", { name: "Report recipients" });
  await expect(table.getByText("Senior Staff Officer Operations (Staff I), Mobile Unit")).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(5);
  await scan(page, "Staff II");
});

test("appointment-only Constable sees only its own command work; an out-of-chain office gets 404", async ({ page }) => {
  await login(page, "demo.mu.constable");
  await expect(page.getByText("Command appointment · no application role")).toBeVisible();
  await scan(page, "Constable");
  await page.goto("/app/personnel");
  await expect(page.getByText(/not authorised to view/).first()).toBeVisible();
  const r = await page.goto(reportPath);
  expect(r?.status()).toBe(404);
  await login(page, "demo.lsk.commander");
  const r2 = await page.goto(reportPath);
  expect(r2?.status()).toBe(404);
});

test.afterAll(() => {
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility-command.md", ["# Accessibility scan — command and reporting pages (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "",
    `Generated ${new Date().toISOString()}. Synthetic data only.`, "", `**Violations: ${violations.length}**`, "", "| Page | Account | Violations | Rules |", "|---|---|--:|---|", ...rows, ""].join("\n"));
});

test("no accessibility violations on the command pages", () => {
  expect(violations, JSON.stringify(violations)).toEqual([]);
});
