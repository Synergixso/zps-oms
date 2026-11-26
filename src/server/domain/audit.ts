import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
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

/** Appends a hash-chained audit event. Secrets are never written (keys matching REDACT_KEYS are masked). */
export async function audit(db: DB, input: AuditInput) {
  const prev = (await one<{ hash: string }>(db, "SELECT hash FROM audit_events ORDER BY seq DESC LIMIT 1"))?.hash ?? GENESIS;
  const e = {
    id: newId("aud"),
    occurred_at: nowIso(),
    actor_id: input.actorId,
    action: input.action,
    outcome: input.outcome ?? "SUCCESS",
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    org_unit_id: input.orgUnitId ?? null,
    category: input.category,
    details: redact(input.details),
  };
  const hash = computeHash(prev, e);
  await run(
    db,
    `INSERT INTO audit_events (id, occurred_at, actor_id, action, outcome, entity_type, entity_id, org_unit_id, category, details, prev_hash, hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    e.id, e.occurred_at, e.actor_id, e.action, e.outcome, e.entity_type, e.entity_id, e.org_unit_id, e.category, e.details, prev, hash,
  );
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
