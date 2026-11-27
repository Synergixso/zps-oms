import { Pager } from "@/components/pager";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { CORR_STATUS_LABEL, pageCorrespondence } from "@/server/domain/correspondence";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Correspondence register" };

export default async function CorrespondencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "correspondence.view", "correspondence.register")) return <AccessDenied what="the correspondence register" />;
  const sp = await searchParams;
  const status = sp.status && CORR_STATUS_LABEL[sp.status] ? sp.status : undefined;
  const direction = sp.direction === "INCOMING" || sp.direction === "OUTGOING" ? sp.direction : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const list = await pageCorrespondence(getDb(), actor, { q: q || undefined, status, direction, mine: sp.mine === "1", page: Number(sp.page) || 1 });
  const rows = list.rows;
  const overdue = (d: string | null, s: string) => !!d && d < new Date().toISOString().slice(0, 10) && !["CLOSED", "FILED"].includes(s);
  return (
    <>
      <PageHeader eyebrow="Module 17 · Administrative correspondence" title="Correspondence register"
        description="Incoming and outgoing administrative correspondence for your units: references, assignment, processing status, follow-up and filing. RESTRICTED records are shown only to correspondence managers, the creator and the assigned officer."
        actions={hasPermission(actor, "correspondence.register") ? <ButtonLink href="/app/correspondence/new" variant="primary">Register correspondence</ButtonLink> : undefined} />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={q} placeholder="Reference, subject or sender" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="direction" className="block text-xs font-semibold text-ink-2">Direction</label>
            <select id="direction" name="direction" defaultValue={direction ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">Incoming and outgoing</option><option value="INCOMING">Incoming</option><option value="OUTGOING">Outgoing</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {Object.entries(CORR_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} /> Assigned to or registered by me</label>
          <button type="submit" className={btnSecondary}>Apply filters</button>
          {(q || status || direction || sp.mine) && <Link href="/app/correspondence" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{list.total} record(s)</p>
        </form>
        <Table head={["Reference", "Direction", "Subject", "From / to", "Organisation", "Assigned to", "Status", "Follow-up"]} caption="Correspondence register" empty="No correspondence matches the current filters in your scope.">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className={td}><Link href={`/app/correspondence/${c.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{c.reference}</Link>{c.classification === "RESTRICTED" && <span className="ml-1.5 rounded bg-err-bg px-1.5 py-0.5 text-[10px] font-bold text-err">RESTRICTED</span>}</td>
              <td className={`${td} text-ink-2`}>{c.direction === "INCOMING" ? "Incoming" : "Outgoing"}</td>
              <td className={td}>{c.subject}</td>
              <td className={`${td} text-ink-2`}>{c.counterpart_org_name ?? c.counterpart_name}</td>
              <td className={`${td} text-ink-2`}>{c.unit_name}</td>
              <td className={`${td} text-ink-2`}>{c.assigned_to_name ?? "—"}</td>
              <td className={td}><Badge status={c.status} label={CORR_STATUS_LABEL[c.status]} /></td>
              <td className={`${td} ${overdue(c.follow_up_date, c.status) ? "font-semibold text-err" : "text-muted"}`}>{c.follow_up_date ? `${fmtDate(c.follow_up_date)}${overdue(c.follow_up_date, c.status) ? " (overdue)" : ""}` : "—"}</td>
            </tr>
          ))}
        </Table>
        <Pager path="/app/correspondence" params={sp} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} />
      </Card>
    </>
  );
}
