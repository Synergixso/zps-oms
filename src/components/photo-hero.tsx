import type { ReactNode } from "react";

/** Approved hero photography (public/hero/*.webp), slowly cross-faded; reduced motion shows the first image only. */
export function HeroImages({ className = "", position = "100% 100%" }: { className?: string; position?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/hero-01.webp"
        alt=""
        width={1774}
        height={887}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/hero-02.webp"
        alt=""
        width={1774}
        height={887}
        loading="lazy"
        className="hero-fade absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
    </div>
  );
}

/**
 * The approved photographic hero shared by the public pages.
 * ≥1024 px: photograph anchored right and blended into the navy text panel.
 * <1024 px: text on navy with the photograph beneath, so faces are never covered.
 */
export function PhotoHero({ labelledBy, children, compact = false }: { labelledBy: string; children: ReactNode; compact?: boolean }) {
  const height = compact ? "lg:min-h-[520px] xl:min-h-[min(36vw,620px)]" : "lg:min-h-[600px] xl:min-h-[min(42vw,720px)]";
  return (
    <section className="relative isolate overflow-hidden bg-[#0d2149] text-white" aria-labelledby={labelledBy}>
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block xl:w-[78%]" aria-hidden>
        <HeroImages className="h-full w-full" />
        <div className="absolute inset-0 -left-px bg-[linear-gradient(90deg,#0d2149_0%,#0d2149_3%,rgba(13,33,73,0.9)_11%,rgba(13,33,73,0.4)_25%,rgba(13,33,73,0)_38%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d2149]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 h-[30%] w-[42%] bg-gradient-to-t from-[#0d2149] via-[#0d2149]/70 to-transparent [mask-image:linear-gradient(90deg,#000_45%,transparent)]" />
      </div>
      <div className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-[#1f5bc4]/25 blur-3xl" aria-hidden />

      <div className={`mx-auto max-w-[1280px] px-5 pb-10 pt-12 sm:px-8 md:pt-16 lg:flex lg:items-center lg:pb-28 lg:pt-10 ${height}`}>
        <div className="max-w-[560px] lg:max-w-[430px] xl:max-w-[540px]">{children}</div>
      </div>

      <div className="relative -mt-6 lg:hidden" aria-hidden>
        <HeroImages className="aspect-[4/3] w-full sm:aspect-[2/1]" position="68% 100%" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d2149] to-transparent" />
      </div>
    </section>
  );
}

export function HeroEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[12.5px] font-bold uppercase tracking-[0.2em] text-white">
      <span className="h-[3px] w-10 rounded-full bg-zp-green" aria-hidden />
      {children}
    </p>
  );
}
