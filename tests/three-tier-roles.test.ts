/**
 * Three-tier 27-role directive: catalogue matrix, separation rules, context switching,
 * scoped technical administration and general stores (synthetic data only).
 */
import { describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { PROHIBITED_TERMS, RETIRED_ROLE_CODES, ROLE_BY_CODE, ROLES, type Permission } from "@/server/domain/catalogue";
import { issueTemporaryPassword, listUsers, unlockAccount, userDetail } from "@/server/domain/iam";
import { approvalUnitFor, can, hasPermission, loadActor } from "@/server/domain/policy";
import { createSession, resolveSessionContext, setSessionContext } from "@/server/domain/sessions";
import { createItem, createRequisition, getItem, listItems, recordMovement, requisitionAction } from "@/server/domain/stores";
import { headlineKpis } from "@/server/domain/overview";
import { WORKSPACES, workspaceFor } from "@/server/domain/workspaces";
import { listPersonnel } from "@/server/domain/personnel";
import { NAV_ITEMS } from "@/lib/nav";
import { ADMIN_RECORDS_ROLES } from "@/server/domain/workspace-config";
import { actor, withDb } from "./helpers";

const PERSONNEL_PERMS: Permission[] = ["personnel.view", "personnel.register", "personnel.edit", "personnel.verify", "assignment.view", "assignment.propose", "manpower.view", "roster.view"];

describe("27-role catalogue matrix", () => {
  it("every role has a tier, back office, workspace and valid navigation", () => {
    expect(ROLES).toHaveLength(27);
    for (const r of ROLES) {
      expect([1, 2, 3]).toContain(r.tier);
      expect(r.backOffice.length).toBeGreaterThan(5);
      expect(r.assignableTo.length).toBeGreaterThan(0);
      const ws = WORKSPACES[r.code];
      expect(ws, r.code).toBeDefined();
      expect(ws.backOffice).toBe(r.backOffice);
      expect(ws.kpis.length).toBeGreaterThan(0);
      for (const g of ws.nav) for (const h of g.items) expect(NAV_ITEMS[h], `${r.code} nav ${h}`).toBeDefined();
    }
    // Retired roles are not in the active catalogue.
    for (const c of RETIRED_ROLE_CODES) if (c !== "COMPANY_COMMANDER") expect(ROLE_BY_CODE[c as keyof typeof ROLE_BY_CODE]).toBeUndefined();
  });

  it("technical administrators are separated from business authority and personnel records", () => {
    const tech = ROLES.filter((r) => ["SUPERADMIN", "HQ_TECH_ADMIN", "UNIT_TECH_ADMIN", "DISTRICT_TECH_ADMIN", "STATION_TECH_ADMIN"].includes(r.code));
    expect(tech).toHaveLength(5);
    for (const r of tech) {
      expect(r.category).toBe("TECHNICAL");
      for (const p of [...PERSONNEL_PERMS, "stores.approve", "stores.view", "request.view", "fleet.view", "schedule.view", "schedule.manage", "correspondence.view", "correspondence.register", "correspondence.manage"] as Permission[]) expect(r.permissions[p], `${r.code} ${p}`).toBeUndefined();
    }
    // Only Superadmin configures the platform and tenants; HQ Tech operates it.
    expect(ROLES.filter((r) => r.permissions["platform.configure"]).map((r) => r.code)).toEqual(["SUPERADMIN"]);
    expect(ROLES.filter((r) => r.permissions["tenant.manage"]).map((r) => r.code)).toEqual(["SUPERADMIN"]);
    expect(ROLE_BY_CODE.HQ_TECH_ADMIN.permissions["platform.operate"]).toBe("NATIONAL");
  });

  it("the Administrative records section is configured exactly for roles holding scheduling or correspondence permissions", () => {
    const holders = ROLES.filter((r) => Object.keys(r.permissions).some((p) => p.startsWith("schedule.") || p.startsWith("correspondence."))).map((r) => r.code).sort();
    expect([...ADMIN_RECORDS_ROLES].sort()).toEqual(holders);
  });

  it("Principal Armourer (16) exists with non-sensitive administrative functions only", () => {
    const r = ROLE_BY_CODE.PRINCIPAL_ARMOURER;
    expect(r.no).toBe(16);
    expect(Object.keys(r.permissions).every((p) => p.startsWith("request."))).toBe(true);
    for (const t of ["firearm", "ammunition", "armoury", "weapon"]) expect(PROHIBITED_TERMS).toContain(t);
  });

  it("stores functions sit with the stores roles; approval needs a business role", () => {
    expect(ROLES.filter((r) => r.permissions["stores.manage"]).map((r) => r.no)).toEqual([15, 23, 27]);
    for (const r of ROLES.filter((x) => x.permissions["stores.approve"])) expect(r.category).toBe("BUSINESS");
  });
});

describe("synthetic accounts for all 27 roles", () => {
  it("every role has at least one active synthetic account whose workspace matches", () => withDb(async (db) => {
    const rows = await all<{ user_id: string; role_code: string }>(db,
      "SELECT a.user_id, a.role_code FROM role_assignments a JOIN users u ON u.id = a.user_id WHERE a.revoked_at IS NULL AND u.synthetic = 1 AND u.status = 'ACTIVE'");
    for (const r of ROLES) {
      const holder = rows.find((x) => x.role_code === r.code);
      expect(holder, r.code).toBeDefined();
      const a = (await loadActor(db, holder!.user_id, "PRIMARY"))!;
      if (a.contexts!.length === 1) expect(workspaceFor(a)?.role).toBe(r.code);
    }
    // No active assignment of a retired role remains on a synthetic account.
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM role_assignments a JOIN roles r ON r.code = a.role_code WHERE r.status = 'RETIRED' AND a.revoked_at IS NULL"))!.c).toBe(0);
  }));

  it("headline figures exist for every role and technical roles see no personnel figures", () => withDb(async (db) => {
    for (const r of ROLES) {
      const holder = (await one<{ user_id: string }>(db, "SELECT user_id FROM role_assignments WHERE role_code = ? AND revoked_at IS NULL LIMIT 1", r.code))!;
      const a = (await loadActor(db, holder.user_id, "PRIMARY"))!;
      const keys = (await headlineKpis(db, a, r.dashboard)).map((k) => k.key);
      expect(keys.length, r.code).toBeGreaterThan(0);
      if (r.category === "TECHNICAL") expect(keys.some((k) => ["personnel", "activeAssignments", "nationalPersonnel"].includes(k))).toBe(false);
    }
  }));
});

describe("Tier 1 separation", () => {
  it("Superadmin has no personnel, stores or business approval access", () => withDb(async (db) => {
    const s = await actor(db, "u_plat");
    await expect(listPersonnel(db, s)).rejects.toThrow(/not authorised/);
    await expect(listItems(db, s)).rejects.toThrow(/not authorised/);
    expect(await approvalUnitFor(db, s, "MANPOWER", "org_lsk")).toBeNull();
    expect(hasPermission(s, "tenant.manage")).toBe(true);
  }));
  it("Inspector General sees national summaries without record access", () => withDb(async (db) => {
    const ig = await actor(db, "u_rom");
    await expect(listPersonnel(db, ig)).rejects.toThrow(/not authorised/);
    const k = Object.fromEntries((await headlineKpis(db, ig, "NATIONAL_EXECUTIVE")).map((x) => [x.key, x]));
    expect(k.nationalPersonnel.value).toBe((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM personnel_records"))!.c);
    expect(k.nationalPersonnel.href).toBeUndefined();
  }));
});

describe("controlled context switching", () => {
  it("restricts the actor to the selected assignment, re-validated on every load", () => withDb(async (db) => {
    const full = (await loadActor(db, "u_fleet"))!;
    expect(full.assignments).toHaveLength(2);
    const mu = full.assignments.find((a) => a.orgUnitId === "org_mu")!;
    const lsk = full.assignments.find((a) => a.orgUnitId === "org_lsk")!;
    const inMu = (await loadActor(db, "u_fleet", mu.id))!;
    expect(inMu.assignments.map((a) => a.orgUnitId)).toEqual(["org_mu"]);
    expect(can(inMu, "fleet.view", "org_lsk")).toBe(false);
    expect(inMu.contexts).toHaveLength(2);
    // A foreign or revoked assignment id falls back to the primary context, never to everything.
    const other = (await loadActor(db, "u_fleet", "asg_u_kit_cmd_0"))!;
    expect(other.assignments).toHaveLength(1);
    await run(db, "UPDATE role_assignments SET revoked_at = ? WHERE id = ?", new Date().toISOString(), mu.id);
    const after = (await loadActor(db, "u_fleet", mu.id))!;
    expect(after.assignments.map((a) => a.id)).toEqual([lsk.id]);
  }));
  it("a session can only select the signed-in user's own valid assignments", () => withDb(async (db) => {
    const token = await createSession(db, "u_fleet");
    const own = (await one<{ id: string }>(db, "SELECT id FROM role_assignments WHERE user_id = 'u_fleet' AND org_unit_id = 'org_mu' AND revoked_at IS NULL"))!;
    expect(await setSessionContext(db, token, own.id)).toBe(true);
    expect((await resolveSessionContext(db, token))!.activeAssignmentId).toBe(own.id);
    const foreign = (await one<{ id: string }>(db, "SELECT id FROM role_assignments WHERE user_id = 'u_dig' AND revoked_at IS NULL"))!;
    expect(await setSessionContext(db, token, foreign.id)).toBe(false);
    expect((await resolveSessionContext(db, token))!.activeAssignmentId).toBe(own.id);
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE action = 'auth.context.switch' AND outcome = 'DENIED'"))!.c).toBeGreaterThan(0);
  }));
});

describe("scoped technical administration (roles 07, 18, 24)", () => {
  it("lists and supports only accounts inside the administrator's unit", () => withDb(async (db) => {
    const dt = await actor(db, "u_kit_tech");
    const users = await listUsers(db, dt);
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      const units = (await all<{ org_unit_id: string }>(db, "SELECT org_unit_id FROM role_assignments WHERE user_id = ? AND revoked_at IS NULL", u.id)).map((r) => r.org_unit_id);
      expect(units.some((x) => x.startsWith("org_cb_kitwe")), u.id).toBe(true);
    }
    await expect(issueTemporaryPassword(db, dt, "u_kitc_per")).resolves.toMatch(/.{12,}/);
    await expect(userDetail(db, dt, "u_lsk_cmd")).rejects.toThrow(/not found/i);
    await expect(issueTemporaryPassword(db, dt, "u_lsk_cmd")).rejects.toThrow(/not found/i);
    // Other technical administrators are escalated to HQ Tech.
    await expect(issueTemporaryPassword(db, dt, "u_kitc_tech")).rejects.toThrow(/not found/i);
    const st = await actor(db, "u_kitc_tech");
    await expect(unlockAccount(db, st, "u_kit_ops")).rejects.toThrow(/not found/i);
    await expect(listPersonnel(db, st)).rejects.toThrow(/not authorised/);
    // Same role, different formation: no cross-access.
    await expect(userDetail(db, await actor(db, "u_cb_tech"), "u_mu_cmd")).rejects.toThrow(/not found/i);
    // HQ Tech supports any non-self account nationally.
    await expect(unlockAccount(db, await actor(db, "u_sec"), "u_lsk_cmd")).resolves.toBeUndefined();
  }));
});

describe("general stores", () => {
  it("keeps an append-only ledger and refuses negative stock and sensitive items", () => withDb(async (db) => {
    const k = await actor(db, "u_kit_stores");
    const item = (await listItems(db, k)).find((i) => i.code === "SYN-STO-3002")!;
    const before = item.quantity_on_hand;
    await expect(recordMovement(db, k, item.id, { type: "ISSUE", quantity: before + 1, counterparty: "Charge office" })).rejects.toThrow(/insufficient/i);
    const bal = await recordMovement(db, k, item.id, { type: "RECEIPT", quantity: 5, reference: "SYN-GRV-T1", counterparty: "Supplier" });
    expect(bal).toBe(before + 5);
    const last = (await one<{ balance_after: number }>(db, "SELECT balance_after FROM store_transactions WHERE item_id = ? ORDER BY seq DESC LIMIT 1", item.id))!;
    expect(last.balance_after).toBe(bal);
    await expect(createItem(db, k, { orgUnitId: "org_cb_kitwe", code: "SYN-STO-3999", categoryCode: "GENERAL_HARDWARE", name: "Ammunition boxes", unitOfMeasure: "each", reorderLevel: 0 })).rejects.toThrow(/excluded/);
    await expect(getItem(db, await actor(db, "u_asset"), item.id)).rejects.toThrow(/not found/i);
    await expect(recordMovement(db, await actor(db, "u_kit_cmd"), item.id, { type: "RECEIPT", quantity: 1, reference: "x" })).rejects.toThrow(/not authorised/);
  }));

  it("requisitions follow delegated approval with separation of duties", () => withDb(async (db) => {
    const station = await actor(db, "u_kitc_stores");
    const item = (await one<{ id: string; quantity_on_hand: number }>(db, "SELECT id, quantity_on_hand FROM store_items WHERE code = 'SYN-STO-3001'"))!;
    const id = await createRequisition(db, station, { requestingUnitId: "org_cb_kitwe_central", storeUnitId: "org_cb_kitwe", purpose: "Test requisition (synthetic)", lines: [{ itemId: item.id, quantity: 2 }] }, true);
    await expect(requisitionAction(db, station, id, "APPROVE")).rejects.toThrow(/separation of duties/);
    await expect(requisitionAction(db, await actor(db, "u_kitc_ops"), id, "APPROVE")).rejects.toThrow(/not authorised|not found/i); // Station Inspector: no stores approval
    await expect(requisitionAction(db, await actor(db, "u_kit_stores"), id, "ISSUE")).rejects.toThrow(/approved/);
    // A commander with stores.approve but no STORES delegation is refused.
    await run(db, "UPDATE delegations SET revoked_at = ? WHERE domain = 'STORES' AND user_id IN ('u_kitc_cmd','u_kit_cmd','u_cb_cmd')", new Date().toISOString());
    await expect(requisitionAction(db, await actor(db, "u_kitc_cmd"), id, "APPROVE")).rejects.toThrow(/delegation/);
    await run(db, "UPDATE delegations SET revoked_at = NULL WHERE domain = 'STORES' AND user_id = 'u_kitc_cmd'");
    await requisitionAction(db, await actor(db, "u_kitc_cmd"), id, "APPROVE");
    await requisitionAction(db, await actor(db, "u_kit_stores"), id, "ISSUE");
    const after = (await one<{ quantity_on_hand: number }>(db, "SELECT quantity_on_hand FROM store_items WHERE id = ?", item.id))!;
    expect(after.quantity_on_hand).toBe(item.quantity_on_hand - 2);
    expect((await one<{ status: string }>(db, "SELECT status FROM store_requisitions WHERE id = ?", id))!.status).toBe("ISSUED");
    // Another district cannot requisition from Kitwe's store.
    await expect(createRequisition(db, await actor(db, "u_rao"), { requestingUnitId: "org_cb_mufulira", storeUnitId: "org_cb_kitwe", purpose: "Cross-district attempt", lines: [{ itemId: item.id, quantity: 1 }] })).rejects.toThrow(/not authorised|own store/);
  }));
});

describe("stores reports, automation and HQ technical operations", () => {
  it("stores reports are offered to stores holders only and stay within scope", () => withDb(async (db) => {
    const { availableReports, runReport } = await import("@/server/domain/reports");
    const keeper = await actor(db, "u_kit_stores");
    expect(availableReports(keeper).map((r) => r.code)).toEqual(expect.arrayContaining(["STORES_STOCK", "STORES_MOVEMENTS", "STORES_REQUISITIONS"]));
    expect(availableReports(await actor(db, "u_kitc_tech")).map((r) => r.code)).toEqual([]);
    const stock = (await runReport(db, keeper, "STORES_STOCK")).rows;
    expect(stock.length).toBeGreaterThan(0);
    expect(stock.every((r) => String(r.store).startsWith("Kitwe District"))).toBe(true);
    const total = stock.reduce((n, r) => n + Number(r.quantity_on_hand), 0);
    expect(total).toBe(Number((await one<{ q: number }>(db, "SELECT SUM(quantity_on_hand) q FROM store_items WHERE org_unit_id = 'org_cb_kitwe' AND status = 'ACTIVE'"))!.q));
    await expect(runReport(db, await actor(db, "u_mu_sec"), "STORES_STOCK")).rejects.toThrow(/not authorised/);
  }));

  it("the stores job raises reorder and overdue-requisition tasks and closes them once resolved", () => withDb(async (db) => {
    const { JOB_BY_NAME } = await import("@/server/jobs/engine");
    const job = JOB_BY_NAME["stores.reorder-and-requisitions"];
    const usb = (await one<{ id: string }>(db, "SELECT id FROM store_items WHERE code = 'SYN-STO-4002'"))!; // 0 on hand, reorder level 2
    await job.run(db);
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM administrative_tasks WHERE user_id = 'u_kitc_stores' AND status = 'OPEN' AND source_key LIKE ?", `stores-reorder:${usb.id}:%`))!.c).toBe(1);
    // A requisition submitted 5 days ago and still undecided reaches the delegated approver, not the requester.
    const req = (await one<{ id: string; requested_by: string }>(db, "SELECT id, requested_by FROM store_requisitions WHERE status = 'SUBMITTED' AND requesting_unit_id = 'org_cb_kitwe_central' LIMIT 1"))!;
    await run(db, "UPDATE store_requisitions SET submitted_at = ? WHERE id = ?", new Date(Date.now() - 5 * 864e5).toISOString(), req.id);
    await job.run(db);
    const deciders = (await all<{ user_id: string }>(db, "SELECT user_id FROM administrative_tasks WHERE status = 'OPEN' AND source_key LIKE ?", `srq-decide:${req.id}:%`)).map((r) => r.user_id);
    expect(deciders).toContain("u_kitc_cmd");
    expect(deciders).not.toContain(req.requested_by);
    // Resolution closes the tasks on the next run.
    await recordMovement(db, await actor(db, "u_kitc_stores"), usb.id, { type: "RECEIPT", quantity: 10, reference: "SYN-GRV-T2", counterparty: "Supplier" });
    await requisitionAction(db, await actor(db, "u_kitc_cmd"), req.id, "REJECT", { comment: "Not required this month (synthetic)." });
    await job.run(db);
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM administrative_tasks WHERE status = 'OPEN' AND (source_key LIKE ? OR source_key LIKE ?)", `stores-reorder:${usb.id}:%`, `srq-decide:${req.id}:%`))!.c).toBe(0);
  }));

  it("HQ Tech operates jobs (platform.operate) but cannot change settings (platform.configure)", () => withDb(async (db) => {
    const { runJobsNow, updateSetting } = await import("@/server/domain/platform");
    const hq = await actor(db, "u_sec");
    await expect(runJobsNow(db, hq, "system.housekeeping")).resolves.toBeDefined();
    await expect(updateSetting(db, hq, "backup.max_age_hours", "48")).rejects.toThrow(/not authorised/);
    await expect(runJobsNow(db, await actor(db, "u_kit_tech"), "system.housekeeping")).rejects.toThrow(/not authorised/);
  }));
});

describe("role-aware Help centre", () => {
  it("documents every workspace page and explains each role's authority, limits and support", () => withDb(async (db) => {
    const { helpCentre, PAGE_HELP } = await import("@/server/domain/help");
    for (const w of Object.values(WORKSPACES)) for (const g of w.nav) for (const h of g.items) expect(PAGE_HELP[h], `${w.role} ${h}`).toBeTruthy();
    const tech = await helpCentre(db, await actor(db, "u_kitc_tech"));
    expect(tech.role?.backOffice).toBe("Police Station Technical Administration");
    expect(tech.limits.join(" ")).toMatch(/technical role/);
    expect(tech.pages.some((p) => p.href === "/app/personnel")).toBe(false);
    const oic = await helpCentre(db, await actor(db, "u_kitc_cmd"));
    expect(oic.delegations.map((d) => d.domain)).toContain("stores requisitions");
    const insp = await helpCentre(db, await actor(db, "u_kitc_per"));
    expect(insp.limits.join(" ")).toMatch(/no delegated approval authority/);
    expect(insp.support.map((s) => s.name)).toContain("Demo Kitwe Central Station System Administrator");
    expect((await helpCentre(db, await actor(db, "u_fleet"))).contexts).toBe(2);
  }));
});

describe("UAT label consistency", () => {
  it("KPI_LABELS matches the labels every role's dashboard actually shows", () => withDb(async (db) => {
    const { KPI_LABELS } = await import("@/server/domain/workspace-config");
    for (const r of ROLES) {
      const holder = (await one<{ user_id: string }>(db, "SELECT user_id FROM role_assignments WHERE role_code = ? AND revoked_at IS NULL LIMIT 1", r.code))!;
      const a = (await loadActor(db, holder.user_id, "PRIMARY"))!;
      for (const k of await headlineKpis(db, a, r.dashboard)) expect(KPI_LABELS[k.key]?.split(" / "), `${r.code} ${k.key}`).toContain(k.label);
    }
  }));
});
