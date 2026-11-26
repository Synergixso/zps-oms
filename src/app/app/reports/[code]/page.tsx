import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { getSavedReport, runReport, shapeRows } from "@/server/domain/reports";
import { saveReportAction, scheduleReportAction } from "@/server/actions/reports";
import { FREQUENCIES, FREQUENCY_LABEL } from "@/server/domain/report-schedules";
import { Card, PageHeader, Table, td } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Report" };

type SP = { error?: string; saved?: string; f?: string | string[]; sort?: string; dir?: string };

export default async function ReportView({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<SP> }) {
  const { code } = await params;
  const sp = await searchParams;
  const actor = await requireActor();
  const db = getDb();
  const { def, rows } = await loadOr404(() => runReport(db, actor, code));
  const saved = sp.saved ? await getSavedReport(db, actor, sp.saved) : undefined;
  const chosen = saved?.report_code === def.code ? saved.fields : sp.f ? (Array.isArray(sp.f) ? sp.f : [sp.f]) : def.fields;
  const sort = saved?.report_code === def.code ? saved.sort_field : sp.sort ?? null;
  const dir = (saved?.report_code === def.code ? saved.sort_dir : sp.dir) === "desc" ? "desc" : "asc";
  const shaped = shapeRows(def, rows, chosen, sort, dir);
  const canExport = hasPermission(actor, "report.export");
  const sel = "mt-1 block w-full rounded-md border border-line-2 bg-white px-2 py-1.5 text-sm";
  return (
    <>
      <p className="no-print mb-2 text-sm"><Link href="/app/reports" className="text-zp-blue hover:underline">← Reports</Link></p>
      <PageHeader eyebrow={def.code} title={saved?.name ?? def.name} description={saved ? `Saved view of “${def.name}”. ${def.description}` : def.description} />
      {sp.error && <p role="alert" className="mb-3 rounded-md border border-err/30 bg-err-bg px-3 py-2 text-sm text-err">{sp.error}</p>}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3" bodyClass="p-0" title={`${shaped.rows.length} row(s)`} subtitle="Live database figures within your reporting scope · SYNTHETIC DEMONSTRATION DATA">
          <Table head={shaped.cols.map((f) => f.replace(/_/g, " "))} empty="No data in your reporting scope.">
            {shaped.rows.map((r, i) => (
              <tr key={i}>{shaped.cols.map((f) => <td key={f} className={`${td} ${typeof r[f] === "number" ? "tabular-nums" : ""}`}>{String(r[f] ?? "")}</td>)}</tr>
            ))}
          </Table>
        </Card>
        <div className="no-print space-y-4">
          <Card title="Customise">
            <form method="get" className="space-y-3">
              <fieldset>
                <legend className="text-xs font-semibold text-muted">Columns (approved fields only)</legend>
                {def.fields.map((f) => (
                  <label key={f} className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name="f" value={f} defaultChecked={chosen.includes(f)} className="accent-zp-green" /> {f.replace(/_/g, " ")}</label>
                ))}
              </fieldset>
              <label className="block text-xs font-semibold text-muted">Sort by
                <select name="sort" defaultValue={sort ?? ""} className={sel}><option value="">Default order</option>{def.fields.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}</select>
              </label>
              <label className="block text-xs font-semibold text-muted">Direction
                <select name="dir" defaultValue={dir} className={sel}><option value="asc">Ascending</option><option value="desc">Descending</option></select>
              </label>
              <button type="submit" className="w-full rounded-md border border-line-2 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Apply</button>
            </form>
            <ActionForm action={saveReportAction} className="mt-4 space-y-2 border-t border-line pt-3">
              <Hidden name="code" value={def.code} />
              {shaped.cols.map((f) => <Hidden key={f} name="fields" value={f} />)}
              <Hidden name="sortField" value={sort ?? ""} />
              <Hidden name="sortDir" value={dir} />
              <TextField label="Save this view as" name="name" required />
              <Submit variant="secondary">Save custom report</Submit>
            </ActionForm>
          </Card>
          <Card title="Export">
            {canExport ? (
              <form method="post" action={`/app/reports/${def.code}/export`} className="space-y-3">
                {shaped.cols.map((f) => <input key={f} type="hidden" name="fields" value={f} />)}
                <p className="text-xs text-muted">Exports the columns shown ({shaped.cols.length}).</p>
                <button type="submit" name="format" value="xlsx" className="w-full rounded-md bg-zp-green px-3 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Download Excel (.xlsx)</button>
                <button type="submit" name="format" value="csv" className="w-full rounded-md border border-line-2 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Download CSV</button>
                <p className="text-xs text-muted">Each export is recorded in the audit log and export register.</p>
              </form>
            ) : (
              <p className="text-sm text-muted">Your role does not include report export.</p>
            )}
          </Card>
          {canExport && (
            <Card title="Schedule delivery" subtitle="Generated at 06:00 Lusaka time and delivered inside ZPS-OMS (no e-mail)">
              <ActionForm action={scheduleReportAction} className="space-y-2" resetOnSuccess>
                <Hidden name="code" value={def.code} />
                {saved?.report_code === def.code && <Hidden name="savedReportId" value={saved.id} />}
                <Select label="Frequency" name="frequency" required defaultValue="WEEKLY" options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }))} />
                <p className="text-xs text-muted">{saved?.report_code === def.code ? `Uses your saved view “${saved.name}”.` : "Uses all approved columns. Save a custom view first to schedule only some columns."} Runs under your current role context; each delivery is audited like a download.</p>
                <Submit variant="secondary">Schedule</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
