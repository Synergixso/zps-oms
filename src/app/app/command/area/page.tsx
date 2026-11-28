import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { areaWorkspace, fieldOffices, ENGAGEMENT_TYPE, FOLLOW_UP, MUSTER_STATUS } from "@/server/domain/field-command";
import { RECIPIENT_STATUS, REPORT_CATEGORY, REPORT_STATUS } from "@/server/domain/command";
import { engagementFollowUpAction, recordEngagementAction } from "@/server/actions/field-command";
import { Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";
import { today } from "@/server/domain/core";
import { Done } from "../shared";
import { FIELD_BOUNDARY, NoFieldOffice, OfficePicker, OpenDirectives, PendingReports, Superiors, holderText } from "../field-shared";

export const metadata = { title: "Area command" };

/**
 * Area Commander workspace (institutional directive 28 Nov 2026, §10, §11.1, §13): area-level coordination with the
 * Platoon Commanders, both reporting channels, and the partner-organisation engagement register. Attendance appears as
 * counts only — direct supervision of the officers stays with the Platoon Commander.
 */
export default async function AreaPage({ searchParams }: { searchParams: Promise<{ office?: string; done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const sp = await searchParams;
  const offices = await fieldOffices(db, actor, "area");
  if (!offices.length) return (<><PageHeader eyebrow="Field command" title="Area command" /><NoFieldOffice what="an Area Commander" /></>);
  const officeId = sp.office ?? offices[0].positionId;
  const w = await loadOr404(() => areaWorkspace(db, actor, officeId));
  return (
    <>
      <PageHeader eyebrow={`Field command · ${w.office.unit}`} title={`${w.office.title}${w.office.authority === "ACTING" ? " (acting)" : ""}`}
        description="Coordinates the area with the Platoon Commanders, who are directly in charge of the officers on the ground; reports through the Mobile Unit and District channels; records engagements with partner organisations." />
      <OfficePicker offices={offices} current={officeId} base="/app/command/area" />
      <Done message={sp.done} />
      <div className="mb-4"><Notice tone="info">{FIELD_BOUNDARY}</Notice></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Platoons under this area command" subtitle={`Today's attendance as counts (${fmtDate(today())}); individual records stay with each Platoon Commander`} bodyClass="p-0">
            <Table head={["Platoon Commander office", "Holder", "Strength", ...Object.values(MUSTER_STATUS), "Last recorded"]} caption="Platoon attendance counts" empty="No Platoon Commander office is configured under this office.">
              {w.platoons.map((p) => (
                <tr key={p.positionId}>
                  <td className={td}><span className="font-semibold">{p.title}</span><span className="block text-xs text-muted">{p.unit}</span></td>
                  <td className={td}>{holderText(p.holders)}</td><td className={td}>{p.strength}</td>
                  {Object.keys(MUSTER_STATUS).map((k) => <td key={k} className={td}>{p.today ? p.today.counts[k as keyof typeof MUSTER_STATUS] : "—"}</td>)}
                  <td className={`${td} text-muted`}>{p.lastMuster ? fmtDate(p.lastMuster) : "Never"}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Reporting channels" subtitle="One report goes to every designated recipient; each office acknowledges its own copy" bodyClass="p-0"><Superiors rows={w.channels} /></Card>
          <Card title="Reports submitted by this office" bodyClass="p-0">
            <Table head={["Reference", "Category", "Status", "Recipients"]} caption="Reports submitted" empty="No reports submitted yet.">
              {w.submitted.map((r) => (
                <tr key={r.id}>
                  <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/reports/${r.id}`}>{r.reference}</Link></td>
                  <td className={`${td} text-ink-2`}>{REPORT_CATEGORY[r.category as keyof typeof REPORT_CATEGORY] ?? r.category}</td>
                  <td className={td}><Badge status={r.status} label={REPORT_STATUS[r.status]} /></td>
                  <td className={`${td} text-xs text-ink-2`}>{r.recipients.map((x) => `${x.title} (${x.recipient_kind === "PRIMARY" ? "primary" : "parallel"}: ${RECIPIENT_STATUS[x.status]?.toLowerCase() ?? x.status})`).join("; ")}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Partner-organisation engagements" subtitle="Metadata only: the minutes or record are kept in the official file named by the reference" bodyClass="p-0">
            <Table head={["Reference", "Date", "Partner", "Type", "Official record", "Follow-up"]} caption="Partner-organisation engagements" empty="No engagements recorded.">
              {w.engagements.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} font-mono text-xs`}>{e.reference}</td><td className={`${td} whitespace-nowrap`}>{fmtDate(e.engagement_date)}</td><td className={td}>{e.partner}</td>
                  <td className={`${td} text-ink-2`}>{ENGAGEMENT_TYPE[e.engagement_type]}</td><td className={`${td} font-mono text-xs`}>{e.record_reference ?? "—"}</td>
                  <td className={td}>
                    {w.canRecordEngagement ? (
                      <ActionForm action={engagementFollowUpAction} className="flex items-center gap-2">
                        <Hidden name="id" value={e.id} /><Hidden name="positionId" value={officeId} />
                        <select name="followUp" defaultValue={e.follow_up} aria-label={`Follow-up of ${e.reference}`} className="rounded-md border border-line-2 px-2 py-1 text-xs">
                          {Object.entries(FOLLOW_UP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <Submit variant="secondary">Save</Submit>
                      </ActionForm>
                    ) : FOLLOW_UP[e.follow_up]}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          <PendingReports rows={w.pending} />
          {w.canRecordEngagement && (
            <Card title="Record an engagement" subtitle="Date, partner, type and the reference of the official record. Do not enter minutes or operational details.">
              <ActionForm action={recordEngagementAction} resetOnSuccess>
                <Hidden name="positionId" value={officeId} />
                <TextField label="Date" name="engagementDate" type="date" required defaultValue={today()} />
                <TextField label="Partner organisation" name="partner" required maxLength={120} hint="For example, the mine management or a local authority." />
                <Select label="Type" name="engagementType" required options={Object.entries(ENGAGEMENT_TYPE).map(([value, label]) => ({ value, label }))} />
                <TextField label="Official record reference" name="recordReference" maxLength={60} hint="File or minute reference where the record is kept (optional)." />
                <Select label="Follow-up" name="followUp" defaultValue="NONE" options={Object.entries(FOLLOW_UP).map(([value, label]) => ({ value, label }))} />
                <Submit>Record engagement</Submit>
              </ActionForm>
            </Card>
          )}
          <OpenDirectives rows={w.directives} />
        </div>
      </div>
    </>
  );
}
