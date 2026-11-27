import { describe, expect, it } from "vitest";
import { one } from "@/server/db/connection";
import { pageRequests, countRequests, listRequests } from "@/server/domain/requests";
import { splitSelect } from "@/server/domain/paging";
import { actor, withDb } from "./helpers";

describe("register pagination (directive §5.1)", () => {
  it("splits a select at its top-level FROM, ignoring subqueries", () => {
    expect(splitSelect("SELECT a.*, (SELECT COUNT(*) FROM b WHERE b.x = a.id) AS n\n  FROM a JOIN c ON c.id = a.c")).toEqual({
      columns: "a.*, (SELECT COUNT(*) FROM b WHERE b.x = a.id) AS n", from: "FROM a JOIN c ON c.id = a.c",
    });
    expect(() => splitSelect("UPDATE x SET y = 1")).toThrow();
  });

  it("pages through every request in scope exactly once, with a true total equal to the count", () => withDb(async (db) => {
    const hq = await actor(db, "u_hqc");
    const total = await countRequests(db, hq);
    const seen = new Set<string>();
    for (let page = 1; ; page++) {
      const p = await pageRequests(db, hq, { page, pageSize: 5 });
      expect(p.total).toBe(total);
      p.rows.forEach((r) => seen.add(r.id));
      if (page >= p.pages) break;
    }
    expect(seen.size).toBe(total);
    // Out-of-range pages are clamped; sizes are bounded.
    const last = await pageRequests(db, hq, { page: 9999, pageSize: 5 });
    expect(last.page).toBe(last.pages);
    expect((await pageRequests(db, hq, { pageSize: 100000 })).pageSize).toBe(200);
    // A Division sees only its own requests in the count as well as the rows.
    const lsk = await actor(db, "u_lsk_sops");
    const lp = await pageRequests(db, lsk, { pageSize: 200 });
    expect(lp.total).toBe((await listRequests(db, lsk)).length);
    expect(lp.total).toBeLessThan(total);
  }));

  it("computes overdue in SQL with the same rule as before", () => withDb(async (db) => {
    const hq = await actor(db, "u_hqc");
    await db.query("UPDATE admin_requests SET due_date = '2020-01-01' WHERE status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_PROGRESS') LIMIT 2");
    const overdue = await listRequests(db, hq, { overdue: true });
    const today = new Date().toISOString().slice(0, 10);
    expect(overdue.length).toBeGreaterThanOrEqual(1);
    expect(overdue.every((r) => r.due_date! < today && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"].includes(r.status))).toBe(true);
    expect(await countRequests(db, hq, { overdue: true })).toBe(overdue.length);
  }));
});

describe("audit explorer and roster index pagination", () => {
  it("pages the audit trail with a true total, beyond the former latest-200 view", () => withDb(async (db) => {
    const { pageAudit, pageSecurityEvents } = await import("@/server/domain/auditq");
    const auditor = await actor(db, "u_audit");
    const all = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events"))?.n);
    const p1 = await pageAudit(db, auditor, {}, { page: 1 });
    expect(p1.total).toBe(all);
    expect(p1.total).toBeGreaterThan(200);
    const last = await pageAudit(db, auditor, {}, { page: p1.pages });
    expect(last.rows.length).toBeGreaterThan(0);
    // Without the security permission the security view is refused.
    await expect(pageSecurityEvents(db, auditor, {}, {})).rejects.toThrow(/not authorised/);
  }));

  it("pages the roster index within scope", () => withDb(async (db) => {
    const { pageRosters, rosterIndex } = await import("@/server/domain/manpower");
    const hq = await actor(db, "u_hqc");
    const p = await pageRosters(db, hq, { pageSize: 5 });
    expect(p.total).toBe((await rosterIndex(db, hq)).length);
  }));
});
