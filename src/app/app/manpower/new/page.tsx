import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { selectableAreas } from "@/server/domain/assignments";
import { createManpowerAction } from "@/server/actions/personnel";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { RequestFields } from "../request-form";

export const metadata = { title: "New manpower request" };

export default async function NewManpower() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "manpower.create"))) return <AccessDenied what="manpower requests" />;
  const db = getDb();
  const units = await scopedUnits(db, actor, "manpower.create");
  // Approval authorities: the requesting units and every unit above them.
  const approval = units.length
    ? await all<{ id: string; name: string }>(db, `SELECT DISTINCT o.id, o.name FROM org_unit_closure c JOIN org_units o ON o.id = c.ancestor_id WHERE c.descendant_id IN (${units.map(() => "?").join(",")}) ORDER BY o.name`, ...units.map((u) => u.id))
    : [];
  const areas = await selectableAreas(db);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/manpower" className="text-zp-blue hover:underline">← Manpower requests</Link></p>
      <PageHeader eyebrow="Manpower" title="New manpower request" description="A reference is generated automatically. The request is routed for review and approval, then contribution requirements are sent to units." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Request details" className="lg:col-span-2">
          <ActionForm action={createManpowerAction}>
            <RequestFields units={unitOptions(units)} approvalUnits={approval.map((u) => ({ value: u.id, label: u.name }))} areas={areas.map((a) => ({ value: a.id, label: a.name }))} />
            <div className="flex flex-wrap gap-2">
              <Submit name="intent" value="submit">Submit request</Submit>
              <Submit name="intent" value="draft" variant="secondary">Save as draft</Submit>
            </div>
          </ActionForm>
        </Card>
        <Notice tone="warn" title="Administrative content only">Fields for tactical plans, operational positions, patrol routes or live deployment instructions do not exist and such content is refused.</Notice>
      </div>
    </>
  );
}
