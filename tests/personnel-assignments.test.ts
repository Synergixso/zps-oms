import { afterEach, describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { addDays, setClock, today } from "@/server/domain/core";
import { changeHomeUnit, getPersonnel, personnelDetail, registerPersonnel, updatePersonnel, verifyPersonnel } from "@/server/domain/personnel";
import {
  acceptDecision, assignmentDetail, computeTenure, decideAssignment, decideException, getAssignment, initiateTransfer, listAssignments, proposeAssignment,
  raiseException, releaseAssignment, releaseDecision, renewAssignment, createArea,
} from "@/server/domain/assignments";
import { actor, withDb } from "./helpers";

afterEach(() => setClock(null));

const reg = (over: Partial<Parameters<typeof registerPersonnel>[2]> = {}) => ({
  serviceNumber: "SYN-990001", surname: "Testcase", firstNames: "Demo Alpha", rankCode: "PC", homeUnitId: "org_cb_kitwe_central", employmentStatus: "SERVING" as const, ...over,
});

/** A serving, available officer in a unit, with no current assignment. */
async function availableOfficer(db: Parameters<Parameters<typeof withDb>[0]>[0], unit: string) {
  const r = await one<{ id: string }>(db, `SELECT p.id FROM personnel_records p WHERE p.home_unit_id = ? AND p.employment_status = 'SERVING' AND p.disposition_status = 'AVAILABLE_HOME'
     AND NOT EXISTS (SELECT 1 FROM personnel_assignments a WHERE a.personnel_id = p.id AND a.status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING'))
     AND NOT EXISTS (SELECT 1 FROM manpower_contribution_entries e WHERE e.personnel_id = p.id) ORDER BY p.id LIMIT 1`, unit);
  if (!r) throw new Error(`no available officer in ${unit}`);
  return r.id;
}

describe("personnel registry (criterion B)", () => {
  it("registers an officer once, with membership, history and audit", () => withDb(async (db) => {
    const officer = await actor(db, "u_kitc_per");
    const id = await registerPersonnel(db, officer, reg());
    const d = await personnelDetail(db, officer, id);
    expect(d.person.personnel_ref).toMatch(/^PER-\d{6}$/);
    expect(d.person.verification_status).toBe("UNVERIFIED");
    expect(d.memberships).toHaveLength(1);
    expect(d.dispositions[0].new_status).toBe("AVAILABLE_HOME");
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'personnel.register' AND entity_id = ?", id))!.c)).toBe(1);
  }));

  it("prevents duplicate identities by service number and flags similar names", () => withDb(async (db) => {
    const officer = await actor(db, "u_kitc_per");
    await registerPersonnel(db, officer, reg());
    await expect(registerPersonnel(db, officer, reg({ surname: "Other", firstNames: "Demo Beta" }))).rejects.toThrow(/already registered/);
    // Same name and rank, different service number: blocked until the officer confirms it is a different person.
    await expect(registerPersonnel(db, officer, reg({ serviceNumber: "SYN-990002" }))).rejects.toThrow(/same name and rank/);
    await expect(registerPersonnel(db, officer, reg({ serviceNumber: "SYN-990002", confirmDistinct: true }))).resolves.toBeTruthy();
    // A different province cannot learn which record holds the number.
    const lsk = await actor(db, "u_lsk_sops");
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES ('t_ra','u_lsk_sops','PROVINCIAL_PERSONNEL_OFFICER','org_lsk','2025-01-01T00:00:00.000Z','test','2025-01-01T00:00:00.000Z')");
    await expect(registerPersonnel(db, await actor(db, "u_lsk_sops"), reg({ homeUnitId: "org_lsk" }))).rejects.toThrow(/national registry/);
    void lsk;
  }));

  it("rejects non-synthetic service numbers and out-of-scope registration", () => withDb(async (db) => {
    const officer = await actor(db, "u_kitc_per");
    await expect(registerPersonnel(db, officer, reg({ serviceNumber: "123456" }))).rejects.toThrow();
    await expect(registerPersonnel(db, officer, reg({ homeUnitId: "org_cb_mufulira_central" }))).rejects.toThrow(/not authorised/);
  }));

  it("corrections are versioned, reset verification and verification needs a second officer", () => withDb(async (db) => {
    const officer = await actor(db, "u_kitc_per");
    const id = await registerPersonnel(db, officer, reg());
    await expect(verifyPersonnel(db, await actor(db, "u_cb_per"), id, "VERIFIED", "")).resolves.toBeUndefined();
    await updatePersonnel(db, officer, id, { surname: "Testcase", firstNames: "Demo Alphonse", rankCode: "PC", employmentStatus: "SERVING", reason: "Name spelling corrected" });
    const p = await getPersonnel(db, officer, id);
    expect(p.verification_status).toBe("UNVERIFIED");
    const hist = await all<{ field: string }>(db, "SELECT field FROM personnel_history WHERE personnel_id = ?", id);
    expect(hist.map((h) => h.field)).toEqual(expect.arrayContaining(["record", "verification", "first_names"]));
    // Home unit move keeps one canonical record with effective-dated membership.
    await changeHomeUnit(db, await actor(db, "u_kit_per"), id, { newUnitId: "org_cb_kitwe_nkana", effectiveDate: today(), reason: "Approved posting order SYN-PO-1" });
    const d = await personnelDetail(db, await actor(db, "u_kit_per"), id);
    expect(d.memberships).toHaveLength(2);
    expect(d.memberships.filter((m) => !m.valid_to)).toHaveLength(1);
    // The station officer no longer sees the officer (now outside the station's subtree).
    await expect(getPersonnel(db, officer, id)).rejects.toThrow(/not found/i);
  }));
});

describe("assignments, tenure, transfers and renewals (criteria F–I)", () => {
  it("creates an assignment linked to the personnel record and duty area, with approval separation", () => withDb(async (db) => {
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: today() });
    // Proposer cannot approve; an officer without delegation cannot approve.
    await expect(decideAssignment(db, await actor(db, "u_kit_asg"), id, "APPROVE", "ok")).rejects.toThrow(/delegated/);
    await decideAssignment(db, await actor(db, "u_cb_cmd"), id, "APPROVE", "Approved");
    const a = await getAssignment(db, coord, id);
    expect(a.status).toBe("ACTIVE");
    expect(a.personnel_id).toBe(pid);
    expect(a.area_id).toBe("area_kcm");
    expect(a.review_date).toBe(addDays(today(), 365));
    // One current assignment per officer.
    await expect(proposeAssignment(db, coord, { personnelId: pid, areaId: "area_mopani", commencementDate: today() })).rejects.toThrow(/Conflicting assignment/);
  }));

  it("calculates the 365-day tenure and blocks routine early withdrawal without an approved exception", () => withDb(async (db) => {
    const t = computeTenure({ commencement_date: "2026-01-01", continuous_start_date: "2026-01-01", review_date: "2027-01-01" }, { minimumDays: 365, reviewWindowDays: 30 }, "2026-07-01");
    expect(t).toMatchObject({ elapsedDays: 181, remainingDays: 184, completionDate: "2027-01-01", minimumMet: false, reviewEligible: false });
    expect(computeTenure({ commencement_date: "2026-01-01", continuous_start_date: "2026-01-01", review_date: "2027-01-01" }, { minimumDays: 365, reviewWindowDays: 30 }, "2027-01-01").minimumMet).toBe(true);

    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const cmd = await actor(db, "u_cb_cmd");
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: today() });
    await decideAssignment(db, cmd, id, "APPROVE", "Approved");
    await expect(releaseAssignment(db, cmd, id, { outcome: "RELEASED", reason: "Routine withdrawal", effectiveDate: today() })).rejects.toThrow(/Minimum tenure not met/);
    await expect(initiateTransfer(db, coord, id, { toAreaId: "area_mopani", justification: "Routine rebalancing of duty strength between areas", proposedDate: today() })).rejects.toThrow(/Minimum tenure not met/);
    // Misconduct exception is always available; once approved it permits early release and is consumed.
    await expect(raiseException(db, coord, id, { purpose: "EARLY_RELEASE", categoryCode: "MISCONDUCT", justification: "Administrative misconduct proceedings opened against the officer." })).rejects.toThrow(/document reference/);
    const ex = await raiseException(db, coord, id, { purpose: "EARLY_RELEASE", categoryCode: "MISCONDUCT", justification: "Administrative misconduct proceedings opened against the officer.", documentRef: "SYN-DISC-1" });
    await expect(decideException(db, coord, ex, "APPROVE", "self")).rejects.toThrow();
    await decideException(db, cmd, ex, "APPROVE", "Approved exception");
    await releaseAssignment(db, cmd, id, { outcome: "RELEASED", reason: "Early release under exception", effectiveDate: today(), exceptionId: ex });
    const d = await assignmentDetail(db, cmd, id);
    expect(d.assignment.status).toBe("CLOSED");
    expect(d.exceptions[0].status).toBe("USED");
    expect((await getPersonnel(db, cmd, pid)).disposition_status).toBe("RETURNED_HOME");
  }));

  it("an approved transfer closes the previous assignment and creates a new one, preserving history (G)", () => withDb(async (db) => {
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const cmd = await actor(db, "u_cb_cmd");
    setClock(() => new Date("2025-03-03T08:00:00.000Z"));
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: "2025-03-03" });
    await decideAssignment(db, cmd, id, "APPROVE", "Approved");
    setClock(null);
    const trf = await initiateTransfer(db, coord, id, { toAreaId: "area_mopani", justification: "Rebalancing after the minimum tenure was completed.", proposedDate: today() });
    expect((await getAssignment(db, coord, id)).status).toBe("TRANSFER_PENDING");
    await expect(acceptDecision(db, await actor(db, "u_rao"), trf, "ACCEPT", { effectiveDate: today(), comment: "Too early" })).rejects.toThrow(/not awaiting receiving/);
    await releaseDecision(db, cmd, trf, "APPROVE", "Release approved");
    const created = await acceptDecision(db, await actor(db, "u_rao"), trf, "ACCEPT", { effectiveDate: today(), comment: "Accepted into area" });
    const old = await getAssignment(db, cmd, id);
    expect(old).toMatchObject({ status: "CLOSED", close_reason: "TRANSFERRED", ended_on: today() });
    const neu = await getAssignment(db, cmd, created!);
    expect(neu).toMatchObject({ status: "ACTIVE", area_id: "area_mopani", commencement_date: today(), continuous_start_date: today() });
    const hist = await all<{ new_status: string }>(db, "SELECT new_status FROM disposition_history WHERE personnel_id = ? ORDER BY seq", pid);
    expect(hist.map((h) => h.new_status)).toEqual(expect.arrayContaining(["AWAITING_APPROVAL", "ACTIVE_ASSIGNMENT", "TRANSFER_PENDING", "RELEASED"]));
    expect(hist.at(-1)?.new_status).toBe("ACTIVE_ASSIGNMENT");
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'transfer.complete' AND entity_id = ?", trf))!.c)).toBe(1);
  }));

  it("renewal preserves the continuous commencement date and sets the next review date (I)", () => withDb(async (db) => {
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const cmd = await actor(db, "u_cb_cmd");
    setClock(() => new Date("2025-12-01T08:00:00.000Z"));
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: "2025-12-01" });
    await decideAssignment(db, cmd, id, "APPROVE", "Approved");
    setClock(() => new Date("2026-06-01T08:00:00.000Z"));
    await expect(renewAssignment(db, cmd, id, { decision: "RENEWED", comment: "Too early" })).rejects.toThrow(/not due for review/);
    setClock(() => new Date("2026-11-20T08:00:00.000Z"));
    await renewAssignment(db, cmd, id, { decision: "RENEWED", comment: "Renewed after review" });
    const a = await getAssignment(db, cmd, id);
    expect(a.continuous_start_date).toBe("2025-12-01");
    expect(a.commencement_date).toBe("2025-12-01");
    expect(a.review_date).toBe("2027-12-01");
    expect(Number(a.renewals)).toBe(1);
    expect((await getPersonnel(db, cmd, pid)).disposition_status).toBe("RENEWED_ACTIVE");
  }));

  it("the register is scoped and filterable; out-of-scope assignments are not found", () => withDb(async (db) => {
    const kit = await listAssignments(db, await actor(db, "u_kit_cmd"), { area: "area_kcm" });
    expect(kit.total).toBeGreaterThan(0);
    const any = kit.rows[0];
    await expect(getAssignment(db, await actor(db, "u_lsk_cmd"), any.id)).rejects.toThrow(/not found/i);
    const lsk = await listAssignments(db, await actor(db, "u_lsk_cmd"), {});
    expect(lsk.rows.every((r) => !r.area_id.startsWith("area_kcm"))).toBe(true);
    // Duty areas are administrative records: location detail is refused.
    await expect(createArea(db, await actor(db, "u_naa"), { code: "OA-TEST", name: "Test area with GPS coordinates", responsibleUnitId: "org_cb" })).rejects.toThrow(/administrative duty-area/);
  }));
});
