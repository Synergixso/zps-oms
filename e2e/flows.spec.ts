import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
}

async function logout(page: Page) {
  // Sign out lives in the account menu in the top bar.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
}

test.describe.configure({ mode: "serial" });

test("system login: design elements, refused password, successful sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "System Login" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Government ID \(SSO\)/ })).toBeDisabled();
  await page.getByPlaceholder("Username").fill("demo.kitwe.commander");
  await page.getByPlaceholder("Password").fill("Wrong-Password-1");
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await expect(page.getByText(/username or password is not correct/)).toBeVisible();
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByPlaceholder("Password")).toHaveAttribute("type", "text");
  await login(page, "demo.kitwe.commander");
  await expect(page.getByRole("heading", { name: "District Command Dashboard" }).first()).toBeVisible();
});

test("tenant isolation: a district commander sees only their district's personnel", async ({ page }) => {
  await login(page, "demo.kitwe.commander");
  await page.goto("/app/personnel");
  const units = await page.locator("tbody tr td:nth-child(4)").allTextContents();
  expect(units.length).toBeGreaterThan(0);
  for (const u of units) expect(u).toMatch(/Kitwe|Nkana|Chimwemwe/);
  // A Lusaka officer's record URL reveals nothing.
  const res = await page.goto("/app/personnel/per_0110");
  expect(res?.status()).toBe(404);
});

test("assignment: proposed by a coordinator, approved by the delegated commander", async ({ page }) => {
  await login(page, "demo.cb.assignments");
  await page.goto("/app/assignments/new");
  const officer = page.getByLabel(/Officer \(available/);
  await officer.selectOption({ index: 1 });
  const area = await page.locator("#f-areaId option", { hasText: "KCM Mine Operations" }).first().getAttribute("value");
  await page.getByLabel("Operational area").selectOption(area!);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page.waitForURL(/\/app\/assignments\/pas_/);
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  const url = page.url();
  await logout(page);

  await login(page, "demo.cb.commander");
  await page.goto(url);
  await page.getByLabel("Comment").fill("Approved in end-to-end test.");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Active Field Assignment").first()).toBeVisible();
});

test("renewal keeps the continuous start date and sets the next review date", async ({ page }) => {
  await login(page, "demo.cb.commander");
  await page.goto("/app/assignments?renewal=due&area=area_kcm");
  await page.locator("tbody tr a[href^='/app/assignments/']").first().click();
  await page.waitForURL(/\/app\/assignments\/pas_/);
  const start = await page.locator("text=Continuous start").locator("xpath=following-sibling::p").innerText();
  await page.getByLabel("Decision note").fill("Renewed after satisfactory review (e2e).");
  await page.getByRole("button", { name: "Renew", exact: true }).click();
  await expect(page.getByText("Renewed — Active").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Renewal history" })).toBeVisible();
  await expect(page.locator("text=Continuous start").locator("xpath=following-sibling::p")).toHaveText(start);
});

test("transfer: releasing approval then receiving acceptance closes the old and opens a new assignment", async ({ page }) => {
  await login(page, "demo.cb.commander");
  await page.goto("/app/transfers?status=OPEN");
  await page.locator("tbody tr a[href^='/app/transfers/']").first().click();
  await page.waitForURL(/\/app\/transfers\/trf_/);
  const url = page.url();
  await page.getByLabel("Decision note").fill("Release approved (e2e).");
  await page.getByRole("button", { name: "Approve release" }).click();
  await expect(page.getByText("pending acceptance").first()).toBeVisible();
  await logout(page);

  await login(page, "demo.mufulira.receiving");
  await page.goto(url);
  await page.getByLabel("Acceptance note").fill("Accepted into receiving area (e2e).");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Accept and complete" }).click();
  await expect(page.getByText("completed").first()).toBeVisible();
  await page.getByRole("link", { name: "Open new assignment" }).click();
  await expect(page.getByText("Mopani Mine Operations").first()).toBeVisible();
});

test("roster: accept a contribution, build the roster from registry records, print and export", async ({ page }) => {
  await login(page, "demo.hq.staff");
  await page.goto("/app/manpower?status=APPROVED");
  await page.locator("tbody tr a[href^='/app/manpower/mpr_']").first().click();
  await page.waitForURL(/\/app\/manpower\/mpr_/);
  const requestUrl = page.url();
  await page.getByRole("link", { name: /A Company/ }).click();
  await page.waitForURL(/\/app\/manpower\/contributions\/mpc_/);
  await page.waitForLoadState("networkidle"); // hydrated before submitting
  await page.getByRole("button", { name: "Accept" }).click();
  // Once accepted, the review card disappears and the status reads "accepted".
  await expect(page.getByRole("heading", { name: "Review contribution" })).toHaveCount(0);
  await expect(page.getByText("accepted", { exact: true }).first()).toBeVisible();
  await page.goto(requestUrl);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Build roster from accepted contributions" }).click();
  await page.waitForURL(/\/app\/rosters\/rv_/);
  await expect(page.getByText("6 officers")).toBeVisible();
  await expect(page.getByText("valid").first()).toBeVisible();
  const rosterUrl = page.url();
  await page.goto(`${rosterUrl}/print`);
  await expect(page.getByText(/Synthetic demonstration data — not an official record/i)).toBeVisible();
  const csv = await page.request.get(`${rosterUrl}/export`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("SYN-");
  const pdf = await page.request.get(`${rosterUrl}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("access control: a general staff member cannot open manpower registers", async ({ page }) => {
  await login(page, "demo.cen.staff");
  await page.goto("/app/manpower");
  await expect(page.getByText(/not authorised to view/)).toBeVisible();
});

test("context switching: a user with two assignments acts in one selected context at a time", async ({ page }) => {
  // demo.fleet.officer holds MTO Officer-in-Charge at Lusaka Division and at the Mobile Unit.
  await login(page, "demo.fleet.officer");
  const switchTo = async (unit: RegExp) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText("Switch role context")).toBeVisible();
    await expect(page.getByRole("menuitemradio")).toHaveCount(2);
    const target = page.getByRole("menuitemradio", { name: unit });
    if ((await target.getAttribute("aria-checked")) === "true") {
      await page.keyboard.press("Escape");
      return;
    }
    await target.click();
    await page.waitForURL(/\/app$/);
    await page.waitForLoadState("networkidle");
  };

  await switchTo(/Mobile Unit/);
  await expect(page.getByText(/Scope: Mobile Unit/).first()).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitemradio", { name: /Mobile Unit/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  // Only the selected context's records are reachable; the other context's record is not disclosed.
  expect((await page.goto("/app/fleet/veh_15"))?.status()).toBe(200);
  expect((await page.goto("/app/fleet/veh_1"))?.status()).toBe(404);

  await page.goto("/app");
  await switchTo(/Lusaka Division/);
  await expect(page.getByText(/Scope: Lusaka Division/).first()).toBeVisible();
  expect((await page.goto("/app/fleet/veh_1"))?.status()).toBe(200);
  expect((await page.goto("/app/fleet/veh_15"))?.status()).toBe(404);

  // A single-assignment user sees no context switcher.
  await page.goto("/app");
  await logout(page);
  await login(page, "demo.kitwe.commander");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByText("Switch role context")).toHaveCount(0);
});
