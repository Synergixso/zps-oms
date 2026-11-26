import { defineConfig } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/env";

/**
 * End-to-end tests (Playwright, free). They run a second Next.js dev server on port 3200 against a
 * dedicated SYNTHETIC database (zps_oms_e2e, recreated and seeded by global setup), so the dev data is untouched.
 * The installed Microsoft Edge is used (channel "msedge"), so no browser download is needed.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "docs/evidence/playwright-report" }]],
  use: {
    baseURL: "http://localhost:3200",
    channel: process.env.PW_CHANNEL ?? "msedge",
    viewport: { width: 1366, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3200",
    url: "http://localhost:3200/login",
    timeout: 240_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: e2eDatabaseUrl(), NEXT_DIST_DIR: ".next-e2e", ZPS_SHOW_DEMO_ACCOUNTS: "1" },
  },
});
