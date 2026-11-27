import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all } from "@/server/db/connection";
import { getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { registrableUnits } from "@/server/domain/correspondence";
import { registerCorrespondenceAction } from "@/server/actions/admin-records";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Register correspondence" };

export default async function NewCorrespondencePage() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "correspondence.register")) return <AccessDenied what="correspondence registration" />;
  const db = getDb();
  const units = await registrableUnits(db, actor);
  // Internal counterparts: any active organisation (names are not sensitive); the record itself stays in the registering unit's scope.
  const orgs = await all<{ value: string; label: string }>(db, "SELECT id AS value, name AS label FROM org_units WHERE status = 'ACTIVE' ORDER BY name LIMIT 1000");
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/correspondence" className="text-zp-blue hover:underline">← Correspondence register</Link></p>
      <PageHeader eyebrow="Module 17 · Administrative correspondence" title="Register correspondence" description="Record the details of an administrative letter or memo. A reference (CORR-year-number) is generated. Documents can be attached as PDF after registering." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ActionForm action={registerCorrespondenceAction}>
            <Select label="Registering organisation" name="orgUnitId" required options={units} defaultValue={units[0]?.value} />
            <Select label="Direction" name="direction" required options={[{ value: "INCOMING", label: "Incoming (received)" }, { value: "OUTGOING", label: "Outgoing (dispatched)" }]} defaultValue="INCOMING" />
            <TextField label="Subject" name="subject" required maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Internal organisation (from / to)" name="counterpartOrgId" options={orgs} placeholder="— Not an internal unit —" hint="Choose a ZPS organisation, or name an external body below." />
              <TextField label="External body (from / to)" name="counterpartName" maxLength={160} placeholder="e.g. Ministry registry" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Their reference (optional)" name="letterReference" maxLength={80} />
              <TextField label="Letter date (optional)" name="letterDate" type="date" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Register date" name="registerDate" type="date" required defaultValue={today()} />
              <TextField label="Follow-up date (optional)" name="followUpDate" type="date" />
            </div>
            <Select label="Handling" name="classification" required options={[{ value: "UNCLASSIFIED", label: "Unclassified" }, { value: "RESTRICTED", label: "Restricted (managers, creator and assignee only)" }]} defaultValue="UNCLASSIFIED" />
            <TextArea label="Summary (optional)" name="summary" rows={3} maxLength={1000} />
            <Submit>Register</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-3">
          <Notice tone="warn">Administrative correspondence only. Do not register intelligence, investigation, informant, firearms or operational correspondence; text is checked for excluded terms. Classified material above Restricted is not accepted.</Notice>
          <Notice tone="info">A letter already registered with the same reference by this organisation is refused as a duplicate.</Notice>
        </div>
      </div>
    </>
  );
}
