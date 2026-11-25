import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { verifyAuditChain } from "@/server/domain/audit";
import { searchAudit } from "@/server/domain/auditq";
import { hasPermission } from "@/server/domain/policy";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { AuditFiltersForm, AuditTable } from "@/components/audit-table";

export const metadata = { title: "Audit explorer" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!pageAllowed(actor, "audit.view")) return <AccessDenied what="the audit explorer" />;
  const sp = await searchParams;
  const db = getDb();
  const f = { q: sp.q?.slice(0, 60), category: sp.category, outcome: sp.outcome, from: sp.from, to: sp.to };
  const rows = searchAudit(db, actor, f);
  const chain = verifyAuditChain(db);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHeader eyebrow="M10 · Audit" title="Audit explorer" description="Append-only, hash-chained audit events. No application role can edit or delete audit records; database triggers reject UPDATE and DELETE." />
      <div className="mb-4">
        <Notice tone={chain.ok ? "ok" : "err"} title={chain.ok ? "Audit chain verified" : "Audit chain integrity failure"}>
          {chain.ok ? `${chain.checked} events re-hashed and linked without a break.` : `Chain broken at event #${chain.brokenAt}. Preserve evidence and escalate to the Security Administrator.`}
        </Notice>
      </div>
      <Card bodyClass="p-0" title={`${rows.length} event(s) (latest 200)`} action={hasPermission(actor, "audit.export") ? (
        <form method="post" action={`/app/audit/export${qs ? `?${qs}` : ""}`}>
          <button type="submit" className="rounded-md border border-line-2 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Export evidence (CSV, audited)</button>
        </form>
      ) : undefined}>
        <AuditFiltersForm sp={sp} base="/app/audit" categories={["AUTH", "IAM", "BUSINESS", "EXPORT", "CONFIG", "SECURITY", "ORG"]} />
        <AuditTable rows={rows} />
      </Card>
    </>
  );
}
