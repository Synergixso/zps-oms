import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { getTransfer } from "@/server/domain/assignments";
import { transferWorkflowAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, DL, PageHeader, Timeline, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Transfer" };

const STEPS = [["PENDING_RELEASE", "Releasing decision"], ["PENDING_ACCEPTANCE", "Receiving acceptance"], ["COMPLETED", "Completed"]] as const;

export default async function TransferDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "assignment.view"))) return <AccessDenied what="transfers" />;
  const { transfer: t, canRelease, canAccept, actions } = await loadOr404(() => getTransfer(getDb(), actor, id));
  const stepIdx = STEPS.findIndex(([s]) => s === t.status);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/transfers" className="text-zp-blue hover:underline">← Transfers</Link></p>
      <PageHeader eyebrow={t.reference} title={`${t.rank_name} ${t.full_name}`} description={`${t.from_area_name} → ${t.to_area_name}`} />
      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Transfer progress">
        {STEPS.map(([s, label], i) => {
          const state = t.status === "REJECTED" || t.status === "CANCELLED" ? "off" : i < stepIdx || t.status === "COMPLETED" ? "done" : i === stepIdx ? "now" : "todo";
          return <li key={s} className={`rounded-md border px-3 py-2 text-sm font-semibold ${state === "done" ? "border-ok/30 bg-ok-bg text-ok" : state === "now" ? "border-warn/30 bg-warn-bg text-warn" : "border-line bg-white text-muted"}`}>{i + 1}. {label}</li>;
        })}
      </ol>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Transfer record">
            <DL items={[
              ["Status", <Badge key="s" status={t.status.startsWith("PENDING") ? "PENDING" : t.status} label={t.status.replace(/_/g, " ").toLowerCase()} />],
              ["Current assignment", <Link key="a" href={`/app/assignments/${t.assignment_id}`} className="text-zp-blue hover:underline">{t.assignment_ref}</Link>],
              ["Releasing unit", t.releasing_unit_name], ["Receiving unit", t.receiving_unit_name],
              ["Proposed effective date", fmtDate(t.proposed_date)], ["Approved effective date", fmtDate(t.effective_date)],
              ["Early-release exception", t.exception_ref ?? "None (minimum tenure met)"], ["Initiated by", `${t.initiated_by_name}, ${fmtDateTime(t.initiated_at)}`],
              ["Released by", t.released_by_name ? `${t.released_by_name}, ${fmtDateTime(t.released_at)}` : "—"], ["Accepted by", t.accepted_by_name ? `${t.accepted_by_name}, ${fmtDateTime(t.accepted_at)}` : "—"],
              ["New assignment", t.new_assignment_id ? <Link key="n" href={`/app/assignments/${t.new_assignment_id}`} className="text-zp-blue hover:underline">Open new assignment</Link> : "—"],
              ["Justification", t.justification],
            ]} />
          </Card>
          <Card title="History"><Timeline items={actions.map((x) => ({ key: String(x.seq), title: x.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), meta: `${x.actor_name} · ${fmtDateTime(x.created_at)}`, body: x.comment ?? undefined }))} /></Card>
        </div>
        <div className="space-y-4">
          {canRelease && (
            <Card title="Releasing decision" subtitle={`On behalf of ${t.releasing_unit_name}`}>
              <ActionForm action={transferWorkflowAction}>
                <Hidden name="id" value={t.id} />
                <TextArea label="Decision note" name="comment" rows={2} required />
                <div className="flex gap-2"><Submit name="action" value="RELEASE_APPROVE">Approve release</Submit><Submit name="action" value="RELEASE_REJECT" variant="danger">Reject</Submit></div>
              </ActionForm>
            </Card>
          )}
          {canAccept && (
            <Card title="Receiving acceptance" subtitle="Accepting closes the old assignment and opens the new one">
              <ActionForm action={transferWorkflowAction}>
                <Hidden name="id" value={t.id} />
                <TextField label="Approved effective date" name="effectiveDate" type="date" defaultValue={today() < t.proposed_date ? today() : t.proposed_date} required />
                <TextArea label="Acceptance note" name="comment" rows={2} required />
                <div className="flex gap-2"><Submit name="action" value="ACCEPT" confirm="Complete the transfer now?">Accept and complete</Submit><Submit name="action" value="DECLINE" variant="danger">Decline</Submit></div>
              </ActionForm>
            </Card>
          )}
          {t.initiated_by === actor.userId && t.status.startsWith("PENDING") && (
            <Card title="Withdraw transfer">
              <ActionForm action={transferWorkflowAction}>
                <Hidden name="id" value={t.id} />
                <TextField label="Reason" name="comment" required />
                <Submit name="action" value="CANCEL" variant="danger" confirm="Withdraw this transfer?">Withdraw</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
