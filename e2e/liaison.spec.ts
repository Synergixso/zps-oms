/**
 * The four Police Intelligence Officer roles in a real browser (31-role catalogue, DEC-072/073):
 * sign-in, role dashboard and navigation, the metadata-only boundary (free text refused), record → submit →
 * receive → acknowledge → route onward, notifications, another Province refused (404), other registers refused,
 * axe-core WCAG 2.2 AA on every liaison page, and sign-out. Writes docs/evidence/accessibility-liaison.md.
 * Synthetic data only.
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
async function logout(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
}
const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });

test.describe.configure({ mode: "serial" });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const axeRows: string[] = [];
const axeAll: Array<{ path: string; id: string }> = [];
async function scan(page: Page, who: string) {
  await page.waitForLoadState("networkidle");
  const path = page.url().replace(/^https?:\/\/[^/]+/, "");
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  for (const v of r.violations) axeAll.push({ path, id: v.id });
  axeRows.push(`| \`${path.replace(/lia_[0-9a-z]+/, "lia_[id]")}\` | ${who} | ${r.violations.length} | ${r.violations.map((v) => `\`${v.id}\``).join(", ") || "—"} |`);
}

let reference = "";
let recordPath = "";

test("Tier 4 Police Intelligence Officer: dashboard, navigation, free text refused, record and submit", async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, "demo.kitwec.pio");
  await expect(page.getByText("Tier 4 · Role 31 · Police Intelligence Officer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Police Intelligence Officer Dashboard" })).toBeVisible();
  for (const label of ["Assigned References", "Local Liaison Register", "Submission Status", "Administrative Acknowledgements", "Notifications", "My Profile"]) {
    await expect(nav(page).getByRole("link", { name: label })).toBeVisible();
  }
  // No operational or personnel module is offered.
  for (const label of ["Personnel register", "Manpower requests", "Assignment register", "Correspondence"]) await expect(nav(page).getByRole("link", { name: label })).toHaveCount(0);
  await scan(page, "31 station");

  await page.goto("/app/liaison/new");
  await scan(page, "31 station");
  await page.getByLabel("Document reference number (optional)").fill("Informant met at the market");
  await page.getByRole("button", { name: "Record reference" }).click();
  await expect(page.getByText("Enter the reference number only, never content.").first()).toBeVisible();
  await page.getByLabel("Document reference number (optional)").fill("SYN-E2E-KCS-0100");
  await page.getByRole("button", { name: "Record reference" }).click();
  await page.waitForURL(/\/app\/liaison\/records\/lia_/);
  recordPath = page.url().replace(/^https?:\/\/[^/]+/, "");
  reference = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  expect(reference).toMatch(/^LIA-\d{4}-\d{6}$/);
  await scan(page, "31 station");

  await page.getByLabel("Receiving office").selectOption("org_cb_kitwe");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("Submitted. The receiving office has been notified.")).toBeVisible();
  await expect(page.getByText("Held at (receiving office)").locator("..")).toContainText("Kitwe District Command");
  await page.goto("/app/liaison/submissions");
  await expect(page.getByRole("link", { name: reference })).toBeVisible();
  await logout(page);
});

test("Tier 3 District officer: notified, records receipt, acknowledges and routes onward to the Division", async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, "demo.kitwe.pio");
  await expect(page.getByRole("heading", { name: "District Police Intelligence Officer Dashboard" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Routing and Acknowledgements" })).toBeVisible();
  await page.goto("/app/notifications");
  await expect(page.getByText(`${reference} has been routed to Kitwe District Command`).first()).toBeVisible();
  await page.goto("/app/liaison/acknowledgements");
  await scan(page, "30 district");
  await page.getByRole("link", { name: reference }).click();
  await page.waitForURL(/\/app\/liaison\/records\//);
  await page.getByRole("button", { name: "Record receipt" }).click();
  await expect(page.getByText("Receipt recorded. You are now the responsible officer.")).toBeVisible();
  await page.getByLabel("Approval reference (optional)").fill("SYN-APPR-E2E-1");
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByText("Acknowledged. The submitting officer has been notified.")).toBeVisible();
  await page.getByLabel("Receiving office").selectOption("org_cb");
  await page.getByRole("button", { name: "Route onward" }).click();
  await expect(page.getByText("Submitted. The receiving office has been notified.")).toBeVisible();
  const history = page.getByRole("table", { name: "Routing history" });
  for (const a of ["Recorded", "Submitted", "Receipt recorded", "Acknowledged", "Routed onward"]) await expect(history.getByText(a, { exact: true }).first()).toBeVisible();
  await page.goto("/app/liaison/history");
  await scan(page, "30 district");
  await logout(page);
});

test("Tier 2 Division and Tier 1 National officers: queues, routing view and history", async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, "demo.cb.pio");
  await expect(page.getByRole("heading", { name: "Division Police Intelligence Officer Dashboard" })).toBeVisible();
  await page.goto("/app/liaison/incoming");
  await expect(page.getByRole("heading", { name: "Receiving and Routing Register" })).toBeVisible();
  await expect(page.getByRole("link", { name: reference })).toBeVisible();
  await scan(page, "19 division");
  await logout(page);

  await login(page, "demo.hq.pio");
  await expect(page.getByRole("heading", { name: "National Police Intelligence Officer Dashboard" })).toBeVisible();
  for (const label of ["Assigned Administrative References", "Liaison Activity Register", "Administrative Submission Register", "Report Reference Tracking", "Organisational Routing", "Submission Status", "Administrative Review Queue", "Audit History", "My Profile"]) {
    await expect(nav(page).getByRole("link", { name: label })).toBeVisible();
  }
  await scan(page, "07 national");
  for (const path of ["/app/liaison", "/app/liaison/reports", "/app/liaison/routing", "/app/help"]) {
    await page.goto(path);
    await scan(page, "07 national");
  }
  await page.goto("/app/liaison/routing");
  await expect(page.getByRole("link", { name: reference }).first()).toBeVisible();
  await logout(page);
});

test("another Province and every non-liaison register are refused on the server", async ({ page }) => {
  await login(page, "demo.lsk.pio");
  const res = await page.goto(recordPath);
  expect(res?.status()).toBe(404);
  for (const path of ["/app/personnel", "/app/manpower", "/app/rosters", "/app/assignments", "/app/audit"]) {
    await page.goto(path);
    await expect(page.getByText(/not authorised to view/).first(), path).toBeVisible();
  }
  await logout(page);
  // A non-liaison role cannot open liaison administration.
  await login(page, "demo.cb.staffops");
  await page.goto("/app/liaison");
  await expect(page.getByText(/not authorised to view/).first()).toBeVisible();
  const r2 = await page.goto(recordPath);
  expect(r2?.status()).toBe(200); // the access-denied page (no record lookup happens without the permission)
  await expect(page.getByText(/not authorised to view/).first()).toBeVisible();
});

test.afterAll(() => {
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/accessibility-liaison.md", [
    "# Accessibility scan — liaison administration pages (axe-core, WCAG 2.0/2.1/2.2 A and AA)", "",
    `Generated ${new Date().toISOString()} as roles 31, 30, 19 and 07 (synthetic accounts). Synthetic data only.`, "",
    `**Violations: ${axeAll.length}**`, "", "| Page | Role | Violations | Rules |", "|---|---|--:|---|", ...axeRows, "",
  ].join("\n"));
});

test("no accessibility violations on the liaison pages", () => {
  expect(axeAll, JSON.stringify(axeAll)).toEqual([]);
});
