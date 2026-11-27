import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { can } from "@/server/domain/policy";
import { actsAt, getLiaison, LIAISON_ACTION_LABEL, LIAISON_KIND_LABEL, LIAISON_STATUS_LABEL, liaisonRouting, routingOptions } from "@/server/domain/liaison";
import { liaisonStepAction, updateLiaisonAction } from "@/server/actions/liaison";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Liaison reference" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

const DONE: Record<string, string> = {
  SUBMIT: "Submitted. The receiving office has been notified.",
  RECEIVE: "Receipt recorded. You are now the responsible officer.",
  ACKNOWLEDGE: "Acknowledged. The submitting officer has been notified.",
  CLOSE: "Closed.",
  WITHDRAW: "Withdrawn.",
};

export default async function LiaisonRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "liaison.metadata.view")) return <AccessDenied what="liaison administration" />;
  const { id } = await params;
  const done = DONE[(await searchParams).done ?? ""];
  const db = getDb();
  const r = await loadOr404(() => getLiaison(db, actor, id));
  const routing = await liaisonRouting(db, actor, id);
  const responsible = r.responsible_user_id === actor.userId;
  // Presentation only: the domain re-checks permission, office and status for every step.
  const office = actsAt(actor, r.holding_unit_id);
  const canRoute = can(actor, "liaison.reference.route", r.holding_unit_id);
  const canAck = office && can(actor, "liaison.submission.acknowledge", r.holding_unit_id);
  const mayRoute = canRoute && ((r.status === "DRAFT" && responsible) || (r.status === "ACKNOWLEDGED" && office));
  const options = mayRoute ? await routingOptions(db, actor, id) : [];
  const t = today();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/liaison" className="text-zp-blue hover:underline">← Liaison register</Link></p>
      <PageHeader eyebrow={`Intelligence liaison administration · ${LIAISON_KIND_LABEL[r.kind]}`} title={r.reference}
        description="Administrative metadata and routing history. ZPS-OMS holds no content for this reference." />
      {done && <div className="mb-4" role="status"><Notice tone="ok">{done}</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Metadata">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" value={<Badge status={r.status} label={LIAISON_STATUS_LABEL[r.status]} />} />
              <Field label="Administrative classification" value={r.classification === "RESTRICTED" ? "Restricted (administrative)" : "Unclassified (administrative)"} />
              <Field label="Document reference" value={<span className="font-mono text-xs">{r.external_reference ?? "—"}</span>} />
              <Field label="Approval reference" value={<span className="font-mono text-xs">{r.approval_reference ?? "—"}</span>} />
              <Field label="Originating office" value={r.origin_name} />
              <Field label="Held at (receiving office)" value={r.holding_name} />
              <Field label="Responsible officer" value={r.responsible_name} />
              <Field label="Recorded" value={fmtDateTime(r.created_at)} />
              <Field label="Date submitted" value={r.date_submitted ? fmtDate(r.date_submitted) : "—"} />
              <Field label="Date received" value={r.date_received ? fmtDate(r.date_received) : "—"} />
              <Field label="Date acknowledged" value={r.date_acknowledged ? fmtDate(r.date_acknowledged) : "—"} />
            </dl>
          </Card>
          <Card title="Routing and transaction history" bodyClass="p-0">
            <Table head={["#", "When", "Action", "From", "To", "Status", "Approval reference", "By"]} caption="Routing history" empty="No history.">
              {routing.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} tabular-nums text-muted`}>{e.seq}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(e.at)}</td>
                  <td className={td}>{LIAISON_ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className={`${td} text-ink-2`}>{e.from_name ?? "—"}</td>
                  <td className={`${td} text-ink-2`}>{e.to_name ?? "—"}</td>
                  <td className={td}>{LIAISON_STATUS_LABEL[e.to_status] ?? e.to_status}</td>
                  <td className={`${td} font-mono text-xs`}>{e.approval_reference ?? "—"}</td>
                  <td className={`${td} text-ink-2`}>{e.actor_name}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {mayRoute && (
            <Card title={r.status === "DRAFT" ? "Submit" : "Route onward"} subtitle="To an office directly above or below in the same line, with an assigned liaison officer">
              {options.length ? (
                <ActionForm action={liaisonStepAction}>
                  <Hidden name="id" value={r.id} /><Hidden name="step" value="SUBMIT" />
                  <Select label="Receiving office" name="toUnitId" required options={options.map((o) => ({ value: o.id, label: `${o.direction === "UP" ? "↑" : "↓"} ${o.name}` }))} placeholder="Select office" />
                  <TextField label="Date submitted" name="date" type="date" required defaultValue={t} />
                  <TextField label="Approval reference (optional)" name="approvalReference" maxLength={40} />
                  <Submit>{r.status === "DRAFT" ? "Submit" : "Route onward"}</Submit>
                </ActionForm>
              ) : <Notice tone="warn">No office on an approved channel has an assigned liaison officer.</Notice>}
            </Card>
          )}
          {r.status === "SUBMITTED" && canAck && (
            <Card title="Record receipt">
              <ActionForm action={liaisonStepAction}>
                <Hidden name="id" value={r.id} /><Hidden name="step" value="RECEIVE" />
                <TextField label="Date received" name="date" type="date" required defaultValue={t} />
                <Submit>Record receipt</Submit>
              </ActionForm>
            </Card>
          )}
          {r.status === "RECEIVED" && canAck && (
            <Card title="Acknowledge">
              <ActionForm action={liaisonStepAction}>
                <Hidden name="id" value={r.id} /><Hidden name="step" value="ACKNOWLEDGE" />
                <TextField label="Acknowledgement date" name="date" type="date" required defaultValue={t} />
                <TextField label="Approval reference (optional)" name="approvalReference" maxLength={40} />
                <Submit>Acknowledge</Submit>
              </ActionForm>
            </Card>
          )}
          {r.status === "ACKNOWLEDGED" && canAck && (
            <Card title="Close">
              <ActionForm action={liaisonStepAction}>
                <Hidden name="id" value={r.id} /><Hidden name="step" value="CLOSE" />
                <p className="text-sm text-ink-2">Close when no further routing is needed.</p>
                <Submit variant="secondary" confirm="Close this liaison reference?">Close reference</Submit>
              </ActionForm>
            </Card>
          )}
          {responsible && (r.status === "DRAFT" || r.status === "SUBMITTED") && (
            <Card title="Withdraw">
              <ActionForm action={liaisonStepAction}>
                <Hidden name="id" value={r.id} /><Hidden name="step" value="WITHDRAW" />
                <p className="text-sm text-ink-2">{r.status === "SUBMITTED" ? "Withdraw before the receiving office records receipt." : "Withdraw this draft."}</p>
                <Submit variant="danger" confirm="Withdraw this liaison reference?">Withdraw</Submit>
              </ActionForm>
            </Card>
          )}
          {responsible && r.status === "DRAFT" && (
            <Card title="Correct metadata">
              <ActionForm action={updateLiaisonAction}>
                <Hidden name="id" value={r.id} /><Hidden name="version" value={String(r.version)} />
                <Select label="Type" name="kind" required options={[{ value: "SUBMISSION", label: "Administrative submission" }, { value: "REPORT_REFERENCE", label: "Report reference" }]} defaultValue={r.kind} />
                <TextField label="Document reference number" name="externalReference" maxLength={40} defaultValue={r.external_reference ?? ""} />
                <TextField label="Approval reference" name="approvalReference" maxLength={40} defaultValue={r.approval_reference ?? ""} />
                <Select label="Administrative classification" name="classification" required options={[{ value: "UNCLASSIFIED", label: "Unclassified (administrative)" }, { value: "RESTRICTED", label: "Restricted (administrative)" }]} defaultValue={r.classification} />
                <Submit variant="secondary">Save corrections</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
