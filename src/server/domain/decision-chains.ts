/**
 * Configurable approval chains for assignment approval and transfer release (Module 09; known issue 3).
 *
 * Same rules as manpower chains (DEC-045):
 *  - versioned per domain; publishing a new version retires the previous one; a matter keeps the version it was
 *    pinned to when raised (or, for older records, the version active when first decided);
 *  - each level names its authority: the RESPONSIBLE_UNIT (responsible / releasing unit of the record) or HQ;
 *  - each level needs an ASSIGNMENT delegation at that unit or an ancestor plus a BUSINESS role there;
 *  - the originator never decides, and no officer decides two levels of one matter;
 *  - publishing needs workflow.configure (HQ) and is audited. At most three levels.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { invalid, newId, nowIso } from "./core";
import { type Actor, approvalUnitFor, HQ_ID, requirePermission } from "./policy";

export const DECISION_DOMAINS = { ASSIGNMENT: "Assignment approval", TRANSFER_RELEASE: "Transfer release (releasing side)" } as const;
export type DecisionDomain = keyof typeof DECISION_DOMAINS;
export interface DecisionStep { level: number; authority: "RESPONSIBLE_UNIT" | "HQ"; label: string }
export interface DecisionWorkflow { id: string; domain: DecisionDomain; version: number; steps: DecisionStep[]; status: string; note: string | null; created_at: string; created_by_name: string | null }

const DEFAULT_STEP: DecisionStep = { level: 1, authority: "RESPONSIBLE_UNIT", label: "Delegated authority of the responsible unit" };
/** approval_actions entity type for each domain. */
const ENTITY: Record<DecisionDomain, string> = { ASSIGNMENT: "assignment", TRANSFER_RELEASE: "transfer" };
/** Actions that (re)start a decision cycle; earlier-level approvals are counted from the last one. */
const START: Record<DecisionDomain, string[]> = { ASSIGNMENT: ["PROPOSE", "PROPOSED"], TRANSFER_RELEASE: ["INITIATE", "INITIATED"] };

export async function listDecisionWorkflows(db: DB): Promise<DecisionWorkflow[]> {
  const rows = await all<Omit<DecisionWorkflow, "steps"> & { steps: string }>(db,
    "SELECT w.*, u.display_name AS created_by_name FROM decision_workflows w LEFT JOIN users u ON u.id = w.created_by ORDER BY w.domain, w.version DESC");
  return rows.map((r) => ({ ...r, steps: JSON.parse(r.steps) as DecisionStep[] }));
}

export async function activeChainId(db: DB, domain: DecisionDomain): Promise<string | null> {
  return (await one<{ id: string }>(db, "SELECT id FROM decision_workflows WHERE domain = ? AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1", domain))?.id ?? null;
}

export async function chainFor(db: DB, domain: DecisionDomain, workflowId: string | null): Promise<{ id: string | null; steps: DecisionStep[] }> {
  const row = workflowId
    ? await one<{ id: string; steps: string }>(db, "SELECT id, steps FROM decision_workflows WHERE id = ?", workflowId)
    : await one<{ id: string; steps: string }>(db, "SELECT id, steps FROM decision_workflows WHERE domain = ? AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1", domain);
  return row ? { id: row.id, steps: JSON.parse(row.steps) as DecisionStep[] } : { id: null, steps: [DEFAULT_STEP] };
}

export interface ChainState { domain: DecisionDomain; workflowId: string | null; level: number; baseUnitId: string; entityId: string; originatorId: string }

/** The current step, the unit whose delegation decides it, and the number of levels. */
export async function currentStep(db: DB, s: ChainState) {
  const chain = await chainFor(db, s.domain, s.workflowId);
  const step = chain.steps[Math.min(Math.max(s.level, 1), chain.steps.length) - 1] ?? chain.steps[0];
  return { chainId: chain.id, step, total: chain.steps.length, unitId: step.authority === "HQ" ? HQ_ID : s.baseUnitId };
}

/** The delegating unit through which the actor may decide the current level, or null. */
export async function levelApprover(db: DB, actor: Actor, s: ChainState): Promise<string | null> {
  if (s.originatorId === actor.userId) return null;
  const { unitId } = await currentStep(db, s);
  const unit = await approvalUnitFor(db, actor, "ASSIGNMENT", unitId);
  if (!unit) return null;
  const entity = ENTITY[s.domain];
  const starts = START[s.domain].map(() => "?").join(",");
  const earlier = await one(db,
    `SELECT 1 AS x FROM approval_actions WHERE entity_type = ? AND entity_id = ? AND actor_id = ? AND action LIKE '%APPROVE%\\_L%'
        AND seq > COALESCE((SELECT MAX(seq) FROM approval_actions WHERE entity_type = ? AND entity_id = ? AND action IN (${starts})), 0)`,
    entity, s.entityId, actor.userId, entity, s.entityId, ...START[s.domain]);
  return earlier ? null : unit;
}

const STEP = z.object({ authority: z.enum(["RESPONSIBLE_UNIT", "HQ"]), label: z.string().trim().min(3).max(120) });

export async function publishDecisionWorkflow(db: DB, actor: Actor, domain: string, steps: Array<{ authority: string; label: string }>, note: string) {
  await requirePermission(db, actor, "workflow.configure", HQ_ID, { type: "workflow" });
  if (!(domain in DECISION_DOMAINS)) throw invalid("Unknown decision domain.");
  const parsed = z.array(STEP).min(1, "Define at least one approval level.").max(3, "At most three approval levels.").parse(steps);
  if (note.trim().length < 5) throw invalid("Record the instruction or reason for the change.");
  const id = newId("dwf");
  await tx(db, async (db) => {
    const v = Number((await one<{ v: number }>(db, "SELECT COALESCE(MAX(version), 0) AS v FROM decision_workflows WHERE domain = ?", domain))?.v ?? 0) + 1;
    await run(db, "UPDATE decision_workflows SET status = 'RETIRED' WHERE domain = ? AND status = 'ACTIVE'", domain);
    await run(db, "INSERT INTO decision_workflows (id, domain, version, steps, status, note, created_by, created_at) VALUES (?,?,?,?, 'ACTIVE', ?,?,?)",
      id, domain, v, JSON.stringify(parsed.map((st, i) => ({ level: i + 1, ...st }))), note.trim(), actor.userId, nowIso());
    await audit(db, { actorId: actor.userId, action: "workflow.decision.publish", category: "CONFIG", entityType: "workflow", entityId: id, details: { domain, version: v, steps: parsed, note: note.trim() } });
  });
  return id;
}
