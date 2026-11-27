/**
 * Safe role-catalogue migration (DEC-072): any role definition outside the 31-role catalogue is retired, its
 * permissions removed, its active assignments revoked (history kept) and flagged for AUTHORISED reassignment with
 * no automatic replacement; unreferenced retired rows are deleted; an authorised grant resolves the flag.
 */
import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { syncCatalogue } from "@/server/db/bootstrap";
import { ROLES } from "@/server/domain/catalogue";
import { assignRole, listReassignments } from "@/server/domain/iam";
import { loadActor } from "@/server/domain/policy";
import { actor, withDb } from "./helpers";

describe("role catalogue migration", () => {
  it("the active catalogue in the database is exactly the 31 code-defined roles", () => withDb(async (db) => {
    const active = (await all<{ code: string; tier: number; role_no: number }>(db, "SELECT code, tier, role_no FROM roles WHERE status = 'ACTIVE' ORDER BY role_no")).map((r) => r.code);
    expect(active).toEqual(ROLES.map((r) => r.code));
    expect((await all(db, "SELECT DISTINCT role_code FROM role_permissions WHERE role_code NOT IN (SELECT code FROM roles WHERE status = 'ACTIVE')"))).toHaveLength(0);
    // No active assignment points at a non-active role.
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM role_assignments a JOIN roles r ON r.code = a.role_code WHERE r.status <> 'ACTIVE' AND a.revoked_at IS NULL"))!.c).toBe(0);
  }));

  it("retires an unauthorised role, revokes and flags its assignments without granting a replacement, deletes unreferenced rows, and keeps history", () => withDb(async (db) => {
    const t = new Date().toISOString();
    await run(db, "INSERT INTO roles (code, name, description, category, status) VALUES ('LEGACY_TEST_ROLE', 'Legacy test role', 'Left by an earlier implementation (test).', 'BUSINESS', 'ACTIVE')");
    await run(db, "INSERT INTO roles (code, name, description, category, status) VALUES ('LEGACY_UNUSED', 'Unused legacy role', 'Never assigned (test).', 'BUSINESS', 'ACTIVE')");
    await run(db, "INSERT INTO role_permissions (role_code, permission, coverage) VALUES ('LEGACY_TEST_ROLE', 'personnel.view', 'SUBTREE')");
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES ('u_legacy_t', 'demo.legacy.test', 'Demo Legacy Account', 'Demo legacy position (synthetic)', 'ACTIVE', ?)", t);
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES ('asg_legacy_t', 'u_legacy_t', 'LEGACY_TEST_ROLE', 'org_cb', ?, 'SYN test', ?)", t, t);

    const report = await syncCatalogue(db);
    expect(report.retired.sort()).toEqual(["LEGACY_TEST_ROLE", "LEGACY_UNUSED"]);
    expect(report.flagged).toEqual([{ userId: "u_legacy_t", roleCode: "LEGACY_TEST_ROLE", assignmentId: "asg_legacy_t" }]);
    expect(report.deleted).toEqual(["LEGACY_UNUSED"]);

    expect((await one<{ status: string }>(db, "SELECT status FROM roles WHERE code = 'LEGACY_TEST_ROLE'"))!.status).toBe("RETIRED");
    expect(await one(db, "SELECT code FROM roles WHERE code = 'LEGACY_UNUSED'")).toBeUndefined();
    expect(await all(db, "SELECT * FROM role_permissions WHERE role_code = 'LEGACY_TEST_ROLE'")).toHaveLength(0);
    const asg = (await one<{ revoked_at: string | null; revoke_reason: string }>(db, "SELECT revoked_at, revoke_reason FROM role_assignments WHERE id = 'asg_legacy_t'"))!;
    expect(asg.revoked_at).toBeTruthy();
    expect(asg.revoke_reason).toMatch(/not in the authorised 31-role catalogue/);
    // The account is kept, holds no role and no replacement was guessed: access is denied until an authorised grant.
    expect(await one(db, "SELECT id FROM users WHERE id = 'u_legacy_t' AND status = 'ACTIVE'")).toBeTruthy();
    expect((await all(db, "SELECT id FROM role_assignments WHERE user_id = 'u_legacy_t' AND revoked_at IS NULL"))).toHaveLength(0);
    expect((await loadActor(db, "u_legacy_t"))?.assignments ?? []).toHaveLength(0);
    // Recorded for reassignment, visible to the administrators in scope, and audited.
    const plat = await actor(db, "u_plat");
    expect((await listReassignments(db, plat)).map((r) => r.user_id)).toContain("u_legacy_t");
    expect((await listReassignments(db, await actor(db, "u_cb_tech"))).map((r) => r.user_id)).toContain("u_legacy_t");
    expect((await listReassignments(db, await actor(db, "u_kit_tech"))).map((r) => r.user_id)).not.toContain("u_legacy_t");
    expect(await one(db, "SELECT id FROM audit_events WHERE action = 'role.catalogue.sync' ORDER BY seq DESC LIMIT 1")).toBeTruthy();

    // Idempotent.
    const again = await syncCatalogue(db);
    expect(again).toEqual({ retired: [], flagged: [], deleted: [] });

    // An authorised grant of an approved role resolves the flag.
    const id = await assignRole(db, plat, { userId: "u_legacy_t", roleCode: "DIVISION_STAFF_II", orgUnitId: "org_cb", justification: "SYN-REASSIGN-001 authorised reassignment (test)" });
    const flag = (await one<{ resolved_at: string | null; resolved_by: string; resolution_assignment_id: string }>(db, "SELECT resolved_at, resolved_by, resolution_assignment_id FROM role_reassignments WHERE assignment_id = 'asg_legacy_t'"))!;
    expect(flag.resolved_at).toBeTruthy();
    expect(flag.resolved_by).toBe("u_plat");
    expect(flag.resolution_assignment_id).toBe(id);
    expect(await listReassignments(db, plat)).toHaveLength(0);
    // A retired role can never be granted again.
    await expect(assignRole(db, plat, { userId: "u_legacy_t", roleCode: "LEGACY_TEST_ROLE", orgUnitId: "org_cb", justification: "SYN attempt to re-grant (test)" })).rejects.toThrow(/Unknown role/);
  }));
});
