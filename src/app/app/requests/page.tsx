import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { REQUEST_CATEGORIES } from "@/server/domain/catalogue";
import { hasPermission } from "@/server/domain/policy";
import { listRequests, REQUEST_STATUSES, STATUS_LABEL } from "@/server/domain/requests";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Administrative requests" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "request.view")) return <AccessDenied what="administrative requests" />;
  const sp = await searchParams;
  const rows = await listRequests(getDb(), actor, { status: sp.status, category: sp.category, q: sp.q?.slice(0, 60) });
  const today = new Date().toISOString().slice(0, 10);
  const catName = Object.fromEntries(REQUEST_CATEGORIES.map((c) => [c.code, c.name]));
  return (
    <>
      <PageHeader
        eyebrow="M03 · Administrative requests"
        title="Administrative request register"
        description="Requests within your authorised organisational scope. Drafts are visible only to their author."
        actions={hasPermission(actor, "request.create") ? <ButtonLink href="/app/requests/new" variant="primary">New administrative request</ButtonLink> : undefined}
      />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Reference or subject" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="category" className="block text-xs font-semibold text-ink-2">Category</label>
            <select id="category" name="category" defaultValue={sp.category ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All categories</option>
              {REQUEST_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className={btnSecondary}>Apply filters</button>
          {(sp.q || sp.status || sp.category) && <Link href="/app/requests" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{rows.length} record(s)</p>
        </form>
        <Table head={["Reference", "Subject", "Category", "Organisation", "Status", "Due", "Updated"]} caption="Administrative requests" empty="No requests match the current filters. Adjust or clear the filters.">
          {rows.map((r) => {
            const overdue = r.due_date && r.due_date < today && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"].includes(r.status);
            return (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={td}><Link href={`/app/requests/${r.id}`} className="font-semibold text-zp-blue hover:underline">{r.reference}</Link></td>
                <td className={td}>{r.title}</td>
                <td className={`${td} text-ink-2`}>{catName[r.category_code]}</td>
                <td className={td}>{r.origin_name}</td>
                <td className={td}><Badge status={r.status} label={r.status === "UNDER_REVIEW" ? `Under review (L${r.current_level})` : STATUS_LABEL[r.status]} /></td>
                <td className={`${td} whitespace-nowrap ${overdue ? "font-semibold text-err" : "text-muted"}`}>{fmtDate(r.due_date)}{overdue ? " · overdue" : ""}</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(r.updated_at)}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
