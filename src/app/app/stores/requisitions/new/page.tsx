import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { requisitionableItems, requisitionTargets } from "@/server/domain/stores";
import { createRequisitionAction } from "@/server/actions/stores";
import { AccessDenied, Card, Notice, PageHeader, btnSecondary } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextField } from "@/components/forms";

export const metadata = { title: "New stores requisition" };

export default async function NewRequisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "stores.requisition")) return <AccessDenied what="stores requisitions" />;
  const sp = await searchParams;
  const db = getDb();
  // Requesting units are the actor's own assignment units that carry stores.requisition (never a browser-supplied unit).
  const own = actor.assignments.filter((a) => ROLE_BY_CODE[a.roleCode]?.permissions["stores.requisition"]).map((a) => ({ id: a.orgUnitId, name: a.orgUnitName }));
  const unit = own.find((u) => u.id === sp.unit) ?? own[0];
  const targets = unit ? await requisitionTargets(db, actor, unit.id) : [];
  const store = targets.find((t) => t.id === sp.store) ?? targets[0];
  const items = unit && store ? await requisitionableItems(db, actor, unit.id, store.id) : [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/stores/requisitions" className="text-zp-blue hover:underline">← Stores requisitions</Link></p>
      <PageHeader eyebrow="General stores" title="New stores requisition" description="Choose the store, enter the quantities needed and state the purpose. Save as a draft or submit for a decision." />
      {!unit || !targets.length ? (
        <Notice tone="info">No store is available to your unit yet. A store becomes available once a store keeper at your unit or a unit above it has registered items.</Notice>
      ) : (
        <div className="space-y-4">
          <Card>
            <form className="flex flex-wrap items-end gap-3">
              {own.length > 1 && (
                <div>
                  <label htmlFor="unit" className="block text-xs font-semibold text-ink-2">Requesting unit</label>
                  <select id="unit" name="unit" defaultValue={unit.id} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
                    {own.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="store" className="block text-xs font-semibold text-ink-2">Store</label>
                <select id="store" name="store" defaultValue={store?.id} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
                  {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button type="submit" className={btnSecondary}>Show items</button>
              <p className="self-center text-sm text-muted">Requesting unit: <strong className="text-ink">{unit.name}</strong></p>
            </form>
          </Card>
          {store && (
            <Card title={`Items available from ${store.name}`} subtitle="Leave the quantity empty for items you do not need">
              <ActionForm action={createRequisitionAction}>
                <Hidden name="requestingUnitId" value={unit.id} />
                <Hidden name="storeUnitId" value={store.id} />
                <TextField label="Purpose" name="purpose" required maxLength={200} placeholder="e.g. Monthly office stationery" />
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Requisition quantities</caption>
                    <thead className="bg-slate-50 text-left text-xs font-semibold text-ink-2"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Unit</th><th className="w-32 px-3 py-2">Quantity</th></tr></thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} className="border-t border-line">
                          <td className="px-3 py-2"><span className="font-mono text-xs text-muted">{i.code}</span> {i.name}</td>
                          <td className="px-3 py-2 text-ink-2">{i.category_name}</td>
                          <td className="px-3 py-2 text-ink-2">{i.unit_of_measure}</td>
                          <td className="px-3 py-2"><label className="sr-only" htmlFor={`q-${i.id}`}>Quantity of {i.name}</label><input id={`q-${i.id}`} name={`qty_${i.id}`} type="number" min={0} className="w-24 rounded-md border border-line-2 px-2 py-1.5 text-sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Submit name="submit" value="1">Submit for decision</Submit>
                  <Submit variant="secondary" name="submit" value="0">Save draft</Submit>
                </div>
              </ActionForm>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
