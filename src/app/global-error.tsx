"use client";

/** Last-resort error page if the root layout itself fails. Plain HTML only; no internals are shown. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#ffffff", color: "#14283f" }}>
        <h1 style={{ fontSize: "1.25rem" }}>ZPS-OMS is temporarily unavailable</h1>
        <p>Please try again. If the problem continues, contact your system administrator{error.digest ? ` with reference ${error.digest}` : ""}.</p>
        <button type="button" onClick={reset} style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}>Try again</button>
      </body>
    </html>
  );
}
