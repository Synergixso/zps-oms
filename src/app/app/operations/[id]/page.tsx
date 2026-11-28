import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getActivity, CLASSIFICATION, OPS_CATEGORY, OPS_STATUS } from "@/server/domain/ops-admin";
import { updateActivityAction } from "@/server/actions/portfolios";
import { Badge, Card, Notice, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { Done } from "../../command/shared";

export const metadata = { title: "Operations administration record" };

const KIND: Record<string, string> = { REGISTER: "Registered", PROGRESS: "Progress update", RESOURCE_REQUEST: "Resource request", STATUS: "Status change", REVIEW: "Post-event review" };
const NEXT: Record<string, Array<[string, string]>> = { REGISTERED: [["ACTIVE", "Active"], ["CLOSED", "Closed (not proceeded with)"]], ACTIVE: [["COMPLETED", "Completed"]], REVIEWED: [["CLOSED", "Closed"]] };

export default async function ActivityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const { activity: a, updates, canManage } = await loadOr404(() => getActivity(db, actor, id));
  const open = a.status !== "CLOSED";
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/operations" className="text-zp-blue hover:underline">← Operations administration</Link></p>
      <PageHeader eyebrow={`${OPS_CATEGORY[a.category]} · ${CLASSIFICATION[a.category][a.classification] ?? a.classification}`} title={`${a.reference} — ${a.title}`} description={<Badge status={a.status} label={OPS_STATUS[a.status as keyof typeof OPS_STATUS]} />} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Accountability record">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["Responsible unit", a.responsible_unit], ["Coordinating unit", a.coordinating_unit ?? "—"], ["Authorising reference", a.authorising_ref], ["Authorising office", a.authorising_office_title ?? "—"],
                ["Dates", `${fmtDate(a.start_date)}${a.end_date ? ` – ${fmtDate(a.end_date)}` : " (open)"}`], ["Personnel committed", String(a.personnel_committed)], ["Outcome", a.outcome_summary ?? "Not yet recorded"], ["Post-event review", a.review_summary ?? "Not yet recorded"]].map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="History" bodyClass="p-0">
            <Table head={["#", "When", "Entry", "Status", "Personnel", "Note", "By"]} caption="Record history">
              {updates.map((u) => (
                <tr key={u.seq}><td className={`${td} text-muted`}>{u.seq}</td><td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(u.at)}</td><td className={td}>{KIND[u.kind] ?? u.kind}</td>
                  <td className={td}>{u.to_status ? OPS_STATUS[u.to_status as keyof typeof OPS_STATUS] : "—"}</td><td className={td}>{u.personnel ?? "—"}</td><td className={`${td} text-ink-2`}>{u.note ?? ""}</td><td className={td}>{u.by}</td></tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {!canManage && <Notice tone="info">You can view this record. Updates are made by officers with management scope over the responsible unit.</Notice>}
          {canManage && open && (
            <>
              {(NEXT[a.status] ?? []).length > 0 && (
                <Card title="Change status">
                  <ActionForm action={updateActivityAction}>
                    <Hidden name="id" value={a.id} /><Hidden name="kind" value="STATUS" /><Hidden name="version" value={String(a.version)} />
                    <Select label="New status" name="toStatus" required options={(NEXT[a.status] ?? []).map(([value, label]) => ({ value, label }))} />
                    {a.status === "ACTIVE" && <TextArea label="Administrative outcome (required to complete)" name="outcome" maxLength={500} rows={3} />}
                    <Submit>Record</Submit>
                  </ActionForm>
                </Card>
              )}
              {a.status === "COMPLETED" && (
                <Card title="Post-event administrative review">
                  <ActionForm action={updateActivityAction}><Hidden name="id" value={a.id} /><Hidden name="kind" value="REVIEW" /><Hidden name="version" value={String(a.version)} />
                    <TextArea label="Review summary" name="note" required maxLength={500} rows={4} /><Submit>Record review</Submit></ActionForm>
                </Card>
              )}
              {["REGISTERED", "ACTIVE"].includes(a.status) && (
                <Card title="Progress or resource request">
                  <ActionForm action={updateActivityAction} resetOnSuccess><Hidden name="id" value={a.id} /><Hidden name="version" value={String(a.version)} />
                    <Select label="Entry" name="kind" required options={[{ value: "PROGRESS", label: "Progress update" }, { value: "RESOURCE_REQUEST", label: "Resource request" }]} />
                    <TextArea label="Administrative note" name="note" required maxLength={500} rows={3} />
                    <TextField label="Personnel committed (update, optional)" name="personnel" type="number" />
                    <Submit>Record</Submit></ActionForm>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
