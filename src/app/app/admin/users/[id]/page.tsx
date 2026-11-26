import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { REQUEST_CATEGORIES, ROLES, ROLE_BY_CODE } from "@/server/domain/catalogue";
import { hasPermission } from "@/server/domain/policy";
import { userDetail, userInScope } from "@/server/domain/iam";
import { assignRoleAction, grantDelegationAction, issueTemporaryPasswordAction, revokeAssignmentAction, revokeDelegationAction, setUserStatusAction, unlockAccountAction } from "@/server/actions/iam";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "User" };

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!await pageAllowed(actor, "user.view")) return <AccessDenied what="user administration" />;
  const db = getDb();
  const { user, assignments, delegations } = await loadOr404(() => userDetail(db, actor, id));
  const self = id === actor.userId;
  // Account support is scoped: the domain re-checks, this only decides which controls are shown.
  const support = hasPermission(actor, "user.support") && await userInScope(db, actor, "user.support", id, "all");
  const orgs = await all<{ id: string; name: string; unit_type: string }>(db, "SELECT id, name, unit_type FROM org_units WHERE status='ACTIVE' ORDER BY unit_type, name");
  const now = new Date().toISOString();
  const active = (a: { revoked_at: string | null; valid_to: string | null }) => !a.revoked_at && (!a.valid_to || a.valid_to > now);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/admin/users" className="text-zp-blue hover:underline">← Users & access</Link></p>
      <PageHeader eyebrow={user.username} title={user.display_name} description={<Badge status={user.status} />} />
      {self && <div className="mb-4"><Notice tone="warn" title="This is your own account">You cannot change your own access, delegations or account status. Another authorised administrator must do this.</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Account"><DL items={[["Display name", user.display_name], ["Username", user.username], ["Position title (configurable)", user.position_title], ["Status", user.status], ["Status reason", user.status_reason ?? "—"], ["Created", fmtDate(user.created_at)], ["Password", user.has_password ? (user.must_change_password ? "Temporary — must change at next sign-in" : "Set") : "Not issued (cannot sign in)"], ["Last sign-in", fmtDate(user.last_login_at)], ["Sign-in lockout", user.locked_until && user.locked_until > now ? `Locked until ${new Date(user.locked_until).toLocaleTimeString("en-GB", { timeZone: "Africa/Lusaka" })}` : "Not locked"]]} /></Card>
          <Card title="Role assignments (role + organisational scope)" bodyClass="p-0">
            <Table head={["Role", "Organisation scope", "Valid from", "Valid to", "Justification", "State", ""]} empty="No role assignments — this account has no access.">
              {assignments.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className={`${td} font-semibold`}>{ROLE_BY_CODE[a.role_code]?.name}</td>
                  <td className={td}>{a.org_name}</td>
                  <td className={td}>{fmtDate(a.valid_from)}</td>
                  <td className={td}>{fmtDate(a.valid_to)}</td>
                  <td className={`${td} text-xs text-ink-2`}>{a.justification}{a.granted_by_name ? ` · by ${a.granted_by_name}` : ""}</td>
                  <td className={td}>{a.revoked_at ? <Badge status="REVOKE" label="Revoked" /> : active(a) ? <Badge status="ACTIVE" /> : <Badge status="PENDING" label="Expired" />}</td>
                  <td className={td}>
                    {active(a) && !self && hasPermission(actor, "grant.revoke") && (
                      <ActionForm action={revokeAssignmentAction} className="space-y-1">
                        <Hidden name="assignmentId" value={a.id} />
                        <TextField label="Reason" name="reason" maxLength={120} />
                        <Submit variant="danger" confirm="Revoke this role assignment? Access ends immediately.">Revoke</Submit>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Delegations of approval authority" subtitle="Approval requires a delegation AND an active business role at the same organisation" bodyClass="p-0">
            <Table head={["Domain", "Organisation", "Category", "Valid to", "Approval ref", "State", ""]} empty="No delegations — this user cannot approve.">
              {delegations.map((d) => (
                <tr key={d.id}>
                  <td className={td}>{d.domain.replace("_", " ").toLowerCase()}</td>
                  <td className={td}>{d.org_name}</td>
                  <td className={td}>{d.category_code ?? "All"}</td>
                  <td className={td}>{fmtDate(d.valid_to)}</td>
                  <td className={`${td} font-mono text-xs`}>{d.approval_ref}</td>
                  <td className={td}>{d.revoked_at ? <Badge status="REVOKE" label="Revoked" /> : <Badge status="ACTIVE" />}</td>
                  <td className={td}>
                    {!d.revoked_at && !self && hasPermission(actor, "delegation.revoke") && (
                      <ActionForm action={revokeDelegationAction}><Hidden name="delegationId" value={d.id} /><Submit variant="danger" confirm="Revoke this delegation?">Revoke</Submit></ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {!self && hasPermission(actor, "grant.assign") && user.status === "ACTIVE" && (
            <Card title="Assign role and scope">
              <ActionForm action={assignRoleAction} resetOnSuccess>
                <Hidden name="userId" value={user.id} />
                <Select label="Role" name="roleCode" required placeholder="Select role" options={ROLES.map((r) => ({ value: r.code, label: r.name }))} />
                <Select label="Organisational scope" name="orgUnitId" required placeholder="Select organisation" options={orgs.map((o) => ({ value: o.id, label: o.name }))} />
                <TextField label="Valid to" name="validTo" type="date" hint="Required for time-limited roles (e.g. Internal Auditor, max 180 days)" />
                <TextField label="Approval reference / justification" name="justification" required />
                <Submit>Assign</Submit>
              </ActionForm>
            </Card>
          )}
          {!self && hasPermission(actor, "delegation.grant") && user.status === "ACTIVE" && (
            <Card title="Record a delegation">
              <ActionForm action={grantDelegationAction} resetOnSuccess>
                <Hidden name="userId" value={user.id} />
                <Select label="Domain" name="domain" options={[{ value: "ADMIN_REQUEST", label: "Administrative requests" }, { value: "MAINTENANCE", label: "Fleet maintenance" }, { value: "ORG_CHANGE", label: "Organisational change (HQ only)" }, { value: "MANPOWER", label: "Manpower requests and rosters" }, { value: "ASSIGNMENT", label: "Assignments, transfers, exceptions and renewals" }, { value: "STORES", label: "General stores requisitions" }]} />
                <Select label="Organisation" name="orgUnitId" required placeholder="Select organisation" options={orgs.map((o) => ({ value: o.id, label: o.name }))} />
                <Select label="Category (requests only)" name="categoryCode" placeholder="All categories" options={REQUEST_CATEGORIES.map((c) => ({ value: c.code, label: c.name }))} />
                <TextField label="Valid to" name="validTo" type="date" />
                <TextField label="Delegation instrument reference" name="approvalRef" required />
                <Submit>Record delegation</Submit>
              </ActionForm>
            </Card>
          )}
          {!self && user.status === "ACTIVE" && support && (
            <Card title="Sign-in credentials" subtitle="Temporary passwords are shown once and must be changed at first sign-in">
              <div className="space-y-3">
                {support && (
                  <ActionForm action={issueTemporaryPasswordAction}>
                    <Hidden name="userId" value={user.id} />
                    <Submit variant="secondary" confirm="Issue a new temporary password? The current password stops working and sessions end.">Issue temporary password</Submit>
                  </ActionForm>
                )}
                {support && user.locked_until && user.locked_until > now && (
                  <ActionForm action={unlockAccountAction}>
                    <Hidden name="userId" value={user.id} />
                    <Submit variant="secondary">Clear sign-in lockout</Submit>
                  </ActionForm>
                )}
              </div>
            </Card>
          )}
          {!self && user.status !== "DEACTIVATED" && (hasPermission(actor, "user.suspend") || hasPermission(actor, "user.deactivate")) && (
            <Card title="Account status">
              <ActionForm action={setUserStatusAction}>
                <Hidden name="userId" value={user.id} />
                <Select label="New status" name="status" options={[
                  ...(hasPermission(actor, "user.suspend") ? [user.status === "SUSPENDED" ? { value: "ACTIVE", label: "Reactivate" } : { value: "SUSPENDED", label: "Suspend" }] : []),
                  ...(hasPermission(actor, "user.deactivate") ? [{ value: "DEACTIVATED", label: "Deactivate (permanent)" }] : []),
                ]} />
                <TextField label="Reason" name="reason" required />
                <Submit variant="danger" confirm="Change this account's status? Sessions end immediately.">Apply</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
