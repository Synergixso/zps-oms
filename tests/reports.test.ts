import { describe, expect, it } from "vitest";
import { one } from "@/server/db/connection";
import { personnelSummary } from "@/server/domain/personnel";
import { assignmentSummary } from "@/server/domain/assignments";
import { manpowerSummary } from "@/server/domain/manpower";
import { actor, withDb } from "./helpers";

type Conn = Parameters<Parameters<typeof withDb>[0]>[0];
const count = async (db: Conn, sql: string, ...p: unknown[]) => Number((await one<{ c: number }>(db, sql, ...p))!.c);

describe("dashboard and report figures equal the database records (Test J)", () => {
  it("national figures match direct counts", () => withDb(async (db) => {
    const npa = await actor(db, "u_npa");
    const per = await personnelSummary(db, npa);
    expect(per.total).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_records"));
    expect(per.unverified).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_records WHERE verification_status = 'UNVERIFIED'"));
    const naa = await actor(db, "u_naa");
    const asg = await assignmentSummary(db, naa);
    expect(asg.active).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_assignments WHERE status IN ('ACTIVE','TRANSFER_PENDING')"));
    expect(asg.pendingApproval).toBe(await count(db, "SELECT COUNT(*) AS c FROM personnel_assignments WHERE status = 'PENDING_APPROVAL'"));
    expect(asg.transfersOpen).toBe(await count(db, "SELECT COUNT(*) AS c FROM assignment_transfers WHERE status IN ('PENDING_RELEASE','PENDING_ACCEPTANCE')"));
    const hq = await actor(db, "u_hqstaff");
    const mpr = await manpowerSummary(db, hq);
    expect(mpr.approved).toBe(await count(db, "SELECT COUNT(*) AS c FROM manpower_requests WHERE status = 'APPROVED'"));
    expect(mpr.completed).toBe(await count(db, "SELECT COUNT(*) AS c FROM manpower_requests WHERE status = 'COMPLETED'"));
  }));

  it("scoped figures count only the actor's subtree and change with the data", () => withDb(async (db) => {
    const kit = await actor(db, "u_kit_cmd");
    const sql = "SELECT COUNT(*) AS c FROM personnel_records p JOIN org_unit_closure x ON x.descendant_id = p.home_unit_id AND x.ancestor_id = 'org_cb_kitwe'";
    const before = await personnelSummary(db, kit);
    expect(before.total).toBe(await count(db, sql));
    await db.query("UPDATE personnel_records SET verification_status = 'UNVERIFIED' WHERE home_unit_id = 'org_cb_kitwe_nkana'");
    const after = await personnelSummary(db, kit);
    expect(after.unverified).toBe(await count(db, `${sql} WHERE p.verification_status = 'UNVERIFIED'`));
    expect(after.unverified).toBeGreaterThan(before.unverified);
  }));
});
