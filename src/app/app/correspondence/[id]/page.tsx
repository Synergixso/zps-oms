import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import {
  CORR_STATUS_LABEL, assignableOfficers, correspondenceHistory, filesEnabled, getCorrespondence, listFiles,
} from "@/server/domain/correspondence";
import {
  assignCorrespondenceAction, attachCorrespondenceFileAction, correspondenceStatusAction, removeCorrespondenceFileAction,
} from "@/server/actions/admin-records";
import { Badge, Card, DL, Notice, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Correspondence" };

const ACTION_LABEL: Record<string, string> = { REGISTER: "Registered", ASSIGN: "Assigned", REASSIGN: "Reassigned", STATUS: "Status changed", FILE_ADD: "Document added", FILE_REMOVE: "Document removed" };

export default async function CorrespondenceRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const c = await loadOr404(() => getCorrespondence(db, actor, id));
  const [history, files, officers, storage] = await Promise.all([correspondenceHistory(db, actor, id), listFiles(db, actor, id), assignableOfficers(db, actor, id), filesEnabled(db)]);
  const manager = can(actor, "correspondence.manage", c.org_unit_id);
  const assignee = c.assigned_to === actor.userId;
  const open = !["CLOSED", "FILED"].includes(c.status);
  const canAttach = storage && c.status !== "FILED" && (can(actor, "correspondence.register", c.org_unit_id) || manager || assignee);
  const steps: Array<{ to: string; label: string; needs?: "followUp" | "fileRef" }> = [];
  if ((manager || assignee) && c.status === "ASSIGNED") steps.push({ to: "IN_PROGRESS", label: "Start processing" });
  if ((manager || assignee) && c.status === "IN_PROGRESS") steps.push({ to: "AWAITING_REPLY", label: "Awaiting a reply", needs: "followUp" }, { to: "CLOSED", label: "Close" });
  if ((manager || assignee) && c.status === "AWAITING_REPLY") steps.push({ to: "IN_PROGRESS", label: "Reply received: resume" }, { to: "CLOSED", label: "Close" });
  if (manager && c.status === "CLOSED") steps.push({ to: "FILED", label: "File", needs: "fileRef" }, { to: "IN_PROGRESS", label: "Reopen" });
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/correspondence" className="text-zp-blue hover:underline">← Correspondence register</Link></p>
      <PageHeader eyebrow={`${c.reference} · ${c.direction === "INCOMING" ? "Incoming" : "Outgoing"} · ${c.unit_name}`} title={c.subject}
        description={<span className="flex flex-wrap items-center gap-2"><Badge status={c.status} label={CORR_STATUS_LABEL[c.status]} />{c.classification === "RESTRICTED" && <span className="rounded bg-err-bg px-1.5 py-0.5 text-[11px] font-bold text-err">RESTRICTED</span>}</span>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Record">
            <DL items={[
              [c.direction === "INCOMING" ? "From" : "To", c.counterpart_org_name ?? c.counterpart_name ?? "—"], ["Their reference", c.letter_reference ?? "—"], ["Letter date", fmtDate(c.letter_date)],
              ["Registered", fmtDate(c.register_date)], ["Registering organisation", c.unit_name], ["Assigned to", c.assigned_to_name ?? "Not yet assigned"],
              ["Follow-up", fmtDate(c.follow_up_date)], ["Filing reference", c.file_reference ?? "—"], ["Summary", c.summary ?? "—"], ["Registered by", `${c.created_by_name}, ${fmtDateTime(c.created_at)}`],
            ]} />
          </Card>
          <Card title={`Documents (${files.length})`} subtitle={storage ? "PDF only, up to 5 MB; checked before storage; every download is audited." : "Document storage is switched off for correspondence."} bodyClass="p-0">
            <Table head={["Document", "Size", "Added", ...(manager ? [""] : [])]} caption="Correspondence documents" empty="No documents attached.">
              {files.map((f) => (
                <tr key={f.id}>
                  <td className={td}><a href={`/app/correspondence/files/${f.id}`} className="font-semibold text-zp-blue hover:underline">{f.file_name}</a><p className="font-mono text-[10px] text-muted">SHA-256 {f.sha256.slice(0, 16)}…</p></td>
                  <td className={`${td} tabular-nums text-ink-2`}>{(f.size_bytes / 1024).toFixed(0)} KB</td>
                  <td className={`${td} text-ink-2`}>{f.uploaded_by_name}, {fmtDateTime(f.uploaded_at)}</td>
                  {manager && (
                    <td className={td}>
                      <ActionForm action={removeCorrespondenceFileAction} className="flex flex-wrap items-end gap-2">
                        <Hidden name="id" value={c.id} /><Hidden name="fileId" value={f.id} />
                        <TextField label="Reason" name="reason" maxLength={200} />
                        <Submit variant="secondary" confirm="Remove this document from the record? It stays in the history.">Remove</Submit>
                      </ActionForm>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
            {canAttach && (
              <div className="border-t border-line p-4">
                <ActionForm action={attachCorrespondenceFileAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
                  <Hidden name="id" value={c.id} />
                  <div>
                    <label htmlFor="file" className="block text-xs font-semibold text-ink-2">Add a PDF document</label>
                    <input id="file" name="file" type="file" accept="application/pdf,.pdf" required className="mt-1 block max-w-full text-sm" />
                  </div>
                  <Submit variant="secondary">Upload</Submit>
                </ActionForm>
              </div>
            )}
          </Card>
          <Card title="History" bodyClass="p-0">
            <Table head={["When", "Action", "By", "Detail"]} caption="Correspondence history">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(h.at)}</td>
                  <td className={td}>{h.action === "STATUS" && h.to_status ? `Status: ${CORR_STATUS_LABEL[h.to_status] ?? h.to_status}` : ACTION_LABEL[h.action] ?? h.action}</td>
                  <td className={`${td} text-ink-2`}>{h.actor_name}</td>
                  <td className={`${td} text-ink-2`}>{h.note ?? "—"}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Actions" subtitle="Offered according to your role and scope; the server re-validates.">
            {!manager && !assignee ? <p className="text-sm text-muted">You can view this record. Assignment and processing are done by correspondence managers and the assigned officer.</p> : (
              <div className="space-y-4">
                {manager && open && (
                  <ActionForm action={assignCorrespondenceAction} className="space-y-2">
                    <Hidden name="id" value={c.id} />
                    <Select label={c.assigned_to ? "Reassign to" : "Assign to"} name="userId" required options={officers} defaultValue={c.assigned_to ?? undefined} placeholder="Select an officer" />
                    <TextField label="Instruction (optional)" name="note" maxLength={300} />
                    <Submit variant="secondary">{c.assigned_to ? "Reassign" : "Assign"}</Submit>
                  </ActionForm>
                )}
                {steps.length > 0 && (
                  <ActionForm action={correspondenceStatusAction} className="space-y-2 border-t border-line pt-3">
                    <Hidden name="id" value={c.id} />
                    {steps.some((s) => s.needs === "followUp") && <TextField label="Follow-up date (when awaiting a reply)" name="followUpDate" type="date" defaultValue={c.follow_up_date ?? undefined} />}
                    {steps.some((s) => s.needs === "fileRef") && <TextField label="Filing reference (to file)" name="fileReference" maxLength={80} />}
                    <TextArea label="Note (optional)" name="note" rows={2} maxLength={300} />
                    <div className="flex flex-wrap gap-2">
                      {steps.map((s) => <Submit key={s.to} variant={s.to === "CLOSED" || s.to === "FILED" ? "primary" : "secondary"} name="status" value={s.to}>{s.label}</Submit>)}
                    </div>
                  </ActionForm>
                )}
                {!open && steps.length === 0 && <p className="text-sm text-muted">This record is {CORR_STATUS_LABEL[c.status].toLowerCase()}.</p>}
              </div>
            )}
          </Card>
          {c.status === "REGISTERED" && !manager && <Notice tone="info">Waiting for a correspondence manager to assign an officer.</Notice>}
        </div>
      </div>
    </>
  );
}
