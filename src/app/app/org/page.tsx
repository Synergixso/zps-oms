import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { listOrgUnits, UNIT_TYPE_LABEL } from "@/server/domain/org";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { indent } from "@/components/sizing";

export const metadata = { title: "Organisation directory" };

export default async function OrgDirectory({ searchParams }: { searchParams: Promise<{ asAt?: string; inactive?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "org.view")) return <AccessDenied what="the organisation directory" />;
  const sp = await searchParams;
  const asAt = sp.asAt && /^\d{4}-\d{2}-\d{2}$/.test(sp.asAt) ? sp.asAt : undefined;
  const units = await listOrgUnits(getDb(), actor, { asAt, includeInactive: sp.inactive === "1" });
  // Tree order: each branch root followed by its subordinate units (depth-first, alphabetical).
  const byId = new Map(units.map((u) => [u.id, u]));
  const children = new Map<string, typeof units>();
  for (const u of units) if (u.parent_id) children.set(u.parent_id, [...(children.get(u.parent_id) ?? []), u]);
  const tree = (roots: typeof units, allow: (u: (typeof units)[number]) => boolean = () => true) => {
    const out: Array<(typeof units)[number] & { depth: number }> = [];
    const walk = (u: (typeof units)[number], depth: number) => {
      out.push({ ...u, depth });
      for (const c of (children.get(u.id) ?? []).filter(allow).sort((a, b) => a.name.localeCompare(b.name))) walk(c, depth + 1);
    };
    for (const r of roots) walk(r, 0);
    return out;
  };
  const groups: Array<[string, ReturnType<typeof tree>]> = [
    ["Service Headquarters", tree(units.filter((u) => u.unit_type === "SERVICE_HQ"), (u) => u.unit_type === "HQ_OFFICE")],
    ["Provincial Police Divisions, District Commands, Stations and Posts", tree(units.filter((u) => u.unit_type === "PROVINCIAL_DIVISION"))],
    ["Divisions / Formations and their sub-units", tree(units.filter((u) => u.unit_type === "FORMATION" && !byId.get(u.parent_id ?? "")?.unit_type.match(/DIVISION|DISTRICT|STATION/)))],
  ];
  return (
    <>
      <PageHeader eyebrow="M01 · Organisation registry" title="Organisation directory" description="Configurable, effective-dated directory. Established units are recorded from the Service's confirmed information; units marked synthetic are development examples." />
      <div className="mb-4">
        <Notice tone="warn" title="Source-of-truth precedence">
          Confirmed institutional instructions from the authorised ZPS stakeholders › approved project requirements › approved establishment and documented arrangements › project documentation › software. Kamfinsa Mobile Unit Companies and Detachments are established (directive of 28 Nov 2026); Districts, Stations, Posts and units marked synthetic are development examples.
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
            <Table head={["Name", "Code", "Type", "Duty station", "Reports to / administered by", "Record", "Status", "Effective from"]}>
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className={td}><span className={`inline-block ${indent(u.depth, 18)}`}>{u.depth > 0 && <span className="mr-1 text-muted" aria-hidden>└</span>}<Link href={`/app/org/${u.id}`} className="font-semibold text-zp-blue hover:underline">{u.name}</Link></span></td>
                  <td className={`${td} font-mono text-xs`}>{u.code}</td>
                  <td className={`${td} text-ink-2`}>{UNIT_TYPE_LABEL[u.unit_type]}</td>
                  <td className={`${td} text-ink-2`}>{u.duty_station ?? "—"}</td>
                  <td className={td}>{u.parent_name ?? "—"}</td>
                  <td className={`${td} text-xs text-ink-2`}>{u.synthetic ? "Synthetic" : "Established"}</td>
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
