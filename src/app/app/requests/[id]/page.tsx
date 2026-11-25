import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { REQUEST_CATEGORIES } from "@/server/domain/catalogue";
import { availableActions, getRequest, requestHistory, stepsOf, STATUS_LABEL, type RequestAction } from "@/server/domain/requests";
import { requestWorkflowAction, updateRequestAction } from "@/server/actions/requests";
import { Badge, Card, DL, Notice, PageHeader, Timeline, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Request" };

const ACTION_META: Record<RequestAction, { label: string; reason?: "required" | "optional"; variant?: "primary" | "secondary" | "danger"; help?: string }> = {
  SUBMIT: { label: "Submit for review", variant: "primary" },
  ASSIGN: { label: "Assign for review", help: "Moves the request to Under Review at approval level 1." },
  APPROVE: { label: "Approve", variant: "primary", reason: "optional" },
  RETURN: { label: "Return for correction", reason: "required", variant: "secondary" },
  REJECT: { label: "Reject", reason: "required", variant: "danger" },
  START: { label: "Start work", variant: "primary" },
  COMPLETE: { label: "Mark completed", variant: "primary" },
  CLOSE: { label: "Close request", variant: "primary" },
  CANCEL: { label: "Cancel request", reason: "required", variant: "danger" },
  REOPEN: { label: "Reopen (controlled)", reason: "required", variant: "secondary", help: "Requires a justification of at least 10 characters. Prior history is preserved." },
};

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const r = loadOr404(() => getRequest(db, actor, id));
  const history = requestHistory(db, actor, id);
  const actions = availableActions(db, actor, r);
  const steps = stepsOf(r);
  const cat = REQUEST_CATEGORIES.find((c) => c.code === r.category_code);
  const editable = ["DRAFT", "RETURNED"].includes(r.status) && r.created_by === actor.userId;
  const processors = actions.includes("ASSIGN")
    ? all<{ id: string; display_name: string }>(
        db,
        `SELECT DISTINCT u.id, u.display_name FROM role_assignments a JOIN users u ON u.id = a.user_id
          WHERE a.org_unit_id = ? AND a.revoked_at IS NULL AND u.status='ACTIVE' AND a.role_code IN ('PROVINCIAL_COMMANDER','FORMATION_COMMANDER','DIVISION_STAFF_OPS','FORMATION_ADMIN_OFFICER','HQ_OPS_COORDINATOR','DIG_OPS_EXECUTIVE')
          ORDER BY u.display_name`,
        r.origin_org_id,
      )
    : [];
  const lastReturn = [...history].reverse().find((h) => h.action === "RETURN");

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/requests" className="text-zp-blue hover:underline">← Administrative requests</Link></p>
      <PageHeader eyebrow={r.reference} title={r.title} description={<span className="flex flex-wrap items-center gap-2"><Badge status={r.status} label={r.status === "UNDER_REVIEW" ? `Under review · level ${r.current_level} of ${steps.length}` : STATUS_LABEL[r.status]} /> <span>{cat?.name} · {r.origin_name}</span></span>} />
      {r.status === "RETURNED" && lastReturn && (
        <div className="mb-4"><Notice tone="warn" title="Returned for correction">{lastReturn.reason}</Notice></div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Request information">
            <DL
              items={[
                ["Reference", r.reference],
                ["Category", cat?.name],
                ["Originating organisation", r.origin_name],
                ["Priority", r.priority === "PRIORITY" ? "Priority (administrative)" : "Routine"],
                ["Prepared by", r.creator_name],
                ["Assigned processor", r.assignee_name ?? "—"],
                ["Submitted", fmtDateTime(r.submitted_at)],
                ["Due (provisional SLA)", fmtDate(r.due_date)],
                ["Workflow", `Definition v${r.workflow_version}`],
                ["Record version", r.row_version],
              ]}
            />
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold text-muted">Supporting information</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{r.details}</p>
            </div>
          </Card>
          {editable && (
            <Card title={r.status === "RETURNED" ? "Correct and resubmit" : "Edit draft"} subtitle="Only the author can edit drafts and returned requests.">
              <ActionForm action={updateRequestAction}>
                <Hidden name="id" value={r.id} />
                <Hidden name="categoryCode" value={r.category_code} />
                <TextField label="Subject" name="title" defaultValue={r.title} required maxLength={120} />
                <TextArea label="Supporting information" name="details" defaultValue={r.details} required rows={5} maxLength={2000} />
                <Select label="Priority" name="priority" defaultValue={r.priority} options={[{ value: "ROUTINE", label: "Routine" }, { value: "PRIORITY", label: "Priority (administrative)" }]} />
                <Submit variant="secondary">Save changes</Submit>
              </ActionForm>
            </Card>
          )}
          <Card title="Workflow history" subtitle="Every action with actor, time, state change, level and workflow version">
            <Timeline
              items={history.map((h) => ({
                key: h.id,
                title: `${h.action.charAt(0) + h.action.slice(1).toLowerCase()}${h.approval_level ? ` (level ${h.approval_level})` : ""} — ${h.from_status ? `${STATUS_LABEL[h.from_status as keyof typeof STATUS_LABEL]} → ` : ""}${STATUS_LABEL[h.to_status as keyof typeof STATUS_LABEL]}`,
                meta: `${h.actor_name} · ${fmtDateTime(h.created_at)} · workflow v${h.workflow_version}${h.approval_ref ? ` · ${h.approval_ref}` : ""}`,
                body: h.reason,
              }))}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Available actions" subtitle="Offered according to your role, scope and delegations. The server re-validates every action.">
            {actions.length === 0 ? (
              <p className="text-sm text-muted">No actions are available to you at this stage.</p>
            ) : (
              <div className="space-y-4">
                {actions.map((a) => {
                  const m = ACTION_META[a];
                  return (
                    <ActionForm key={a} action={requestWorkflowAction} className="space-y-2 rounded-md border border-line p-3">
                      <Hidden name="id" value={r.id} />
                      <Hidden name="action" value={a} />
                      <Hidden name="version" value={String(r.row_version)} />
                      {m.help && <p className="text-xs text-muted">{m.help}</p>}
                      {a === "ASSIGN" && processors.length > 0 && (
                        <Select label="Processor" name="assigneeId" defaultValue={actor.userId} options={processors.map((p) => ({ value: p.id, label: p.display_name }))} />
                      )}
                      {m.reason && <TextArea label={m.reason === "required" ? "Reason (required)" : "Comment (optional)"} name="reason" rows={2} maxLength={500} />}
                      <Submit variant={m.variant ?? "secondary"} confirm={a === "REJECT" || a === "CANCEL" ? `Confirm: ${m.label}? This cannot be undone.` : undefined}>
                        {m.label}
                      </Submit>
                    </ActionForm>
                  );
                })}
              </div>
            )}
          </Card>
          <Card title="Approval route" subtitle="Demonstration-only routing (not an approved delegation matrix)">
            <ol className="space-y-2 text-sm">
              {steps.map((s, i) => {
                const done = r.status === "UNDER_REVIEW" ? s.level < r.current_level : ["APPROVED", "IN_PROGRESS", "COMPLETED", "CLOSED"].includes(r.status);
                const current = r.status === "UNDER_REVIEW" && s.level === r.current_level;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-ok text-white" : current ? "bg-warn text-white" : "bg-slate-200 text-slate-600"}`}>{s.level}</span>
                    <span>{s.label}{current ? " — awaiting decision" : done ? " — approved" : ""}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
