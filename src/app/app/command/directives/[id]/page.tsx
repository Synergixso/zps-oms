import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { directiveAccountability, directiveDetail, instructableOffices, listDirectives, DIRECTIVE_CATEGORY, DIRECTIVE_STATUS, RELATIONSHIP_LABEL } from "@/server/domain/command";
import { directiveStepAction, flagConflictAction, issueDirectiveAction } from "@/server/actions/command";
import { Badge, Card, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { Done } from "../../shared";
import { indent } from "@/components/sizing";

export const metadata = { title: "Directive" };

function F({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-0.5 text-sm">{value}</dd></div>;
}

export default async function DirectivePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const { directive: d, events, tree, parent, conflicts, reports, consolidated, held } = await loadOr404(() => directiveDetail(db, actor, id));
  const acc = await directiveAccountability(db, actor, id);
  const mine = (pos: string, action: string) => held.some((h) => h.positionId === pos && h.actions.includes(action as never));
  const recipient = mine(d.recipient_position_id, "ACKNOWLEDGE") || mine(d.recipient_position_id, "FORWARD_DIRECTIVE");
  const open = ["ISSUED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(d.status);
  const onward = recipient && mine(d.recipient_position_id, "FORWARD_DIRECTIVE") && open && !(d.ack_required && d.status === "ISSUED")
    ? (await instructableOffices(db, actor)).filter((r) => r.fromPositionId === d.recipient_position_id) : [];
  const siblings = recipient && open ? (await listDirectives(db, actor, { box: "received" })).filter((x) => x.id !== d.id && x.recipient_position_id === d.recipient_position_id && x.issuer_position_id !== d.issuer_position_id && ["ISSUED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(x.status)) : [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/command/directives" className="text-zp-blue hover:underline">← Directives</Link></p>
      <PageHeader eyebrow={`Command and reporting · ${DIRECTIVE_CATEGORY[d.category]}`} title={`${d.reference} — ${d.subject}`} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Directive">
            <dl className="grid gap-4 sm:grid-cols-2">
              <F label="Status" value={<Badge status={d.status} label={DIRECTIVE_STATUS[d.status]} />} />
              <F label="Issuing office" value={`${d.issuer_title}${d.authority === "ACTING" ? " (acting)" : ""}`} />
              <F label="Issued by" value={d.issuer_name} />
              <F label="Receiving office" value={`${d.recipient_title} — ${d.recipient_unit}`} />
              <F label="Relationship" value={`${RELATIONSHIP_LABEL[d.relationship_type]}${d.channel ? ` · ${d.channel}` : ""}`} />
              <F label="Effective / due" value={`${fmtDate(d.effective_date)} / ${d.due_date ? fmtDate(d.due_date) : "no due date"}`} />
              <F label="Acknowledgement" value={d.ack_required ? "Required" : "Not required"} />
              <F label="Related record" value={d.related_reference ? `${d.related_type?.replace(/_/g, " ").toLowerCase()} ${d.related_reference}` : "—"} />
              {parent && <F label="Assigned from" value={<Link className="text-zp-blue hover:underline" href={`/app/command/directives/${parent.id}`}>{parent.reference}</Link>} />}
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">General instructions</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{d.instructions}</p>
          </Card>
          <Card title="Accountability record" subtitle="Who originated, issued, holds and has acted on this directive (§13.4); administrative facts only">
            <dl className="grid gap-4 sm:grid-cols-2">
              <F label="Originating officer" value={acc.originating.id === d.id ? `${acc.originating.issuer} — ${acc.originating.office}` : <>{acc.originating.issuer} — {acc.originating.office} (<Link className="font-mono text-zp-blue hover:underline" href={`/app/command/directives/${acc.originating.id}`}>{acc.originating.reference}</Link>)</>} />
              <F label="Issuing authority" value={`${acc.issuing.office} — ${acc.issuing.by}${acc.issuing.authority === "ACTING" ? ` (acting${acc.issuing.actingRef ? `, ${acc.issuing.actingRef}` : ""}${acc.issuing.actingUntil ? `, until ${fmtDate(acc.issuing.actingUntil.slice(0, 10))}` : ""})` : " (substantive)"}`} />
              <F label="Responsible officer" value={acc.responsible.length ? acc.responsible.map((h) => `${h.name}${h.authority === "ACTING" ? " (acting)" : ""}`).join(", ") : `Vacant — ${acc.responsibleOffice}`} />
              <F label="Unit / parent unit" value={`${acc.unit}${acc.parentUnit ? ` / ${acc.parentUnit}` : ""}`} />
              <F label="Issued" value={fmtDateTime(acc.issuedAt)} />
              <F label="Acknowledged" value={acc.acknowledged ? `${fmtDateTime(acc.acknowledged.at)}${acc.acknowledged.by ? ` — ${acc.acknowledged.by}` : ""}` : d.ack_required ? "Not yet" : "Not required"} />
              <F label="Latest progress" value={acc.progress ? `${acc.progress.progress_status.replace("_", " ").toLowerCase()} (${fmtDate(acc.progress.reporting_date)})` : "No report yet"} />
              <F label="Completion" value={acc.completed ? `${fmtDateTime(acc.completed.at)}${acc.completed.by ? ` — ${acc.completed.by}` : ""}${acc.closed ? `; closed ${fmtDateTime(acc.closed.at)}` : ""}` : "Not reported"} />
              <F label="Audit trail" value={acc.auditLink ? <Link className="text-zp-blue hover:underline" href={acc.auditLink}>{acc.auditEvents} audit event(s)</Link> : `${acc.auditEvents} audit event(s)`} />
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Escalation history</h3>
            {acc.escalations.length ? (
              <ul className="mt-1 space-y-0.5 text-sm">{acc.escalations.map((e, i) => <li key={i}><span className="text-muted">{fmtDate(e.at)}</span> · {e.what}{e.count > 1 ? ` (${e.count} recipients)` : ""}</li>)}</ul>
            ) : <p className="mt-1 text-sm text-ink-2">No reminders, escalations or conflicts.</p>}
          </Card>
          <Card title="Assigned onward (consolidated status)" subtitle={Object.entries(consolidated).map(([k, n]) => `${n} ${DIRECTIVE_STATUS[k].toLowerCase()}`).join(" · ") || "Not assigned onward"} bodyClass="p-0">
            <Table head={["Reference", "To", "Status", "Due"]} caption="Directives assigned onward" empty="This directive has not been assigned to a lower level.">
              {tree.map((c) => (
                <tr key={c.id}><td className={`${td} ${indent(c.depth, 16)}`}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/directives/${c.id}`}>{c.reference}</Link></td>
                  <td className={td}>{c.recipient_title}</td><td className={td}><Badge status={c.status} label={DIRECTIVE_STATUS[c.status]} /></td><td className={`${td} text-muted`}>{c.due_date ? fmtDate(c.due_date) : "—"}</td></tr>
              ))}
            </Table>
          </Card>
          <Card title="History" bodyClass="p-0">
            <Table head={["#", "When", "Action", "By", "Office (authority)", "Status", "Note"]} caption="Directive history">
              {events.map((e) => (
                <tr key={e.seq}><td className={`${td} text-muted`}>{e.seq}</td><td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(e.at)}</td><td className={td}>{e.action.toLowerCase()}</td>
                  <td className={td}>{e.actor_name ?? "System"}</td><td className={`${td} text-ink-2`}>{e.position_title ?? "—"}{e.authority === "ACTING" ? " (acting)" : ""}</td>
                  <td className={td}>{DIRECTIVE_STATUS[e.to_status] ?? e.to_status}</td><td className={`${td} text-ink-2`}>{e.note ?? ""}</td></tr>
              ))}
            </Table>
          </Card>
          {(reports.length > 0 || conflicts.length > 0) && (
            <Card title="Reports and conflicts">
              <ul className="space-y-1 text-sm">
                {reports.map((r) => <li key={r.id}>Report <Link className="font-mono text-zp-blue hover:underline" href={`/app/command/reports/${r.id}`}>{r.reference}</Link> · {r.progress_status.replace("_", " ").toLowerCase()} · {r.status.toLowerCase()}</li>)}
                {conflicts.map((c) => <li key={c.id}>Conflict <Link className="font-mono text-zp-blue hover:underline" href={`/app/command/conflicts/${c.id}`}>{c.reference}</Link> · {c.status.toLowerCase()}</li>)}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {recipient && d.status === "ISSUED" && (
            <Card title="Acknowledge receipt"><ActionForm action={directiveStepAction}><Hidden name="id" value={d.id} /><Hidden name="step" value="ACKNOWLEDGE" /><Submit>Acknowledge</Submit></ActionForm></Card>
          )}
          {onward.length > 0 && (
            <Card title="Assign onward" subtitle="To an office directly below yours">
              <ActionForm action={issueDirectiveAction}>
                <Hidden name="parentId" value={d.id} />
                <Select label="Receiving office" name="route" required placeholder="Select office" options={onward.map((r) => ({ value: `${r.fromPositionId}|${r.toPositionId}`, label: `${r.toTitle} (${RELATIONSHIP_LABEL[r.type].toLowerCase()})` }))} />
                <Select label="Category" name="category" required options={Object.entries(DIRECTIVE_CATEGORY).map(([value, label]) => ({ value, label }))} defaultValue={d.category} />
                <TextField label="Subject" name="subject" required maxLength={160} defaultValue={d.subject} />
                <TextArea label="Instructions for the next level" name="instructions" required rows={3} maxLength={2000} />
                <TextField label="Due date (optional)" name="dueDate" type="date" />
                <Submit>Assign onward</Submit>
              </ActionForm>
            </Card>
          )}
          {recipient && open && !(d.ack_required && d.status === "ISSUED") && (
            <Card title="Progress and completion">
              <ActionForm action={directiveStepAction}>
                <Hidden name="id" value={d.id} />
                <TextArea label="Progress note" name="note" rows={2} maxLength={500} />
                <TextField label="Completion report (optional)" name="reportId" placeholder="Report id from Status reports" hint="Submit a status report on this directive first; it then appears under Reports." />
                <div className="flex flex-wrap gap-2"><Submit name="step" value="PROGRESS" variant="secondary">Record progress</Submit><Submit name="step" value="COMPLETE">Report completion</Submit></div>
              </ActionForm>
              <p className="mt-2 text-xs text-muted"><Link className="text-zp-blue underline" href={`/app/command/reports/new?directive=${d.id}`}>Write a status report on this directive</Link></p>
            </Card>
          )}
          {mine(d.issuer_position_id, "CLOSE_DIRECTIVE") && (d.status === "COMPLETED" || open) && (
            <Card title={d.status === "COMPLETED" ? "Close" : "Cancel"}>
              <ActionForm action={directiveStepAction}>
                <Hidden name="id" value={d.id} /><Hidden name="step" value={d.status === "COMPLETED" ? "CLOSE" : "CANCEL"} />
                <TextArea label={d.status === "COMPLETED" ? "Closing note (optional)" : "Reason for cancelling"} name="note" rows={2} maxLength={500} />
                <Submit variant={d.status === "COMPLETED" ? "primary" : "danger"} confirm={d.status === "COMPLETED" ? undefined : "Cancel this directive?"}>{d.status === "COMPLETED" ? "Close directive" : "Cancel directive"}</Submit>
              </ActionForm>
            </Card>
          )}
          {siblings.length > 0 && (
            <Card title="Flag a conflict" subtitle="Another open directive to your office conflicts with this one">
              <ActionForm action={flagConflictAction}>
                <Hidden name="directiveAId" value={d.id} />
                <Select label="Conflicting directive" name="directiveBId" required placeholder="Select directive" options={siblings.map((s) => ({ value: s.id, label: `${s.reference} from ${s.issuer_title}` }))} />
                <TextArea label="Describe the conflict" name="reason" required rows={3} maxLength={500} />
                <p className="text-xs text-muted">The conflict is referred to the nearest common superior office. Nothing is decided automatically; continue with neither until it is decided, unless instructed otherwise.</p>
                <Submit variant="secondary">Refer the conflict</Submit>
              </ActionForm>
            </Card>
          )}
          {!recipient && !mine(d.issuer_position_id, "CLOSE_DIRECTIVE") && <Card title="Read only"><p className="text-sm text-ink-2">You see this directive because you hold an office earlier in its chain. Only the issuing and receiving offices act on it.</p></Card>}
        </div>
      </div>
    </>
  );
}
