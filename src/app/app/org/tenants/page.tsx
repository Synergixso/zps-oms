import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listTenants, movableFormations } from "@/server/domain/tenants";
import { provisionTenantAction } from "@/server/actions/org";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Tenant management" };

export default async function TenantsPage() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "tenant.view"))) return <AccessDenied what="tenant management" />;
  const db = getDb();
  const manage = hasPermission(actor, "tenant.manage");
  const [tenants, formations] = await Promise.all([listTenants(db, actor), manage ? movableFormations(db, actor) : Promise.resolve([])]);
  return (
    <>
      <PageHeader eyebrow="Module 01 · Multi-tenancy" title="Tenant management" description="Administrative environments: the national tenant, one tenant per Provincial Division, and formation tenants. Every unit and record belongs to exactly one tenant; isolation is enforced on the server." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`${tenants.length} tenants`} className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Tenant", "Type", "Root structures", "Active units", "Records", "Status"]}>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className={td}><span className="font-semibold">{t.name}</span><span className="block font-mono text-xs text-muted">{t.code}{t.parent_name ? ` · under ${t.parent_name}` : ""} · since {fmtDate(t.created_at)}</span></td>
                <td className={`${td} text-xs`}>{t.tenant_type.toLowerCase()}</td>
                <td className={`${td} text-xs`}>{t.root_units ?? "—"}</td>
                <td className={`${td} tabular-nums`}>{t.units}</td>
                <td className={`${td} tabular-nums`}>{t.records}</td>
                <td className={td}><Badge status={t.status} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="space-y-4">
          {manage ? (
            <Card title="Provision a formation tenant" subtitle="Moves a national formation and everything under it into its own tenant">
              {formations.length === 0 ? <p className="text-sm text-muted">Every formation already has its own tenant.</p> : (
                <ActionForm action={provisionTenantAction} resetOnSuccess>
                  <Select label="Formation" name="formationId" required placeholder="Select formation" options={formations.map((f) => ({ value: f.id, label: f.name }))} />
                  <TextField label="Tenant code" name="code" required placeholder="e.g. FM-PU" />
                  <TextField label="Tenant name" name="name" required />
                  <TextArea label="Approval reference and reason" name="reason" rows={2} required />
                  <Submit confirm="Provision the tenant and move the formation's units and records into it?">Provision tenant</Submit>
                </ActionForm>
              )}
            </Card>
          ) : null}
          <Notice tone="info" title="Technical view">Counts are metadata; this page gives no access to personnel or business records.</Notice>
        </div>
      </div>
    </>
  );
}
