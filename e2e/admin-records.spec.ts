/**
 * Modules 16 and 17 and the Module 02 session screens, through the browser: schedule an event, register
 * correspondence, upload a valid and a malicious PDF, download the stored document, and see own sessions.
 * Synthetic data only.
 */
import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

const PDF = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n", "latin1");
const BAD = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog /OpenAction 3 0 R >> endobj\n3 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n", "latin1");

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

test("calendar, correspondence with documents, and own sessions", async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, "demo.cb.staffops");
  const stamp = Date.now().toString().slice(-6);

  // Schedule an administrative event.
  await page.goto("/app/calendar/new");
  await page.getByLabel("Title").fill(`Demo e2e records meeting ${stamp}`);
  await page.getByRole("button", { name: "Schedule event" }).click();
  await page.waitForURL(/\/app\/calendar\/ace_/);
  await expect(page.getByRole("heading", { name: `Demo e2e records meeting ${stamp}` })).toBeVisible();
  // Operational content is refused with a field-level message.
  await page.goto("/app/calendar/new");
  await page.getByLabel("Title").fill("Patrol planning");
  await page.getByRole("button", { name: "Schedule event" }).click();
  await expect(page.getByText(/operational or excluded/)).toBeVisible();

  // Register correspondence.
  await page.goto("/app/correspondence/new");
  await page.getByLabel("Subject").fill(`Demo e2e circular on returns ${stamp}`);
  await page.getByLabel("External body (from / to)").fill("Demo Ministry Registry");
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL(/\/app\/correspondence\/cor_/);
  await expect(page.getByText(/CORR-\d{4}-\d{6}/).first()).toBeVisible();

  // A PDF with a script is refused; a clean PDF is stored and downloads as an attachment with a sandbox policy.
  await page.locator("#file").setInputFiles({ name: "circular.pdf", mimeType: "application/pdf", buffer: BAD });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(/scripts, embedded files or automatic actions/)).toBeVisible();
  await page.locator("#file").setInputFiles({ name: "circular.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Document checked and stored.")).toBeVisible();
  await page.reload();
  const link = page.getByRole("link", { name: "circular.pdf" });
  await expect(link).toBeVisible();
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toMatch(/^attachment;/);
  expect(res.headers()["content-security-policy"]).toContain("sandbox");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Own sessions and sign-in history on the profile page.
  await page.goto("/app/profile");
  await expect(page.getByText("THIS DEVICE")).toBeVisible();
  await expect(page.getByRole("table", { name: "Sign-in and account history" }).getByText("Sign-in").first()).toBeVisible();
});
