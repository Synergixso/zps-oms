import { identifierHint, identifierRule } from "@/server/lib/identifiers";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { EMPLOYMENT_LABEL, EMPLOYMENT_STATUSES, ranks } from "@/server/domain/personnel";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { registerPersonnelAction } from "@/server/actions/personnel";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Register officer" };

export default async function NewPersonnel() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "personnel.register"))) return <AccessDenied what="personnel registration" />;
  const db = getDb();
  const [rankList, units] = await Promise.all([ranks(db), scopedUnits(db, actor, "personnel.register")]);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/personnel" className="text-zp-blue hover:underline">← Personnel register</Link></p>
      <PageHeader eyebrow="Personnel registry" title="Register an officer" description="Each officer is registered once. An officer assigned elsewhere keeps this single record; never register them again in the receiving unit." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Officer details" className="lg:col-span-2">
          <ActionForm action={registerPersonnelAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Service number" name="serviceNumber" required placeholder={identifierRule("serviceNumber").synthetic ? "SYN-123456" : undefined} hint={identifierHint("serviceNumber")} maxLength={20} />
              <Select label="Rank" name="rankCode" required placeholder="Select rank" options={rankList.map((r) => ({ value: r.code, label: r.name }))} />
              <TextField label="Surname" name="surname" required maxLength={60} />
              <TextField label="First name(s)" name="firstNames" required maxLength={80} hint={identifierRule("serviceNumber").synthetic ? "Synthetic records should include 'Demo'." : undefined} />
              <Select label="Home unit" name="homeUnitId" required placeholder="Select home unit" options={unitOptions(units)} />
              <Select label="Employment status" name="employmentStatus" defaultValue="SERVING" options={EMPLOYMENT_STATUSES.map((s) => ({ value: s, label: EMPLOYMENT_LABEL[s] }))} />
            </div>
            <TextArea label="Eligibility note (optional)" name="eligibilityNote" rows={2} maxLength={200} hint="Only approved administrative eligibility information; no medical or sensitive personal detail." />
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="confirmDistinct" value="1" className="mt-0.5 h-4 w-4 accent-zp-green" />
              <span>This is a different officer from any existing record with the same name and rank (tick only after checking the register).</span>
            </label>
            <Submit>Register officer</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Notice tone="info" title="Duplicate prevention">The service number must be unique nationally. A record with the same name and rank needs explicit confirmation that it is a different officer.</Notice>
          <Notice tone="warn" title="Minimum necessary data">Collect only what is listed here. Production records may be introduced only after institutional authorisation.</Notice>
        </div>
      </div>
    </>
  );
}
