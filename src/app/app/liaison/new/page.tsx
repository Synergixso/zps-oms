import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { liaisonOffices } from "@/server/domain/liaison";
import { createLiaisonAction } from "@/server/actions/liaison";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";
import { LIAISON_BOUNDARY_NOTICE } from "../../liaison-panels";

export const metadata = { title: "Record a liaison reference" };

export default async function NewLiaisonPage() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "liaison.metadata.create")) return <AccessDenied what="liaison administration" />;
  const offices = liaisonOffices(actor).map((o) => ({ value: o.id, label: o.name }));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/liaison" className="text-zp-blue hover:underline">← Liaison register</Link></p>
      <PageHeader eyebrow="Intelligence liaison administration" title="Record a liaison reference"
        description="Record the administrative metadata of a liaison submission or report reference held outside ZPS-OMS. A reference (LIA-year-number) is generated; you can then submit it to an office on an approved channel." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ActionForm action={createLiaisonAction}>
            <Select label="Your office" name="originUnitId" required options={offices} defaultValue={offices[0]?.value} />
            <Select label="Type" name="kind" required options={[{ value: "SUBMISSION", label: "Administrative submission" }, { value: "REPORT_REFERENCE", label: "Report reference" }]} defaultValue="SUBMISSION" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Document reference number (optional)" name="externalReference" maxLength={40} placeholder="e.g. ABC/123/2026"
                hint="The reference number only: letters, digits, / - and . (no spaces)." />
              <TextField label="Approval reference (optional)" name="approvalReference" maxLength={40} placeholder="e.g. APPR/045" />
            </div>
            <Select label="Administrative classification" name="classification" required
              options={[{ value: "UNCLASSIFIED", label: "Unclassified (administrative)" }, { value: "RESTRICTED", label: "Restricted (administrative)" }]} defaultValue="UNCLASSIFIED" />
            <Submit>Record reference</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-3">
          <Notice tone="warn">{LIAISON_BOUNDARY_NOTICE}</Notice>
          <Notice tone="info">There is deliberately no subject, description, note or attachment field. Enter reference numbers only; descriptive text is refused.</Notice>
        </div>
      </div>
    </>
  );
}
