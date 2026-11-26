import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { HQ_NAME } from "@/server/db/constants";
import { verifyAuditChain } from "@/server/domain/audit";
import { withDb } from "./helpers";

const count = async (db: Parameters<Parameters<typeof withDb>[0]>[0], sql: string, ...p: unknown[]) => Number((await one<{ c: number }>(db, sql, ...p))?.c ?? 0);

describe("synthetic seed", () => {
  it("loads organisations, users and consistent workflow history", () => withDb(async (db) => {
    expect(await count(db, "SELECT COUNT(*) AS c FROM org_units WHERE unit_type='PROVINCIAL_DIVISION'")).toBe(10);
    expect(await count(db, "SELECT COUNT(*) AS c FROM org_units WHERE unit_type='FORMATION'")).toBe(8);
    const statuses = (await all<{ status: string }>(db, "SELECT DISTINCT status FROM admin_requests")).map((r) => r.status).sort();
    expect(statuses).toEqual(expect.arrayContaining(["APPROVED", "CANCELLED", "CLOSED", "DRAFT", "IN_PROGRESS", "REJECTED", "RETURNED", "SUBMITTED", "UNDER_REVIEW"]));
    expect((await verifyAuditChain(db)).ok).toBe(true);
    expect((await one<{ name: string }>(db, "SELECT name FROM org_units WHERE id = 'org_hq'"))!.name).toBe(HQ_NAME);
    for (const u of await all<{ display_name: string; username: string }>(db, "SELECT display_name, username FROM users")) {
      expect(u.display_name).toMatch(/Demo/);
      expect(u.username).toMatch(/^demo\./);
    }
  }));

  it("models the territorial and formation hierarchy with tenants and a complete closure table", () => withDb(async (db) => {
    for (const t of ["DISTRICT", "STATION", "POST", "DEPARTMENT", "COMPANY", "DETACHMENT", "PLATOON", "SECTION"]) {
      expect(await count(db, "SELECT COUNT(*) AS c FROM org_units WHERE unit_type = ?", t)).toBeGreaterThan(0);
    }
    expect(await count(db, "SELECT COUNT(*) AS c FROM tenants WHERE tenant_type = 'PROVINCIAL'")).toBe(10);
    // Every unit is its own ancestor at depth 0.
    expect(await count(db, "SELECT COUNT(*) AS c FROM org_unit_closure WHERE depth = 0")).toBe(await count(db, "SELECT COUNT(*) AS c FROM org_units"));
    // A section reaches HQ through platoon, detachment, company and the formation.
    const chain = await all<{ ancestor_id: string; depth: number }>(db, "SELECT ancestor_id, depth FROM org_unit_closure WHERE descendant_id = 'org_mu_a1p1s1' ORDER BY depth");
    expect(chain.map((c) => c.ancestor_id)).toEqual(["org_mu_a1p1s1", "org_mu_a1p1", "org_mu_a1", "org_mu_a", "org_mu", "org_hq"]);
    // Sub-units inherit their parent's tenant; records carry their organisation's tenant.
    expect((await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = 'org_cb_kitwe_chim'"))!.tenant_id).toBe("t_cb");
    expect(await count(db, "SELECT COUNT(*) AS c FROM vehicles v JOIN org_units o ON o.id = v.custody_org_id WHERE v.tenant_id <> o.tenant_id")).toBe(0);
    expect(await count(db, "SELECT COUNT(*) AS c FROM admin_requests r JOIN org_units o ON o.id = r.origin_org_id WHERE r.tenant_id <> o.tenant_id")).toBe(0);
  }));
});
