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
    expect(all(db2, "SELECT version FROM schema_migrations")).toEqual([{ version: 1 }]);
    expect(one<{ c: number }>(db2, "SELECT COUNT(*) c FROM users")!.c).toBe(users1);
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
