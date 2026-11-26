import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { approvalThreshold, listMaintenance, MAINT_LABEL, MAINT_STATUSES } from "@/server/domain/fleet";
import { AccessDenied, Badge, ButtonLink, Card, PageHeader, Stat, Table, td, fmtDate, btnSecondary } from "@/components/ui";

export const metadata = { title: "Fleet maintenance" };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "maintenance.view")) return <AccessDenied what="fleet maintenance" />;
  const sp = await searchParams;
  const db = getDb();
  const all = await listMaintenance(db, actor);
  const rows = await listMaintenance(db, actor, { status: sp.status, q: sp.q?.slice(0, 40) });
  const n = (s: string[]) => all.filter((m) => s.includes(m.status)).length;
  return (
    <>
      <PageHeader
        eyebrow="M04 · Fleet maintenance"
        title="Maintenance workbench"
        description={`Request → validation → approval (estimated cost ≥ ZMW ${(await approvalThreshold(db)).toLocaleString()} — provisional) → workshop referral → work in progress → completion → verification → closure.`}
        actions={hasPermission(actor, "maintenance.create") ? <ButtonLink href="/app/fleet/maintenance/new" variant="primary">New maintenance request</ButtonLink> : undefined}
      />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Awaiting validation / approval" value={n(["REQUESTED", "VALIDATED"])} href="/app/fleet/maintenance?status=VALIDATED" />
        <Stat label="With workshop / in progress" value={n(["APPROVED", "ASSIGNED", "IN_PROGRESS"])} />
        <Stat label="Completion to verify" value={n(["COMPLETION_SUBMITTED"])} href="/app/fleet/maintenance?status=COMPLETION_SUBMITTED" />
        <Stat label="Closed" value={n(["CLOSED"])} />
      </div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Reference or fleet ref" className="mt-1 w-56 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Stage</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All stages</option>
              {MAINT_STATUSES.map((s) => <option key={s} value={s}>{MAINT_LABEL[s]}</option>)}
            </select>
          </div>
          <button type="submit" className={btnSecondary}>Apply</button>
          {(sp.q || sp.status) && <Link href="/app/fleet/maintenance" className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
        </form>
        <Table head={["Reference", "Vehicle", "Organisation", "Service type", "Est. cost (ZMW)", "Stage", "Updated"]} caption="Maintenance requests">
          {rows.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <td className={td}><Link href={`/app/fleet/maintenance/${m.id}`} className="font-semibold text-zp-blue hover:underline">{m.reference}</Link></td>
              <td className={td}>{m.fleet_ref} · {m.make} {m.model}</td>
              <td className={td}>{m.org_name}</td>
              <td className={td}>{m.service_type}</td>
              <td className={`${td} tabular-nums`}>{m.estimated_cost?.toLocaleString() ?? "—"}{m.approval_required ? " *" : ""}</td>
              <td className={td}><Badge status={m.status} label={MAINT_LABEL[m.status]} /></td>
              <td className={`${td} text-muted`}>{fmtDate(m.updated_at)}</td>
            </tr>
          ))}
        </Table>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">* Requires delegated approval. Cost figures are synthetic.</p>
      </Card>
    </>
  );
}
