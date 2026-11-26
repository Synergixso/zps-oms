import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can, hasPermission } from "@/server/domain/policy";
import { listAreas } from "@/server/domain/assignments";
import { all } from "@/server/db/connection";
import type { DB } from "@/server/db/connection";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { areaStatusAction, createAreaAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

/** Top-level division or formation that each responsible unit belongs to (for the province filter). */
async function provinceOf(db: DB, units: string[]): Promise<Record<string, string>> {
  if (!units.length) return {};
  const rows = await all<{ descendant_id: string; name: string }>(db,
    `SELECT c.descendant_id, o.name FROM org_unit_closure c JOIN org_units o ON o.id = c.ancestor_id
      WHERE c.descendant_id IN (${units.map(() => "?").join(",")}) AND o.unit_type IN ('PROVINCIAL_DIVISION','FORMATION','SERVICE_HQ')
      ORDER BY o.unit_type = 'SERVICE_HQ', c.depth DESC`, ...units);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.descendant_id] ??= r.name;
  return out;
}

export const metadata = { title: "Operational areas" };

export default async function AreasPage({ searchParams }: { searchParams: Promise<{ province?: string; status?: string }> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "area.view"))) return <AccessDenied what="operational areas" />;
  const db = getDb();
  const sp = await searchParams;
  const all_ = await listAreas(db, actor, { includeInactive: true });
  const provinces = await provinceOf(db, all_.map((a) => a.responsible_unit_id));
  const provinceNames = [...new Set(Object.values(provinces))].sort();
  const areas = all_.filter((a) => (!sp.province || provinces[a.responsible_unit_id] === sp.province) && (!sp.status || a.status === sp.status));
  const manage = hasPermission(actor, "area.manage");
  const units = manage ? await scopedUnits(db, actor, "area.manage") : [];
  return (
    <>
      <PageHeader eyebrow="Assignment administration" title="Operational areas" description="Approved administrative duty areas to which officers can be assigned. These are register entries, not maps or locations." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`${areas.length} area${areas.length === 1 ? "" : "s"}`} className="lg:col-span-2" bodyClass="p-0"
          action={<form method="get" className="flex min-w-0 max-w-full flex-wrap gap-1.5 text-xs"><select name="province" defaultValue={sp.province ?? ""} aria-label="Province" className="rounded border border-line-2 px-2 py-1"><option value="">All provinces / formations</option>{provinceNames.map((p) => <option key={p} value={p}>{p}</option>)}</select><select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="rounded border border-line-2 px-2 py-1"><option value="">Active and inactive</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><button className="rounded border border-line-2 px-2 font-semibold">Filter</button></form>}>
          <Table head={["Code", "Name", "Responsible unit", "Current assignments", "Status", ""]}>
            {areas.map((a) => (
              <tr key={a.id}>
                <td className={`${td} font-mono text-xs`}>{a.code}</td>
                <td className={td}><Link href={`/app/areas/${a.id}`} className="font-semibold text-zp-blue hover:underline">{a.name}</Link>{a.description && <span className="block text-xs text-muted">{a.description}</span>}</td>
                <td className={td}>{a.unit_name}</td>
                <td className={td}>{hasPermission(actor, "assignment.view") ? <Link href={`/app/assignments?area=${a.id}`} className="text-zp-blue hover:underline">{a.active_count}</Link> : a.active_count}</td>
                <td className={td}><Badge status={a.status} /></td>
                <td className={td}>
                  {can(actor, "area.manage", a.responsible_unit_id) && (
                    <ActionForm action={areaStatusAction}>
                      <Hidden name="id" value={a.id} />
                      <Submit name="status" value={a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} variant="secondary">{a.status === "ACTIVE" ? "Deactivate" : "Reactivate"}</Submit>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
        {manage ? (
          <Card title="New operational area">
            <ActionForm action={createAreaAction} resetOnSuccess>
              <TextField label="Code" name="code" required placeholder="OA-CB-EXAMPLE" />
              <TextField label="Name" name="name" required placeholder="e.g. Example Mine Operations — Town" />
              <Select label="Responsible unit" name="responsibleUnitId" required placeholder="Select unit" options={unitOptions(units)} />
              <TextArea label="Administrative description" name="description" rows={3} maxLength={300} hint="No coordinates, routes, patrol or position details." />
              <Submit>Create area</Submit>
            </ActionForm>
          </Card>
        ) : (
          <Notice tone="info">Operational areas are maintained by authorised assignment administrators.</Notice>
        )}
      </div>
    </>
  );
}
