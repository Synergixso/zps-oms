import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { openDatabase } from "@/server/db/connection";

describe("database migrations", () => {
  it("applies v1 once, seeds once, and reopening is idempotent", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zps-mig-"));
    const file = path.join(dir, "t.db");
    const db1 = openDatabase(file);
    const users1 = one<{ c: number }>(db1, "SELECT COUNT(*) c FROM users")!.c;
    db1.close();
    const db2 = openDatabase(file);
    expect(all(db2, "SELECT version FROM schema_migrations ORDER BY version")).toEqual([{ version: 1 }, { version: 2 }]);
    expect(one<{ c: number }>(db2, "SELECT COUNT(*) c FROM users")!.c).toBe(users1);
    db2.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("upgrades an existing v1 database to v2 without re-seeding", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zps-up-"));
    const file = path.join(dir, "t.db");
    const db1 = openDatabase(file);
    const users = one<{ c: number }>(db1, "SELECT COUNT(*) c FROM users")!.c;
    // Simulate a database created before migration 002.
    db1.exec("DROP TABLE contact_messages; DELETE FROM schema_migrations WHERE version = 2;");
    db1.close();
    const db2 = openDatabase(file);
    expect(all(db2, "SELECT version FROM schema_migrations ORDER BY version")).toEqual([{ version: 1 }, { version: 2 }]);
    expect(one<{ c: number }>(db2, "SELECT COUNT(*) c FROM contact_messages")!.c).toBe(0);
    expect(one<{ c: number }>(db2, "SELECT COUNT(*) c FROM users")!.c).toBe(users);
    db2.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("rejects organisation types outside the approved scope (no districts/stations/posts)", () => {
    const db = openDatabase(":memory:", { seed: false });
    expect(() =>
      db.prepare("INSERT INTO org_units (id, code, name, unit_type, status, effective_from, created_at) VALUES ('x','X','Station','POLICE_STATION','ACTIVE','2025-01-01','2025-01-01')").run(),
    ).toThrow(/CHECK/);
  });
});
