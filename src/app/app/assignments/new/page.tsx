import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { today } from "@/server/domain/core";
import { listPersonnel } from "@/server/domain/personnel";
import { selectableAreas, tenurePolicy } from "@/server/domain/assignments";
import { proposeAssignmentAction } from "@/server/actions/personnel";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Propose assignment" };

export default async function NewAssignment({ searchParams }: { searchParams: Promise<{ personnel?: string; q?: string }> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "assignment.propose"))) return <AccessDenied what="assignment proposals" />;
  const sp = await searchParams;
  const db = getDb();
  const [areas, people, policy] = await Promise.all([
    selectableAreas(db),
    listPersonnel(db, actor, { q: sp.q, employment: "SERVING", pageSize: 200, sort: "name" }),
    tenurePolicy(db),
  ]);
  const myAreas = areas.filter((a) => can(actor, "assignment.propose", a.responsible_unit_id));
  const available = people.rows.filter((p) => ["AVAILABLE_HOME", "RETURNED_HOME", "RELEASED", "COMPLETED", "CANCELLED"].includes(p.disposition_status));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/assignments" className="text-zp-blue hover:underline">← Assignment register</Link></p>
      <PageHeader eyebrow="Assignment administration" title="Propose a duty-area assignment" description="The proposal is decided by an officer holding delegated assignment authority for the responsible unit. You cannot approve your own proposal." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Assignment details" className="lg:col-span-2">
          <form method="get" className="mb-4 flex gap-2">
            <input name="q" defaultValue={sp.q} placeholder="Find officer by name or service number" className="block w-full rounded-md border border-line-2 px-3 py-2 text-sm" />
            <button className="rounded-md border border-line-2 px-3 text-sm font-semibold">Search</button>
          </form>
          <ActionForm action={proposeAssignmentAction}>
            <Select label="Officer (available, in your scope)" name="personnelId" required defaultValue={sp.personnel} placeholder={available.length ? "Select officer" : "No available officers match"}
              options={available.map((p) => ({ value: p.id, label: `${p.rank_name} ${p.surname}, ${p.first_names} — ${p.service_number} (${p.home_unit_name})` }))} />
            <Select label="Operational area" name="areaId" required placeholder="Select area" options={myAreas.map((a) => ({ value: a.id, label: `${a.name} — ${a.unit_name}` }))} />
            <TextField label="Commencement date" name="commencementDate" type="date" required defaultValue={today()} hint={`The review date is set ${policy.minimumDays} days after commencement.`} />
            <TextArea label="Administrative notes" name="notes" rows={3} maxLength={500} />
            <Submit>Submit for approval</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Notice tone="info" title="One current assignment per officer">Officers with a pending, approved or active assignment are not listed. Overlap requires an approved exception.</Notice>
          <Notice tone="warn" title="Administrative record only">Do not record locations, routes, positions or deployment instructions.</Notice>
        </div>
      </div>
    </>
  );
}
