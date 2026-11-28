import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { coordinationTargets, listCoordination, COORDINATION_CATEGORY, COORDINATION_STATUS } from "@/server/domain/coordination";
import { submitCoordinationAction } from "@/server/actions/portfolios";
import { Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";
import { Done } from "../command/shared";

export const metadata = { title: "Inter-office coordination" };

/**
 * Inter-office coordination between executive portfolio offices (DEC-088). A request is not an instruction: the
 * receiving office keeps its own mandate and decides how to respond. Visible to the two offices and the IG only.
 */
export default async function CoordinationPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { done } = await searchParams;
  const [rows, targets] = await Promise.all([listCoordination(db, actor), coordinationTargets(db, actor)]);
  if (!targets.from.length) {
    return (<><PageHeader eyebrow="Executive portfolios" title="Inter-office coordination" /><Notice tone="info" title="For executive portfolio offices">Coordination requests are exchanged between the IG, DIG Operations, DIG Administration, DIG Special Duties / State House and the Operations HQ Commissioners. You hold none of these offices.</Notice></>);
  }
  return (
    <>
      <PageHeader eyebrow="Executive portfolios" title="Inter-office coordination"
        description="Administrative coordination between the DIG portfolios — for example DIG Operations facilitating authorised personnel support for DIG Special Duties / State House. A request confers no command authority over the receiving office." />
      <Done message={done} />
      <div className="mb-4"><Notice tone="warn">Record only the administrative requirement, numbers, authority reference and dates. Never record protection plans, VVIP schedules, routes, movements, deployments, vulnerabilities or protective intelligence — such text is refused.</Notice></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Requests" subtitle="Restricted to the requesting office, the receiving office and the Inspector General" bodyClass="p-0">
            <Table head={["Reference", "Subject", "From → to", "Officers", "Required by", "Status"]} caption="Coordination requests" empty="No coordination requests.">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/coordination/${r.id}`}>{r.reference}</Link></td>
                  <td className={td}>{r.subject}<span className="block text-xs text-muted">{COORDINATION_CATEGORY[r.category as keyof typeof COORDINATION_CATEGORY]}</span></td>
                  <td className={`${td} text-xs text-ink-2`}>{r.from_title} → {r.to_title}</td><td className={td}>{r.officers_required ?? "—"}</td>
                  <td className={td}>{r.required_by ? fmtDate(r.required_by) : "—"}</td><td className={td}><Badge status={r.status} label={COORDINATION_STATUS[r.status as keyof typeof COORDINATION_STATUS]} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <Card title="New request">
          <ActionForm action={submitCoordinationAction}>
            <Select label="From (your office)" name="fromPositionId" required options={targets.from.map((o) => ({ value: o.id, label: o.title }))} />
            <Select label="To" name="toPositionId" required options={targets.to.map((o) => ({ value: o.id, label: o.title }))} />
            <Select label="Category" name="category" required options={Object.entries(COORDINATION_CATEGORY).map(([value, label]) => ({ value, label }))} />
            <TextField label="Subject" name="subject" required maxLength={160} />
            <TextArea label="Administrative requirement" name="requirement" required maxLength={500} rows={4} />
            <TextField label="Officers required (number)" name="officersRequired" type="number" />
            <TextField label="Authorisation reference" name="authorisationRef" required maxLength={60} />
            <TextField label="Required by" name="requiredBy" type="date" />
            <Submit>Send request</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
