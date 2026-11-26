/**
 * Authorisation policy engine (RBAC + organisational scope ABAC).
 *
 * Rules (SECURITY_ARCHITECTURE.md §3):
 *  - Deny by default. A permission exists only through an ACTIVE, unexpired,
 *    unrevoked role assignment held by an ACTIVE user.
 *  - Scope is derived exclusively from server-side assignments. Organisation,
 *    role and permission values from the browser are never trusted.
 *  - UNIT coverage = records owned by the assignment's org unit only.
 *  - SUBTREE coverage = the assignment's unit and all descendants (org_unit_closure).
 *  - NATIONAL coverage applies only when the assignment is held at Service HQ;
 *    elsewhere it is evaluated as SUBTREE.
 *  - Approval authority additionally requires an active delegation record.
 */
import type { DB } from "../db/connection";
import { all, one } from "../db/connection";
import { ROLE_BY_CODE, type DashboardKind, type Permission, type RoleCode, DASHBOARD_PRECEDENCE } from "./catalogue";
import { audit } from "./audit";
import { forbidden, nowIso } from "./core";

export const HQ_ID = "org_hq";

export interface Assignment {
  id: string;
  roleCode: RoleCode;
  orgUnitId: string;
  orgUnitName: string;
  orgUnitType: string;
  validTo: string | null;
  /** The assignment unit and all its active descendants (closure table), loaded server-side. */
  subtree: string[];
}

export interface Actor {
  userId: string;
  displayName: string;
  positionTitle: string;
  assignments: Assignment[];
  /** Signed in with a temporary password: only the profile (change password) is reachable. */
  mustChangePassword?: boolean;
  /** Every valid assignment the user holds (the contexts they may switch between). */
  contexts?: Assignment[];
  /** The assignment this request acts under (set when a session context applies). */
  activeAssignmentId?: string | null;
}

/**
 * `context` selects the organisational context for this request:
 *  - undefined: every valid assignment counts (domain jobs, seeding and tests);
 *  - "PRIMARY": the highest-precedence assignment (web sessions with no selection yet);
 *  - an assignment id: that assignment only, re-validated now; if it is no longer valid the primary applies.
 */
export type ContextSelector = undefined | "PRIMARY" | string;

export interface Scope {
  national: boolean;
  units: string[];
}

/** Loads the actor fresh from the database on every request so revocation/expiry take effect immediately. */
export async function loadActor(db: DB, userId: string, context?: ContextSelector): Promise<Actor | null> {
  const user = await one<{ id: string; display_name: string; position_title: string; status: string; must_change_password: number }>(
    db,
    "SELECT id, display_name, position_title, status, must_change_password FROM users WHERE id = ?",
    userId,
  );
  if (!user || user.status !== "ACTIVE") return null;
  const t = nowIso();
  const rows = await all<{ id: string; role_code: RoleCode; org_unit_id: string; name: string; unit_type: string; valid_to: string | null }>(
    db,
    `SELECT a.id, a.role_code, a.org_unit_id, o.name, o.unit_type, a.valid_to
       FROM role_assignments a JOIN org_units o ON o.id = a.org_unit_id
      WHERE a.user_id = ? AND a.revoked_at IS NULL AND a.valid_from <= ?
        AND (a.valid_to IS NULL OR a.valid_to > ?) AND o.status = 'ACTIVE'`,
    userId,
    t,
    t,
  );
  const subtrees = new Map<string, string[]>();
  const roots = [...new Set(rows.map((r) => r.org_unit_id))];
  if (roots.length) {
    const desc = await all<{ ancestor_id: string; descendant_id: string }>(
      db,
      `SELECT c.ancestor_id, c.descendant_id FROM org_unit_closure c JOIN org_units o ON o.id = c.descendant_id
        WHERE c.ancestor_id IN (${roots.map(() => "?").join(",")}) AND o.status = 'ACTIVE' ORDER BY c.depth`,
      ...roots,
    );
    for (const d of desc) subtrees.set(d.ancestor_id, [...(subtrees.get(d.ancestor_id) ?? []), d.descendant_id]);
  }
  const actor: Actor = {
    userId: user.id,
    displayName: user.display_name,
    positionTitle: user.position_title,
    mustChangePassword: user.must_change_password === 1,
    // Only assignments of ACTIVE catalogue roles count; retired roles grant nothing (deny by default).
    assignments: rows.filter((r) => ROLE_BY_CODE[r.role_code]).map((r) => ({
      subtree: subtrees.get(r.org_unit_id) ?? [r.org_unit_id],
      id: r.id,
      roleCode: r.role_code,
      orgUnitId: r.org_unit_id,
      orgUnitName: r.name,
      orgUnitType: r.unit_type,
      validTo: r.valid_to,
    })),
  };
  actor.contexts = actor.assignments;
  if (context === undefined || actor.assignments.length <= 1) {
    actor.activeAssignmentId = actor.assignments.length === 1 ? actor.assignments[0].id : null;
    return actor;
  }
  const chosen = actor.assignments.find((a) => a.id === context) ?? primaryAssignment(actor);
  actor.assignments = chosen ? [chosen] : [];
  actor.activeAssignmentId = chosen?.id ?? null;
  return actor;
}

/** Resolves where `perm` applies for this actor. */
export function scopeFor(actor: Actor, perm: Permission): Scope {
  const units = new Set<string>();
  let national = false;
  for (const a of actor.assignments) {
    const coverage = ROLE_BY_CODE[a.roleCode]?.permissions[perm];
    if (!coverage) continue;
    if (coverage === "NATIONAL" && a.orgUnitId === HQ_ID) national = true;
    units.add(a.orgUnitId);
    if (coverage === "SUBTREE" || coverage === "NATIONAL") for (const u of a.subtree ?? []) units.add(u);
  }
  return { national, units: [...units] };
}

export function hasPermission(actor: Actor, perm: Permission): boolean {
  const s = scopeFor(actor, perm);
  return s.national || s.units.length > 0;
}

/** True when `perm` applies to a record owned by `orgUnitId`. */
export function can(actor: Actor, perm: Permission, orgUnitId: string): boolean {
  const s = scopeFor(actor, perm);
  return s.national || s.units.includes(orgUnitId);
}

/** Throws FORBIDDEN and writes a DENIED audit event when the check fails. */
export async function requirePermission(db: DB, actor: Actor, perm: Permission, orgUnitId?: string, entity?: { type: string; id?: string }) {
  const ok = orgUnitId ? can(actor, perm, orgUnitId) : hasPermission(actor, perm);
  if (!ok) {
    await audit(db, {
      actorId: actor.userId,
      action: `authz.denied:${perm}`,
      outcome: "DENIED",
      category: "SECURITY",
      entityType: entity?.type,
      entityId: entity?.id,
      orgUnitId: orgUnitId ?? null,
    });
    throw forbidden();
  }
}

/** SQL fragment restricting `column` to the actor's scope for `perm`. Always parameterised. */
export function scopeSql(actor: Actor, perm: Permission, column: string): { sql: string; params: string[] } {
  const s = scopeFor(actor, perm);
  if (s.national) return { sql: "1=1", params: [] };
  if (s.units.length === 0) return { sql: "1=0", params: [] };
  return { sql: `${column} IN (${s.units.map(() => "?").join(",")})`, params: s.units };
}

export type DelegationDomain = "ADMIN_REQUEST" | "MAINTENANCE" | "ORG_CHANGE" | "MANPOWER" | "ASSIGNMENT" | "STORES";

export async function hasDelegation(db: DB, actor: Actor, domain: DelegationDomain, orgUnitId: string, categoryCode?: string | null): Promise<boolean> {
  const t = nowIso();
  const row = await one(
    db,
    `SELECT id FROM delegations
      WHERE user_id = ? AND domain = ? AND org_unit_id = ? AND revoked_at IS NULL
        AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)
        AND (category_code IS NULL OR category_code = ?)
      LIMIT 1`,
    actor.userId,
    domain,
    orgUnitId,
    t,
    t,
    categoryCode ?? "",
  );
  return !!row;
}

/**
 * Approval authority = an active delegation for (domain, org, category)
 * AND an active BUSINESS-category role assignment at that same org unit.
 * Technical, security, audit and functional roles can never approve, even
 * if a delegation were recorded in error.
 */
export async function canApprove(db: DB, actor: Actor, domain: DelegationDomain, orgUnitId: string, categoryCode?: string | null): Promise<boolean> {
  const business = actor.assignments.some((a) => a.orgUnitId === orgUnitId && ROLE_BY_CODE[a.roleCode]?.category === "BUSINESS");
  return business && await hasDelegation(db, actor, domain, orgUnitId, categoryCode);
}

/**
 * Hierarchical approval authority for the personnel modules: an active delegation for
 * `domain` held at `orgUnitId` or one of its ancestors, AND a BUSINESS-category role
 * assignment at that same delegating unit. Returns the delegating unit, or null.
 * Rank never confers authority; technical/security/audit roles never approve.
 */
export async function approvalUnitFor(db: DB, actor: Actor, domain: DelegationDomain, orgUnitId: string): Promise<string | null> {
  const business = new Set(actor.assignments.filter((a) => ROLE_BY_CODE[a.roleCode]?.category === "BUSINESS").map((a) => a.orgUnitId));
  if (!business.size) return null;
  const t = nowIso();
  const rows = await all<{ org_unit_id: string }>(
    db,
    `SELECT d.org_unit_id FROM delegations d JOIN org_unit_closure c ON c.ancestor_id = d.org_unit_id AND c.descendant_id = ?
      WHERE d.user_id = ? AND d.domain = ? AND d.revoked_at IS NULL AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?)
      ORDER BY c.depth`,
    orgUnitId, actor.userId, domain, t, t,
  );
  return rows.find((r) => business.has(r.org_unit_id))?.org_unit_id ?? null;
}

/** Units the actor may act on for `perm` (expanded); `null` means national. */
export function unitsFor(actor: Actor, perm: Permission): string[] | null {
  const s = scopeFor(actor, perm);
  return s.national ? null : s.units;
}

export function primaryRole(actor: Actor): RoleCode | null {
  for (const code of DASHBOARD_PRECEDENCE) if (actor.assignments.some((a) => a.roleCode === code)) return code;
  return null;
}

export function dashboardKind(actor: Actor): DashboardKind | null {
  const r = primaryRole(actor);
  return r ? ROLE_BY_CODE[r].dashboard : null;
}

export function primaryAssignment(actor: Actor): Assignment | null {
  const r = primaryRole(actor);
  return actor.assignments.find((a) => a.roleCode === r) ?? null;
}
