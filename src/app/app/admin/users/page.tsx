import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { listUsers } from "@/server/domain/iam";
import { provisionUserAction } from "@/server/actions/iam";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { ActionForm, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Users & access" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "user.view")) return <AccessDenied what="user administration" />;
  const { q } = await searchParams;
  const users = await listUsers(getDb(), actor, q?.slice(0, 40));
  return (
    <>
      <PageHeader eyebrow="M02 · Identity and access" title="Users & access" description="Unique individual accounts only. No public self-registration. Access = role + organisational scope + validity window, recorded with a justification." />
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
