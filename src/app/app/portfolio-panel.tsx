/** Executive portfolio panel: different content per executive office (IG, DIG Operations, DIG Administration, DIG Special Duties / State House). */
import Link from "next/link";
import { getDb } from "@/server/db/connection";
import type { Actor } from "@/server/domain/policy";
import { executivePortfolio, type ExecutiveOffice } from "@/server/domain/portfolio";
import { OPS_CATEGORY, OPS_STATUS } from "@/server/domain/ops-admin";
import { COORDINATION_STATUS } from "@/server/domain/coordination";
import { Badge, Card, SectionHeader, Stat, Table, td } from "@/components/ui";

const TITLE: Record<ExecutiveOffice, string> = {
  IG: "Inspector General — national portfolio oversight",
  DIG_OPERATIONS: "DIG Operations — nationwide operations administration",
  DIG_ADMINISTRATION: "DIG Administration — service-wide administration and training",
  DIG_SPECIAL_DUTIES: "DIG Special Duties / State House — coordination",
};

export async function PortfolioPanel({ actor }: { actor: Actor }) {
  const p = await executivePortfolio(getDb(), actor);
  if (!p) return null;
  const top = (["IG", "DIG_OPERATIONS", "DIG_ADMINISTRATION", "DIG_SPECIAL_DUTIES"] as ExecutiveOffice[]).find((o) => p.offices.includes(o))!;
  const ops = p.operations ?? [];
  const opsCount = (cat: string, statuses: string[]) => ops.filter((r) => r.category === cat && statuses.includes(r.status)).reduce((a, r) => a + r.n, 0);
  const t = p.training;
  const tSum = (k: "nominated" | "completed") => (t?.byDivision ?? []).reduce((a, r) => a + r[k], 0);
  return (
    <section aria-label="Executive portfolio" className="mt-6">
      <SectionHeader title={TITLE[top]} description={top === "IG" ? "The three Deputy Inspector General portfolios report directly to the Inspector General; none instructs another." : "Your portfolio's administrative position. Figures come from the records in ZPS-OMS."} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {p.operations && <><Stat label="Public-order records open" value={opsCount("PUBLIC_ORDER", ["REGISTERED", "ACTIVE"])} href="/app/operations?category=PUBLIC_ORDER" />
          <Stat label="Illegal-mining operations open" value={opsCount("ILLEGAL_MINING", ["REGISTERED", "ACTIVE"])} href="/app/operations?category=ILLEGAL_MINING" /></>}
        {t && <><Stat label="Training nominations awaiting decision" value={tSum("nominated")} href="/app/training?tab=nominations" /><Stat label="Training completions" value={tSum("completed")} href="/app/training" /></>}
        <Stat label="Coordination requests open" value={p.coordination.open} href="/app/coordination" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {p.operations && (
          <Card title="Operations administration" subtitle="Records by category and status" action={<Link className="text-sm text-zp-blue hover:underline" href="/app/operations">Open register</Link>} bodyClass="p-0">
            <Table head={["Category", "Status", "Records", "Personnel committed"]} caption="Operations administration summary" empty="No records.">
              {ops.map((r) => <tr key={`${r.category}-${r.status}`}><td className={td}>{OPS_CATEGORY[r.category]}</td><td className={td}>{OPS_STATUS[r.status as keyof typeof OPS_STATUS]}</td><td className={td}>{r.n}</td><td className={td}>{r.personnel}</td></tr>)}
            </Table>
          </Card>
        )}
        {t && (
          <Card title="Training participation by Division" action={<Link className="text-sm text-zp-blue hover:underline" href="/app/training">Open training</Link>} bodyClass="p-0">
            <Table head={["Division / formation", "Awaiting decision", "Completed"]} caption="Training participation" empty="No nominations.">
              {t.byDivision.map((r) => <tr key={r.division}><td className={td}>{r.division}</td><td className={td}>{r.nominated}</td><td className={td}>{r.completed}</td></tr>)}
            </Table>
          </Card>
        )}
        {p.workforce && (
          <Card title="Workforce strength by Division" subtitle="Serving officers — aggregate counts only" bodyClass="p-0">
            <Table head={["Division / formation", "Serving"]} caption="Workforce strength">
              {p.workforce.map((r) => <tr key={r.division}><td className={td}>{r.division}</td><td className={td}>{r.serving}</td></tr>)}
            </Table>
          </Card>
        )}
        <Card title="Inter-office coordination" subtitle={top === "IG" ? "All requests between portfolios (oversight)" : "Requests of your office"} action={<Link className="text-sm text-zp-blue hover:underline" href="/app/coordination">Open</Link>} bodyClass="p-0">
          <Table head={["Reference", "Subject", "From → to", "Status"]} caption="Coordination requests" empty="No coordination requests.">
            {p.coordination.recent.map((c) => <tr key={c.id}><td className={td}><Link className="font-mono text-xs text-zp-blue hover:underline" href={`/app/coordination/${c.id}`}>{c.reference}</Link></td><td className={td}>{c.subject}</td><td className={`${td} text-xs text-ink-2`}>{c.from_title} → {c.to_title}</td><td className={td}><Badge status={c.status} label={COORDINATION_STATUS[c.status as keyof typeof COORDINATION_STATUS]} /></td></tr>)}
          </Table>
        </Card>
      </div>
    </section>
  );
}
