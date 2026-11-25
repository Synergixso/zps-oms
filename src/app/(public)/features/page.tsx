import Link from "next/link";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { HeroEyebrow, PhotoHero } from "@/components/photo-hero";

export const metadata = { title: "Features" };

/*
 * Features page — implemented to the owner-approved "ZPS-OMS Modules" A4 portrait design,
 * using the approved landing-page hero (DEC-025).
 */

type Tone = "green" | "blue" | "purple" | "navy" | "orange" | "red";

const TILE: Record<Tone, string> = {
  green: "bg-gradient-to-br from-[#22a650] to-[#137634]",
  blue: "bg-gradient-to-br from-[#2a6be0] to-[#1544a8]",
  purple: "bg-gradient-to-br from-[#8360e6] to-[#5a3cc0]",
  navy: "bg-gradient-to-br from-[#1f4590] to-[#0d2149]",
  orange: "bg-gradient-to-br from-[#ff9d2e] to-[#ec6a0c]",
  red: "bg-gradient-to-br from-[#ef4444] to-[#c81e1e]",
};

const ACCENT: Record<Tone, string> = {
  green: "border-l-[#16823b]",
  blue: "border-l-[#1f5bc4]",
  purple: "border-l-[#6a4bd1]",
  navy: "border-l-[#133f91]",
  orange: "border-l-[#f08a1c]",
  red: "border-l-[#dc2626]",
};

const MODULES: Array<{ icon: IconName; title: string; body: string; tone: Tone }> = [
  { icon: "target", title: "Operations Management", body: "Plan, deploy, monitor and evaluate police operations in real time.", tone: "green" },
  { icon: "building", title: "Provincial Divisions", body: "Manage the 10 Provincial Police Divisions, their formations and performance.", tone: "blue" },
  { icon: "sitemap", title: "Divisional Units", body: "Administer authorised units (Mobile Unit, Paramilitary, Protective, Airport, TAZARA, etc.).", tone: "purple" },
  { icon: "users", title: "Personnel Management", body: "Maintain personnel records, posting, leave, training and deployment.", tone: "navy" },
  { icon: "car", title: "Fleet & Transport", body: "Track, allocate and manage police vehicles, drivers, fuel and service schedules.", tone: "green" },
  { icon: "box", title: "Assets & Equipment", body: "Manage inventory, allocation, maintenance and accountability of police assets and equipment.", tone: "orange" },
  { icon: "tools", title: "Maintenance Management", body: "Log, assign, track and approve vehicle and equipment maintenance.", tone: "red" },
  { icon: "clipboardCheck", title: "Requests & Approvals", body: "Digitise operational and administrative requests with a structured approval workflow.", tone: "purple" },
  { icon: "bars", title: "Reports & Analytics", body: "Generate operational, fleet, asset and personnel reports with real-time insights and dashboards.", tone: "blue" },
];

const ROLES: Array<{ icon: IconName; title: string; subtitle: string; access: string; iconColor: string; pill: string }> = [
  {
    icon: "starShield",
    title: "Superadmin",
    subtitle: "(ZPS HQ)",
    access: "Full system access and configuration",
    iconColor: "text-[#16823b]",
    pill: "bg-[#e6f4ea] text-[#14532d]",
  },
  {
    icon: "star",
    title: "CRM Administrator",
    subtitle: "(Operations)",
    access: "Operations, approvals, reports and analytics",
    iconColor: "text-[#1f5bc4]",
    pill: "bg-[#e7effc] text-[#1e3a8a]",
  },
  {
    icon: "users",
    title: "Divisional",
    subtitle: "Commander",
    access: "Manage unit operations, personnel and assets",
    iconColor: "text-[#6a4bd1]",
    pill: "bg-[#e6f4ea] text-[#14532d]",
  },
  {
    icon: "users",
    title: "Division Staff Ops",
    subtitle: "(Operations Staff)",
    access: "Support operations, fleet and equipment management",
    iconColor: "text-[#f08a1c]",
    pill: "bg-[#fdf1df] text-[#7c4a03]",
  },
  {
    icon: "user",
    title: "General User",
    subtitle: "(Authorised Staff)",
    access: "Access to assigned modules and data",
    iconColor: "text-[#1f5bc4]",
    pill: "bg-[#e7effc] text-[#1e3a8a]",
  },
];

export default function Features() {
  return (
    <div className="print-a4">
      <PhotoHero labelledBy="features-title" compact>
        <HeroEyebrow>System Modules</HeroEyebrow>
        <h1
          id="features-title"
          className="mt-4 text-[48px] font-extrabold leading-[1] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[68px] lg:text-[60px] xl:text-[72px]"
        >
          ZPS-OMS
          <br />
          Modules
        </h1>
        <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-slate-100 md:text-[18px]">
          Integrated, role-based modules that work together to manage operations, resources, personnel and assets across all Provincial Divisions and Divisional Units.
        </p>
      </PhotoHero>

      <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_35%,#ffffff_100%)]">
        {/* Core System Modules */}
        <section className="mx-auto max-w-[1200px] px-4 pb-10 pt-14 md:pt-16" aria-labelledby="core-modules">
          <div className="text-center">
            <div className="flex items-center justify-center gap-5">
              <span className="hidden h-[3px] w-24 rounded-full bg-zp-green sm:block" aria-hidden />
              <h2 id="core-modules" className="text-[30px] font-extrabold tracking-tight text-[#0d1b3e] md:text-[40px]">
                Core System Modules
              </h2>
              <span className="hidden h-[3px] w-24 rounded-full bg-zp-green sm:block" aria-hidden />
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-[16px] text-[#1f2d45] md:text-[17px]">
              A comprehensive set of integrated modules for end-to-end police operations management.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.title}>
                <Link
                  href="/modules"
                  className={`group flex h-full items-start gap-4 rounded-2xl border border-l-4 border-[#e3e9f2] bg-white p-5 shadow-[0_4px_16px_rgba(13,33,73,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(13,33,73,0.13)] ${ACCENT[m.tone]}`}
                >
                  <span
                    className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_18px_-6px_rgba(13,33,73,0.5)] ${TILE[m.tone]}`}
                  >
                    <Icon name={m.icon} className="h-9 w-9" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-[20px] font-extrabold leading-tight tracking-tight text-[#0d1b3e]">{m.title}</span>
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c9d3e1] text-[#0d1b3e] transition group-hover:border-zp-green group-hover:bg-zp-green group-hover:text-white">
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[14.5px] leading-snug text-[#1f2d45]">{m.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Module Access by Role */}
        <section className="mx-auto max-w-[1200px] px-4 pb-16" aria-labelledby="module-access">
          <div className="overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]">
            <div className="flex flex-col gap-3 bg-[linear-gradient(90deg,#0d2149_0%,#133f91_100%)] px-6 py-5 text-white md:flex-row md:items-center md:gap-8">
              <h2 id="module-access" className="flex items-center gap-3 text-[24px] font-extrabold tracking-tight md:text-[30px]">
                <Icon name="users" className="h-9 w-9" />
                Module Access by Role
              </h2>
              <span className="hidden h-10 w-px bg-white/40 md:block" aria-hidden />
              <p className="text-[15px] leading-snug text-white/90 md:text-[16px]">Role-based access ensures each user only sees the modules relevant to their responsibilities.</p>
            </div>
            <ul className="grid grid-cols-1 divide-y divide-[#e3e9f2] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
              {ROLES.map((r) => (
                <li key={r.title} className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                  <Icon name={r.icon} className={`h-11 w-11 ${r.iconColor}`} />
                  <p className="text-[17px] font-extrabold leading-tight text-[#0d1b3e]">
                    {r.title}
                    <br />
                    <span className="font-bold">{r.subtitle}</span>
                  </p>
                  <p className={`mt-1 w-full max-w-[220px] rounded-lg px-3 py-2 text-[13.5px] font-medium leading-snug ${r.pill}`}>{r.access}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
