import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listRequisitions, REQ_STATUS_LABEL } from "@/server/domain/stores";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Stores requisitions" };

export default async function RequisitionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "stores.view", "stores.requisition")) return <AccessDenied what="stores requisitions" />;
  const sp = await searchParams;
  const status = sp.status && REQ_STATUS_LABEL[sp.status] ? sp.status : undefined;
  const rows = await listRequisitions(getDb(), actor, { status, mine: sp.mine === "1" });
  return (
    <>
      <p className="mb-2 text-sm"><Link href={hasPermission(actor, "stores.view") ? "/app/stores" : "/app"} className="text-zp-blue hover:underline">← {hasPermission(actor, "stores.view") ? "Stores and stock" : "Dashboard"}</Link></p>
      <PageHeader eyebrow="General stores" title="Stores requisitions" description="Requests from a unit to its own store or a store above it. Approved by a delegated commander (never the requester) and issued by the store keeper."
        actions={hasPermission(actor, "stores.requisition") ? <ButtonLink href="/app/stores/requisitions/new" variant="primary">New requisition</ButtonLink> : undefined} />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All</option>
              {Object.entries(REQ_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} /> Raised by me</label>
          <button type="submit" className={btnSecondary}>Apply</button>
          <p className="ml-auto self-center text-xs text-muted">{rows.length} requisition(s)</p>
        </form>
        <Table head={["Reference", "Requesting unit", "Store", "Purpose", "Status", "Raised by", "Raised"]} caption="Stores requisitions" empty="No requisitions in your scope.">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className={td}><Link href={`/app/stores/requisitions/${r.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{r.reference}</Link></td>
              <td className={td}>{r.requesting_unit_name}</td>
              <td className={`${td} text-ink-2`}>{r.store_unit_name}</td>
              <td className={td}>{r.purpose}</td>
              <td className={td}><Badge status={r.status} label={REQ_STATUS_LABEL[r.status]} /></td>
              <td className={`${td} text-ink-2`}>{r.requested_by_name}</td>
              <td className={`${td} text-muted`}>{fmtDate(r.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
