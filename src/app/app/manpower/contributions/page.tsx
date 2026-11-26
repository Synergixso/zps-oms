import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { myContributions } from "@/server/domain/manpower";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Unit contributions" };

export default async function ContributionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "manpower.contribute"))) return <AccessDenied what="unit contributions" />;
  const { status = "OPEN" } = await searchParams;
  const rows = await myContributions(getDb(), actor, status === "OPEN" ? "OPEN" : undefined);
  return (
    <>
      <PageHeader eyebrow="Manpower" title="My unit's contributions" description="Manpower requests that ask your unit (or units below it) to contribute personnel. Select eligible officers from the registry and submit." />
      <nav className="mb-3 flex gap-1" aria-label="Filter">
        {[["OPEN", "Open"], ["ALL", "All"]].map(([k, l]) => <Link key={k} href={`?status=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === k ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{l}</Link>)}
      </nav>
      <Card bodyClass="p-0">
        <Table head={["Request", "Contributing unit", "Required", "Selected", "Commences", "Status"]} empty="No contribution requests.">
          {rows.map((c) => (
            <tr key={c.id}>
              <td className={td}><Link href={`/app/manpower/contributions/${c.id}`} className="font-semibold text-zp-blue hover:underline">{c.request_ref}</Link><span className="block text-xs text-muted">{c.purpose}</span></td>
              <td className={td}>{c.unit_name}{c.rank_note && <span className="block text-xs text-muted">{c.rank_note}</span>}</td>
              <td className={`${td} tabular-nums`}>{c.required_count}</td>
              <td className={`${td} tabular-nums`}>{c.entries}</td>
              <td className={td}>{fmtDate(c.commencement_date)}</td>
              <td className={td}><Badge status={c.status === "ACCEPTED" ? "APPROVED" : c.status} label={c.status.toLowerCase()} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
