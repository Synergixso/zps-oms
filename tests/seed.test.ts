import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { verifyAuditChain } from "@/server/domain/audit";
import { freshDb } from "./helpers";

describe("synthetic seed", () => {
  it("loads organisations, users and consistent workflow history", () => {
    const db = freshDb();
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM org_units WHERE unit_type='PROVINCIAL_DIVISION'")!.c).toBe(10);
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM org_units WHERE unit_type='FORMATION'")!.c).toBe(8);
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM org_units WHERE unit_type NOT IN ('SERVICE_HQ','HQ_OFFICE','PROVINCIAL_DIVISION','FORMATION')")!.c).toBe(0);
    const statuses = all<{ status: string }>(db, "SELECT DISTINCT status FROM admin_requests").map((r) => r.status).sort();
    expect(statuses).toEqual(expect.arrayContaining(["APPROVED", "CANCELLED", "CLOSED", "DRAFT", "IN_PROGRESS", "REJECTED", "RETURNED", "SUBMITTED", "UNDER_REVIEW"]));
    expect(verifyAuditChain(db).ok).toBe(true);
    // all users obviously synthetic
    for (const u of all<{ display_name: string; username: string }>(db, "SELECT display_name, username FROM users")) {
      expect(u.display_name).toMatch(/Demo/);
      expect(u.username).toMatch(/^demo\./);
    }
  });
});
