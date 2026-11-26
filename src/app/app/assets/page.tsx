import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ASSET_CATEGORIES } from "@/server/domain/catalogue";
import { hasPermission } from "@/server/domain/policy";
import { ASSET_STATUS_LABEL, listAssets } from "@/server/domain/assets";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "General assets" };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "asset.view")) return <AccessDenied what="the asset register" />;
  const sp = await searchParams;
  const rows = await listAssets(getDb(), actor, { q: sp.q?.slice(0, 40), status: sp.status, category: sp.category });
  return (
    <>
      <PageHeader eyebrow="M05 · General assets" title="General asset register" description="Approved non-sensitive categories only, within your organisational scope. Inbound transfers to your unit are included."
        actions={<><ButtonLink href="/app/assets/reconciliation">Reconciliation</ButtonLink>{hasPermission(actor, "asset.register") && <ButtonLink href="/app/assets/new" variant="primary">Register asset</ButtonLink>}</>} />
      <div className="mb-4"><Notice tone="info">Firearms, ammunition, armoury records, tactical protective equipment, sensitive communications equipment and controlled operational equipment are excluded and cannot be recorded.</Notice></div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Tag or description" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All</option>
              {Object.entries(ASSET_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="category" className="block text-xs font-semibold text-ink-2">Category</label>
            <select id="category" name="category" defaultValue={sp.category ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All</option>
              {ASSET_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className={btnSecondary}>Apply</button>
          {(sp.q || sp.status || sp.category) && <Link href="/app/assets" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{rows.length} asset(s)</p>
        </form>
        <Table head={["Asset tag", "Description", "Category", "Custody", "Custodian ref", "Condition", "Status", "Last inspected"]} caption="General assets">
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className={td}><Link href={`/app/assets/${a.id}`} className="font-semibold text-zp-blue hover:underline">{a.asset_tag}</Link></td>
              <td className={td}>{a.description}</td>
              <td className={`${td} text-ink-2`}>{a.category_name}</td>
              <td className={td}>{a.custody_name}{a.transfer_to_name ? <span className="block text-xs text-warn">→ {a.transfer_to_name}</span> : null}</td>
              <td className={`${td} text-ink-2`}>{a.custodian_ref ?? "—"}</td>
              <td className={td}><Badge status={a.condition} /></td>
              <td className={td}><Badge status={a.status} label={ASSET_STATUS_LABEL[a.status]} /></td>
              <td className={`${td} text-muted`}>{fmtDate(a.last_inspected_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
