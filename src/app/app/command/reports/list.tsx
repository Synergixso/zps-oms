import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { listReports, officesHeld, PROGRESS, RECIPIENT_STATUS, REPORT_CATEGORY, REPORT_STATUS, type ReportBox } from "@/server/domain/command";
import { Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { NoOffice, tabCls } from "../shared";

export async function ReportList({ box, searchParams }: { box: ReportBox; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const db = getDb();
  const sp = await searchParams;
  const held = await officesHeld(db, actor);
  const status = sp.status && REPORT_STATUS[sp.status] ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const rows = held.length ? await listReports(db, actor, { box, status, q: q || undefined }) : [];
  const path = box === "submitted" ? "/app/command/reports/submitted" : "/app/command/reports";
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title={box === "submitted" ? "Reports submitted" : "Reports received"}
        description={box === "submitted" ? "Status reports your offices have written, with each recipient's acknowledgement and review." : "Status reports addressed or forwarded to your offices, including parallel reports. Acknowledge receipt, review, return for correction, forward to the next superior or close."}
        actions={<ButtonLink href="/app/command/reports/new" variant="primary">New status report</ButtonLink>} />
      <div className="mb-3 flex gap-2"><Link className={tabCls(box === "inbox")} href="/app/command/reports">Received</Link><Link className={tabCls(box === "submitted")} href="/app/command/reports/submitted">Submitted</Link></div>
      {!held.length ? <NoOffice /> : (
        <Card bodyClass="p-0">
          <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
            <div><label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label><input id="q" name="q" defaultValue={q} placeholder="Reference or summary" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" /></div>
            <div><label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
              <select id="status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm"><option value="">All statuses</option>{Object.entries(REPORT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <button type="submit" className={btnSecondary}>Apply filters</button>
            {(q || status) && <Link href={path} className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
            <p className="ml-auto self-center text-xs text-muted">{rows.length} report(s)</p>
          </form>
          <Table head={["Reference", "Category", "From", "Progress", "Report status", box === "inbox" ? "Your office" : "Reporting date"]} caption={box === "submitted" ? "Reports submitted" : "Reports received"} empty="No reports match.">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={td}><Link href={`/app/command/reports/${r.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{r.reference}</Link></td>
                <td className={`${td} text-ink-2`}>{REPORT_CATEGORY[r.category]}</td>
                <td className={td}>{r.reporter_title}</td>
                <td className={`${td} text-ink-2`}>{PROGRESS[r.progress_status]}</td>
                <td className={td}><Badge status={r.status} label={REPORT_STATUS[r.status]} /></td>
                <td className={`${td} text-ink-2`}>{box === "inbox" ? (r.my_status ?? "").split(",").map((s) => RECIPIENT_STATUS[s] ?? s).join(", ") : fmtDate(r.reporting_date)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
