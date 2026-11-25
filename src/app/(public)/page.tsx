import Link from "next/link";
import { Crest } from "@/components/ui";

export const metadata = { title: "Home" };

const PILLARS = [
  ["Organisation registry", "Effective-dated directory of Service Headquarters, the ten Provincial Police Divisions and authorised formations, with approval-controlled change history."],
  ["Administrative requests", "Configurable, versioned approval workflows for non-operational administrative matters, with return, rejection, closure and controlled reopening."],
  ["Fleet maintenance", "General vehicle register, maintenance requests, workshop referral, verification and service history. No location or deployment data."],
  ["General assets", "Tagging, custody, issue, return, transfer, inspection and disposal for approved non-sensitive asset categories."],
  ["Management reporting", "Aggregate-first, permission-controlled reports with audited exports and field allowlists."],
  ["Audit and access control", "Role plus organisational scope on every action, delegated approvals, access recertification and a tamper-evident audit trail."],
];

export default function Home() {
  return (
    <div className="print-a4">
      <section className="border-b border-line bg-gradient-to-b from-canvas to-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zp-green">Zambia Police Service · Operations</p>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.15] text-ink md:text-[42px]">Operations Management System</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
              A proposed secure administrative platform to support coordination, resource accountability and management reporting for Operations office bearers at Service
              Headquarters, the Provincial Police Divisions and designated Divisional Units — within existing command structures and delegations.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-md bg-zp-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zp-green-dark">
                Secure sign-in
              </Link>
              <Link href="/modules" className="rounded-md border border-line-2 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
                Explore the modules
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-xl border border-line bg-white p-8 shadow-sm">
              <Crest className="h-[160px] w-[276px]" />
              <div className="zp-band mt-6 rounded" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-12">
        <h2 className="text-xl font-bold">What the system is designed to do</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          ZPS-OMS is an administrative operations-support system. It does not establish command authority and does not change existing institutional delegations.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(([t, d]) => (
            <div key={t} className="rounded-[9px] border border-line bg-white p-5">
              <h3 className="text-[15px] font-semibold text-ink">{t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-canvas">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-12 md:grid-cols-3">
          <div>
            <h2 className="text-[15px] font-bold">Institutional scope</h2>
            <p className="mt-2 text-[13.5px] text-ink-2">Office of the Deputy Inspector General – Operations; ten Provincial Police Divisions; authorised Divisional Units and formations.</p>
          </div>
          <div>
            <h2 className="text-[15px] font-bold">Deliberately excluded</h2>
            <p className="mt-2 text-[13.5px] text-ink-2">
              Tactical deployment, patrol routes, live tracking, dispatch, intelligence, investigations, evidence, firearms and armoury records, HR and payroll.
            </p>
          </div>
          <div>
            <h2 className="text-[15px] font-bold">Current status</h2>
            <p className="mt-2 text-[13.5px] text-ink-2">
              Local prototype using synthetic data for institutional review. Not approved for production use, police networks or real police information.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
