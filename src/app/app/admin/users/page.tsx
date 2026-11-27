import { Pager } from "@/components/pager";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listReassignments, pageUsers } from "@/server/domain/iam";
import { appointmentAccessPolicy, listAppointmentOnlyAccounts, POSITION_TYPES } from "@/server/domain/command";
import { provisionUserAction } from "@/server/actions/iam";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { ActionForm, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Users & access" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "user.view")) return <AccessDenied what="user administration" />;
  const { q, page } = await searchParams;
  const list = await pageUsers(getDb(), actor, q?.slice(0, 40), { page: Number(page) || 1 });
  const users = list.rows;
  const reassign = await listReassignments(getDb(), actor);
  const apptOnly = await listAppointmentOnlyAccounts(getDb(), actor);
  const apptPolicy = await appointmentAccessPolicy(getDb());
  return (
    <>
      <PageHeader eyebrow="M02 · Identity and access" title="Users & access" description={hasPermission(actor, "user.provision") ? "Unique individual accounts only. No public self-registration. Access = role + organisational scope + validity window, recorded with a justification." : "Technical account support for users assigned within your organisational scope: temporary passwords, sign-in lockouts and sessions. Role and delegation changes are referred to Headquarters."} />
      {reassign.length > 0 && (
        <Card className="mb-4" title={`Accounts awaiting authorised reassignment (${reassign.length})`} subtitle="Their role is not in the authorised 31-role catalogue" bodyClass="p-0">
          <div className="p-4 pb-0"><Notice tone="warn">These assignments were revoked when the role catalogue was updated; the history is kept. No replacement role was granted automatically. Access stays denied until an authorised administrator grants an approved role and organisational scope; that grant closes the flag.</Notice></div>
          <Table head={["User", "Retired role", "Organisation", "Flagged"]} caption="Accounts awaiting reassignment">
            {reassign.map((r) => (
              <tr key={r.id}>
                <td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/admin/users/${r.user_id}`}>{r.display_name}</Link> <span className="text-xs text-muted">{r.username}</span></td>
                <td className={`${td} font-mono text-xs`}>{r.role_code}</td>
                <td className={`${td} text-ink-2`}>{r.org_name}</td>
                <td className={`${td} text-muted`}>{fmtDate(r.flagged_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {apptOnly.length > 0 && (
        <Card className="mb-4" title={`Appointment-only accounts (${apptOnly.length})`} subtitle={`Command offices without an application role (DEC-076). Policy: ${apptPolicy.enabled ? "on" : "off"} (${apptPolicy.source}); office types: ${apptPolicy.types.map((t) => POSITION_TYPES[t]?.label ?? t).join(", ")}`} bodyClass="p-0">
          <Table head={["User", "Office", "Unit", "Since", "Command access"]} caption="Appointment-only accounts">
            {apptOnly.map((r) => (
              <tr key={`${r.user_id}-${r.position_id}`}>
                <td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/admin/users/${r.user_id}`}>{r.display_name}</Link> <span className="text-xs text-muted">{r.username}</span></td>
                <td className={td}>{r.title}</td><td className={`${td} text-ink-2`}>{r.unit}</td><td className={`${td} text-muted`}>{fmtDate(r.since)}</td>
                <td className={td}><Badge status={r.effective ? "ACTIVE" : "SUSPENDED"} label={r.effective ? "Own directives and reports only" : r.status !== "ACTIVE" ? "Account not active" : "No access (policy)"} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" bodyClass="p-0">
          <form className="flex gap-3 border-b border-line p-4" role="search">
            <label htmlFor="q" className="sr-only">Search users</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search name or username" className="w-64 rounded-md border border-line-2 px-3 py-2 text-sm" />
            <button className={btnSecondary}>Search</button>
          </form>
          <Table head={["User", "Username", "Position (configurable)", "Active roles", "Status", "Created"]}>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className={td}><Link href={`/app/admin/users/${u.id}`} className="font-semibold text-zp-blue hover:underline">{u.display_name}</Link></td>
                <td className={`${td} font-mono text-xs`}>{u.username}</td>
                <td className={`${td} text-ink-2`}>{u.position_title}</td>
                <td className={`${td} tabular-nums`}>{u.active_roles}</td>
                <td className={td}><Badge status={u.status} /></td>
                <td className={`${td} text-muted`}>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </Table>
          <Pager path="/app/admin/users" params={{ q }} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} />
        </Card>
        {hasPermission(actor, "user.provision") && (
          <Card title="Provision a synthetic account" subtitle="New accounts have no access until a role and scope are assigned.">
            <ActionForm action={provisionUserAction}>
              <TextField label="Username" name="username" required placeholder="demo.example.user" hint="Must start with 'demo.'" />
              <TextField label="Display name" name="displayName" required placeholder="Demo Example User" hint="Must be clearly synthetic" />
              <TextField label="Position title (configurable)" name="positionTitle" required />
              <Submit>Provision account</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
