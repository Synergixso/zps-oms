import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listAgreements, listPartners, opsFormOptions } from "@/server/domain/ops-admin";
import { createAgreementAction } from "@/server/actions/portfolios";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";
import { Done } from "../../command/shared";

export const metadata = { title: "Mining security services" };

/** Mining security services (DIG Operations portfolio, DEC-087): partner organisations and service agreements on administrative duty areas. */
export default async function SecurityServicesPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, "secservice.view")) return <AccessDenied />;
  const db = getDb();
  const { done } = await searchParams;
  const [agreements, partners, opt] = await Promise.all([listAgreements(db, actor), listPartners(db, actor), opsFormOptions(db, actor)]);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/operations" className="text-zp-blue hover:underline">← Operations administration</Link></p>
      <PageHeader eyebrow="DIG Operations portfolio" title="Mining security services"
        description="Authorised security services provided to mining-sector partners: agreements, officers required against officers assigned to the duty area, and periodic service-delivery reports." />
      <Done message={done} />
      <div className="mb-4"><Notice tone="info">A duty area is an administrative duty-station record, not a location. Officers are assigned through the assignment register. No site layouts, guard positions, routes, vulnerabilities or live locations are recorded.</Notice></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Service agreements" bodyClass="p-0">
            <Table head={["Reference", "Partner", "Duty area", "Responsible unit", "Officers (assigned / required)", "Last report", "Status"]} caption="Mining security service agreements" empty="No agreements in your scope.">
              {agreements.map((g) => (
                <tr key={g.id}>
                  <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/operations/security-services/${g.id}`}>{g.reference}</Link></td>
                  <td className={td}>{g.partner}</td><td className={`${td} text-ink-2`}>{g.area}</td><td className={`${td} text-ink-2`}>{g.responsible_unit}</td>
                  <td className={td}><span className={g.officers_assigned < g.officers_required ? "font-semibold text-warn" : ""}>{g.officers_assigned} / {g.officers_required}</span></td>
                  <td className={td}>{g.last_report ? fmtDate(g.last_report) : "None"}</td><td className={td}><Badge status={g.status} /></td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Partner organisations" bodyClass="p-0">
            <Table head={["Code", "Partner", "Sector"]} caption="Partner organisations">
              {partners.map((p) => <tr key={p.id}><td className={`${td} font-mono text-xs`}>{p.code}</td><td className={td}>{p.name}</td><td className={td}>{p.sector.toLowerCase()}</td></tr>)}
            </Table>
          </Card>
        </div>
        {opt.areas.length > 0 && (
          <Card title="Record an agreement">
            <ActionForm action={createAgreementAction}>
              <Select label="Partner organisation" name="partnerId" required options={opt.partners.map((p) => ({ value: p.id, label: p.name }))} />
              <Select label="Administrative duty area" name="areaId" required options={opt.areas.map((a) => ({ value: a.id, label: a.name }))} />
              <TextField label="Authorisation reference" name="authorisationRef" required maxLength={60} />
              <TextField label="Valid from" name="validFrom" type="date" required />
              <TextField label="Valid to" name="validTo" type="date" />
              <TextField label="Officers required" name="officersRequired" type="number" required defaultValue={0} />
              <Submit>Record agreement</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
