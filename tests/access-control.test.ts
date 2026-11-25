/**
 * Mandatory scenarios from the master prompt Part Q (TS-01 … TS-15).
 * Each test executes the real domain services against a fresh synthetic DB.
 */
import { afterEach, describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
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
import { actor, freshDb } from "./helpers";

afterEach(() => setClock(null));

const draft = (db: ReturnType<typeof freshDb>, who: string, org?: string, cat = "OFFICE_SUPPLIES") =>
  createDraft(db, actor(db, who), { categoryCode: cat, title: "Synthetic test request", details: "Synthetic details for automated test.", originOrgId: org });

describe("TS-01 DIG Ops national summaries", () => {
  it("DIG Ops executive can run national aggregate reports covering every division", () => {
    const db = freshDb();
    const dig = actor(db, "u_dig");
    const { rows } = runReport(db, dig, "REQ_STATUS_BY_ORG");
    const orgs = new Set(rows.map((r) => r.organisation));
    expect(orgs.has("Lusaka Division")).toBe(true);
    expect(orgs.has("Copperbelt Division")).toBe(true);
    // ...but does not get record-level access to provincial requests
    const lskReq = one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_lsk' AND status='CLOSED'")!;
    expect(() => getRequest(db, dig, lskReq.id)).toThrow(/not found/i);
  });
});

describe("TS-02 Cross-province isolation", () => {
  it("Provincial Commander cannot see or act on another province's records", () => {
    const db = freshDb();
    const cb = actor(db, "u_cb_cmd");
    const lskReq = one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_lsk' AND status='SUBMITTED'")!;
    expect(listRequests(db, cb).every((r) => r.origin_org_id === "org_cb")).toBe(true);
    expect(() => getRequest(db, cb, lskReq.id)).toThrow(/not found/i);
    expect(() => performAction(db, cb, lskReq.id, "ASSIGN")).toThrow();
    expect(listVehicles(db, cb).every((v) => v.custody_org_id === "org_cb")).toBe(true);
    expect(() => getVehicle(db, cb, "veh_1")).toThrow(/not found/i);
    const denied = one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE actor_id='u_cb_cmd' AND outcome='DENIED'")!;
    expect(denied.c).toBeGreaterThan(0);
  });
  it("cannot create a request for another province by supplying its org id", () => {
    const db = freshDb();
    expect(() => draft(db, "u_lsk_sops", "org_cb")).toThrow(/not authorised/i);
  });
});

describe("TS-03 Division Staff Ops cannot approve without delegation", () => {
  it("is refused at approval, then permitted only after a recorded delegation", () => {
    const db = freshDb();
    // Request authored by the commander so the staff-ops user is not the author.
    const r = draft(db, "u_lsk_sops");
    performAction(db, actor(db, "u_lsk_sops"), r.id, "SUBMIT");
    performAction(db, actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    // a different staff ops user at Lusaka
    run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES ('u_t','demo.t','Demo T','x','ACTIVE','2025-01-01')");
    run(db, "INSERT INTO role_assignments (id,user_id,role_code,org_unit_id,valid_from,justification,created_at) VALUES ('a_t','u_t','DIVISION_STAFF_OPS','org_lsk','2025-01-01','test','2025-01-01')");
    expect(() => performAction(db, actor(db, "u_t"), r.id, "APPROVE")).toThrow(/delegation/i);
    grantDelegation(db, actor(db, "u_plat"), { userId: "u_t", orgUnitId: "org_lsk", domain: "ADMIN_REQUEST", approvalRef: "SYN-DELEG-TEST" });
    expect(performAction(db, actor(db, "u_t"), r.id, "APPROVE").status).toBe("APPROVED");
  });
});

describe("TS-04 Cross-formation isolation", () => {
  it("Airport Division admin cannot access Mobile Unit records", () => {
    const db = freshDb();
    const ap = actor(db, "u_ap_adm");
    const muReq = one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE origin_org_id='org_mu' LIMIT 1")!;
    expect(() => getRequest(db, ap, muReq.id)).toThrow(/not found/i);
    expect(listAssets(db, ap).every((a) => a.custody_org_id === "org_ap" || a.transfer_to_org_id === "org_ap")).toBe(true);
    expect(() => getAsset(db, ap, "ast_14")).toThrow(/not found/i);
  });
});

describe("TS-05 Fleet Officer has no personnel/IAM access", () => {
  it("cannot list users or view requests", () => {
    const db = freshDb();
    const f = actor(db, "u_fleet");
    expect(() => listUsers(db, f)).toThrow(/not authorised/i);
    expect(() => listRequests(db, f)).toThrow(/not authorised/i);
    expect(listVehicles(db, f).every((v) => ["org_lsk", "org_mu"].includes(v.custody_org_id))).toBe(true);
  });
});

describe("TS-06 Asset Custodian cannot access fleet administration", () => {
  it("is denied fleet registers, maintenance and fleet reports", () => {
    const db = freshDb();
    const c = actor(db, "u_asset");
    expect(() => listVehicles(db, c)).toThrow(/not authorised/i);
    expect(() => listMaintenance(db, c)).toThrow(/not authorised/i);
    expect(() => runReport(db, c, "FLEET_MAINTENANCE")).toThrow(/not within your authorised/i);
  });
});

describe("TS-07 Internal Auditor is read-only", () => {
  it("can read across scope but every write path is refused", () => {
    const db = freshDb();
    const au = actor(db, "u_audit");
    expect(listRequests(db, au).length).toBeGreaterThan(0);
    const sub = one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE status='SUBMITTED' LIMIT 1")!;
    expect(() => performAction(db, au, sub.id, "ASSIGN")).toThrow(/not authorised/i);
    expect(() => draft(db, "u_audit", HQ_ID)).toThrow(/not authorised/i);
    expect(() => assetAction(db, au, "ast_3", "INSPECT", { condition: "GOOD" })).toThrow(/not authorised/i);
    expect(() => createVehicle(db, au, { fleetRef: "SYN-FLT-9999", registrationRef: "SYN-REG-ZZZ9", make: "X", model: "Y", vehicleClass: "Saloon", custodyOrgId: HQ_ID })).toThrow(/not authorised/i);
  });
});

describe("TS-08 Platform Administrator has no automatic business access", () => {
  it("cannot read requests, fleet or assets despite technical privileges", () => {
    const db = freshDb();
    const p = actor(db, "u_plat");
    expect(() => listRequests(db, p)).toThrow(/not authorised/i);
    expect(() => listVehicles(db, p)).toThrow(/not authorised/i);
    expect(() => listAssets(db, p)).toThrow(/not authorised/i);
    expect(() => runReport(db, p, "REQ_STATUS_BY_ORG")).toThrow(/not authorised/i);
  });
});

describe("TS-09 No self-elevation", () => {
  it("administrators cannot grant, delegate or reactivate themselves", () => {
    const db = freshDb();
    const p = actor(db, "u_plat");
    expect(() => assignRole(db, p, { userId: "u_plat", roleCode: "DIG_OPS_EXECUTIVE", orgUnitId: HQ_ID, justification: "attempted self elevation" })).toThrow(/own access/i);
    expect(() => grantDelegation(db, p, { userId: "u_plat", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-X-1" })).toThrow(/yourself/i);
    const s = actor(db, "u_sec");
    expect(() => setUserStatus(db, s, "u_sec", "ACTIVE", "self change")).toThrow(/own account/i);
    // business user has no IAM permissions at all
    expect(() => assignRole(db, actor(db, "u_lsk_sops"), { userId: "u_lsk_sops", roleCode: "PROVINCIAL_COMMANDER", orgUnitId: "org_lsk", justification: "self promote attempt" })).toThrow(/not authorised/i);
  });
  it("delegations cannot be given to technical roles", () => {
    const db = freshDb();
    expect(() => grantDelegation(db, actor(db, "u_plat"), { userId: "u_sec", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-X-2" })).toThrow(/business role/i);
  });
});

describe("TS-10 Expired or revoked grants lose access", () => {
  it("auditor access ends at expiry", () => {
    const db = freshDb();
    expect(loadActor(db, "u_audit")!.assignments.length).toBe(1);
    setClock(() => new Date("2027-04-01T00:00:00Z"));
    expect(loadActor(db, "u_audit")!.assignments.length).toBe(0);
    expect(() => listRequests(db, loadActor(db, "u_audit")!)).toThrow(/not authorised/i);
  });
  it("revocation and suspension take effect immediately", () => {
    const db = freshDb();
    revokeAssignment(db, actor(db, "u_sec"), "asg_u_cb_sops_0", "Transferred out (synthetic)");
    expect(() => listRequests(db, loadActor(db, "u_cb_sops")!)).toThrow(/not authorised/i);
    setUserStatus(db, actor(db, "u_sec"), "u_lsk_cmd", "SUSPENDED", "Synthetic suspension test");
    expect(loadActor(db, "u_lsk_cmd")).toBeNull();
  });
  it("auditor grants require an expiry date", () => {
    const db = freshDb();
    expect(() => assignRole(db, actor(db, "u_plat"), { userId: "u_hqc", roleCode: "INTERNAL_AUDITOR", orgUnitId: HQ_ID, justification: "Audit engagement SYN-AUD-1" })).toThrow(/time-limited/i);
  });
});

describe("TS-11 Approval sequence cannot be bypassed", () => {
  it("HQ cannot approve level 2 before level 1; illegal transitions are rejected", () => {
    const db = freshDb();
    const r = draft(db, "u_lsk_sops", undefined, "ADMIN_RETURN");
    expect(() => performAction(db, actor(db, "u_lsk_cmd"), r.id, "APPROVE")).toThrow(/not found/i); // drafts are private to the author
    performAction(db, actor(db, "u_lsk_sops"), r.id, "SUBMIT");
    performAction(db, actor(db, "u_lsk_cmd"), r.id, "ASSIGN");
    expect(() => performAction(db, actor(db, "u_dig"), r.id, "APPROVE")).toThrow(); // level 1 belongs to Lusaka
    const l1 = performAction(db, actor(db, "u_lsk_cmd"), r.id, "APPROVE");
    expect(l1.status).toBe("UNDER_REVIEW");
    expect(l1.current_level).toBe(2);
    expect(() => performAction(db, actor(db, "u_lsk_cmd"), r.id, "APPROVE")).toThrow(); // level 2 belongs to HQ
    expect(performAction(db, actor(db, "u_dig"), r.id, "APPROVE").status).toBe("APPROVED");
    expect(() => performAction(db, actor(db, "u_lsk_sops"), r.id, "CLOSE")).toThrow(/cannot be close/i);
  });
  it("self-approval is refused even with a delegation", () => {
    const db = freshDb();
    const r = draft(db, "u_hqc", undefined, "OFFICE_SUPPLIES");
    // give HQ coordinator a delegation, then try to approve own request
    grantDelegation(db, actor(db, "u_plat"), { userId: "u_hqc", orgUnitId: HQ_ID, domain: "ADMIN_REQUEST", approvalRef: "SYN-DELEG-HQC" });
    performAction(db, actor(db, "u_hqc"), r.id, "SUBMIT");
    performAction(db, actor(db, "u_hqc"), r.id, "ASSIGN");
    expect(() => performAction(db, actor(db, "u_hqc"), r.id, "APPROVE")).toThrow(/self-approval/i);
  });
});

describe("TS-12 Closed requests cannot be silently edited", () => {
  it("edits are refused; only controlled reopen with justification works", () => {
    const db = freshDb();
    const closed = one<{ id: string }>(db, "SELECT id FROM admin_requests WHERE status='CLOSED' AND origin_org_id='org_lsk'")!;
    expect(() => updateDraft(db, actor(db, "u_lsk_sops"), closed.id, { categoryCode: "OFFICE_SUPPLIES", title: "Changed title", details: "Changed details here." })).toThrow(/controlled reopening/i);
    expect(() => performAction(db, actor(db, "u_lsk_cmd"), closed.id, "REOPEN", { reason: "short" })).toThrow(/justification/i);
    const re = performAction(db, actor(db, "u_lsk_cmd"), closed.id, "REOPEN", { reason: "Synthetic: supplier delivered wrong items." });
    expect(re.status).toBe("IN_PROGRESS");
  });
});

describe("TS-13 Audit records are immutable", () => {
  it("UPDATE/DELETE on audit_events are blocked and the hash chain verifies", () => {
    const db = freshDb();
    expect(() => run(db, "UPDATE audit_events SET action='tampered' WHERE seq=1")).toThrow(/append-only/);
    expect(() => run(db, "DELETE FROM audit_events")).toThrow(/append-only/);
    expect(verifyAuditChain(db).ok).toBe(true);
    // No application role holds a permission to write audit records.
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM role_permissions WHERE permission LIKE 'audit.%' AND permission NOT IN ('audit.view','audit.export')")!.c).toBe(0);
  });
});

describe("TS-14 Reports cannot export unauthorised fields", () => {
  it("refuses fields outside the definition and audits exports", () => {
    const db = freshDb();
    const cmd = actor(db, "u_lsk_cmd");
    expect(() => exportReport(db, cmd, "REQ_STATUS_BY_ORG", ["organisation", "creator_name"])).toThrow(/not approved for export/i);
    const ok = exportReport(db, cmd, "REQ_STATUS_BY_ORG");
    expect(ok.csv).toContain("SYNTHETIC");
    expect(ok.csv).not.toContain("Copperbelt");
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports WHERE user_id='u_lsk_cmd'")!.c).toBe(1);
    expect(() => exportReport(db, actor(db, "u_audit"), "REQ_STATUS_BY_ORG")).toThrow(/not authorised/i);
  });
});

describe("TS-15 Organisation changes preserve history and never grant access", () => {
  it("re-parenting end-dates the old relationship and leaves assignments untouched", () => {
    const db = freshDb();
    setClock(() => new Date("2026-11-25T10:00:00Z"));
    const before = all(db, "SELECT * FROM role_assignments ORDER BY id");
    const c = proposeChange(db, actor(db, "u_org"), { changeType: "CHANGE_PARENT", targetId: "org_taz", parentId: "org_cpss", reason: "Synthetic test of effective-dated re-parenting.", effectiveDate: "2026-11-25" });
    expect(() => decideChange(db, actor(db, "u_org"), c.id, "APPROVE", "", "SYN-REF")).toThrow(/delegation|separation/i);
    decideChange(db, actor(db, "u_dig"), c.id, "APPROVE", "", "SYN-EST-DIR-001");
    const hist = relationshipHistory(db, actor(db, "u_dig"), "org_taz");
    expect(hist.length).toBe(2);
    expect(hist.find((h) => h.effective_to === null)!.parent_name).toBe("Crime Prevention and Support Services");
    expect(hist.find((h) => h.effective_to !== null)!.parent_name).toMatch(/Service Headquarters/);
    // historical view
    const asAt = listOrgUnits(db, actor(db, "u_dig"), { asAt: "2026-01-01" }).find((u) => u.id === "org_taz")!;
    expect(asAt.parent_id).toBe(HQ_ID);
    expect(all(db, "SELECT * FROM role_assignments ORDER BY id")).toEqual(before);
  });
  it("proposers cannot approve their own change", () => {
    const db = freshDb();
    const c = proposeChange(db, actor(db, "u_org"), { changeType: "RENAME_UNIT", targetId: "org_taz", name: "TAZARA Division (renamed)", reason: "Synthetic rename for separation-of-duties test.", effectiveDate: "2026-12-01" });
    // give the DIG a proposer role too and have them propose, then try to approve
    run(db, "INSERT INTO role_assignments (id,user_id,role_code,org_unit_id,valid_from,justification,created_at) VALUES ('a_x','u_dig','ORG_REGISTRY_ADMIN','org_hq','2025-01-01','test','2025-01-01')");
    const c2 = proposeChange(db, actor(db, "u_dig"), { changeType: "RENAME_UNIT", targetId: "org_ap", name: "Airport Division (renamed)", reason: "Synthetic rename proposed by approver.", effectiveDate: "2026-12-01" });
    expect(() => decideChange(db, actor(db, "u_dig"), c2.id, "APPROVE", "", "SYN-REF")).toThrow(/separation of duties/i);
    expect(c.status).toBe("SUBMITTED");
  });
});

describe("Scope helpers", () => {
  it("summary for a province only counts that province", () => {
    const db = freshDb();
    const s = computeSummary(db, { national: false, units: ["org_cb"] });
    const total = Object.values(s.requests).reduce((a, b) => a + b, 0);
    expect(total).toBe(one<{ c: number }>(db, "SELECT COUNT(*) c FROM admin_requests WHERE origin_org_id='org_cb' AND status<>'DRAFT'")!.c);
  });
  it("prohibited asset classes are refused", () => {
    const db = freshDb();
    expect(() => registerAsset(db, actor(db, "u_asset"), { assetTag: "SYN-AST-99999", categoryCode: "GENERAL_STORES", description: "Pistol holster", condition: "NEW", custodyOrgId: "org_lsk" })).toThrow(/excluded/i);
  });
});
