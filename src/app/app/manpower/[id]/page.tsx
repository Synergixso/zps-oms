import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { approvalUnitFor, can } from "@/server/domain/policy";
import { MPR_CATEGORIES, MPR_STATUS_LABEL, ROSTER_STATUS_LABEL, getManpowerRequest, listRosters, requestContributions, requestHistory } from "@/server/domain/manpower";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { selectableAreas } from "@/server/domain/assignments";
import { buildRosterAction, manpowerWorkflowAction, removeRequirementAction, setRequirementAction, updateManpowerAction } from "@/server/actions/personnel";
import { AccessDenied, Badge, Card, DL, PageHeader, Table, Timeline, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { RequestFields } from "../request-form";

export const metadata = { title: "Manpower request" };

export default async function ManpowerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "manpower.view"))) return <AccessDenied what="manpower requests" />;
  const db = getDb();
  const m = await loadOr404(() => getManpowerRequest(db, actor, id));
  const [contribs, rosters, history] = await Promise.all([requestContributions(db, actor, id), listRosters(db, actor, id), requestHistory(db, "manpower_request", id)]);
  const originator = can(actor, "manpower.create", m.requesting_unit_id);
  const reviewer = can(actor, "manpower.review", m.requesting_unit_id);
  const approver = m.requested_by !== actor.userId && !!(await approvalUnitFor(db, actor, "MANPOWER", m.approval_unit_id));
  const builder = can(actor, "roster.build", m.requesting_unit_id);
  const editable = originator && ["DRAFT", "RETURNED"].includes(m.status);
  const distributing = reviewer && m.status === "APPROVED";
  const [units, areas, approvalUnits] = await Promise.all([
    distributing ? scopedUnits(db, actor, "manpower.review") : Promise.resolve([]),
    editable ? selectableAreas(db) : Promise.resolve([]),
    editable ? all<{ id: string; name: string }>(db, "SELECT o.id, o.name FROM org_unit_closure c JOIN org_units o ON o.id = c.ancestor_id WHERE c.descendant_id = ? ORDER BY c.depth", m.requesting_unit_id) : Promise.resolve([]),
  ]);
  const openRoster = rosters.find((r) => ["DRAFT", "AMENDED", "SUBMITTED", "REVIEWED"].includes(r.status));
  const accepted = contribs.filter((c) => c.status === "ACCEPTED").length;
  const can_ = (a: string) => ({
    SUBMIT: originator && ["DRAFT", "RETURNED"].includes(m.status),
    CANCEL: originator && ["DRAFT", "RETURNED", "SUBMITTED"].includes(m.status),
    TAKE_REVIEW: reviewer && m.requested_by !== actor.userId && m.status === "SUBMITTED",
    RECOMMEND: reviewer && m.requested_by !== actor.userId && m.status === "UNDER_REVIEW",
    RETURN: (reviewer || approver) && ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"].includes(m.status),
    APPROVE: approver && ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"].includes(m.status),
    REJECT: approver && ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"].includes(m.status),
  })[a];
  const actions: Array<[string, string, "primary" | "secondary" | "danger"]> = [
    ["SUBMIT", m.status === "RETURNED" ? "Resubmit" : "Submit", "primary"], ["TAKE_REVIEW", "Take for review", "secondary"], ["RECOMMEND", "Recommend", "primary"],
    ["APPROVE", "Approve", "primary"], ["RETURN", "Return for correction", "secondary"], ["REJECT", "Reject", "danger"], ["CANCEL", "Cancel request", "danger"],
  ];
  const available = actions.filter(([a]) => can_(a));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/manpower" className="text-zp-blue hover:underline">← Manpower requests</Link></p>
      <PageHeader eyebrow={`${m.reference} · ${MPR_CATEGORIES[m.category]}`} title={m.purpose} description={<Badge status={m.status} label={MPR_STATUS_LABEL[m.status]} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Request">
            <DL items={[
              ["Reference", m.reference], ["Requesting unit", m.requesting_unit_name], ["Requesting officer", m.requested_by_name], ["Category", MPR_CATEGORIES[m.category]],
              ["Duty-area reference", m.area_name ?? "—"], ["Required personnel", String(m.total_required)], ["Personnel categories", m.personnel_categories],
              ["Proposed commencement", fmtDate(m.commencement_date)], ["Proposed duration", `${m.duration_days} days`], ["Approval authority", m.approval_unit_name],
              ["Submitted", fmtDateTime(m.submitted_at)], ["Decided", fmtDateTime(m.decided_at)], ["Justification", m.justification],
            ]} />
          </Card>
          <Card title="Contributions from units" subtitle={`${m.allocated} of ${m.total_required} allocated · ${m.contributed} officers offered · ${accepted} unit(s) accepted`} bodyClass="p-0">
            <Table head={["Unit", "Required", "Offered", "Status", "Submitted", ""]} empty={m.status === "APPROVED" ? "No contribution requirements yet." : "Requirements are distributed after approval."}>
              {contribs.map((c) => (
                <tr key={c.id}>
                  <td className={td}><Link href={`/app/manpower/contributions/${c.id}`} className="font-semibold text-zp-blue hover:underline">{c.unit_name}</Link>{c.rank_note && <span className="block text-xs text-muted">{c.rank_note}</span>}</td>
                  <td className={`${td} tabular-nums`}>{c.required_count}</td>
                  <td className={`${td} tabular-nums`}>{c.entries}</td>
                  <td className={td}><Badge status={c.status === "ACCEPTED" ? "APPROVED" : c.status} label={c.status.toLowerCase()} />{c.revision > 1 && <span className="block text-xs text-muted">revision {c.revision}</span>}</td>
                  <td className={td}>{c.submitted_at ? `${c.submitted_by_name}, ${fmtDate(c.submitted_at)}` : "—"}</td>
                  <td className={td}>
                    {distributing && c.status === "PENDING" && Number(c.entries) === 0 && (
                      <ActionForm action={removeRequirementAction}><Hidden name="id" value={m.id} /><Hidden name="contributionId" value={c.id} /><Submit variant="secondary">Remove</Submit></ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Rosters" subtitle="Every amendment of an approved roster is a new version" bodyClass="p-0">
            <Table head={["Version", "Status", "Officers", "Issues", "Compiled", "Approved"]} empty="No roster yet.">
              {rosters.map((r) => (
                <tr key={r.id}>
                  <td className={td}><Link href={`/app/rosters/${r.id}`} className="font-semibold text-zp-blue hover:underline">Version {r.version_no}</Link>{r.amendment_reason && <span className="block text-xs text-muted">Amendment: {r.amendment_reason}</span>}</td>
                  <td className={td}><Badge status={r.status === "FINALISED" ? "COMPLETED" : r.status} label={ROSTER_STATUS_LABEL[r.status]} /></td>
                  <td className={`${td} tabular-nums`}>{r.entries}</td>
                  <td className={`${td} tabular-nums ${Number(r.issues) ? "font-semibold text-err" : ""}`}>{r.issues}</td>
                  <td className={td}>{r.created_by_name}<span className="block text-xs text-muted">{fmtDate(r.created_at)}</span></td>
                  <td className={td}>{fmtDate(r.approved_at)}</td>
                </tr>
              ))}
            </Table>
            {builder && m.status === "APPROVED" && !openRoster && !rosters.some((r) => ["APPROVED", "FINALISED"].includes(r.status)) && (
              <div className="border-t border-line p-4">
                <ActionForm action={buildRosterAction}>
                  <Hidden name="requestId" value={m.id} />
                  <p className="text-sm text-ink-2">Build a consolidated roster from the {accepted} accepted contribution(s). Officers are taken from the registry; nothing is retyped.</p>
                  <Submit>Build roster from accepted contributions</Submit>
                </ActionForm>
              </div>
            )}
          </Card>
          <Card title="Workflow history">
            <Timeline items={history.map((h) => ({ key: String(h.seq), title: h.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), meta: `${h.actor_name}${h.org_name ? ` · ${h.org_name}` : ""} · ${fmtDateTime(h.created_at)}${h.to_status ? ` · ${MPR_STATUS_LABEL[h.from_status ?? ""] ?? "—"} → ${MPR_STATUS_LABEL[h.to_status] ?? h.to_status}` : ""}`, body: h.comment ?? undefined }))} />
          </Card>
        </div>
        <div className="space-y-4">
          {available.length > 0 && (
            <Card title="Actions">
              <ActionForm action={manpowerWorkflowAction}>
                <Hidden name="id" value={m.id} />
                <TextArea label="Comment" name="comment" rows={2} hint="Required to return or reject." />
                <div className="flex flex-wrap gap-2">{available.map(([a, l, v]) => <Submit key={a} name="action" value={a} variant={v} confirm={a === "REJECT" || a === "CANCEL" ? `${l}?` : undefined}>{l}</Submit>)}</div>
              </ActionForm>
            </Card>
          )}
          {distributing && (
            <Card title="Request a contribution" subtitle={`${m.total_required - Number(m.allocated)} officer(s) still to allocate`}>
              <ActionForm action={setRequirementAction} resetOnSuccess>
                <Hidden name="id" value={m.id} />
                <Select label="Contributing unit" name="unitId" required placeholder="Select unit" options={unitOptions(units)} />
                <TextField label="Officers required" name="count" type="number" required />
                <TextField label="Rank / category note" name="rankNote" />
                <Submit>Send requirement</Submit>
              </ActionForm>
            </Card>
          )}
          {editable && (
            <Card title="Edit request">
              <ActionForm action={updateManpowerAction}>
                <Hidden name="id" value={m.id} />
                <RequestFields m={m} units={[]} approvalUnits={approvalUnits.map((u) => ({ value: u.id, label: u.name }))} areas={areas.map((a) => ({ value: a.id, label: a.name }))} />
                <Submit variant="secondary">Save changes</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
