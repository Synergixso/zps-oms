import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { reconciliationDetail } from "@/server/domain/reconciliation";
import { reconciliationItemAction } from "@/server/actions/assets";
import { AccessDenied, Badge, Card, DL, PageHeader, Table, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit } from "@/components/forms";

export const metadata = { title: "Reconciliation" };

export default async function ReconciliationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "asset.view"))) return <AccessDenied what="asset reconciliation" />;
  const { reconciliation: r, items, canRecord } = await loadOr404(() => reconciliationDetail(getDb(), actor, id));
  const pending = items.filter((i) => !i.result).length;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/assets/reconciliation" className="text-zp-blue hover:underline">← Reconciliations</Link></p>
      <PageHeader eyebrow={r.reference} title={`Stock-take: ${r.unit_name}`} description={<Badge status={r.status === "OPEN" ? "PENDING" : "COMPLETED"} label={`${r.status.toLowerCase()} · ${r.checked} of ${r.items} checked`} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Assets" className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Asset", "Expected status", "Result", canRecord ? "Record" : "Checked"]}>
            {items.map((i) => (
              <tr key={i.id}>
                <td className={td}><Link href={`/app/assets/${i.asset_id}`} className="font-mono text-xs text-zp-blue hover:underline">{i.asset_tag}</Link><span className="block text-sm">{i.description}</span></td>
                <td className={`${td} text-xs`}>{i.expected_status.replace(/_/g, " ").toLowerCase()}</td>
                <td className={td}>{i.result ? <Badge status={i.result === "FOUND" ? "APPROVED" : i.result === "DAMAGED" ? "PENDING" : "REJECTED"} label={i.result.toLowerCase()} /> : "—"}{i.note && <span className="block text-xs text-muted">{i.note}</span>}</td>
                <td className={td}>
                  {canRecord ? (
                    <ActionForm action={reconciliationItemAction} className="flex flex-wrap items-center gap-1">
                      <Hidden name="id" value={r.id} /><Hidden name="itemId" value={i.id} />
                      <input name="note" defaultValue={i.note ?? ""} placeholder="Note" aria-label={`Note for ${i.asset_tag}`} className="w-28 rounded border border-line-2 px-2 py-1 text-xs" />
                      <Submit name="result" value="FOUND" variant="secondary">Found</Submit>
                      <Submit name="result" value="DAMAGED" variant="secondary">Damaged</Submit>
                      <Submit name="result" value="MISSING" variant="danger">Missing</Submit>
                    </ActionForm>
                  ) : <span className="text-xs text-muted">{i.checked_by_name ?? "—"}{i.checked_at ? `, ${fmtDateTime(i.checked_at)}` : ""}</span>}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="space-y-4">
          <Card title="Reconciliation">
            <DL items={[["Reference", r.reference], ["Unit", r.unit_name], ["Opened", `${r.opened_by_name}, ${fmtDateTime(r.opened_at)}`], ["Closed", r.closed_at ? `${r.closed_by_name}, ${fmtDateTime(r.closed_at)}` : "—"], ["Result", r.summary ?? "—"], ["Note", r.note ?? "—"]]} />
          </Card>
          {canRecord && (
            <Card title="Close reconciliation" subtitle={pending ? `${pending} item(s) still to check` : "All items checked"}>
              <ActionForm action={reconciliationItemAction}>
                <Hidden name="id" value={r.id} /><Hidden name="op" value="close" />
                <Submit confirm="Close the reconciliation? Findings are recorded against each asset.">Close and record findings</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
