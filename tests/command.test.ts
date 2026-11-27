/**
 * Command and reporting (owner directive 27 Nov 2026, Part 15, Tests A–J; DEC-074 … DEC-077). Synthetic data only.
 * Structure from seed step 014: IG → DIG Operations → Commissioner → Divisional Commander (Mobile Unit) → Staff I →
 * Staff II → Area Commander → Section/Platoon Commander → Inspector → Sergeant → Constable; Area Commander channel A
 * with Kitwe District (coordination with the Operations Officer, parallel reporting to the OC).
 */
import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import {
  acknowledgeDirective, acknowledgeReport, addRelationship, appointActing, authorityFor, closeDirective, commandChain, completeDirective, createReport, designatedRecipients,
  flagConflict, forwardDirective, forwardReport, getDirective, getReport, issueDirective, listDirectives, officesHeld, resolveConflict, reviewReport, revokeActing, submitReport,
} from "@/server/domain/command";
import { addDays, today } from "@/server/domain/core";
import { actor, withDb } from "./helpers";

type Db = Parameters<typeof issueDirective>[0];
const recipientId = async (db: Db, reportId: string, positionId: string) => (await one<{ id: string }>(db, "SELECT id FROM report_recipients WHERE report_id = ? AND position_id = ?", reportId, positionId))!.id;
const D = (from: string, to: string, extra: Record<string, unknown> = {}) => ({ fromPositionId: from, toPositionId: to, category: "ADMIN_INSTRUCTION" as const, subject: "Synthetic administrative instruction", instructions: "Carry out the synthetic administrative task and report.", ...extra });

describe("Test A — national executive hierarchy", () => {
  it("the IG is the top authority: no superior office, DIG offices report to the IG, and nothing can be instructed upward to the IG", () => withDb(async (db) => {
    expect(await commandChain(db, "pos_ig")).toEqual([]);
    expect(await commandChain(db, "pos_dig_ops")).toEqual(["pos_ig"]);
    expect(await commandChain(db, "pos_mu_cst")).toEqual(["pos_mu_sgt", "pos_mu_insp", "pos_mu_plt", "pos_mu_area_a", "pos_mu_s2", "pos_mu_s1", "pos_mu_cmd", "pos_comm", "pos_dig_ops", "pos_ig"]);
    for (const p of ["pos_dig_adm", "pos_dig_sd"]) expect(await commandChain(db, p)).toEqual(["pos_ig"]);
    // DIG Administration and DIG Special Duties have no Operations relationships below them.
    expect(await all(db, "SELECT id FROM reporting_relationships WHERE superior_position_id IN ('pos_dig_adm','pos_dig_sd')")).toHaveLength(0);
    const dig = await actor(db, "u_dig");
    await expect(issueDirective(db, dig, D("pos_dig_ops", "pos_ig"))).rejects.toThrow(/downward only/);
    const comm = await actor(db, "u_hqc");
    await expect(issueDirective(db, comm, D("pos_comm", "pos_ig"))).rejects.toThrow(/downward only|directly below/);
    // The IG cannot be placed under any office.
    const mgr = await actor(db, "u_hqc");
    await expect(addRelationship(db, mgr, { subordinatePositionId: "pos_ig", superiorPositionId: "pos_dig_ops", relationshipType: "PRIMARY_REPORTING", authorisingRef: "SYN-T" })).rejects.toThrow(/highest command authority/);
    // A refused upward instruction is a SECURITY event.
    expect(await one(db, "SELECT seq FROM audit_events WHERE actor_id = 'u_dig' AND action = 'command.directive.issue' AND outcome = 'DENIED'")).toBeTruthy();
  }));

  it("the IG receives upward reports through the executive chain, and the DIG's report is a report, not an instruction", () => withDb(async (db) => {
    const dig = await actor(db, "u_dig");
    const r = await createReport(db, dig, { positionId: "pos_dig_ops", category: "STATUS", summary: "Synthetic national Operations status for the Inspector General.", progressStatus: "ON_TRACK" });
    await submitReport(db, dig, r.id);
    const rcp = await all<{ position_id: string; recipient_kind: string }>(db, "SELECT position_id, recipient_kind FROM report_recipients WHERE report_id = ?", r.id);
    expect(rcp).toEqual([{ position_id: "pos_ig", recipient_kind: "PRIMARY" }]);
    const ig = await actor(db, "u_rom");
    await acknowledgeReport(db, ig, await recipientId(db, r.id, "pos_ig"));
    expect(await all(db, "SELECT id FROM command_directives WHERE recipient_position_id = 'pos_ig'")).toHaveLength(0);
  }));
});

describe("Test B — downward directive through the Mobile Unit chain", () => {
  it("each level acknowledges and assigns onward to the next; only the holder of the receiving office can forward; completion closes upward", () => withDb(async (db) => {
    const chain: Array<[string, string]> = [["u_rom", "pos_ig"], ["u_dig", "pos_dig_ops"], ["u_hqc", "pos_comm"], ["u_mu_cmd", "pos_mu_cmd"], ["u_mu_s1", "pos_mu_s1"], ["u_mu_s2", "pos_mu_s2"],
      ["u_mu_acoy", "pos_mu_area_a"], ["u_mu_plt", "pos_mu_plt"], ["u_mu_sec", "pos_mu_insp"], ["u_mu_sgt", "pos_mu_sgt"], ["u_mu_cst", "pos_mu_cst"]];
    const ig = await actor(db, "u_rom");
    let d = await issueDirective(db, ig, { ...D("pos_ig", "pos_dig_ops"), category: "COMMAND_DIRECTIVE", dueDate: addDays(today(), 30) });
    const ids = [d.id];
    for (let i = 1; i < chain.length - 1; i++) {
      const a = await actor(db, chain[i][0]);
      await acknowledgeDirective(db, a, d.id);
      // Someone outside the office cannot forward it.
      if (i === 3) await expect(forwardDirective(db, await actor(db, "u_cb_cmd"), d.id, D("", chain[i + 1][1]))).rejects.toThrow(/not found|do not hold/i);
      d = await forwardDirective(db, a, d.id, { ...D("", chain[i + 1][1]), category: i < 4 ? "COMMAND_DIRECTIVE" : "OPS_ADMIN_TASK" });
      ids.push(d.id);
    }
    expect(d.recipient_position_id).toBe("pos_mu_cst");
    // The Constable (appointment holder without an application role) acknowledges and completes.
    const cst = await actor(db, "u_mu_cst");
    expect(cst.assignments).toHaveLength(0);
    await acknowledgeDirective(db, cst, d.id);
    await completeDirective(db, cst, d.id, "Synthetic task completed.");
    // A level with an open subordinate directive cannot report completion yet.
    const sgt = await actor(db, "u_mu_sgt");
    await completeDirective(db, sgt, ids[ids.length - 2], "Constable has completed.");
    await expect(completeDirective(db, await actor(db, "u_mu_cmd"), ids[2])).rejects.toThrow(/still open/);
    // The issuing office closes the completed directive below it.
    await closeDirective(db, await actor(db, "u_mu_sec"), ids[ids.length - 2]);
    expect((await getDirective(db, sgt, ids[ids.length - 2])).status).toBe("CLOSED");
    // The IG sees the whole chain below its directive; the Constable sees only its own and the chain above it.
    const igView = await listDirectives(db, ig, { box: "issued" });
    expect(igView.map((x) => x.id)).toContain(ids[0]);
    await expect(getDirective(db, ig, d.id)).resolves.toBeTruthy();
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE action = 'command.directive.forward' AND entity_id IN (" + ids.map(() => "?").join(",") + ")", ...ids))!.c).toBe(ids.length - 1);
  }));

  it("refuses skipping levels, junior-to-senior instructions and coordination channels issuing formal directives", () => withDb(async (db) => {
    const ig = await actor(db, "u_rom");
    await expect(issueDirective(db, ig, D("pos_ig", "pos_mu_cmd"))).rejects.toThrow(/directly below/);
    const cst = await actor(db, "u_mu_cst");
    await expect(issueDirective(db, cst, D("pos_mu_cst", "pos_mu_sgt"))).rejects.toThrow(/downward only/);
    const ops = await actor(db, "u_kit_ops");
    await expect(issueDirective(db, ops, { ...D("pos_kit_ops", "pos_mu_area_a"), category: "COMMAND_DIRECTIVE" })).rejects.toThrow(/coordination relationship allows/);
    await expect(issueDirective(db, ops, D("pos_kit_ops", "pos_mu_area_a"))).resolves.toBeTruthy();
    const oc = await actor(db, "u_kit_cmd");
    await expect(issueDirective(db, oc, D("pos_kit_oc", "pos_mu_area_a"))).rejects.toThrow(/reporting relationship carries reports/);
    // Issuing from an office you do not hold.
    await expect(issueDirective(db, await actor(db, "u_dig"), D("pos_comm", "pos_mu_cmd"))).rejects.toThrow(/do not hold/);
  }));
});

describe("Test C and D — junior-to-senior reporting", () => {
  it("Constable → Sergeant → Inspector → Section/Platoon Commander → Area Commander: each level reviews and forwards; returns and resubmission are recorded", () => withDb(async (db) => {
    const cst = await actor(db, "u_mu_cst");
    const r = await createReport(db, cst, { positionId: "pos_mu_cst", category: "STATUS", summary: "Synthetic constable status report for the sergeant.", progressStatus: "ON_TRACK" });
    await submitReport(db, cst, r.id);
    expect((await designatedRecipients(db, "pos_mu_cst")).primary.map((x) => x.superior_position_id)).toEqual(["pos_mu_sgt"]);
    const sgt = await actor(db, "u_mu_sgt");
    // The Inspector cannot act before the Sergeant has forwarded it: it does not even see it.
    await expect(getReport(db, await actor(db, "u_mu_sec"), r.id)).rejects.toThrow(/not found/i);
    const rs = await recipientId(db, r.id, "pos_mu_sgt");
    await acknowledgeReport(db, sgt, rs);
    await reviewReport(db, sgt, rs, "RETURNED", "Add the reporting period.");
    expect((await getReport(db, cst, r.id)).status).toBe("RETURNED");
    expect(await one(db, "SELECT id FROM notifications WHERE user_id = 'u_mu_cst' AND title = 'Report returned for correction'")).toBeTruthy();
    await submitReport(db, cst, r.id, { summary: "Synthetic constable status report for the sergeant, period corrected." });
    await acknowledgeReport(db, sgt, rs);
    await reviewReport(db, sgt, rs, "RECOMMENDED");
    await forwardReport(db, sgt, rs);
    for (const [u, p] of [["u_mu_sec", "pos_mu_insp"], ["u_mu_plt", "pos_mu_plt"]] as const) {
      const a = await actor(db, u);
      const id = await recipientId(db, r.id, p);
      await acknowledgeReport(db, a, id);
      await reviewReport(db, a, id, "NOTED");
      await forwardReport(db, a, id);
    }
    const area = await actor(db, "u_mu_acoy");
    const ra = await recipientId(db, r.id, "pos_mu_area_a");
    await acknowledgeReport(db, area, ra);
    const events = (await all<{ action: string }>(db, "SELECT action FROM report_events WHERE report_id = ? ORDER BY seq", r.id)).map((e) => e.action);
    expect(events).toEqual(["CREATE", "SUBMIT", "ACKNOWLEDGE", "RETURN", "RESUBMIT", "ACKNOWLEDGE", "REVIEW", "FORWARD", "ACKNOWLEDGE", "REVIEW", "FORWARD", "ACKNOWLEDGE", "REVIEW", "FORWARD", "ACKNOWLEDGE"]);
    expect((await all(db, "SELECT id FROM status_reports WHERE id = ?", r.id))).toHaveLength(1);
  }));

  it("Test D — the Section/Platoon Commander (Chief Inspector) reports to the Area Commander", () => withDb(async (db) => {
    expect((await designatedRecipients(db, "pos_mu_plt")).primary.map((x) => x.superior_position_id)).toEqual(["pos_mu_area_a"]);
    const plt = await actor(db, "u_mu_plt");
    const r = await createReport(db, plt, { positionId: "pos_mu_plt", category: "PROGRESS", summary: "Synthetic platoon progress report to the Area Commander.", progressStatus: "DELAYED", outstanding: "Two returns outstanding." });
    await submitReport(db, plt, r.id);
    const area = await actor(db, "u_mu_acoy");
    await acknowledgeReport(db, area, await recipientId(db, r.id, "pos_mu_area_a"));
  }));
});

describe("Test E — Area Commander parallel reporting", () => {
  it("one report, one reference, three recipients with separate acknowledgement records; a parallel recipient cannot return or forward along the other channel", () => withDb(async (db) => {
    const area = await actor(db, "u_mu_acoy");
    const r = await createReport(db, area, { positionId: "pos_mu_area_a", category: "AREA_STATUS", summary: "Synthetic area status report for both channels.", progressStatus: "ON_TRACK" });
    await submitReport(db, area, r.id);
    const rcp = await all<{ position_id: string; recipient_kind: string; status: string }>(db, "SELECT position_id, recipient_kind, status FROM report_recipients WHERE report_id = ? ORDER BY position_id", r.id);
    expect(rcp).toEqual([
      { position_id: "pos_kit_oc", recipient_kind: "PARALLEL", status: "PENDING" },
      { position_id: "pos_kit_ops", recipient_kind: "PARALLEL", status: "PENDING" },
      { position_id: "pos_mu_s2", recipient_kind: "PRIMARY", status: "PENDING" },
    ]);
    expect((await all(db, "SELECT id FROM status_reports WHERE reporter_position_id = 'pos_mu_area_a' AND id = ?", r.id))).toHaveLength(1);
    const ops = await actor(db, "u_kit_ops"), oc = await actor(db, "u_kit_cmd"), s2 = await actor(db, "u_mu_s2");
    const ro = await recipientId(db, r.id, "pos_kit_ops");
    await acknowledgeReport(db, ops, ro);
    // Separate records: one office's acknowledgement changes nothing for the others.
    expect((await one<{ status: string }>(db, "SELECT status FROM report_recipients WHERE id = ?", await recipientId(db, r.id, "pos_kit_oc")))!.status).toBe("PENDING");
    await acknowledgeReport(db, oc, await recipientId(db, r.id, "pos_kit_oc"));
    await acknowledgeReport(db, s2, await recipientId(db, r.id, "pos_mu_s2"));
    await expect(reviewReport(db, ops, ro, "RETURNED", "Not for a parallel recipient")).rejects.toThrow(/parallel recipient/);
    await reviewReport(db, ops, ro, "NOTED");
    await expect(forwardReport(db, ops, ro)).rejects.toThrow(/parallel recipient/);
    // Acknowledging a parallel report confers no authority to instruct.
    await expect(issueDirective(db, oc, D("pos_kit_oc", "pos_mu_area_a"))).rejects.toThrow(/reporting relationship/);
    // Someone in another chain cannot act as a recipient office.
    await expect(acknowledgeReport(db, await actor(db, "u_lsk_cmd"), await recipientId(db, r.id, "pos_mu_s2"))).rejects.toThrow(/not found/i);
  }));
});

describe("Test F — Mobile Unit upward reporting to the IG", () => {
  it("Area Commander → Staff II → Staff I → Divisional Commander → Commissioner → DIG Operations → IG, the same report forwarded at each level", () => withDb(async (db) => {
    const area = await actor(db, "u_mu_acoy");
    const r = await createReport(db, area, { positionId: "pos_mu_area_a", category: "STATUS", summary: "Synthetic Mobile Unit area report for the national chain.", progressStatus: "ON_TRACK" });
    await submitReport(db, area, r.id);
    for (const [u, p] of [["u_mu_s2", "pos_mu_s2"], ["u_mu_s1", "pos_mu_s1"], ["u_mu_cmd", "pos_mu_cmd"], ["u_hqc", "pos_comm"], ["u_dig", "pos_dig_ops"]] as const) {
      const a = await actor(db, u);
      const id = await recipientId(db, r.id, p);
      await acknowledgeReport(db, a, id);
      await reviewReport(db, a, id, "RECOMMENDED");
      await forwardReport(db, a, id);
    }
    const ig = await actor(db, "u_rom");
    const ri = await recipientId(db, r.id, "pos_ig");
    await acknowledgeReport(db, ig, ri);
    await reviewReport(db, ig, ri, "NOTED");
    const forwarded = await all<{ position_id: string }>(db, "SELECT position_id FROM report_recipients WHERE report_id = ? AND recipient_kind = 'FORWARDED' ORDER BY created_at", r.id);
    expect(forwarded.map((x) => x.position_id)).toEqual(["pos_mu_s1", "pos_mu_cmd", "pos_comm", "pos_dig_ops", "pos_ig"]);
  }));
});

describe("Test G — acting command authority", () => {
  it("acting officers exercise only delegated actions; expiry and revocation restore the ordinary configuration", () => withDb(async (db) => {
    const comm = await actor(db, "u_hqc"), dcomm = await actor(db, "u_hqstaff"), muCmd = await actor(db, "u_mu_cmd"), ddc = await actor(db, "u_mu_ddc"), s1 = await actor(db, "u_mu_s1"), s2 = await actor(db, "u_mu_s2");
    const t = today();
    // Being the deputy does not, by itself, confer the principal's authority.
    expect(await authorityFor(db, dcomm, "pos_comm", "REVIEW_REPORT")).toBeNull();
    const act = await appointActing(db, comm, { positionId: "pos_comm", actingUserId: "u_hqstaff", validFrom: t, validTo: addDays(t, 10), actions: ["ACKNOWLEDGE", "REVIEW_REPORT"], authorisingRef: "SYN-ACT-001" });
    const a = await authorityFor(db, dcomm, "pos_comm", "REVIEW_REPORT");
    expect(a?.authority).toBe("ACTING");
    // Not delegated: issuing directives as the Commissioner.
    await expect(issueDirective(db, dcomm, D("pos_comm", "pos_mu_cmd"))).rejects.toThrow(/do not hold/);
    // The Deputy Division Commander acts for the Divisional Commander with issuing delegated; the directive records ACTING.
    await appointActing(db, muCmd, { positionId: "pos_mu_cmd", actingUserId: "u_mu_ddc", validFrom: t, validTo: addDays(t, 5), actions: ["ISSUE_DIRECTIVE"], authorisingRef: "SYN-ACT-002" });
    const dir = await issueDirective(db, ddc, D("pos_mu_cmd", "pos_mu_s1"));
    expect(dir.authority).toBe("ACTING");
    // Staff II performs Staff I responsibilities only where delegated.
    await expect(issueDirective(db, s2, D("pos_mu_s1", "pos_mu_s2"))).rejects.toThrow(/do not hold/);
    await appointActing(db, s1, { positionId: "pos_mu_s1", actingUserId: "u_mu_s2", validFrom: t, validTo: addDays(t, 3), actions: ["ACKNOWLEDGE"], authorisingRef: "SYN-ACT-003" });
    await acknowledgeDirective(db, s2, dir.id);
    // Only the office holder or a superior may appoint an acting officer.
    await expect(appointActing(db, s2, { positionId: "pos_mu_cmd", actingUserId: "u_mu_s2", validFrom: t, validTo: addDays(t, 3), actions: ["ACKNOWLEDGE"], authorisingRef: "SYN-ACT-004" })).rejects.toThrow(/Only the holder/);
    // Technical administrators cannot act in command offices.
    await expect(appointActing(db, comm, { positionId: "pos_comm", actingUserId: "u_cb_tech", validFrom: t, validTo: addDays(t, 3), actions: ["ACKNOWLEDGE"], authorisingRef: "SYN-ACT-005" })).rejects.toThrow(/Technical administrators/);
    // Expiry restores the ordinary configuration (simulate time passing by moving the end date into the past).
    await run(db, "UPDATE acting_appointments SET valid_from = '2025-01-01T00:00:00.000Z', valid_to = '2025-01-02T00:00:00.000Z' WHERE id = ?", act);
    expect(await authorityFor(db, dcomm, "pos_comm", "REVIEW_REPORT")).toBeNull();
    // Revocation does the same.
    const act2 = await appointActing(db, comm, { positionId: "pos_comm", actingUserId: "u_hqstaff", validFrom: t, validTo: addDays(t, 2), actions: ["ACKNOWLEDGE"], authorisingRef: "SYN-ACT-006" });
    expect(await authorityFor(db, dcomm, "pos_comm", "ACKNOWLEDGE")).toBeTruthy();
    await revokeActing(db, comm, act2);
    expect(await authorityFor(db, dcomm, "pos_comm", "ACKNOWLEDGE")).toBeNull();
    expect((await officesHeld(db, dcomm)).map((h) => h.positionId)).toEqual(["pos_dcomm"]);
  }));
});

describe("Test H — conflicting tasking from parallel channels", () => {
  it("is flagged and referred to the nearest common superior, which decides; nothing is decided automatically", () => withDb(async (db) => {
    const s2 = await actor(db, "u_mu_s2"), ops = await actor(db, "u_kit_ops"), area = await actor(db, "u_mu_acoy");
    const mpr = (await one<{ reference: string }>(db, "SELECT reference FROM manpower_requests WHERE requesting_unit_id = 'org_cb' LIMIT 1"))?.reference;
    const a = await issueDirective(db, s2, { ...D("pos_mu_s2", "pos_mu_area_a"), category: "OPS_ADMIN_TASK", subject: "Synthetic formation task", dueDate: addDays(today(), 3) });
    const b = await issueDirective(db, ops, { ...D("pos_kit_ops", "pos_mu_area_a"), subject: "Synthetic district coordination task", dueDate: addDays(today(), 3) });
    const id = await flagConflict(db, area, { directiveAId: a.id, directiveBId: b.id, reason: "Both tasks require the same section on the same day (synthetic)." });
    const c = (await one<{ common_superior_position_id: string; status: string; decision: string | null }>(db, "SELECT common_superior_position_id, status, decision FROM command_conflicts WHERE id = ?", id))!;
    expect(c).toEqual({ common_superior_position_id: "pos_comm", status: "OPEN", decision: null });
    // Both directives stay as they were; no precedence was applied.
    expect((await getDirective(db, area, a.id)).status).toBe("ISSUED");
    expect((await getDirective(db, area, b.id)).status).toBe("ISSUED");
    expect(await one(db, "SELECT id FROM notifications WHERE user_id = 'u_hqc' AND title = 'Command conflict referred to you'")).toBeTruthy();
    // Neither issuing office can decide; the common superior can.
    await expect(resolveConflict(db, s2, id, "A_PRECEDES", "Formation task first (synthetic).")).rejects.toThrow(/do not hold/);
    await expect(resolveConflict(db, ops, id, "B_PRECEDES", "District task first (synthetic).")).rejects.toThrow(/do not hold/);
    await resolveConflict(db, await actor(db, "u_hqc"), id, "WITHDRAW_B", "The formation task stands; the district task is withdrawn (synthetic).");
    expect((await getDirective(db, area, b.id)).status).toBe("CANCELLED");
    expect((await getDirective(db, area, a.id)).status).toBe("ISSUED");
    // Automatic flag: two offices instruct the same office about the same related record.
    expect(mpr).toBeTruthy();
    // Staff II Copperbelt also coordinates with the Deputy Division Commander (test relationship); both can see the request.
    await run(db, "INSERT INTO reporting_relationships (id, subordinate_position_id, superior_position_id, relationship_type, valid_from, authorising_ref, created_at) VALUES ('rel_test_coord','pos_cb_s2','pos_cb_ddc','ADMIN_COORDINATION', '2025-01-01T00:00:00.000Z', 'SYN-T', ?)", new Date().toISOString());
    await issueDirective(db, await actor(db, "u_cb_sops"), { ...D("pos_cb_s1", "pos_cb_s2"), relatedType: "MANPOWER_REQUEST", relatedReference: mpr });
    await issueDirective(db, await actor(db, "u_aao"), { ...D("pos_cb_ddc", "pos_cb_s2"), relatedType: "MANPOWER_REQUEST", relatedReference: mpr });
    const auto = await one<{ common_superior_position_id: string; status: string }>(db, "SELECT common_superior_position_id, status FROM command_conflicts WHERE recipient_position_id = 'pos_cb_s2' AND source = 'AUTOMATIC'");
    expect(auto).toEqual({ common_superior_position_id: "pos_cb_cmd", status: "OPEN" });
  }));
});

describe("Test I — reporting confidentiality", () => {
  it("offices outside the issuer/recipient chain get a neutral not-found, audited; technical and liaison accounts hold no office", () => withDb(async (db) => {
    const area = await actor(db, "u_mu_acoy");
    const r = await createReport(db, area, { positionId: "pos_mu_area_a", category: "STATUS", summary: "Synthetic confidential area report.", progressStatus: "ON_TRACK" });
    await submitReport(db, area, r.id);
    const s2 = await actor(db, "u_mu_s2");
    const d = await issueDirective(db, s2, D("pos_mu_s2", "pos_mu_area_a"));
    for (const id of ["u_lsk_cmd", "u_lsk_sops", "u_cb_tech", "u_plat", "u_kit_pio", "u_kitc_ops"]) {
      const a = await actor(db, id);
      await expect(getReport(db, a, r.id)).rejects.toThrow(/not found/i);
      await expect(getDirective(db, a, d.id)).rejects.toThrow(/not found/i);
    }
    expect(await officesHeld(db, await actor(db, "u_cb_tech"))).toEqual([]);
    expect(await officesHeld(db, await actor(db, "u_kit_pio"))).toEqual([]);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE actor_id = 'u_lsk_cmd' AND action IN ('command.report.view','command.directive.view') AND outcome = 'DENIED'"))!.c)).toBe(2);
    // The structure manager cannot appoint technical administrators or liaison officers to command offices.
    const { appoint } = await import("@/server/domain/command");
    await expect(appoint(db, await actor(db, "u_hqc"), { positionId: "pos_kitc_si", userId: "u_kitc_tech", authorisingRef: "SYN-T" })).rejects.toThrow(/cannot hold command offices/);
    // Appointment-only access can be switched off.
    await run(db, "INSERT INTO app_settings (`key`, value, description) VALUES ('command.appointment_access', 'off', 'test') ON DUPLICATE KEY UPDATE value = 'off'");
    expect(await officesHeld(db, await actor(db, "u_mu_cst"))).toEqual([]);
    expect((await officesHeld(db, await actor(db, "u_mu_sec"))).length).toBe(1);
  }));

  it("reporting loops are refused", () => withDb(async (db) => {
    const mgr = await actor(db, "u_hqc");
    await expect(addRelationship(db, mgr, { subordinatePositionId: "pos_mu_cmd", superiorPositionId: "pos_mu_cst", relationshipType: "PRIMARY_REPORTING", authorisingRef: "SYN-T" })).rejects.toThrow(/loop/);
    await expect(addRelationship(db, mgr, { subordinatePositionId: "pos_comm", superiorPositionId: "pos_mu_s1", relationshipType: "PARALLEL_REPORTING", authorisingRef: "SYN-T" })).rejects.toThrow(/loop/);
    await expect(addRelationship(db, mgr, { subordinatePositionId: "pos_mu_s2", superiorPositionId: "pos_cb_s1", relationshipType: "PRIMARY_COMMAND", authorisingRef: "SYN-T" })).rejects.toThrow(/already has a primary command superior/);
    // Only the structure manager changes the structure.
    await expect(addRelationship(db, await actor(db, "u_mu_cmd"), { subordinatePositionId: "pos_mu_cst", superiorPositionId: "pos_mu_insp", relationshipType: "PARALLEL_REPORTING", authorisingRef: "SYN-T" })).rejects.toThrow(/not authorised/);
  }));
});

describe("Test J — integration with manpower, assignments, transfers, notifications and audit", () => {
  it("a directive may reference a record only within the issuer's scope; notifications and audit are written; free text is screened", () => withDb(async (db) => {
    const cb = await actor(db, "u_cb_sops");
    const mprCb = (await one<{ reference: string }>(db, "SELECT reference FROM manpower_requests WHERE requesting_unit_id = 'org_cb' LIMIT 1"))?.reference;
    const mprLsk = (await one<{ reference: string }>(db, "SELECT reference FROM manpower_requests WHERE requesting_unit_id = 'org_lsk' LIMIT 1"))?.reference;
    if (mprCb) {
      const d = await issueDirective(db, cb, { ...D("pos_cb_s1", "pos_cb_s2"), category: "PERSONNEL_ASSIGNMENT", relatedType: "MANPOWER_REQUEST", relatedReference: mprCb });
      expect(d.related_reference).toBe(mprCb);
      expect(await one(db, "SELECT id FROM notifications WHERE user_id = 'u_cb_asg' AND title = 'Directive received'")).toBeTruthy();
      expect(await one(db, "SELECT seq FROM audit_events WHERE action = 'command.directive.issue' AND entity_id = ?", d.id)).toBeTruthy();
    }
    if (mprLsk) await expect(issueDirective(db, cb, { ...D("pos_cb_s1", "pos_cb_s2"), relatedType: "MANPOWER_REQUEST", relatedReference: mprLsk })).rejects.toThrow(/within your authorised scope/);
    await expect(issueDirective(db, cb, { ...D("pos_cb_s1", "pos_cb_s2"), relatedType: "TRANSFER", relatedReference: "TRF-0000-NONE" })).rejects.toThrow(/within your authorised scope/);
    await expect(issueDirective(db, cb, { ...D("pos_cb_s1", "pos_cb_s2"), instructions: "Plan the patrol routes for the weekend." })).rejects.toThrow(/excluded class/);
    const area = await actor(db, "u_mu_acoy");
    await expect(createReport(db, area, { positionId: "pos_mu_area_a", category: "STATUS", summary: "Informant meeting notes for the week.", progressStatus: "ON_TRACK" })).rejects.toThrow(/excluded class/);
  }));
});
