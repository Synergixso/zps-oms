import { Pager } from "@/components/pager";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { pageTransfers } from "@/server/domain/assignments";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Transfers" };
const LABEL: Record<string, string> = { PENDING_RELEASE: "Awaiting releasing decision", PENDING_ACCEPTANCE: "Awaiting receiving acceptance", COMPLETED: "Completed", REJECTED: "Rejected", CANCELLED: "Withdrawn" };

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "assignment.view"))) return <AccessDenied what="transfers" />;
  const { status = "OPEN", page } = await searchParams;
  const list = await pageTransfers(getDb(), actor, status, { page: Number(page) || 1 });
  const rows = list.rows;
  const tabs = [["OPEN", "Open"], ["COMPLETED", "Completed"], ["REJECTED", "Rejected"], ["ALL", "All"]];
  return (
    <>
      <PageHeader eyebrow="Assignment administration" title="Transfers between operational areas" description="A transfer never overwrites the previous assignment: on acceptance the old assignment is closed and a new one opened, with full history." />
      <nav className="mb-3 flex gap-1" aria-label="Transfer status">
        {tabs.map(([k, l]) => <Link key={k} href={`?status=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === k ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{l}</Link>)}
      </nav>
      <Card bodyClass="p-0">
        <Table head={["Reference", "Officer", "From → to", "Proposed / effective", "Initiated by", "Status"]} empty="No transfers.">
          {rows.map((t) => (
            <tr key={t.id}>
              <td className={`${td} font-mono text-xs`}><Link href={`/app/transfers/${t.id}`} className="text-zp-blue hover:underline">{t.reference}</Link></td>
              <td className={td}><span className="font-semibold">{t.rank_name} {t.full_name}</span><span className="block font-mono text-xs text-muted">{t.service_number}</span></td>
              <td className={td}>{t.from_area_name} → {t.to_area_name}</td>
              <td className={td}>{fmtDate(t.effective_date ?? t.proposed_date)}</td>
              <td className={td}>{t.initiated_by_name}<span className="block text-xs text-muted">{fmtDate(t.initiated_at)}</span></td>
              <td className={td}><Badge status={t.status.startsWith("PENDING") ? "PENDING" : t.status} label={LABEL[t.status]} /></td>
            </tr>
          ))}
        </Table>
        <Pager path="/app/transfers" params={{ status }} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} />
      </Card>
    </>
  );
}
