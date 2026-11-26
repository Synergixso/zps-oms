import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { scopeFor } from "@/server/domain/policy";
import { availableReports } from "@/server/domain/reports";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Reports" };

export default async function Reports() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "report.view")) return <AccessDenied what="management reports" />;
  const reports = availableReports(actor);
  const s = scopeFor(actor, "report.view");
  const scopeLabel = s.national ? "National (all organisations)" : actor.assignments.filter((a) => s.units.includes(a.orgUnitId)).map((a) => a.orgUnitName).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
  return (
    <>
      <PageHeader eyebrow="M06 · Management reporting" title="Management reports" description={`Approved report definitions available to your role. Reporting scope: ${scopeLabel}.`} />
      <div className="mb-4"><Notice tone="info">Reports are aggregate-first and limited to approved fields. Exports are logged with user, time, report, fields and row count. Figures are synthetic and must not be presented as Service performance.</Notice></div>
      {reports.length === 0 ? (
        <Notice tone="warn">No report definitions are within your authorised functions.</Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.code} title={r.name} subtitle={r.code}>
              <p className="text-sm text-ink-2">{r.description}</p>
              <p className="mt-2 text-xs text-muted">Approved fields: {r.fields.join(", ")}</p>
              <Link href={`/app/reports/${r.code}`} className="mt-3 inline-block text-sm font-semibold text-zp-blue hover:underline">Run report →</Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
