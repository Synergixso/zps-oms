import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { HeroEyebrow, PhotoHero } from "@/components/photo-hero";

export const metadata = { title: "How It Works" };

/*
 * How It Works page — implemented to the owner-approved A4 portrait design,
 * using the approved landing-page hero (DEC-025). The national office is named
 * with its official title (DEC-027).
 */

type Tone = "green" | "blue" | "purple" | "orange";

const STEP: Record<Tone, { card: string; tile: string; badge: string }> = {
  green: { card: "border-[#cfe6d6] bg-[linear-gradient(180deg,#f1f9f3_0%,#ffffff_100%)]", tile: "from-[#22a650] to-[#137634]", badge: "bg-[#16823b]" },
  blue: { card: "border-[#d3def2] bg-[linear-gradient(180deg,#eef4fc_0%,#ffffff_100%)]", tile: "from-[#2a6be0] to-[#1544a8]", badge: "bg-[#1f5bc4]" },
  purple: { card: "border-[#e0d8f6] bg-[linear-gradient(180deg,#f5f1fd_0%,#ffffff_100%)]", tile: "from-[#8360e6] to-[#5a3cc0]", badge: "bg-[#6a4bd1]" },
  orange: { card: "border-[#f6e1c4] bg-[linear-gradient(180deg,#fdf5ea_0%,#ffffff_100%)]", tile: "from-[#ff9d2e] to-[#ec6a0c]", badge: "bg-[#ec7a12]" },
};

const STEPS: Array<{ icon: IconName; title: string; body: string; tone: Tone }> = [
  { icon: "fileEdit", title: "Initiate", body: "Create and submit an approved administrative request or record (e.g. fleet, asset, maintenance, etc.).", tone: "green" },
  { icon: "docSearch", title: "Review", body: "The request is received, checked and verified by the authorised Operations officer.", tone: "blue" },
  { icon: "stamp", title: "Approve", body: "The request is considered and decided upon by the authorised approving authority.", tone: "purple" },
  { icon: "gear", title: "Implement", body: "Approved action is executed (e.g. service, allocation, update or resource processing) and recorded.", tone: "orange" },
  { icon: "bars", title: "Report & Monitor", body: "Track progress, maintain records and generate management reports for Operations leadership.", tone: "green" },
];

const TIERS: Array<{ icon: IconName; title: string; sub: string; bg: string; points: string[] }> = [
  {
    icon: "bank",
    title: "Service Headquarters",
    sub: "(DIG Operations)",
    bg: "from-[#1f5bc4] to-[#0d2149]",
    points: ["National oversight and coordination", "Approvals and consolidated reporting", "Management visibility"],
  },
  {
    icon: "bank",
    title: "Provincial Police Divisions",
    sub: "(10 Provinces)",
    bg: "from-[#1f9a4a] to-[#0f6a2c]",
    points: ["Divisional administration and coordination", "Processing of administrative matters", "Divisional reporting and compliance"],
  },
  {
    icon: "users",
    title: "Divisional Units & Formations",
    sub: "(e.g. Mobile Unit Division / SPOM – Kamfinsa, Paramilitary, Protective Unit, Airport, TAZARA, etc.)",
    bg: "from-[#1f5bc4] to-[#0d2149]",
    points: ["Creation of administrative requests", "Operational support administration", "Resource and record management"],
  },
];

const MANAGES = [
  "Administrative requests and approvals",
  "Organisational and formation records",
  "Fleet and transport administration",
  "General asset accountability (non-sensitive)",
  "Management dashboards and reports",
  "Notifications and administrative reminders",
  "Audit and compliance records",
  "User access and system administration",
];

const BENEFITS: Array<{ icon: IconName; label: string; color: string }> = [
  { icon: "gauge", label: "Faster administrative processing", color: "text-[#16823b]" },
  { icon: "sitemap", label: "Improved institutional coordination", color: "text-[#1f5bc4]" },
  { icon: "chartMonitor", label: "Better management visibility", color: "text-[#6a4bd1]" },
  { icon: "shieldCheck", label: "Greater accountability and auditability", color: "text-[#ec7a12]" },
  { icon: "database", label: "Standardised and reliable records", color: "text-[#1f5bc4]" },
  { icon: "car", label: "Improved fleet and asset administration", color: "text-[#16823b]" },
  { icon: "users", label: "Consistent reporting across all levels", color: "text-[#6a4bd1]" },
];

function PanelHeader({ id, icon, children }: { id: string; icon: IconName; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 bg-gradient-to-r from-[#0d2149] to-[#133f91] px-6 py-4 text-[21px] font-extrabold text-white md:text-[25px]">
      <Icon name={icon} className="h-8 w-8 shrink-0" />
      {children}
    </h2>
  );
}

export default function HowItWorks() {
  return (
    <div className="print-a4">
      <PhotoHero labelledBy="how-title" compact>
        <HeroEyebrow>Process Overview</HeroEyebrow>
        <h1
          id="how-title"
          className="mt-4 text-[48px] font-extrabold leading-[1] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[68px] lg:text-[60px] xl:text-[72px]"
        >
          How It Works
        </h1>
        <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-slate-100 md:text-[18px]">
          A simple, secure and structured process that connects Service Headquarters, Provincial Divisions and Operations Divisional Units to manage Operations administrative
          matters across Zambia.
        </p>
      </PhotoHero>

      <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_35%,#ffffff_100%)]">
        {/* Operational flow */}
        <section className="mx-auto max-w-[1240px] px-4 pb-8 pt-14 md:pt-16" aria-labelledby="flow">
          <div className="text-center">
            <div className="flex items-center justify-center gap-5">
              <span className="hidden h-[3px] w-20 shrink-0 rounded-full bg-zp-green sm:block" aria-hidden />
              <h2 id="flow" className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0d1b3e] md:text-[38px]">
                The ZPS-OMS Operational Flow
              </h2>
              <span className="hidden h-[3px] w-20 shrink-0 rounded-full bg-zp-green sm:block" aria-hidden />
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-[16px] leading-relaxed text-[#1f2d45] md:text-[17px]">
              From request initiation to approval, implementation and reporting, ZPS-OMS digitises and standardises key Operations administrative processes.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {STEPS.map((s, i) => {
              const t = STEP[s.tone];
              return (
                <li key={s.title} className={`relative rounded-2xl border px-5 pb-6 pt-6 text-center shadow-[0_4px_16px_rgba(13,33,73,0.07)] ${t.card}`}>
                  <span
                    className={`mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_8px_18px_-6px_rgba(13,33,73,0.5)] ${t.tile}`}
                  >
                    <Icon name={s.icon} className="h-9 w-9" />
                  </span>
                  <span className={`mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-extrabold text-white ${t.badge}`} aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="mt-2 text-[21px] font-extrabold tracking-tight text-[#0d1b3e]">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-snug text-[#1f2d45]">{s.body}</p>
                  {i < STEPS.length - 1 && (
                    <span
                      className="absolute -right-[22px] top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#c9d3e1] bg-white text-[#0d1b3e] shadow-sm lg:flex"
                      aria-hidden
                    >
                      <Icon name="chevron" className="h-5 w-5" />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Workflow + What it manages */}
        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section aria-labelledby="workflow" className="overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]">
            <PanelHeader id="workflow" icon="gear">
              Institutional Workflow Across Zambia
            </PanelHeader>
            <ol className="space-y-1 p-5 md:p-6">
              {TIERS.map((t, i) => (
                <li key={t.title}>
                  <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    <div
                      className={`bg-gradient-to-b px-8 py-4 text-center text-white shadow-[0_8px_18px_-8px_rgba(13,33,73,0.6)] ${t.bg}`}
                      style={{ clipPath: "polygon(9% 0, 91% 0, 100% 100%, 0 100%)", borderRadius: "14px" }}
                    >
                      <Icon name={t.icon} className="mx-auto h-8 w-8" />
                      <p className="mt-1 text-[17px] font-extrabold leading-tight">{t.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-white/90">{t.sub}</p>
                    </div>
                    <ul className="list-disc space-y-1 rounded-xl border border-[#d3def2] bg-[#f1f5fc] py-3 pl-8 pr-4 text-[14.5px] text-[#1f2d45]">
                      {t.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  {i < TIERS.length - 1 && (
                    <div className="flex justify-center gap-2 py-1.5 md:w-[53%]" aria-hidden>
                      <Icon name="arrowUp" className="h-6 w-6 text-[#16823b]" />
                      <Icon name="arrowDown" className="h-6 w-6 text-[#16823b]" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="manages" className="overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]">
            <PanelHeader id="manages" icon="target">
              What ZPS-OMS Manages
            </PanelHeader>
            <ul className="space-y-3.5 p-6">
              {MANAGES.map((m) => (
                <li key={m} className="flex items-start gap-3 text-[16px] text-[#1f2d45]">
                  <Icon name="checkCircle" className="h-7 w-7 shrink-0 text-[#16823b]" />
                  <span className="pt-0.5">{m}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Key benefits */}
        <section className="mx-auto max-w-[1240px] px-4 pb-16 pt-4" aria-labelledby="benefits">
          <div className="overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]">
            <PanelHeader id="benefits" icon="clipboardCheck">
              Key Benefits for Operations
            </PanelHeader>
            <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
              {BENEFITS.map((b, i) => (
                <li key={b.label} className={`flex flex-col items-center gap-2.5 px-3 py-6 text-center ${i > 0 ? "lg:border-l lg:border-[#e3e9f2]" : ""}`}>
                  <Icon name={b.icon} className={`h-11 w-11 ${b.color}`} />
                  <span className="max-w-[150px] text-[15px] font-bold leading-snug text-[#0d1b3e]">{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
