import Link from "next/link";
import { Crest } from "@/components/ui";
import { PublicNav } from "@/components/public-chrome";
import { Wave } from "@/components/public-ui";

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
      <footer className="mt-auto bg-[#0d2149] text-white">
        <Wave fill="#0d2149" className="-mb-px bg-white" />
        <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-4">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <span className="flex h-[78px] w-[124px] shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow">
              <Crest className="h-[62px] w-[107px]" />
            </span>
            <div>
              <p className="text-[18px] font-bold tracking-[0.32em] md:text-[22px]">ZAMBIA POLICE SERVICE</p>
              <p className="mt-1 text-[13px] text-slate-300">ZPS-OMS · Operations · Coordination · Accountability</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 text-[12px] text-slate-300 md:flex-row md:items-center md:justify-between">
            <p>Proposed system under institutional review · Local prototype using synthetic data only · Not an authorised production police system.</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-white">About</Link>
              <Link href="/modules" className="hover:text-white">Modules</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
              <Link href="/login" className="hover:text-white">Login</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
