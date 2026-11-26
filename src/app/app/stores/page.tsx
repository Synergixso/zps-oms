import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { hasPermission } from "@/server/domain/policy";
import { listItems, storeCategories, storesSummary, storeUnits } from "@/server/domain/stores";
import { createStoreItemAction } from "@/server/actions/stores";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, Stat, Table, td, fmtDateTime, btnSecondary } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "General stores" };

export default async function StoresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "stores.view")) return <AccessDenied what="general stores" />;
  const sp = await searchParams;
  const db = getDb();
  const [rows, cats, units, sum] = await Promise.all([
    listItems(db, actor, { q: sp.q?.slice(0, 40), category: sp.category, unit: sp.unit, low: sp.low === "1" }),
    storeCategories(db),
    storeUnits(db, actor),
    storesSummary(db, actor),
  ]);
  const manageUnits = actor.assignments.filter((a) => ROLE_BY_CODE[a.roleCode]?.permissions["stores.manage"]).map((a) => ({ value: a.orgUnitId, label: a.orgUnitName }));
  const canRequisition = hasPermission(actor, "stores.requisition");
  return (
    <>
      <PageHeader eyebrow="General stores" title="Stores and stock" description="General consumables and non-sensitive stock within your organisational scope: balances, receipts, issues, returns and adjustments."
        actions={<><ButtonLink href="/app/stores/requisitions">Requisitions</ButtonLink>{canRequisition && <ButtonLink href="/app/stores/requisitions/new" variant="primary">New requisition</ButtonLink>}</>} />
      <div className="mb-4"><Notice tone="info">Firearms, ammunition, armoury items, protective tactical equipment and sensitive communications equipment are excluded from ZPS-OMS stores and cannot be recorded.</Notice></div>
      {sum && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Active items" value={sum.items} href="/app/stores" />
          <Stat label="At or below reorder level" value={sum.low} tone={sum.low ? "warn" : "default"} href="/app/stores?low=1" />
          <Stat label="Out of stock" value={sum.out} tone={sum.out ? "err" : "default"} href="/app/stores?low=1" />
          <Stat label="Requisitions awaiting decision" value={sum.submitted} href="/app/stores/requisitions?status=SUBMITTED" />
          <Stat label="Approved, awaiting issue" value={sum.approved} href="/app/stores/requisitions?status=APPROVED" />
          <Stat label="Stock movements (30 days)" value={sum.movements30d} />
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className={manageUnits.length ? "xl:col-span-2" : "xl:col-span-3"} bodyClass="p-0">
          <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
            <div>
              <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
              <input id="q" name="q" defaultValue={sp.q} placeholder="Code or item name" className="mt-1 w-52 rounded-md border border-line-2 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-ink-2">Category</label>
              <select id="category" name="category" defaultValue={sp.category ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
                <option value="">All</option>
                {cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            {units.length > 1 && (
              <div>
                <label htmlFor="unit" className="block text-xs font-semibold text-ink-2">Store</label>
                <select id="unit" name="unit" defaultValue={sp.unit ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
                  <option value="">All stores</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={sp.low === "1"} /> Reorder needed</label>
            <button type="submit" className={btnSecondary}>Apply</button>
            {(sp.q || sp.category || sp.unit || sp.low) && <Link href="/app/stores" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
            <p className="ml-auto self-center text-xs text-muted">{rows.length} item(s)</p>
          </form>
          <Table head={["Code", "Item", "Category", "Store", "On hand", "Reorder level", "Status", "Updated"]} caption="Store items" empty="No store items in your scope.">
            {rows.map((i) => {
              const low = i.quantity_on_hand <= i.reorder_level;
              return (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className={td}><Link href={`/app/stores/${i.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{i.code}</Link></td>
                  <td className={td}>{i.name}</td>
                  <td className={`${td} text-ink-2`}>{i.category_name}</td>
                  <td className={`${td} text-ink-2`}>{i.unit_name}</td>
                  <td className={`${td} tabular-nums font-semibold ${i.quantity_on_hand === 0 ? "text-err" : low ? "text-warn" : ""}`}>{i.quantity_on_hand} <span className="font-normal text-muted">{i.unit_of_measure}</span></td>
                  <td className={`${td} tabular-nums`}>{i.reorder_level}</td>
                  <td className={td}>{i.quantity_on_hand === 0 ? <Badge status="REJECTED" label="Out of stock" /> : low ? <Badge status="PENDING" label="Reorder" /> : <Badge status="ACTIVE" label="In stock" />}</td>
                  <td className={`${td} text-muted`}>{fmtDateTime(i.updated_at)}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
        {manageUnits.length > 0 && (
          <Card title="Add a store item" subtitle="Approved general-stores categories only">
            <ActionForm action={createStoreItemAction}>
              <Select label="Store" name="orgUnitId" required options={manageUnits} defaultValue={manageUnits[0].value} />
              <TextField label="Item code" name="code" required placeholder="SYN-STO-0000" maxLength={16} />
              <Select label="Category" name="categoryCode" required placeholder="Select" options={cats.map((c) => ({ value: c.code, label: c.name }))} />
              <TextField label="Item name" name="name" required maxLength={120} />
              <TextField label="Unit of measure" name="unitOfMeasure" required placeholder="each, ream, box…" maxLength={20} />
              <TextField label="Reorder level" name="reorderLevel" type="number" defaultValue={0} />
              <Submit>Add item</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
