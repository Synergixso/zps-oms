import Link from "next/link";
import { Crest } from "@/components/ui";
import { PublicNav } from "@/components/public-chrome";
import { Wave } from "@/components/public-ui";
import { CurrentYear } from "@/components/current-year";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="zp-band" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3 sm:gap-4" aria-label="ZPS-OMS home">
            <Crest className="h-[46px] w-[79px] sm:h-[56px] sm:w-[96px]" />
            <span className="hidden h-12 w-px bg-line-2 sm:block" aria-hidden />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-wide text-[#0d2149] sm:text-[19px]">ZAMBIA POLICE SERVICE</span>
              <span className="block text-[10px] font-semibold tracking-[0.12em] text-ink-2 sm:text-[11.5px]">OPERATIONS MANAGEMENT SYSTEM</span>
              <span className="mt-1 inline-block rounded-full bg-zp-green px-3 py-0.5 text-[11px] font-bold tracking-wider text-white sm:text-[13px]">ZPS-OMS</span>
            </span>
          </Link>
          <PublicNav />
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mt-auto text-white">
        <Wave fill="#0d2149" className="-mb-px bg-white" />
        <div className="bg-[#0d2149]">
          <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-6">
            <div className="flex flex-col items-center justify-center gap-6 text-center md:flex-row md:text-left">
              <Link
                href="/"
                aria-label="ZPS-OMS home"
                className="flex h-[92px] w-[150px] shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
              >
                <Crest className="h-[72px] w-[124px]" />
              </Link>
              <div>
                <p className="text-[20px] font-bold tracking-[0.34em] md:text-[26px]">ZAMBIA POLICE SERVICE</p>
                <p className="mt-2 text-[14px] text-white/90 md:text-[15px]">
                  <span className="font-semibold">ZPS-OMS</span> <span className="mx-2 text-white/50">|</span> Operations <span className="mx-1 text-white/60">•</span> Coordination{" "}
                  <span className="mx-1 text-white/60">•</span> Readiness <span className="mx-1 text-white/60">•</span> Accountability
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/15">
            <p className="mx-auto max-w-[1180px] px-4 py-4 text-center text-[13px] leading-relaxed text-white/80">
              © <CurrentYear /> Zambia Police Service. All rights reserved.
              <span className="mx-2 hidden text-white/40 sm:inline" aria-hidden>
                |
              </span>
              <br className="sm:hidden" />
              Designed and developed by <span className="font-semibold text-white">SPOM Technical Services Section Team</span>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
