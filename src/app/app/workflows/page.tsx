import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { TRANSITIONS, STATUS_LABEL, type ApprovalStep } from "@/server/domain/requests";
import { MAINT_LABEL, MAINT_TRANSITIONS } from "@/server/domain/fleet";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";
import { MPR_CATEGORIES, listManpowerWorkflows } from "@/server/domain/manpower";
import { hasPermission } from "@/server/domain/policy";
import { publishWorkflowAction } from "@/server/actions/personnel";

export const metadata = { title: "Workflow definitions" };

export default async function Workflows() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "workflow.view")) return <AccessDenied what="workflow definitions" />;
  const defs = await all<{ id: string; category_code: string; name: string; version: number; approval_steps: string; status: string; note: string; created_at: string }>(
    getDb(),
    "SELECT w.*, c.name FROM workflow_definitions w JOIN request_categories c ON c.code = w.category_code ORDER BY c.name, w.version",
  );
  const mpw = await listManpowerWorkflows(getDb());
  const configure = hasPermission(actor, "workflow.configure");
  const authority = [{ value: "APPROVAL_UNIT", label: "Approval authority named on the request" }, { value: "HQ", label: "National HQ (Service Headquarters)" }];
  return (
    <>
      <PageHeader eyebrow="Module 09 · Workflow configuration" title="Workflow definitions" description="Versioned definitions. Every request action records the definition version it was processed under." />
      <div className="mb-4"><Notice tone="warn" title="Provisional routing">These chains are not an approved Zambia Police Service delegation matrix (DEC-008). Manpower chains can be republished by the HQ Operations Coordinator; every version is kept and audited, and submitted requests stay on the version they started with. Administrative request definitions are changed through migrations.</Notice></div>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Manpower request approval chains" subtitle="Each level is decided by an officer holding a MANPOWER delegation at that authority; no one decides two levels of the same request" className="lg:col-span-2" bodyClass="p-0">
            <Table head={["Category", "Version", "Approval levels", "Status", "Published"]}>
              {mpw.map((w) => (
                <tr key={w.id}>
                  <td className={`${td} font-semibold`}>{MPR_CATEGORIES[w.category as keyof typeof MPR_CATEGORIES] ?? w.category}</td>
                  <td className={td}>v{w.version}</td>
                  <td className={td}>{w.steps.map((s) => `L${s.level}: ${s.label}`).join(" → ")}{w.note && <span className="block text-xs text-muted">{w.note}</span>}</td>
                  <td className={td}><Badge status={w.status} /></td>
                  <td className={`${td} text-xs`}>{fmtDate(w.created_at)}{w.created_by_name ? ` · ${w.created_by_name}` : ""}</td>
                </tr>
              ))}
            </Table>
          </Card>
          {configure ? (
            <Card title="Publish a new chain version" subtitle="Leave a level's label empty to omit it">
              <ActionForm action={publishWorkflowAction}>
                <Select label="Category" name="category" required options={Object.entries(MPR_CATEGORIES).map(([value, label]) => ({ value, label }))} />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border border-line p-2">
                    <p className="text-xs font-bold text-ink-2">Level {i}{i === 1 ? " (required)" : ""}</p>
                    <Select label="Authority" name={`authority_${i}`} placeholder={i === 1 ? undefined : "None"} defaultValue={i === 1 ? "APPROVAL_UNIT" : ""} options={authority} />
                    <TextField label="Label" name={`label_${i}`} required={i === 1} />
                  </div>
                ))}
                <TextArea label="Approval reference and reason" name="note" rows={2} required />
                <Submit confirm="Publish this version? It applies to requests submitted from now on.">Publish version</Submit>
              </ActionForm>
            </Card>
          ) : <Notice tone="info">Approval chains are published by the HQ Operations Coordinator through an approved change process.</Notice>}
        </div>
        <Card title="Administrative request definitions" bodyClass="p-0">
          <Table head={["Category", "Version", "Approval levels", "Status", "Note", "Created"]}>
            {defs.map((d) => (
              <tr key={d.id}>
                <td className={`${td} font-semibold`}>{d.name}</td>
                <td className={td}>v{d.version}</td>
                <td className={td}>{(JSON.parse(d.approval_steps) as ApprovalStep[]).map((s) => `L${s.level}: ${s.label}`).join(" → ")}</td>
                <td className={td}><Badge status={d.status} /></td>
                <td className={`${td} text-xs text-muted`}>{d.note}</td>
                <td className={td}>{fmtDate(d.created_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Request state transitions" bodyClass="p-0">
            <Table head={["Action", "From", "To"]}>
              {Object.entries(TRANSITIONS).map(([a, t]) => <tr key={a}><td className={`${td} font-mono text-xs`}>{a}</td><td className={td}>{t.from.map((s) => STATUS_LABEL[s]).join(", ")}</td><td className={td}>{STATUS_LABEL[t.to]}</td></tr>)}
            </Table>
          </Card>
          <Card title="Maintenance transitions" bodyClass="p-0">
            <Table head={["Action", "Allowed from"]}>
              {Object.entries(MAINT_TRANSITIONS).map(([a, from]) => <tr key={a}><td className={`${td} font-mono text-xs`}>{a}</td><td className={td}>{from.map((s) => MAINT_LABEL[s]).join(", ")}</td></tr>)}
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}
