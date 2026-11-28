/**
 * Kamfinsa Mobile Unit field command in a real browser (institutional directive 28 Nov 2026; DEC-078 … DEC-080):
 * the Platoon Commander records the day's attendance; the Area Commander sees it as counts only, records a partner
 * engagement and cannot open the platoon workspace; the HQ Company Commander sees HQ 5 Detachment (Kitwe); the HQ 5
 * Detachment Commander sees its reporting line. axe-core WCAG 2.2 AA on every page visited.
 * Writes docs/evidence/accessibility-field-command.md. Synthetic data only.
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
  rows.push(`| \`${path}\` | ${who} | ${r.violations.length} | ${r.violations.map((v) => `\`${v.id}\``).join(", ") || "—"} |`);
}

test.describe.configure({ mode: "serial" });

test("Platoon Commander records today's attendance for the officers on the ground", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.mu.plt.commander");
  await expect(page.getByRole("link", { name: "Platoon command" }).first()).toBeVisible();
  await page.goto("/app/command/platoon");
  await expect(page.getByText("Directly in charge of the officers on the ground")).toBeVisible();
  await expect(page.getByText("Not yet recorded for this date")).toBeVisible();
  await scan(page, "Platoon Commander");
  await page.getByRole("combobox", { name: /^Attendance of / }).first().selectOption("SICK");
  await page.getByRole("button", { name: "Record attendance" }).click();
  await page.waitForURL(/done=/, { timeout: 120_000 });
  await expect(page.getByText(/Attendance for \d{4}-\d{2}-\d{2} recorded\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save correction" })).toBeVisible();
  await scan(page, "Platoon Commander");
});

test("Area Commander sees attendance as counts, records a partner engagement, and cannot open the platoon workspace", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.mu.acoy.commander");
  await page.goto("/app/command/area");
  const row = page.getByRole("table", { name: "Platoon attendance counts" }).getByRole("row").nth(1);
  await expect(row).toContainText("Demo 1 Platoon Commander");
  await expect(page.getByRole("table", { name: "Platoon attendance counts" })).not.toContainText("PER-");
  await expect(page.getByRole("table", { name: "Reporting line" })).toContainText("Officer Commanding, Kitwe District");
  await scan(page, "Area Commander");
  await page.getByLabel("Partner organisation").fill("Demo Mine Management (synthetic)");
  await page.getByLabel("Type").selectOption("SECURITY_COORDINATION_MEETING");
  await page.getByLabel("Official record reference").fill("SYN-MTG-E2E-1");
  await page.getByRole("button", { name: "Record engagement" }).click();
  await page.waitForURL(/done=/, { timeout: 120_000 });
  await expect(page.getByText(/Engagement ENG-\d{4}-\d{6} recorded\./)).toBeVisible();
  await expect(page.getByRole("table", { name: "Partner-organisation engagements" })).toContainText("SYN-MTG-E2E-1");
  await scan(page, "Area Commander");
  await page.goto("/app/command/platoon?office=pos_mu_plt");
  await expect(page.getByText("You do not hold a Platoon Commander office")).toBeVisible();
});

test("HQ Company Commander sees HQ 5 Detachment at Kitwe; the Detachment Commander sees its reporting line", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.mu.hqcoy.commander");
  await page.goto("/app/command/company");
  const det = page.getByRole("table", { name: "Detachments" });
  await expect(det).toContainText("HQ 5 Detachment");
  await expect(det).toContainText("Kitwe, Copperbelt Province");
  await expect(det).toContainText("Demo HQ 5 Detachment Commander");
  await scan(page, "HQ Company Commander");
  await login(page, "demo.mu.hq5.commander");
  await page.goto("/app/command/company");
  const line = page.getByRole("table", { name: "Reporting line" });
  await expect(line).toContainText("Company Commander, HQ Company");
  await expect(line).toContainText("Deputy Company Commander, HQ Company");
  await scan(page, "HQ 5 Detachment Commander");
  const r = await page.goto("/app/command/company?office=pos_mu_d3_dc");
  expect(r?.status()).toBe(404);
});

test("controlled import: a registry officer validates a synthetic CSV and sees each row's result (#8)", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, "demo.cb.personnel");
  await page.goto("/app/import");
  await expect(page.getByText("Development environment — synthetic data only")).toBeVisible();
  await scan(page, "Personnel records officer");
  const csv = ["service_number,surname,first_names,rank_code,home_unit_code", "SYN-970001,Demo Browser,Demo Import,PC,DC-CB-KIT", "12345678,Demo Real,Demo Looking,PC,DC-CB-KIT", ""].join(String.fromCharCode(10));
  await page.locator("#file-PERSONNEL").setInputFiles({ name: "personnel.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Validate file" }).click();
  const results = page.getByRole("table", { name: "Validation result for each row" });
  await expect(results).toContainText("synthetic service number", { timeout: 60_000 });
  await expect(page.getByRole("button", { name: /^Import / })).toHaveCount(0); // a file with an error cannot be imported
  await scan(page, "Personnel records officer");
});

test.afterAll(() => {
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility-field-command.md", ["# Accessibility scan — Kamfinsa Mobile Unit field command pages (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "",
    `Generated ${new Date().toISOString()}. Synthetic data only.`, "", `**Violations: ${violations.length}**`, "", "| Page | Account | Violations | Rules |", "|---|---|--:|---|", ...rows, ""].join("\n"));
});

test("no accessibility violations on the field command pages", () => {
  expect(violations, JSON.stringify(violations)).toEqual([]);
});
