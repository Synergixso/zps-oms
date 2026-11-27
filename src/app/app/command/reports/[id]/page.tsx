import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { reportDetail, PROGRESS, RECIPIENT_STATUS, REPORT_CATEGORY, REPORT_STATUS } from "@/server/domain/command";
import { reportStepAction } from "@/server/actions/command";
import { Badge, Card, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea } from "@/components/forms";
import { Done } from "../../shared";

export const metadata = { title: "Status report" };

function F({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-0.5 text-sm">{value}</dd></div>;
}

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const { report: r, recipients, events, directive, held } = await loadOr404(() => reportDetail(db, actor, id));
  const can = (pos: string, action: string) => held.some((h) => h.positionId === pos && h.actions.includes(action as never));
  const reporter = can(r.reporter_position_id, "SUBMIT_REPORT");
  const mine = recipients.filter((x) => can(x.position_id, "ACKNOWLEDGE") || can(x.position_id, "REVIEW_REPORT"));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/command/reports" className="text-zp-blue hover:underline">← Reports</Link></p>
      <PageHeader eyebrow={`Command and reporting · ${REPORT_CATEGORY[r.category]}`} title={r.reference} description={`From ${r.reporter_title} (${r.origin_name}), ${fmtDate(r.reporting_date)}. One report; each recipient office keeps its own acknowledgement and review.`} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Report">
            <dl className="grid gap-4 sm:grid-cols-2">
              <F label="Status" value={<Badge status={r.status} label={REPORT_STATUS[r.status]} />} />
              <F label="Progress" value={PROGRESS[r.progress_status]} />
              <F label="Reporting officer" value={r.reporter_name} />
              <F label="Period" value={r.period_from || r.period_to ? `${r.period_from ? fmtDate(r.period_from) : "…"} – ${r.period_to ? fmtDate(r.period_to) : "…"}` : "—"} />
              <F label="Related directive" value={directive ? <Link className="text-zp-blue hover:underline" href={`/app/command/directives/${directive.id}`}>{directive.reference}</Link> : "—"} />
              <F label="Supporting references" value={r.supporting_refs ?? "—"} />
              <F label="Submissions" value={r.submissions} />
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Administrative summary</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{r.summary}</p>
            {r.outstanding && <><h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Outstanding administrative matters</h3><p className="mt-1 whitespace-pre-line text-sm">{r.outstanding}</p></>}
          </Card>
          <Card title="Recipients" subtitle="Primary and parallel recipients, and offices it was forwarded to" bodyClass="p-0">
            <Table head={["Office", "Kind", "Channel", "Status", "Acknowledged", "Review"]} caption="Report recipients" empty="Not yet submitted.">
              {recipients.map((x) => (
                <tr key={x.id}>
                  <td className={td}>{x.title}<div className="text-xs text-muted">{x.unit}</div></td>
                  <td className={td}>{x.recipient_kind.toLowerCase()}</td>
                  <td className={`${td} text-ink-2`}>{x.channel ?? (x.relationship_type ? x.relationship_type.replace(/_/g, " ").toLowerCase() : "—")}</td>
                  <td className={td}><Badge status={x.status} label={RECIPIENT_STATUS[x.status]} /></td>
                  <td className={`${td} text-ink-2`}>{x.acknowledged_at ? `${fmtDateTime(x.acknowledged_at)} · ${x.ack_name}` : "—"}</td>
                  <td className={`${td} text-ink-2`}>{x.review_outcome ? `${x.review_outcome.toLowerCase()}${x.review_note ? `: ${x.review_note}` : ""} · ${x.review_name}` : "—"}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="History" bodyClass="p-0">
            <Table head={["#", "When", "Action", "By", "Office", "Note"]} caption="Report history">
              {events.map((e) => (
                <tr key={e.seq}><td className={`${td} text-muted`}>{e.seq}</td><td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(e.at)}</td><td className={td}>{e.action.toLowerCase()}</td>
                  <td className={td}>{e.actor_name ?? "System"}</td><td className={`${td} text-ink-2`}>{e.position_title ?? "—"}{e.authority === "ACTING" ? " (acting)" : ""}</td><td className={`${td} text-ink-2`}>{e.note ?? ""}</td></tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {reporter && (r.status === "DRAFT" || r.status === "RETURNED") && (
            <Card title={r.status === "RETURNED" ? "Correct and resubmit" : "Submit"}>
              <ActionForm action={reportStepAction}>
                <Hidden name="reportId" value={r.id} /><Hidden name="step" value="SUBMIT" />
                {r.status === "RETURNED" && <><TextArea label="Corrected summary" name="summary" rows={5} maxLength={2000} defaultValue={r.summary} /><TextArea label="Outstanding matters" name="outstanding" rows={3} maxLength={1000} defaultValue={r.outstanding ?? ""} /></>}
                <Submit>{r.status === "RETURNED" ? "Resubmit" : "Submit to designated recipients"}</Submit>
              </ActionForm>
            </Card>
          )}
          {r.status === "SUBMITTED" && mine.map((x) => (
            <Card key={x.id} title={`As ${x.title}`} subtitle={`${x.recipient_kind.toLowerCase()} recipient · ${RECIPIENT_STATUS[x.status].toLowerCase()}`}>
              {x.status === "PENDING" && can(x.position_id, "ACKNOWLEDGE") && (
                <ActionForm action={reportStepAction}><Hidden name="reportId" value={r.id} /><Hidden name="recipientId" value={x.id} /><Hidden name="step" value="ACKNOWLEDGE" /><Submit>Acknowledge receipt</Submit></ActionForm>
              )}
              {x.status === "ACKNOWLEDGED" && can(x.position_id, "REVIEW_REPORT") && (
                <ActionForm action={reportStepAction}>
                  <Hidden name="reportId" value={r.id} /><Hidden name="recipientId" value={x.id} />
                  <TextArea label="Review note" name="note" rows={2} maxLength={500} hint={x.recipient_kind === "PARALLEL" ? "A parallel recipient records its own review; it does not return the report." : "Required when returning for correction."} />
                  <div className="flex flex-wrap gap-2">
                    <Submit name="step" value="NOTED" variant="secondary">Noted</Submit>
                    <Submit name="step" value="RECOMMENDED" variant="secondary">Recommend</Submit>
                    {x.recipient_kind !== "PARALLEL" && <Submit name="step" value="RETURNED" variant="danger">Return for correction</Submit>}
                  </div>
                </ActionForm>
              )}
              {x.status === "REVIEWED" && x.recipient_kind !== "PARALLEL" && can(x.position_id, "REVIEW_REPORT") && (
                <ActionForm action={reportStepAction}>
                  <Hidden name="reportId" value={r.id} /><Hidden name="recipientId" value={x.id} />
                  <TextArea label="Note (optional)" name="note" rows={2} maxLength={500} />
                  <div className="flex flex-wrap gap-2"><Submit name="step" value="FORWARD">Forward to next superior</Submit><Submit name="step" value="CLOSE" variant="secondary">Close report</Submit></div>
                </ActionForm>
              )}
              {(x.status === "REVIEWED" && x.recipient_kind === "PARALLEL") || x.status === "FORWARDED" ? <p className="text-sm text-ink-2">Your office has completed its part.</p> : null}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
