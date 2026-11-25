import Link from "next/link";
import { Crest } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { SectionTitle, Wave } from "@/components/public-ui";
import { ROLES } from "@/server/domain/catalogue";
import { FORMATIONS, PROVINCES } from "@/server/db/seed";

export const metadata = { title: "Home" };

/*
 * Landing page composed after the supplied A4 portrait reference.
 * Deliberate departures (see docs/UI_UX_DESIGN_SYSTEM.md §Landing page):
 *  - no officer photography, uniforms, insignia, flags, building or vehicle imagery
 *    (none approved; must not fabricate identities or insignia) — replaced by the
 *    unaltered crest and an illustrative interface preview;
 *  - "real-time", "readiness", "tracking" and "integrated operations" claims removed
 *    (excluded capabilities / no integrations exist);
 *  - figures are configured-directory counts only, labelled as such.
 */

const CAPABILITIES: Array<{ icon: IconName; title: string; body: string; tone: "green" | "blue" }> = [
  { icon: "users", title: "Operations Administration", body: "Coordinate administrative requests, approvals and outstanding actions across the Operations establishment.", tone: "green" },
  { icon: "building", title: "Provincial Divisions", body: "Dedicated workspaces for the ten Provincial Police Divisions, each limited to its own records.", tone: "blue" },
  { icon: "layers", title: "Divisional Units", body: "Formation workspaces for authorised units such as Mobile Unit, Paramilitary Battalion, Protective Unit, Airport and TAZARA Divisions.", tone: "blue" },
  { icon: "truck", title: "Fleet & Transport", body: "General vehicle register with licence, insurance and service due dates — administrative records only.", tone: "green" },
  { icon: "box", title: "Assets & Equipment", body: "Custody, transfer and inspection of approved, non-sensitive general assets with full history.", tone: "blue" },
  { icon: "wrench", title: "Maintenance Management", body: "Request, approve, refer, verify and close vehicle maintenance with a complete service history.", tone: "green" },
  { icon: "chart", title: "Reports & Analytics", body: "Aggregate, permission-controlled management reports with audited exports.", tone: "blue" },
  { icon: "shield", title: "Access & Security", body: "Role and organisational-scope access, delegated approvals and a tamper-evident audit trail.", tone: "green" },
];

const TRUST: Array<[IconName, string]> = [
  ["shield", "Secure"],
  ["key", "Role-based"],
  ["search", "Auditable"],
  ["layers", "Centralised"],
];

function PreviewPanel() {
  // Illustrative, non-data interface preview. Decorative only.
  const bars = [62, 48, 74, 40, 86, 58];
  return (
    <div className="relative w-full max-w-[460px]" aria-hidden>
      <div className="absolute -right-4 -top-4 hidden h-[120px] w-[200px] items-center justify-center rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5 md:flex">
        <Crest className="h-[90px] w-[155px]" />
      </div>
      <div className="rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 ring-white/20 md:mt-28">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-zp-green" />
            <span className="text-[12px] font-bold text-[#0d2149]">Provincial Division Command Dashboard</span>
          </div>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">Illustrative</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Awaiting decision", "Open requests", "Service due"].map((l, i) => (
            <div key={l} className="rounded-lg border border-line p-2">
              <p className="text-[9px] font-semibold text-muted">{l}</p>
              <div className={`mt-1.5 h-3 w-8 rounded ${i === 0 ? "bg-amber-300" : i === 1 ? "bg-zp-blue/70" : "bg-zp-green/70"}`} />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="mb-2 text-[9px] font-semibold text-muted">Request status</p>
          <div className="flex h-20 items-end gap-2">
            {bars.map((h, i) => (
              <div key={i} className={`flex-1 rounded-t ${i % 2 ? "bg-zp-blue/80" : "bg-zp-green/80"}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {[0, 1, 2].map((r) => (
            <div key={r} className="flex items-center gap-2">
              <span className="h-2 w-14 rounded bg-slate-200" />
              <span className="h-2 flex-1 rounded bg-slate-100" />
              <span className={`h-3 w-12 rounded-full ${r === 0 ? "bg-amber-100" : r === 1 ? "bg-emerald-100" : "bg-blue-100"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const stats: Array<[IconName, string, string, string]> = [
    ["map", String(PROVINCES.length), "Provincial Divisions", "Configured directory entries"],
    ["users", String(FORMATIONS.length), "Divisional Formations", "Provisional — validate internally"],
    ["key", String(ROLES.length), "Role-specific Workspaces", "Proposed role catalogue"],
    ["shield", "One", "Operations Platform", "Single secure environment"],
  ];
  return (
    <div className="print-a4">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0d2149_0%,#12306b_50%,#133f91_100%)] text-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 pb-4 pt-12 md:pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              <span className="h-[3px] w-10 rounded-full bg-zp-green" aria-hidden />
              National Operations Platform
            </p>
            <h1 className="mt-4 text-[52px] font-extrabold leading-none tracking-tight md:text-[72px]">ZPS-OMS</h1>
            <p className="mt-3 text-[22px] font-bold leading-snug md:text-[28px]">
              Zambia Police Service
              <br />
              Operations Management System
            </p>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-200">
              A secure, unified administrative platform supporting coordination, resource accountability and management reporting across the Office of the DIG Operations,
              the Provincial Police Divisions and Divisional Units.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-zp-green px-6 py-3 text-[15px] font-bold text-white shadow-lg ring-1 ring-emerald-400/40 hover:bg-zp-green-dark">
                Access System <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-lg border-2 border-white/80 px-6 py-3 text-[15px] font-bold text-white hover:bg-white/10">
                Learn More <Icon name="eye" className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-slate-100">
              {TRUST.map(([icon, label], i) => (
                <li key={label} className="flex items-center gap-2">
                  {i > 0 && <span className="mr-3 hidden h-5 w-px bg-white/25 sm:block" aria-hidden />}
                  <Icon name={icon} className="h-[18px] w-[18px]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center pb-6 lg:justify-end">
            <PreviewPanel />
          </div>
        </div>
        <Wave fill="var(--color-canvas)" />
      </section>

      {/* Capabilities */}
      <section className="bg-canvas py-12 md:py-16">
        <div className="mx-auto max-w-[1180px] px-4">
          <SectionTitle title="Key System Capabilities" subtitle="Administrative operations support for Operations office bearers at Service Headquarters, the Provincial Divisions and Divisional Units." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <article key={c.title} className="rounded-xl border border-line bg-white p-6 text-center shadow-[0_2px_8px_rgba(13,33,73,0.06)] transition-shadow hover:shadow-[0_6px_18px_rgba(13,33,73,0.10)]">
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-white shadow ${c.tone === "green" ? "bg-zp-green" : "bg-zp-blue"}`}>
                  <Icon name={c.icon} className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-[17px] font-bold text-[#0d2149]">{c.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Figures band */}
      <section className="bg-[linear-gradient(90deg,#12306b_0%,#133f91_100%)] text-white" aria-label="Configured structure">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-6 px-4 py-8 lg:grid-cols-4">
          {stats.map(([icon, value, label, note], i) => (
            <div key={label} className={`flex items-center gap-4 px-2 lg:px-6 ${i > 0 ? "lg:border-l lg:border-white/20" : ""}`}>
              <Icon name={icon} className="h-10 w-10 shrink-0 text-white/90" />
              <div>
                <p className="text-[32px] font-extrabold leading-none">{value}</p>
                <p className="mt-1 text-[14px] font-semibold">{label}</p>
                <p className="text-[11px] text-slate-300">{note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-center text-[11px] text-slate-300">
          Figures describe the configured reference structure of this prototype — not operational or performance data.
        </p>
      </section>

      {/* Call to action */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1180px] px-4">
          <div className="grid items-center gap-6 overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm md:grid-cols-[300px_1fr_auto]">
            <div className="flex h-full min-h-[150px] flex-col items-center justify-center bg-white p-6">
              <Crest className="h-[96px] w-[165px]" />
              <div className="zp-band mt-4 w-40 rounded" aria-hidden />
            </div>
            <div className="px-6 md:px-0">
              <h2 className="text-[24px] font-bold leading-tight text-[#0d2149] md:text-[28px]">Modernising Operations Administration Across Zambia</h2>
              <p className="mt-2 text-[14.5px] text-ink-2">
                A unified digital platform for coordination, resource accountability and management reporting under the Office of the DIG Operations — within existing command
                structures and delegations.
              </p>
            </div>
            <div className="px-6 pb-6 md:pb-0 md:pr-8">
              <Link href="/login" className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-zp-green px-6 py-3.5 text-[15px] font-bold text-white shadow-md hover:bg-zp-green-dark">
                Access ZPS-OMS <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
