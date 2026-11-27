import { RELEASE, STAGE_LABEL } from "@/server/lib/release";
import { environmentNotice } from "@/server/lib/environment";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb, one } from "@/server/db/connection";
import { verifyAuditChain } from "@/server/domain/audit";
import { hasPermission } from "@/server/domain/policy";
import { EDITABLE_SETTINGS, backupDir, listRestoreChecks, platformOverview } from "@/server/domain/platform";
import { SHOW_DEMO_ACCOUNTS } from "@/server/auth/session";
import { backupAction, maintenanceAction, restoreDrillAction, runJobsAction, settingAction, verifyBackupAction } from "@/server/actions/platform";
import { AppointmentAccessCard } from "./appointment-access";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Stat, Table, td, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Platform administration" };

const kb = (n: number | null) => (n == null ? "—" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default async function Platform() {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "platform.view"))) return <AccessDenied what="platform administration" />;
  const db = getDb();
  const env = await environmentNotice(db);
  const t0 = performance.now();
  await one(db, "SELECT 1 AS ok");
  const ms = Math.round((performance.now() - t0) * 10) / 10;
  const [p, chain, restores] = await Promise.all([platformOverview(db, actor), verifyAuditChain(db), listRestoreChecks(db, actor)]);
  const configure = hasPermission(actor, "platform.configure");
  const operate = hasPermission(actor, "platform.operate");
  const lastBackup = p.backups.find((b) => b.status === "SUCCESS" && b.verified);
  const failedJobs = p.jobs.filter((j) => j.last?.status === "FAILED").length;
  return (
    <>
      <PageHeader eyebrow="Module 15 · Platform administration" title="Platform administration and monitoring" description="Technical status, automation, backups, migrations, errors and configuration. No personnel or business records are exposed here." />
      {p.maintenance && <div className="mb-4"><Notice tone="warn" title="Maintenance mode is ON">Only platform administrators can use the back office.</Notice></div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Application" value="Online" tone="ok" hint={`v${p.version} · Node ${p.node} · ${p.env}`} />
        <Stat label="MySQL (XAMPP)" value="Online" tone="ok" hint={`${p.dbVersion} · ${ms} ms`} />
        <Stat label="Audit chain" value={chain.ok ? "Intact" : "Broken"} tone={chain.ok ? "ok" : "err"} hint={`${chain.checked} events verified`} />
        <Stat label="Automation" value={failedJobs ? `${failedJobs} failed` : "Running"} tone={failedJobs ? "err" : "ok"} hint={`${p.jobs.length} jobs scheduled`} />
        <Stat label="Last verified backup" value={lastBackup ? "Verified" : "None"} tone={lastBackup ? "ok" : "warn"} hint={lastBackup ? fmtDateTime(lastBackup.finished_at) : "Create one below"} />
        <Stat label="Errors (recent)" value={p.errors.length} tone={p.errors.length ? "warn" : "ok"} hint="Unexpected server errors logged" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Automation engine" subtitle="In-process scheduler; every run is recorded" action={operate ? <ActionForm action={runJobsAction} className=""><Submit variant="secondary">Run all jobs now</Submit></ActionForm> : undefined} bodyClass="p-0">
          <Table head={["Job", "Last run", "Result", ""]}>
            {p.jobs.map((j) => (
              <tr key={j.name}>
                <td className={td}><span className="font-semibold">{j.title}</span><span className="block text-xs text-muted">{j.description}</span></td>
                <td className={`${td} text-xs`}>{j.last ? `${fmtDateTime(j.last.started_at)} (${j.last.trigger_type.toLowerCase()})` : "Never"}</td>
                <td className={td}>{j.last ? <><Badge status={j.last.status === "SUCCESS" ? "APPROVED" : j.last.status === "FAILED" ? "REJECTED" : "PENDING"} label={j.last.status.toLowerCase()} /><span className="block text-xs text-muted">{j.last.processed} item(s){j.last.attempts > 1 ? ` · ${j.last.attempts} attempts` : ""}{j.last.message ? ` · ${j.last.message}` : ""}</span></> : "—"}</td>
                <td className={td}>{operate && <ActionForm action={runJobsAction} className=""><Hidden name="job" value={j.name} /><Submit variant="secondary">Run</Submit></ActionForm>}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Database backups" subtitle={`mysqldump to ${backupDir()} · verified by completion marker and SHA-256`} action={operate ? <ActionForm action={backupAction} className=""><Submit>Create backup now</Submit></ActionForm> : undefined} bodyClass="p-0">
          <Table head={["File", "Size", "Finished", "Status", ""]} empty="No backups recorded yet.">
            {p.backups.map((b) => (
              <tr key={b.id}>
                <td className={`${td} font-mono text-xs`}>{b.file_name}{b.sha256 && <span className="block text-muted">sha256 {b.sha256.slice(0, 16)}…</span>}</td>
                <td className={td}>{kb(b.size_bytes)}</td>
                <td className={`${td} text-xs`}>{fmtDateTime(b.finished_at)}</td>
                <td className={td}><Badge status={b.status === "SUCCESS" && b.verified ? "APPROVED" : b.status === "RUNNING" ? "PENDING" : "REJECTED"} label={b.status === "SUCCESS" && b.verified ? "verified" : b.status.toLowerCase()} />{b.message && <span className="block text-xs text-muted">{b.message}</span>}</td>
                <td className={td}>{operate && b.status === "SUCCESS" && <ActionForm action={verifyBackupAction} className=""><Hidden name="id" value={String(b.id)} /><Submit variant="secondary">Re-verify</Submit></ActionForm>}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Restore drills" subtitle="A backup is proven only by restoring it: scratch database, core tables, schema version and audit hash chain, then dropped" action={operate ? <ActionForm action={restoreDrillAction} className=""><Submit variant="secondary" confirm="Restore the latest verified backup into a scratch database now? The live database is not touched.">Run restore drill</Submit></ActionForm> : undefined} bodyClass="p-0">
          <Table head={["Started", "Backup", "Result", "Details"]} empty="No restore drill has run yet. The automation engine runs one every few days once a verified backup exists.">
            {restores.map((r) => (
              <tr key={r.id}>
                <td className={`${td} text-xs`}>{fmtDateTime(r.started_at)}</td>
                <td className={`${td} tabular-nums`}>#{r.backup_id}</td>
                <td className={td}><Badge status={r.status === "PASSED" ? "APPROVED" : r.status === "RUNNING" ? "PENDING" : "REJECTED"} label={r.status.toLowerCase()} /></td>
                <td className={`${td} text-xs text-ink-2`}>{r.details}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Release and approval status" subtitle="Engineering stage and institutional decisions are recorded separately (DEC-069)">
          <DL items={[
            ["Version", RELEASE.version], ["Software stage", `${STAGE_LABEL[RELEASE.stage]} (since ${RELEASE.stageDate})`], ["Environment", env.label],
            ["Project proposal", RELEASE.institutional.proposal.label], ["Institutional review", RELEASE.institutional.institutionalReview.label],
            ["Institutional approval", RELEASE.institutional.institutionalApproval.label], ["Technical approval", RELEASE.institutional.technicalApproval.label],
            ["Production deployment", RELEASE.institutional.deploymentAuthorisation.label],
          ]} />
          {RELEASE.nextStageBlockers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink-2">Before the next stage</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-2">{RELEASE.nextStageBlockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
        </Card>
        <Card title="Database" subtitle="Technical metadata only">
          <DL items={[
            ["Engine", `MySQL / MariaDB ${p.dbVersion} (XAMPP)`], ["Database", p.dbName], ["Tables", String(p.tables)], ["Size", kb(p.sizeBytes)],
            ["Connection", `Pooled (mysql2), ${ms} ms round trip`], ["Authentication", SHOW_DEMO_ACCOUNTS ? "Password (scrypt), lockout; synthetic account list shown (development)" : "Password (scrypt), lockout"],
            ["External integrations", "None (email / SMS disabled)"], ["Application version", `v${p.version}`],
          ]} />
        </Card>

        <Card title="Migration history" bodyClass="p-0">
          <Table head={["Version", "Migration", "Checksum", "Applied"]}>{p.migrations.map((m) => <tr key={m.version}><td className={td}>{m.version}</td><td className={`${td} font-mono text-xs`}>{m.name}</td><td className={`${td} font-mono text-xs text-muted`}>{m.checksum.slice(0, 12)}…</td><td className={`${td} text-xs`}>{fmtDateTime(m.applied_at)}</td></tr>)}</Table>
        </Card>

        <AppointmentAccessCard actor={actor} />
        <Card title="Maintenance mode">
          {configure ? (
            <ActionForm action={maintenanceAction}>
              <Hidden name="mode" value={p.maintenance ? "OFF" : "ON"} />
              <TextField label="Reason" name="reason" required />
              <Submit variant={p.maintenance ? "primary" : "danger"} confirm={p.maintenance ? undefined : "Enable maintenance mode? All non-platform users lose access until it is turned off."}>{p.maintenance ? "Turn maintenance mode off" : "Turn maintenance mode on"}</Submit>
            </ActionForm>
          ) : <p className="text-sm text-muted">Currently {p.maintenance ? "ON" : "OFF"}.</p>}
        </Card>

        <Card title="Error log" subtitle="Unexpected errors; no request data or personal information is stored" bodyClass="p-0">
          <Table head={["Time", "Source", "Error"]} empty="No errors logged.">{p.errors.map((e) => <tr key={e.id}><td className={`${td} text-xs`}>{fmtDateTime(e.occurred_at)}</td><td className={`${td} font-mono text-xs`}>{e.source}</td><td className={td}><span className="font-semibold">{e.error_name}</span><span className="block text-xs text-muted">{e.message}</span></td></tr>)}</Table>
        </Card>

        <Card title="Recent automation runs" bodyClass="p-0">
          <Table head={["Time", "Job", "Trigger", "Result"]}>{p.recentRuns.map((r) => <tr key={r.id}><td className={`${td} text-xs`}>{fmtDateTime(r.started_at)}</td><td className={`${td} font-mono text-xs`}>{r.job}</td><td className={`${td} text-xs`}>{r.trigger_type.toLowerCase()}</td><td className={td}><Badge status={r.status === "SUCCESS" ? "APPROVED" : r.status === "FAILED" ? "REJECTED" : "PENDING"} label={`${r.status.toLowerCase()} · ${r.processed}`} /></td></tr>)}</Table>
        </Card>

        <Card title="System settings" subtitle="Tenure, renewal and exception policy are institutional decisions and are read-only here" bodyClass="p-0">
          <Table head={["Key", "Value", ""]}>
            {p.settings.map((s) => (
              <tr key={s.key}>
                <td className={td}><span className="font-mono text-xs">{s.key}</span><span className="block text-xs text-muted">{s.description}</span></td>
                <td className={td}>{s.value}</td>
                <td className={td}>
                  {configure && EDITABLE_SETTINGS.includes(s.key) && (
                    <ActionForm action={settingAction} className="flex items-center gap-1">
                      <Hidden name="key" value={s.key} />
                      <input name="value" defaultValue={s.value} aria-label={`New value for ${s.key}`} className="w-20 rounded border border-line-2 px-2 py-1 text-sm" />
                      <Submit variant="secondary">Save</Submit>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
