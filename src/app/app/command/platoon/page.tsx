import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { fieldOffices, platoonWorkspace, MUSTER_STATUS, MUSTER_CORRECTION_DAYS } from "@/server/domain/field-command";
import { AVAILABILITY_GROUPS } from "@/server/domain/schedule";
import { DISPOSITIONS } from "@/server/domain/personnel";
import { recordMusterAction } from "@/server/actions/field-command";
import { Card, Notice, PageHeader, Stat, Table, td, fmtDate, fmtDateTime, btnSecondary } from "@/components/ui";
import { ActionForm, Hidden, Submit } from "@/components/forms";
import { addDays, today } from "@/server/domain/core";
import { Done } from "../shared";
import { Chain, FIELD_BOUNDARY, NoFieldOffice, OfficePicker, OpenDirectives, PendingReports, Superiors } from "../field-shared";

export const metadata = { title: "Platoon command" };

/**
 * Platoon Commander workspace (institutional directive 28 Nov 2026, §11): the Platoon Commander is directly in charge of
 * the officers on the ground. Office-based; personnel data additionally needs personnel scope (domain-enforced).
 */
export default async function PlatoonPage({ searchParams }: { searchParams: Promise<{ office?: string; date?: string; done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const sp = await searchParams;
  const offices = await fieldOffices(db, actor, "platoon");
  if (!offices.length) return (<><PageHeader eyebrow="Field command" title="Platoon command" /><NoFieldOffice what="a Platoon Commander" /></>);
  const officeId = sp.office ?? offices[0].positionId;
  const w = await loadOr404(() => platoonWorkspace(db, actor, officeId, sp.date));
  const min = addDays(today(), -MUSTER_CORRECTION_DAYS);
  const statusOptions = Object.entries(MUSTER_STATUS);
  return (
    <>
      <PageHeader eyebrow={`Field command · ${w.office.unit}`} title={`${w.office.title}${w.office.authority === "ACTING" ? " (acting)" : ""}`}
        description="Directly in charge of the officers on the ground: the field chain under this office, the platoon's officers and availability, daily attendance, instructions and reports." />
      <OfficePicker offices={offices} current={officeId} base="/app/command/platoon" />
      <Done message={sp.done} />
      <div className="mb-4"><Notice tone="info">{FIELD_BOUNDARY}</Notice></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Serving officers" value={w.personnelVisible ? w.personnel.length : "—"} />
        {Object.entries(AVAILABILITY_GROUPS).map(([k, label]) => <Stat key={k} label={label} value={w.personnelVisible ? w.availability[k as keyof typeof AVAILABILITY_GROUPS] : "—"} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={`Attendance — ${fmtDate(w.date)}`}
            subtitle={w.muster ? `Recorded by ${w.muster.by}${w.muster.authority === "ACTING" ? " (acting)" : ""} · ${fmtDateTime(w.muster.updated_at)} · version ${w.muster.version}` : "Not yet recorded for this date"}
            action={
              <form method="get" className="flex items-end gap-2">
                <Hidden name="office" value={officeId} />
                <label className="text-xs font-semibold text-ink-2" htmlFor="muster-date">Date
                  <input id="muster-date" name="date" type="date" min={min} max={today()} defaultValue={w.date} className="mt-1 block rounded-md border border-line-2 px-2 py-1 text-sm" />
                </label>
                <button type="submit" className={btnSecondary}>Show</button>
              </form>
            }
            bodyClass="p-0">
            {!w.personnelVisible ? (
              <div className="p-4"><Notice tone="warn">Your personnel scope does not cover this platoon, so its officers cannot be listed or recorded here. Ask for the personnel role scope that matches this appointment.</Notice></div>
            ) : w.canRecord ? (
              <ActionForm action={recordMusterAction} className="">
                <Hidden name="positionId" value={officeId} />
                <Hidden name="date" value={w.date} />
                <Table head={["Officer", "Rank", "Unit", "Availability", "Attendance"]} caption="Platoon attendance" empty="No serving officers are registered in this platoon.">
                  {w.personnel.map((p) => (
                    <tr key={p.id}>
                      <td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/personnel/${p.id}`}>{p.surname}, {p.first_names}</Link><span className="block font-mono text-[11px] text-muted">{p.personnel_ref}</span></td>
                      <td className={`${td} text-ink-2`}>{p.rank_code}</td><td className={`${td} text-ink-2`}>{p.unit}</td>
                      <td className={`${td} text-xs text-ink-2`}>{DISPOSITIONS[p.disposition_status as keyof typeof DISPOSITIONS] ?? p.disposition_status}</td>
                      <td className={td}>
                        <select name={`s:${p.id}`} aria-label={`Attendance of ${p.surname}, ${p.first_names}`} defaultValue={w.muster?.entries[p.id] ?? "PRESENT"} className="rounded-md border border-line-2 px-2 py-1 text-sm">
                          {statusOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </Table>
                {w.personnel.length > 0 && <div className="flex items-center gap-3 border-t border-line p-4"><Submit>{w.muster ? "Save correction" : "Record attendance"}</Submit><span className="text-xs text-muted">One status per officer. Corrections are allowed for {MUSTER_CORRECTION_DAYS} days and are audited.</span></div>}
              </ActionForm>
            ) : (
              <Table head={["Officer", "Rank", "Unit", "Attendance"]} caption="Platoon attendance" empty="No serving officers are registered in this platoon.">
                {w.personnel.map((p) => (
                  <tr key={p.id}><td className={td}>{p.surname}, {p.first_names}</td><td className={`${td} text-ink-2`}>{p.rank_code}</td><td className={`${td} text-ink-2`}>{p.unit}</td>
                    <td className={td}>{w.muster?.entries[p.id] ? MUSTER_STATUS[w.muster.entries[p.id]] : "—"}</td></tr>
                ))}
              </Table>
            )}
          </Card>
          <Card title="Field chain under this office" subtitle="Inspector → Sergeant → Police Officer / Constable, by appointment" bodyClass="p-0"><Chain rows={w.chain} /></Card>
          <OpenDirectives rows={w.directives} />
        </div>
        <div className="space-y-4">
          <Card title="Reports to" subtitle="Progress, challenges and situation reports go to the Area Commander" bodyClass="p-0"><Superiors rows={w.superiors} /></Card>
          <Card title="Attendance, last 14 days" bodyClass="p-0">
            <Table head={["Date", "Present", "Recorded"]} caption="Attendance history" empty="No attendance recorded yet.">
              {w.history.map((h) => <tr key={h.date}><td className={td}><Link className="text-zp-blue hover:underline" href={`/app/command/platoon?office=${encodeURIComponent(officeId)}&date=${h.date}`}>{fmtDate(h.date)}</Link></td><td className={td}>{h.present}</td><td className={`${td} text-muted`}>{h.total}</td></tr>)}
            </Table>
          </Card>
          <PendingReports rows={w.pending} />
          <Card title="Actions"><div className="flex flex-col gap-2 text-sm">
            <Link className="text-zp-blue hover:underline" href="/app/command/reports/new">Submit a report to the Area Commander</Link>
            <Link className="text-zp-blue hover:underline" href="/app/command/directives/new">Issue an instruction down the field chain</Link>
          </div></Card>
        </div>
      </div>
    </>
  );
}
