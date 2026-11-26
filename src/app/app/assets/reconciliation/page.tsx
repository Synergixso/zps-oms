import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listReconciliations } from "@/server/domain/reconciliation";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { openReconciliationAction } from "@/server/actions/assets";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Asset reconciliation" };

export default async function Reconciliations() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "asset.view"))) return <AccessDenied what="asset reconciliation" />;
  const db = getDb();
  const rows = await listReconciliations(db, actor);
  const units = hasPermission(actor, "asset.inspect") ? await scopedUnits(db, actor, "asset.inspect") : [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/assets" className="text-zp-blue hover:underline">← Asset register</Link></p>
      <PageHeader eyebrow="Module 11 · General assets" title="Asset reconciliation" description="Periodic stock-takes of non-sensitive general assets: every asset in a unit's custody is checked as found, damaged or missing, and the result is recorded against each asset." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`${rows.length} reconciliation(s)`} className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Reference", "Unit", "Progress", "Opened", "Result", "Status"]} empty="No reconciliations yet.">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} font-mono text-xs`}><Link href={`/app/assets/reconciliation/${r.id}`} className="text-zp-blue hover:underline">{r.reference}</Link></td>
                <td className={td}>{r.unit_name}</td>
                <td className={`${td} tabular-nums`}>{r.checked} / {r.items}</td>
                <td className={td}>{r.opened_by_name}<span className="block text-xs text-muted">{fmtDate(r.opened_at)}</span></td>
                <td className={`${td} text-xs`}>{r.summary ?? "—"}</td>
                <td className={td}><Badge status={r.status === "OPEN" ? "PENDING" : r.status === "CLOSED" ? "COMPLETED" : r.status} label={r.status.toLowerCase()} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        {units.length > 0 && (
          <Card title="Open a reconciliation">
            <ActionForm action={openReconciliationAction}>
              <Select label="Unit" name="unitId" required placeholder="Select unit" options={unitOptions(units)} />
              <TextField label="Note" name="note" placeholder="e.g. Quarterly stock-take" />
              <Submit>Open reconciliation</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
