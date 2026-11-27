/** Liaison administrative transaction history (and its routing-only view), across every record in the actor's scope. */
import Link from "next/link";
import { Pager } from "@/components/pager";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { LIAISON_ACTION_LABEL, LIAISON_STATUS_LABEL, pageLiaisonHistory } from "@/server/domain/liaison";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDateTime, btnSecondary } from "@/components/ui";
import { viewTitle } from "./register";

export async function LiaisonHistory({ routingOnly, searchParams }: { routingOnly: boolean; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "liaison.audit.view")) return <AccessDenied what="the liaison history" />;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 40);
  const list = await pageLiaisonHistory(getDb(), actor, { routingOnly, q: q || undefined, page: Number(sp.page) || 1 });
  const path = routingOnly ? "/app/liaison/routing" : "/app/liaison/history";
  const title = viewTitle(actor, path, routingOnly ? "Organisational routing" : "Liaison history");
  return (
    <>
      <PageHeader eyebrow="Intelligence liaison administration" title={title}
        description={routingOnly
          ? "Submissions, onward routing, receipts and acknowledgements between offices, for every liaison reference in your scope."
          : "Every administrative transaction on liaison references in your scope: who did what, when, between which offices, with the status before and after."} />
      <div className="mb-4"><Notice tone="info">This history holds reference numbers, offices, dates and statuses only. Every refused access attempt is recorded as a security event.</Notice></div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Reference</label>
            <input id="q" name="q" defaultValue={q} placeholder="LIA-…" maxLength={40} className="mt-1 w-52 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className={btnSecondary}>Search</button>
          {q && <Link href={path} className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{list.total} event(s)</p>
        </form>
        <Table head={["When", "Reference", "Action", "From", "To", "Status", "Approval reference", "By"]} caption={title} empty="No liaison transactions in your scope.">
          {list.rows.map((e) => (
            <tr key={e.id}>
              <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(e.at)}</td>
              <td className={td}><Link href={`/app/liaison/records/${e.record_id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{e.reference}</Link></td>
              <td className={td}>{LIAISON_ACTION_LABEL[e.action] ?? e.action}</td>
              <td className={`${td} text-ink-2`}>{e.from_name ?? "—"}</td>
              <td className={`${td} text-ink-2`}>{e.to_name ?? "—"}</td>
              <td className={td}><Badge status={e.to_status} label={LIAISON_STATUS_LABEL[e.to_status] ?? e.to_status} /></td>
              <td className={`${td} font-mono text-xs`}>{e.approval_reference ?? "—"}</td>
              <td className={`${td} text-ink-2`}>{e.actor_name}</td>
            </tr>
          ))}
        </Table>
        <Pager path={path} params={sp} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} />
      </Card>
    </>
  );
}
