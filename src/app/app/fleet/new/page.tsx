import { identifierHint, identifierRule } from "@/server/lib/identifiers";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { scopeFor } from "@/server/domain/policy";
import { createVehicleAction } from "@/server/actions/fleet";
import { AccessDenied, Card, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Add vehicle record" };

export default async function NewVehicle() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "fleet.manage")) return <AccessDenied what="fleet record creation" />;
  const units = scopeFor(actor, "fleet.manage").units;
  const orgs = [...new Map(actor.assignments.filter((a) => units.includes(a.orgUnitId)).map((a) => [a.orgUnitId, { value: a.orgUnitId, label: a.orgUnitName }])).values()];
  return (
    <>
      <PageHeader eyebrow="M04 · Fleet" title="Add vehicle record" description={identifierRule("registration").synthetic ? "Administrative fields only. This environment accepts synthetic references only; real registrations are refused." : "Administrative fields only: no location, movement or tracking data."} />
      <Card className="max-w-3xl">
        <ActionForm action={createVehicleAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Fleet reference" name="fleetRef" required placeholder={identifierRule("fleetRef").synthetic ? "SYN-FLT-0000" : undefined} hint={identifierHint("fleetRef")} />
            <TextField label="Registration reference" name="registrationRef" required placeholder={identifierRule("registration").synthetic ? "SYN-REG-ABC1" : undefined} hint={identifierHint("registration")} />
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
