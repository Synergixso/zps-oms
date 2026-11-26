import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { DISPOSITIONS, EMPLOYMENT_LABEL, EMPLOYMENT_STATUSES, listPersonnel, ranks, type PersonnelFilters } from "@/server/domain/personnel";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Table, td, btnSecondary } from "@/components/ui";

export const metadata = { title: "Personnel register" };

type SP = Record<string, string | undefined>;
const sel = "mt-1 block w-full rounded-md border border-line-2 bg-white px-2.5 py-2 text-sm";

export default async function PersonnelPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "personnel.view"))) return <AccessDenied what="the personnel register" />;
  const sp = await searchParams;
  const db = getDb();
  const f: PersonnelFilters = {
    q: sp.q, rank: sp.rank, unit: sp.unit, employment: sp.employment, disposition: sp.disposition, verification: sp.verification,
    sort: (sp.sort as PersonnelFilters["sort"]) ?? "name", dir: sp.dir === "desc" ? "desc" : "asc", page: Number(sp.page) || 1,
  };
  const [res, rankList, units] = await Promise.all([listPersonnel(db, actor, f), ranks(db), scopedUnits(db, actor, "personnel.view")]);
  const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
  const qs = (over: SP) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  const sortLink = (key: NonNullable<PersonnelFilters["sort"]>, label: string) => (
    <Link href={qs({ sort: key, dir: f.sort === key && f.dir === "asc" ? "desc" : "asc", page: undefined })} className="hover:underline">
      {label}
      {f.sort === key ? (f.dir === "asc" ? " ▲" : " ▼") : ""}
    </Link>
  );
  return (
    <>
      <PageHeader
        eyebrow="Personnel registry"
        title="Personnel register"
        description="One canonical record per officer. You see officers whose home unit is within your authorised scope."
        actions={
          <>
            {hasPermission(actor, "personnel.export") && (
              <a href={`/app/personnel/export${qs({ page: undefined })}`} className={btnSecondary}>
                Export CSV
              </a>
            )}
            {hasPermission(actor, "personnel.edit") && <ButtonLink href="/app/personnel/review">Duplicate review</ButtonLink>}
            {hasPermission(actor, "personnel.register") && <ButtonLink href="/app/personnel/new" variant="primary">Register officer</ButtonLink>}
          </>
        }
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">
            Search
            <input name="q" defaultValue={sp.q} placeholder="Name, service number or PER reference" className={sel} />
          </label>
          <label className="text-xs font-semibold text-ink-2">
            Rank
            <select name="rank" defaultValue={sp.rank ?? ""} className={sel}>
              <option value="">All ranks</option>
              {rankList.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">
            Organisation (includes subordinate units)
            <select name="unit" defaultValue={sp.unit ?? ""} className={sel}>
              <option value="">All units in my scope</option>
              {unitOptions(units).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-2">
            Employment
            <select name="employment" defaultValue={sp.employment ?? ""} className={sel}>
              <option value="">Any</option>
              {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-2 lg:col-span-2">
            Disposition
            <select name="disposition" defaultValue={sp.disposition ?? ""} className={sel}>
              <option value="">Any</option>
              {Object.entries(DISPOSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-2">
            Verification
            <select name="verification" defaultValue={sp.verification ?? ""} className={sel}>
              <option value="">Any</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-3">
            <button type="submit" className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Apply filters</button>
            <Link href="/app/personnel" className={btnSecondary}>Clear</Link>
          </div>
        </form>
      </Card>
      <Card title={`${res.total} officer${res.total === 1 ? "" : "s"}`} subtitle={`Page ${res.page} of ${pages}`} bodyClass="p-0">
        <Table head={[sortLink("ref", "Reference"), sortLink("name", "Name"), sortLink("rank", "Rank"), sortLink("unit", "Home unit"), "Employment", "Disposition", "Verification"]}>
          {res.rows.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/60">
              <td className={`${td} font-mono text-xs`}>
                <Link href={`/app/personnel/${p.id}`} className="text-zp-blue hover:underline">{p.personnel_ref}</Link>
                <span className="block text-muted">{p.service_number}</span>
              </td>
              <td className={td}><Link href={`/app/personnel/${p.id}`} className="font-semibold hover:underline">{p.surname}, {p.first_names}</Link></td>
              <td className={td}>{p.rank_name}</td>
              <td className={td}>{p.home_unit_name}</td>
              <td className={td}>{EMPLOYMENT_LABEL[p.employment_status]}</td>
              <td className={td}><Badge status={p.disposition_status} label={DISPOSITIONS[p.disposition_status]} /></td>
              <td className={td}><Badge status={p.verification_status === "VERIFIED" ? "APPROVED" : p.verification_status === "REJECTED" ? "REJECTED" : "PENDING"} label={p.verification_status.toLowerCase()} /></td>
            </tr>
          ))}
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
