import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getMaintenance, MAINT_LABEL, maintenanceActions, maintenanceHistory, type MaintAction } from "@/server/domain/fleet";
import { maintenanceWorkflowAction } from "@/server/actions/fleet";
import { Badge, Card, DL, PageHeader, Timeline, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Maintenance request" };

const META: Record<MaintAction, { label: string; note?: "required" | "optional"; workshop?: boolean; cost?: boolean; variant?: "primary" | "secondary" | "danger" }> = {
  VALIDATE: { label: "Validate request", variant: "primary", note: "optional" },
  APPROVE: { label: "Approve (delegated)", variant: "primary", note: "optional" },
  REJECT: { label: "Reject", note: "required", variant: "danger" },
  REFER: { label: "Refer to workshop", workshop: true, variant: "primary" },
  START: { label: "Record work started", variant: "primary" },
  SUBMIT_COMPLETION: { label: "Submit completion", note: "optional", variant: "primary" },
  RETURN_TO_WORKSHOP: { label: "Return to workshop", note: "required", variant: "secondary" },
  VERIFY: { label: "Verify and close", cost: true, note: "optional", variant: "primary" },
};

export default async function MaintenanceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const m = await loadOr404(() => getMaintenance(db, actor, id));
  const history = await maintenanceHistory(db, actor, id);
  const actions = await maintenanceActions(db, actor, m);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/fleet/maintenance" className="text-zp-blue hover:underline">← Maintenance workbench</Link></p>
      <PageHeader eyebrow={m.reference} title={`${m.service_type} — ${m.fleet_ref}`} description={<Badge status={m.status} label={MAINT_LABEL[m.status]} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Request">
            <DL items={[["Vehicle", <Link key="v" className="text-zp-blue hover:underline" href={`/app/fleet/${m.vehicle_id}`}>{m.fleet_ref} · {m.make} {m.model}</Link>], ["Organisation", m.org_name], ["Service type", m.service_type], ["Estimated cost (ZMW, synthetic)", m.estimated_cost?.toLocaleString() ?? "—"], ["Delegated approval required", m.approval_required ? "Yes" : "No"], ["Workshop referral", m.workshop_ref ?? "—"], ["Raised by", m.requester_name], ["Raised", fmtDateTime(m.created_at)]]} />
            <p className="mt-4 border-t border-line pt-4 text-sm whitespace-pre-wrap">{m.description}</p>
          </Card>
          <Card title="Lifecycle history">
            <Timeline items={history.map((h, i) => ({ key: String(i), title: `${h.action.replace(/_/g, " ").toLowerCase()} → ${MAINT_LABEL[h.to_status as keyof typeof MAINT_LABEL]}`, meta: `${h.actor_name} · ${fmtDateTime(h.created_at)}`, body: h.note }))} />
          </Card>
        </div>
        <Card title="Available actions" subtitle="Server re-validates role, scope, delegation and separation of duties.">
          {actions.length === 0 ? (
            <p className="text-sm text-muted">No actions are available to you at this stage.</p>
          ) : (
            <div className="space-y-3">
              {actions.map((a) => (
                <ActionForm key={a} action={maintenanceWorkflowAction} className="space-y-2 rounded-md border border-line p-3">
                  <Hidden name="id" value={m.id} />
                  <Hidden name="action" value={a} />
                  {META[a].workshop && <TextField label="Workshop referral reference" name="workshopRef" required maxLength={40} />}
                  {META[a].cost && <TextField label="Cost reference (invoice no.)" name="costRef" maxLength={40} />}
                  {META[a].note && <TextArea label={META[a].note === "required" ? "Reason (required)" : "Note (optional)"} name="note" rows={2} maxLength={500} />}
                  <Submit variant={META[a].variant}>{META[a].label}</Submit>
                </ActionForm>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
