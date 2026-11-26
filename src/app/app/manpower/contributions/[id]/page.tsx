import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { eligibleForContribution, getContribution, requestHistory, rosterIndex } from "@/server/domain/manpower";
import { hasPermission } from "@/server/domain/policy";
import { DISPOSITIONS } from "@/server/domain/personnel";
import { addEntriesAction, contributionWorkflowAction, removeEntryAction, reuseListAction } from "@/server/actions/personnel";
import { Badge, Card, DL, Notice, PageHeader, Table, Timeline, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea } from "@/components/forms";

export const metadata = { title: "Contribution" };

export default async function ContributionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const actor = await requireActor();
  const db = getDb();
  const { contribution: c, entries, canEdit, canRecall, canReview } = await loadOr404(() => getContribution(db, actor, id));
  const [eligible, history, pastRosters] = await Promise.all([
    canEdit ? eligibleForContribution(db, actor, id, q) : Promise.resolve([]),
    requestHistory(db, "manpower_contribution", id),
    canEdit && hasPermission(actor, "roster.view") ? rosterIndex(db, actor, "APPROVED,FINALISED,SUPERSEDED") : Promise.resolve([]),
  ]);
  const room = c.required_count - entries.length;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/manpower/contributions" className="text-zp-blue hover:underline">← Contributions</Link></p>
      <PageHeader eyebrow={`${c.request_ref} · contribution`} title={c.unit_name} description={<span className="flex gap-2"><Badge status={c.status === "ACCEPTED" ? "APPROVED" : c.status} label={c.status.toLowerCase()} /><span className="text-sm">{entries.length} of {c.required_count} selected</span></span>} />
      {c.status === "RETURNED" && c.review_comment && <div className="mb-4"><Notice tone="warn" title="Returned for correction">{c.review_comment}</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Requirement">
            <DL items={[["Request", <Link key="r" href={`/app/manpower/${c.request_id}`} className="text-zp-blue hover:underline">{c.request_ref} — {c.purpose}</Link>], ["Officers required", String(c.required_count)], ["Rank / category note", c.rank_note ?? "—"], ["Submitted", c.submitted_at ? `${c.submitted_by_name}, ${fmtDateTime(c.submitted_at)}` : "—"], ["Reviewed", c.reviewed_at ? `${c.reviewed_by_name}, ${fmtDateTime(c.reviewed_at)}` : "—"]]} />
          </Card>
          <Card title="Selected officers" subtitle="Eligibility is re-checked now, at submission and again when the roster is built" bodyClass="p-0">
            <Table head={["Officer", "Rank", "Home unit", "Eligibility", ""]} empty="No officers selected yet.">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={td}><span className="font-semibold">{e.full_name}</span><span className="block font-mono text-xs text-muted">{e.service_number} · {e.personnel_ref}</span></td>
                  <td className={td}>{e.rank_name}</td>
                  <td className={td}>{e.home_unit_name}</td>
                  <td className={td}>{e.eligibility.eligible ? <Badge status="APPROVED" label="eligible" /> : <span className="text-xs font-semibold text-err">{e.eligibility.reasons.join("; ")}</span>}</td>
                  <td className={td}>{canEdit && <ActionForm action={removeEntryAction}><Hidden name="id" value={c.id} /><Hidden name="entryId" value={e.id} /><Submit variant="secondary">Remove</Submit></ActionForm>}</td>
                </tr>
              ))}
            </Table>
          </Card>
          {canEdit && (
            <Card title="Eligible officers in your unit" subtitle={room > 0 ? `Select up to ${room} more` : "Requirement filled"}>
              <form method="get" className="mb-3 flex gap-2"><input name="q" defaultValue={q} placeholder="Search name or service number" className="block w-full rounded-md border border-line-2 px-3 py-2 text-sm" /><button className="rounded-md border border-line-2 px-3 text-sm font-semibold">Search</button></form>
              {eligible.length === 0 ? <p className="text-sm text-muted">No eligible officers found (serving, available, not already assigned or offered for this request).</p> : (
                <ActionForm action={addEntriesAction} className="space-y-3">
                  <Hidden name="id" value={c.id} />
                  <div className="max-h-[360px] divide-y divide-line overflow-y-auto rounded-md border border-line">
                    {eligible.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                        <input type="checkbox" name="personnelId" value={p.id} className="h-4 w-4 accent-zp-green" />
                        <span className="flex-1"><span className="font-semibold">{p.rank_name} {p.full_name}</span><span className="block font-mono text-xs text-muted">{p.service_number} · {p.home_unit_name} · {DISPOSITIONS[p.disposition_status as keyof typeof DISPOSITIONS]}</span></span>
                      </label>
                    ))}
                  </div>
                  <Submit>Add selected officers</Submit>
                </ActionForm>
              )}
            </Card>
          )}
          <Card title="Submission history"><Timeline items={history.map((h) => ({ key: String(h.seq), title: h.action.toLowerCase().replace(/^\w/, (x) => x.toUpperCase()), meta: `${h.actor_name} · ${fmtDateTime(h.created_at)}`, body: h.comment ?? undefined }))} /></Card>
        </div>
        <div className="space-y-4">
          {canEdit && (
            <Card title="Submit contribution">
              <ActionForm action={contributionWorkflowAction}>
                <Hidden name="id" value={c.id} />
                <p className="text-sm text-ink-2">{entries.length} officer(s) will be submitted for review by the requesting office.</p>
                <Submit name="action" value="SUBMIT">Submit contribution</Submit>
              </ActionForm>
            </Card>
          )}
          {canRecall && (
            <Card title="Revise before acceptance">
              <ActionForm action={contributionWorkflowAction}><Hidden name="id" value={c.id} /><Submit name="action" value="RECALL" variant="secondary">Recall for revision</Submit></ActionForm>
            </Card>
          )}
          {canReview && (
            <Card title="Review contribution">
              <ActionForm action={contributionWorkflowAction}>
                <Hidden name="id" value={c.id} />
                <TextArea label="Comment" name="comment" rows={2} hint="Required to return." />
                <div className="flex gap-2"><Submit name="action" value="ACCEPT">Accept</Submit><Submit name="action" value="RETURN" variant="danger">Return</Submit></div>
              </ActionForm>
            </Card>
          )}
          {canEdit && pastRosters.length > 0 && (
            <Card title="Reuse a previous list" subtitle="Every officer is revalidated; ineligible officers are skipped">
              <ActionForm action={reuseListAction}>
                <Hidden name="id" value={c.id} />
                <Select label="Approved roster" name="rosterId" required placeholder="Select roster" options={pastRosters.map((r) => ({ value: r.id, label: `${r.reference} v${r.version_no} (${r.entries} officers)` }))} />
                <Submit variant="secondary">Load and revalidate</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
