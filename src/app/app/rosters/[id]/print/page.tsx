import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { exportRoster, ROSTER_STATUS_LABEL } from "@/server/domain/manpower";
import { Crest, fmtDate, fmtDateTime } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Roster (print)" };

export default async function RosterPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const r = await loadOr404(() => exportRoster(getDb(), actor, id, "print"));
  const groups = new Map<string, typeof r.entries>();
  for (const e of r.entries) groups.set(e.home_unit_name, [...(groups.get(e.home_unit_name) ?? []), e]);
  let n = 0;
  return (
    <div className="print-a4 mx-auto max-w-[900px] bg-white p-6 text-[12.5px] text-black">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/app/rosters/${id}`} className="text-sm text-zp-blue hover:underline">← Back to roster</Link>
        <span className="flex gap-2"><a href={`/app/rosters/${id}/pdf`} className="rounded-md border border-line-2 px-3.5 py-2 text-sm font-semibold text-ink hover:bg-slate-50">Download PDF</a><PrintButton label="Print" /></span>
      </div>
      <header className="flex items-center gap-4 border-b-2 border-black pb-3">
        <Crest className="h-[56px] w-[96px]" />
        <div>
          <p className="text-[15px] font-bold tracking-wide">ZAMBIA POLICE SERVICE — OPERATIONS MANAGEMENT SYSTEM</p>
          <p className="text-[13px] font-semibold">Personnel roster · {r.request.reference} · Version {r.version.version_no} ({ROSTER_STATUS_LABEL[r.version.status]})</p>
          <p className="text-[11px] font-bold uppercase text-red-700">Synthetic demonstration data — not an official document</p>
        </div>
      </header>
      <table className="mt-3 w-full text-[12px]">
        <tbody>
          <tr><td className="w-44 py-0.5 font-semibold">Purpose</td><td>{r.request.purpose}</td></tr>
          <tr><td className="py-0.5 font-semibold">Requesting unit</td><td>{r.request.requesting_unit_name}</td></tr>
          <tr><td className="py-0.5 font-semibold">Duty-area reference</td><td>{r.request.area_name ?? "—"}</td></tr>
          <tr><td className="py-0.5 font-semibold">Commencement</td><td>{fmtDate(r.request.commencement_date)} · {r.request.duration_days} days</td></tr>
          <tr><td className="py-0.5 font-semibold">Compiled / approved</td><td>{r.version.created_by_name}, {fmtDate(r.version.created_at)} · {r.version.approved_by_name ? `${r.version.approved_by_name}, ${fmtDate(r.version.approved_at)}` : "not yet approved"}</td></tr>
        </tbody>
      </table>
      {[...groups.entries()].map(([unit, list]) => (
        <section key={unit} className="mt-4 break-inside-avoid">
          <h2 className="border-b border-black text-[13px] font-bold">{unit} ({list.length})</h2>
          <table className="w-full border-collapse text-[12px]">
            <thead><tr className="text-left"><th className="w-10 py-1">No.</th><th>Service no.</th><th>Rank</th><th>Name</th><th>Remarks</th></tr></thead>
            <tbody>{list.map((e) => <tr key={e.id} className="border-b border-gray-300"><td className="py-1">{++n}</td><td className="font-mono">{e.service_number}</td><td>{e.rank_name}</td><td>{e.full_name}</td><td>{e.issues ?? ""}</td></tr>)}</tbody>
          </table>
        </section>
      ))}
      <p className="mt-6 text-[11px]">Total officers: {r.entries.length}. Printed {fmtDateTime(new Date().toISOString())} by {actor.displayName}. Generated from registry records and traceable to source personnel records.</p>
    </div>
  );
}
