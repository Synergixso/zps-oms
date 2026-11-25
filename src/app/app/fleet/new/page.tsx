import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { scopeFor } from "@/server/domain/policy";
import { createVehicleAction } from "@/server/actions/fleet";
import { AccessDenied, Card, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Add vehicle record" };

export default async function NewVehicle() {
  const actor = await requireActor();
  if (!pageAllowed(actor, "fleet.manage")) return <AccessDenied what="fleet record creation" />;
  const units = scopeFor(actor, "fleet.manage").units;
  const orgs = [...new Map(actor.assignments.filter((a) => units.includes(a.orgUnitId)).map((a) => [a.orgUnitId, { value: a.orgUnitId, label: a.orgUnitName }])).values()];
  return (
    <>
      <PageHeader eyebrow="M04 · Fleet" title="Add vehicle record" description="Administrative fields only. Use synthetic references — real registrations are rejected." />
      <Card className="max-w-3xl">
        <ActionForm action={createVehicleAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Fleet reference" name="fleetRef" required placeholder="SYN-FLT-0000" hint="Pattern SYN-FLT-0000" />
            <TextField label="Registration reference" name="registrationRef" required placeholder="SYN-REG-ABC1" hint="Synthetic placeholder only" />
            <TextField label="Make" name="make" required />
            <TextField label="Model" name="model" required />
            <Select label="Vehicle class" name="vehicleClass" required options={["Saloon", "Utility (light)", "Station wagon", "Minibus", "Truck (general)"].map((v) => ({ value: v, label: v }))} />
            <Select label="Custody organisation" name="custodyOrgId" required options={orgs} />
            <TextField label="Next service due" name="nextServiceDue" type="date" />
            <TextField label="Licence expiry" name="licenceExpiry" type="date" />
            <TextField label="Insurance expiry" name="insuranceExpiry" type="date" />
          </div>
          <Submit>Create vehicle record</Submit>
        </ActionForm>
      </Card>
    </>
  );
}
