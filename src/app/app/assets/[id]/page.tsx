import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { ASSET_STATUS_LABEL, assetActionsFor, assetEvents, CONDITIONS, getAsset, type AssetAction } from "@/server/domain/assets";
import { assetWorkflowAction } from "@/server/actions/assets";
import { Badge, Card, DL, PageHeader, Timeline, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Asset" };

const META: Record<AssetAction, { label: string; fields: Array<"custodian" | "toOrg" | "condition" | "reference" | "note">; variant?: "primary" | "secondary" | "danger" }> = {
  ISSUE: { label: "Issue", fields: ["custodian", "note"], variant: "primary" },
  RETURN: { label: "Record return", fields: ["condition", "note"], variant: "primary" },
  TRANSFER: { label: "Initiate transfer", fields: ["toOrg", "reference", "note"] },
  RECEIVE: { label: "Receive transfer", fields: ["condition", "note"], variant: "primary" },
  INSPECT: { label: "Record inspection", fields: ["condition", "note"] },
  SEND_REPAIR: { label: "Send for repair", fields: ["note"] },
  REPAIRED: { label: "Return from repair", fields: ["condition", "note"], variant: "primary" },
  DISPOSE: { label: "Record approved disposal", fields: ["reference", "note"], variant: "danger" },
};

export default async function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const db = getDb();
  const a = await loadOr404(() => getAsset(db, actor, id));
  const events = await assetEvents(db, actor, id);
  const actions = assetActionsFor(actor, a);
  const orgs = actions.includes("TRANSFER") ? await all<{ id: string; name: string }>(db, "SELECT id, name FROM org_units WHERE status='ACTIVE' AND id <> ? ORDER BY name", a.custody_org_id) : [];
  const conds = CONDITIONS.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/assets" className="text-zp-blue hover:underline">← General asset register</Link></p>
      <PageHeader eyebrow={`${a.asset_tag} · ${a.category_name}`} title={a.description} description={<span className="flex gap-2"><Badge status={a.status} label={ASSET_STATUS_LABEL[a.status]} /><Badge status={a.condition} /></span>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Asset record">
            <DL items={[["Asset tag", a.asset_tag], ["Category", a.category_name], ["Custody organisation", a.custody_name], ["Custodian reference", a.custodian_ref ?? "—"], ["Transfer destination", a.transfer_to_name ?? "—"], ["Condition", a.condition], ["Last inspected", fmtDate(a.last_inspected_at)], ["Last updated", fmtDateTime(a.updated_at)]]} />
          </Card>
          <Card title="Custody and event history" subtitle="Complete history; prior custodians and conditions are never overwritten">
            <Timeline
              items={events.map((e) => {
                const before = e.before_state ? JSON.parse(e.before_state) : null;
                const after = e.after_state ? JSON.parse(e.after_state) : null;
                return {
                  key: e.id,
                  title: e.event_type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
                  meta: `${e.actor_name} · ${fmtDateTime(e.created_at)}${e.reference ? ` · ref ${e.reference}` : ""}`,
                  body: [before && after ? `${before.status} / ${before.condition} / ${before.custody} → ${after.status} / ${after.condition} / ${after.custody}${after.custodian ? ` (${after.custodian})` : ""}` : null, e.note].filter(Boolean).join(" — "),
                };
              })}
            />
          </Card>
        </div>
        <Card title="Available actions" subtitle="Offered according to your role and scope; the server re-validates.">
          {actions.length === 0 ? (
            <p className="text-sm text-muted">No actions are available to you for this asset.</p>
          ) : (
            <div className="space-y-3">
              {actions.map((act) => (
                <details key={act} className="rounded-md border border-line p-3 open:shadow-sm">
                  <summary className="cursor-pointer text-sm font-semibold">{META[act].label}</summary>
                  <ActionForm action={assetWorkflowAction} className="mt-3 space-y-2">
                    <Hidden name="id" value={a.id} />
                    <Hidden name="action" value={act} />
                    {META[act].fields.includes("custodian") && <TextField label="Receiving office / post reference" name="custodianRef" required maxLength={60} />}
                    {META[act].fields.includes("toOrg") && <Select label="Receiving organisation" name="toOrgId" required placeholder="Select" options={orgs.map((o) => ({ value: o.id, label: o.name }))} />}
                    {META[act].fields.includes("condition") && <Select label="Condition" name="condition" defaultValue={a.condition} options={conds} />}
                    {META[act].fields.includes("reference") && <TextField label="Authority reference" name="reference" required maxLength={40} />}
                    {META[act].fields.includes("note") && <TextArea label="Note" name="note" rows={2} maxLength={300} />}
                    <Submit variant={META[act].variant ?? "secondary"} confirm={act === "DISPOSE" ? "Record disposal? Disposed assets cannot be changed." : undefined}>{META[act].label}</Submit>
                  </ActionForm>
                </details>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
