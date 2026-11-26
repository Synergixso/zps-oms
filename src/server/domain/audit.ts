import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { newId, nowIso } from "./core";

export type AuditCategory = "AUTH" | "IAM" | "BUSINESS" | "EXPORT" | "CONFIG" | "SECURITY" | "ORG";
export type AuditOutcome = "SUCCESS" | "DENIED" | "FAILURE";

export interface AuditInput {
  actorId: string | null;
  action: string;
  outcome?: AuditOutcome;
  category: AuditCategory;
  entityType?: string;
  entityId?: string;
  orgUnitId?: string | null;
  details?: Record<string, unknown>;
}

const GENESIS = "0".repeat(64);
const REDACT_KEYS = /pass|secret|token|cookie|session|credential/i;

function redact(details: Record<string, unknown> | undefined) {
  if (!details) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) out[k] = REDACT_KEYS.test(k) ? "[REDACTED]" : v;
  return JSON.stringify(out);
}

function computeHash(prev: string, e: Record<string, unknown>) {
  const canonical = JSON.stringify([
    prev, e.id, e.occurred_at, e.actor_id, e.action, e.outcome, e.entity_type, e.entity_id, e.org_unit_id, e.category, e.details,
  ]);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** Column widths of audit_events: values are fitted BEFORE hashing, so the stored row always matches its hash. */
const WIDTH = { action: 80, id40: 40 } as const;
const fit = (v: string | null | undefined, n: number) => (v == null ? null : v.length > n ? `${v.slice(0, n - 1)}…` : v);

/**
 * Appends a hash-chained audit event. Secrets are never written (keys matching REDACT_KEYS are masked).
 *
 * Appends are serialised through the single-row `audit_chain_head` (SELECT … FOR UPDATE inside the caller's
 * transaction, or a short transaction of its own): a concurrent append waits until the earlier one commits or rolls
 * back, so the chain can never fork. An over-long action is shortened and the full text kept in `details`.
 */
export async function audit(db: DB, input: AuditInput) {
  const action = fit(input.action, WIDTH.action)!;
  const details = action === input.action ? input.details : { ...(input.details ?? {}), fullAction: input.action };
  await tx(db, async (c) => {
    const head = await one<{ last_hash: string }>(c, "SELECT last_hash FROM audit_chain_head WHERE id = 1 FOR UPDATE");
    const prev = head?.last_hash ?? GENESIS;
    const e = {
      id: newId("aud"),
      occurred_at: nowIso(),
      actor_id: fit(input.actorId, WIDTH.id40),
      action,
      outcome: input.outcome ?? "SUCCESS",
      entity_type: fit(input.entityType, WIDTH.id40),
      entity_id: fit(input.entityId, WIDTH.id40),
      org_unit_id: fit(input.orgUnitId, WIDTH.id40),
      category: input.category,
      details: redact(details),
    };
    const hash = computeHash(prev, e);
    const r = await run(
      c,
      `INSERT INTO audit_events (id, occurred_at, actor_id, action, outcome, entity_type, entity_id, org_unit_id, category, details, prev_hash, hash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      e.id, e.occurred_at, e.actor_id, e.action, e.outcome, e.entity_type, e.entity_id, e.org_unit_id, e.category, e.details, prev, hash,
    );
    if (head) await run(c, "UPDATE audit_chain_head SET last_hash = ?, last_seq = ? WHERE id = 1", hash, r.insertId);
    else await run(c, "INSERT INTO audit_chain_head (id, last_hash, last_seq) VALUES (1, ?, ?)", hash, r.insertId);
  });
}

/** Recomputes the chain; returns the first broken sequence number, if any. */
export async function verifyAuditChain(db: DB): Promise<{ ok: boolean; checked: number; brokenAt?: number }> {
  const rows = await all<Record<string, unknown> & { seq: number; prev_hash: string; hash: string }>(
    db,
    "SELECT * FROM audit_events ORDER BY seq ASC",
  );
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prev_hash !== prev || computeHash(prev, r) !== r.hash) return { ok: false, checked: rows.length, brokenAt: r.seq };
    prev = r.hash;
  }
  return { ok: true, checked: rows.length };
}
