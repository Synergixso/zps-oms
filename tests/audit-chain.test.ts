/** Audit hash chain under concurrency and with over-long values (DEC-064). */
import { describe, expect, it } from "vitest";
import { createPool, one } from "@/server/db/connection";
import { audit, verifyAuditChain } from "@/server/domain/audit";
import { testDatabaseUrl } from "./env";
import { withDb } from "./helpers";

describe("audit hash chain", () => {
  it("never forks under concurrent appends (committed, separate connections)", async () => {
    const pool = createPool(testDatabaseUrl());
    try {
      await Promise.all(Array.from({ length: 40 }, (_, i) => audit(pool, { actorId: null, action: `test.concurrent.${i}`, category: "CONFIG" })));
      const v = await verifyAuditChain(pool);
      expect(v.ok).toBe(true);
      const head = (await one<{ last_hash: string; last_seq: number }>(pool, "SELECT last_hash, last_seq FROM audit_chain_head WHERE id = 1"))!;
      const last = (await one<{ hash: string; seq: number }>(pool, "SELECT hash, seq FROM audit_events ORDER BY seq DESC LIMIT 1"))!;
      expect(head).toEqual({ last_hash: last.hash, last_seq: last.seq });
    } finally {
      await pool.end();
    }
  });

  it("fits over-long values before hashing and keeps the full action in details", () => withDb(async (db) => {
    const long = `page.denied:${"request.view|".repeat(12)}`;
    await audit(db, { actorId: null, action: long, category: "SECURITY", entityId: "x".repeat(60) });
    const e = (await one<{ action: string; entity_id: string; details: string }>(db, "SELECT action, entity_id, details FROM audit_events ORDER BY seq DESC LIMIT 1"))!;
    expect(e.action.length).toBe(80);
    expect(e.entity_id.length).toBe(40);
    expect(JSON.parse(e.details).fullAction).toBe(long);
    expect((await verifyAuditChain(db)).ok).toBe(true);
  }));

  it("a rolled-back append releases the chain head and leaves the chain intact", async () => {
    const pool = createPool(testDatabaseUrl());
    try {
      const before = (await one<{ last_hash: string }>(pool, "SELECT last_hash FROM audit_chain_head WHERE id = 1"))!;
      await withDb(async (db) => { await audit(db, { actorId: null, action: "test.rolled-back", category: "CONFIG" }); });
      expect((await one<{ last_hash: string }>(pool, "SELECT last_hash FROM audit_chain_head WHERE id = 1"))!.last_hash).toBe(before.last_hash);
      await audit(pool, { actorId: null, action: "test.after-rollback", category: "CONFIG" });
      expect((await verifyAuditChain(pool)).ok).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
