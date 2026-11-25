import Link from "next/link";
import type { AuditRow } from "@/server/domain/auditq";
import { Badge, Table, td, fmtDateTime, btnSecondary } from "./ui";

export function AuditFiltersForm({ sp, base, categories }: { sp: Record<string, string | undefined>; base: string; categories: string[] }) {
  return (
    <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
      <div>
        <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search action / entity</label>
        <input id="q" name="q" defaultValue={sp.q} className="mt-1 w-52 rounded-md border border-line-2 px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="category" className="block text-xs font-semibold text-ink-2">Category</label>
        <select id="category" name="category" defaultValue={sp.category ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
          <option value="">All</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="outcome" className="block text-xs font-semibold text-ink-2">Outcome</label>
        <select id="outcome" name="outcome" defaultValue={sp.outcome ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
          <option value="">All</option>
          {["SUCCESS", "DENIED", "FAILURE"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="from" className="block text-xs font-semibold text-ink-2">From</label>
        <input id="from" name="from" type="date" defaultValue={sp.from} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="to" className="block text-xs font-semibold text-ink-2">To</label>
        <input id="to" name="to" type="date" defaultValue={sp.to} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm" />
      </div>
      <button type="submit" className={btnSecondary}>Search</button>
      <Link href={base} className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>
    </form>
  );
}

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <Table head={["#", "Time (Lusaka)", "Actor", "Action", "Outcome", "Category", "Entity", "Organisation", "Details"]} empty="No audit events match.">
      {rows.map((r) => (
        <tr key={r.id} className="align-top">
          <td className={`${td} tabular-nums text-muted`}>{r.seq}</td>
          <td className={`${td} whitespace-nowrap`}>{fmtDateTime(r.occurred_at)}</td>
          <td className={td}>{r.actor_name ?? "System"}</td>
          <td className={`${td} font-mono text-xs`}>{r.action}</td>
          <td className={td}><Badge status={r.outcome} /></td>
          <td className={`${td} text-xs`}>{r.category}</td>
          <td className={`${td} font-mono text-[11px]`}>{r.entity_type ? `${r.entity_type}:${r.entity_id}` : "—"}</td>
          <td className={`${td} text-xs`}>{r.org_name ?? "—"}</td>
          <td className={`${td} max-w-[280px] break-words font-mono text-[11px] text-ink-2`}>{r.details ?? ""}</td>
        </tr>
      ))}
    </Table>
  );
}
