import type { ReactNode } from "react";

/**
 * Institutional wave divider: green (top), white (middle), blue (bottom) — the
 * required colour order — curving into the next section's background.
 */
export function Wave({ fill = "var(--color-canvas)", className = "" }: { fill?: string; className?: string }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={`block h-[56px] w-full md:h-[90px] ${className}`} aria-hidden>
      <path d="M0 64 C 360 10, 900 120, 1440 34 L1440 120 L0 120 Z" fill="var(--color-zp-green)" />
      <path d="M0 76 C 360 22, 900 132, 1440 46 L1440 120 L0 120 Z" fill="#ffffff" />
      <path d="M0 86 C 360 32, 900 142, 1440 58 L1440 120 L0 120 Z" fill="var(--color-zp-blue)" />
      <path d="M0 98 C 360 46, 900 152, 1440 72 L1440 120 L0 120 Z" fill={fill} />
    </svg>
  );
}

/** Navy hero used by the secondary public pages. */
export function PublicHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0d2149_0%,#12306b_55%,#133f91_100%)] text-white">
      <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-12 md:pt-16">
        <p className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-[3px] w-8 rounded-full bg-zp-green" aria-hidden />
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-[30px] font-bold leading-tight md:text-[40px]">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-200">{children}</div>}
      </div>
      <Wave fill="#ffffff" />
    </section>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4">
        <span className="hidden h-[3px] w-20 rounded-full bg-zp-green sm:block" aria-hidden />
        <h2 className="text-[26px] font-bold text-[#0d2149] md:text-[32px]">{title}</h2>
        <span className="hidden h-[3px] w-20 rounded-full bg-zp-green sm:block" aria-hidden />
      </div>
      {subtitle && <p className="mx-auto mt-2 max-w-2xl text-[15px] text-ink-2">{subtitle}</p>}
    </div>
  );
}
