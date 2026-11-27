import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { commandOverview, listDirectives, listReports, DIRECTIVE_STATUS, REPORT_STATUS, POSITION_TYPES } from "@/server/domain/command";
import { Badge, ButtonLink, Card, Notice, PageHeader, Stat, Table, td, fmtDate } from "@/components/ui";
import { COMMAND_BOUNDARY, NoOffice, OfficesHeld } from "./shared";

export const metadata = { title: "Command overview" };

/** Command overview for the actor's offices (the IG's National Command Overview, DIG Operations' Operations Command Dashboard, …). */
export default async function CommandOverviewPage() {
  const actor = await requireActor();
  const db = getDb();
  const o = await commandOverview(db, actor);
  if (!o) return (<><PageHeader eyebrow="Command and reporting" title="Command overview" /><NoOffice /></>);
  const top = o.held.find((h) => h.positionType === "IG");
  const title = top ? "National Command Overview" : o.held[0].positionType === "DIG_OPERATIONS" ? "Operations Command Dashboard" : `${POSITION_TYPES[o.held[0].positionType]?.label ?? o.held[0].title} — command and reporting`;
  const [received, inbox] = await Promise.all([listDirectives(db, actor, { box: "received" }), listReports(db, actor, { box: "inbox" })]);
  const openReceived = received.filter((d) => ["ISSUED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(d.status)).slice(0, 8);
  const toReview = inbox.filter((r) => r.status === "SUBMITTED" && /PENDING|ACKNOWLEDGED/.test(r.my_status ?? "")).slice(0, 8);
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title={title}
        description={top ? "The Inspector General of Police is the highest command authority: directives start here and flow down the configured chain; status reports arrive here through the executive reporting chain. No office can address an instruction to the IG."
          : "Directives you have received and issued, reports awaiting your review, and the offices you hold."}
        actions={<><ButtonLink href="/app/command/reports/new">New status report</ButtonLink><ButtonLink href="/app/command/directives/new" variant="primary">Issue a directive</ButtonLink></>} />
      <div className="mb-4 space-y-3">
        <Card title="Offices you hold"><OfficesHeld held={o.held} /></Card>
        <Notice tone="info">{COMMAND_BOUNDARY}</Notice>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="To acknowledge" value={o.toAcknowledge} href="/app/command/directives?status=ISSUED" />
        <Stat label="Open directives received" value={o.openReceived} href="/app/command/directives" />
        <Stat label="Overdue" value={o.overdue} href="/app/command/directives" />
        <Stat label="Issued, awaiting closure" value={o.openIssued} href="/app/command/directives/issued" />
        <Stat label="Reports to act on" value={o.reportsToAct} href="/app/command/reports" />
        <Stat label="Open conflicts" value={o.conflicts} href="/app/command/conflicts" />
      </div>
      {o.returned > 0 && <div className="mb-4"><Notice tone="warn">{o.returned} of your reports {o.returned === 1 ? "was" : "were"} returned for correction. <Link className="underline" href="/app/command/reports/submitted?status=RETURNED">Open them</Link>.</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Open directives received" bodyClass="p-0">
          <Table head={["Reference", "Subject", "From", "Status", "Due"]} empty="No open directives addressed to your offices.">
            {openReceived.map((d) => (
              <tr key={d.id}>
                <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/directives/${d.id}`}>{d.reference}</Link></td>
                <td className={td}>{d.subject}</td><td className={`${td} text-ink-2`}>{d.issuer_title}</td>
                <td className={td}><Badge status={d.status} label={DIRECTIVE_STATUS[d.status]} /></td><td className={`${td} text-muted`}>{d.due_date ? fmtDate(d.due_date) : "—"}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title={top ? "Reports awaiting executive review" : "Reports awaiting your acknowledgement or review"} bodyClass="p-0">
          <Table head={["Reference", "From", "Category", "Status"]} empty="No reports are waiting for your offices.">
            {toReview.map((r) => (
              <tr key={r.id}>
                <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/reports/${r.id}`}>{r.reference}</Link></td>
                <td className={td}>{r.reporter_title}</td><td className={`${td} text-ink-2`}>{r.category.replace(/_/g, " ").toLowerCase()}</td>
                <td className={td}><Badge status={r.status} label={REPORT_STATUS[r.status]} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
