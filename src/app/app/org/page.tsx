import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { listOrgUnits, UNIT_TYPE_LABEL } from "@/server/domain/org";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Organisation directory" };

export default async function OrgDirectory({ searchParams }: { searchParams: Promise<{ asAt?: string; inactive?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "org.view")) return <AccessDenied what="the organisation directory" />;
  const sp = await searchParams;
  const asAt = sp.asAt && /^\d{4}-\d{2}-\d{2}$/.test(sp.asAt) ? sp.asAt : undefined;
  const units = await listOrgUnits(getDb(), actor, { asAt, includeInactive: sp.inactive === "1" });
  const groups: Array<[string, typeof units]> = [
    ["Service Headquarters", units.filter((u) => u.unit_type === "SERVICE_HQ" || u.unit_type === "HQ_OFFICE")],
    ["Provincial Police Divisions", units.filter((u) => u.unit_type === "PROVINCIAL_DIVISION")],
    ["Divisional Units and formations", units.filter((u) => u.unit_type === "FORMATION")],
  ];
  return (
    <>
      <PageHeader eyebrow="M01 · Organisation registry" title="Organisation directory" description="Configurable, effective-dated directory. Names and reporting relationships are provisional until validated against the current approved DIG Operations establishment." />
      <div className="mb-4">
        <Notice tone="warn" title="Source-of-truth precedence">
          Current approved internal establishment › signed internal directives › official public pages and organograms › developer assumptions. Districts, stations and posts are
          intentionally not modelled.
        </Notice>
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="asAt" className="block text-xs font-semibold text-ink-2">Directory as at date</label>
          <input id="asAt" name="asAt" type="date" defaultValue={asAt} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="inactive" value="1" defaultChecked={sp.inactive === "1"} /> Include inactive / superseded
        </label>
        <button type="submit" className={btnSecondary}>Show</button>
        {(asAt || sp.inactive) && <Link href="/app/org" className="pb-2 text-sm text-zp-blue hover:underline">Reset to today</Link>}
      </form>
      <div className="space-y-4">
        {groups.map(([label, rows]) => (
          <Card key={label} title={`${label} (${rows.length})`} bodyClass="p-0">
            <Table head={["Name", "Code", "Type", "Reports to / administered by", "Status", "Effective from"]}>
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className={td}><Link href={`/app/org/${u.id}`} className="font-semibold text-zp-blue hover:underline">{u.name}</Link></td>
                  <td className={`${td} font-mono text-xs`}>{u.code}</td>
                  <td className={`${td} text-ink-2`}>{UNIT_TYPE_LABEL[u.unit_type]}</td>
                  <td className={td}>{u.parent_name ?? "—"}</td>
                  <td className={td}><Badge status={u.status} /></td>
                  <td className={`${td} text-muted`}>{fmtDate(u.effective_from)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        ))}
      </div>
    </>
  );
}
