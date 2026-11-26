/**
 * Role-aware Help centre: explains the signed-in officer's OWN workspace in plain language, derived from the same
 * configuration the server enforces (catalogue, workspace config, delegations). Read-only; reveals nothing about
 * other users beyond who to contact for account support.
 */
import type { DB } from "../db/connection";
import { all } from "../db/connection";
import { ROLE_BY_CODE, type Permission } from "./catalogue";
import { nowIso } from "./core";
import { type Actor, hasPermission, primaryAssignment } from "./policy";
import { workspaceFor } from "./workspaces";
import { NAV_ITEMS } from "@/lib/nav";

/** What each page is for, in one sentence (keyed by route). */
export const PAGE_HELP: Record<string, string> = {
  "/app": "Your dashboard: live figures for your scope, quick actions, recent activity and open tasks.",
  "/app/tasks": "Things waiting for you, created by the system (reminders, overdue items). They close by themselves when the matter is resolved.",
  "/app/approvals": "Every decision waiting for you, across requests, manpower, assignments, transfers and renewals.",
  "/app/personnel": "The personnel register for your scope: register, correct and verify officer records.",
  "/app/manpower": "Manpower requests: raise a requirement, route it to contributing units and follow it to a roster.",
  "/app/manpower/contributions": "Requests for your unit to contribute officers: select eligible officers and submit before the deadline.",
  "/app/rosters": "Approved and finalised personnel lists built from contributions; print, PDF and Excel.",
  "/app/assignments": "The duty-area assignment register: propose, approve, review and renew assignments (minimum tenure applies).",
  "/app/transfers": "Transfers between duty areas: releasing decision, then receiving acceptance.",
  "/app/areas": "Administrative duty areas (never locations or patrol routes).",
  "/app/requests": "Administrative requests: draft, submit and follow them through review and approval.",
  "/app/fleet": "The administrative vehicle register: documentation and service history (no location or movement data).",
  "/app/fleet/maintenance": "Vehicle maintenance requests from validation to workshop, completion and verification.",
  "/app/assets": "General non-sensitive assets: custody, transfers, inspections and stock-takes.",
  "/app/stores": "General stores: stock balances and the ledger of receipts, issues, returns and adjustments.",
  "/app/stores/requisitions": "Stores requisitions: raise one for your unit, decide (if delegated) or issue (store keepers).",
  "/app/reports": "Management reports for your scope: customise columns, save views, export to Excel or CSV, schedule delivery.",
  "/app/messages": "Messages sent through the public Contact page.",
  "/app/org": "The organisation directory and hierarchy.",
  "/app/org/changes": "Proposed structure changes and their approval.",
  "/app/org/tenants": "Administrative environments (tenants) and the units they cover.",
  "/app/admin/users": "User accounts and access. Local administrators see only accounts in their unit and can give account support.",
  "/app/admin/roles": "The role catalogue and what each role may do.",
  "/app/admin/reviews": "Periodic access recertification.",
  "/app/audit": "The tamper-evident audit register.",
  "/app/audit/history": "Record history: workflow, disposition, personnel changes and exports.",
  "/app/security": "Security events, sessions, authentication history and lockouts.",
  "/app/workflows": "Versioned approval chains and workflow definitions.",
  "/app/platform": "System health, automation jobs, backups and restore drills.",
};

const DOMAIN_LABEL: Record<string, string> = {
  ADMIN_REQUEST: "administrative requests", MAINTENANCE: "vehicle maintenance", ORG_CHANGE: "organisation structure changes",
  MANPOWER: "manpower requests and rosters", ASSIGNMENT: "assignments, transfers, exceptions and renewals", STORES: "stores requisitions",
};

export interface HelpCentre {
  role: { name: string; tier: number; no: number; backOffice: string; category: string; unit: string | null; purpose: string; description: string } | null;
  pages: Array<{ section: string; href: string; label: string; help: string }>;
  delegations: Array<{ domain: string; unit: string; ref: string; until: string | null }>;
  limits: string[];
  contexts: number;
  support: Array<{ name: string; role: string; unit: string }>;
}

export async function helpCentre(db: DB, actor: Actor): Promise<HelpCentre> {
  const ws = workspaceFor(actor);
  const pa = actor.assignments.length === 1 ? actor.assignments[0] : primaryAssignment(actor);
  const def = pa ? ROLE_BY_CODE[pa.roleCode] : null;
  const allowed = (any: Permission[]) => any.length === 0 || any.some((p) => hasPermission(actor, p));
  const pages = (ws?.nav ?? []).flatMap((g) => g.items.map((h) => NAV_ITEMS[h]).filter((i) => i && allowed(i.any)).map((i) => ({ section: g.label, href: i.href, label: i.label, help: PAGE_HELP[i.href] ?? "" })));
  const t = nowIso();
  const delegations = await all<{ domain: string; unit: string; ref: string; until: string | null }>(db,
    `SELECT d.domain, o.name AS unit, d.approval_ref AS ref, d.valid_to AS until FROM delegations d JOIN org_units o ON o.id = d.org_unit_id
      WHERE d.user_id = ? AND d.revoked_at IS NULL AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?) ORDER BY d.domain, o.name`, actor.userId, t, t);
  const limits: string[] = [];
  if (def?.category === "TECHNICAL") limits.push("This is a technical role: it has no access to personnel records, assignments, stores or requests, and can never approve business matters.");
  if (def?.category === "FUNCTIONAL") limits.push("This is a functional role: it administers its own function and cannot approve business matters.");
  if (def?.code === "PRINCIPAL_ARMOURER") limits.push("No firearms, ammunition or armoury records exist in ZPS-OMS; this workspace covers approved non-sensitive administrative functions only.");
  if (def?.category === "BUSINESS" && !delegations.length) limits.push("You hold no delegated approval authority, so you can prepare and recommend but not approve. Authority comes only from a recorded delegation, never from rank.");
  limits.push("You can never approve or issue something you raised yourself (separation of duties).");
  limits.push("Records outside your organisational scope are not shown; opening one directly returns “not found”.");
  // Account support: local technical administrators above the active unit, else HQ Tech.
  const support = pa ? await all<{ name: string; role: string; unit: string }>(db,
    `SELECT DISTINCT u.display_name AS name, a.role_code AS role, o.name AS unit
       FROM role_assignments a JOIN users u ON u.id = a.user_id AND u.status = 'ACTIVE' JOIN org_units o ON o.id = a.org_unit_id
       JOIN org_unit_closure c ON c.ancestor_id = a.org_unit_id AND c.descendant_id = ?
      WHERE a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?) AND a.user_id <> ?
        AND a.role_code IN ('STATION_TECH_ADMIN','DISTRICT_TECH_ADMIN','UNIT_TECH_ADMIN','HQ_TECH_ADMIN')
      ORDER BY c.depth LIMIT 4`, pa.orgUnitId, t, actor.userId) : [];
  return {
    role: def && ws ? { name: def.name, tier: def.tier, no: def.no, backOffice: ws.backOffice, category: def.category, unit: pa?.orgUnitName ?? null, purpose: ws.purpose, description: def.description } : null,
    pages,
    delegations: delegations.map((d) => ({ ...d, domain: DOMAIN_LABEL[d.domain] ?? d.domain })),
    limits,
    contexts: actor.contexts?.length ?? actor.assignments.length,
    support: support.map((s) => ({ ...s, role: ROLE_BY_CODE[s.role as keyof typeof ROLE_BY_CODE]?.name ?? s.role })),
  };
}
