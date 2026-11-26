import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import { addDays, notify, setClock, today } from "@/server/domain/core";
import { JOBS, runAllJobs, runJob } from "@/server/jobs/engine";
import { completeTask, listTasks, preferences, savePreferences } from "@/server/domain/tasks";
import { createBackup, maintenanceMode, platformOverview, restoreDrill, setMaintenanceMode, updateSetting, verifyBackup } from "@/server/domain/platform";
import { createManpowerRequest, getManpowerRequest, manpowerAction, publishManpowerWorkflow, setRequirement } from "@/server/domain/manpower";
import { listTenants, provisionFormationTenant } from "@/server/domain/tenants";
import { areaDetail, updateArea } from "@/server/domain/assignments";
import { availableReports, runReport } from "@/server/domain/reports";
import { recordHistory } from "@/server/domain/history";
import { endUserSessions } from "@/server/domain/iam";
import { createSession } from "@/server/domain/sessions";
import { actor, withDb } from "./helpers";
import { testDatabaseUrl } from "./env";

afterEach(() => setClock(null));
const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "zps-backup-"));
afterAll(() => fs.rmSync(backupDir, { recursive: true, force: true }));

describe("automation engine (Part IX)", () => {
  it("runs every job, records each run and never fails on the seeded data", () => withDb(async (db) => {
    const results = await runAllJobs(db, "MANUAL", "u_plat");
    expect(results).not.toBeNull();
    expect(results!.map((r) => r.name)).toEqual(JOBS.map((j) => j.name));
    expect(results!.every((r) => r.ok)).toBe(true);
    const runs = await all<{ status: string }>(db, "SELECT status FROM job_runs ORDER BY id DESC LIMIT ?", JOBS.length);
    expect(runs.every((r) => r.status === "SUCCESS")).toBe(true);
  }));

  it("contribution reminders notify the unit once, create a task, and close it when submitted", () => withDb(async (db) => {
    const c = (await one<{ id: string; request_id: string }>(db, "SELECT c.id, c.request_id FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id WHERE m.status = 'APPROVED' AND c.status = 'PENDING' LIMIT 1"))!;
    await run(db, "UPDATE manpower_requests SET contribution_deadline = ? WHERE id = ?", addDays(today(), -1), c.request_id);
    await runJob(db, "manpower.contribution-reminders", "MANUAL");
    await runJob(db, "manpower.contribution-reminders", "MANUAL"); // idempotent
    const notes = await all<{ user_id: string }>(db, "SELECT user_id FROM notifications WHERE dedupe_key LIKE ?", `contrib:${c.id}:overdue|%`);
    expect(notes.length).toBeGreaterThan(0);
    expect(new Set(notes.map((n) => n.user_id)).size).toBe(notes.length);
    const tasks = await all<{ id: string; user_id: string }>(db, "SELECT id, user_id FROM administrative_tasks WHERE source_key LIKE ? AND status = 'OPEN'", `contrib:${c.id}:%`);
    expect(tasks.length).toBe(notes.length);
    await run(db, "UPDATE manpower_contributions SET status = 'SUBMITTED' WHERE id = ?", c.id);
    await runJob(db, "manpower.contribution-reminders", "MANUAL");
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM administrative_tasks WHERE source_key LIKE ? AND status = 'OPEN'", `contrib:${c.id}:%`))!.c)).toBe(0);
  }));

  it("review reminders create tasks for delegated approvers that the user can complete", () => withDb(async (db) => {
    await runJob(db, "assignment.review-reminders", "MANUAL");
    const cmd = await actor(db, "u_cb_cmd");
    const tasks = await listTasks(db, cmd, "OPEN");
    expect(tasks.some((t) => t.category === "RENEWAL")).toBe(true);
    await completeTask(db, cmd, tasks[0].id);
    expect((await listTasks(db, cmd, "DONE")).some((t) => t.id === tasks[0].id)).toBe(true);
    // Another user cannot complete someone else's task.
    await expect(completeTask(db, await actor(db, "u_dig"), tasks[1]?.id ?? tasks[0].id)).rejects.toThrow();
  }));

  it("expires temporary access formally, with audit", () => withDb(async (db) => {
    await run(db, "UPDATE role_assignments SET valid_to = ? WHERE user_id = 'u_staff'", new Date(Date.now() - 60000).toISOString());
    await runJob(db, "access.temporary-expiry", "MANUAL");
    const a = await one<{ revoked_at: string | null; revoke_reason: string }>(db, "SELECT revoked_at, revoke_reason FROM role_assignments WHERE user_id = 'u_staff'");
    expect(a?.revoked_at).toBeTruthy();
    expect(a?.revoke_reason).toMatch(/automatic/);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM audit_events WHERE action = 'iam.assignment.expired' AND entity_id = 'u_staff'"))!.c)).toBe(1);
  }));

  it("notification preferences suppress optional categories only", () => withDb(async (db) => {
    const u = await actor(db, "u_kit_cmd");
    await savePreferences(db, u, ["MANPOWER"]); // RENEWAL off
    expect(await notify(db, "u_kit_cmd", "t", "b", undefined, { category: "RENEWAL" })).toBe(false);
    expect(await notify(db, "u_kit_cmd", "t", "b", undefined, { category: "MANPOWER" })).toBe(true);
    expect(await notify(db, "u_kit_cmd", "t", "b", undefined, { category: "APPROVAL" })).toBe(true); // always on
    expect((await preferences(db, u)).find((p) => p.category === "RENEWAL")?.enabled).toBe(false);
  }));
});

describe("platform administration (Module 15)", () => {
  it("is technical-only, toggles maintenance mode and validates editable settings", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    const o = await platformOverview(db, plat);
    expect(o.migrations.length).toBeGreaterThanOrEqual(4);
    expect(o.jobs.length).toBe(JOBS.length);
    await expect(platformOverview(db, await actor(db, "u_dig"))).rejects.toThrow(/not authorised/);
    await setMaintenanceMode(db, plat, true, "Synthetic maintenance window");
    expect(await maintenanceMode(db)).toBe(true);
    await expect(updateSetting(db, plat, "assignment.minimum_tenure_days", "30")).rejects.toThrow(/cannot be changed/);
    await expect(updateSetting(db, plat, "automation.interval_minutes", "0")).rejects.toThrow(/range/);
    await updateSetting(db, plat, "automation.interval_minutes", "10");
  }));

  it("creates a verified mysqldump backup and detects tampering", async () => {
    process.env.DATABASE_URL = testDatabaseUrl();
    process.env.ZPS_BACKUP_DIR = backupDir;
    await withDb(async (db) => {
      const plat = await actor(db, "u_plat");
      const b = await createBackup(db, plat);
      expect(b.size).toBeGreaterThan(10000);
      const row = (await one<{ id: number; verified: number; status: string }>(db, "SELECT id, verified, status FROM backup_runs ORDER BY id DESC LIMIT 1"))!;
      expect(row).toMatchObject({ verified: 1, status: "SUCCESS" });
      await verifyBackup(db, plat, row.id);
      // Restore drill: the backup restores into a scratch database with core tables and an intact audit chain.
      const drill = await restoreDrill(db, await actor(db, "u_sec"), row.id);
      expect(drill.status).toBe("PASSED");
      expect(drill.tables_found).toBeGreaterThan(40);
      expect(drill.schema_version).toBeGreaterThanOrEqual(10);
      expect(drill.audit_events).toBeGreaterThan(0);
      expect(await one(db, "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%_restorecheck'")).toBeUndefined();
      await expect(restoreDrill(db, await actor(db, "u_dig"), row.id)).rejects.toThrow(/not authorised/);
      fs.appendFileSync(path.join(backupDir, b.file), "-- tampered\n");
      await expect(verifyBackup(db, plat, row.id)).rejects.toThrow(/Checksum mismatch/);
      expect((await restoreDrill(db, plat, row.id)).status).toBe("FAILED");
      await expect(createBackup(db, await actor(db, "u_dig"))).rejects.toThrow(/not authorised/);
    });
  }, 120000);
});

describe("configurable manpower approval chains (Module 09)", () => {
  it("requires every level in order, by different delegated approvers, and pins the version", () => withDb(async (db) => {
    const sops = await actor(db, "u_cb_sops");
    const id = await createManpowerRequest(db, sops, {
      requestingUnitId: "org_cb", category: "REINFORCEMENT", purpose: "Two-level approval test request", areaId: "", totalRequired: 2, personnelCategories: "Constables",
      commencementDate: addDays(today(), 20), durationDays: 30, justification: "Testing the configured two-level approval chain.", approvalUnitId: "org_cb",
    });
    await manpowerAction(db, sops, id, "SUBMIT");
    // A newer version published after submission does not affect this request.
    await publishManpowerWorkflow(db, await actor(db, "u_hqc"), "REINFORCEMENT", [{ authority: "APPROVAL_UNIT", label: "Single level" }], "Synthetic change to test version pinning.");
    // A unit-level approver with no delegation at the request's authority cannot decide it.
    await expect(manpowerAction(db, await actor(db, "u_lsk_cmd"), id, "APPROVE")).rejects.toThrow(/not found|delegated/);
    await manpowerAction(db, await actor(db, "u_cb_cmd"), id, "APPROVE", "Level 1 approved");
    let m = await getManpowerRequest(db, await actor(db, "u_cb_cmd"), id);
    expect(m).toMatchObject({ status: "UNDER_REVIEW", current_level: 2 });
    // Level 2 needs HQ authority: the Copperbelt delegation does not reach it, and nobody decides two levels.
    await expect(manpowerAction(db, await actor(db, "u_cb_cmd"), id, "APPROVE")).rejects.toThrow(/delegated/);
    await manpowerAction(db, await actor(db, "u_dig"), id, "APPROVE", "HQ concurrence");
    m = await getManpowerRequest(db, await actor(db, "u_dig"), id);
    expect(m.status).toBe("APPROVED");
    const acts = await all<{ action: string }>(db, "SELECT action FROM approval_actions WHERE entity_type = 'manpower_request' AND entity_id = ? ORDER BY seq", id);
    expect(acts.map((a) => a.action)).toEqual(["CREATE", "SUBMIT", "APPROVE_L1", "APPROVE_L2"]);
    await expect(publishManpowerWorkflow(db, await actor(db, "u_dig"), "OTHER", [{ authority: "HQ", label: "x" }], "Not permitted for this role.")).rejects.toThrow(/not authorised/);
    void setRequirement;
  }));
});

describe("tenants, areas, reports and history", () => {
  it("provisions a formation tenant and moves its units and records atomically", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    const r = await provisionFormationTenant(db, plat, { code: "FM-AP", name: "Airport Division tenant (synthetic)", formationId: "org_ap", reason: "Synthetic provisioning test SYN-T-1" });
    expect(r.moved.org_units).toBeGreaterThan(0);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM personnel_records WHERE home_unit_id = 'org_ap' AND tenant_id <> ?", r.id))!.c)).toBe(0);
    expect((await listTenants(db, plat)).some((t) => t.id === r.id)).toBe(true);
    await expect(provisionFormationTenant(db, await actor(db, "u_sec"), { code: "FM-X", name: "Not allowed tenant", formationId: "org_pu", reason: "Should be refused here." })).rejects.toThrow(/not authorised/);
  }));

  it("edits an operational area with screening and shows its history", () => withDb(async (db) => {
    const naa = await actor(db, "u_naa");
    await updateArea(db, naa, "area_kcm", { name: "KCM Mine Operations — Kitwe (synthetic, renamed)", reason: "Synthetic rename" });
    await expect(updateArea(db, naa, "area_kcm", { name: "KCM patrol route sector", reason: "Should fail" })).rejects.toThrow(/administrative duty-area/);
    const d = await areaDetail(db, naa, "area_kcm");
    expect(d.history.length).toBeGreaterThan(0);
    await expect(areaDetail(db, await actor(db, "u_lsk_cmd"), "area_kcm")).rejects.toThrow(/not found/i);
  }));

  it("runs the personnel-module reports within scope", () => withDb(async (db) => {
    const naa = await actor(db, "u_naa");
    const codes = availableReports(naa).map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["ASSIGNMENTS_BY_AREA", "TENURE_BANDS", "TRANSFERS_SUMMARY"]));
    const { rows } = await runReport(db, naa, "ASSIGNMENTS_BY_AREA");
    const kcm = rows.find((r) => String(r.operational_area).startsWith("KCM"))!;
    expect(Number(kcm.active) + Number(kcm.transfer_pending)).toBe(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM personnel_assignments WHERE area_id = 'area_kcm' AND status IN ('ACTIVE','TRANSFER_PENDING')"))!.c));
    const per = await runReport(db, await actor(db, "u_npa"), "PERSONNEL_BY_UNIT");
    expect(per.rows.reduce((n, r) => n + Number(r.total), 0)).toBe(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM personnel_records"))!.c));
  }));

  it("history views are auditor-only and read-only", () => withDb(async (db) => {
    const aud = await actor(db, "u_audit");
    expect((await recordHistory(db, aud, "workflow", { type: "transfer" })).length).toBeGreaterThan(0);
    expect((await recordHistory(db, aud, "disposition")).length).toBeGreaterThan(0);
    await expect(recordHistory(db, await actor(db, "u_cb_cmd"), "workflow")).rejects.toThrow(/not authorised/);
  }));

  it("security administrators can end a user's sessions", () => withDb(async (db) => {
    await createSession(db, "u_lsk_sops");
    const n = await endUserSessions(db, await actor(db, "u_sec"), "u_lsk_sops");
    expect(n).toBeGreaterThan(0);
    expect(Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM sessions WHERE user_id = 'u_lsk_sops'"))!.c)).toBe(0);
  }));
});

describe("health and readiness", () => {
  it("reports a ready, current schema without disclosing anything sensitive", () => withDb(async (db) => {
    const { liveness, readiness } = await import("@/server/domain/health");
    expect(liveness().status).toBe("ok");
    const h = await readiness(db);
    expect(h.status).toBe("ok");
    expect(h.checks.schema.applied).toBe(h.checks.schema.expected);
    const text = JSON.stringify(h);
    for (const secret of ["zps_oms", "root", "127.0.0.1", "localhost", "demo."]) expect(text).not.toContain(secret);
    await run(db, "UPDATE app_settings SET value = 'ON' WHERE `key` = 'platform.maintenance_mode'");
    expect((await readiness(db)).status).toBe("degraded");
  }));
});

describe("strict SQL mode (DEC-061)", () => {
  it("every pooled connection is strict: over-long values are rejected, never truncated", () => withDb(async (db) => {
    expect((await one<{ m: string }>(db, "SELECT @@SESSION.sql_mode AS m"))!.m).toContain("STRICT_TRANS_TABLES");
    await expect(run(db, "UPDATE app_settings SET `key` = ? WHERE `key` = 'request.sla_days'", "x".repeat(200))).rejects.toThrow(/too long/i);
  }));
});

describe("SQL mode consistency", () => {
  it("migrations and application connections use the same strict mode", async () => {
    const { SQL_MODE: app } = await import("@/server/db/sql-mode");
    const { SQL_MODE: mig } = await import("@/server/db/migrate");
    expect(mig).toBe(app);
  });
});
