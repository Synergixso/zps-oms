import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { scopeFor } from "@/server/domain/policy";
import { availableReports, listSavedReports } from "@/server/domain/reports";
import { getDb } from "@/server/db/connection";
import { cancelScheduleAction, deleteSavedReportAction } from "@/server/actions/reports";
import { FREQUENCY_LABEL, listDeliveries, listSchedules } from "@/server/domain/report-schedules";
import { ActionForm, Hidden, Submit } from "@/components/forms";
import { AccessDenied, Badge, Card, Notice, PageHeader, fmtDateTime } from "@/components/ui";

export const metadata = { title: "Reports" };

export default async function Reports() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "report.view")) return <AccessDenied what="management reports" />;
  const reports = availableReports(actor);
  const db = getDb();
  const [saved, schedules, deliveries] = await Promise.all([listSavedReports(db, actor), listSchedules(db, actor), listDeliveries(db, actor)]);
  const reportName = (code: string) => reports.find((r) => r.code === code)?.name ?? code;
  const s = scopeFor(actor, "report.view");
  const scopeLabel = s.national ? "National (all organisations)" : actor.assignments.filter((a) => s.units.includes(a.orgUnitId)).map((a) => a.orgUnitName).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
  return (
    <>
      <PageHeader eyebrow="M06 · Management reporting" title="Management reports" description={`Approved report definitions available to your role. Reporting scope: ${scopeLabel}.`} />
      <div className="mb-4"><Notice tone="info">Reports are aggregate-first and limited to approved fields. Exports are logged with user, time, report, fields and row count. Figures are synthetic and must not be presented as Service performance.</Notice></div>
      {saved.length > 0 && (
        <Card title="My saved custom reports" className="mb-4" bodyClass="p-0">
          <ul className="divide-y divide-line">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span><Link href={`/app/reports/${r.report_code}?saved=${r.id}`} className="font-semibold text-zp-blue hover:underline">{r.name}</Link><span className="block text-xs text-muted">{r.report_code} · {r.fields.length} column(s){r.sort_field ? ` · sorted by ${r.sort_field} ${r.sort_dir}` : ""}</span></span>
                <ActionForm action={deleteSavedReportAction} className=""><Hidden name="id" value={r.id} /><Submit variant="secondary" confirm="Remove this saved report?">Remove</Submit></ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {(schedules.length > 0 || deliveries.length > 0) && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card title="My scheduled deliveries" bodyClass="p-0">
            {schedules.length === 0 ? <p className="px-4 py-6 text-sm text-muted">No schedules. Open a report and use “Schedule delivery”.</p> : (
              <ul className="divide-y divide-line">
                {schedules.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{s.saved_name ?? reportName(s.report_code)}</span>
                      <span className="block text-xs text-muted">{FREQUENCY_LABEL[s.frequency]} · next {fmtDateTime(s.next_run_at)}{s.unit_name ? ` · context ${s.unit_name}` : ""}</span>
                      {s.status !== "ACTIVE" && <span className="mt-1 block text-xs text-warn"><Badge status={s.status} /> {s.status_reason}</span>}
                    </span>
                    <ActionForm action={cancelScheduleAction} className=""><Hidden name="id" value={s.id} /><Submit variant="secondary" confirm="Cancel this scheduled delivery?">Cancel</Submit></ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="My deliveries" subtitle="Kept for 30 days; downloads are audited" bodyClass="p-0">
            {deliveries.length === 0 ? <p className="px-4 py-6 text-sm text-muted">No deliveries yet. The first one arrives at the next scheduled time.</p> : (
              <ul className="divide-y divide-line">
                {deliveries.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0"><span className="block font-semibold text-ink">{reportName(d.report_code)}</span><span className="block text-xs text-muted">{fmtDateTime(d.created_at)} · {d.row_count} row(s){d.downloaded_at ? " · downloaded" : ""}</span></span>
                    <a href={`/app/reports/deliveries/${d.id}`} className="shrink-0 font-semibold text-zp-blue hover:underline">Download CSV</a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      {reports.length === 0 ? (
        <Notice tone="warn">No report definitions are within your authorised functions.</Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.code} title={r.name} subtitle={r.code}>
              <p className="text-sm text-ink-2">{r.description}</p>
              <p className="mt-2 text-xs text-muted">Approved fields: {r.fields.join(", ")}</p>
              <Link href={`/app/reports/${r.code}`} className="mt-3 inline-block text-sm font-semibold text-zp-blue hover:underline">Run report →</Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
