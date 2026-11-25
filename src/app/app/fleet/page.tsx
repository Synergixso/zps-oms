import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listVehicles, VEHICLE_STATUSES, VEHICLE_STATUS_LABEL } from "@/server/domain/fleet";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Fleet register" };

export default async function FleetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!pageAllowed(actor, "fleet.view")) return <AccessDenied what="the fleet register" />;
  const sp = await searchParams;
  const rows = listVehicles(getDb(), actor, { q: sp.q?.slice(0, 40), status: sp.status, due: sp.due });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        eyebrow="M04 · Fleet"
        title="Fleet register"
        description="General vehicle administrative records within your scope. Registration references are synthetic placeholders."
        actions={
          <>
            {hasPermission(actor, "maintenance.view") && <ButtonLink href="/app/fleet/maintenance">Maintenance workbench</ButtonLink>}
            {hasPermission(actor, "fleet.manage") && <ButtonLink href="/app/fleet/new" variant="primary">Add vehicle record</ButtonLink>}
          </>
        }
      />
      <div className="mb-4">
        <Notice tone="info">Excluded by design: GPS, live location, route or patrol history, mission purpose, crew details and deployment history. The authoritative system of record for fleet must be confirmed with the Technical Services Directorate (DEC-009).</Notice>
      </div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Fleet ref, registration, make" className="mt-1 w-60 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All</option>
              {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{VEHICLE_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="due" className="block text-xs font-semibold text-ink-2">Service</label>
            <select id="due" name="due" defaultValue={sp.due ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">Any</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <button type="submit" className={btnSecondary}>Apply</button>
          {(sp.q || sp.status || sp.due) && <Link href="/app/fleet" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{rows.length} vehicle(s)</p>
        </form>
        <Table head={["Fleet ref", "Registration ref", "Vehicle", "Class", "Custody", "Status", "Next service", "Licence expiry"]} caption="Fleet register">
          {rows.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <td className={td}><Link href={`/app/fleet/${v.id}`} className="font-semibold text-zp-blue hover:underline">{v.fleet_ref}</Link></td>
              <td className={`${td} font-mono text-xs`}>{v.registration_ref}</td>
              <td className={td}>{v.make} {v.model}</td>
              <td className={`${td} text-ink-2`}>{v.vehicle_class}</td>
              <td className={td}>{v.custody_name}</td>
              <td className={td}><Badge status={v.status} label={VEHICLE_STATUS_LABEL[v.status]} /></td>
              <td className={`${td} whitespace-nowrap ${v.next_service_due && v.next_service_due < today && v.status !== "DISPOSED" ? "font-semibold text-err" : ""}`}>{fmtDate(v.next_service_due)}</td>
              <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(v.licence_expiry)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
