import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="zp-band" aria-hidden />
      <main id="main" className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">404</p>
        <h1 className="mt-2 text-2xl font-bold">Record not found or not within your authorised scope</h1>
        <p className="mt-2 text-sm text-ink-2">The page or record does not exist, or your role and organisational scope do not permit access to it.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/app" className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white">My dashboard</Link>
          <Link href="/" className="rounded-md border border-line-2 bg-white px-4 py-2 text-sm font-semibold">Home</Link>
        </div>
      </main>
    </div>
  );
}
