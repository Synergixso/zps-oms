import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { TRANSITIONS, STATUS_LABEL, type ApprovalStep } from "@/server/domain/requests";
import { MAINT_LABEL, MAINT_TRANSITIONS } from "@/server/domain/fleet";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Workflow definitions" };

export default async function Workflows() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "workflow.view")) return <AccessDenied what="workflow definitions" />;
  const defs = await all<{ id: string; category_code: string; name: string; version: number; approval_steps: string; status: string; note: string; created_at: string }>(
    getDb(),
    "SELECT w.*, c.name FROM workflow_definitions w JOIN request_categories c ON c.code = w.category_code ORDER BY c.name, w.version",
  );
  return (
    <>
      <PageHeader eyebrow="M03 · Workflow configuration" title="Workflow definitions" description="Versioned definitions. Every request action records the definition version it was processed under." />
      <div className="mb-4"><Notice tone="warn" title="Demonstration routing only">These routes are not an approved Zambia Police Service delegation matrix. Editing definitions requires a separately approved change process (DEC-008) and is not enabled in this prototype.</Notice></div>
      <div className="space-y-4">
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
