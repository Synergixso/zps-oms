import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";
import { HeroEyebrow, PhotoHero } from "@/components/photo-hero";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact" };

/*
 * Contact page — implemented to the owner-approved A4 portrait design,
 * using the approved landing-page hero (DEC-025). Contact details are the
 * owner-approved values from the design.
 */

const CHANNELS: Array<{ icon: IconName; tile: string; label: string; lines: Array<{ text: string; href: string }> }> = [
  {
    icon: "phone",
    tile: "bg-gradient-to-br from-[#22a650] to-[#137634]",
    label: "Phone (Operations Desk)",
    lines: [
      { text: "+260 972 194 188", href: "tel:+260972194188" },
      { text: "+260 953 489 727", href: "tel:+260953489727" },
    ],
  },
  {
    icon: "mail",
    tile: "bg-gradient-to-br from-[#2a6be0] to-[#1544a8]",
    label: "Email",
    lines: [{ text: "zps-oms@zambiapolice.org.zm", href: "mailto:zps-oms@zambiapolice.org.zm" }],
  },
  {
    icon: "headset",
    tile: "bg-gradient-to-br from-[#8360e6] to-[#5a3cc0]",
    label: "Technical Support",
    lines: [{ text: "support@zambiapolice.org.zm", href: "mailto:support@zambiapolice.org.zm" }],
  },
  {
    icon: "globe",
    tile: "bg-gradient-to-br from-[#1f4590] to-[#0d2149]",
    label: "Website",
    lines: [{ text: "https://zps-oms.zambiapolice.org.zm", href: "https://zps-oms.zambiapolice.org.zm" }],
  },
];

const QUICK: Array<{ icon: IconName; title: string; sub: string; subject: string }> = [
  { icon: "headset", title: "Enquiries", sub: "General information", subject: "ENQUIRY" },
  { icon: "tools", title: "Support", sub: "Technical assistance", subject: "SUPPORT" },
  { icon: "userPlus", title: "Access", sub: "User accounts & roles", subject: "ACCESS" },
  { icon: "layers", title: "Feedback", sub: "Suggestions & improvements", subject: "FEEDBACK" },
];

function Heading({ id, children, rule = false }: { id: string; children: ReactNode; rule?: boolean }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-[27px] font-extrabold tracking-tight text-[#0d1b3e] md:text-[32px]">
      <span className="h-8 w-[5px] shrink-0 rounded-full bg-zp-green" aria-hidden />
      {children}
      {rule && <span className="ml-2 hidden h-[3px] flex-1 rounded-full bg-zp-green sm:block" aria-hidden />}
    </h2>
  );
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const defaultSubject = QUICK.some((q) => q.subject === subject) ? subject : undefined;

  return (
    <div className="print-a4">
      <PhotoHero labelledBy="contact-title" compact>
        <HeroEyebrow>Get in Touch</HeroEyebrow>
        <h1
          id="contact-title"
          className="mt-4 text-[48px] font-extrabold leading-[1] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.25)] md:text-[68px] lg:text-[60px] xl:text-[72px]"
        >
          Contact
          <br />
          ZPS-OMS
        </h1>
        <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-slate-100 md:text-[18px]">
          We are here to support the Zambia Police Service with enquiries, technical support, system access and general information about the ZPS-OMS platform.
        </p>
      </PhotoHero>

      <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_35%,#ffffff_100%)]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 pb-10 pt-14 md:pt-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
          {/* Left column */}
          <div className="flex flex-col gap-8">
            <section aria-labelledby="contact-info">
              <Heading id="contact-info">Contact Information</Heading>
              <p className="mt-2 pl-[17px] text-[16px] text-[#1f2d45]">Reach out to the ZPS-OMS team through any of the official channels below.</p>
              <ul className="mt-5 space-y-4">
                {CHANNELS.map((c) => (
                  <li key={c.label} className="flex items-center gap-4 rounded-2xl border border-[#e3e9f2] bg-white p-4 shadow-[0_4px_16px_rgba(13,33,73,0.07)]">
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-6px_rgba(13,33,73,0.5)] ${c.tile}`}>
                      <Icon name={c.icon} className="h-7 w-7" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[17px] font-extrabold text-[#0d1b3e]">{c.label}</p>
                      <p className="break-words text-[16px] text-[#1f2d45]">
                        {c.lines.map((l, i) => (
                          <span key={l.href}>
                            {i > 0 && <span className="text-[#7a8aa0]"> / </span>}
                            <a
                              href={l.href}
                              className="hover:text-zp-blue hover:underline"
                              {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            >
                              {l.text}
                            </a>
                          </span>
                        ))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="our-office">
              <Heading id="our-office" rule>
                Our Office
              </Heading>
              <address className="mt-4 flex items-start gap-4 not-italic">
                <Icon name="pin" className="mt-1 h-9 w-9 shrink-0 text-zp-green" />
                <p className="text-[16px] leading-relaxed text-[#1f2d45]">
                  <strong className="text-[17px] font-extrabold text-[#0d1b3e]">Technical Services Section</strong>
                  <br />
                  Kamfinsa Mobile Unit Division Headquarters
                  <br />
                  Box 21691
                  <br />
                  Kamfinsa, Kitwe, 10101
                  <br />
                  ZAMBIA
                </p>
              </address>
              <figure className="mt-5 overflow-hidden rounded-2xl shadow-[0_10px_28px_rgba(13,33,73,0.16)] ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/hq-building.webp" alt="Zambia Police Service Headquarters" width={1000} height={400} loading="lazy" className="aspect-[5/2] w-full object-cover" />
              </figure>
            </section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <section
              id="contact-form"
              aria-labelledby="send-message"
              className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#e3e9f2] bg-white shadow-[0_8px_26px_rgba(13,33,73,0.10)]"
            >
              <h2 id="send-message" className="flex items-center gap-3 bg-gradient-to-r from-[#0d2149] to-[#133f91] px-6 py-4 text-[24px] font-extrabold text-white md:text-[28px]">
                <Icon name="send" className="h-8 w-8" />
                Send Us a Message
              </h2>
              <div className="p-6">
                <p id="contact-intro" className="mb-5 text-[15.5px] text-[#1f2d45]">
                  Use the form below to send us your enquiry, request or feedback about the ZPS-OMS platform.
                </p>
                <ContactForm key={defaultSubject ?? "none"} defaultSubject={defaultSubject} />
              </div>
            </section>

            <aside className="rounded-2xl border border-[#d3def2] bg-[#eef4fc] p-6 shadow-[0_4px_16px_rgba(13,33,73,0.06)]">
              <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#0d1b3e]">
                <Icon name="info" className="h-8 w-8 text-[#0d1b3e]" />
                For Faster Assistance
              </h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[#1f2d45]">
                Please include relevant details such as your Division/Unit, user role (if applicable), and a clear description of your enquiry.
              </p>
            </aside>
          </div>
        </div>

        {/* Quick links */}
        <nav aria-label="Message topics" className="mx-auto max-w-[1200px] px-4 pb-16">
          <ul className="grid grid-cols-1 overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#0d2149_0%,#133f91_100%)] text-white shadow-[0_8px_26px_rgba(13,33,73,0.18)] sm:grid-cols-2 lg:grid-cols-4">
            {QUICK.map((q, i) => (
              <li key={q.subject} className={i > 0 ? "border-t border-white/15 sm:border-t-0 lg:border-l lg:border-white/25" : ""}>
                <Link href={`/contact?subject=${q.subject}#contact-form`} scroll={false} className="flex items-center gap-4 px-6 py-5 transition hover:bg-white/10">
                  <Icon name={q.icon} className="h-10 w-10 shrink-0" />
                  <span>
                    <span className="block text-[18px] font-bold">{q.title}</span>
                    <span className="block text-[13.5px] text-white/85">{q.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
