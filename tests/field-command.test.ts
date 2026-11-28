/**
 * Kamfinsa Mobile Unit field command (institutional directive 28 Nov 2026, §9–§13). Synthetic data only.
 * Field chain from seed step 014: Area Commander (pos_mu_area_a, u_mu_acoy) → Platoon Commander (pos_mu_plt, u_mu_plt,
 * 1 Platoon) → Inspector → Sergeant → Constable. Company structure from seed step 016.
 */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { appointActing, createReport, submitReport } from "@/server/domain/command";
import { addDays, today } from "@/server/domain/core";
import {
  areaWorkspace, companyWorkspace, fieldOffices, platoonWorkspace, recordEngagement, recordMuster, setEngagementFollowUp, MUSTER_CORRECTION_DAYS,
} from "@/server/domain/field-command";
import { actor, withDb } from "./helpers";

type Db = Parameters<typeof recordMuster>[0];
const platoonMembers = async (db: Db) => (await all<{ id: string }>(db,
  "SELECT id FROM personnel_records WHERE employment_status = 'SERVING' AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_mu_a1p1')")).map((r) => r.id);
const allPresent = (ids: string[], overrides: Record<string, string> = {}) => Object.fromEntries(ids.map((id) => [id, overrides[id] ?? "PRESENT"])) as Record<string, "PRESENT">;

describe("Platoon Commander — direct responsibility for the officers on the ground", () => {
  it("sees the field chain below the office, the platoon's personnel and its reporting line to the Area Commander", () => withDb(async (db) => {
    const plt = await actor(db, "u_mu_plt");
    expect((await fieldOffices(db, plt, "platoon")).map((h) => h.positionId)).toEqual(["pos_mu_plt"]);
    const w = await platoonWorkspace(db, plt, "pos_mu_plt");
    expect(w.chain.map((c) => c.positionId)).toEqual(["pos_mu_insp", "pos_mu_sgt", "pos_mu_cst"]);
    expect(w.superiors.map((s) => [s.positionId, s.kind])).toEqual([["pos_mu_area_a", "PRIMARY"]]);
    expect(w.personnelVisible).toBe(true);
    expect(w.personnel.map((p) => p.id).sort()).toEqual((await platoonMembers(db)).sort());
    expect(w.canRecord).toBe(true);
  }));

  it("records the daily muster for every serving officer of the platoon, and corrects it within the correction window", () => withDb(async (db) => {
    const plt = await actor(db, "u_mu_plt");
    const ids = await platoonMembers(db);
    expect(ids.length).toBeGreaterThan(3);
    // Incomplete, outsider, future and too-old musters are refused.
    await expect(recordMuster(db, plt, { positionId: "pos_mu_plt", date: today(), entries: allPresent(ids.slice(1)) })).rejects.toThrow(/every serving officer/);
    const outsider = (await one<{ id: string }>(db, "SELECT id FROM personnel_records WHERE home_unit_id = 'org_mu_b1' LIMIT 1"))!.id;
    await expect(recordMuster(db, plt, { positionId: "pos_mu_plt", date: today(), entries: { ...allPresent(ids), [outsider]: "PRESENT" } })).rejects.toThrow(/Only serving officers of this platoon/);
    await expect(recordMuster(db, plt, { positionId: "pos_mu_plt", date: addDays(today(), 1), entries: allPresent(ids) })).rejects.toThrow(/future/);
    await expect(recordMuster(db, plt, { positionId: "pos_mu_plt", date: addDays(today(), -MUSTER_CORRECTION_DAYS - 1), entries: allPresent(ids) })).rejects.toThrow(/last 7 days/);

    const id = await recordMuster(db, plt, { positionId: "pos_mu_plt", date: today(), entries: allPresent(ids, { [ids[0]]: "SICK", [ids[1]]: "ON_LEAVE" }) });
    let w = await platoonWorkspace(db, plt, "pos_mu_plt");
    expect(w.muster?.entries[ids[0]]).toBe("SICK");
    expect(w.history[0]).toEqual({ date: today(), present: ids.length - 2, total: ids.length });
    // A correction keeps one muster per day and increments its version.
    const again = await recordMuster(db, plt, { positionId: "pos_mu_plt", date: today(), entries: allPresent(ids) });
    expect(again).toBe(id);
    w = await platoonWorkspace(db, plt, "pos_mu_plt");
    expect(w.muster?.version).toBe(2);
    expect(await all(db, "SELECT action FROM audit_events WHERE entity_type = 'platoon_muster' AND entity_id = ? ORDER BY seq", id)).toEqual([{ action: "field.muster.record" }, { action: "field.muster.correct" }]);
  }));

  it("an acting Platoon Commander records attendance only when that action is delegated", () => withDb(async (db) => {
    const plt = await actor(db, "u_mu_plt"), deputy = await actor(db, "u_mu_pltadm");
    const ids = await platoonMembers(db);
    const t = today();
    await appointActing(db, plt, { positionId: "pos_mu_plt", actingUserId: "u_mu_pltadm", validFrom: t, validTo: addDays(t, 5), actions: ["ACKNOWLEDGE"], authorisingRef: "SYN-ACT-MST-1" });
    await expect(recordMuster(db, deputy, { positionId: "pos_mu_plt", date: t, entries: allPresent(ids) })).rejects.toThrow(/do not hold this office/);
    await appointActing(db, plt, { positionId: "pos_mu_plt", actingUserId: "u_mu_pltadm", validFrom: t, validTo: addDays(t, 5), actions: ["RECORD_ATTENDANCE"], authorisingRef: "SYN-ACT-MST-2" });
    await recordMuster(db, deputy, { positionId: "pos_mu_plt", date: t, entries: allPresent(ids) });
    expect((await one<{ authority: string }>(db, "SELECT authority FROM platoon_musters WHERE unit_id = 'org_mu_a1p1' AND muster_date = ?", t))!.authority).toBe("ACTING");
  }));
});

describe("Area Commander — area-level coordination, distinct from the Platoon Commander", () => {
  it("sees the platoons under the area command with attendance counts, but never individual records", () => withDb(async (db) => {
    const plt = await actor(db, "u_mu_plt"), area = await actor(db, "u_mu_acoy");
    const ids = await platoonMembers(db);
    await recordMuster(db, plt, { positionId: "pos_mu_plt", date: today(), entries: allPresent(ids, { [ids[0]]: "ABSENT" }) });
    const w = await areaWorkspace(db, area, "pos_mu_area_a");
    expect(w.platoons.map((p) => p.positionId)).toEqual(["pos_mu_plt"]);
    expect(w.platoons[0].today?.counts).toMatchObject({ PRESENT: ids.length - 1, ABSENT: 1 });
    expect(w.platoons[0].strength).toBe(ids.length);
    expect(JSON.stringify(w.platoons)).not.toContain(ids[0]);
    // Both reporting channels are shown: Mobile Unit command (primary) and the District (parallel and coordination).
    expect(w.channels.map((c) => [c.positionId, c.kind])).toEqual([["pos_mu_s2", "PRIMARY"], ["pos_kit_ops", "PARALLEL"], ["pos_kit_oc", "PARALLEL"]]);
    // The Area Commander cannot open the Platoon Commander's workspace or record its muster.
    await expect(platoonWorkspace(db, area, "pos_mu_plt")).rejects.toThrow();
    await expect(recordMuster(db, area, { positionId: "pos_mu_plt", date: today(), entries: allPresent(ids) })).rejects.toThrow(/do not hold this office/);
    expect(await one(db, "SELECT seq FROM audit_events WHERE actor_id = 'u_mu_acoy' AND action = 'field.platoon.view' AND outcome = 'DENIED'")).toBeTruthy();
  }));

  it("keeps a metadata-only partner-organisation engagement register", () => withDb(async (db) => {
    const area = await actor(db, "u_mu_acoy"), plt = await actor(db, "u_mu_plt");
    const e = await recordEngagement(db, area, { positionId: "pos_mu_area_a", engagementDate: today(), partner: "Demo Mine Management (synthetic)", engagementType: "SECURITY_COORDINATION_MEETING", recordReference: "SYN-MTG-001", followUp: "OPEN" });
    expect(e.reference).toMatch(/^ENG-\d{4}-\d{6}$/);
    const w = await areaWorkspace(db, area, "pos_mu_area_a");
    expect(w.engagements[0]).toMatchObject({ partner: "Demo Mine Management (synthetic)", follow_up: "OPEN" });
    // No content field exists; excluded terms are refused; only the Area Commander office may record.
    const cols = (await all<{ Field: string }>(db, "SHOW COLUMNS FROM area_engagements")).map((c) => c.Field);
    expect(cols.some((c) => /note|content|minute|summary|detail|attachment/.test(c))).toBe(false);
    await expect(recordEngagement(db, area, { positionId: "pos_mu_area_a", engagementDate: today(), partner: "Demo informant network", engagementType: "COURTESY_CALL" })).rejects.toThrow(/excluded class/);
    await expect(recordEngagement(db, plt, { positionId: "pos_mu_area_a", engagementDate: today(), partner: "Demo partner", engagementType: "COURTESY_CALL" })).rejects.toThrow(/do not hold this office/);
    await setEngagementFollowUp(db, area, e.id, "DONE");
    expect((await one<{ follow_up: string }>(db, "SELECT follow_up FROM area_engagements WHERE id = ?", e.id))!.follow_up).toBe("DONE");
    await expect(setEngagementFollowUp(db, plt, e.id, "OPEN")).rejects.toThrow();
  }));
});

describe("Company and Detachment Commander workspaces", () => {
  it("the HQ Company Commander sees HQ 5 Detachment (Kitwe), its commander, strength and the reports addressed to it", () => withDb(async (db) => {
    const cc = await actor(db, "u_mu_hqcc"), hq5 = await actor(db, "u_mu_hq5");
    const r = await createReport(db, hq5, { positionId: "pos_mu_hq5_dc", category: "STATUS", summary: "Synthetic detachment administrative status for the week.", progressStatus: "ON_TRACK" });
    await submitReport(db, hq5, r.id);
    const w = await companyWorkspace(db, cc, "pos_mu_hq_cc");
    expect(w.childLabel).toBe("Detachments");
    expect(w.units).toHaveLength(1);
    expect(w.units[0]).toMatchObject({ name: "HQ 5 Detachment", duty_station: "Kitwe, Copperbelt Province", strength: 6 });
    expect(w.units[0].commanders[0].holders.map((h) => h.name)).toEqual(["Demo HQ 5 Detachment Commander"]);
    expect(w.units[0].latest?.id).toBe(r.id);
    expect(w.pending.map((p) => p.report_id)).toContain(r.id);
  }));

  it("the Detachment Commander sees its Company Commander (primary) and Deputy (parallel); another Detachment cannot open it", () => withDb(async (db) => {
    const hq5 = await actor(db, "u_mu_hq5"), d3 = await actor(db, "u_mu_d3");
    const w = await companyWorkspace(db, hq5, "pos_mu_hq5_dc");
    expect(w.childLabel).toBe("Platoons");
    expect(w.superiors.map((s) => [s.positionId, s.kind])).toEqual([["pos_mu_hq_cc", "PRIMARY"], ["pos_mu_hq_dcc", "PARALLEL"]]);
    expect(w.strength).toBe(6);
    await expect(companyWorkspace(db, d3, "pos_mu_hq5_dc")).rejects.toThrow();
    await expect(companyWorkspace(db, d3, "pos_mu_hq_cc")).rejects.toThrow();
  }));
});
