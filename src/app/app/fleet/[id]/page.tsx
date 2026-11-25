import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { SERVICE_TYPES } from "@/server/domain/catalogue";
import { can } from "@/server/domain/policy";
import { getVehicle, listMaintenance, MAINT_LABEL, serviceHistory, VEHICLE_STATUSES, VEHICLE_STATUS_LABEL } from "@/server/domain/fleet";
import { recordServiceAction, updateVehicleAction } from "@/server/actions/fleet";
import { Badge, ButtonLink, Card, DL, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Vehicle" };

export default async function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const v = loadOr404(() => getVehicle(db, actor, id));
  const history = serviceHistory(db, actor, id);
  const maint = can(actor, "maintenance.view", v.custody_org_id) ? listMaintenance(db, actor, { vehicleId: id }) : [];
  const canManage = can(actor, "fleet.manage", v.custody_org_id) && v.status !== "DISPOSED";
  const canRecord = can(actor, "service.record", v.custody_org_id);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/fleet" className="text-zp-blue hover:underline">← Fleet register</Link></p>
      <PageHeader
        eyebrow={`${v.fleet_ref} · ${v.custody_name}`}
        title={`${v.make} ${v.model}`}
        description={<Badge status={v.status} label={VEHICLE_STATUS_LABEL[v.status]} />}
        actions={can(actor, "maintenance.create", v.custody_org_id) && v.status !== "DISPOSED" ? <ButtonLink href={`/app/fleet/maintenance/new?vehicle=${v.id}`} variant="primary">Raise maintenance request</ButtonLink> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Administrative record">
            <DL items={[["Fleet reference", v.fleet_ref], ["Registration reference (synthetic)", v.registration_ref], ["Make / model", `${v.make} ${v.model}`], ["Class", v.vehicle_class], ["Custody organisation", v.custody_name], ["Status", VEHICLE_STATUS_LABEL[v.status]], ["Next service due", fmtDate(v.next_service_due)], ["Licence expiry", fmtDate(v.licence_expiry)], ["Insurance expiry", fmtDate(v.insurance_expiry)], ["Last updated", fmtDate(v.updated_at)]]} />
          </Card>
          <Card title="Service history" subtitle="Recorded servicing and verified maintenance" bodyClass="p-0">
            <Table head={["Date", "Type", "Workshop ref", "Cost ref", "Notes", "Recorded by"]} empty="No service history recorded.">
              {history.map((s) => (
                <tr key={s.id}><td className={`${td} whitespace-nowrap`}>{fmtDate(s.service_date)}</td><td className={td}>{s.service_type}</td><td className={`${td} font-mono text-xs`}>{s.workshop_ref ?? "—"}</td><td className={`${td} font-mono text-xs`}>{s.cost_ref ?? "—"}</td><td className={td}>{s.notes ?? "—"}</td><td className={td}>{s.recorder}</td></tr>
              ))}
            </Table>
          </Card>
          <Card title="Maintenance requests" bodyClass="p-0">
            <Table head={["Reference", "Type", "Stage", "Raised"]} empty="No maintenance requests.">
              {maint.map((m) => (
                <tr key={m.id}><td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/fleet/maintenance/${m.id}`}>{m.reference}</Link></td><td className={td}>{m.service_type}</td><td className={td}><Badge status={m.status} label={MAINT_LABEL[m.status]} /></td><td className={`${td} text-muted`}>{fmtDate(m.created_at)}</td></tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {canManage && (
            <Card title="Update administrative status">
              <ActionForm action={updateVehicleAction}>
                <Hidden name="id" value={v.id} />
                <Select label="Status" name="status" defaultValue={v.status} options={VEHICLE_STATUSES.map((s) => ({ value: s, label: VEHICLE_STATUS_LABEL[s] }))} />
                <TextField label="Next service due" name="nextServiceDue" type="date" defaultValue={v.next_service_due ?? ""} />
                <TextField label="Licence expiry" name="licenceExpiry" type="date" defaultValue={v.licence_expiry ?? ""} />
                <TextField label="Insurance expiry" name="insuranceExpiry" type="date" defaultValue={v.insurance_expiry ?? ""} />
                <Submit variant="secondary">Save</Submit>
              </ActionForm>
            </Card>
          )}
          {canRecord && (
            <Card title="Record service">
              <ActionForm action={recordServiceAction} resetOnSuccess>
                <Hidden name="vehicleId" value={v.id} />
                <TextField label="Service date" name="serviceDate" type="date" required />
                <Select label="Service type" name="serviceType" options={SERVICE_TYPES.map((s) => ({ value: s, label: s }))} />
                <TextField label="Workshop reference" name="workshopRef" maxLength={40} />
                <TextField label="Cost reference" name="costRef" maxLength={40} />
                <TextArea label="Notes" name="notes" rows={2} maxLength={500} />
                <Submit variant="secondary">Add service record</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
