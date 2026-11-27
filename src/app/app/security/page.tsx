import { Pager } from "@/components/pager";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb, one } from "@/server/db/connection";
import { pageSecurityEvents } from "@/server/domain/auditq";
import { Badge, Card, PageHeader, Stat, Table, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit } from "@/components/forms";
import { endSessionsAction } from "@/server/actions/iam";
import { hasPermission } from "@/server/domain/policy";
import { AccessDenied } from "@/components/ui";
import { AuditFiltersForm, AuditTable } from "@/components/audit-table";

export const metadata = { title: "Security events" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "security.view")) return <AccessDenied what="security events" />;
  const sp = await searchParams;
  const db = getDb();
  const list = await pageSecurityEvents(db, actor, { q: sp.q?.slice(0, 60), category: sp.category, outcome: sp.outcome, from: sp.from, to: sp.to }, { page: Number(sp.page) || 1 });
  const rows = list.rows;
  const sessions = await all<{ user_id: string; display_name: string; created_at: string; last_seen_at: string }>(db, "SELECT s.user_id, u.display_name, s.created_at, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.expires_at > ? ORDER BY s.last_seen_at DESC", new Date().toISOString());
  const attempts = await all<{ id: number; username: string; succeeded: number; created_at: string; client_key: string }>(db, "SELECT id, username, succeeded, created_at, client_key FROM login_attempts ORDER BY id DESC LIMIT 100");
  const locked = await all<{ id: string; display_name: string; username: string; locked_until: string }>(db, "SELECT id, display_name, username, locked_until FROM users WHERE locked_until > ? ORDER BY locked_until DESC", new Date().toISOString());
  // Counted in SQL over the full 24 hours (the attempts table below shows only the latest 100).
  const failed24 = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM login_attempts WHERE succeeded = 0 AND created_at > ?", new Date(Date.now() - 86400000).toISOString()))?.n ?? 0);
  const canEnd = hasPermission(actor, "user.suspend");
  const byActor = await all<{ name: string | null; c: number }>(db, "SELECT u.display_name name, COUNT(*) c FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.outcome='DENIED' GROUP BY e.actor_id ORDER BY c DESC LIMIT 6");
  return (
    <>
      <PageHeader eyebrow="M10 · Security administration" title="Security events" description="Authentication, access-control, privileged change and denied-access activity. Investigate suspicious patterns; this view does not grant business-record access." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active sessions" value={sessions.length} />
        <Stat label="Denied events (top 6 users)" value={byActor.reduce((a, b) => a + b.c, 0)} tone="warn" />
        <Stat label="Failed sign-ins (24 h)" value={failed24} tone={failed24 ? "warn" : "ok"} />
        <Stat label="Locked accounts" value={locked.length} tone={locked.length ? "err" : "ok"} />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Users with most denied attempts" bodyClass="p-0">
          <Table head={["User", "Denied"]} empty="None.">{byActor.map((b, i) => <tr key={i}><td className={td}>{b.name ?? "Unknown"}</td><td className={td}>{b.c}</td></tr>)}</Table>
        </Card>
        <Card title="Active sessions" bodyClass="p-0">
          <Table head={["User", "Signed in", "Last activity", ""]} empty="No active sessions.">{sessions.map((s, i) => <tr key={i}><td className={td}>{s.display_name}</td><td className={td}>{fmtDateTime(s.created_at)}</td><td className={td}>{fmtDateTime(s.last_seen_at)}</td><td className={td}>{canEnd && s.user_id !== actor.userId && <ActionForm action={endSessionsAction} className=""><Hidden name="userId" value={s.user_id} /><Submit variant="danger" confirm={`End all sessions for ${s.display_name}?`}>End sessions</Submit></ActionForm>}</td></tr>)}</Table>
        </Card>
        <Card title="Account lockouts" subtitle="Clear a lockout from the user's administration page" bodyClass="p-0">
          <Table head={["User", "Username", "Locked until"]} empty="No locked accounts.">{locked.map((u) => <tr key={u.id}><td className={td}><a href={`/app/admin/users/${u.id}`} className="font-semibold text-zp-blue hover:underline">{u.display_name}</a></td><td className={`${td} font-mono text-xs`}>{u.username}</td><td className={td}>{fmtDateTime(u.locked_until)}</td></tr>)}</Table>
        </Card>
        <Card title="Authentication history (latest 100 attempts)" subtitle="Devices are shown as a one-way key; passwords are never recorded" bodyClass="p-0">
          <Table head={["Time", "Username", "Result", "Device key"]}>{attempts.map((a) => <tr key={a.id}><td className={`${td} text-xs`}>{fmtDateTime(a.created_at)}</td><td className={`${td} font-mono text-xs`}>{a.username}</td><td className={td}><Badge status={a.succeeded ? "APPROVED" : "REJECTED"} label={a.succeeded ? "success" : "failed"} /></td><td className={`${td} font-mono text-xs text-muted`}>{a.client_key.slice(0, 10)}…</td></tr>)}</Table>
        </Card>
      </div>
      <Card bodyClass="p-0" title="Security-relevant events (latest 200)">
        <AuditFiltersForm sp={sp} base="/app/security" categories={["AUTH", "IAM", "SECURITY", "CONFIG"]} />
        <AuditTable rows={rows} />
        <Pager path="/app/security" params={sp} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} label="Security event pages" />
      </Card>
    </>
  );
}
