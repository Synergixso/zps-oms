import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getAgreement } from "@/server/domain/ops-admin";
import { serviceReportAction } from "@/server/actions/portfolios";
import { Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { Done } from "../../../command/shared";

export const metadata = { title: "Security service agreement" };

const STATUS: Record<string, string> = { DELIVERED: "Delivered", PARTIAL: "Partially delivered", NOT_DELIVERED: "Not delivered" };

export default async function AgreementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const { agreement: g, reports, canManage } = await loadOr404(() => getAgreement(db, actor, id));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/operations/security-services" className="text-zp-blue hover:underline">← Mining security services</Link></p>
      <PageHeader eyebrow="Mining security service" title={`${g.reference} — ${g.partner}`} description={<>{g.area} · {g.responsible_unit} · <Badge status={g.status} /></>} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Agreement">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Authorisation reference", g.authorisation_ref], ["Valid", `${fmtDate(g.valid_from)}${g.valid_to ? ` – ${fmtDate(g.valid_to)}` : " (open-ended)"}`], ["Officers required", String(g.officers_required)], ["Officers assigned to the duty area", String(g.officers_assigned)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-sm"><Link className="text-zp-blue hover:underline" href={`/app/areas/${g.area_id}`}>Open the duty area and its assignments</Link></p>
          </Card>
          <Card title="Service-delivery reports" bodyClass="p-0">
            <Table head={["Period", "Officers provided", "Service", "Follow-up", "Summary", "By"]} caption="Service-delivery reports" empty="No reports yet.">
              {reports.map((r) => <tr key={r.id}><td className={`${td} whitespace-nowrap`}>{fmtDate(r.period_from)} – {fmtDate(r.period_to)}</td><td className={td}>{r.officers_provided}</td><td className={td}>{STATUS[r.service_status]}</td><td className={td}>{r.follow_up.toLowerCase()}</td><td className={`${td} text-ink-2`}>{r.summary ?? ""}</td><td className={td}>{r.by}</td></tr>)}
            </Table>
          </Card>
        </div>
        {canManage && (
          <Card title="Record a service report">
            <ActionForm action={serviceReportAction} resetOnSuccess>
              <Hidden name="id" value={g.id} />
              <TextField label="Period from" name="periodFrom" type="date" required />
              <TextField label="Period to" name="periodTo" type="date" required />
              <TextField label="Officers provided" name="officersProvided" type="number" required />
              <Select label="Service" name="serviceStatus" required options={Object.entries(STATUS).map(([value, label]) => ({ value, label }))} />
              <Select label="Follow-up" name="followUp" defaultValue="NONE" options={[{ value: "NONE", label: "None" }, { value: "OPEN", label: "Open" }, { value: "DONE", label: "Done" }]} />
              <TextArea label="Summary (required unless delivered)" name="summary" maxLength={300} rows={3} />
              <Submit>Record report</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
