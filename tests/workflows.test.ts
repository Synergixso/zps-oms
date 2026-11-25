import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { assetAction, assetEvents, registerAsset } from "@/server/domain/assets";
import { createMaintenance, maintenanceAction, serviceHistory } from "@/server/domain/fleet";
import { decideReviewItem, openReview, provisionUser, assignRole, reviewItems } from "@/server/domain/iam";
import { HQ_ID, loadActor } from "@/server/domain/policy";
import { createDraft, performAction, requestHistory, updateDraft } from "@/server/domain/requests";
import { createSession, resolveSession, destroySession } from "@/server/domain/sessions";
import { setClock } from "@/server/domain/core";
import { actor, freshDb } from "./helpers";

describe("WF-04..08 administrative request lifecycle", () => {
  it("return → correct → resubmit → approve → progress → complete → close with full history", () => {
    const db = freshDb();
    const so = actor(db, "u_lsk_sops");
    const cmd = actor(db, "u_lsk_cmd");
    const r = createDraft(db, so, { categoryCode: "FACILITY_REPAIR", title: "Synthetic leaking tap", details: "Repair leaking tap in registry kitchen." });
    expect(r.reference).toMatch(/^REQ-\d{4}-\d{6}$/);
    performAction(db, so, r.id, "SUBMIT");
    performAction(db, cmd, r.id, "ASSIGN");
    expect(() => performAction(db, cmd, r.id, "RETURN", { reason: "" })).toThrow(/reason/i);
    performAction(db, cmd, r.id, "RETURN", { reason: "Add the room reference." });
    updateDraft(db, so, r.id, { categoryCode: "FACILITY_REPAIR", title: "Synthetic leaking tap (room R-2)", details: "Repair leaking tap in registry kitchen, room R-2." });
    performAction(db, so, r.id, "SUBMIT");
    performAction(db, cmd, r.id, "ASSIGN");
    performAction(db, cmd, r.id, "APPROVE");
    performAction(db, so, r.id, "START");
    performAction(db, so, r.id, "COMPLETE");
    const closed = performAction(db, cmd, r.id, "CLOSE");
    expect(closed.status).toBe("CLOSED");
    const h = requestHistory(db, cmd, r.id).map((x) => x.action);
    expect(h).toEqual(["CREATE", "SUBMIT", "ASSIGN", "RETURN", "SUBMIT", "ASSIGN", "APPROVE", "START", "COMPLETE", "CLOSE"]);
    expect(requestHistory(db, cmd, r.id).every((x) => x.workflow_version === 1)).toBe(true);
    const notes = one<{ c: number }>(db, "SELECT COUNT(*) c FROM notifications WHERE user_id='u_lsk_sops' AND link = ?", `/app/requests/${r.id}`)!;
    expect(notes.c).toBeGreaterThanOrEqual(3);
  });
  it("rejection and cancellation are terminal", () => {
    const db = freshDb();
    const so = actor(db, "u_lsk_sops");
    const r = createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic reject me", details: "To be rejected in test." });
    performAction(db, so, r.id, "SUBMIT");
    performAction(db, actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    performAction(db, actor(db, "u_lsk_cmd"), r.id, "REJECT", { reason: "Not required." });
    expect(() => performAction(db, so, r.id, "SUBMIT")).toThrow();
    const c = createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic cancel me", details: "To be cancelled in test." });
    expect(() => performAction(db, so, c.id, "CANCEL", { reason: "" })).toThrow(/reason/i);
    expect(performAction(db, so, c.id, "CANCEL", { reason: "Raised in error." }).status).toBe("CANCELLED");
  });
  it("stale writes are rejected (optimistic concurrency)", () => {
    const db = freshDb();
    const so = actor(db, "u_lsk_sops");
    const r = createDraft(db, so, { categoryCode: "OFFICE_SUPPLIES", title: "Synthetic concurrency", details: "Concurrency check in test." });
    expect(() => performAction(db, so, r.id, "SUBMIT", { expectedVersion: r.row_version + 5 })).toThrow(/changed by someone else/i);
  });
  it("validation rejects malformed input", () => {
    const db = freshDb();
    expect(() => createDraft(db, actor(db, "u_lsk_sops"), { categoryCode: "TACTICAL_PLAN", title: "x", details: "y" })).toThrow();
  });
});

describe("WF-09/10 fleet maintenance lifecycle", () => {
  it("high-cost request needs delegated approval; verifier must differ; service history recorded", () => {
    const db = freshDb();
    const f = actor(db, "u_fleet");
    const m = createMaintenance(db, f, { vehicleId: "veh_4", serviceType: "Routine service", description: "Synthetic routine service test.", estimatedCost: 9000 });
    expect(m.approval_required).toBe(1);
    expect(maintenanceAction(db, f, m.id, "VALIDATE").status).toBe("VALIDATED");
    expect(() => maintenanceAction(db, f, m.id, "APPROVE")).toThrow(/delegation/i);
    maintenanceAction(db, actor(db, "u_lsk_cmd"), m.id, "APPROVE");
    expect(() => maintenanceAction(db, f, m.id, "REFER", {})).toThrow(/workshop/i);
    maintenanceAction(db, f, m.id, "REFER", { workshopRef: "SYN-WS-9" });
    maintenanceAction(db, f, m.id, "START");
    expect(one<{ status: string }>(db, "SELECT status FROM vehicles WHERE id='veh_4'")!.status).toBe("UNDER_MAINTENANCE");
    maintenanceAction(db, f, m.id, "SUBMIT_COMPLETION");
    expect(() => maintenanceAction(db, f, m.id, "VERIFY")).toThrow(/different officer/i);
    maintenanceAction(db, actor(db, "u_fleet2"), m.id, "VERIFY", { costRef: "SYN-INV-1" });
    expect(one<{ status: string }>(db, "SELECT status FROM vehicles WHERE id='veh_4'")!.status).toBe("IN_SERVICE");
    expect(serviceHistory(db, f, "veh_4").length).toBe(1);
    expect(() => createMaintenance(db, f, { vehicleId: "veh_7", serviceType: "Routine service", description: "Copperbelt vehicle not granted." })).toThrow();
  });
});

describe("WF-11..13 asset lifecycle", () => {
  it("register, issue, return, transfer, receive, inspect with preserved history", () => {
    const db = freshDb();
    const c = actor(db, "u_asset");
    const a = registerAsset(db, c, { assetTag: "SYN-AST-50001", categoryCode: "OFFICE_FURNITURE", description: "Synthetic bookshelf", condition: "NEW", custodyOrgId: "org_lsk" });
    expect(() => registerAsset(db, c, { assetTag: "SYN-AST-50002", categoryCode: "OFFICE_FURNITURE", description: "Shelf", condition: "NEW", custodyOrgId: "org_cb" })).toThrow(/not authorised/i);
    assetAction(db, c, a.id, "ISSUE", { custodianRef: "Registry office" });
    expect(() => assetAction(db, c, a.id, "TRANSFER", { toOrgId: "org_cb", reference: "X" })).toThrow(/Return the asset/);
    assetAction(db, c, a.id, "RETURN", { condition: "GOOD" });
    assetAction(db, c, a.id, "TRANSFER", { toOrgId: "org_cb", reference: "SYN-TRF-1" });
    expect(() => assetAction(db, c, a.id, "RECEIVE")).toThrow(/not authorised/i);
    const recv = assetAction(db, actor(db, "u_asset_cb"), a.id, "RECEIVE", { condition: "GOOD" });
    expect(recv.custody_org_id).toBe("org_cb");
    const ev = assetEvents(db, actor(db, "u_asset_cb"), a.id).map((e) => e.event_type);
    expect(ev).toEqual(["RECEIVE", "TRANSFER", "RETURN", "ISSUE", "REGISTER"]);
    assetAction(db, actor(db, "u_asset_cb"), a.id, "INSPECT", { condition: "FAIR" });
  });
});

describe("WF-01/02/16/17/18 identity lifecycle", () => {
  it("provision → assign scope → recertify (revoke) → deactivate", () => {
    const db = freshDb();
    const p = actor(db, "u_plat");
    expect(() => provisionUser(db, p, { username: "john.real", displayName: "John Real", positionTitle: "Officer" })).toThrow();
    const id = provisionUser(db, p, { username: "demo.new.user", displayName: "Demo New User", positionTitle: "Division Staff Ops (synthetic)" });
    expect(loadActor(db, id)!.assignments.length).toBe(0); // no access by default
    expect(() => assignRole(db, p, { userId: id, roleCode: "PROVINCIAL_COMMANDER", orgUnitId: "org_mu", justification: "Wrong unit type for role" })).toThrow(/cannot be assigned/i);
    assignRole(db, p, { userId: id, roleCode: "DIVISION_STAFF_OPS", orgUnitId: "org_est", justification: "Synthetic posting reference SYN-POST-1" });
    expect(loadActor(db, id)!.assignments[0].orgUnitId).toBe("org_est");
    const s = actor(db, "u_sec");
    const rv = openReview(db, s, "Synthetic quarterly recertification");
    const { items } = reviewItems(db, s, rv);
    expect(items.some((i) => i.user_id === "u_sec")).toBe(false);
    const mine = items.find((i) => i.user_id === id)!;
    decideReviewItem(db, s, mine.id, "REVOKE", "No longer required (synthetic)");
    expect(loadActor(db, id)!.assignments.length).toBe(0);
    for (const it2 of reviewItems(db, s, rv).items.filter((i) => !i.decision)) decideReviewItem(db, s, it2.id, "RETAIN", "");
    expect(one<{ status: string }>(db, "SELECT status FROM access_reviews WHERE id=?", rv)!.status).toBe("COMPLETED");
  });
});

describe("Sessions", () => {
  it("expire after idle timeout; only token hashes are stored", () => {
    const db = freshDb();
    setClock(() => new Date("2026-11-25T10:00:00Z"));
    const tok = createSession(db, "u_dig");
    expect(all<{ id: string }>(db, "SELECT id FROM sessions").some((s) => s.id === tok)).toBe(false);
    expect(resolveSession(db, tok)).toBe("u_dig");
    setClock(() => new Date("2026-11-25T10:45:00Z"));
    expect(resolveSession(db, tok)).toBeNull();
    const t2 = createSession(db, "u_dig");
    destroySession(db, t2);
    expect(resolveSession(db, t2)).toBeNull();
    setClock(null);
  });
});

void HQ_ID;
