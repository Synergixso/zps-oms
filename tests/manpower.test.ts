import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { addDays, today } from "@/server/domain/core";
import {
  addContributionEntries, addRosterEntry, amendRoster, buildRoster, contributionAction, createManpowerRequest, eligibleForContribution, getRoster,
  listManpowerRequests, manpowerAction, myContributions, reuseRosterList, rosterAction, setRequirement,
} from "@/server/domain/manpower";
import { actor, withDb } from "./helpers";

type Conn = Parameters<Parameters<typeof withDb>[0]>[0];

const request = (over: Record<string, unknown> = {}) => ({
  requestingUnitId: "org_cb", category: "AREA_ASSIGNMENT" as const, purpose: "Administrative duty strength for KCM duty area (test)", areaId: "area_kcm",
  totalRequired: 3, personnelCategories: "Constables", commencementDate: addDays(today(), 14), durationDays: 365,
  justification: "Test justification for an administrative manpower request.", approvalUnitId: "org_cb", ...over,
});

async function approvedRequest(db: Conn) {
  const sops = await actor(db, "u_cb_sops");
  const id = await createManpowerRequest(db, sops, request());
  await manpowerAction(db, sops, id, "SUBMIT");
  await manpowerAction(db, await actor(db, "u_cb_cmd"), id, "APPROVE", "Approved");
  return id;
}

describe("manpower requests (criterion C)", () => {
  it("an authorised originator creates, submits and the delegated approver approves; routing distributes requirements", () => withDb(async (db) => {
    const sops = await actor(db, "u_cb_sops");
    const id = await createManpowerRequest(db, sops, request());
    await manpowerAction(db, sops, id, "SUBMIT");
    await expect(manpowerAction(db, sops, id, "APPROVE")).rejects.toThrow(/delegated/);
    await expect(manpowerAction(db, await actor(db, "u_kit_cmd"), id, "APPROVE")).rejects.toThrow(/not found|delegated/);
    await manpowerAction(db, await actor(db, "u_cb_cmd"), id, "APPROVE", "Approved");
    await setRequirement(db, sops, id, { unitId: "org_cb_kitwe_central", count: 2 });
    await expect(setRequirement(db, sops, id, { unitId: "org_cb_kitwe_nkana", count: 2 })).rejects.toThrow(/requires 3/);
    await expect(setRequirement(db, sops, id, { unitId: "org_lsk_central_stn", count: 1 })).rejects.toThrow(/within your authorised scope/);
    const mine = await myContributions(db, await actor(db, "u_kitc_ops"), "OPEN");
    expect(mine.some((c) => c.request_id === id)).toBe(true);
    // A unit not asked to contribute does not see the request.
    expect((await listManpowerRequests(db, await actor(db, "u_lsk_cmd"))).some((m) => m.id === id)).toBe(false);
    const hist = await all<{ action: string }>(db, "SELECT action FROM approval_actions WHERE entity_type = 'manpower_request' AND entity_id = ? ORDER BY seq", id);
    expect(hist.map((h) => h.action)).toEqual(["CREATE", "SUBMIT", "APPROVE", "REQUIREMENT_SET"]);
  }));

  it("refuses tactical or location content", () => withDb(async (db) => {
    await expect(createManpowerRequest(db, await actor(db, "u_cb_sops"), request({ purpose: "Patrol route coverage for the mine perimeter" }))).rejects.toThrow(/administrative records/);
  }));

  it("returned requests can be corrected and resubmitted", () => withDb(async (db) => {
    const sops = await actor(db, "u_cb_sops");
    const id = await createManpowerRequest(db, sops, request());
    await manpowerAction(db, sops, id, "SUBMIT");
    const hq = await actor(db, "u_hqc");
    await manpowerAction(db, hq, id, "TAKE_REVIEW");
    await manpowerAction(db, hq, id, "RETURN", "Clarify the personnel categories");
    await manpowerAction(db, sops, id, "SUBMIT");
    const hist = await all<{ action: string }>(db, "SELECT action FROM approval_actions WHERE entity_type = 'manpower_request' AND entity_id = ? ORDER BY seq", id);
    expect(hist.map((h) => h.action)).toContain("RESUBMIT");
  }));
});

describe("contributions and roster builder (criteria D, E, L)", () => {
  async function flow(db: Conn) {
    const id = await approvedRequest(db);
    const sops = await actor(db, "u_cb_sops");
    await setRequirement(db, sops, id, { unitId: "org_cb_kitwe_central", count: 3 });
    const c = (await one<{ id: string }>(db, "SELECT id FROM manpower_contributions WHERE request_id = ?", id))!.id;
    const unit = await actor(db, "u_kitc_ops");
    const eligible = await eligibleForContribution(db, unit, c);
    expect(eligible.length).toBeGreaterThanOrEqual(3);
    await addContributionEntries(db, unit, c, eligible.slice(0, 3).map((p) => p.id));
    await contributionAction(db, unit, c, "SUBMIT");
    await contributionAction(db, sops, c, "ACCEPT", "Accepted");
    return { id, c, picked: eligible.slice(0, 3).map((p) => p.id) };
  }

  it("consolidates accepted contributions into a roster from registry records without retyping (D)", () => withDb(async (db) => {
    const { id, picked } = await flow(db);
    const sops = await actor(db, "u_cb_sops");
    const v = await buildRoster(db, sops, id);
    const r = await getRoster(db, sops, v);
    expect(r.entries.map((e) => e.personnel_id).sort()).toEqual([...picked].sort());
    for (const e of r.entries) {
      const p = await one<{ service_number: string; surname: string; first_names: string }>(db, "SELECT * FROM personnel_records WHERE id = ?", e.personnel_id);
      expect(e.service_number).toBe(p!.service_number);
      expect(e.full_name).toBe(`${p!.surname}, ${p!.first_names}`);
      expect(e.issues).toBeNull();
    }
  }));

  it("detects duplicates, conflicting assignments and outdated records (E)", () => withDb(async (db) => {
    const { id, picked } = await flow(db);
    const sops = await actor(db, "u_cb_sops");
    const v = await buildRoster(db, sops, id);
    await expect(addRosterEntry(db, sops, v, picked[0], "Manual addition by authority SYN-1")).rejects.toThrow(/Duplicate/);
    // Outdated: the registry record changes after it was added.
    await run(db, "UPDATE personnel_records SET rank_code = 'SGT' WHERE id = ?", picked[0]);
    // Conflict: an officer acquires another current assignment.
    await run(db, `INSERT INTO personnel_assignments (id, tenant_id, reference, personnel_id, home_unit_id, responsible_unit_id, area_id, commencement_date, continuous_start_date, review_date, status, created_by, created_at, updated_at)
                   VALUES ('pas_conf','t_cb','ASG-TEST-1',?, 'org_cb_kitwe_central','org_cb_mufulira','area_mopani',?,?,?, 'ACTIVE','u_cb_asg',?,?)`, picked[1], today(), today(), addDays(today(), 365), new Date().toISOString(), new Date().toISOString());
    await expect(rosterAction(db, sops, v, "SUBMIT")).rejects.toThrow(/integrity issues/);
    const r = await getRoster(db, sops, v);
    const issues = Object.fromEntries(r.entries.map((e) => [e.personnel_id, e.issues ?? ""]));
    expect(issues[picked[0]]).toMatch(/Outdated/);
    expect(issues[picked[1]]).toMatch(/Conflicting assignment ASG-TEST-1/);
    expect(issues[picked[2]]).toBe("");
  }));

  it("approval needs review by someone else, never overwrites an approved roster, and finalising creates assignments", () => withDb(async (db) => {
    const { id } = await flow(db);
    const sops = await actor(db, "u_cb_sops");
    const cmd = await actor(db, "u_cb_cmd");
    const v1 = await buildRoster(db, sops, id);
    await rosterAction(db, sops, v1, "SUBMIT");
    await expect(rosterAction(db, sops, v1, "REVIEW")).rejects.toThrow();
    await rosterAction(db, cmd, v1, "REVIEW", "Reviewed");
    await rosterAction(db, cmd, v1, "APPROVE", "Approved");
    // Amendment creates a new version; v1 stays approved until v2 is approved.
    const v2 = await amendRoster(db, sops, v1, "Replace one officer following a status change");
    const before = await getRoster(db, cmd, v1);
    expect(before.version.status).toBe("APPROVED");
    const v2r = await getRoster(db, sops, v2);
    expect(v2r.version).toMatchObject({ status: "AMENDED", version_no: 2, based_on_id: v1 });
    await rosterAction(db, sops, v2, "SUBMIT");
    await rosterAction(db, cmd, v2, "REVIEW", "Reviewed");
    await rosterAction(db, cmd, v2, "APPROVE", "Approved amendment");
    expect((await getRoster(db, cmd, v1)).version.status).toBe("SUPERSEDED");
    expect((await getRoster(db, cmd, v1)).entries).toHaveLength(3); // earlier version preserved
    const res = await rosterAction(db, cmd, v2, "FINALISE", "Finalised");
    expect(res.created).toBe(3);
    const asg = await all<{ status: string; area_id: string; request_id: string }>(db, "SELECT status, area_id, request_id FROM personnel_assignments WHERE roster_version_id = ?", v2);
    expect(asg).toHaveLength(3);
    expect(asg.every((a) => a.area_id === "area_kcm" && a.request_id === id && a.status === "APPROVED")).toBe(true);
    const audit = await all<{ action: string }>(db, "SELECT action FROM audit_events WHERE entity_id IN (?, ?) ORDER BY seq", v1, v2);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["roster.build", "roster.submit", "roster.review", "roster.approve", "roster.amend", "roster.finalise"]));
  }));

  it("reusing an earlier list revalidates every officer (§6.5)", () => withDb(async (db) => {
    const seeded = (await one<{ id: string }>(db, "SELECT v.id FROM roster_versions v WHERE v.status = 'FINALISED' LIMIT 1"))!.id;
    const id = await approvedRequest(db);
    const sops = await actor(db, "u_cb_sops");
    await setRequirement(db, sops, id, { unitId: "org_cb_kitwe_central", count: 3 });
    const c = (await one<{ id: string }>(db, "SELECT id FROM manpower_contributions WHERE request_id = ?", id))!.id;
    const r = await reuseRosterList(db, await actor(db, "u_kitc_ops"), c, seeded);
    // Everyone on the finalised roster now holds an assignment (or belongs to another unit), so nobody is silently reused.
    expect(r.added).toBe(0);
    expect(r.skipped.length).toBeGreaterThan(0);
    expect(r.skipped.every((s) => s.reasons.length > 0)).toBe(true);
  }));
});
