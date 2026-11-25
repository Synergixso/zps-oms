export const metadata = { title: "Modules" };

const MODULES: Array<[string, string, string, string]> = [
  ["M01", "Organisation and Formation Registry", "MVP", "Effective-dated directory, reporting relationships, approval-controlled change history."],
  ["M02", "Identity, Roles and Access", "MVP", "Provisioning, role + scope assignment, delegations, suspension, access reviews."],
  ["M03", "Administrative Request and Approval Workflow", "MVP", "Versioned workflows for approved non-operational categories."],
  ["M04", "Fleet Register and Maintenance", "MVP", "General vehicle records, maintenance lifecycle, service history. No tracking."],
  ["M05", "General Non-sensitive Asset Register", "MVP", "Approved categories only; custody, transfer, inspection, disposal."],
  ["M06", "Dashboards and Management Reporting", "MVP", "Role-specific, aggregate-first, audited exports."],
  ["M07", "Administrative Availability / Scheduling", "Later – separate approval", "Not implemented. Must never expose duty, deployment or whereabouts."],
  ["M08", "Non-sensitive Correspondence Metadata", "Later – separate approval", "Not implemented. Metadata only; no document storage."],
  ["M09", "Notifications", "MVP (in-app only)", "In-app only. Email/SMS/WhatsApp disabled until approved."],
  ["M10", "Audit and Security Administration", "MVP", "Tamper-evident audit, security events, evidence export."],
  ["M11", "Platform Operations", "MVP (technical)", "Health, configuration and release information for technical staff."],
];

export default function Modules() {
  return (
    <div className="print-a4 mx-auto max-w-[1180px] px-4 py-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zp-green">Modules</p>
      <h1 className="mt-2 text-3xl font-bold">Modular by design</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">The proposed module catalogue, with the MVP / later-phase distinction preserved.</p>
      <div className="mt-8 overflow-x-auto rounded-[9px] border border-line">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead className="bg-canvas">
            <tr>
              {["Code", "Module", "Phase", "Scope summary"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MODULES.map(([c, n, p, s]) => (
              <tr key={c}>
                <td className="px-4 py-3 font-mono text-xs">{c}</td>
                <td className="px-4 py-3 font-semibold">{n}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.startsWith("MVP") ? "bg-ok-bg text-ok" : "bg-slate-100 text-slate-600"}`}>{p}</span>
                </td>
                <td className="px-4 py-3 text-ink-2">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
