/**
 * Negative command and permission tests (master execution prompt §8, issues #5 and #6). Synthetic data only.
 * Verifies that unauthorised actions FAIL: DIG Administration has no route into Operations records (H-3 pending),
 * report recipients cannot be chosen or hijacked, a junior office cannot decide a conflict, and an expired acting
 * appointment stops working at once.
 */
import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import {
  acknowledgeReport, appointActing, authorityFor, createReport, designatedRecipients, directiveAccountability, flagConflict, getDirective, getReport,
  issueDirective, listDirectives, listReports, officesHeld, resolveConflict, submitReport,
} from "@/server/domain/command";
import { addDays, today } from "@/server/domain/core";
import { areaWorkspace, companyWorkspace, platoonWorkspace } from "@/server/domain/field-command";
import { listPersonnel } from "@/server/domain/personnel";
import { actor, withDb } from "./helpers";

type Db = Parameters<typeof issueDirective>[0];
const D = (from: string, to: string) => ({ fromPositionId: from, toPositionId: to, category: "ADMIN_INSTRUCTION" as const, subject: "Synthetic administrative instruction", instructions: "Complete the synthetic administrative return and report." });

/** The synthetic DIG Administration office holder (seed step 019): an executive appointment with no application role. */
const digAdministration = (db: Db) => actor(db, "u_digadm");

describe("H-3 — DIG Administration has no access to Operations records (decision pending, #6)", () => {
  it("holds only its own office, sees no Operations directives or reports, and cannot open any by id", () => withDb(async (db) => {
    const adm = await digAdministration(db);
    // Executive appointment (DEC-088): holds its OWN office only — nothing in the Operations chain.
    expect((await officesHeld(db, adm)).map((h) => h.positionId)).toEqual(["pos_dig_adm"]);
    expect(await listDirectives(db, adm)).toEqual([]);
    expect(await listReports(db, adm)).toEqual([]);
    const dir = (await one<{ id: string }>(db, "SELECT id FROM command_directives LIMIT 1"))!.id;
    const rpt = (await one<{ id: string }>(db, "SELECT id FROM status_reports WHERE status = 'SUBMITTED' LIMIT 1"))!.id;
    await expect(getDirective(db, adm, dir)).rejects.toThrow();
    await expect(directiveAccountability(db, adm, dir)).rejects.toThrow();
    await expect(getReport(db, adm, rpt)).rejects.toThrow();
    await expect(listPersonnel(db, adm, {})).rejects.toThrow();
    for (const [fn, pos] of [[platoonWorkspace, "pos_mu_plt"], [areaWorkspace, "pos_mu_area_a"], [companyWorkspace, "pos_mu_hq_cc"]] as const) {
      await expect(fn(db, adm, pos)).rejects.toThrow();
    }
  }));

  it("is outside every Operations reporting line: DIG Operations reports only to the IG, and nothing reports to DIG Administration", () => withDb(async (db) => {
    const r = await designatedRecipients(db, "pos_dig_ops");
    expect([...r.primary, ...r.parallel].map((x) => x.superior_position_id)).toEqual(["pos_ig"]);
    expect(await all(db, "SELECT id FROM reporting_relationships WHERE superior_position_id = 'pos_dig_adm' AND ended_at IS NULL")).toEqual([]);
    // DIG Operations cannot instruct DIG Administration either (no relationship, and never sideways).
    await expect(issueDirective(db, await actor(db, "u_dig"), D("pos_dig_ops", "pos_dig_adm"))).rejects.toThrow(/directly below|downward only/);
  }));
});

describe("Report recipients are fixed by the configured structure", () => {
  it("a caller cannot add or choose recipients, and cannot act on another office's recipient row", () => withDb(async (db) => {
    const plt = await actor(db, "u_mu_plt");
    const r = await createReport(db, plt, { positionId: "pos_mu_plt", category: "STATUS", summary: "Synthetic platoon status for the Area Commander.", progressStatus: "ON_TRACK",
      ...({ recipients: ["pos_ig", "pos_dig_ops"], recipientPositionIds: ["pos_ig"] } as object) });
    await submitReport(db, plt, r.id);
    const rcp = await all<{ position_id: string }>(db, "SELECT position_id FROM report_recipients WHERE report_id = ?", r.id);
    expect(rcp.map((x) => x.position_id)).toEqual(["pos_mu_area_a"]);
    const row = (await one<{ id: string }>(db, "SELECT id FROM report_recipients WHERE report_id = ?", r.id))!.id;
    // Someone who does not hold the recipient office cannot acknowledge it — including the reporter and a superior further up.
    await expect(acknowledgeReport(db, plt, row)).rejects.toThrow();
    await expect(acknowledgeReport(db, await actor(db, "u_mu_s2"), row)).rejects.toThrow();
    await acknowledgeReport(db, await actor(db, "u_mu_acoy"), row);
    // A report cannot be submitted from an office the user does not hold.
    await expect(createReport(db, plt, { positionId: "pos_mu_area_a", category: "STATUS", summary: "Synthetic report from someone else's office.", progressStatus: "ON_TRACK" })).rejects.toThrow(/do not hold/);
  }));
});

describe("Conflicts — the common-superior mechanism (CF-1 not activated, #5)", () => {
  it("the junior receiving office can refer a conflict but cannot decide it or override either superior", () => withDb(async (db) => {
    const s2 = await actor(db, "u_mu_s2"), ops = await actor(db, "u_kit_ops"), area = await actor(db, "u_mu_acoy");
    const a = await issueDirective(db, s2, { ...D("pos_mu_s2", "pos_mu_area_a"), category: "OPS_ADMIN_TASK" as const, dueDate: addDays(today(), 3) });
    const b = await issueDirective(db, ops, { ...D("pos_kit_ops", "pos_mu_area_a"), dueDate: addDays(today(), 3) });
    const id = await flagConflict(db, area, { directiveAId: a.id, directiveBId: b.id, reason: "Both require the same section on the same day (synthetic)." });
    for (const decision of ["A_PRECEDES", "B_PRECEDES", "WITHDRAW_A", "WITHDRAW_B", "BOTH_STAND"] as const) {
      await expect(resolveConflict(db, area, id, decision, "Junior attempting to decide (synthetic).")).rejects.toThrow();
    }
    expect((await one<{ status: string }>(db, "SELECT status FROM command_conflicts WHERE id = ?", id))!.status).toBe("OPEN");
    expect((await getDirective(db, area, a.id)).status).toBe("ISSUED");
    expect((await getDirective(db, area, b.id)).status).toBe("ISSUED");
    // No dedicated Conflict Referral Office exists: the referral goes to the nearest common superior.
    expect((await one<{ common_superior_position_id: string }>(db, "SELECT common_superior_position_id FROM command_conflicts WHERE id = ?", id))!.common_superior_position_id).toBe("pos_comm");
  }));
});

describe("Acting appointments stop at once when they expire", () => {
  it("an acting appointment one second past its end gives no authority", () => withDb(async (db) => {
    const cc = await actor(db, "u_mu_hqcc"), deputy = await actor(db, "u_mu_hqdcc");
    const t = today();
    const id = await appointActing(db, cc, { positionId: "pos_mu_hq_cc", actingUserId: "u_mu_hqdcc", validFrom: t, validTo: addDays(t, 3), actions: ["ISSUE_DIRECTIVE"], authorisingRef: "SYN-ACT-NEG-1" });
    expect(await authorityFor(db, deputy, "pos_mu_hq_cc", "ISSUE_DIRECTIVE")).toBeTruthy();
    await run(db, "UPDATE acting_appointments SET valid_to = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), id);
    expect(await authorityFor(db, deputy, "pos_mu_hq_cc", "ISSUE_DIRECTIVE")).toBeNull();
    await expect(issueDirective(db, deputy, D("pos_mu_hq_cc", "pos_mu_hq5_dc"))).rejects.toThrow(/do not hold/);
  }));
});
