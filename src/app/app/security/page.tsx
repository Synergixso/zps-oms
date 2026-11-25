import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { securityEvents } from "@/server/domain/auditq";
import { Card, PageHeader, Stat, Table, td, fmtDateTime } from "@/components/ui";
import { AccessDenied } from "@/components/ui";
import { AuditFiltersForm, AuditTable } from "@/components/audit-table";

export const metadata = { title: "Security events" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!pageAllowed(actor, "security.view")) return <AccessDenied what="security events" />;
  const sp = await searchParams;
  const db = getDb();
  const rows = securityEvents(db, actor, { q: sp.q?.slice(0, 60), category: sp.category, outcome: sp.outcome, from: sp.from, to: sp.to });
  const sessions = all<{ display_name: string; created_at: string; last_seen_at: string }>(db, "SELECT u.display_name, s.created_at, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id ORDER BY s.last_seen_at DESC");
  const byActor = all<{ name: string | null; c: number }>(db, "SELECT u.display_name name, COUNT(*) c FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.outcome='DENIED' GROUP BY e.actor_id ORDER BY c DESC LIMIT 6");
  return (
    <>
      <PageHeader eyebrow="M10 · Security administration" title="Security events" description="Authentication, access-control, privileged change and denied-access activity. Investigate suspicious patterns; this view does not grant business-record access." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active sessions" value={sessions.length} />
        <Stat label="Denied events (top 6 users)" value={byActor.reduce((a, b) => a + b.c, 0)} tone="warn" />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Users with most denied attempts" bodyClass="p-0">
          <Table head={["User", "Denied"]} empty="None.">{byActor.map((b, i) => <tr key={i}><td className={td}>{b.name ?? "Unknown"}</td><td className={td}>{b.c}</td></tr>)}</Table>
        </Card>
        <Card title="Active sessions" bodyClass="p-0">
          <Table head={["User", "Signed in", "Last activity"]} empty="No active sessions.">{sessions.map((s, i) => <tr key={i}><td className={td}>{s.display_name}</td><td className={td}>{fmtDateTime(s.created_at)}</td><td className={td}>{fmtDateTime(s.last_seen_at)}</td></tr>)}</Table>
        </Card>
      </div>
      <Card bodyClass="p-0" title="Security-relevant events (latest 200)">
        <AuditFiltersForm sp={sp} base="/app/security" categories={["AUTH", "IAM", "SECURITY", "CONFIG"]} />
        <AuditTable rows={rows} />
      </Card>
    </>
  );
}
