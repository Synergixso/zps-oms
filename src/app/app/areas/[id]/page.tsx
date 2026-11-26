import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { ASSIGNMENT_STATUS_LABEL, areaDetail } from "@/server/domain/assignments";
import { areaStatusAction, updateAreaAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, DL, PageHeader, Stat, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Operational area" };

export default async function AreaProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "area.view"))) return <AccessDenied what="operational areas" />;
  const { area, stats, history, canSeeAssignments } = await loadOr404(() => areaDetail(getDb(), actor, id));
  const manage = can(actor, "area.manage", area.responsible_unit_id);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/areas" className="text-zp-blue hover:underline">← Operational areas</Link></p>
      <PageHeader eyebrow={`${area.code} · administrative duty-area record`} title={area.name} description={<Badge status={area.status} />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Current assignments" value={Number(stats?.current ?? 0)} href={canSeeAssignments ? `/app/assignments?area=${area.id}` : undefined} />
        <Stat label="Active now" value={area.active_count} />
        <Stat label="Closed assignments" value={Number(stats?.closed ?? 0)} />
        <Stat label="Transferred in" value={Number(stats?.transferred_in ?? 0)} />
        <Stat label="Transferred out" value={Number(stats?.transferred_out ?? 0)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Area record">
            <DL items={[["Code", area.code], ["Name", area.name], ["Responsible unit", area.unit_name], ["Status", area.status.toLowerCase()], ["Registered", fmtDate(area.created_at)], ["Description", area.description ?? "—"]]} />
          </Card>
          <Card title="Assignment history at this area" subtitle={canSeeAssignments ? "Latest 200 assignments" : "You are not authorised to view assignments for this area"} bodyClass="p-0">
            <Table head={["Reference", "Officer", "Commenced", "Ended", "Status"]} empty={canSeeAssignments ? "No assignments recorded." : "—"}>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className={`${td} font-mono text-xs`}><Link href={`/app/assignments/${h.id}`} className="text-zp-blue hover:underline">{h.reference}</Link></td>
                  <td className={td}>{h.rank_name} {h.full_name}</td>
                  <td className={td}>{fmtDate(h.commencement_date)}</td>
                  <td className={td}>{fmtDate(h.ended_on)}</td>
                  <td className={td}><Badge status={h.status} label={`${ASSIGNMENT_STATUS_LABEL[h.status] ?? h.status}${h.close_reason ? ` (${h.close_reason.toLowerCase()})` : ""}`} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        {manage && (
          <div className="space-y-4">
            <Card title="Edit area details" subtitle="The code and responsible unit are fixed">
              <ActionForm action={updateAreaAction}>
                <Hidden name="id" value={area.id} />
                <TextField label="Name" name="name" defaultValue={area.name} required />
                <TextArea label="Administrative description" name="description" defaultValue={area.description ?? ""} rows={3} hint="No coordinates, routes, patrol or position details." />
                <TextField label="Reason for change" name="reason" required />
                <Submit>Save changes</Submit>
              </ActionForm>
            </Card>
            <Card title={area.status === "ACTIVE" ? "Deactivate area" : "Reactivate area"} subtitle={area.status === "ACTIVE" ? "Refused while the area has current assignments" : undefined}>
              <ActionForm action={areaStatusAction}>
                <Hidden name="id" value={area.id} />
                <Submit name="status" value={area.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} variant={area.status === "ACTIVE" ? "danger" : "primary"} confirm={area.status === "ACTIVE" ? "Deactivate this operational area?" : undefined}>{area.status === "ACTIVE" ? "Deactivate" : "Reactivate"}</Submit>
              </ActionForm>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
