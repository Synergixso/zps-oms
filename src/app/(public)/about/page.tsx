import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { HeroEyebrow, PhotoHero } from "@/components/photo-hero";

export const metadata = { title: "About" };

/*
 * About page — implemented to the owner-approved A4 portrait "About ZPS-OMS" design,
 * using the approved landing-page hero (DEC-025).
 */

const OBJECTIVES: Array<{ icon: IconName; label: string; color: string }> = [
  { icon: "gear", label: "Enhance Operational Coordination", color: "text-[#16823b]" },
  { icon: "layers", label: "Improve Resource Management", color: "text-[#1f5bc4]" },
  { icon: "shieldCheck", label: "Strengthen Accountability and Compliance", color: "text-[#6a4bd1]" },
  { icon: "bars", label: "Provide Accurate, Up-to-date Management Information", color: "text-[#133f91]" },
  { icon: "users", label: "Support Effective Decision-making", color: "text-[#16823b]" },
];

const VALUES: Array<{ icon: IconName; label: string; bg: string }> = [
  { icon: "scale", label: "Integrity", bg: "bg-gradient-to-b from-[#1a3a7a] to-[#0d2149]" },
  { icon: "users", label: "Service", bg: "bg-gradient-to-b from-[#1f9a4a] to-[#147a36]" },
  { icon: "shieldCheck", label: "Professionalism", bg: "bg-gradient-to-b from-[#2a6be0] to-[#1749b0]" },
  { icon: "handshake", label: "Accountability", bg: "bg-gradient-to-b from-[#7c5ce0] to-[#5a3fc0]" },
  { icon: "starShield", label: "Security", bg: "bg-gradient-to-b from-[#1f9a4a] to-[#147a36]" },
];

function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-[28px] font-extrabold tracking-tight text-[#0d1b3e] md:text-[34px]">
      <span className="h-8 w-[5px] rounded-full bg-zp-green md:h-9" aria-hidden />
      {children}
    </h2>
  );
}

function StatementCard({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-[#e3e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7fc_100%)] p-6 shadow-[0_6px_22px_rgba(13,33,73,0.08)] md:p-7">
      <h3 className="flex items-center gap-3 text-[24px] font-extrabold tracking-tight text-[#0d1b3e] md:text-[28px]">
        <Icon name={icon} className="h-9 w-9 shrink-0 text-zp-green" />
        {title}
      </h3>
      <p className="mt-3 text-[15.5px] leading-relaxed text-[#1f2d45] md:text-[16px]">{children}</p>
    </article>
  );
}

export default function About() {
  return (
    <div className="print-a4">
      <PhotoHero labelledBy="about-title" compact>
        <HeroEyebrow>About ZPS-OMS</HeroEyebrow>
        <h1
          id="about-title"
          className="mt-4 text-[48px] font-extrabold leading-[1] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[68px] lg:text-[60px] xl:text-[72px]"
        >
          About the
          <br />
          Platform
        </h1>
        <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-slate-100 md:text-[18px]">
          A dedicated digital operations platform for the Zambia Police Service to enhance coordination, resource management and operational effectiveness nationwide.
        </p>
      </PhotoHero>

      <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_30%,#ffffff_100%)]">
        {/* Purpose, Mission, Vision */}
        <section className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-10 pt-14 md:pt-16 lg:grid-cols-2 lg:gap-10" aria-labelledby="purpose">
          <div className="flex flex-col gap-6">
            <div>
              <SectionHeading id="purpose">Our Purpose</SectionHeading>
              <p className="mt-4 pl-[17px] text-[16px] leading-relaxed text-[#1f2d45] md:text-[17px]">
                The Zambia Police Service Operations Management System (ZPS-OMS) is a secure, integrated platform designed to support the{" "}
                <strong className="font-bold text-[#0d1b3e]">Deputy Inspector General of Police - Operations</strong> (DIG Operations) in planning, coordinating, monitoring and managing police
                operations, resources and assets across all Provincial Divisions and Divisional Units.
              </p>
            </div>
            <figure className="overflow-hidden rounded-2xl shadow-[0_10px_28px_rgba(13,33,73,0.16)] ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/hq-building.webp" alt="Zambia Police Service Headquarters" width={1000} height={400} loading="lazy" className="aspect-[5/2] w-full object-cover" />
            </figure>
          </div>
          <div className="flex flex-col gap-6 lg:pt-6">
            <StatementCard icon="target" title="Our Mission">
              To provide a reliable and secure digital platform that strengthens operational coordination, resource optimisation and accountability in support of the Zambia Police
              Service mandate.
            </StatementCard>
            <StatementCard icon="eye" title="Our Vision">
              A modern, data-driven and highly coordinated police operations environment for a safer and more secure Zambia.
            </StatementCard>
          </div>
        </section>

        {/* Objectives */}
        <section className="mx-auto max-w-[1180px] px-4 py-8" aria-labelledby="objectives">
          <SectionHeading id="objectives">Our Objectives</SectionHeading>
          <ul className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_6px_22px_rgba(13,33,73,0.08)] sm:grid-cols-3 lg:grid-cols-5">
            {OBJECTIVES.map((o, i) => (
              <li
                key={o.label}
                className={`flex flex-col items-center gap-3 px-4 py-7 text-center ${i > 0 ? "lg:border-l lg:border-[#e3e9f2]" : ""} ${i === OBJECTIVES.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <Icon name={o.icon} className={`h-12 w-12 ${o.color}`} />
                <span className="max-w-[180px] text-[16px] font-bold leading-snug text-[#0d1b3e] md:text-[17px]">{o.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Core values */}
        <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-8" aria-labelledby="values">
          <SectionHeading id="values">Our Core Values</SectionHeading>
          <ul className="mt-6 flex flex-wrap justify-center gap-3 rounded-2xl border border-[#e3e9f2] bg-white p-4 shadow-[0_6px_22px_rgba(13,33,73,0.08)] md:p-5 lg:flex-nowrap lg:justify-between">
            {VALUES.map((v) => (
              <li
                key={v.label}
                className={`flex min-w-[150px] flex-1 items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-[17px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(13,33,73,0.6)] md:text-[18px] ${v.bg}`}
              >
                <Icon name={v.icon} className="h-7 w-7 shrink-0" />
                {v.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
