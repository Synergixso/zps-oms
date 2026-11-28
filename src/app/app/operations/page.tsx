import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listActivities, opsFormOptions, CLASSIFICATION, OPS_CATEGORY, OPS_STATUS } from "@/server/domain/ops-admin";
import { registerActivityAction } from "@/server/actions/portfolios";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";
import { Done } from "../command/shared";

export const metadata = { title: "Operations administration" };

const OPS_BOUNDARY = "Administrative accountability records only: authority, responsible unit, dates, personnel committed as a number, status and short outcomes. No tactical plans, routes, positions, live locations, intelligence or investigation details — free text is checked for excluded terms.";

/** Operations administration register (DIG Operations portfolio, DEC-087): public order and illegal mining. */
export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ category?: string; status?: string; done?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, "opsadmin.view")) return <AccessDenied />;
  const db = getDb();
  const sp = await searchParams;
  const [rows, opt] = await Promise.all([listActivities(db, actor, { category: sp.category, status: sp.status }), opsFormOptions(db, actor)]);
  const classOptions = Object.entries(CLASSIFICATION).flatMap(([cat, m]) => Object.entries(m).map(([value, label]) => ({ value, label: `${OPS_CATEGORY[cat as keyof typeof OPS_CATEGORY]}: ${label}` })));
  return (
    <>
      <PageHeader eyebrow="DIG Operations portfolio" title="Operations administration"
        description="Nationwide administrative register of public-order incidents and illegal-mining enforcement, with dated progress, resource requests, outcomes and post-event review."
        actions={hasPermission(actor, "secservice.view") ? <ButtonLink href="/app/operations/security-services">Mining security services</ButtonLink> : undefined} />
      <Done message={sp.done} />
      <div className="mb-4"><Notice tone="info">{OPS_BOUNDARY}</Notice></div>
      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="text-xs font-semibold text-ink-2">Category
          <select name="category" defaultValue={sp.category ?? ""} className="mt-1 block rounded-md border border-line-2 px-2 py-1 text-sm"><option value="">All</option>{Object.entries(OPS_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-ink-2">Status
          <select name="status" defaultValue={sp.status ?? ""} className="mt-1 block rounded-md border border-line-2 px-2 py-1 text-sm"><option value="">All</option>{Object.entries(OPS_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <button type="submit" className="rounded-md border border-line-2 bg-white px-3 py-1.5 text-sm font-semibold">Filter</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Register (${rows.length})`} bodyClass="p-0">
            <Table head={["Reference", "Record", "Responsible unit", "Dates", "Personnel", "Status"]} caption="Operations administration register" empty="No records in your scope.">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/operations/${a.id}`}>{a.reference}</Link></td>
                  <td className={td}>{a.title}<span className="block text-xs text-muted">{OPS_CATEGORY[a.category]} · {CLASSIFICATION[a.category][a.classification] ?? a.classification}</span></td>
                  <td className={`${td} text-ink-2`}>{a.responsible_unit}{a.coordinating_unit ? <span className="block text-xs">with {a.coordinating_unit}</span> : null}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(a.start_date)}{a.end_date ? ` – ${fmtDate(a.end_date)}` : ""}</td>
                  <td className={td}>{a.personnel_committed}</td>
                  <td className={td}><Badge status={a.status} label={OPS_STATUS[a.status as keyof typeof OPS_STATUS]} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        {opt.manageUnits.length > 0 && (
          <Card title="Register a record">
            <ActionForm action={registerActivityAction}>
              <Select label="Category" name="category" required options={Object.entries(OPS_CATEGORY).map(([value, label]) => ({ value, label }))} />
              <Select label="Classification" name="classification" required options={classOptions.map((o) => ({ value: o.value, label: o.label }))} hint="Must match the category." />
              <TextField label="Administrative title" name="title" required maxLength={160} />
              <TextField label="Authorising reference" name="authorisingRef" required maxLength={60} />
              <Select label="Authorising office (yours)" name="authorisingOffice" placeholder="Not recorded" options={opt.offices.map((o) => ({ value: o.id, label: o.title }))} />
              <Select label="Responsible unit" name="responsibleUnitId" required options={opt.manageUnits.map((u) => ({ value: u.id, label: u.name }))} />
              <Select label="Coordinating unit" name="coordinatingUnitId" placeholder="None" options={opt.coordinatingUnits.map((u) => ({ value: u.id, label: u.name }))} />
              <TextField label="Start date" name="startDate" type="date" required />
              <TextField label="End date" name="endDate" type="date" />
              <TextField label="Personnel committed (number)" name="personnelCommitted" type="number" required defaultValue={0} />
              <Submit>Register</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
