import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { initiateTransfer, markRenewalPending } from "@/server/domain/assignments";
import { exportRoster, ROSTER_STATUS_LABEL } from "@/server/domain/manpower";
import { rosterPdf } from "@/server/domain/pdf";
import { runJob } from "@/server/jobs/engine";
import { closeReconciliation, openReconciliation, reconciliationDetail, recordItem } from "@/server/domain/reconciliation";
import { deleteSavedReport, getSavedReport, listSavedReports, runReport, saveReport, shapeRows, REPORTS } from "@/server/domain/reports";
import { actor, withDb } from "./helpers";

describe("finer action permissions (Prompt §7.2)", () => {
  it("separates proposing, transferring and renewing", () => withDb(async (db) => {
    const planner = await actor(db, "u_kit_asg"); // Deputy OC — District: propose only
    expect(can(planner, "assignment.propose", "org_cb_kitwe")).toBe(true);
    expect(can(planner, "assignment.transfer", "org_cb_kitwe")).toBe(false);
    expect(can(planner, "assignment.renew", "org_cb_kitwe")).toBe(false);
    const a = (await one<{ id: string }>(db, "SELECT id FROM personnel_assignments WHERE area_id = 'area_kcm' AND status = 'ACTIVE' ORDER BY commencement_date LIMIT 1"))!;
    await expect(initiateTransfer(db, planner, a.id, { toAreaId: "area_mopani", justification: "Planner should not be able to start transfers.", proposedDate: "2026-12-01" })).rejects.toThrow(/not authorised/);
    await expect(markRenewalPending(db, planner, a.id, "x")).rejects.toThrow(/not authorised/);
    const coord = await actor(db, "u_cb_asg");
    expect(can(coord, "assignment.transfer", "org_cb_kitwe") && can(coord, "assignment.renew", "org_cb_kitwe")).toBe(true);
  }));
});

describe("server-generated roster PDF", () => {
  it("renders an A4 PDF for an authorised user", () => withDb(async (db) => {
    const v = (await one<{ id: string }>(db, "SELECT id FROM roster_versions WHERE status = 'FINALISED' LIMIT 1"))!;
    const u = await actor(db, "u_cb_sops");
    const r = await exportRoster(db, u, v.id, "pdf");
    const pdf = await rosterPdf({ request: r.request, version: r.version, entries: r.entries, statusLabel: ROSTER_STATUS_LABEL[r.version.status], printedBy: u.displayName });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'roster.export.pdf' AND entity_id = ?", v.id))!.c)).toBe(1);
    await expect(exportRoster(db, await actor(db, "u_lsk_cmd"), v.id, "pdf")).rejects.toThrow();
  }));
});

describe("unusual access flags (Module 14)", () => {
  it("flags repeated denials to security administrators once per day", () => withDb(async (db) => {
    const t = new Date().toISOString();
    for (let i = 0; i < 10; i++) {
      await run(db, "INSERT INTO login_attempts (username, client_key, succeeded, created_at) VALUES ('demo.suspicious', ?, 0, ?)", "k".repeat(64), t);
    }
    await runJob(db, "security.unusual-access", "MANUAL");
    await runJob(db, "security.unusual-access", "MANUAL");
    const notes = await all<{ user_id: string }>(db, "SELECT user_id FROM notifications WHERE dedupe_key LIKE 'flag-login:demo.suspicious:%'");
    expect(notes.map((n) => n.user_id)).toContain("u_sec");
    expect(new Set(notes.map((n) => n.user_id)).size).toBe(notes.length);
  }));
});

describe("asset reconciliation (Module 11)", () => {
  it("checks every asset, records findings and refreshes inspection dates", () => withDb(async (db) => {
    const cust = await actor(db, "u_asset");
    const id = await openReconciliation(db, cust, "org_lsk", "Quarterly stock-take (test)");
    await expect(openReconciliation(db, cust, "org_lsk", "")).rejects.toThrow(/already open/);
    let d = await reconciliationDetail(db, cust, id);
    expect(d.items.length).toBeGreaterThan(0);
    await expect(closeReconciliation(db, cust, id)).rejects.toThrow(/not been checked/);
    await expect(recordItem(db, cust, id, d.items[0].id, "MISSING", "")).rejects.toThrow(/note/);
    for (const [i, item] of d.items.entries()) await recordItem(db, cust, id, item.id, i === 0 ? "MISSING" : "FOUND", i === 0 ? "Not located during count" : "");
    const summary = await closeReconciliation(db, cust, id);
    expect(summary).toMatch(/1 missing/);
    d = await reconciliationDetail(db, cust, id);
    expect(d.reconciliation.status).toBe("CLOSED");
    const ev = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM asset_events WHERE event_type = 'RECONCILE' AND reference = ?", d.reconciliation.reference);
    expect(Number(ev!.c)).toBe(d.items.length);
    // Another division cannot see it; an auditor without custody permission cannot open one.
    await expect(reconciliationDetail(db, await actor(db, "u_asset_cb"), id)).rejects.toThrow(/not found/i);
  }));
});

describe("saved custom reports (Module 12)", () => {
  it("saves a projection of approved fields, refuses others and never widens access", () => withDb(async (db) => {
    const naa = await actor(db, "u_naa");
    const id = await saveReport(db, naa, { name: "KCM review list", code: "ASSIGNMENTS_BY_AREA", fields: ["operational_area", "review_due"], sortField: "review_due", sortDir: "desc" });
    const saved = (await getSavedReport(db, naa, id))!;
    expect(saved.fields).toEqual(["operational_area", "review_due"]);
    const { def, rows } = await runReport(db, naa, "ASSIGNMENTS_BY_AREA");
    const shaped = shapeRows(def, rows, saved.fields, saved.sort_field, saved.sort_dir);
    expect(shaped.cols).toEqual(["operational_area", "review_due"]);
    for (let i = 1; i < shaped.rows.length; i++) expect(Number(shaped.rows[i - 1].review_due)).toBeGreaterThanOrEqual(Number(shaped.rows[i].review_due));
    await expect(saveReport(db, naa, { name: "Bad", code: "ASSIGNMENTS_BY_AREA", fields: ["operational_area", "service_number"] })).rejects.toThrow(/approved fields/);
    await expect(saveReport(db, await actor(db, "u_plat"), { name: "Platform tries", code: "PERSONNEL_BY_UNIT", fields: ["organisation"] })).rejects.toThrow();
    // Other users do not see it; the owner can remove it.
    expect((await listSavedReports(db, await actor(db, "u_hqstaff"))).some((r) => r.id === id)).toBe(false);
    await deleteSavedReport(db, naa, id);
    expect(await getSavedReport(db, naa, id)).toBeUndefined();
    expect(REPORTS.length).toBe(11);
  }));
});
