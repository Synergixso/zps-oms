import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { companyWorkspace, fieldOffices } from "@/server/domain/field-command";
import { hasPermission } from "@/server/domain/policy";
import { Card, Notice, PageHeader, Stat, Table, td, fmtDate } from "@/components/ui";
import { Done } from "../shared";
import { Chain, FIELD_BOUNDARY, NoFieldOffice, OfficePicker, OpenDirectives, PendingReports, Superiors, holderText } from "../field-shared";

export const metadata = { title: "Company and detachment command" };

/**
 * Company Commander, Deputy Company Commander and Detachment Commander workspace (institutional directive 28 Nov 2026,
 * §9.2–§9.4): subordinate Detachments (or Platoons) with duty stations and commanders, strength as counts, reports
 * addressed to this office, and the reporting line Detachment → Company Commander / Deputy → Kamfinsa Mobile Unit HQ.
 */
export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ office?: string; done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const sp = await searchParams;
  const offices = await fieldOffices(db, actor, "company");
  if (!offices.length) return (<><PageHeader eyebrow="Field command" title="Company and detachment command" /><NoFieldOffice what="a Company, Deputy Company or Detachment Commander" /></>);
  const officeId = sp.office ?? offices[0].positionId;
  const w = await loadOr404(() => companyWorkspace(db, actor, officeId));
  const orgLinks = hasPermission(actor, "org.view");
  return (
    <>
      <PageHeader eyebrow={`Field command · ${w.office.unit}${w.office.duty_station ? ` · ${w.office.duty_station}` : ""}`} title={`${w.office.title}${w.office.authority === "ACTING" ? " (acting)" : ""}`}
        description="Leadership, supervision and administration of the unit and the units under it; reports go to the designated superiors in the Kamfinsa Mobile Unit command structure." />
      <OfficePicker offices={offices} current={officeId} base="/app/command/company" />
      <Done message={sp.done} />
      <div className="mb-4"><Notice tone="info">{FIELD_BOUNDARY}</Notice></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Serving strength (whole unit)" value={w.strength} />
        <Stat label={w.childLabel} value={w.units.length} />
        <Stat label="Reports awaiting this office" value={w.pending.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={w.childLabel} subtitle="Duty station, commander and serving strength; the latest report shown is one addressed to this office" bodyClass="p-0">
            <Table head={["Unit", "Duty station", "Commander office", "Holder", "Strength", "Latest report"]} caption={w.childLabel} empty={`No ${w.childLabel.toLowerCase()} are recorded under this unit.`}>
              {w.units.map((u) => (
                <tr key={u.id}>
                  <td className={td}>{orgLinks ? <Link className="font-semibold text-zp-blue hover:underline" href={`/app/org/${u.id}`}>{u.name}</Link> : <span className="font-semibold">{u.name}</span>}</td>
                  <td className={`${td} text-ink-2`}>{u.duty_station ?? "—"}</td>
                  <td className={td}>{u.commanders.map((c) => c.title).join("; ") || "No commander office configured"}</td>
                  <td className={td}>{u.commanders.map((c) => holderText(c.holders)).join("; ") || "—"}</td>
                  <td className={td}>{u.strength}</td>
                  <td className={td}>{u.latest ? <><Link className="font-mono text-xs text-zp-blue hover:underline" href={`/app/command/reports/${u.latest.id}`}>{u.latest.reference}</Link><span className="block text-xs text-muted">{fmtDate(u.latest.reporting_date)} · {u.latest.progress_status.replace("_", " ").toLowerCase()}</span></> : "—"}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Offices under command" bodyClass="p-0"><Chain rows={w.chain} /></Card>
          <OpenDirectives rows={w.directives} />
        </div>
        <div className="space-y-4">
          <Card title="Reports to" bodyClass="p-0"><Superiors rows={w.superiors} /></Card>
          <PendingReports rows={w.pending} />
          <Card title="Actions"><div className="flex flex-col gap-2 text-sm">
            <Link className="text-zp-blue hover:underline" href="/app/command/reports/new">Submit a report</Link>
            <Link className="text-zp-blue hover:underline" href="/app/command/directives/new">Issue an instruction</Link>
            <Link className="text-zp-blue hover:underline" href="/app/command/acting">Record an acting appointment (for example, the Deputy assuming duties)</Link>
          </div></Card>
        </div>
      </div>
    </>
  );
}
