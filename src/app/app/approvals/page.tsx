import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { approvalInbox, assignmentQueue, listRequests, STATUS_LABEL, type RequestRow } from "@/server/domain/requests";
import { listMaintenance, MAINT_LABEL, maintenanceActions } from "@/server/domain/fleet";
import { listChanges } from "@/server/domain/org";
import { manpowerInbox } from "@/server/domain/manpower";
import { assignmentInbox } from "@/server/domain/assignments";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Approvals & queues" };

function Rows({ rows }: { rows: RequestRow[] }) {
  return (
    <Table head={["Reference", "Subject", "Organisation", "Status", "Submitted", "Due"]} empty="Nothing in this queue.">
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-slate-50">
          <td className={td}><Link href={`/app/requests/${r.id}`} className="font-semibold text-zp-blue hover:underline">{r.reference}</Link></td>
          <td className={td}>{r.title}</td>
          <td className={td}>{r.origin_name}</td>
          <td className={td}><Badge status={r.status} label={r.status === "UNDER_REVIEW" ? `Under review (L${r.current_level})` : STATUS_LABEL[r.status]} /></td>
          <td className={`${td} text-muted`}>{fmtDate(r.submitted_at)}</td>
          <td className={`${td} text-muted`}>{fmtDate(r.due_date)}</td>
        </tr>
      ))}
    </Table>
  );
}

export default async function Approvals() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "request.view", "request.assign", "manpower.view", "manpower.contribute", "assignment.view")) return <AccessDenied what="approval queues" />;
  const db = getDb();
  const inbox = await approvalInbox(db, actor);
  const queue = await assignmentQueue(db, actor);
  // Filters run in SQL over the whole scope, so older items are never missed.
  const myReturned = hasPermission(actor, "request.view") ? await listRequests(db, actor, { status: "RETURNED", mine: true }) : [];
  const overdue = hasPermission(actor, "request.view") ? await listRequests(db, actor, { overdue: true, sort: "due" }) : [];
  const maintAll = hasPermission(actor, "maintenance.view") ? await listMaintenance(db, actor, { open: true }) : [];
  const actionable = await Promise.all(maintAll.map(async (m) => ((await maintenanceActions(db, actor, m)).length > 0 ? m : null)));
  const maint = actionable.filter((m): m is NonNullable<typeof m> => m !== null);
  const mpr = hasPermission(actor, "manpower.view") || hasPermission(actor, "manpower.contribute") ? await manpowerInbox(db, actor) : [];
  const asg = hasPermission(actor, "assignment.view") ? await assignmentInbox(db, actor) : [];
  const orgPending = hasPermission(actor, "org.view") ? (await listChanges(db, actor)).filter((c) => c.status === "SUBMITTED") : [];
  return (
    <>
      <PageHeader eyebrow="Work queues" title="Approvals & queues" description="Items awaiting your decision or action. Approval items appear only where you hold a recorded delegation for that organisation, category and level." />
      <div className="space-y-4">
        {(mpr.length > 0 || hasPermission(actor, "manpower.view")) && (
          <Card title={`Manpower, contributions and rosters (${mpr.length})`} subtitle="Reviews, approvals and contribution requirements for your units" bodyClass="p-0">
            <Table head={["Item", "Reference", "Subject"]} empty="Nothing awaiting you.">
              {mpr.map((m, i) => <tr key={i}><td className={td}><Badge status="PENDING" label={m.kind} /></td><td className={td}><Link href={m.href} className="font-semibold text-zp-blue hover:underline">{m.reference}</Link></td><td className={td}>{m.title}</td></tr>)}
            </Table>
          </Card>
        )}
        {(asg.length > 0 || hasPermission(actor, "assignment.view")) && (
          <Card title={`Assignments, transfers and renewals (${asg.length})`} subtitle="Items needing your delegated decision or receiving acceptance" bodyClass="p-0">
            <Table head={["Item", "Reference", "Officer", "Area"]} empty="Nothing awaiting you.">
              {asg.map((a, i) => <tr key={i}><td className={td}><Badge status="PENDING" label={a.kind} /></td><td className={td}><Link href={a.href} className="font-semibold text-zp-blue hover:underline">{a.reference}</Link></td><td className={td}>{a.full_name}</td><td className={td}>{a.area_name}</td></tr>)}
            </Table>
          </Card>
        )}
        {hasPermission(actor, "request.view") && <Card title={`Administrative requests awaiting my decision (${inbox.length})`} subtitle="Approve, return or reject" bodyClass="p-0"><Rows rows={inbox} /></Card>}
        {(queue.length > 0 || hasPermission(actor, "request.assign")) && (
          <Card title={`Submitted — awaiting assignment (${queue.length})`} subtitle="Assign to a processor to start review" bodyClass="p-0"><Rows rows={queue} /></Card>
        )}
        {myReturned.length > 0 && <Card title={`Returned to me (${myReturned.length})`} bodyClass="p-0"><Rows rows={myReturned} /></Card>}
        {maint.length > 0 && (
          <Card title={`Fleet maintenance requiring my action (${maint.length})`} bodyClass="p-0">
            <Table head={["Reference", "Vehicle", "Organisation", "Stage"]}>
              {maint.map((m) => (
                <tr key={m.id}><td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/fleet/maintenance/${m.id}`}>{m.reference}</Link></td><td className={td}>{m.fleet_ref}</td><td className={td}>{m.org_name}</td><td className={td}><Badge status={m.status} label={MAINT_LABEL[m.status]} /></td></tr>
              ))}
            </Table>
          </Card>
        )}
        {orgPending.length > 0 && (
          <Card title={`Organisational changes pending (${orgPending.length})`} action={<Link href="/app/org/changes" className="text-xs font-semibold text-zp-blue hover:underline">Open</Link>} bodyClass="p-0">
            <Table head={["Reference", "Type", "Proposed by", "Effective"]}>
              {orgPending.map((c) => <tr key={c.id}><td className={`${td} font-semibold`}>{c.reference}</td><td className={td}>{c.change_type.replace(/_/g, " ").toLowerCase()}</td><td className={td}>{c.proposer_name}</td><td className={td}>{fmtDate(c.effective_date)}</td></tr>)}
            </Table>
          </Card>
        )}
        {overdue.length > 0 && <Card title={`Overdue in my scope (${overdue.length})`} subtitle="Administrative escalation list" bodyClass="p-0"><Rows rows={overdue} /></Card>}
      </div>
    </>
  );
}
