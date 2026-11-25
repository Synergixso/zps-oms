import Link from "next/link";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { FORMATIONS, PROVINCES } from "@/server/db/seed";

export const metadata = { title: "Home" };

/*
 * Landing page — implemented to the owner-approved A4 portrait landing-page design
 * (approved content and imagery confirmed by the project owner, 25 Nov 2026; DEC-025).
 */

type Tone = "green" | "blue" | "purple" | "orange" | "navy";

const TONE: Record<Tone, string> = {
  green: "bg-gradient-to-br from-[#1f9a4a] to-[#147a36]",
  blue: "bg-gradient-to-br from-[#1f5bc4] to-[#133f91]",
  purple: "bg-gradient-to-br from-[#7c5ce0] to-[#5a3fc0]",
  orange: "bg-gradient-to-br from-[#f7931e] to-[#e8650f]",
  navy: "bg-gradient-to-br from-[#1a3a7a] to-[#0d2149]",
};

const CAPABILITIES: Array<{ icon: IconName; title: string; body: string; tone: Tone }> = [
  { icon: "users", title: "Operations Management", body: "Coordinate and monitor operations, tasks and readiness in real time.", tone: "green" },
  { icon: "building", title: "Provincial Divisions", body: "Manage and oversee the ten Provincial Police Divisions nationwide.", tone: "blue" },
  { icon: "layers", title: "Divisional Units", body: "Administer formations such as Mobile Unit, Paramilitary Battalion, Protective Unit, Airport and TAZARA.", tone: "purple" },
  { icon: "car", title: "Fleet & Transport", body: "Track vehicles, utilisation, maintenance and service status.", tone: "green" },
  { icon: "box", title: "Assets & Equipment", body: "Maintain an accurate inventory and accountability of operational assets.", tone: "blue" },
  { icon: "tools", title: "Maintenance Management", body: "Log, approve and monitor equipment and vehicle maintenance requests.", tone: "orange" },
  { icon: "bars", title: "Reports & Analytics", body: "Generate operational, resource and compliance reports for decision making.", tone: "navy" },
  { icon: "shieldCheck", title: "Access & Security", body: "Role-based access, audit trails and compliance with Police Service standards.", tone: "green" },
];

const TRUST: Array<[IconName, string]> = [
  ["shield", "Secure"],
  ["layers", "Integrated"],
  ["bars", "Real-time"],
  ["network", "Centralised"],
];

/** Hero photography (public/hero/*.webp), slowly cross-faded; reduced-motion shows the first image only. */
function HeroImages({ className = "", position = "100% 100%" }: { className?: string; position?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero/hero-01.webp" alt="" width={1774} height={887} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero/hero-02.webp" alt="" width={1774} height={887} loading="lazy" className="hero-fade absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />
    </div>
  );
}

export default function Home() {
  const stats: Array<[IconName, string, string]> = [
    ["map", String(PROVINCES.length), "Provincial Divisions"],
    ["users", String(FORMATIONS.length), "Divisional Formations"],
    ["car", "8", "Integrated Operations"],
    ["shieldCheck", "One", "Operations Platform"],
  ];

  return (
    <div className="print-a4">
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#0d2149] text-white" aria-labelledby="hero-title">
        {/* Photographic background (≥1024 px): image anchored right, blended into the navy text panel */}
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block xl:w-[78%]" aria-hidden>
          <HeroImages className="h-full w-full" />
          <div className="absolute inset-0 -left-px bg-[linear-gradient(90deg,#0d2149_0%,#0d2149_3%,rgba(13,33,73,0.9)_11%,rgba(13,33,73,0.4)_25%,rgba(13,33,73,0)_38%)]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d2149]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 h-[30%] w-[42%] bg-gradient-to-t from-[#0d2149] via-[#0d2149]/70 to-transparent [mask-image:linear-gradient(90deg,#000_45%,transparent)]" />
        </div>
        <div className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-[#1f5bc4]/25 blur-3xl" aria-hidden />

        <div className="mx-auto max-w-[1280px] px-5 pb-10 pt-12 sm:px-8 md:pt-16 lg:flex lg:min-h-[600px] lg:items-center lg:pb-28 lg:pt-10 xl:min-h-[min(42vw,720px)]">
          <div className="max-w-[560px] lg:max-w-[430px] xl:max-w-[540px]">
            <p className="flex items-center gap-3 text-[12.5px] font-bold uppercase tracking-[0.2em] text-white">
              <span className="h-[3px] w-10 rounded-full bg-zp-green" aria-hidden />
              National Operations Platform
            </p>
            <h1 id="hero-title" className="mt-4 text-[56px] font-extrabold leading-[0.95] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[84px] lg:text-[72px] xl:text-[84px]">
              ZPS-OMS
            </h1>
            <p className="mt-3 text-[23px] font-bold leading-[1.2] md:text-[31px] lg:text-[27px] xl:text-[31px]">
              Zambia Police Service
              <br />
              Operations Management System
            </p>
            <p className="mt-5 max-w-[470px] text-[15.5px] leading-relaxed text-slate-100 md:text-[17px]">
              A secure, integrated and modern platform for restoring operational efficiency, resource coordination and accountability across the DIG Operations, Provincial
              Divisions and Divisional Units.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 rounded-lg border-2 border-[#4cd07d] bg-gradient-to-b from-[#1fa04f] to-[#147a36] px-7 py-3.5 text-[16px] font-bold text-white shadow-[0_10px_28px_-8px_rgba(22,130,59,0.8)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Access System <Icon name="arrow" className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2.5 rounded-lg border-2 border-white/85 px-7 py-3.5 text-[16px] font-bold text-white transition hover:bg-white/10">
                Learn More <Icon name="play" className="h-5 w-5" />
              </Link>
            </div>
            <ul className="mt-9 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px] font-semibold text-white sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap lg:text-[13.5px] xl:text-[14px]">
              {TRUST.map(([icon, label], i) => (
                <li key={label} className="flex items-center whitespace-nowrap">
                  {i > 0 && <span className="mx-3 hidden h-6 w-px bg-white/35 sm:block xl:mx-4" aria-hidden />}
                  <Icon name={icon} className="mr-2 h-5 w-5" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Photograph below the text on phones and tablets so faces are never covered */}
        <div className="relative -mt-6 lg:hidden" aria-hidden>
          <HeroImages className="aspect-[4/3] w-full sm:aspect-[2/1]" position="68% 100%" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d2149] to-transparent" />
        </div>
      </section>

      {/* ───────────────────── Key System Capabilities ───────────────────── */}
      <section className="relative bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_40%,#ffffff_100%)] py-14 md:py-20">
        <div className="mx-auto max-w-[1180px] px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-5">
              <span className="hidden h-[3px] w-24 rounded-full bg-zp-green sm:block" aria-hidden />
              <h2 className="text-[30px] font-extrabold tracking-tight text-[#0d1b3e] md:text-[40px]">Key System Capabilities</h2>
              <span className="hidden h-[3px] w-24 rounded-full bg-zp-green sm:block" aria-hidden />
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-[16px] text-[#1f2d45] md:text-[17px]">Comprehensive operational management for a modern and responsive Police Service.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <article
                key={c.title}
                className="group rounded-2xl border border-[#e3e9f2] bg-white px-6 pb-7 pt-6 text-center shadow-[0_4px_16px_rgba(13,33,73,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(13,33,73,0.13)]"
              >
                <span className={`mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-2xl text-white shadow-[0_8px_18px_-6px_rgba(13,33,73,0.45)] ${TONE[c.tone]}`}>
                  <Icon name={c.icon} className="h-8 w-8" />
                </span>
                <h3 className="mt-4 text-[18px] font-extrabold tracking-tight text-[#0d1b3e]">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#2a3a55]">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Figures band ───────────────────────── */}
      <section className="relative isolate overflow-hidden text-white" aria-label="Key figures">
        <div className="absolute inset-0 -z-10 bg-[url('/hero/hero-01.webp')] bg-cover bg-[center_30%]" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,48,107,0.92)_0%,rgba(19,63,145,0.94)_50%,rgba(18,48,107,0.92)_100%)]" aria-hidden />
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-8 px-4 py-9 lg:grid-cols-4">
          {stats.map(([icon, value, label], i) => (
            <div key={label} className={`flex items-center gap-4 px-2 lg:justify-center lg:px-6 ${i > 0 ? "lg:border-l lg:border-white/30" : ""}`}>
              <Icon name={icon} className="h-12 w-12 shrink-0 text-white" />
              <div>
                <p className="text-[38px] font-extrabold leading-none">{value}</p>
                <p className="mt-1 text-[15px] font-semibold text-white/95">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Call to action ───────────────────────── */}
      <section className="bg-white py-12 md:py-14">
        <div className="mx-auto max-w-[1180px] px-4">
          <div className="grid items-center overflow-hidden rounded-2xl border border-[#e3e9f2] bg-[linear-gradient(90deg,#f3f6fb_0%,#eef3fa_100%)] shadow-[0_6px_22px_rgba(13,33,73,0.08)] md:grid-cols-[minmax(260px,330px)_1fr_auto]">
            <div className="relative h-[190px] md:h-full md:min-h-[170px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero/cta-vehicle.webp" alt="Zambia Police Service vehicle" width={876} height={396} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-left" />
              <div className="absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-r from-transparent to-[#f3f6fb] md:block" aria-hidden />
            </div>
            <div className="px-6 py-6 md:px-8">
              <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0d1b3e] md:text-[30px]">
                Modernising Police Operations
                <br className="hidden md:block" /> Across Zambia
              </h2>
              <p className="mt-2 max-w-[520px] text-[15px] text-[#2a3a55]">
                A unified digital platform for coordination, resource management and operational accountability under the DIG Operations.
              </p>
            </div>
            <div className="px-6 pb-7 md:pb-0 md:pr-8">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl bg-gradient-to-b from-[#1fa04f] to-[#147a36] px-8 py-4 text-[17px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(22,130,59,0.8)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Access ZPS-OMS <Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
