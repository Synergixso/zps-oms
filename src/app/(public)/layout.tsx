import Link from "next/link";
import { Crest } from "@/components/ui";

const LINKS = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "Features"],
  ["/modules", "Modules"],
  ["/contact", "Contact"],
] as const;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="zp-band" aria-hidden />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="ZPS-OMS home">
            <span className="flex h-12 w-[82px] items-center justify-center rounded-md border border-line bg-white p-1">
              <Crest className="h-10 w-[69px]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold tracking-wide text-ink">ZPS-OMS</span>
              <span className="block text-[11.5px] text-muted">Zambia Police Service · Operations Management System</span>
            </span>
          </Link>
          <nav aria-label="Public" className="flex flex-wrap items-center gap-1 text-[13.5px]">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-2 font-medium text-ink-2 hover:bg-slate-100 hover:text-ink">
                {label}
              </Link>
            ))}
            <Link href="/login" className="ml-1 rounded-md bg-zp-green px-4 py-2 font-semibold text-white hover:bg-zp-green-dark">
              Secure sign-in
            </Link>
          </nav>
        </div>
      </header>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[12px] text-amber-900">
        Proposed system under institutional review · Local prototype using synthetic data only · Not an authorised production police system
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-6 text-[12px] text-muted md:flex-row md:items-center md:justify-between">
          <p>ZPS-OMS · Proposed Zambia Police Service Operations Management System · Business sponsor (proposed): Office of the DIG Operations.</p>
          <p className="flex items-center gap-2">
            Institutional colours
            <span className="inline-flex gap-0.5" aria-label="green, white, blue">
              <span className="h-3 w-3 bg-zp-green" />
              <span className="h-3 w-3 border border-line-2 bg-white" />
              <span className="h-3 w-3 bg-zp-blue" />
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
