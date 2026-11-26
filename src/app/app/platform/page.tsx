import fs from "node:fs";
import path from "node:path";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb, one } from "@/server/db/connection";
import { verifyAuditChain } from "@/server/domain/audit";
import { SHOW_DEMO_ACCOUNTS } from "@/server/auth/session";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Stat, Table, td, fmtDateTime } from "@/components/ui";

export const metadata = { title: "System health" };

export default async function Platform() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "platform.view")) return <AccessDenied what="platform operations" />;
  const db = getDb();
  const t0 = performance.now();
  const server = await one<{ v: string }>(db, "SELECT VERSION() AS v");
  const integrity = server ? "ok" : "unreachable";
  const ms = Math.round((performance.now() - t0) * 10) / 10;
  const migrations = await all<{ version: number; applied_at: string; name: string }>(db, "SELECT version, name, applied_at FROM schema_migrations ORDER BY version");
  const settings = await all<{ key: string; value: string; description: string }>(db, "SELECT `key`, value, description FROM app_settings ORDER BY `key`");
  const tables = ["tenants", "org_units", "users", "role_assignments", "delegations", "admin_requests", "vehicles", "maintenance_requests", "assets", "notifications", "audit_events", "sessions"] as const;
  const counts = await Promise.all(tables.map(async (tb) => [tb, (await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM ${tb}`))?.c ?? 0] as const));
  const chain = await verifyAuditChain(db);
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { version: string };
  return (
    <>
      <PageHeader eyebrow="M11 · Platform operations" title="System health" description="Technical status only. No business records are exposed on this page." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Application" value="Up" tone="ok" hint={`Release ${pkg.version} · Node ${process.version}`} />
        <Stat label="Database" value={integrity === "ok" ? "Healthy" : "Check"} tone={integrity === "ok" ? "ok" : "err"} hint={`${server?.v ?? "no response"} · ${ms} ms`} />
        <Stat label="Audit chain" value={chain.ok ? "Intact" : "Broken"} tone={chain.ok ? "ok" : "err"} hint={`${chain.checked} events`} />
        <Stat label="Backups" value="Not configured" tone="warn" hint="See DEPLOYMENT_GUIDE §Backup" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Environment">
          <DL items={[["Environment", "LOCAL SYNTHETIC PROTOTYPE"], ["Database engine", `MySQL / MariaDB ${server?.v ?? ""} (XAMPP)`], ["Authentication", SHOW_DEMO_ACCOUNTS ? "Password (scrypt) with lockout; synthetic account list shown (local review)" : "Password (scrypt) with lockout"], ["External integrations", "None (all disabled)"], ["Background jobs", "None — effective-dated org changes apply on request"], ["Error monitoring", "Server console only (no external telemetry)"]]} />
        </Card>
        <Card title="Schema migrations" bodyClass="p-0">
          <Table head={["Version", "Description", "Applied"]}>{migrations.map((m) => <tr key={m.version}><td className={td}>{m.version}</td><td className={td}>{m.name}</td><td className={td}>{fmtDateTime(m.applied_at)}</td></tr>)}</Table>
        </Card>
        <Card title="Application settings (read-only in prototype)" bodyClass="p-0">
          <Table head={["Key", "Value", "Description"]}>{settings.map((s) => <tr key={s.key}><td className={`${td} font-mono text-xs`}>{s.key}</td><td className={td}><Badge status={s.value === "DISABLED" ? "PENDING" : "ACTIVE"} label={s.value} /></td><td className={`${td} text-xs text-muted`}>{s.description}</td></tr>)}</Table>
        </Card>
        <Card title="Table row counts (technical)" bodyClass="p-0">
          <Table head={["Table", "Rows"]}>{counts.map(([n, c]) => <tr key={n}><td className={`${td} font-mono text-xs`}>{n}</td><td className={`${td} tabular-nums`}>{c}</td></tr>)}</Table>
        </Card>
      </div>
      <div className="mt-4"><Notice tone="info">Counts are technical metadata only; platform administrators have no access to the underlying business records.</Notice></div>
    </>
  );
}
