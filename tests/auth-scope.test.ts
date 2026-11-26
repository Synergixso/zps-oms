import { describe, expect, it } from "vitest";
import { one, run } from "@/server/db/connection";
import { SYNTHETIC_DEV_PASSWORD } from "@/server/db/constants";
import { ROLES } from "@/server/domain/catalogue";
import { LOCKOUT_THRESHOLD, authenticate, changePassword, hashPassword, passwordProblem, verifyPassword } from "@/server/domain/auth";
import { issueTemporaryPassword } from "@/server/domain/iam";
import { approvalUnitFor, can, scopeFor } from "@/server/domain/policy";
import { listPersonnel } from "@/server/domain/personnel";
import { actor, withDb } from "./helpers";

describe("password authentication", () => {
  it("hashes with scrypt and verifies in constant time", async () => {
    const h = await hashPassword("Correct-Horse-9");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword("Correct-Horse-9", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(passwordProblem("short")).toMatch(/12 characters/);
    expect(passwordProblem("alllowercaseletters")).toMatch(/three of/);
    expect(passwordProblem("Demo.user-Password1", "demo.user")).toMatch(/username/);
  });

  it("signs in with the synthetic password and does not reveal whether a username exists", () => withDb(async (db) => {
    const ok = await authenticate(db, "demo.lsk.commander", SYNTHETIC_DEV_PASSWORD, "c1");
    expect(ok).toMatchObject({ ok: true, userId: "u_lsk_cmd" });
    expect(await authenticate(db, "demo.lsk.commander", "Wrong-Password-1", "c1")).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate(db, "demo.nobody", "Wrong-Password-1", "c1")).toEqual({ ok: false, reason: "invalid" });
  }));

  it("locks the account after repeated failures, even for the right password", () => withDb(async (db) => {
    for (let i = 0; i < LOCKOUT_THRESHOLD - 1; i++) expect((await authenticate(db, "demo.cb.commander", "Bad-Password-x1", `k${i}`)).ok).toBe(false);
    expect(await authenticate(db, "demo.cb.commander", "Bad-Password-x1", "k9")).toEqual({ ok: false, reason: "locked" });
    expect(await authenticate(db, "demo.cb.commander", SYNTHETIC_DEV_PASSWORD, "k10")).toEqual({ ok: false, reason: "locked" });
    const u = await one<{ locked_until: string | null }>(db, "SELECT locked_until FROM users WHERE id = 'u_cb_cmd'");
    expect(u?.locked_until).toBeTruthy();
    const ev = await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'auth.account.locked' AND actor_id = 'u_cb_cmd'");
    expect(Number(ev?.c)).toBe(1);
  }));

  it("throttles a client after too many failures", () => withDb(async (db) => {
    let last;
    for (let i = 0; i < 21; i++) last = await authenticate(db, `demo.unknown${i}`, "Wrong-Password-1", "same-client");
    expect(last).toEqual({ ok: false, reason: "throttled" });
  }));

  it("refuses suspended accounts", () => withDb(async (db) => {
    await run(db, "UPDATE users SET status = 'SUSPENDED' WHERE id = 'u_staff'");
    expect(await authenticate(db, "demo.cen.staff", SYNTHETIC_DEV_PASSWORD, "c2")).toEqual({ ok: false, reason: "inactive" });
  }));

  it("issues one-time temporary passwords that must be changed", () => withDb(async (db) => {
    const admin = await actor(db, "u_plat");
    const temp = await issueTemporaryPassword(db, admin, "u_staff");
    const r = await authenticate(db, "demo.cen.staff", temp, "c3");
    expect(r).toMatchObject({ ok: true, mustChangePassword: true });
    const staff = await actor(db, "u_staff");
    expect(staff.mustChangePassword).toBe(true);
    await expect(changePassword(db, staff, "not-it", "New-Strong-Pass-9")).rejects.toThrow(/current password/);
    await changePassword(db, staff, temp, "New-Strong-Pass-9");
    expect((await actor(db, "u_staff")).mustChangePassword).toBe(false);
    // Business roles have no account-support function at all.
    await expect(issueTemporaryPassword(db, await actor(db, "u_lsk_cmd"), "u_staff")).rejects.toThrow(/not authorised/);
  }));
});

describe("role catalogue and hierarchical scope", () => {
  it("defines exactly the 27 roles of the three-tier directive with unique numbers", () => {
    expect(ROLES).toHaveLength(27);
    expect([...ROLES.map((r) => r.no)].sort((a, b) => a - b)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(ROLES.filter((r) => r.tier === 1).map((r) => r.no)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ROLES.filter((r) => r.tier === 2).map((r) => r.no)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(ROLES.filter((r) => r.tier === 3).map((r) => r.no)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);
  });

  it("platform super administrator has no personnel access and no approval authority", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    for (const p of ["personnel.view", "manpower.view", "assignment.view", "roster.view"] as const) expect(scopeFor(plat, p).units).toEqual([]);
    expect(await approvalUnitFor(db, plat, "ASSIGNMENT", "org_cb_kitwe")).toBeNull();
    await expect(listPersonnel(db, plat)).rejects.toThrow(/not authorised/);
  }));

  it("SUBTREE coverage reaches subordinate units but never sibling units", () => withDb(async (db) => {
    const kitwe = await actor(db, "u_kit_cmd");
    expect(can(kitwe, "personnel.view", "org_cb_kitwe_central")).toBe(true);
    expect(can(kitwe, "personnel.view", "org_cb_kitwe_chim")).toBe(true); // post under a station
    expect(can(kitwe, "personnel.view", "org_cb_mufulira")).toBe(false); // sibling district
    expect(can(kitwe, "personnel.view", "org_cb")).toBe(false); // parent
    const company = await actor(db, "u_mu_acoy");
    expect(can(company, "personnel.view", "org_mu_a1p1s1")).toBe(true);
    expect(can(company, "personnel.view", "org_mu_b1")).toBe(false); // another company
    const post = await actor(db, "u_chim");
    expect(scopeFor(post, "personnel.view").units).toEqual(["org_cb_kitwe_chim"]); // UNIT coverage
  }));

  it("tenant isolation: registers only return records within the actor's scope", () => withDb(async (db) => {
    const kitwe = await listPersonnel(db, await actor(db, "u_kit_cmd"), { pageSize: 200 });
    expect(kitwe.total).toBeGreaterThan(0);
    const ids = kitwe.rows.map((r) => r.home_unit_id);
    expect(ids.every((u) => u.startsWith("org_cb_kitwe"))).toBe(true);
    const lsk = await listPersonnel(db, await actor(db, "u_lsk_cmd"), { pageSize: 200 });
    expect(lsk.rows.some((r) => r.home_unit_id.startsWith("org_cb"))).toBe(false);
    const national = await listPersonnel(db, await actor(db, "u_npa"), { pageSize: 5 });
    expect(national.total).toBe(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM personnel_records"))!.c));
    // A general staff member never sees manpower registers.
    const staff = await actor(db, "u_staff");
    expect(scopeFor(staff, "manpower.view").units).toEqual([]);
  }));

  it("changing a user's organisational assignment revokes the obsolete access immediately (Test H)", () => withDb(async (db) => {
    const before = await actor(db, "u_kit_per");
    expect(can(before, "personnel.view", "org_cb_kitwe_central")).toBe(true);
    // Reassigned from Kitwe District to Mufulira District: revoke the old assignment, grant the new one.
    await run(db, "UPDATE role_assignments SET revoked_at = ?, revoke_reason = 'Reassigned' WHERE user_id = 'u_kit_per' AND revoked_at IS NULL", new Date().toISOString());
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES ('ra_test_h','u_kit_per','DEPUTY_OPS_OFFICER_DISTRICT','org_cb_mufulira','2025-01-01T00:00:00.000Z','Test H','2025-01-01T00:00:00.000Z')");
    const after = await actor(db, "u_kit_per");
    expect(can(after, "personnel.view", "org_cb_kitwe_central")).toBe(false);
    expect(can(after, "personnel.view", "org_cb_mufulira_central")).toBe(true);
    const rows = await listPersonnel(db, after, { pageSize: 200 });
    expect(rows.rows.every((r) => r.home_unit_id.startsWith("org_cb_mufulira"))).toBe(true);
  }));

  it("approval authority follows delegations down the hierarchy, not rank or role alone", () => withDb(async (db) => {
    const cb = await actor(db, "u_cb_cmd");
    expect(await approvalUnitFor(db, cb, "ASSIGNMENT", "org_cb_kitwe_central")).toBe("org_cb");
    expect(await approvalUnitFor(db, cb, "ASSIGNMENT", "org_lsk_central")).toBeNull();
    const cen = await actor(db, "u_cen_cmd"); // commander without an ASSIGNMENT delegation
    expect(await approvalUnitFor(db, cen, "ASSIGNMENT", "org_cen")).toBeNull();
  }));
});
