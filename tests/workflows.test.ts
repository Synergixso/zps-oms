import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { assetAction, assetEvents, registerAsset } from "@/server/domain/assets";
import { createMaintenance, maintenanceAction, serviceHistory } from "@/server/domain/fleet";
import { decideReviewItem, openReview, provisionUser, assignRole, reviewItems } from "@/server/domain/iam";
import { HQ_ID, loadActor } from "@/server/domain/policy";
import { createDraft, performAction, requestHistory, updateDraft } from "@/server/domain/requests";
import { createSession, resolveSession, destroySession } from "@/server/domain/sessions";
import { setClock } from "@/server/domain/core";
import { actor, withDb } from "./helpers";

describe("WF-04..08 administrative request lifecycle", () => {
  it("return → correct → resubmit → approve → progress → complete → close with full history", () => withDb(async (db) => {
    const so = await actor(db, "u_lsk_sops");
    const cmd = await actor(db, "u_lsk_cmd");
    const r = await createDraft(db, so, { categoryCode: "FACILITY_REPAIR", title: "Synthetic leaking tap", details: "Repair leaking tap in registry kitchen." });
    expect(r.reference).toMatch(/^REQ-\d{4}-\d{6}$/);
    await performAction(db, so, r.id, "SUBMIT");
    await performAction(db, cmd, r.id, "ASSIGN");
    await expect(performAction(db, cmd, r.id, "RETURN", { reason: "" })).rejects.toThrow(/reason/i);
    await performAction(db, cmd, r.id, "RETURN", { reason: "Add the room reference." });
    await updateDraft(db, so, r.id, { categoryCode: "FACILITY_REPAIR", title: "Synthetic leaking tap (room R-2)", details: "Repair leaking tap in registry kitchen, room R-2." });
    await performAction(db, so, r.id, "SUBMIT");
    await performAction(db, cmd, r.id, "ASSIGN");
    await performAction(db, cmd, r.id, "APPROVE");
    await performAction(db, so, r.id, "START");
    await performAction(db, so, r.id, "COMPLETE");
    const closed = await performAction(db, cmd, r.id, "CLOSE");
    expect(closed.status).toBe("CLOSED");
    const h = (await requestHistory(db, cmd, r.id)).map((x) => x.action);
    expect(h).toEqual(["CREATE", "SUBMIT", "ASSIGN", "RETURN", "SUBMIT", "ASSIGN", "APPROVE", "START", "COMPLETE", "CLOSE"]);
    expect((await requestHistory(db, cmd, r.id)).every((x) => x.workflow_version === 1)).toBe(true);
    const notes = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM notifications WHERE user_id='u_lsk_sops' AND link = ?", `/app/requests/${r.id}`))!;
    expect(notes.c).toBeGreaterThanOrEqual(3);
  }));
  it("rejection and cancellation are terminal", () => withDb(async (db) => {
    const so = await actor(db, "u_lsk_sops");
    const r = await createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic reject me", details: "To be rejected in test." });
    await performAction(db, so, r.id, "SUBMIT");
    await performAction(db, await actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    await performAction(db, await actor(db, "u_lsk_cmd"), r.id, "REJECT", { reason: "Not required." });
    await expect(performAction(db, so, r.id, "SUBMIT")).rejects.toThrow();
    const c = await createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic cancel me", details: "To be cancelled in test." });
    await expect(performAction(db, so, c.id, "CANCEL", { reason: "" })).rejects.toThrow(/reason/i);
    expect((await performAction(db, so, c.id, "CANCEL", { reason: "Raised in error." })).status).toBe("CANCELLED");
  }));
  it("stale writes are rejected (optimistic concurrency)", () => withDb(async (db) => {
    const so = await actor(db, "u_lsk_sops");
    const r = await createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic concurrency", details: "Concurrency check in test." });
    await expect(performAction(db, so, r.id, "SUBMIT", { expectedVersion: r.row_version + 5 })).rejects.toThrow(/changed by someone else/i);
  }));
  it("validation rejects malformed input", () => withDb(async (db) => {
    await expect(createDraft(db, await actor(db, "u_lsk_sops"), { categoryCode: "TACTICAL_PLAN", title: "x", details: "y" })).rejects.toThrow();
  }));
});

describe("WF-09/10 fleet maintenance lifecycle", () => {
  it("high-cost request needs delegated approval; verifier must differ; service history recorded", () => withDb(async (db) => {
    const f = await actor(db, "u_fleet");
    const m = await createMaintenance(db, f, { vehicleId: "veh_4", serviceType: "Routine service", description: "Synthetic routine service test.", estimatedCost: 9000 });
    expect(m.approval_required).toBe(1);
    expect((await maintenanceAction(db, f, m.id, "VALIDATE")).status).toBe("VALIDATED");
    await expect(maintenanceAction(db, f, m.id, "APPROVE")).rejects.toThrow(/delegation/i);
    await maintenanceAction(db, await actor(db, "u_lsk_cmd"), m.id, "APPROVE");
    await expect(maintenanceAction(db, f, m.id, "REFER", {})).rejects.toThrow(/workshop/i);
    await maintenanceAction(db, f, m.id, "REFER", { workshopRef: "SYN-WS-9" });
    await maintenanceAction(db, f, m.id, "START");
    expect((await one<{ status: string }>(db, "SELECT status FROM vehicles WHERE id='veh_4'"))!.status).toBe("UNDER_MAINTENANCE");
    await maintenanceAction(db, f, m.id, "SUBMIT_COMPLETION");
    await expect(maintenanceAction(db, f, m.id, "VERIFY")).rejects.toThrow(/different officer/i);
    await maintenanceAction(db, await actor(db, "u_fleet2"), m.id, "VERIFY", { costRef: "SYN-INV-1" });
    expect((await one<{ status: string }>(db, "SELECT status FROM vehicles WHERE id='veh_4'"))!.status).toBe("IN_SERVICE");
    expect((await serviceHistory(db, f, "veh_4")).length).toBe(1);
    await expect(createMaintenance(db, f, { vehicleId: "veh_7", serviceType: "Routine service", description: "Copperbelt vehicle not granted." })).rejects.toThrow();
  }));
});

describe("WF-11..13 asset lifecycle", () => {
  it("register, issue, return, transfer, receive, inspect with preserved history", () => withDb(async (db) => {
    const c = await actor(db, "u_asset");
    const a = await registerAsset(db, c, { assetTag: "SYN-AST-50001", categoryCode: "OFFICE_FURNITURE", description: "Synthetic bookshelf", condition: "NEW", custodyOrgId: "org_lsk" });
    await expect(registerAsset(db, c, { assetTag: "SYN-AST-50002", categoryCode: "OFFICE_FURNITURE", description: "Shelf", condition: "NEW", custodyOrgId: "org_cb" })).rejects.toThrow(/not authorised/i);
    await assetAction(db, c, a.id, "ISSUE", { custodianRef: "Registry office" });
    await expect(assetAction(db, c, a.id, "TRANSFER", { toOrgId: "org_cb", reference: "X" })).rejects.toThrow(/Return the asset/);
    await assetAction(db, c, a.id, "RETURN", { condition: "GOOD" });
    await assetAction(db, c, a.id, "TRANSFER", { toOrgId: "org_cb", reference: "SYN-TRF-1" });
    await expect(assetAction(db, c, a.id, "RECEIVE")).rejects.toThrow(/not authorised/i);
    const recv = await assetAction(db, await actor(db, "u_asset_cb"), a.id, "RECEIVE", { condition: "GOOD" });
    expect(recv.custody_org_id).toBe("org_cb");
    const ev = (await assetEvents(db, await actor(db, "u_asset_cb"), a.id)).map((e) => e.event_type);
    expect(ev).toEqual(["RECEIVE", "TRANSFER", "RETURN", "ISSUE", "REGISTER"]);
    await assetAction(db, await actor(db, "u_asset_cb"), a.id, "INSPECT", { condition: "FAIR" });
  }));
});

describe("WF-01/02/16/17/18 identity lifecycle", () => {
  it("provision → assign scope → recertify (revoke) → deactivate", () => withDb(async (db) => {
    const p = await actor(db, "u_plat");
    await expect(provisionUser(db, p, { username: "john.real", displayName: "John Real", positionTitle: "Officer" })).rejects.toThrow();
    const id = await provisionUser(db, p, { username: "demo.new.user", displayName: "Demo New User", positionTitle: "Division Staff Ops (synthetic)" });
    expect((await loadActor(db, id))!.assignments.length).toBe(0); // no access by default
    await expect(assignRole(db, p, { userId: id, roleCode: "PROVINCIAL_COMMANDER", orgUnitId: "org_mu", justification: "Wrong unit type for role" })).rejects.toThrow(/cannot be assigned/i);
    await assignRole(db, p, { userId: id, roleCode: "DIVISION_STAFF_OPS", orgUnitId: "org_est", justification: "Synthetic posting reference SYN-POST-1" });
    expect((await loadActor(db, id))!.assignments[0].orgUnitId).toBe("org_est");
    const s = await actor(db, "u_sec");
    const rv = await openReview(db, s, "Synthetic quarterly recertification");
    const { items } = await reviewItems(db, s, rv);
    expect(items.some((i) => i.user_id === "u_sec")).toBe(false);
    const mine = items.find((i) => i.user_id === id)!;
    await decideReviewItem(db, s, mine.id, "REVOKE", "No longer required (synthetic)");
    expect((await loadActor(db, id))!.assignments.length).toBe(0);
    for (const it2 of (await reviewItems(db, s, rv)).items.filter((i) => !i.decision)) await decideReviewItem(db, s, it2.id, "RETAIN", "");
    expect((await one<{ status: string }>(db, "SELECT status FROM access_reviews WHERE id=?", rv))!.status).toBe("COMPLETED");
  }));
});

describe("Sessions", () => {
  it("expire after idle timeout; only token hashes are stored", () => withDb(async (db) => {
    setClock(() => new Date("2026-11-25T10:00:00Z"));
    const tok = await createSession(db, "u_dig");
    expect((await all<{ id: string }>(db, "SELECT id FROM sessions")).some((s) => s.id === tok)).toBe(false);
    expect(await resolveSession(db, tok)).toBe("u_dig");
    setClock(() => new Date("2026-11-25T10:45:00Z"));
    expect(await resolveSession(db, tok)).toBeNull();
    const t2 = await createSession(db, "u_dig");
    await destroySession(db, t2);
    expect(await resolveSession(db, t2)).toBeNull();
    setClock(null);
  }));
});

void HQ_ID;
