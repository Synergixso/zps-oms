/**
 * Mandatory scenarios from the master prompt Part Q (TS-01 … TS-15).
 * Each test executes the real domain services against a fresh synthetic DB.
 */
import { afterEach, describe, expect, it } from "vitest";
import { all, one, run, type DB } from "@/server/db/connection";
import { verifyAuditChain } from "@/server/domain/audit";
import { setClock } from "@/server/domain/core";
import { assetAction, getAsset, listAssets, registerAsset } from "@/server/domain/assets";
import { createVehicle, getVehicle, listMaintenance, listVehicles } from "@/server/domain/fleet";
import { assignRole, grantDelegation, listUsers, revokeAssignment, setUserStatus } from "@/server/domain/iam";
import { decideChange, listOrgUnits, proposeChange, relationshipHistory } from "@/server/domain/org";
import { HQ_ID, loadActor } from "@/server/domain/policy";
import { computeSummary } from "@/server/domain/reports";
import { exportReport, runReport } from "@/server/domain/reports";
import { createDraft, getRequest, listRequests, performAction, updateDraft } from "@/server/domain/requests";
import { actor, withDb } from "./helpers";

afterEach(() => setClock(null));

const draft = async (db: DB, who: string, org?: string, cat = "OFFICE_SUPPLIES") =>
  createDraft(db, await actor(db, who), { categoryCode: cat, title: "Synthetic test request", details: "Synthetic details for automated test.", originOrgId: org });

describe("TS-01 DIG Ops national summaries", () => {
  it("DIG Ops executive can run national aggregate reports covering every division", () => withDb(async (db) => {
    const dig = await actor(db, "u_dig");
    const { rows } = await runReport(db, dig, "REQ_STATUS_BY_ORG");
    const orgs = new Set(rows.map((r) => r.organisation));
    expect(orgs.has("Lusaka Division")).toBe(true);
    expect(orgs.has("Copperbelt Division")).toBe(true);
    // ...but does not get record-level access to provincial requests
    const lskReq = (await one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_lsk' AND status='CLOSED'"))!;
    await expect(getRequest(db, dig, lskReq.id)).rejects.toThrow(/not found/i);
  }));
});

describe("TS-02 Cross-province isolation", () => {
  it("Provincial Commander cannot see or act on another province's records", () => withDb(async (db) => {
    const cb = await actor(db, "u_cb_cmd");
    const lskReq = (await one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_lsk' AND status='SUBMITTED'"))!;
    expect((await listRequests(db, cb)).every((r) => r.origin_org_id === "org_cb")).toBe(true);
    await expect(getRequest(db, cb, lskReq.id)).rejects.toThrow(/not found/i);
    await expect(performAction(db, cb, lskReq.id, "ASSIGN")).rejects.toThrow();
    expect((await listVehicles(db, cb)).every((v) => v.custody_org_id === "org_cb")).toBe(true);
    await expect(getVehicle(db, cb, "veh_1")).rejects.toThrow(/not found/i);
    const denied = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE actor_id='u_cb_cmd' AND outcome='DENIED'"))!;
    expect(denied.c).toBeGreaterThan(0);
  }));
  it("cannot create a request for another province by supplying its org id", () => withDb(async (db) => {
    await expect(draft(db, "u_lsk_sops", "org_cb")).rejects.toThrow(/not authorised/i);
  }));
});

describe("TS-03 Division Staff Ops cannot approve without delegation", () => {
  it("is refused at approval, then permitted only after a recorded delegation", () => withDb(async (db) => {
    // Request authored by the commander so the staff-ops user is not the author.
    const r = await draft(db, "u_lsk_sops");
    await performAction(db, await actor(db, "u_lsk_sops"), r.id, "SUBMIT");
    await performAction(db, await actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    // a different staff ops user at Lusaka
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES ('u_t','demo.t','Demo T','x','ACTIVE','2025-01-01')");
    await run(db, "INSERT INTO role_assignments (id,user_id,role_code,org_unit_id,valid_from,justification,created_at) VALUES ('a_t','u_t','DIVISION_STAFF_I','org_lsk','2025-01-01','test','2025-01-01')");
    await expect(performAction(db, await actor(db, "u_t"), r.id, "APPROVE")).rejects.toThrow(/delegation/i);
    await grantDelegation(db, await actor(db, "u_plat"), { userId: "u_t", orgUnitId: "org_lsk", domain: "ADMIN_REQUEST", approvalRef: "SYN-DELEG-TEST" });
    expect((await performAction(db, await actor(db, "u_t"), r.id, "APPROVE")).status).toBe("APPROVED");
  }));
});

describe("TS-04 Cross-formation isolation", () => {
  it("Airport Division admin cannot access Mobile Unit records", () => withDb(async (db) => {
    const ap = await actor(db, "u_ap_adm");
    const muReq = (await one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_mu' LIMIT 1"))!;
    await expect(getRequest(db, ap, muReq.id)).rejects.toThrow(/not found/i);
    expect((await listAssets(db, ap)).every((a) => a.custody_org_id === "org_ap" || a.transfer_to_org_id === "org_ap")).toBe(true);
    await expect(getAsset(db, ap, "ast_14")).rejects.toThrow(/not found/i);
  }));
});

describe("TS-05 Fleet Officer has no personnel/IAM access", () => {
  it("cannot list users or view requests", () => withDb(async (db) => {
    const f = await actor(db, "u_fleet");
    await expect(listUsers(db, f)).rejects.toThrow(/not authorised/i);
    await expect(listRequests(db, f)).rejects.toThrow(/not authorised/i);
    expect((await listVehicles(db, f)).every((v) => ["org_lsk", "org_mu"].includes(v.custody_org_id))).toBe(true);
  }));
});

describe("TS-06 Asset Custodian cannot access fleet administration", () => {
  it("is denied fleet registers, maintenance and fleet reports", () => withDb(async (db) => {
    const c = await actor(db, "u_asset");
    await expect(listVehicles(db, c)).rejects.toThrow(/not authorised/i);
    await expect(listMaintenance(db, c)).rejects.toThrow(/not authorised/i);
    await expect(runReport(db, c, "FLEET_MAINTENANCE")).rejects.toThrow(/not within your authorised/i);
  }));
});

describe("TS-07 Inspector General oversight is read-only (27-role catalogue)", () => {
  it("sees audit evidence and summaries, never individual request records, and every write path is refused", () => withDb(async (db) => {
    const au = await actor(db, "u_audit");
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events"))!.c).toBeGreaterThan(0);
    await expect(listRequests(db, au)).rejects.toThrow(/not authorised/i);
    const sub = (await one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE status='SUBMITTED' LIMIT 1"))!;
    await expect(performAction(db, au, sub.id, "ASSIGN")).rejects.toThrow(/not authorised|not found/i);
    await expect(draft(db, "u_audit", HQ_ID)).rejects.toThrow(/not authorised|not found/i);
    await expect(assetAction(db, au, "ast_3", "INSPECT", { condition: "GOOD" })).rejects.toThrow(/not authorised|not found/i);
    await expect(createVehicle(db, au, { fleetRef: "SYN-FLT-9999", registrationRef: "SYN-REG-ZZZ9", make: "X", model: "Y", vehicleClass: "Saloon", custodyOrgId: HQ_ID })).rejects.toThrow(/not authorised/i);
  }));
});

describe("TS-08 Platform Administrator has no automatic business access", () => {
  it("cannot read requests, fleet or assets despite technical privileges", () => withDb(async (db) => {
    const p = await actor(db, "u_plat");
    await expect(listRequests(db, p)).rejects.toThrow(/not authorised/i);
    await expect(listVehicles(db, p)).rejects.toThrow(/not authorised/i);
    await expect(listAssets(db, p)).rejects.toThrow(/not authorised/i);
    await expect(runReport(db, p, "REQ_STATUS_BY_ORG")).rejects.toThrow(/not authorised/i);
  }));
});

describe("TS-09 No self-elevation", () => {
  it("administrators cannot grant, delegate or reactivate themselves", () => withDb(async (db) => {
    const p = await actor(db, "u_plat");
    await expect(assignRole(db, p, { userId: "u_plat", roleCode: "DIG_OPERATIONS", orgUnitId: HQ_ID, justification: "attempted self elevation" })).rejects.toThrow(/own access/i);
    await expect(grantDelegation(db, p, { userId: "u_plat", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-X-1" })).rejects.toThrow(/yourself/i);
    const s = await actor(db, "u_sec");
    await expect(setUserStatus(db, s, "u_sec", "ACTIVE", "self change")).rejects.toThrow(/own account/i);
    // business user has no IAM permissions at all
    await expect(assignRole(db, await actor(db, "u_lsk_sops"), { userId: "u_lsk_sops", roleCode: "FORMATION_COMMANDING_OFFICER", orgUnitId: "org_lsk", justification: "self promote attempt" })).rejects.toThrow(/not authorised/i);
  }));
  it("delegations cannot be given to technical roles", () => withDb(async (db) => {
    await expect(grantDelegation(db, await actor(db, "u_plat"), { userId: "u_sec", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-X-2" })).rejects.toThrow(/business role/i);
  }));
});

describe("TS-10 Expired or revoked grants lose access", () => {
  it("auditor access ends at expiry", () => withDb(async (db) => {
    expect((await loadActor(db, "u_audit"))!.assignments.length).toBe(1);
    setClock(() => new Date("2027-04-01T00:00:00Z"));
    expect((await loadActor(db, "u_audit"))!.assignments.length).toBe(0);
    await expect(listRequests(db, (await loadActor(db, "u_audit"))!)).rejects.toThrow(/not authorised/i);
  }));
  it("revocation and suspension take effect immediately", () => withDb(async (db) => {
    await revokeAssignment(db, await actor(db, "u_sec"), "asg_u_cb_sops_0", "Transferred out (synthetic)");
    await expect(listRequests(db, (await loadActor(db, "u_cb_sops"))!)).rejects.toThrow(/not authorised/i);
    await setUserStatus(db, await actor(db, "u_sec"), "u_lsk_cmd", "SUSPENDED", "Synthetic suspension test");
    expect(await loadActor(db, "u_lsk_cmd")).toBeNull();
  }));
  it("retired 41-catalogue roles can no longer be granted and grant nothing", () => withDb(async (db) => {
    await expect(assignRole(db, await actor(db, "u_plat"), { userId: "u_hqc", roleCode: "INTERNAL_AUDITOR" as never, orgUnitId: HQ_ID, justification: "Audit engagement SYN-AUD-1" })).rejects.toThrow(/unknown role/i);
    // A fresh database never held the old codes; an upgraded one keeps them as RETIRED rows for history.
    await run(db, "INSERT IGNORE INTO roles (code, name, description, category, requires_expiry, status) VALUES ('PROVINCIAL_COMMANDER','Provincial Commander (retired)','Retired','BUSINESS',0,'RETIRED')");
    await run(db, "INSERT INTO role_assignments (id,user_id,role_code,org_unit_id,valid_from,justification,created_at) VALUES ('a_ret','u_staff','PROVINCIAL_COMMANDER','org_cen','2025-01-01','test','2025-01-01')");
    const a = (await loadActor(db, "u_staff"))!;
    expect(a.assignments.map((x) => x.roleCode)).toEqual(["PRINCIPAL_ARMOURER"]);
  }));
});

describe("TS-11 Approval sequence cannot be bypassed", () => {
  it("HQ cannot approve level 2 before level 1; illegal transitions are rejected", () => withDb(async (db) => {
    const r = await draft(db, "u_lsk_sops", undefined, "ADMIN_RETURN");
    await expect(performAction(db, await actor(db, "u_lsk_cmd"), r.id, "APPROVE")).rejects.toThrow(/not found/i); // drafts are private to the author
    await performAction(db, await actor(db, "u_lsk_sops"), r.id, "SUBMIT");
    await performAction(db, await actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    await expect(performAction(db, await actor(db, "u_dig"), r.id, "APPROVE")).rejects.toThrow(); // level 1 belongs to Lusaka
    const l1 = await performAction(db, await actor(db, "u_lsk_cmd"), r.id, "APPROVE");
    expect(l1.status).toBe("UNDER_REVIEW");
    expect(l1.current_level).toBe(2);
    await expect(performAction(db, await actor(db, "u_lsk_cmd"), r.id, "APPROVE")).rejects.toThrow(); // level 2 belongs to HQ
    expect((await performAction(db, await actor(db, "u_dig"), r.id, "APPROVE")).status).toBe("APPROVED");
    await expect(performAction(db, await actor(db, "u_lsk_sops"), r.id, "CLOSE")).rejects.toThrow(/cannot be close/i);
  }));
  it("self-approval is refused even with a delegation", () => withDb(async (db) => {
    const r = await draft(db, "u_hqc", undefined, "OFFICE_SUPPLIES");
    // give HQ coordinator a delegation, then try to approve own request
    await grantDelegation(db, await actor(db, "u_plat"), { userId: "u_hqc", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-DELEG-HQC" });
    await performAction(db, await actor(db, "u_hqc"), r.id, "SUBMIT");
    await performAction(db, await actor(db, "u_hqc"), r.id, "ASSIGN");
    await expect(performAction(db, await actor(db, "u_hqc"), r.id, "APPROVE")).rejects.toThrow(/self-approval/i);
  }));
});

describe("TS-12 Closed requests cannot be silently edited", () => {
  it("edits are refused; only controlled reopen with justification works", () => withDb(async (db) => {
    const closed = (await one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE status='CLOSED' AND origin_org_id='org_lsk'"))!;
    await expect(updateDraft(db, await actor(db, "u_lsk_sops"), closed.id, { categoryCode: "OFFICE_SUPPLIES", title: "Changed title", details: "Changed details here." })).rejects.toThrow(/controlled reopening/i);
    await expect(performAction(db, await actor(db, "u_lsk_cmd"), closed.id, "REOPEN", { reason: "short" })).rejects.toThrow(/justification/i);
    const re = await performAction(db, await actor(db, "u_lsk_cmd"), closed.id, "REOPEN", { reason: "Synthetic: supplier delivered wrong items." });
    expect(re.status).toBe("IN_PROGRESS");
  }));
});

describe("TS-13 Audit records are immutable", () => {
  it("UPDATE/DELETE on audit_events are blocked and the hash chain verifies", () => withDb(async (db) => {
    await expect(run(db, "UPDATE audit_events SET action='tampered' WHERE seq=1")).rejects.toThrow(/append-only/);
    await expect(run(db, "DELETE FROM audit_events")).rejects.toThrow(/append-only/);
    expect((await verifyAuditChain(db)).ok).toBe(true);
    // No application role holds a permission to write audit records.
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM role_permissions WHERE permission LIKE 'audit.%' AND permission NOT IN ('audit.view','audit.export')"))!.c).toBe(0);
  }));
});

describe("TS-14 Reports cannot export unauthorised fields", () => {
  it("refuses fields outside the definition and audits exports", () => withDb(async (db) => {
    const cmd = await actor(db, "u_lsk_cmd");
    await expect(exportReport(db, cmd, "REQ_STATUS_BY_ORG", ["organisation", "creator_name"])).rejects.toThrow(/not approved for export/i);
    const ok = await exportReport(db, cmd, "REQ_STATUS_BY_ORG");
    expect(ok.csv).toContain("SYNTHETIC");
    expect(ok.csv).not.toContain("Copperbelt");
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports WHERE user_id='u_lsk_cmd'"))!.c).toBe(1);
    await expect(exportReport(db, await actor(db, "u_mu_sec"), "REQ_STATUS_BY_ORG")).rejects.toThrow(/not authorised/i);
  }));
});

describe("TS-15 Organisation changes preserve history and never grant access", () => {
  it("re-parenting end-dates the old relationship and leaves assignments untouched", () => withDb(async (db) => {
    setClock(() => new Date("2026-11-25T10:00:00Z"));
    const before = await all(db, "SELECT * FROM role_assignments ORDER BY id");
    const c = await proposeChange(db, await actor(db, "u_org"), { changeType: "CHANGE_PARENT", targetId: "org_taz", parentId: "org_cpss", reason: "Synthetic test of effective-dated re-parenting.", effectiveDate: "2026-11-25" });
    await expect(decideChange(db, await actor(db, "u_org"), c.id, "APPROVE", "", "SYN-REF")).rejects.toThrow(/delegation|separation/i);
    await decideChange(db, await actor(db, "u_dig"), c.id, "APPROVE", "", "SYN-EST-DIR-001");
    const hist = await relationshipHistory(db, await actor(db, "u_dig"), "org_taz");
    expect(hist.length).toBe(2);
    expect(hist.find((h) => h.effective_to === null)!.parent_name).toBe("Crime Prevention and Support Services");
    expect(hist.find((h) => h.effective_to !== null)!.parent_name).toMatch(/Service Headquarters/);
    // historical view
    const asAt = (await listOrgUnits(db, await actor(db, "u_dig"), { asAt: "2026-01-01" })).find((u) => u.id === "org_taz")!;
    expect(asAt.parent_id).toBe(HQ_ID);
    expect(await all(db, "SELECT * FROM role_assignments ORDER BY id")).toEqual(before);
  }));
  it("creates territorial and formation sub-units under the configured type rules (criterion A)", () => withDb(async (db) => {
    setClock(() => new Date("2026-11-25T10:00:00Z"));
    const org = await actor(db, "u_org");
    const c = await proposeChange(db, org, { changeType: "CREATE_UNIT", code: "ST-CB-TEST", name: "Test Police Station (synthetic)", unitType: "STATION", parentId: "org_cb_mufulira", reason: "Synthetic establishment of a new station.", effectiveDate: "2026-11-25" });
    await decideChange(db, await actor(db, "u_dig"), c.id, "APPROVE", "", "SYN-EST-DIR-002");
    const unit = await one<{ id: string; tenant_id: string; branch: string }>(db, "SELECT id, tenant_id, branch FROM org_units WHERE code = 'ST-CB-TEST'");
    expect(unit).toMatchObject({ tenant_id: "t_cb", branch: "TERRITORIAL" });
    // The new station is immediately inside the Copperbelt commander's subtree.
    expect(await one(db, "SELECT 1 AS ok FROM org_unit_closure WHERE ancestor_id = 'org_cb' AND descendant_id = ?", unit!.id)).toBeTruthy();
    await expect(proposeChange(db, org, { changeType: "CREATE_UNIT", code: "ST-MU-BAD", name: "Station under a company", unitType: "STATION", parentId: "org_mu_a", reason: "Should be refused by type rules.", effectiveDate: "2026-11-25" })).rejects.toThrow(/type rules/);
  }));
  it("proposers cannot approve their own change", () => withDb(async (db) => {
    const c = await proposeChange(db, await actor(db, "u_org"), { changeType: "RENAME_UNIT", targetId: "org_taz", name: "TAZARA Division (renamed)", reason: "Synthetic rename for separation-of-duties test.", effectiveDate: "2026-12-01" });
    // give the DIG a proposer role too and have them propose, then try to approve
    await run(db, "INSERT INTO role_assignments (id,user_id,role_code,org_unit_id,valid_from,justification,created_at) VALUES ('a_x','u_dig','SUPERADMIN','org_hq','2025-01-01','test','2025-01-01')");
    const c2 = await proposeChange(db, await actor(db, "u_dig"), { changeType: "RENAME_UNIT", targetId: "org_ap", name: "Airport Division (renamed)", reason: "Synthetic rename proposed by approver.", effectiveDate: "2026-12-01" });
    await expect(decideChange(db, await actor(db, "u_dig"), c2.id, "APPROVE", "", "SYN-REF")).rejects.toThrow(/separation of duties/i);
    expect(c.status).toBe("SUBMITTED");
  }));
});

describe("Scope helpers", () => {
  it("summary for a province only counts that province", () => withDb(async (db) => {
    const s = await computeSummary(db, { national: false, units: ["org_cb"] });
    const total = Object.values(s.requests).reduce((a, b) => a + b, 0);
    expect(total).toBe((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM admin_requests WHERE origin_org_id='org_cb' AND status<>'DRAFT'"))!.c);
  }));
  it("prohibited asset classes are refused", () => withDb(async (db) => {
    await expect(registerAsset(db, await actor(db, "u_asset"), { assetTag: "SYN-AST-99999", categoryCode: "GENERAL_STORES", description: "Pistol holster", condition: "NEW", custodyOrgId: "org_lsk" })).rejects.toThrow(/excluded/i);
  }));
});
