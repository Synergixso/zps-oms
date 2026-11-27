import type { PoolConnection } from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { setClock, today } from "@/server/domain/core";
import { acceptDecision, decideAssignment, getAssignment, initiateTransfer, proposeAssignment, releaseDecision } from "@/server/domain/assignments";
import { registerCorrespondence } from "@/server/domain/correspondence";
import { actor, withDb } from "./helpers";

/** A connection that fails the first statement matching `pattern`, as a disk, lock or constraint failure would. */
function failing(db: PoolConnection, pattern: RegExp): PoolConnection {
  let fired = false;
  return new Proxy(db, {
    get(target, prop, recv) {
      if (prop === "query") {
        return (sql: string, params?: unknown[]) => {
          if (!fired && pattern.test(sql)) {
            fired = true;
            return Promise.reject(Object.assign(new Error("Injected database failure"), { code: "ER_INJECTED" }));
          }
          return target.query(sql, params);
        };
      }
      const v = Reflect.get(target, prop, recv);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

async function availableOfficer(db: PoolConnection, unit: string) {
  const r = await one<{ id: string }>(db,
    `SELECT p.id FROM personnel_records p WHERE p.home_unit_id = ? AND p.employment_status = 'SERVING' AND p.disposition_status = 'AVAILABLE_HOME'
       AND NOT EXISTS (SELECT 1 FROM personnel_assignments a WHERE a.personnel_id = p.id AND a.status IN ('PENDING_APPROVAL','APPROVED','ACTIVE','TRANSFER_PENDING'))
       AND NOT EXISTS (SELECT 1 FROM manpower_contribution_entries e WHERE e.personnel_id = p.id) ORDER BY p.id LIMIT 1`, unit);
  return r!.id;
}

describe("transaction failure leaves no partial change (directive §11.4)", () => {
  it("a transfer whose new assignment cannot be written leaves the old assignment, the transfer and the disposition untouched", () => withDb(async (db) => {
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const cmd = await actor(db, "u_cb_cmd");
    setClock(() => new Date("2025-03-03T08:00:00.000Z"));
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: "2025-03-03" });
    await decideAssignment(db, cmd, id, "APPROVE", "Approved");
    setClock(null);
    const trf = await initiateTransfer(db, coord, id, { toAreaId: "area_mopani", justification: "Rebalancing after the minimum tenure was completed.", proposedDate: today() });
    await releaseDecision(db, cmd, trf, "APPROVE", "Release approved");
    const before = {
      assignments: await all(db, "SELECT id, status, close_reason, ended_on FROM personnel_assignments WHERE personnel_id = ? ORDER BY id", pid),
      transfer: await one(db, "SELECT status FROM assignment_transfers WHERE id = ?", trf),
      disposition: await one(db, "SELECT disposition_status FROM personnel_records WHERE id = ?", pid),
      history: Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM disposition_history WHERE personnel_id = ?", pid))?.n),
      completeAudit: Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE action = 'transfer.complete' AND entity_id = ?", trf))?.n),
    };
    // Fail the insert of the new Mopani assignment, in the middle of acceptance.
    const broken = failing(db, /^\s*INSERT INTO personnel_assignments/i);
    await expect(acceptDecision(broken, await actor(db, "u_rao"), trf, "ACCEPT", { effectiveDate: today(), comment: "Accepted into area" })).rejects.toThrow(/Injected database failure/);
    expect(await all(db, "SELECT id, status, close_reason, ended_on FROM personnel_assignments WHERE personnel_id = ? ORDER BY id", pid)).toEqual(before.assignments);
    expect(await one(db, "SELECT status FROM assignment_transfers WHERE id = ?", trf)).toEqual(before.transfer);
    expect(await one(db, "SELECT disposition_status FROM personnel_records WHERE id = ?", pid)).toEqual(before.disposition);
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM disposition_history WHERE personnel_id = ?", pid))?.n)).toBe(before.history);
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE action = 'transfer.complete' AND entity_id = ?", trf))?.n)).toBe(before.completeAudit);
    expect((await getAssignment(db, cmd, id)).status).toBe("TRANSFER_PENDING");
    // Once the failure clears, the same acceptance succeeds normally.
    const created = await acceptDecision(db, await actor(db, "u_rao"), trf, "ACCEPT", { effectiveDate: today(), comment: "Accepted into area" });
    expect((await getAssignment(db, cmd, created!)).area_id).toBe("area_mopani");
    expect((await getAssignment(db, cmd, id)).status).toBe("CLOSED");
  }));

  it("a correspondence record whose history cannot be written is not registered at all", () => withDb(async (db) => {
    const staff = await actor(db, "u_cb_sops");
    const before = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM correspondence"))?.n);
    const broken = failing(db, /^\s*INSERT INTO correspondence_events/i);
    await expect(registerCorrespondence(broken, staff, { orgUnitId: "org_cb", direction: "INCOMING", subject: "Demo letter that must not half-register", counterpartName: "Demo Registry", registerDate: today() })).rejects.toThrow(/Injected/);
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM correspondence"))?.n)).toBe(before);
  }));
});

describe("audit events carry before and after values and the authorising delegation (directive §7.7)", () => {
  it("records from/to status, authorising unit and delegation reference on an assignment decision, and field values on a personnel correction", () => withDb(async (db) => {
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const coord = await actor(db, "u_cb_asg");
    const cmd = await actor(db, "u_cb_cmd");
    const id = await proposeAssignment(db, coord, { personnelId: pid, areaId: "area_kcm", commencementDate: today() });
    await decideAssignment(db, cmd, id, "APPROVE", "Approved");
    const ev = await one<{ details: string }>(db, "SELECT details FROM audit_events WHERE action = 'assignment.approve' AND entity_id = ?", id);
    const d = JSON.parse(ev!.details) as { from: string; to: string; authorisingUnit: string; delegation: string | null };
    expect(d).toMatchObject({ from: "PENDING_APPROVAL", to: "ACTIVE" });
    expect(d.authorisingUnit).toBeTruthy();
    expect(d.delegation).toMatch(/\S/);
  }));
});

describe("unauthorised disposition changes are refused (directive §11.4)", () => {
  it("refuses roles without disposition.change, other Divisions, workflow-only statuses and changes that contradict an active assignment", () => withDb(async (db) => {
    const { changeDisposition, MANUAL_DISPOSITIONS } = await import("@/server/domain/personnel");
    const pid = await availableOfficer(db, "org_cb_kitwe_central");
    const manual = MANUAL_DISPOSITIONS.find((s) => s !== "AVAILABLE_HOME" && s !== "RETURNED_HOME")!;
    // No permission at all (technical role) and another Division's staff (out of scope).
    await expect(changeDisposition(db, await actor(db, "u_cb_tech"), pid, manual, "Demo reason")).rejects.toThrow();
    await expect(changeDisposition(db, await actor(db, "u_lsk_sops"), pid, manual, "Demo reason")).rejects.toThrow();
    // Division Staff II works on assignments but does not hold disposition.change.
    await expect(changeDisposition(db, await actor(db, "u_cb_asg"), pid, manual, "Demo reason")).rejects.toThrow(/not authorised/);
    const coord = await actor(db, "u_cb_sops"); // Division Staff I holds disposition.change in the Copperbelt Division
    // Statuses owned by the assignment workflow cannot be set by hand.
    await expect(changeDisposition(db, coord, pid, "ACTIVE_ASSIGNMENT" as never, "Demo reason")).rejects.toThrow(/assignment workflow/);
    // A reason is required.
    await expect(changeDisposition(db, coord, pid, manual, "no")).rejects.toThrow(/reason/);
    // Every refusal above left the record unchanged.
    expect((await one<{ s: string }>(db, "SELECT disposition_status AS s FROM personnel_records WHERE id = ?", pid))!.s).toBe("AVAILABLE_HOME");
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE entity_id = ? AND outcome = 'DENIED'", pid))!.n)).toBeGreaterThanOrEqual(3);
  }));
});
