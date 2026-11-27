/**
 * Public website structure (directive 27 Nov 2026 §3, §10): navigation order, every public link resolves,
 * the removed Modules page redirects to Features, and the internal modules stay available to authorised users.
 */
import { expect, test } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

const NAV = ["Home", "About", "Features", "Technical Team", "How It Works", "Contact"];

test("public navigation, links and the retired Modules page", async ({ page, request }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Desktop navigation: the seven items in the required order (six pages, then Login).
  const main = page.getByRole("navigation", { name: "Main" }).first();
  const labels = (await main.getByRole("link").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  expect(labels.slice(0, 6)).toEqual(NAV);
  expect(labels.at(-1)).toMatch(/Login/i);
  expect(labels.join("|")).not.toMatch(/Modules/);

  // Mobile navigation has the same items.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  const mobile = page.getByRole("navigation", { name: "Main" }).last();
  const mobileLabels = (await mobile.getByRole("link").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  expect(mobileLabels.slice(0, 6)).toEqual(NAV);
  await page.setViewportSize({ width: 1366, height: 900 });

  // /modules redirects permanently to /features.
  const r = await request.get("/modules", { maxRedirects: 0 });
  expect([301, 308]).toContain(r.status());
  expect(r.headers()["location"]).toMatch(/\/features$/);
  await page.goto("/modules");
  await expect(page).toHaveURL(/\/features$/);

  // Every internal link on every public page resolves (no 404s), and none points at /modules.
  const seen = new Set<string>();
  for (const path of ["/", "/about", "/features", "/technical-team", "/how-it-works", "/contact", "/login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
    for (const h of hrefs) {
      const target = h.split("#")[0];
      expect(target, `${path} links to the retired Modules page`).not.toBe("/modules");
      if (!target || seen.has(target)) continue;
      seen.add(target);
      const res = await request.get(target, { maxRedirects: 5 });
      expect(res.status(), `${path} → ${target}`).toBeLessThan(400);
    }
  }

  // The functional modules remain inside the back office for authorised users.
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("demo.cb.staffops");
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
  for (const name of ["Personnel", "Administrative calendar", "Correspondence"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
});
