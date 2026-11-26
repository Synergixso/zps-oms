import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { today } from "@/server/domain/core";
import { ASSIGNMENT_STATUS_LABEL, assignmentDetail, exceptionCategories, selectableAreas } from "@/server/domain/assignments";
import { DISPOSITIONS } from "@/server/domain/personnel";
import { assignmentWorkflowAction, initiateTransferAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Table, Timeline, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Assignment" };

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "assignment.view"))) return <AccessDenied what="assignments" />;
  const db = getDb();
  const d = await loadOr404(() => assignmentDetail(db, actor, id));
  const a = d.assignment;
  const t = d.tenure;
  const proposer = can(actor, "assignment.propose", a.responsible_unit_id) || can(actor, "assignment.propose", a.home_unit_id);
  const current = ["ACTIVE", "APPROVED", "TRANSFER_PENDING"].includes(a.status);
  const approvedEarly = d.exceptions.filter((e) => e.purpose === "EARLY_RELEASE" && e.status === "APPROVED");
  const [cats, areas] = proposer && current ? await Promise.all([exceptionCategories(db), selectableAreas(db)]) : [[], []];
  const pct = Math.min(100, Math.round((t.elapsedDays / t.minimumDays) * 100));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/assignments" className="text-zp-blue hover:underline">← Assignment register</Link></p>
      <PageHeader
        eyebrow={`${a.reference} · administrative duty-area record`}
        title={`${a.rank_name} ${a.full_name}`}
        description={<span className="flex flex-wrap items-center gap-2"><Badge status={a.status} label={ASSIGNMENT_STATUS_LABEL[a.status]} /><span className="text-sm">{a.area_name}</span>{current && <Badge status={a.disposition_status} label={DISPOSITIONS[a.disposition_status]} />}</span>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(a.status === "ACTIVE" || a.status === "TRANSFER_PENDING") && (
            <Card title="Assignment tenure" subtitle={`Proposed minimum ${t.minimumDays} days at the same operational area (requires institutional authorisation)`}>
              <div className="h-2.5 rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Minimum tenure completed">
                <div className={`h-2.5 rounded-full ${t.minimumMet ? "bg-ok" : "bg-zp-blue"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs font-semibold text-muted">Continuous start</p><p className="font-semibold">{fmtDate(t.continuousStart)}</p></div>
                <div><p className="text-xs font-semibold text-muted">Elapsed</p><p className="font-semibold">{t.elapsedDays} days</p></div>
                <div><p className="text-xs font-semibold text-muted">Remaining to minimum</p><p className="font-semibold">{t.minimumMet ? "Completed" : `${t.remainingDays} days`}</p></div>
                <div><p className="text-xs font-semibold text-muted">Minimum completes</p><p className="font-semibold">{fmtDate(t.completionDate)}</p></div>
                <div><p className="text-xs font-semibold text-muted">Review date</p><p className="font-semibold">{fmtDate(t.reviewDate)}</p></div>
                <div><p className="text-xs font-semibold text-muted">Review / renewal</p><p className="font-semibold">{t.renewalEligible ? "Eligible now" : t.reviewEligible ? "Review window open" : "Not yet due"}</p></div>
              </div>
            </Card>
          )}
          <Card title="Assignment record">
            <DL items={[
              ["Assignment reference", a.reference], ["Personnel reference", <Link key="p" href={`/app/personnel/${a.personnel_id}`} className="text-zp-blue hover:underline">{a.personnel_ref} · {a.service_number}</Link>],
              ["Home unit", a.home_unit_name], ["Responsible unit", a.responsible_unit_name], ["Operational area", `${a.area_name} (${a.area_code})`],
              ["Related manpower request", a.request_id ? <Link key="r" href={`/app/manpower/${a.request_id}`} className="text-zp-blue hover:underline">{a.request_ref}</Link> : "—"],
              ["Commencement date", fmtDate(a.commencement_date)], ["Expected review date", fmtDate(a.review_date)],
              ["Authorising officer", a.authorised_by_name ?? "Pending"], ["Authorising unit", a.authorised_unit_name ?? "—"], ["Authorised at", a.authorised_at ? fmtDateTime(a.authorised_at) : "—"],
              ["Ended", a.ended_on ? `${fmtDate(a.ended_on)} (${a.close_reason?.toLowerCase()})` : "—"], ["Notes", a.notes ?? "—"],
            ]} />
          </Card>
          <Card title="Approval and event history">
            <Timeline items={d.actions.map((x) => ({ key: String(x.seq), title: x.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), meta: `${x.actor_name} · ${fmtDateTime(x.created_at)}${x.to_status ? ` · ${x.from_status ?? "—"} → ${x.to_status}` : ""}`, body: x.comment ?? undefined }))} />
          </Card>
          {d.renewals.length > 0 && (
            <Card title="Renewal history" bodyClass="p-0">
              <Table head={["Decision", "Previous review", "Next review", "By", "Note"]}>{d.renewals.map((r) => <tr key={r.id}><td className={td}><Badge status={r.decision === "RENEWED" ? "APPROVED" : "CLOSED"} label={r.decision.replace("_", " ").toLowerCase()} /></td><td className={td}>{fmtDate(r.previous_review_date)}</td><td className={td}>{fmtDate(r.next_review_date)}</td><td className={td}>{r.actor_name}<span className="block text-xs text-muted">{fmtDate(r.decided_at)}</span></td><td className={td}>{r.comment}</td></tr>)}</Table>
            </Card>
          )}
          {d.exceptions.length > 0 && (
            <Card title="Exceptions" bodyClass="p-0">
              <Table head={["Reference", "Purpose / category", "Justification", "Status", ""]}>
                {d.exceptions.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} font-mono text-xs`}>{e.reference}</td>
                    <td className={td}>{e.purpose === "EARLY_RELEASE" ? "Early release" : "Overlap"}<span className="block text-xs text-muted">{e.category_name}</span></td>
                    <td className={td}>{e.justification}{e.document_ref && <span className="block text-xs text-muted">Document: {e.document_ref}</span>}<span className="block text-xs text-muted">Raised by {e.raised_by_name}, {fmtDate(e.raised_at)}{e.decided_by_name ? ` · decided by ${e.decided_by_name}: ${e.decision_comment}` : ""}</span></td>
                    <td className={td}><Badge status={e.status === "PENDING" ? "PENDING" : e.status} /></td>
                    <td className={td}>
                      {e.status === "PENDING" && d.canApprove && e.raised_by !== actor.userId && (
                        <ActionForm action={assignmentWorkflowAction} className="space-y-1">
                          <Hidden name="id" value={a.id} /><Hidden name="exceptionId" value={e.id} />
                          <input name="comment" placeholder="Decision note" className="w-full rounded border border-line-2 px-2 py-1 text-xs" />
                          <div className="flex gap-1"><Submit name="action" value="EXCEPTION_APPROVE">Approve</Submit><Submit name="action" value="EXCEPTION_REJECT" variant="danger">Reject</Submit></div>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
          {d.transfers.length > 0 && (
            <Card title="Transfers" bodyClass="p-0">
              <Table head={["Reference", "From → to", "Status", "Effective"]}>{d.transfers.map((x) => <tr key={x.id}><td className={`${td} font-mono text-xs`}><Link href={`/app/transfers/${x.id}`} className="text-zp-blue hover:underline">{x.reference}</Link></td><td className={td}>{x.from_area_name} → {x.to_area_name}</td><td className={td}><Badge status={x.status.startsWith("PENDING") ? "PENDING" : x.status} label={x.status.replace(/_/g, " ").toLowerCase()} /></td><td className={td}>{fmtDate(x.effective_date ?? x.proposed_date)}</td></tr>)}</Table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {a.status === "PENDING_APPROVAL" && d.canApprove && a.created_by !== actor.userId && (
            <Card title="Approval decision">
              <ActionForm action={assignmentWorkflowAction}>
                <Hidden name="id" value={a.id} />
                <TextArea label="Comment" name="comment" rows={2} />
                <div className="flex gap-2"><Submit name="action" value="APPROVE">Approve</Submit><Submit name="action" value="REJECT" variant="danger">Reject</Submit></div>
              </ActionForm>
            </Card>
          )}
          {["PENDING_APPROVAL", "APPROVED"].includes(a.status) && (a.created_by === actor.userId || d.canApprove) && (
            <Card title="Cancel assignment">
              <ActionForm action={assignmentWorkflowAction}>
                <Hidden name="id" value={a.id} />
                <TextField label="Reason" name="comment" required />
                <Submit name="action" value="CANCEL" variant="danger" confirm="Cancel this assignment?">Cancel assignment</Submit>
              </ActionForm>
            </Card>
          )}
          {a.status === "ACTIVE" && d.canApprove && t.reviewEligible && (
            <Card title="Renewal decision" subtitle="Renewal keeps the continuous start date">
              <ActionForm action={assignmentWorkflowAction}>
                <Hidden name="id" value={a.id} />
                <TextArea label="Decision note" name="comment" rows={2} required />
                <div className="flex flex-wrap gap-2"><Submit name="action" value="RENEWED">Renew</Submit><Submit name="action" value="NOT_RENEWED" variant="secondary" confirm="Complete the assignment instead of renewing it?">Do not renew (complete)</Submit></div>
              </ActionForm>
            </Card>
          )}
          {a.status === "ACTIVE" && proposer && t.reviewEligible && a.disposition_status !== "RENEWAL_PENDING" && (
            <Card title="Request renewal">
              <ActionForm action={assignmentWorkflowAction}>
                <Hidden name="id" value={a.id} />
                <TextField label="Note" name="comment" />
                <Submit name="action" value="RENEWAL_PENDING" variant="secondary">Mark renewal pending</Submit>
              </ActionForm>
            </Card>
          )}
          {a.status === "ACTIVE" && d.canApprove && (
            <Card title="Release or complete" subtitle={t.minimumMet ? "Minimum tenure completed" : approvedEarly.length ? "An approved early-release exception is available" : "Minimum tenure not met: an approved early-release exception is required"}>
              <ActionForm action={assignmentWorkflowAction}>
                <Hidden name="id" value={a.id} />
                <TextField label="Effective date" name="effectiveDate" type="date" defaultValue={today()} required />
                {approvedEarly.length > 0 && <Select label="Exception" name="exceptionId" placeholder="None" options={approvedEarly.map((e) => ({ value: e.id, label: `${e.reference} (${e.category_name})` }))} />}
                <TextField label="Reason" name="comment" required />
                <div className="flex flex-wrap gap-2"><Submit name="action" value="RELEASE" variant="danger" confirm="Release the officer back to the home unit?">Release</Submit>{t.minimumMet && <Submit name="action" value="COMPLETE" variant="secondary">Complete</Submit>}</div>
              </ActionForm>
            </Card>
          )}
          {a.status === "ACTIVE" && proposer && (
            <Card title="Initiate transfer" subtitle="Releasing approval, then receiving acceptance">
              {!t.minimumMet && !approvedEarly.length && <div className="mb-3"><Notice tone="warn">Minimum tenure not met ({t.remainingDays} days remaining). A transfer needs an approved early-release exception.</Notice></div>}
              <ActionForm action={initiateTransferAction}>
                <Hidden name="id" value={a.id} />
                <Select label="Receiving operational area" name="toAreaId" required placeholder="Select area" options={areas.filter((x) => x.id !== a.area_id).map((x) => ({ value: x.id, label: `${x.name} — ${x.unit_name}` }))} />
                <TextField label="Proposed effective date" name="proposedDate" type="date" required defaultValue={today()} />
                {approvedEarly.length > 0 && <Select label="Early-release exception" name="exceptionId" placeholder="None" options={approvedEarly.map((e) => ({ value: e.id, label: `${e.reference} (${e.category_name})` }))} />}
                <TextArea label="Administrative justification" name="justification" rows={3} required />
                <Submit>Submit transfer</Submit>
              </ActionForm>
            </Card>
          )}
          {current && proposer && (
            <Card title="Raise an exception" subtitle="Misconduct is always available">
              <ActionForm action={assignmentWorkflowAction} resetOnSuccess>
                <Hidden name="id" value={a.id} />
                <Select label="Purpose" name="purpose" options={[{ value: "EARLY_RELEASE", label: "Early release before minimum tenure" }, { value: "OVERLAP", label: "Overlapping assignment" }]} />
                <Select label="Category" name="categoryCode" required placeholder="Select category" options={cats.map((c) => ({ value: c.code, label: `${c.name}${c.requires_document ? " (document required)" : ""}` }))} />
                <TextArea label="Administrative justification" name="justification" rows={3} required />
                <TextField label="Supporting document reference" name="documentRef" />
                <Submit name="action" value="EXCEPTION" variant="secondary">Raise exception</Submit>
              </ActionForm>
            </Card>
          )}
          <Card title="Disposition changes">
            <Timeline items={d.dispositions.map((x) => ({ key: String(x.seq), title: DISPOSITIONS[x.new_status as keyof typeof DISPOSITIONS] ?? x.new_status, meta: `${fmtDate(x.effective_date)} · ${x.actor_name ?? "System"}`, body: x.reason }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
