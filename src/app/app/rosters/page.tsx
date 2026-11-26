import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ROSTER_STATUS_LABEL, rosterIndex } from "@/server/domain/manpower";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Rosters" };

export default async function RostersPage() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "roster.view"))) return <AccessDenied what="rosters" />;
  const rows = await rosterIndex(getDb(), actor);
  return (
    <>
      <PageHeader eyebrow="Manpower" title="Rosters and approved personnel lists" description="Consolidated rosters built from approved contributions. Historical versions are kept and can be retrieved at any time." />
      <Card bodyClass="p-0">
        <Table head={["Request", "Version", "Duty area", "Officers", "Status", "Compiled", "Approved"]} empty="No rosters in your scope.">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}><Link href={`/app/manpower/${r.request_id}`} className="font-mono text-xs text-zp-blue hover:underline">{r.reference}</Link><span className="block text-xs text-muted">{r.purpose}</span></td>
              <td className={td}><Link href={`/app/rosters/${r.id}`} className="font-semibold text-zp-blue hover:underline">Version {r.version_no}</Link></td>
              <td className={td}>{r.area_name ?? "—"}</td>
              <td className={`${td} tabular-nums`}>{r.entries}</td>
              <td className={td}><Badge status={r.status === "FINALISED" ? "COMPLETED" : r.status} label={ROSTER_STATUS_LABEL[r.status]} /></td>
              <td className={td}>{fmtDate(r.created_at)}</td>
              <td className={td}>{fmtDate(r.approved_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
