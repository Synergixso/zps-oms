/**
 * Executive portfolios in a real browser — presentation journeys 1–5 and 10 (final master directive Part I; DEC-086 …
 * DEC-088). IG oversight, DIG Administration training administration, DIG Operations administration, the restricted
 * DIG Operations ↔ DIG Special Duties coordination request, the training chain across offices, and refusals.
 * axe-core WCAG 2.2 AA on every page visited; writes docs/evidence/accessibility-portfolios.md. Synthetic data only.
 */
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD } from "./env";
import { settle, watch } from "./settle";

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await settle(page);
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const rows: string[] = [];
const violations: Array<{ path: string; id: string }> = [];
async function scan(page: Page, who: string) {
  await settle(page);
  const path = page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0].replace(/(tss|crq|ops|ssa)_[0-9a-f]+/, "$1_[id]");
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  for (const v of r.violations) violations.push({ path, id: v.id });
  rows.push(`| \`${path}\` | ${who} | ${r.violations.length} | ${r.violations.map((v) => `\`${v.id}\``).join(", ") || "—"} |`);
}

test.describe.configure({ mode: "serial" });
test.beforeEach(({ page }) => watch(page));

test("Journey 1 — the Inspector General oversees the three DIG portfolios", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, "demo.hq.readonly");
  await expect(page.getByText("Inspector General — national portfolio oversight")).toBeVisible();
  await expect(page.getByRole("table", { name: "Coordination requests" })).toContainText("Deputy Inspector General – Special Duties / State House");
  await scan(page, "Inspector General");
});

test("Journey 2 — DIG Administration administers service-wide training; workforce as counts only", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.dig.admin");
  await expect(page.getByText("Executive appointment")).toBeVisible();
  await expect(page.getByRole("table", { name: "Workforce strength" })).toContainText("Copperbelt Division");
  await scan(page, "DIG Administration");
  await page.goto("/app/training?tab=nominations");
  const row = page.getByRole("row", { name: /Recommended/ }).first();
  await row.getByRole("button", { name: "Approve" }).click();
  await page.waitForURL(/done=Approved/, { timeout: 120_000 });
  await scan(page, "DIG Administration");
  await page.goto("/app/training?tab=catalogue");
  await expect(page.getByRole("table", { name: "Course catalogue" })).toContainText("Public Order Maintenance — Basic Course");
  await scan(page, "DIG Administration");
  await page.goto("/app/operations");
  await expect(page.getByText(/not authorised to view/).first()).toBeVisible(); // Journey 10: no Operations records
});

test("Journey 3 — DIG Operations: operations administration and mining security services", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.dig.exec");
  await expect(page.getByText("DIG Operations — nationwide operations administration")).toBeVisible();
  await page.goto("/app/operations?category=ILLEGAL_MINING");
  await scan(page, "DIG Operations");
  await page.getByRole("link", { name: /^IMA-/ }).first().click();
  await expect(page.getByRole("table", { name: "Record history" })).toContainText("Resource request");
  await scan(page, "DIG Operations");
  await page.goto("/app/operations/security-services");
  await expect(page.getByRole("table", { name: "Mining security service agreements" })).toContainText("Demo Copper Mining Company A (synthetic)");
  await scan(page, "DIG Operations");
});

test("Journey 4 — a restricted coordination request from DIG Operations to DIG Special Duties / State House", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.dig.exec");
  await page.goto("/app/coordination");
  await page.getByRole("combobox", { name: /^To( \*)?$/ }).selectOption({ label: "Deputy Inspector General – Special Duties / State House" });
  await page.getByRole("combobox", { name: /^Category/ }).selectOption("PERSONNEL_SUPPORT");
  await page.getByRole("textbox", { name: /^Subject/ }).fill("Browser test: personnel support (synthetic)");
  await page.getByLabel("Administrative requirement").fill("Provide the motorcade route for the visit.");
  await page.getByLabel("Authorisation reference").fill("SYN-E2E-001");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/protection or movement details/)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Administrative requirement").fill("Confirm administrative arrangements for authorised personnel support (synthetic).");
  await page.getByRole("button", { name: "Send request" }).click();
  await page.waitForURL(/\/app\/coordination\/crq_/, { timeout: 120_000 });
  const path = page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  await scan(page, "DIG Operations");
  await login(page, "demo.dig.specialduties");
  await page.goto(path);
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await page.waitForURL(/done=Recorded/, { timeout: 120_000 });
  await expect(page.getByText("Acknowledged", { exact: true }).first()).toBeVisible();
  await scan(page, "DIG Special Duties");
  await login(page, "demo.dig.admin");
  const r = await page.goto(path);
  expect(r?.status()).toBe(404); // the third DIG cannot see it
});

// Journey 5 — training chain across four offices. Split into four serial stages (one sign-in each) so that each stage
// has its own budget: as one test it measured 5.5 min on an idle machine and exceeded 8 min under load (28 Nov 2026).
let session = "";
test("Journey 5a — the Division nominates an officer", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.cb.staffops");
  await page.goto("/app/training?tab=sessions");
  await page.getByRole("row", { name: /Public Order Maintenance — Basic Course.*Open for nominations/ }).getByRole("link").first().click();
  await page.waitForURL(/\/app\/training\/sessions\/tss_/);
  session = page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  await page.getByLabel("Officer").selectOption({ index: 5 });
  await page.getByRole("button", { name: "Nominate" }).click();
  await page.waitForURL(/done=/, { timeout: 120_000 });
  await scan(page, "Division Staff I");
});
test("Journey 5b — the Divisional Commander recommends", async ({ page }) => {
  test.setTimeout(240_000);
  expect(session, "stage 5a recorded the session").not.toBe("");
  await login(page, "demo.cb.commander");
  await page.goto(session);
  await page.getByRole("button", { name: "Recommend", exact: true }).first().click();
  await page.waitForURL(/done=Recommended/, { timeout: 120_000 });
});
test("Journey 5c — DIG Administration approves", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.dig.admin");
  await page.goto(session);
  await page.getByRole("row", { name: /Recommended/ }).first().getByRole("button", { name: "Approve" }).click();
  await page.waitForURL(/done=Approved/, { timeout: 120_000 });
});
test("Journey 5d — SPOM / Mobile Unit, the delivering unit, records attendance", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "demo.mu.commander");
  await page.goto(session);
  await expect(page.getByText("Your unit delivers this session")).toBeVisible();
  await page.getByRole("row", { name: /Approved/ }).first().getByRole("button", { name: "Mark attending" }).click();
  await page.waitForURL(/done=Attendance/, { timeout: 120_000 });
  await scan(page, "SPOM / Mobile Unit");
});

test.afterAll(() => {
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility-portfolios.md", ["# Accessibility scan — executive portfolio pages (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "",
    `Generated ${new Date().toISOString()}. Synthetic data only.`, "", `**Violations: ${violations.length}**`, "", "| Page | Account | Violations | Rules |", "|---|---|--:|---|", ...rows, ""].join("\n"));
});

test("no accessibility violations on the portfolio pages", () => {
  expect(violations, JSON.stringify(violations)).toEqual([]);
});
