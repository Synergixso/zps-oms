import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { canDecideRequisition, getRequisition, REQ_STATUS_LABEL } from "@/server/domain/stores";
import { requisitionWorkflowAction } from "@/server/actions/stores";
import { Badge, Card, DL, Notice, PageHeader, Table, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea } from "@/components/forms";

export const metadata = { title: "Stores requisition" };

export default async function RequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const { req, lines } = await loadOr404(() => getRequisition(db, actor, id));
  const mine = req.requested_by === actor.userId;
  const requester = can(actor, "stores.requisition", req.requesting_unit_id);
  const decide = await canDecideRequisition(db, actor, req);
  const issue = req.status === "APPROVED" && !mine && can(actor, "stores.manage", req.store_unit_id);
  const canSubmit = req.status === "DRAFT" && requester;
  const canCancel = ["DRAFT", "SUBMITTED"].includes(req.status) && requester;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/stores/requisitions" className="text-zp-blue hover:underline">← Stores requisitions</Link></p>
      <PageHeader eyebrow={`${req.reference} · ${req.requesting_unit_name} → ${req.store_unit_name}`} title={req.purpose} description={<Badge status={req.status} label={REQ_STATUS_LABEL[req.status]} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Requisition">
            <DL items={[
              ["Requesting unit", req.requesting_unit_name], ["Store", req.store_unit_name], ["Raised by", req.requested_by_name], ["Raised", fmtDateTime(req.created_at)],
              ["Submitted", fmtDateTime(req.submitted_at)], ["Decision by", req.approved_by_name ?? "—"], ["Decided", fmtDateTime(req.approved_at)], ["Issued", fmtDateTime(req.issued_at)],
              ["Decision comment", req.decision_comment ?? "—"],
            ]} />
          </Card>
          <Card title="Items" bodyClass="p-0">
            <Table head={["Item", "Unit", "Requested", "Issued", ...(issue ? ["Store balance"] : [])]} caption="Requisition lines">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className={td}><span className="font-mono text-xs text-muted">{l.item_code}</span> {l.item_name}</td>
                  <td className={`${td} text-ink-2`}>{l.unit_of_measure}</td>
                  <td className={`${td} tabular-nums`}>{l.quantity_requested}</td>
                  <td className={`${td} tabular-nums`}>{l.quantity_issued ?? "—"}</td>
                  {issue && <td className={`${td} tabular-nums ${l.quantity_on_hand < l.quantity_requested ? "text-warn" : ""}`}>{l.quantity_on_hand}</td>}
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Actions" subtitle="Offered according to your role, scope and delegations; the server re-validates.">
            {!(canSubmit || canCancel || decide || issue) ? (
              <p className="text-sm text-muted">
                {req.status === "SUBMITTED" && mine ? "Awaiting a decision by a delegated commander. You cannot decide your own requisition." : "No actions are available to you for this requisition."}
              </p>
            ) : (
              <div className="space-y-3">
                {canSubmit && (
                  <ActionForm action={requisitionWorkflowAction}>
                    <Hidden name="id" value={req.id} /><Hidden name="action" value="SUBMIT" />
                    <Submit>Submit for decision</Submit>
                  </ActionForm>
                )}
                {decide && (
                  <ActionForm action={requisitionWorkflowAction} className="space-y-2">
                    <Hidden name="id" value={req.id} />
                    <TextArea label="Comment (required to reject)" name="comment" rows={2} maxLength={300} />
                    <div className="flex gap-2">
                      <Submit name="action" value="APPROVE">Approve</Submit>
                      <Submit variant="danger" name="action" value="REJECT">Reject</Submit>
                    </div>
                  </ActionForm>
                )}
                {issue && (
                  <ActionForm action={requisitionWorkflowAction} className="space-y-2">
                    <Hidden name="id" value={req.id} /><Hidden name="action" value="ISSUE" />
                    {lines.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                        <label htmlFor={`is-${l.id}`} className="min-w-0 truncate">{l.item_name}</label>
                        <input id={`is-${l.id}`} name={`issued_${l.id}`} type="number" min={0} max={l.quantity_requested} defaultValue={Math.min(l.quantity_requested, l.quantity_on_hand)} className="w-20 rounded-md border border-line-2 px-2 py-1 text-sm" />
                      </div>
                    ))}
                    <Submit confirm="Issue these quantities? The stock ledger is updated immediately.">Issue stores</Submit>
                  </ActionForm>
                )}
                {canCancel && (
                  <ActionForm action={requisitionWorkflowAction} className="space-y-2 border-t border-line pt-3">
                    <Hidden name="id" value={req.id} /><Hidden name="action" value="CANCEL" />
                    <Submit variant="secondary" confirm="Cancel this requisition?">Cancel requisition</Submit>
                  </ActionForm>
                )}
              </div>
            )}
          </Card>
          <Notice tone="info">General consumables only. Sensitive or controlled equipment cannot be requisitioned through ZPS-OMS.</Notice>
        </div>
      </div>
    </>
  );
}
