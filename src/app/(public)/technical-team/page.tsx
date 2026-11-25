import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { HeroEyebrow, PhotoHero } from "@/components/photo-hero";

export const metadata = { title: "Technical Team" };

/*
 * Technical Team page — implemented to the owner-approved A4 portrait design,
 * using the approved landing-page hero (DEC-025).
 */

type Tone = "green" | "blue" | "purple";

const TILE: Record<Tone, string> = {
  green: "bg-gradient-to-br from-[#22a650] to-[#137634]",
  blue: "bg-gradient-to-br from-[#2a6be0] to-[#1544a8]",
  purple: "bg-gradient-to-br from-[#8360e6] to-[#5a3cc0]",
};
const ACCENT: Record<Tone, string> = {
  green: "border-l-[#16823b]",
  blue: "border-l-[#1f5bc4]",
  purple: "border-l-[#6a4bd1]",
};

function SectionTitle({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-5">
        <span className="hidden h-[3px] w-20 shrink-0 rounded-full bg-zp-green sm:block" aria-hidden />
        <h2 id={id} className="text-[27px] font-extrabold leading-tight tracking-tight text-[#0d1b3e] md:text-[36px]">
          {title}
        </h2>
        <span className="hidden h-[3px] w-20 shrink-0 rounded-full bg-zp-green sm:block" aria-hidden />
      </div>
      {children && <p className="mx-auto mt-2 max-w-4xl text-[16px] leading-relaxed text-[#1f2d45] md:text-[17px]">{children}</p>}
    </div>
  );
}

function ServiceCard({ icon, title, body, tone, href, large = false }: { icon: IconName; title: string; body: string; tone: Tone; href: string; large?: boolean }) {
  return (
    <a
      href={href}
      className={`group flex h-full items-start gap-4 rounded-2xl border border-l-4 border-[#e3e9f2] bg-white p-5 shadow-[0_4px_16px_rgba(13,33,73,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(13,33,73,0.13)] ${ACCENT[tone]}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_18px_-6px_rgba(13,33,73,0.5)] ${TILE[tone]} ${large ? "h-[84px] w-[84px]" : "h-[68px] w-[68px]"}`}
      >
        <Icon name={icon} className={large ? "h-11 w-11" : "h-9 w-9"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={`font-extrabold leading-tight tracking-tight text-[#0d1b3e] ${large ? "text-[22px]" : "text-[19px]"}`}>{title}</span>
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c9d3e1] text-[#0d1b3e] transition group-hover:border-zp-green group-hover:bg-zp-green group-hover:text-white">
            <Icon name="chevron" className="h-4 w-4" />
          </span>
        </span>
        <span className={`mt-1.5 block leading-snug text-[#1f2d45] ${large ? "text-[15.5px]" : "text-[14.5px]"}`}>{body}</span>
      </span>
    </a>
  );
}

export default function TechnicalTeam() {
  return (
    <div className="print-a4">
      <PhotoHero labelledBy="tech-title" compact>
        <HeroEyebrow>Technical Support &amp; Services</HeroEyebrow>
        <h1
          id="tech-title"
          className="mt-4 text-[48px] font-extrabold leading-[1] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[68px] lg:text-[60px] xl:text-[72px]"
        >
          Technical
          <br />
          Team
        </h1>
        <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-slate-100 md:text-[18px]">
          Supporting the technical and administrative services that help the Kamfinsa Mobile Unit maintain its facilities, equipment, vehicles and information technology.
        </p>
      </PhotoHero>

      <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_35%,#ffffff_100%)]">
        {/* Technical Services at Kamfinsa */}
        <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-14 md:pt-16" aria-labelledby="kamfinsa-services">
          <SectionTitle id="kamfinsa-services" title="Technical Services at Kamfinsa">
            Provision of essential technical and administrative services to support the operations and institutional readiness of the Kamfinsa Mobile Unit.
          </SectionTitle>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <ServiceCard
              large
              icon="tools"
              tone="green"
              href="#kamfinsa-structure"
              title="Engineering & Mechanical Services"
              body="The Kamfinsa unit maintains plant, mechanical equipment and motor vehicles to help prolong serviceability and lifespan."
            />
            <ServiceCard
              large
              icon="monitorNet"
              tone="blue"
              href="#kamfinsa-structure"
              title="Information Technology & Communications"
              body="The Kamfinsa unit provides and manages information and communication technology (ICT) for the entire Kamfinsa Mobile Unit Division."
            />
          </div>
        </section>

        {/* ZPS Technical Services Directorate */}
        <section className="mx-auto max-w-[1200px] px-4 py-10" aria-labelledby="directorate">
          <SectionTitle id="directorate" title="Zambia Police Service Technical Services Directorate">
            The Technical Services Directorate&apos;s published Service-wide mandate covers the rehabilitation and maintenance of motor vehicles and mechanical equipment, and
            oversight of information and communication technology (ICT) systems across the Zambia Police Service.
          </SectionTitle>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ServiceCard
              icon="car"
              tone="green"
              href="#directorate-structure"
              title="Mechanical Engineering Services"
              body="Vehicle and mechanical-equipment maintenance planning, engineering reports, workshop standards and maintenance records."
            />
            <ServiceCard
              icon="laptop"
              tone="blue"
              href="#directorate-structure"
              title="Information Technology & Communication"
              body="IT services, networks, devices, communications systems, software and end-user helpdesk."
            />
            <ServiceCard
              icon="users"
              tone="purple"
              href="#directorate-structure"
              title="Administration & Human Resource"
              body="The official Directorate structure includes this unit."
            />
          </div>
        </section>

        {/* How the technical functions are organised */}
        <section className="mx-auto max-w-[1200px] px-4 py-8" aria-labelledby="organised">
          <SectionTitle id="organised" title="How the technical functions are organised" />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article id="kamfinsa-structure" className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#cfe6d6] bg-[#f1f9f3] shadow-[0_6px_20px_rgba(13,33,73,0.07)]">
              <h3 className="flex items-center gap-3 bg-gradient-to-r from-[#1f9a4a] to-[#147a36] px-6 py-4 text-[20px] font-extrabold text-white md:text-[22px]">
                <Icon name="bank" className="h-8 w-8" />
                Kamfinsa Mobile Unit
              </h3>
              <div className="px-6 py-5">
                <p className="text-[16px] font-bold text-[#0d1b3e]">Local Administration structure, which lists:</p>
                <ul className="mt-3 space-y-3">
                  {["Engineering & Mechanical Services (MTU)", "Information Technology & Communications (Technical Services Section and Signals Sections)"].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[16px] text-[#1f2d45]">
                      <Icon name="checkCircle" className="mt-0.5 h-6 w-6 shrink-0 text-[#16823b]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
            <article id="directorate-structure" className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#d3def2] bg-[#f1f5fc] shadow-[0_6px_20px_rgba(13,33,73,0.07)]">
              <h3 className="flex items-center gap-3 bg-gradient-to-r from-[#0d2149] to-[#133f91] px-6 py-4 text-[20px] font-extrabold text-white md:text-[22px]">
                <Icon name="bank" className="h-8 w-8" />
                ZPS Technical Services Directorate
              </h3>
              <div className="px-6 py-5">
                <p className="text-[16px] font-bold text-[#0d1b3e]">Service-wide Directorate comprising:</p>
                <ul className="mt-3 space-y-3">
                  {["Mechanical Engineering Services Section", "Information Technology Communication Section", "Administration & Human Resource Unit"].map((t) => (
                    <li key={t} className="flex items-center gap-3 text-[16px] text-[#1f2d45]">
                      <Icon name="checkCircle" className="h-6 w-6 shrink-0 text-[#1f5bc4]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        {/* Published Leadership Positions */}
        <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-6" aria-labelledby="leadership">
          <div className="overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]">
            <h2 id="leadership" className="flex items-center gap-3 bg-gradient-to-r from-[#0d2149] to-[#133f91] px-6 py-4 text-[22px] font-extrabold text-white md:text-[26px]">
              <Icon name="users" className="h-8 w-8" />
              Published Leadership Positions
            </h2>
            <div className="grid gap-5 p-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#e3e9f2] md:p-6">
              <div className="md:pr-6">
                <p className="rounded-lg bg-[#e6f4ea] px-4 py-2 text-center text-[16px] font-bold text-[#0d1b3e]">Kamfinsa Mobile Unit (Technical Services)</p>
                <ul className="mt-4 space-y-3 px-2">
                  {[
                    ["Deputy Officer-in-Charge", "Tech"],
                    ["Officer-in-Charge", "Engineering and Mechanical Services"],
                    ["Officer-in-Charge", "Information and Communications"],
                  ].map(([role, area]) => (
                    <li key={`${role}-${area}`} className="flex items-center gap-3 text-[15.5px] text-[#1f2d45]">
                      <Icon name="userCircle" className="h-7 w-7 shrink-0 text-[#16823b]" />
                      <span>
                        <strong className="font-bold text-[#0d1b3e]">{role}</strong> – {area}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:pl-6">
                <p className="rounded-lg bg-[#e7effc] px-4 py-2 text-center text-[16px] font-bold text-[#0d1b3e]">ZPS Technical Services Directorate</p>
                <div className="mt-4 flex items-start gap-3 px-2">
                  <Icon name="userCircle" className="h-7 w-7 shrink-0 text-[#1f5bc4]" />
                  <p className="text-[15.5px] text-[#1f2d45]">
                    <strong className="font-bold text-[#0d1b3e]">Director – Technical Services</strong>
                    <br />
                    Supported by Deputy Director functions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
