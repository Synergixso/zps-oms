import { afterAll, afterEach, describe, expect, it } from "vitest";
import { all, createPool, one } from "@/server/db/connection";
import { bootstrap } from "@/server/db/bootstrap";
import { recreateDatabase } from "@/server/db/migrate";
import { createFirstSuperadmin, setupState } from "@/server/domain/setup";
import { testDatabaseUrl } from "./env";

// A scratch database: a fresh production-environment database must hold the reference baseline only.
const url = testDatabaseUrl().replace(/\/(zps_oms_test[a-z0-9_]*)$/, "/$1_prod");
const saved = { env: process.env.ZPS_ENVIRONMENT, token: process.env.ZPS_SETUP_TOKEN };
afterEach(() => {
  if (saved.env === undefined) delete process.env.ZPS_ENVIRONMENT; else process.env.ZPS_ENVIRONMENT = saved.env;
  if (saved.token === undefined) delete process.env.ZPS_SETUP_TOKEN; else process.env.ZPS_SETUP_TOKEN = saved.token;
});
afterAll(async () => {
  await recreateDatabase(url); // leave it empty
});

describe("production environment start-up (DEC-069)", () => {
  it("seeds the reference baseline only, never synthetic data, and allows one first-account setup", { timeout: 120_000 }, async () => {
    process.env.ZPS_ENVIRONMENT = "production";
    delete process.env.ZPS_SETUP_TOKEN;
    await recreateDatabase(url);
    const first = await bootstrap(url);
    expect(first.seedSteps).toEqual(["000_reference_baseline"]);
    expect((await bootstrap(url)).seedSteps).toEqual([]);
    const pool = createPool(url);
    try {
      const n = async (sql: string) => Number((await one<{ n: number }>(pool, sql))?.n ?? 0);
      expect(await n("SELECT COUNT(*) AS n FROM users")).toBe(0);
      expect(await n("SELECT COUNT(*) AS n FROM personnel_records")).toBe(0);
      expect(await n("SELECT COUNT(*) AS n FROM vehicles")).toBe(0);
      expect((await all<{ id: string }>(pool, "SELECT id FROM org_units")).map((r) => r.id)).toEqual(["org_hq"]);
      expect(await n("SELECT COUNT(*) AS n FROM report_definitions")).toBeGreaterThan(5);
      expect(await n("SELECT COUNT(*) AS n FROM roles WHERE status = 'ACTIVE'")).toBe(31);

      // Setup needs a configured token, the right token, and a production-format username.
      expect(await setupState(pool)).toBe("NO_TOKEN");
      await expect(createFirstSuperadmin(pool, { token: "x", username: "sysadmin.hq", displayName: "System Administrator", positionTitle: "Platform administrator" })).rejects.toThrow(/not enabled/);
      process.env.ZPS_SETUP_TOKEN = "test-setup-token-0123456789abcdef";
      expect(await setupState(pool)).toBe("AVAILABLE");
      await expect(createFirstSuperadmin(pool, { token: "wrong-token-0123456789abcdefghij", username: "sysadmin.hq", displayName: "System Administrator", positionTitle: "Platform administrator" })).rejects.toThrow(/not correct/);
      await expect(createFirstSuperadmin(pool, { token: process.env.ZPS_SETUP_TOKEN, username: "demo.admin", displayName: "System Administrator", positionTitle: "Platform administrator" })).rejects.toThrow();
      const r = await createFirstSuperadmin(pool, { token: process.env.ZPS_SETUP_TOKEN, username: "sysadmin.hq", displayName: "System Administrator", positionTitle: "Platform administrator" });
      expect(r.temporaryPassword.length).toBeGreaterThanOrEqual(12);
      const u = await one<{ synthetic: number; must_change_password: number; role_code: string; org_unit_id: string }>(pool,
        "SELECT u.synthetic, u.must_change_password, a.role_code, a.org_unit_id FROM users u JOIN role_assignments a ON a.user_id = u.id WHERE u.username = 'sysadmin.hq'");
      expect(u).toMatchObject({ synthetic: 0, must_change_password: 1, role_code: "SUPERADMIN", org_unit_id: "org_hq" });
      // Once any account exists, setup is closed for good.
      expect(await setupState(pool)).toBe("COMPLETED");
      await expect(createFirstSuperadmin(pool, { token: process.env.ZPS_SETUP_TOKEN, username: "second.admin", displayName: "Second Administrator", positionTitle: "Platform administrator" })).rejects.toThrow(/already been completed/);
      expect(await n("SELECT COUNT(*) AS n FROM audit_events WHERE action = 'setup.first-admin'")).toBe(2); // the refused wrong token and the success
    } finally {
      await pool.end();
    }
  });
});
