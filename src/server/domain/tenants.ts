/**
 * M01 — Tenant management (Platform Super Administrator: tenant provisioning).
 * Tenants are administrative environments. Provisioning shows technical coverage only (unit and record
 * counts); it never exposes personnel records. Moving a formation into its own tenant re-tags the formation's
 * whole subtree and every record those units own, in one transaction, with an audit event.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, invalid, notFound, nowIso } from "./core";
import { type Actor, HQ_ID, requirePermission } from "./policy";

/** Tables whose rows carry tenant_id, with the column naming their owning unit. */
const TENANT_TABLES: Array<[table: string, unitColumn: string]> = [
  ["personnel_records", "home_unit_id"],
  ["operational_areas", "responsible_unit_id"],
  ["manpower_requests", "requesting_unit_id"],
  ["manpower_contributions", "contributing_unit_id"],
  ["personnel_assignments", "responsible_unit_id"],
  ["vehicles", "custody_org_id"],
  ["assets", "custody_org_id"],
  ["admin_requests", "origin_org_id"],
  ["maintenance_requests", "org_unit_id"],
];

export async function listTenants(db: DB, actor: Actor) {
  await requirePermission(db, actor, "tenant.view", HQ_ID);
  return all<{ id: string; code: string; name: string; tenant_type: string; status: string; parent_name: string | null; units: number; root_units: string | null; records: number; created_at: string }>(db,
    `SELECT t.id, t.code, t.name, t.tenant_type, t.status, p.name AS parent_name, t.created_at,
            (SELECT COUNT(*) FROM org_units o WHERE o.tenant_id = t.id AND o.status = 'ACTIVE') AS units,
            (SELECT GROUP_CONCAT(o.name ORDER BY o.name SEPARATOR '; ') FROM org_units o WHERE o.tenant_id = t.id AND o.unit_type IN ('SERVICE_HQ','PROVINCIAL_DIVISION','FORMATION')
               AND NOT EXISTS (SELECT 1 FROM org_relationships r JOIN org_units po ON po.id = r.parent_id WHERE r.child_id = o.id AND r.effective_to IS NULL AND po.tenant_id = t.id)) AS root_units,
            ((SELECT COUNT(*) FROM personnel_records x WHERE x.tenant_id = t.id) + (SELECT COUNT(*) FROM personnel_assignments x WHERE x.tenant_id = t.id)
              + (SELECT COUNT(*) FROM manpower_requests x WHERE x.tenant_id = t.id)) AS records
       FROM tenants t LEFT JOIN tenants p ON p.id = t.parent_tenant_id ORDER BY FIELD(t.tenant_type, 'NATIONAL', 'PROVINCIAL', 'FORMATION'), t.name`);
}

/** National formations that can be given their own tenant (still held by the national tenant). */
export async function movableFormations(db: DB, actor: Actor) {
  await requirePermission(db, actor, "tenant.manage", HQ_ID);
  return all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE unit_type = 'FORMATION' AND tenant_id = 't_zps' AND status = 'ACTIVE' ORDER BY name");
}

export const tenantSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, "Code: 2–20 capital letters, digits or hyphens."),
  name: z.string().trim().min(5).max(120),
  formationId: z.string().min(1, "Select the formation that will form this tenant."),
  reason: z.string().trim().min(10, "Record the approval reference and reason (at least 10 characters)."),
});

export async function provisionFormationTenant(db: DB, actor: Actor, input: z.input<typeof tenantSchema>) {
  await requirePermission(db, actor, "tenant.manage", HQ_ID, { type: "tenant" });
  const d = tenantSchema.parse(input);
  if (await one(db, "SELECT id FROM tenants WHERE code = ?", d.code)) throw conflict("A tenant with this code already exists.");
  const f = await one<{ id: string; tenant_id: string; unit_type: string; status: string }>(db, "SELECT id, tenant_id, unit_type, status FROM org_units WHERE id = ?", d.formationId);
  if (!f || f.unit_type !== "FORMATION" || f.status !== "ACTIVE") throw notFound("Formation not found.");
  if (f.tenant_id !== "t_zps") throw invalid("Only formations held by the national tenant can be moved into a new tenant.");
  const id = `t_${d.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  if (await one(db, "SELECT id FROM tenants WHERE id = ?", id)) throw conflict("Choose a different tenant code.");
  const moved: Record<string, number> = {};
  await tx(db, async (db) => {
    await run(db, "INSERT INTO tenants (id, code, name, tenant_type, parent_tenant_id, status, created_at) VALUES (?,?,?, 'FORMATION', 't_zps', 'ACTIVE', ?)", id, d.code, d.name, nowIso());
    const subtree = `(SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = ?)`;
    moved.org_units = (await run(db, `UPDATE org_units SET tenant_id = ? WHERE id IN ${subtree}`, id, d.formationId)).changes;
    for (const [table, col] of TENANT_TABLES) moved[table] = (await run(db, `UPDATE ${table} SET tenant_id = ? WHERE ${col} IN ${subtree}`, id, d.formationId)).changes;
    await audit(db, { actorId: actor.userId, action: "tenant.provision", category: "CONFIG", entityType: "tenant", entityId: id, orgUnitId: d.formationId, details: { code: d.code, reason: d.reason, moved } });
  });
  return { id, moved };
}
