import { describe, expect, it } from "vitest";
import { one } from "@/server/db/connection";
import { activityTrends, assignmentsByArea, headlineKpis, recentActivity, systemStatus } from "@/server/domain/overview";
import { globalSearch } from "@/server/domain/search";
import { dashboardKind } from "@/server/domain/policy";
import { actor, withDb } from "./helpers";

type Conn = Parameters<Parameters<typeof withDb>[0]>[0];
const count = async (db: Conn, sql: string, ...p: unknown[]) => Number((await one<{ c: number }>(db, sql, ...p))!.c);

describe("dashboard overview (live, scoped figures)", () => {
  it("national headline figures equal direct database counts", () => withDb(async (db) => {
    const a = await actor(db, "u_hqc");
    const k = Object.fromEntries((await headlineKpis(db, a, dashboardKind(a)!)).map((x) => [x.key, x.value]));
    expect(k.divisions).toBe(10);
    expect(k.personnel).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_records"));
    expect(k.activeAssignments).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_assignments WHERE status IN ('ACTIVE','TRANSFER_PENDING')"));
    const donut = (await assignmentsByArea(db, a))!;
    expect(donut.reduce((n, d) => n + d.value, 0)).toBe(k.activeAssignments);
  }));

  it("district figures are limited to the district's subtree", () => withDb(async (db) => {
    const a = await actor(db, "u_kit_cmd");
    const k = Object.fromEntries((await headlineKpis(db, a, dashboardKind(a)!)).map((x) => [x.key, x.value]));
    expect(k.personnel).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_records p JOIN org_unit_closure c ON c.descendant_id = p.home_unit_id AND c.ancestor_id = 'org_cb_kitwe'"));
    expect(k.orgUnits).toBe(await count(db, "SELECT COUNT(*) AS c FROM org_unit_closure WHERE ancestor_id = 'org_cb_kitwe'"));
  }));

  it("technical roles see technical figures and status, never personnel counts", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    const keys = (await headlineKpis(db, plat, dashboardKind(plat)!)).map((x) => x.key);
    expect(keys).not.toContain("personnel");
    expect(keys).not.toContain("activeAssignments");
    expect(await assignmentsByArea(db, plat)).toBeNull();
    const trends = await activityTrends(db, plat);
    expect(trends.map((t) => t.label)).toContain("Automation runs");
    expect((await systemStatus(db, plat))?.rows.length).toBe(6);
    const staff = await actor(db, "u_staff");
    expect(await systemStatus(db, staff)).toBeNull();
    // Activity for a business role never includes platform job runs.
    expect((await recentActivity(db, await actor(db, "u_kit_cmd"))).every((i) => i.kind !== "system")).toBe(true);
  }));
});

describe("global search", () => {
  it("returns only records inside the user's scope", () => withDb(async (db) => {
    const kit = await globalSearch(db, await actor(db, "u_kit_cmd"), "demo");
    const per = kit.find((g) => g.key === "personnel")!;
    expect(per.hits.length).toBeGreaterThan(0);
    for (const h of per.hits) {
      const id = h.href.split("/").pop();
      const home = (await one<{ home_unit_id: string }>(db, "SELECT home_unit_id FROM personnel_records WHERE id = ?", id))!.home_unit_id;
      expect(home.startsWith("org_cb_kitwe")).toBe(true);
    }
    const plat = await globalSearch(db, await actor(db, "u_plat"), "demo");
    expect(plat.some((g) => ["personnel", "assignments", "manpower"].includes(g.key))).toBe(false);
    expect(await globalSearch(db, await actor(db, "u_hqc"), "a")).toEqual([]);
  }));
});
