import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { DISPOSITIONS, EMPLOYMENT_LABEL, registryReview } from "@/server/domain/personnel";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Registry review" };

export default async function RegistryReview() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "personnel.edit"))) return <AccessDenied what="the registry review" />;
  const { duplicates, stale } = await registryReview(getDb(), actor);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/personnel" className="text-zp-blue hover:underline">← Personnel register</Link></p>
      <PageHeader eyebrow="Personnel registry" title="Duplicate and incomplete record review" description="Records in your scope that share a name and rank (possible duplicate identities) and records still unverified after 30 days. Open a record to correct, verify or reject it." />
      <div className="space-y-4">
        <Card title={`Possible duplicate identities (${duplicates.length} group${duplicates.length === 1 ? "" : "s"})`} subtitle="Service numbers are unique, so these are different numbers with the same name and rank — confirm each is a different officer" bodyClass="p-0">
          {duplicates.length === 0 ? <div className="p-4"><Notice tone="ok">No possible duplicates in your scope.</Notice></div> : duplicates.map((g) => (
            <div key={g.key}>
              <p className="border-y border-line bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-2">{g.rows[0]?.rank_name} {g.rows[0]?.surname}, {g.rows[0]?.first_names} — {g.rows.length} records</p>
              <Table head={["Reference", "Service number", "Home unit", "Employment", "Disposition", "Verification", "Registered"]}>
                {g.rows.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} font-mono text-xs`}><Link href={`/app/personnel/${p.id}`} className="text-zp-blue hover:underline">{p.personnel_ref}</Link></td>
                    <td className={`${td} font-mono text-xs`}>{p.service_number}</td>
                    <td className={td}>{p.home_unit_name}</td>
                    <td className={td}>{EMPLOYMENT_LABEL[p.employment_status]}</td>
                    <td className={td}>{DISPOSITIONS[p.disposition_status]}</td>
                    <td className={td}><Badge status={p.verification_status === "VERIFIED" ? "APPROVED" : p.verification_status === "REJECTED" ? "REJECTED" : "PENDING"} label={p.verification_status.toLowerCase()} /></td>
                    <td className={td}>{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </Table>
            </div>
          ))}
        </Card>
        <Card title={`Unverified for more than 30 days (${stale.length})`} subtitle="Incomplete-record alert: verify against source records or record why they cannot be verified" bodyClass="p-0">
          <Table head={["Reference", "Officer", "Home unit", "Registered"]} empty="No overdue verifications.">
            {stale.map((p) => (
              <tr key={p.id}>
                <td className={`${td} font-mono text-xs`}><Link href={`/app/personnel/${p.id}`} className="text-zp-blue hover:underline">{p.personnel_ref}</Link></td>
                <td className={td}>{p.rank_name} {p.surname}, {p.first_names}</td>
                <td className={td}>{p.home_unit_name}</td>
                <td className={td}>{fmtDate(p.created_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
