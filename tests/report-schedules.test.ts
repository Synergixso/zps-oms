/** Scheduled report delivery (Module 12): timing, audited generation, owner-only download, suspension. */
import { describe, expect, it } from "vitest";
import { one, run } from "@/server/db/connection";
import { cancelSchedule, createSchedule, getDelivery, listDeliveries, nextRunAfter, runDueSchedules } from "@/server/domain/report-schedules";
import { saveReport } from "@/server/domain/reports";
import { actor, withDb } from "./helpers";

describe("schedule timing", () => {
  it("runs at 06:00 Lusaka: next day, next Monday, or the 1st of next month", () => {
    const wed = new Date("2026-11-25T10:00:00Z"); // Wednesday
    expect(nextRunAfter(wed, "DAILY")).toBe("2026-11-26T04:00:00.000Z");
    expect(nextRunAfter(wed, "WEEKLY")).toBe("2026-11-30T04:00:00.000Z");
    expect(nextRunAfter(wed, "MONTHLY")).toBe("2026-12-01T04:00:00.000Z");
    expect(nextRunAfter(new Date("2026-11-26T03:00:00Z"), "DAILY")).toBe("2026-11-26T04:00:00.000Z");
    expect(nextRunAfter(new Date("2026-12-31T05:00:00Z"), "MONTHLY")).toBe("2027-01-01T04:00:00.000Z");
  });
});

describe("scheduled delivery", () => {
  it("delivers through the audited export path, to the owner only", () => withDb(async (db) => {
    const owner = await actor(db, "u_asset_cb");
    await expect(createSchedule(db, owner, { code: "STORES_STOCK", frequency: "HOURLY" })).rejects.toThrow(/daily, weekly or monthly/);
    const saved = await saveReport(db, owner, { name: "Copperbelt stock (synthetic)", code: "STORES_STOCK", fields: ["category", "quantity_on_hand"], sortField: "quantity_on_hand", sortDir: "desc" });
    const id = await createSchedule(db, owner, { code: "STORES_STOCK", frequency: "WEEKLY", savedReportId: saved });
    await expect(createSchedule(db, owner, { code: "STORES_STOCK", frequency: "WEEKLY", savedReportId: saved })).rejects.toThrow(/already scheduled/);
    // Reports outside the user's functions cannot be scheduled.
    await expect(createSchedule(db, owner, { code: "PERSONNEL_BY_UNIT", frequency: "DAILY" })).rejects.toThrow(/not found/i);

    const exportsBefore = Number((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports WHERE user_id = 'u_asset_cb'"))!.c);
    await run(db, "UPDATE report_schedules SET next_run_at = ? WHERE id = ?", "2020-01-01T04:00:00.000Z", id);
    const r = await runDueSchedules(db);
    expect(r.delivered).toBe(1);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports WHERE user_id = 'u_asset_cb'"))!.c)).toBe(exportsBefore + 1);
    const sched = (await one<{ next_run_at: string; last_run_at: string }>(db, "SELECT next_run_at, last_run_at FROM report_schedules WHERE id = ?", id))!;
    expect(sched.next_run_at > sched.last_run_at).toBe(true);

    const [delivery] = await listDeliveries(db, owner);
    const file = await getDelivery(db, owner, delivery.id);
    const lines = file.csv.split("\n");
    expect(lines[0]).toMatch(/SYNTHETIC/);
    expect(lines[2]).toBe("category,quantity_on_hand");
    const qty = lines.slice(3).map((l) => Number(l.split(",").pop()));
    expect(qty).toEqual([...qty].sort((a, b) => b - a)); // saved sort applied
    // Nobody else can download it, not even an administrator.
    await expect(getDelivery(db, await actor(db, "u_cb_cmd"), delivery.id)).rejects.toThrow(/not found/i);
    await expect(getDelivery(db, await actor(db, "u_plat"), delivery.id)).rejects.toThrow(/not found/i);
    expect((await one<{ n: number }>(db, "SELECT COUNT(*) n FROM notifications WHERE user_id = 'u_asset_cb' AND link = ?", `/app/reports/deliveries/${delivery.id}`))!.n).toBe(1);

    await cancelSchedule(db, owner, id);
    await run(db, "UPDATE report_schedules SET next_run_at = ? WHERE id = ?", "2020-01-01T04:00:00.000Z", id);
    expect((await runDueSchedules(db)).delivered).toBe(0);
  }));

  it("suspends a schedule whose role context is no longer valid, and tells the owner", () => withDb(async (db) => {
    const owner = await actor(db, "u_asset_cb");
    const id = await createSchedule(db, owner, { code: "STORES_MOVEMENTS", frequency: "DAILY" });
    await run(db, "UPDATE role_assignments SET revoked_at = ?, revoke_reason = 'test' WHERE user_id = 'u_asset_cb'", new Date().toISOString());
    await run(db, "UPDATE report_schedules SET next_run_at = ? WHERE id = ?", "2020-01-01T04:00:00.000Z", id);
    const r = await runDueSchedules(db);
    expect(r.suspended).toBe(1);
    expect((await one<{ status: string }>(db, "SELECT status FROM report_schedules WHERE id = ?", id))!.status).toBe("SUSPENDED");
    expect((await one<{ n: number }>(db, "SELECT COUNT(*) n FROM report_deliveries WHERE schedule_id = ?", id))!.n).toBe(0);
    expect((await one<{ n: number }>(db, "SELECT COUNT(*) n FROM notifications WHERE user_id = 'u_asset_cb' AND title = 'Scheduled report suspended'"))!.n).toBe(1);
  }));

  it("roles without report export cannot schedule", () => withDb(async (db) => {
    await expect(createSchedule(db, await actor(db, "u_kit_stores"), { code: "STORES_STOCK", frequency: "DAILY" })).rejects.toThrow(/not authorised/);
  }));
});
