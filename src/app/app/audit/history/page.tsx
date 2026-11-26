import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { HISTORY_KINDS, RECORD_TYPES, recordHistory, type HistoryKind } from "@/server/domain/history";
import { AccessDenied, Card, PageHeader, Table, td, fmtDateTime, btnSecondary } from "@/components/ui";

export const metadata = { title: "Record history" };
const sel = "mt-1 block w-full rounded-md border border-line-2 bg-white px-2.5 py-2 text-sm";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "audit.view"))) return <AccessDenied what="record history" />;
  const sp = await searchParams;
  const kind = (sp.kind && sp.kind in HISTORY_KINDS ? sp.kind : "workflow") as HistoryKind;
  const rows = await recordHistory(getDb(), actor, kind, { type: sp.type, from: sp.from, to: sp.to, q: sp.q });
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <>
      <PageHeader eyebrow="Module 14 · Audit and compliance" title="Record history" description="Read-only history of workflow decisions, disposition changes, personnel record changes and exports. Historical records cannot be modified." actions={<Link href="/app/audit" className={btnSecondary}>Audit register</Link>} />
      <nav className="mb-3 flex flex-wrap gap-1" aria-label="History type">
        {Object.entries(HISTORY_KINDS).map(([k, l]) => <Link key={k} href={`?kind=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${kind === k ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{l}</Link>)}
      </nav>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="kind" value={kind} />
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">Search<input name="q" defaultValue={sp.q} className={sel} placeholder="Reference, action, officer or reason" /></label>
          {kind === "workflow" && (
            <label className="text-xs font-semibold text-ink-2">Record type
              <select name="type" defaultValue={sp.type ?? ""} className={sel}><option value="">All</option>{RECORD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
            </label>
          )}
          <label className="text-xs font-semibold text-ink-2">From<input type="date" name="from" defaultValue={sp.from} className={sel} /></label>
          <label className="text-xs font-semibold text-ink-2">To<input type="date" name="to" defaultValue={sp.to} className={sel} /></label>
          <div className="flex items-end"><button className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Apply</button></div>
        </form>
      </Card>
      <Card title={`${rows.length} record(s)`} subtitle="Latest 500 matching entries" bodyClass="p-0">
        <Table head={cols.map((c) => c.replace(/_/g, " "))} empty="No history matches the filters.">
          {rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className={`${td} ${c === "time" ? "whitespace-nowrap text-xs" : c === "details" || c === "record" ? "max-w-[280px] break-words font-mono text-[11px]" : ""}`}>{c === "time" ? fmtDateTime(String(r[c])) : String(r[c] ?? "—")}</td>)}</tr>)}
        </Table>
      </Card>
    </>
  );
}
