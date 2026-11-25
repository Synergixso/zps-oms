import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { runReport } from "@/server/domain/reports";
import { Card, PageHeader, Table, td } from "@/components/ui";

export const metadata = { title: "Report" };

export default async function ReportView({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  const { error } = await searchParams;
  const actor = await requireActor();
  const { def, rows } = loadOr404(() => runReport(getDb(), actor, code));
  const canExport = hasPermission(actor, "report.export");
  return (
    <>
      <p className="no-print mb-2 text-sm"><Link href="/app/reports" className="text-zp-blue hover:underline">← Reports</Link></p>
      <PageHeader eyebrow={def.code} title={def.name} description={def.description} />
      {error && <p role="alert" className="mb-3 rounded-md border border-err/30 bg-err-bg px-3 py-2 text-sm text-err">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3" bodyClass="p-0" title={`${rows.length} row(s)`} subtitle="SYNTHETIC DEMONSTRATION DATA — not Zambia Police Service records">
          <Table head={def.fields.map((f) => f.replace(/_/g, " "))} empty="No data in your reporting scope.">
            {rows.map((r, i) => (
              <tr key={i}>{def.fields.map((f) => <td key={f} className={`${td} ${typeof r[f] === "number" ? "tabular-nums" : ""}`}>{String(r[f] ?? "")}</td>)}</tr>
            ))}
          </Table>
        </Card>
        <Card title="Export" className="no-print">
          {canExport ? (
            <form method="post" action={`/app/reports/${def.code}/export`} className="space-y-3">
              <fieldset>
                <legend className="text-xs font-semibold text-muted">Approved fields</legend>
                {def.fields.map((f) => (
                  <label key={f} className="mt-1 flex items-center gap-2 text-sm">
                    <input type="checkbox" name="fields" value={f} defaultChecked /> {f}
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="w-full rounded-md bg-zp-green px-3 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Download CSV (audited)</button>
              <p className="text-xs text-muted">Each export is recorded in the audit log and export register.</p>
            </form>
          ) : (
            <p className="text-sm text-muted">Your role does not include report export.</p>
          )}
        </Card>
      </div>
    </>
  );
}
