import { requireActor } from "@/server/auth/session";
import { all, getDb } from "@/server/db/connection";
import { PERMISSIONS, ROLE_BY_CODE, type Permission } from "@/server/domain/catalogue";
import { scopeFor } from "@/server/domain/policy";
import { Card, DL, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Submit, TextField } from "@/components/forms";
import { changePasswordAction } from "@/server/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/server/domain/auth";

export const metadata = { title: "My profile and access" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const actor = await requireActor();
  const { reason } = await searchParams;
  const dels = await all<{ domain: string; org_name: string; category_code: string | null; valid_to: string | null; approval_ref: string }>(
    getDb(),
    "SELECT d.*, o.name AS org_name FROM delegations d JOIN org_units o ON o.id = d.org_unit_id WHERE d.user_id = ? AND d.revoked_at IS NULL",
    actor.userId,
  );
  const effective = (Object.keys(PERMISSIONS) as Permission[]).map((p) => [p, scopeFor(actor, p)] as const).filter(([, s]) => s.national || s.units.length);
  const orgName = Object.fromEntries(actor.assignments.map((a) => [a.orgUnitId, a.orgUnitName]));
  return (
    <>
      <PageHeader eyebrow="My account" title={actor.displayName} description="Your identity, active role assignments, delegations and effective permissions as evaluated by the server right now." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Identity"><DL items={[["Display name", actor.displayName], ["Position title", actor.positionTitle], ["Account type", "Synthetic demonstration account"], ["Authentication", "Username and password (scrypt)"]]} /></Card>
        <Card title="Change password" subtitle={`At least ${PASSWORD_MIN_LENGTH} characters, using three of: lower-case, upper-case, digits, symbols`}>
          {reason === "change-password" && <div className="mb-3"><Notice tone="warn" title="Password change required">You signed in with a temporary password. Choose a new password now.</Notice></div>}
          <ActionForm action={changePasswordAction} resetOnSuccess>
            <TextField label="Current password" name="current" type="password" required />
            <TextField label="New password" name="next" type="password" required />
            <TextField label="Confirm new password" name="confirm" type="password" required />
            <Submit>Change password</Submit>
          </ActionForm>
        </Card>
        <Card title="Active role assignments" bodyClass="p-0">
          <Table head={["Role", "Organisational scope", "Valid to"]}>{actor.assignments.map((a) => <tr key={a.id}><td className={td}>{ROLE_BY_CODE[a.roleCode].name}</td><td className={td}>{a.orgUnitName}</td><td className={td}>{fmtDate(a.validTo)}</td></tr>)}</Table>
        </Card>
        <Card title="Delegated approval authority" bodyClass="p-0">
          <Table head={["Domain", "Organisation", "Category", "Reference"]} empty="You hold no delegations and cannot approve.">{dels.map((d, i) => <tr key={i}><td className={td}>{d.domain}</td><td className={td}>{d.org_name}</td><td className={td}>{d.category_code ?? "All"}</td><td className={`${td} font-mono text-xs`}>{d.approval_ref}</td></tr>)}</Table>
        </Card>
        <Card title="Effective permissions" bodyClass="p-0">
          <Table head={["Permission", "Scope"]}>{effective.map(([p, s]) => <tr key={p}><td className={td}><span className="font-mono text-xs">{p}</span><span className="block text-xs text-muted">{PERMISSIONS[p]}</span></td><td className={td}>{s.national ? "National" : s.units.map((u) => orgName[u]).join(", ")}</td></tr>)}</Table>
        </Card>
      </div>
    </>
  );
}
