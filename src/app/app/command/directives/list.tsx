import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { listDirectives, officesHeld, DIRECTIVE_CATEGORY, DIRECTIVE_STATUS, type DirectiveBox } from "@/server/domain/command";
import { Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { NoOffice, tabCls } from "../shared";

export async function DirectiveList({ box, searchParams }: { box: DirectiveBox; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const db = getDb();
  const sp = await searchParams;
  const held = await officesHeld(db, actor);
  const status = sp.status && DIRECTIVE_STATUS[sp.status] ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const rows = held.length ? await listDirectives(db, actor, { box, status, q: q || undefined }) : [];
  const path = box === "issued" ? "/app/command/directives/issued" : "/app/command/directives";
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title={box === "issued" ? "Directives issued" : "Directives received"}
        description={box === "issued" ? "Directives and instructions your offices have issued or assigned onward, with their current status. Close a directive once its completion has been reported." : "Directives and administrative instructions addressed to your offices. Acknowledge, assign onward to the next level, record progress and report completion."}
        actions={<ButtonLink href="/app/command/directives/new" variant="primary">Issue a directive</ButtonLink>} />
      <div className="mb-3 flex gap-2"><Link className={tabCls(box === "received")} href="/app/command/directives">Received</Link><Link className={tabCls(box === "issued")} href="/app/command/directives/issued">Issued</Link></div>
      {!held.length ? <NoOffice /> : (
        <Card bodyClass="p-0">
          <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
            <div><label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label><input id="q" name="q" defaultValue={q} placeholder="Reference or subject" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" /></div>
            <div><label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
              <select id="status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm"><option value="">All statuses</option>{Object.entries(DIRECTIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <button type="submit" className={btnSecondary}>Apply filters</button>
            {(q || status) && <Link href={path} className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
            <p className="ml-auto self-center text-xs text-muted">{rows.length} directive(s)</p>
          </form>
          <Table head={["Reference", "Category", "Subject", box === "issued" ? "To" : "From", "Status", "Issued", "Due"]} caption={box === "issued" ? "Directives issued" : "Directives received"} empty="No directives match.">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className={td}><Link href={`/app/command/directives/${d.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{d.reference}</Link>{d.parent_id && <span className="ml-1 text-[10px] text-muted">(assigned onward)</span>}</td>
                <td className={`${td} text-ink-2`}>{DIRECTIVE_CATEGORY[d.category]}</td>
                <td className={td}>{d.subject}</td>
                <td className={`${td} text-ink-2`}>{box === "issued" ? d.recipient_title : `${d.issuer_title}${d.authority === "ACTING" ? " (acting)" : ""}`}</td>
                <td className={td}><Badge status={d.status} label={DIRECTIVE_STATUS[d.status]} /></td>
                <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(d.created_at)}</td>
                <td className={`${td} whitespace-nowrap ${d.due_date && d.due_date < today && ["ISSUED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(d.status) ? "font-semibold text-err" : "text-muted"}`}>{d.due_date ? fmtDate(d.due_date) : "—"}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
