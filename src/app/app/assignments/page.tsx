import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { ASSIGNMENT_STATUS_LABEL, computeTenure, listAreas, listAssignments, tenurePolicy, type AssignmentFilters } from "@/server/domain/assignments";
import { DISPOSITIONS, ranks } from "@/server/domain/personnel";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Assignment register" };
type SP = Record<string, string | undefined>;
const sel = "mt-1 block w-full rounded-md border border-line-2 bg-white px-2.5 py-2 text-sm";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "assignment.view"))) return <AccessDenied what="the assignment register" />;
  const sp = await searchParams;
  const db = getDb();
  const f: AssignmentFilters = {
    q: sp.q, area: sp.area, province: sp.province, homeUnit: sp.homeUnit, rank: sp.rank, status: sp.status ?? "CURRENT",
    commencedFrom: sp.from, commencedTo: sp.to, reviewBy: sp.reviewBy, renewal: sp.renewal as AssignmentFilters["renewal"], page: Number(sp.page) || 1,
  };
  const [res, areas, rankList, units, policy] = await Promise.all([
    listAssignments(db, actor, f),
    hasPermission(actor, "area.view") ? listAreas(db, actor, { includeInactive: true }) : Promise.resolve([]),
    ranks(db),
    scopedUnits(db, actor, "assignment.view"),
    tenurePolicy(db),
  ]);
  const provinces = units.filter((u) => u.unit_type === "PROVINCIAL_DIVISION");
  const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
  const qs = (over: SP) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  return (
    <>
      <PageHeader
        eyebrow="Assignment administration"
        title="Assignment register"
        description={`Administrative duty-area register (not a location service). Minimum tenure: ${policy.minimumDays} days at the same operational area — proposed rule, subject to institutional authorisation.`}
        actions={
          <>
            <ButtonLink href="/app/transfers">Transfers</ButtonLink>
            {hasPermission(actor, "assignment.propose") && <ButtonLink href="/app/assignments/new" variant="primary">Propose assignment</ButtonLink>}
          </>
        }
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">Search<input name="q" defaultValue={sp.q} placeholder="Name, service number or ASG reference" className={sel} /></label>
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">Operational area
            <select name="area" defaultValue={sp.area ?? ""} className={sel}><option value="">All areas</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-ink-2">Province
            <select name="province" defaultValue={sp.province ?? ""} className={sel}><option value="">Any</option>{provinces.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-ink-2">Rank
            <select name="rank" defaultValue={sp.rank ?? ""} className={sel}><option value="">Any</option>{rankList.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">Home unit (with subordinates)
            <select name="homeUnit" defaultValue={sp.homeUnit ?? ""} className={sel}><option value="">Any</option>{unitOptions(units).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-ink-2">Status
            <select name="status" defaultValue={f.status} className={sel}>
              <option value="CURRENT">Current (all open)</option><option value="ALL">All statuses</option>
              {Object.entries(ASSIGNMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-2">Renewal
            <select name="renewal" defaultValue={sp.renewal ?? ""} className={sel}><option value="">Any</option><option value="due">Review / renewal due</option><option value="renewed">Renewed at least once</option><option value="never">Never renewed</option></select>
          </label>
          <label className="text-xs font-semibold text-ink-2">Commenced from<input type="date" name="from" defaultValue={sp.from} className={sel} /></label>
          <label className="text-xs font-semibold text-ink-2">Commenced to<input type="date" name="to" defaultValue={sp.to} className={sel} /></label>
          <label className="text-xs font-semibold text-ink-2">Review by<input type="date" name="reviewBy" defaultValue={sp.reviewBy} className={sel} /></label>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button type="submit" className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Apply filters</button>
            <Link href="/app/assignments" className={btnSecondary}>Clear</Link>
          </div>
        </form>
      </Card>
      <Card title={`${res.total} assignment${res.total === 1 ? "" : "s"}`} subtitle={`Page ${res.page} of ${pages}`} bodyClass="p-0">
        <Table head={["Reference", "Officer", "Home unit", "Operational area", "Commenced", "Tenure", "Review", "Status"]}>
          {res.rows.map((a) => {
            const t = computeTenure(a, policy);
            return (
              <tr key={a.id} className="hover:bg-slate-50/60">
                <td className={`${td} font-mono text-xs`}><Link href={`/app/assignments/${a.id}`} className="text-zp-blue hover:underline">{a.reference}</Link></td>
                <td className={td}><span className="font-semibold">{a.rank_name} {a.full_name}</span><span className="block font-mono text-xs text-muted">{a.service_number}</span></td>
                <td className={td}>{a.home_unit_name}</td>
                <td className={td}>{a.area_name}</td>
                <td className={td}>{fmtDate(a.commencement_date)}{a.continuous_start_date !== a.commencement_date && <span className="block text-xs text-muted">continuous {fmtDate(a.continuous_start_date)}</span>}</td>
                <td className={td}>{a.status === "ACTIVE" || a.status === "TRANSFER_PENDING" ? (t.minimumMet ? <span className="text-ok">Met ({t.elapsedDays} d)</span> : <span>{t.elapsedDays} d · {t.remainingDays} to go</span>) : "—"}</td>
                <td className={td}>{a.ended_on ? `Ended ${fmtDate(a.ended_on)}` : fmtDate(a.review_date)}{Number(a.renewals) > 0 && <span className="block text-xs text-muted">renewed ×{a.renewals}</span>}</td>
                <td className={td}><Badge status={a.status} label={ASSIGNMENT_STATUS_LABEL[a.status]} />{["ACTIVE", "TRANSFER_PENDING"].includes(a.status) && <span className="mt-1 block text-[11px] text-muted">{DISPOSITIONS[a.disposition_status]}</span>}</td>
              </tr>
            );
          })}
        </Table>
        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            {res.page > 1 ? <Link href={qs({ page: String(res.page - 1) })} className={btnSecondary}>← Previous</Link> : <span />}
            <span className="text-muted">Page {res.page} of {pages}</span>
            {res.page < pages ? <Link href={qs({ page: String(res.page + 1) })} className={btnSecondary}>Next →</Link> : <span />}
          </nav>
        )}
      </Card>
    </>
  );
}
