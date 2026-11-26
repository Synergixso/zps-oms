import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { REQUEST_CATEGORIES } from "@/server/domain/catalogue";
import { scopeFor } from "@/server/domain/policy";
import { createRequestAction } from "@/server/actions/requests";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "New administrative request" };

export default async function NewRequest() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "request.create")) return <AccessDenied what="request creation" />;
  const units = scopeFor(actor, "request.create").units;
  const orgOptions = actor.assignments.filter((a) => units.includes(a.orgUnitId)).map((a) => ({ value: a.orgUnitId, label: a.orgUnitName }));
  const uniqueOrgs = [...new Map(orgOptions.map((o) => [o.value, o])).values()];
  return (
    <>
      <PageHeader eyebrow="M03 · Administrative requests" title="New administrative request" description="Approved non-operational categories only. The originating organisation is limited to your own authorised scope." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Request details" className="lg:col-span-2">
          <ActionForm action={createRequestAction}>
            <Select label="Category" name="categoryCode" required placeholder="Select an approved category" options={REQUEST_CATEGORIES.map((c) => ({ value: c.code, label: c.name }))} />
            {uniqueOrgs.length > 1 ? (
              <Select label="Originating organisation" name="originOrgId" required options={uniqueOrgs} />
            ) : (
              <p className="text-sm"><span className="text-xs font-semibold text-muted">Originating organisation</span><br />{uniqueOrgs[0]?.label}</p>
            )}
            <TextField label="Subject" name="title" required maxLength={120} hint="5–120 characters. Do not include personal or operational information." />
            <TextArea label="Supporting information" name="details" required rows={6} maxLength={2000} hint="Administrative justification only. Do not include personal data, tactical, intelligence or case information." />
            <Select label="Priority" name="priority" options={[{ value: "ROUTINE", label: "Routine" }, { value: "PRIORITY", label: "Priority (administrative)" }]} defaultValue="ROUTINE" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Submit name="intent" value="submit">Save and submit for review</Submit>
              <Submit name="intent" value="draft" variant="secondary">Save as draft</Submit>
            </div>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Notice tone="info" title="What happens next">
            Submitted requests are assigned for review by an authorised processor, then decided by a user holding a recorded delegation for the category and organisation. Some
            categories route to a second (HQ) approval level.
          </Notice>
          <Notice tone="warn" title="Synthetic data only">Do not enter real names, service numbers, locations or operational details in this prototype.</Notice>
        </div>
      </div>
    </>
  );
}
