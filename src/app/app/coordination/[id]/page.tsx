import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getCoordination, COORDINATION_CATEGORY, COORDINATION_STATUS } from "@/server/domain/coordination";
import { coordinationStepAction } from "@/server/actions/portfolios";
import { Badge, Card, Notice, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea } from "@/components/forms";
import { Done } from "../../command/shared";

export const metadata = { title: "Coordination request" };

export default async function CoordinationRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const { request: r, events, side, observer } = await loadOr404(() => getCoordination(db, actor, id));
  const step = (s: string, label: string, note: boolean, variant: "primary" | "secondary" | "danger" = "secondary") => (
    <ActionForm key={s} action={coordinationStepAction}><Hidden name="id" value={r.id} /><Hidden name="step" value={s} />{note && <TextArea label="Note" name="note" required maxLength={500} rows={2} />}<Submit variant={variant}>{label}</Submit></ActionForm>
  );
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/coordination" className="text-zp-blue hover:underline">← Inter-office coordination</Link></p>
      <PageHeader eyebrow={COORDINATION_CATEGORY[r.category as keyof typeof COORDINATION_CATEGORY]} title={`${r.reference} — ${r.subject}`} description={<Badge status={r.status} label={COORDINATION_STATUS[r.status as keyof typeof COORDINATION_STATUS]} />} />
      <Done message={done} />
      {observer && <div className="mb-4"><Notice tone="info">Inspector General oversight: you can see this request; the two offices act on it.</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Request">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Requesting office", r.from_title], ["Receiving office", r.to_title], ["Authorisation reference", r.authorisation_ref], ["Officers required", r.officers_required ? String(r.officers_required) : "—"], ["Required by", r.required_by ? fmtDate(r.required_by) : "—"], ["Raised", fmtDateTime(r.created_at)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Administrative requirement</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{r.requirement}</p>
          </Card>
          <Card title="History" bodyClass="p-0">
            <Table head={["#", "When", "Action", "Office", "By", "Note"]} caption="Request history">
              {events.map((e) => <tr key={e.seq}><td className={`${td} text-muted`}>{e.seq}</td><td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(e.at)}</td><td className={td}>{e.action.toLowerCase()}</td><td className={`${td} text-ink-2`}>{e.office}</td><td className={td}>{e.by}</td><td className={`${td} text-ink-2`}>{e.note ?? ""}</td></tr>)}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {side === "RECEIVER" && (
            <Card title="Respond" subtitle="Your office decides how to respond">
              <div className="space-y-3">
                {r.status === "SUBMITTED" && step("ACKNOWLEDGE", "Acknowledge", false, "primary")}
                {["ACKNOWLEDGED", "IN_PROGRESS"].includes(r.status) && <>{step("PROGRESS", "Record progress", true)}{step("COMPLETE", "Confirm completion", true, "primary")}</>}
                {["SUBMITTED", "ACKNOWLEDGED"].includes(r.status) && step("DECLINE", "Decline", true, "danger")}
              </div>
            </Card>
          )}
          {side === "REQUESTER" && ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(r.status) && <Card title="Cancel">{step("CANCEL", "Cancel request", true, "danger")}</Card>}
        </div>
      </div>
    </>
  );
}
