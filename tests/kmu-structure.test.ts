/**
 * Kamfinsa Mobile Unit established structure (institutional compliance directive 28 Nov 2026, Part V; seed step 016).
 * The Companies, Detachments, parent relationships and duty stations are ESTABLISHED facts supplied by the ZPS project
 * stakeholders; office holders and personnel are synthetic.
 */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import {
  acknowledgeReport, appointActing, authorityFor, commandChain, createReport, designatedRecipients, getReport, issueDirective, officesHeld, submitReport,
} from "@/server/domain/command";
import { getOrgUnit } from "@/server/domain/org";
import { listPersonnel } from "@/server/domain/personnel";
import { addDays, today } from "@/server/domain/core";
import { KMU_COMPANIES, KMU_DETACHMENTS, companyOffice, detachmentOffice } from "@/server/db/seed-kmu";
import { actor, withDb } from "./helpers";

const D = (from: string, to: string) => ({ fromPositionId: from, toPositionId: to, category: "ADMIN_INSTRUCTION" as const, subject: "Synthetic administrative instruction", instructions: "Complete the synthetic administrative return and report." });

describe("Kamfinsa Mobile Unit established structure", () => {
  it("has exactly the five established Companies under the Mobile Unit, recorded as established", () => withDb(async (db) => {
    const rows = await all<{ id: string; name: string; synthetic: number; parent_id: string }>(db,
      `SELECT o.id, o.name, o.synthetic, r.parent_id FROM org_units o JOIN org_relationships r ON r.child_id = o.id AND r.effective_to IS NULL
        WHERE o.unit_type = 'COMPANY' AND r.parent_id = 'org_mu' ORDER BY o.id`);
    expect(rows.map((r) => r.name).sort()).toEqual(["A Company", "B Company", "C Company", "D Company", "HQ Company"]);
    expect(rows.every((r) => r.synthetic === 0)).toBe(true);
  }));

  it("places each established Detachment under its stated Company with its duty station", () => withDb(async (db) => {
    const expected: Record<string, [string, string]> = {
      "HQ 5 Detachment": ["HQ Company", "Kitwe, Copperbelt Province"], "B4 Detachment": ["B Company", "Sikanze Police Camp, Lusaka"],
      "A2 Detachment": ["A Company", "Kabwe, Central Province"], "A4 Detachment": ["A Company", "Mansa, Luapula Province"],
      "D3 Detachment": ["D Company", "Mufulira, Copperbelt Province"], "D4 Detachment": ["D Company", "Choma, Southern Province"],
    };
    const rows = await all<{ name: string; duty_station: string; parent: string; synthetic: number; validation_note: string }>(db,
      `SELECT o.name, o.duty_station, p.name AS parent, o.synthetic, o.validation_note FROM org_units o JOIN org_relationships r ON r.child_id = o.id AND r.effective_to IS NULL
         JOIN org_units p ON p.id = r.parent_id WHERE o.unit_type = 'DETACHMENT' AND o.synthetic = 0`);
    expect(Object.fromEntries(rows.map((r) => [r.name, [r.parent, r.duty_station]]))).toEqual(expected);
    expect(rows.every((r) => /Established structure confirmed/.test(r.validation_note))).toBe(true);
    // The development placeholders are kept, and are labelled as synthetic training units (never as established).
    const placeholders = await all<{ name: string; synthetic: number }>(db, "SELECT name, synthetic FROM org_units WHERE id IN ('org_mu_a1','org_mu_b1')");
    expect(placeholders.every((p) => p.synthetic === 1 && /synthetic training unit/.test(p.name))).toBe(true);
    // The closure table places every Detachment inside the Mobile Unit subtree.
    const inMu = await all(db, `SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_mu' AND descendant_id IN (${KMU_DETACHMENTS.map(() => "?").join(",")})`, ...KMU_DETACHMENTS.map(([id]) => id));
    expect(inMu).toHaveLength(6);
  }));

  it("records the Provincial Divisions and named formations as established coverage, not provisional", () => withDb(async (db) => {
    const rows = await all<{ id: string; synthetic: number; validation_note: string }>(db, "SELECT id, synthetic, validation_note FROM org_units WHERE unit_type = 'PROVINCIAL_DIVISION' OR id IN ('org_mu','org_pmb','org_ap','org_taz','org_pu')");
    expect(rows).toHaveLength(15);
    for (const r of rows) {
      expect(r.synthetic).toBe(0);
      expect(r.validation_note).not.toMatch(/provisional/i);
    }
    const u = await getOrgUnit(db, await actor(db, "u_mu_cmd"), "org_mu_hq5");
    expect(u.duty_station).toBe("Kitwe, Copperbelt Province");
  }));
});

describe("Company and Detachment command offices", () => {
  it("every Company has a Company Commander and a Deputy; every Detachment a Detachment Commander", () => withDb(async (db) => {
    for (const [id] of KMU_COMPANIES) {
      const offices = await all<{ position_type: string }>(db, "SELECT position_type FROM command_positions WHERE org_unit_id = ? AND position_type IN ('COMPANY_COMMANDER','DEPUTY_COMPANY_COMMANDER')", id);
      expect(offices.map((o) => o.position_type).sort()).toEqual(["COMPANY_COMMANDER", "DEPUTY_COMPANY_COMMANDER"]);
    }
    for (const [id] of KMU_DETACHMENTS) expect(await one(db, "SELECT id FROM command_positions WHERE org_unit_id = ? AND position_type = 'DETACHMENT_COMMANDER'", id)).toBeTruthy();
  }));

  it("HQ 5 Detachment (Kitwe) reports to the HQ Company Commander, with the Deputy as parallel recipient, then via Staff II and Staff I to the Divisional Commander and up to the IG (#2)", () => withDb(async (db) => {
    const dc = detachmentOffice("org_mu_hq5");
    expect(await commandChain(db, dc)).toEqual([companyOffice("org_mu_hq"), "pos_mu_s2", "pos_mu_s1", "pos_mu_cmd", "pos_comm", "pos_dig_ops", "pos_ig"]);
    const rec = await designatedRecipients(db, dc);
    expect(rec.primary.map((r) => r.superior_position_id)).toEqual([companyOffice("org_mu_hq")]);
    expect(rec.parallel.map((r) => r.superior_position_id)).toEqual([companyOffice("org_mu_hq", true)]);

    const hq5 = await actor(db, "u_mu_hq5");
    const r = await createReport(db, hq5, { positionId: dc, category: "STATUS", summary: "Synthetic weekly administrative status of HQ 5 Detachment.", progressStatus: "ON_TRACK" });
    await submitReport(db, hq5, r.id);
    const rcp = await all<{ position_id: string; recipient_kind: string }>(db, "SELECT position_id, recipient_kind FROM report_recipients WHERE report_id = ? ORDER BY recipient_kind DESC", r.id);
    expect(rcp).toEqual([{ position_id: companyOffice("org_mu_hq"), recipient_kind: "PRIMARY" }, { position_id: companyOffice("org_mu_hq", true), recipient_kind: "PARALLEL" }]);
    // One report, one reference: both offices see the same record; the Deputy acknowledges its own recipient row.
    const deputy = await actor(db, "u_mu_hqdcc");
    expect((await getReport(db, deputy, r.id)).id).toBe(r.id);
    const row = (await one<{ id: string }>(db, "SELECT id FROM report_recipients WHERE report_id = ? AND position_id = ?", r.id, companyOffice("org_mu_hq", true)))!.id;
    await acknowledgeReport(db, deputy, row);
    // A Detachment Commander of another Company cannot read it.
    await expect(getReport(db, await actor(db, "u_mu_d3"), r.id)).rejects.toThrow();
  }));

  it("instructions flow down only: Company Commander → Detachment Commander, never upward", () => withDb(async (db) => {
    const cc = await actor(db, "u_mu_hqcc"), hq5 = await actor(db, "u_mu_hq5");
    const d = await issueDirective(db, cc, D(companyOffice("org_mu_hq"), detachmentOffice("org_mu_hq5")));
    expect(d.recipient_position_id).toBe(detachmentOffice("org_mu_hq5"));
    await expect(issueDirective(db, hq5, D(detachmentOffice("org_mu_hq5"), companyOffice("org_mu_hq")))).rejects.toThrow(/downward only|directly below/);
    // A Company Commander cannot instruct another Company's Detachment.
    await expect(issueDirective(db, cc, D(companyOffice("org_mu_hq"), detachmentOffice("org_mu_d3")))).rejects.toThrow(/directly below/);
  }));

  it("the Deputy Company Commander assumes the Company Commander's duties only through a dated acting appointment", () => withDb(async (db) => {
    const cc = await actor(db, "u_mu_hqcc"), deputy = await actor(db, "u_mu_hqdcc");
    const co = companyOffice("org_mu_hq");
    expect(await authorityFor(db, deputy, co, "ISSUE_DIRECTIVE")).toBeNull();
    const t = today();
    await appointActing(db, cc, { positionId: co, actingUserId: "u_mu_hqdcc", validFrom: t, validTo: addDays(t, 14), actions: ["ISSUE_DIRECTIVE", "ACKNOWLEDGE", "REVIEW_REPORT"], authorisingRef: "SYN-ACT-KMU-01" });
    const a = await authorityFor(db, deputy, co, "ISSUE_DIRECTIVE");
    expect(a?.authority).toBe("ACTING");
    const d = await issueDirective(db, deputy, D(co, detachmentOffice("org_mu_hq5")));
    expect(d.authority).toBe("ACTING");
    const rec = await one<{ actions: string; valid_from: string; valid_to: string; authorising_ref: string }>(db, "SELECT actions, valid_from, valid_to, authorising_ref FROM acting_appointments WHERE position_id = ? AND acting_user_id = 'u_mu_hqdcc'", co);
    expect(rec).toMatchObject({ authorising_ref: "SYN-ACT-KMU-01" });
    expect(rec!.valid_to.slice(0, 10)).toBe(addDays(t, 14));
    expect((await officesHeld(db, deputy)).map((h) => `${h.positionId}:${h.authority}`).sort()).toEqual([`${co}:ACTING`, `${companyOffice("org_mu_hq", true)}:SUBSTANTIVE`]);
  }));

  it("a Detachment Commander's personnel view is limited to the Detachment", () => withDb(async (db) => {
    const hq5 = await actor(db, "u_mu_hq5");
    const page = await listPersonnel(db, hq5, {});
    expect(page.rows.length).toBeGreaterThan(0);
    expect(new Set(page.rows.map((p) => p.home_unit_id))).toEqual(new Set(["org_mu_hq5"]));
  }));
});
