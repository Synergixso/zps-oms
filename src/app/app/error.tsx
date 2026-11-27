"use client";

import Link from "next/link";

/**
 * Back-office error boundary. Shows a plain message and the error reference only: no internals, stack traces or
 * data reach the browser (the server logs the error; see the platform error log).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The digest links this view to the server-side log entry; nothing else is reported from the browser.
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-[9px] border border-err/30 bg-err-bg p-6 text-sm text-ink">
      <h1 className="text-base font-bold text-err">This page could not be displayed</h1>
      <p className="mt-2">Something went wrong while preparing this page. Nothing you entered has been lost from records already saved. Try again; if the problem continues, report it to your system administrator with the reference below.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-2">Reference: {error.digest}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-md bg-zp-green px-4 py-2 font-semibold text-white hover:bg-zp-green-dark">Try again</button>
        <Link href="/app" className="rounded-md border border-line-2 px-4 py-2 font-semibold text-ink hover:bg-white">Go to the dashboard</Link>
      </div>
    </div>
  );
}
