/**
 * Content Security Policy in the browser (DEC-067). Pages must carry a nonce-based policy with a fresh nonce
 * per request, hydrate and work under it (no CSP violation reported), and an injected inline script must not run.
 * Synthetic data only.
 */
import { expect, test } from "@playwright/test";
import { DEV_PASSWORD } from "./env";

test("pages carry a per-request nonce policy, work under it, and block injected inline script", async ({ page, request }) => {
  test.setTimeout(240_000);
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to (execute|load)/i.test(m.text())) violations.push(m.text()); });
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`Refused to execute (CSP): ${e.violatedDirective} ${e.blockedURI}`)));

  // A fresh nonce on every request; no 'unsafe-inline' for scripts.
  const nonces: string[] = [];
  for (let i = 0; i < 2; i++) {
    const res = await request.get("/login");
    const csp = res.headers()["content-security-policy"] ?? "";
    const script = csp.split("; ").find((d) => d.startsWith("script-src ")) ?? "";
    expect(script).toMatch(/'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(script).not.toContain("'unsafe-inline'");
    nonces.push(script.match(/'nonce-([^']+)'/)![1]);
    // Next.js stamps its own scripts with the same nonce.
    expect(await res.text()).toContain(`nonce="${nonces[i]}"`);
  }
  expect(nonces[0]).not.toBe(nonces[1]);
  const api = await request.get("/api/health?probe=live");
  expect(api.headers()["content-security-policy"]).toContain("default-src 'none'");

  // The interactive sign-in works (client JavaScript ran under the policy) and the back office loads.
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Password").fill("x");
  await page.getByRole("button", { name: /show password/i }).click();
  await expect(page.getByPlaceholder("Password")).toHaveAttribute("type", "text");
  await page.getByPlaceholder("Username").fill("demo.cb.staffops");
  await page.getByPlaceholder("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In to ZPS-OMS" }).click();
  await page.waitForURL(/\/app(\/|$)/);
  await page.goto("/app/notifications");
  await page.waitForLoadState("networkidle");
  // The page itself ran without any blocked resource.
  expect(violations).toEqual([]);

  // Stored-XSS simulation: markup that escaped encoding reaches the HTML the server sends. The real response
  // headers (including the nonce policy) are kept; only the body gains an inline script and an inline handler.
  await page.route("**/app/notifications", async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace("</body>",
      `<script>window.__xss = "script"</script><img src="/missing.png" onerror="window.__xss = 'handler'" alt=""></body>`);
    await route.fulfill({ response: res, body });
  });
  await page.goto("/app/notifications");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => (window as unknown as { __xss?: string }).__xss ?? "blocked")).toBe("blocked");
  await page.unroute("**/app/notifications");
  // Both injected pieces were refused by the policy, and nothing else was.
  expect(violations.filter((v) => /script-src-elem/.test(v)).length).toBeGreaterThan(0);
  expect(violations.filter((v) => /script-src-attr/.test(v)).length).toBeGreaterThan(0);
  expect(violations.filter((v) => !/script-src/.test(v))).toEqual([]);
});
