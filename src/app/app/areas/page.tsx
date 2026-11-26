import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can, hasPermission } from "@/server/domain/policy";
import { listAreas } from "@/server/domain/assignments";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { areaStatusAction, createAreaAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Operational areas" };

export default async function AreasPage() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "area.view"))) return <AccessDenied what="operational areas" />;
  const db = getDb();
  const areas = await listAreas(db, actor, { includeInactive: true });
  const manage = hasPermission(actor, "area.manage");
  const units = manage ? await scopedUnits(db, actor, "area.manage") : [];
  return (
    <>
      <PageHeader eyebrow="Assignment administration" title="Operational areas" description="Approved administrative duty areas to which officers can be assigned. These are register entries, not maps or locations." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`${areas.length} area${areas.length === 1 ? "" : "s"}`} className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Code", "Name", "Responsible unit", "Current assignments", "Status", ""]}>
            {areas.map((a) => (
              <tr key={a.id}>
                <td className={`${td} font-mono text-xs`}>{a.code}</td>
                <td className={td}><span className="font-semibold">{a.name}</span>{a.description && <span className="block text-xs text-muted">{a.description}</span>}</td>
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
