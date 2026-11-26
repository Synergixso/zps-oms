import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { MPR_CATEGORIES, MPR_STATUS_LABEL, listManpowerRequests } from "@/server/domain/manpower";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Manpower requests" };

export default async function ManpowerPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "manpower.view"))) return <AccessDenied what="manpower requests" />;
  const { status = "ALL", q } = await searchParams;
  const rows = await listManpowerRequests(getDb(), actor, { status, q });
  const tabs = [["ALL", "All"], ["OPEN", "Open"], ["DRAFT", "Drafts"], ["APPROVED", "Approved"], ["COMPLETED", "Completed"]];
  return (
    <>
      <PageHeader
        eyebrow="Manpower"
        title="Manpower requests"
        description="Requests for additional personnel for national, special or area duties, routed to contributing units and consolidated into rosters."
        actions={
          <>
            {hasPermission(actor, "manpower.contribute") && <ButtonLink href="/app/manpower/contributions">My unit&apos;s contributions</ButtonLink>}
            {hasPermission(actor, "roster.view") && <ButtonLink href="/app/rosters">Rosters</ButtonLink>}
            {hasPermission(actor, "manpower.create") && <ButtonLink href="/app/manpower/new" variant="primary">New manpower request</ButtonLink>}
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Status">
          {tabs.map(([k, l]) => <Link key={k} href={`?status=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === k ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{l}</Link>)}
        </nav>
        <form method="get" className="flex gap-2"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={q} placeholder="Reference or purpose" className="rounded-md border border-line-2 px-3 py-1.5 text-sm" /><button className="rounded-md border border-line-2 px-3 text-sm font-semibold">Search</button></form>
      </div>
      <Card bodyClass="p-0">
        <Table head={["Reference", "Purpose", "Requesting unit", "Required", "Allocated / offered", "Commences", "Status"]} empty="No manpower requests in your scope.">
          {rows.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/60">
              <td className={`${td} font-mono text-xs`}><Link href={`/app/manpower/${m.id}`} className="text-zp-blue hover:underline">{m.reference}</Link></td>
              <td className={td}><Link href={`/app/manpower/${m.id}`} className="font-semibold hover:underline">{m.purpose}</Link><span className="block text-xs text-muted">{MPR_CATEGORIES[m.category]}{m.area_name ? ` · ${m.area_name}` : ""}</span></td>
              <td className={td}>{m.requesting_unit_name}</td>
              <td className={`${td} tabular-nums`}>{m.total_required}</td>
              <td className={`${td} tabular-nums`}>{m.allocated} / {m.contributed}</td>
              <td className={td}>{fmtDate(m.commencement_date)}</td>
              <td className={td}><Badge status={m.status} label={MPR_STATUS_LABEL[m.status]} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
