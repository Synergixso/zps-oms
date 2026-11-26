import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { getItem, itemTransactions, TXN_LABEL } from "@/server/domain/stores";
import { storeMovementAction } from "@/server/actions/stores";
import { Badge, Card, DL, PageHeader, Table, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Store item" };

export default async function StoreItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const item = await loadOr404(() => getItem(db, actor, id));
  const txns = await itemTransactions(db, actor, id);
  const manage = can(actor, "stores.manage", item.org_unit_id) && item.status === "ACTIVE";
  const low = item.quantity_on_hand <= item.reorder_level;
  const forms: Array<{ type: string; label: string; fields: Array<"reference" | "counterparty" | "note">; hint: string; variant?: "primary" | "secondary" }> = [
    { type: "RECEIPT", label: "Record receipt", fields: ["reference", "counterparty", "note"], hint: "Stock delivered into this store (delivery note or voucher reference required).", variant: "primary" },
    { type: "ISSUE", label: "Record issue", fields: ["counterparty", "reference", "note"], hint: "Direct issue to an office or officer. Requisitioned issues are recorded from the requisition." },
    { type: "RETURN", label: "Record return", fields: ["counterparty", "reference", "note"], hint: "Unused stock returned to this store." },
    { type: "ADJUSTMENT", label: "Stock-take adjustment", fields: ["note"], hint: "Signed quantity (e.g. -2) with the reason. Every adjustment is audited." },
  ];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/stores" className="text-zp-blue hover:underline">← Stores and stock</Link></p>
      <PageHeader eyebrow={`${item.code} · ${item.category_name}`} title={item.name}
        description={<span className="flex gap-2">{item.quantity_on_hand === 0 ? <Badge status="REJECTED" label="Out of stock" /> : low ? <Badge status="PENDING" label="At or below reorder level" /> : <Badge status="ACTIVE" label="In stock" />}</span>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Item record">
            <DL items={[["Store", item.unit_name], ["Category", item.category_name], ["On hand", `${item.quantity_on_hand} ${item.unit_of_measure}`], ["Reorder level", String(item.reorder_level)], ["Status", item.status], ["Last updated", fmtDateTime(item.updated_at)]]} />
          </Card>
          <Card title="Stock ledger" subtitle="Append-only: every movement and the balance after it" bodyClass="p-0">
            <Table head={["When", "Movement", "Quantity", "Balance", "Reference", "Counterparty / note", "By"]} caption="Stock ledger" empty="No movements yet.">
              {txns.map((t) => (
                <tr key={t.id}>
                  <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(t.created_at)}</td>
                  <td className={td}>{TXN_LABEL[t.txn_type]}</td>
                  <td className={`${td} tabular-nums font-semibold ${t.quantity < 0 ? "text-err" : "text-ok"}`}>{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                  <td className={`${td} tabular-nums`}>{t.balance_after}</td>
                  <td className={`${td} font-mono text-xs`}>{t.requisition_id ? <Link className="text-zp-blue hover:underline" href={`/app/stores/requisitions/${t.requisition_id}`}>{t.reference}</Link> : t.reference ?? "—"}</td>
                  <td className={`${td} text-ink-2`}>{[t.counterparty, t.note].filter(Boolean).join(" — ") || "—"}</td>
                  <td className={`${td} text-ink-2`}>{t.actor_name}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <Card title="Record a movement" subtitle="Offered to the store keeper of this store; the server re-validates.">
          {!manage ? (
            <p className="text-sm text-muted">You can view this item. Movements are recorded by the store keeper of {item.unit_name}.</p>
          ) : (
            <div className="space-y-3">
              {forms.map((f) => (
                <details key={f.type} className="rounded-md border border-line p-3 open:shadow-sm">
                  <summary className="cursor-pointer text-sm font-semibold">{f.label}</summary>
                  <p className="mt-2 text-xs text-muted">{f.hint}</p>
                  <ActionForm action={storeMovementAction} className="mt-3 space-y-2" resetOnSuccess>
                    <Hidden name="id" value={item.id} />
                    <Hidden name="type" value={f.type} />
                    <Hidden name="version" value={String(item.version)} />
                    <TextField label={`Quantity (${item.unit_of_measure})`} name="quantity" type="number" required />
                    {f.fields.includes("reference") && <TextField label="Reference" name="reference" required={f.type === "RECEIPT"} maxLength={60} />}
                    {f.fields.includes("counterparty") && <TextField label={f.type === "RECEIPT" ? "Supplier" : f.type === "ISSUE" ? "Issued to" : "Returned by"} name="counterparty" required={f.type === "ISSUE"} maxLength={160} />}
                    {f.fields.includes("note") && <TextArea label={f.type === "ADJUSTMENT" ? "Reason" : "Note"} name="note" rows={2} required={f.type === "ADJUSTMENT"} maxLength={300} />}
                    <Submit variant={f.variant ?? "secondary"}>{f.label}</Submit>
                  </ActionForm>
                </details>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
