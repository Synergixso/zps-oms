/**
 * Production reference baseline (DEC-069). Runs INSTEAD of the synthetic seed when ZPS_ENVIRONMENT=production.
 *
 * Inserts only what the application needs to be administrable and that is not demonstration data:
 *  - the national tenant and the Service Headquarters unit (the root of every scope);
 *  - the organisation type rules (which unit types may sit under which);
 *  - request categories, their provisional routing, asset categories and report definitions (catalogues that
 *    live in code); store categories, ranks, dispositions, workflows and settings come from the migrations.
 * No users, personnel, provincial or district units, vehicles, assets or delegations: the organisation structure
 * is created by administrators from the approved establishment, and the first account through /setup.
 * Idempotent (INSERT IGNORE), so re-running it never changes existing records.
 */
import type { DB } from "./connection";
import { run } from "./connection";
import { HQ_NAME } from "./constants";
import { ASSET_CATEGORIES, REQUEST_CATEGORIES } from "../domain/catalogue";
import { HQ_ID } from "../domain/policy";
import { rebuildClosure } from "../domain/org";
import { REPORTS } from "../domain/reports";
import { TENANTS, TYPE_RULES } from "./seed";

export async function seedReferenceBaseline(db: DB) {
  const t = new Date().toISOString();
  const today = t.slice(0, 10);
  const [nid, ncode, nname] = TENANTS.find(([, , , type]) => type === "NATIONAL")!;
  await run(db, "INSERT IGNORE INTO tenants (id, code, name, tenant_type, parent_tenant_id, status, created_at) VALUES (?,?,?, 'NATIONAL', NULL, 'ACTIVE', ?)", nid, ncode, nname, t);
  for (const [p, c] of TYPE_RULES) await run(db, "INSERT IGNORE INTO org_type_rules (parent_type, child_type) VALUES (?,?)", p, c);
  await run(db, `INSERT IGNORE INTO org_units (id, tenant_id, code, name, short_name, unit_type, branch, status, effective_from, validation_note, created_at)
                 VALUES (?,?,?,?,?, 'SERVICE_HQ', 'HQ', 'ACTIVE', ?, ?, ?)`,
    HQ_ID, nid, "HQ-DIGOPS", HQ_NAME, "DIG Operations HQ", today, "Root scope for national administration. Further units are created from the approved establishment.", t);
  await rebuildClosure(db);
  for (const c of REQUEST_CATEGORIES) await run(db, "INSERT IGNORE INTO request_categories (code, name, description) VALUES (?,?,?)", c.code, c.name, c.description);
  for (const c of REQUEST_CATEGORIES) {
    const steps = c.code === "ADMIN_RETURN"
      ? [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }, { level: 2, approverScope: "HQ", label: "National HQ approval" }]
      : [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }];
    await run(db, "INSERT IGNORE INTO workflow_definitions (id, category_code, version, approval_steps, status, note, created_at) VALUES (?,?,1,?, 'ACTIVE', ?, ?)",
      `wf_${c.code.toLowerCase()}_v1`, c.code, JSON.stringify(steps), "Provisional routing pending the Service's approved delegation matrix (DEC-008).", t);
  }
  for (const c of ASSET_CATEGORIES) await run(db, "INSERT IGNORE INTO asset_categories (code, name, allowed) VALUES (?,?,1)", c.code, c.name);
  for (const r of REPORTS) {
    await run(db, "INSERT IGNORE INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
      r.code, r.name, r.description, "report.view", JSON.stringify(r.fields), "Report owner to be nominated by the Service (DEC-012).");
  }
  await run(db, "INSERT IGNORE INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
    "AUDIT_EVIDENCE", "Audit evidence export", "Filtered audit events for authorised audit evidence.", "audit.export",
    JSON.stringify(["seq", "occurred_at", "actor_name", "action", "outcome", "category", "entity_type", "entity_id", "org_name", "details", "hash"]), "Internal Audit (to be confirmed).");
  const setting = (k: string, v: string, d: string) => run(db, "INSERT IGNORE INTO app_settings (`key`, value, description) VALUES (?,?,?)", k, v, d);
  await setting("maintenance.approval_threshold_zmw", "5000", "Threshold above which maintenance needs delegated approval (provisional; to be set by the Service).");
  await setting("request.sla_days", "10", "Days after submission before a request is flagged overdue (provisional).");
  await setting("integrations.external_notifications", "DISABLED", "Email/SMS/WhatsApp providers are disabled until approved (DEC-013).");
}
