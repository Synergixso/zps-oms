"use client";

import "./global-error.css";

/** Last-resort error page if the root layout itself fails. Plain HTML only; no internals are shown. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body className="zp-global-error">
        <h1>ZPS-OMS is temporarily unavailable</h1>
        <p>Please try again. If the problem continues, contact your system administrator{error.digest ? ` with reference ${error.digest}` : ""}.</p>
        <button type="button" onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
