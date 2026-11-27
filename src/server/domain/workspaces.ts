/**
 * Central role → back-office (workspace) configuration for the 31-role catalogue.
 *
 * One architecture, 31 configurations: each role gets its own back-office name, navigation (sections,
 * labels and order), headline figures and quick actions. This is PRESENTATION only — every page and
 * domain function re-checks permission and scope on the server; a link shown here grants nothing, and
 * links are additionally filtered by the actor's permissions before they are rendered.
 */
import type { RoleCode } from "./catalogue";
import { WORKSPACE_CONFIG, type QuickAction, type Workspace } from "./workspace-config";
export type { QuickAction, Workspace, WorkspaceNavGroup } from "./workspace-config";
import { ROLE_BY_CODE } from "./catalogue";
import { type Actor, hasPermission, primaryAssignment } from "./policy";

export const WORKSPACES = Object.fromEntries(WORKSPACE_CONFIG.map((w) => [w.role, { ...w, backOffice: ROLE_BY_CODE[w.role].backOffice }])) as Record<RoleCode, Workspace>;

/** The workspace of the actor's active (or primary) context. */
export function workspaceFor(actor: Actor): Workspace | null {
  const a = actor.assignments.length === 1 ? actor.assignments[0] : primaryAssignment(actor);
  return a ? WORKSPACES[a.roleCode] ?? null : null;
}

export function quickActionsFor(actor: Actor): QuickAction[] {
  const ws = workspaceFor(actor);
  return (ws?.quick ?? []).filter((q) => q.any.length === 0 || q.any.some((p) => hasPermission(actor, p)));
}
