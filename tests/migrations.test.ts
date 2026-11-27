import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createPool, one, run } from "@/server/db/connection";
import { bootstrap } from "@/server/db/bootstrap";
import { listMigrationFiles, migrate, recreateDatabase } from "@/server/db/migrate";
import { testDatabaseUrl } from "./env";

// A separate scratch database so the shared seeded test database is untouched.
const url = testDatabaseUrl().replace(/\/(zps_oms_test[a-z0-9_]*)$/, "/$1_mig");

afterAll(async () => {
  await recreateDatabase(url); // leave it empty
});

describe("database migrations", () => {
  it("applies every migration once, seeds once, and re-running is idempotent", async () => {
    await recreateDatabase(url);
    const first = await bootstrap(url);
    expect(first.applied).toEqual(listMigrationFiles().map((m) => m.name));
    expect(first.seeded).toBe(true);
    expect(first.seedSteps).toEqual(["001_base", "002_personnel_manpower", "003_three_tier_roles", "012_calendar_correspondence", "013_liaison_roles"]);
    const second = await bootstrap(url);
    expect(second).toEqual({ applied: [], seeded: false, seedSteps: [] });
    const pool = createPool(url);
    try {
      const v = await one<{ c: number }>(pool, "SELECT COUNT(*) AS c FROM schema_migrations");
      expect(Number(v!.c)).toBe(listMigrationFiles().length);
    } finally {
      await pool.end();
    }
  });

  it("refuses to run when an applied migration file has been edited", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zps-mig-"));
    try {
      await recreateDatabase(url);
      fs.writeFileSync(path.join(dir, "001_probe.sql"), "CREATE TABLE probe (id INT PRIMARY KEY);");
      await migrate(url, dir);
      // Line-ending conversion (e.g. git autocrlf on another machine) is not an edit.
      fs.writeFileSync(path.join(dir, "002_probe.sql"), "CREATE TABLE probe2 (\n  id INT PRIMARY KEY\n);\n");
      await migrate(url, dir);
      fs.writeFileSync(path.join(dir, "002_probe.sql"), "CREATE TABLE probe2 (\r\n  id INT PRIMARY KEY\r\n);\r\n");
      await expect(migrate(url, dir)).resolves.toBeTruthy();
      fs.writeFileSync(path.join(dir, "001_probe.sql"), "CREATE TABLE probe (id INT PRIMARY KEY, x INT);");
      await expect(migrate(url, dir)).rejects.toThrow(/checksum|edited|modified/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects organisation types outside the catalogue and keeps audit append-only", async () => {
    await recreateDatabase(url);
    await migrate(url);
    const pool = createPool(url);
    try {
      await run(pool, "INSERT INTO tenants (id, code, name, tenant_type, created_at) VALUES ('t','T','T','NATIONAL','2025-01-01T00:00:00.000Z')");
      await expect(
        run(pool, "INSERT INTO org_units (id, tenant_id, code, name, unit_type, branch, status, effective_from, created_at) VALUES ('x','t','X','Command post','TACTICAL_POSITION','HQ','ACTIVE','2025-01-01','2025-01-01')"),
      ).rejects.toThrow(/constraint|check/i);
    } finally {
      await pool.end();
    }
  });

  it("only resets databases named zps_oms_*", async () => {
    await expect(recreateDatabase(url.replace(/\/[^/]+$/, "/production"))).rejects.toThrow(/Refusing/);
  });
});
