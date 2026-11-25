import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { SERVICE_TYPES } from "@/server/domain/catalogue";
import { can } from "@/server/domain/policy";
import { approvalThreshold, listVehicles } from "@/server/domain/fleet";
import { createMaintenanceAction } from "@/server/actions/fleet";
import { AccessDenied, Card, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "New maintenance request" };

export default async function NewMaintenance({ searchParams }: { searchParams: Promise<{ vehicle?: string }> }) {
  const actor = await requireActor();
  if (!pageAllowed(actor, "maintenance.create")) return <AccessDenied what="maintenance requests" />;
  const { vehicle } = await searchParams;
  const db = getDb();
  const vehicles = listVehicles(db, actor).filter((v) => v.status !== "DISPOSED" && can(actor, "maintenance.create", v.custody_org_id));
  return (
    <>
      <PageHeader eyebrow="M04 · Fleet maintenance" title="New maintenance request" description={`Requests with an estimated cost of ZMW ${approvalThreshold(db).toLocaleString()} or more require delegated approval (provisional threshold).`} />
      <Card className="max-w-3xl">
        <ActionForm action={createMaintenanceAction}>
          <Select label="Vehicle" name="vehicleId" required defaultValue={vehicle} placeholder="Select a vehicle in your scope" options={vehicles.map((v) => ({ value: v.id, label: `${v.fleet_ref} · ${v.make} ${v.model} · ${v.custody_name}` }))} />
          <Select label="Service type" name="serviceType" required options={SERVICE_TYPES.map((s) => ({ value: s, label: s }))} />
          <TextArea label="Description of need" name="description" required rows={4} maxLength={1000} hint="Mechanical/administrative description only. No mission, route or deployment information." />
          <TextField label="Estimated cost (ZMW, synthetic)" name="estimatedCost" type="number" hint="Optional. Whole numbers." />
          <Submit>Submit maintenance request</Submit>
        </ActionForm>
      </Card>
    </>
  );
}
