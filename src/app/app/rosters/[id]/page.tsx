import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ROSTER_STATUS_LABEL, getRoster, requestHistory } from "@/server/domain/manpower";
import { listPersonnel } from "@/server/domain/personnel";
import { amendRosterAction, rosterEntryAction, rosterWorkflowAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Table, Timeline, td, fmtDateTime, btnSecondary } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Roster" };

export default async function RosterDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ group?: string; q?: string }> }) {
  const { id } = await params;
  const { group = "unit", q } = await searchParams;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "roster.view"))) return <AccessDenied what="rosters" />;
  const db = getDb();
  const r = await loadOr404(() => getRoster(db, actor, id));
  const v = r.version;
  const history = await requestHistory(db, "roster", id);
  const issues = r.entries.filter((e) => e.issues).length;
  const candidates = r.can.edit && q ? (await listPersonnel(db, actor, { q, employment: "SERVING", pageSize: 30 })).rows.filter((p) => !r.entries.some((e) => e.personnel_id === p.id)) : [];
  const groups = new Map<string, typeof r.entries>();
  for (const e of r.entries) {
    const key = group === "rank" ? e.rank_name : group === "contributor" ? e.contributor_unit_name ?? "Manual additions" : e.home_unit_name;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const ordered = group === "rank" ? [...groups.entries()].sort((a, b) => b[1][0].seniority - a[1][0].seniority) : [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const workflow: Array<[string, string, boolean, "primary" | "secondary" | "danger"]> = [
    ["SUBMIT", "Submit for review", r.can.submit, "primary"],
    ["REVIEW", "Record review", r.can.review, "primary"],
    ["APPROVE", "Approve roster", r.can.approve, "primary"],
    ["FINALISE", r.request.area_name ? "Finalise and create assignments" : "Finalise roster", r.can.finalise, "primary"],
    ["RETURN", "Return for correction", r.can.ret, "secondary"],
    ["WITHDRAW", "Withdraw draft", r.can.edit, "danger"],
  ];
  const avail = workflow.filter((w) => w[2]);
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/app/manpower/${r.request.id}`} className="text-zp-blue hover:underline">← {r.request.reference}</Link></p>
      <PageHeader
        eyebrow={`${r.request.reference} · roster version ${v.version_no}`}
        title={r.request.purpose}
        description={<span className="flex flex-wrap items-center gap-2"><Badge status={v.status === "FINALISED" ? "COMPLETED" : v.status} label={ROSTER_STATUS_LABEL[v.status]} /><span className="text-sm">{r.entries.length} officers{issues ? ` · ${issues} with issues` : ""}</span></span>}
        actions={r.can.export ? <><a href={`/app/rosters/${id}/pdf`} className={btnSecondary}>Download PDF</a><Link href={`/app/rosters/${id}/print`} className={btnSecondary}>Print view</Link><a href={`/app/rosters/${id}/export?format=xlsx`} className={btnSecondary}>Download Excel</a><a href={`/app/rosters/${id}/export`} className={btnSecondary}>CSV</a></> : undefined}
      />
      {issues > 0 && <div className="mb-4"><Notice tone="err" title={`${issues} integrity issue(s)`}>Duplicates, conflicting assignments, ineligible or outdated records must be resolved before the roster can be submitted or approved.</Notice></div>}
      {v.status === "SUPERSEDED" && <div className="mb-4"><Notice tone="info">This version was superseded by a later approved amendment. It is kept unchanged for the record.</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card
            title="Officers"
            action={<nav className="flex gap-1 text-xs" aria-label="Group by">{[["unit", "Home unit"], ["rank", "Rank"], ["contributor", "Contributing unit"]].map(([k, l]) => <Link key={k} href={`?group=${k}`} className={`rounded px-2 py-1 font-semibold ${group === k ? "bg-zp-green text-white" : "border border-line-2"}`}>{l}</Link>)}</nav>}
            bodyClass="p-0"
          >
            {ordered.map(([name, list]) => (
              <div key={name}>
                <p className="border-y border-line bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-2">{name} ({list.length})</p>
                <Table head={["Service no.", "Officer", "Rank", "Source", "Validation", ""]}>
                  {list.map((e) => (
                    <tr key={e.id} className={e.issues ? "bg-err-bg/40" : ""}>
                      <td className={`${td} font-mono text-xs`}><Link href={`/app/personnel/${e.personnel_id}`} className="text-zp-blue hover:underline">{e.service_number}</Link></td>
                      <td className={td}>{e.full_name}{e.current_name !== e.full_name && <span className="block text-xs text-warn">Registry now: {e.current_name}</span>}</td>
                      <td className={td}>{e.rank_name}</td>
                      <td className={td}>{e.source.toLowerCase()}{e.contributor_unit_name && <span className="block text-xs text-muted">{e.contributor_unit_name}</span>}</td>
                      <td className={td}>{e.issues ? <span className="text-xs font-semibold text-err">{e.issues}</span> : <Badge status="APPROVED" label="valid" />}</td>
                      <td className={td}>
                        {r.can.edit && (
                          <ActionForm action={rosterEntryAction} className="space-y-1">
                            <Hidden name="id" value={id} /><Hidden name="op" value="remove" /><Hidden name="entryId" value={e.id} />
                            <input name="reason" placeholder="Reason" className="w-28 rounded border border-line-2 px-2 py-1 text-xs" />
                            <Submit variant="secondary">Remove</Submit>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            ))}
            {!r.entries.length && <p className="p-6 text-center text-sm text-muted">No officers on this roster.</p>}
          </Card>
          <Card title="Version history"><Timeline items={history.map((h) => ({ key: String(h.seq), title: h.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), meta: `${h.actor_name} · ${fmtDateTime(h.created_at)}`, body: h.comment ?? undefined }))} /></Card>
        </div>
        <div className="space-y-4">
          <Card title="Roster record">
            <DL items={[
              ["Version", String(v.version_no)], ["Based on", v.based_on_id ? <Link key="b" href={`/app/rosters/${v.based_on_id}`} className="text-zp-blue hover:underline">earlier version</Link> : "—"],
              ["Compiled", `${v.created_by_name}, ${fmtDateTime(v.created_at)}`], ["Reviewed", v.reviewed_by_name ? `${v.reviewed_by_name}, ${fmtDateTime(v.reviewed_at)}` : "—"],
              ["Approved", v.approved_by_name ? `${v.approved_by_name}, ${fmtDateTime(v.approved_at)}` : "—"], ["Finalised", v.finalised_by_name ? `${v.finalised_by_name}, ${fmtDateTime(v.finalised_at)}` : "—"],
              ["Amendment reason", v.amendment_reason ?? "—"],
            ]} />
          </Card>
          {avail.length > 0 && (
            <Card title="Workflow">
              <ActionForm action={rosterWorkflowAction}>
                <Hidden name="id" value={id} />
                <TextArea label="Comment" name="comment" rows={2} hint="Required to return." />
                <div className="flex flex-wrap gap-2">{avail.map(([a, l, , variant]) => <Submit key={a} name="action" value={a} variant={variant} confirm={a === "FINALISE" ? "Finalise this roster? Assignments will be created for every officer." : a === "WITHDRAW" ? "Withdraw this draft?" : undefined}>{l}</Submit>)}</div>
              </ActionForm>
            </Card>
          )}
          {r.can.edit && (
            <Card title="Manual adjustment" subtitle="Authorised additions are validated like any other entry">
              <ActionForm action={rosterEntryAction} className="mb-3">
                <Hidden name="id" value={id} /><Hidden name="op" value="revalidate" />
                <Submit variant="secondary">Revalidate all entries now</Submit>
              </ActionForm>
              <form method="get" className="mb-3 flex gap-2"><input type="hidden" name="group" value={group} /><input name="q" defaultValue={q} placeholder="Find officer" className="block w-full rounded-md border border-line-2 px-3 py-2 text-sm" /><button className="rounded-md border border-line-2 px-3 text-sm font-semibold">Find</button></form>
              {candidates.length > 0 && (
                <ActionForm action={rosterEntryAction} resetOnSuccess>
                  <Hidden name="id" value={id} /><Hidden name="op" value="add" />
                  <Select label="Officer" name="personnelId" required placeholder="Select officer" options={candidates.map((p) => ({ value: p.id, label: `${p.rank_name} ${p.surname}, ${p.first_names} — ${p.service_number}` }))} />
                  <TextField label="Authority / reason" name="reason" required />
                  <Submit>Add to roster</Submit>
                </ActionForm>
              )}
            </Card>
          )}
          {r.can.amend && (
            <Card title="Amend approved roster" subtitle="Creates a new version; this one is preserved">
              <ActionForm action={amendRosterAction}>
                <Hidden name="id" value={id} />
                <TextArea label="Reason for amendment" name="reason" rows={2} required />
                <Submit variant="secondary">Create amendment</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
