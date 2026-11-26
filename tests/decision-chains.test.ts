/** Configurable approval chains for assignment approval and transfer release (Module 09; known issue 3). */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { setClock, today } from "@/server/domain/core";
import { assignmentInbox, decideAssignment, getAssignment, getTransfer, initiateTransfer, proposeAssignment, releaseDecision } from "@/server/domain/assignments";
import { listDecisionWorkflows, publishDecisionWorkflow } from "@/server/domain/decision-chains";
import { actor, withDb } from "./helpers";

type Conn = Parameters<Parameters<typeof withDb>[0]>[0];
async function availableOfficer(db: Conn, unit: string) {
  const r = await one<{ id: string }>(db, `SELECT p.id FROM personnel_records p WHERE p.home_unit_id = ? AND p.employment_status = 'SERVING' AND p.disposition_status = 'AVAILABLE_HOME'
     AND NOT EXISTS (SELECT 1 FROM personnel_assignments a WHERE a.personnel_id = p.id AND a.status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING'))
     AND NOT EXISTS (SELECT 1 FROM manpower_contribution_entries e WHERE e.personnel_id = p.id) ORDER BY p.id LIMIT 1`, unit);
  return r!.id;
}

describe("decision chain configuration", () => {
  it("defaults to one level; only workflow.configure publishes; versions are kept", () => withDb(async (db) => {
    const before = await listDecisionWorkflows(db);
    expect(before.filter((w) => w.status === "ACTIVE").map((w) => [w.domain, w.steps.length])).toEqual(expect.arrayContaining([["ASSIGNMENT", 1], ["TRANSFER_RELEASE", 1]]));
    const steps = [{ authority: "RESPONSIBLE_UNIT", label: "Division commander" }, { authority: "HQ", label: "DIG Operations concurrence" }];
    await expect(publishDecisionWorkflow(db, await actor(db, "u_cb_cmd"), "ASSIGNMENT", steps, "Synthetic test")).rejects.toThrow(/not authorised/);
    await expect(publishDecisionWorkflow(db, await actor(db, "u_hqc"), "ASSIGNMENT", [], "Synthetic test")).rejects.toThrow();
    await expect(publishDecisionWorkflow(db, await actor(db, "u_hqc"), "ASSIGNMENT", [...steps, ...steps], "Synthetic test")).rejects.toThrow(/three/);
    await publishDecisionWorkflow(db, await actor(db, "u_hqc"), "ASSIGNMENT", steps, "Synthetic instruction SYN-WF-01");
    const after = (await listDecisionWorkflows(db)).filter((w) => w.domain === "ASSIGNMENT");
    expect(after.map((w) => [w.version, w.status])).toEqual([[2, "ACTIVE"], [1, "RETIRED"]]);
  }));
});

describe("multi-level assignment approval", () => {
  it("passes level by level, each level by its own delegated authority, never the same officer twice", () => withDb(async (db) => {
    const coord = await actor(db, "u_cb_asg");
    // A matter raised before the new version keeps its single-level chain.
    const early = await proposeAssignment(db, coord, { personnelId: await availableOfficer(db, "org_cb_kitwe_central"), areaId: "area_kcm", commencementDate: today() });
    await publishDecisionWorkflow(db, await actor(db, "u_hqc"), "ASSIGNMENT", [
      { authority: "RESPONSIBLE_UNIT", label: "Division commander" }, { authority: "RESPONSIBLE_UNIT", label: "Second division officer" }, { authority: "HQ", label: "DIG Operations concurrence" },
    ], "Synthetic instruction SYN-WF-02");
    await decideAssignment(db, await actor(db, "u_cb_cmd"), early, "APPROVE", "Approved under v1");
    expect((await getAssignment(db, coord, early)).status).toMatch(/ACTIVE|APPROVED/);

    const id = await proposeAssignment(db, coord, { personnelId: await availableOfficer(db, "org_cb_kitwe_central"), areaId: "area_kcm", commencementDate: today() });
    const cb = await actor(db, "u_cb_cmd");
    const aao = await actor(db, "u_aao"); // Deputy Division Commander with a Copperbelt ASSIGNMENT delegation
    const dig = await actor(db, "u_dig");
    // (An HQ delegation covers the whole hierarchy, so DIG could also decide level 1 — but then never level 3.)
    await decideAssignment(db, cb, id, "APPROVE", "Level 1");
    expect((await getAssignment(db, coord, id)).status).toBe("PENDING_APPROVAL");
    await expect(decideAssignment(db, cb, id, "APPROVE", "again")).rejects.toThrow(/earlier level/);
    expect((await assignmentInbox(db, aao)).some((r) => r.id === id)).toBe(true);
    expect((await assignmentInbox(db, cb)).some((r) => r.id === id)).toBe(false);
    await decideAssignment(db, aao, id, "APPROVE", "Level 2");
    await expect(decideAssignment(db, cb, id, "APPROVE", "not HQ")).rejects.toThrow(/approval level/);
    await decideAssignment(db, dig, id, "APPROVE", "Level 3");
    expect((await getAssignment(db, coord, id)).status).toMatch(/ACTIVE|APPROVED/);
    const log = (await all<{ action: string }>(db, "SELECT action FROM approval_actions WHERE entity_type = 'assignment' AND entity_id = ? ORDER BY seq", id)).map((r) => r.action);
    expect(log).toEqual(["PROPOSE", "APPROVE_L1", "APPROVE_L2", "APPROVE_L3"]);
  }));

  it("a rejection at any level ends the matter", () => withDb(async (db) => {
    await publishDecisionWorkflow(db, await actor(db, "u_hqc"), "ASSIGNMENT", [{ authority: "RESPONSIBLE_UNIT", label: "Division" }, { authority: "HQ", label: "HQ concurrence" }], "Synthetic SYN-WF-03");
    const coord = await actor(db, "u_cb_asg");
    const id = await proposeAssignment(db, coord, { personnelId: await availableOfficer(db, "org_cb_kitwe_central"), areaId: "area_kcm", commencementDate: today() });
    await decideAssignment(db, await actor(db, "u_cb_cmd"), id, "APPROVE", "Level 1");
    await decideAssignment(db, await actor(db, "u_dig"), id, "REJECT", "Not supported at national level (synthetic).");
    expect((await getAssignment(db, coord, id)).status).toBe("REJECTED");
  }));
});

describe("multi-level transfer release", () => {
  it("needs every releasing level before receiving acceptance", () => withDb(async (db) => {
    const coord = await actor(db, "u_cb_asg");
    const cb = await actor(db, "u_cb_cmd");
    setClock(() => new Date("2025-03-03T08:00:00.000Z"));
    const id = await proposeAssignment(db, coord, { personnelId: await availableOfficer(db, "org_cb_kitwe_central"), areaId: "area_kcm", commencementDate: "2025-03-03" });
    await decideAssignment(db, cb, id, "APPROVE", "Approved");
    setClock(null);
    await publishDecisionWorkflow(db, await actor(db, "u_hqc"), "TRANSFER_RELEASE", [{ authority: "RESPONSIBLE_UNIT", label: "Releasing division" }, { authority: "HQ", label: "HQ release concurrence" }], "Synthetic SYN-WF-04");
    const trf = await initiateTransfer(db, coord, id, { toAreaId: "area_mopani", justification: "Rebalancing after the minimum tenure was completed.", proposedDate: today() });
    expect((await getTransfer(db, cb, trf)).releaseLevel).toMatchObject({ level: 1, total: 2 });
    await releaseDecision(db, cb, trf, "APPROVE", "Level 1 release");
    const mid = await getTransfer(db, cb, trf);
    expect(mid.transfer.status).toBe("PENDING_RELEASE");
    expect(mid.canRelease).toBe(false);
    await releaseDecision(db, await actor(db, "u_dig"), trf, "APPROVE", "HQ concurrence");
    expect((await getTransfer(db, cb, trf)).transfer.status).toBe("PENDING_ACCEPTANCE");
  }));
});
