/**
 * Accountability record of a directive (institutional directive 28 Nov 2026, §13.4). Synthetic data only.
 * Seed step 014 issues IG → DIG Operations, forwarded to the Commissioner and on to the Divisional Commander, Mobile Unit.
 */
import { describe, expect, it } from "vitest";
import { one } from "@/server/db/connection";
import { acknowledgeDirective, appointActing, completeDirective, directiveAccountability, issueDirective } from "@/server/domain/command";
import { addDays, notify, today } from "@/server/domain/core";
import { actor, withDb } from "./helpers";

describe("directive accountability record (§13.4)", () => {
  it("names the originating officer, issuing authority, responsible officer, parent unit, acknowledgement, completion, escalations and audit", () => withDb(async (db) => {
    const leaf = (await one<{ id: string }>(db, "SELECT id FROM command_directives WHERE recipient_position_id = 'pos_mu_cmd' AND parent_id IS NOT NULL ORDER BY created_at LIMIT 1"))!.id;
    const muCmd = await actor(db, "u_mu_cmd");
    let a = await directiveAccountability(db, muCmd, leaf);
    expect(a.originating.office).toBe("Inspector General of Police");
    expect(a.issuing).toMatchObject({ office: "Commissioner – Operations HQ", authority: "SUBSTANTIVE" });
    expect(a.responsible).toEqual([{ name: "Demo Mobile Unit Formation Commander", authority: "SUBSTANTIVE" }]);
    expect(a.unit).toBe("Mobile Unit Division / SPOM, Kamfinsa");
    expect(a.acknowledged).toBeNull();
    expect(a.auditEvents).toBeGreaterThan(0);
    // The automation's escalation notices appear in the history (same dedupe keys as command.acknowledgement-reminders).
    await notify(db, "u_hqc", "Not yet acknowledged", "Synthetic", `/app/command/directives/${leaf}`, { dedupeKey: `dir-esc:${leaf}:${today()}:u_hqc` });
    await acknowledgeDirective(db, muCmd, leaf);
    a = await directiveAccountability(db, muCmd, leaf);
    expect(a.acknowledged?.by).toBe("Demo Mobile Unit Formation Commander");
    expect(a.escalations).toEqual([{ at: today(), what: "Escalated to the issuing office: not acknowledged", count: 1 }]);
    // An officer outside the directive chain cannot read it.
    await expect(directiveAccountability(db, await actor(db, "u_lsk_cmd"), leaf)).rejects.toThrow();
  }));

  it("records acting authority with its reference, and completion", () => withDb(async (db) => {
    const cc = await actor(db, "u_mu_hqcc"), deputy = await actor(db, "u_mu_hqdcc"), hq5 = await actor(db, "u_mu_hq5");
    const t = today();
    await appointActing(db, cc, { positionId: "pos_mu_hq_cc", actingUserId: "u_mu_hqdcc", validFrom: t, validTo: addDays(t, 7), actions: ["ISSUE_DIRECTIVE"], authorisingRef: "SYN-ACT-ACC-1" });
    const d = await issueDirective(db, deputy, { fromPositionId: "pos_mu_hq_cc", toPositionId: "pos_mu_hq5_dc", category: "OPS_ADMIN_TASK", subject: "Synthetic duty roster return", instructions: "Submit the synthetic duty roster return for HQ 5 Detachment.", ackRequired: false });
    let a = await directiveAccountability(db, hq5, d.id);
    expect(a.issuing).toMatchObject({ authority: "ACTING", actingRef: "SYN-ACT-ACC-1", by: "Demo HQ Company Deputy Commander" });
    expect(a.responsible.map((r) => r.name)).toEqual(["Demo HQ 5 Detachment Commander"]);
    expect(a.parentUnit).toBe("HQ Company");
    await completeDirective(db, hq5, d.id, "Synthetic return submitted.");
    a = await directiveAccountability(db, hq5, d.id);
    expect(a.completed?.by).toBe("Demo HQ 5 Detachment Commander");
  }));
});
