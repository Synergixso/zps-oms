"use client";
/** Two-step controlled import form (issue #8): validate a CSV file, review every row, then import all or nothing. */
import { useActionState } from "react";
import { importAction, type ImportState } from "@/server/actions/data-import";

const cell = "border-b border-line px-3 py-2 align-top text-sm";

export function ImportForm({ kind, columns }: { kind: "PERSONNEL" | "ESTABLISHMENT"; columns: readonly string[] }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importAction, null);
  const p = state?.preview;
  const ready = p && !p.fileErrors.length && p.invalid === 0 && p.valid > 0;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="step" value="PREVIEW" />
        <div>
          <label htmlFor={`file-${kind}`} className="block text-sm font-semibold text-ink">CSV file (UTF-8, at most 500 rows)</label>
          <p className="text-xs text-ink-2">Columns: <code>{columns.join(", ")}</code></p>
          <input id={`file-${kind}`} name="file" type="file" accept=".csv,text/csv" required className="mt-1 block text-sm" />
        </div>
        <button type="submit" disabled={pending} className="rounded-md border border-line-2 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-60">
          {pending ? "Checking…" : "Validate file"}
        </button>
      </form>
      {state?.error && <p role="alert" className="rounded-md border border-err/30 bg-err-bg px-4 py-3 text-sm">{state.error}</p>}
      {state?.done && <p role="status" className="rounded-md border border-ok/30 bg-ok-bg px-4 py-3 text-sm">{state.done}</p>}
      {p && (
        <div className="space-y-3">
          <p role="status" className="text-sm">
            <strong>{p.valid}</strong> valid row(s), <strong>{p.invalid}</strong> with errors. File fingerprint <code className="text-xs">{p.fingerprint.slice(0, 16)}…</code>
          </p>
          {p.fileErrors.map((e) => <p key={e} role="alert" className="rounded-md border border-err/30 bg-err-bg px-4 py-2 text-sm">{e}</p>)}
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full border-collapse">
              <caption className="sr-only">Validation result for each row</caption>
              <thead><tr className="bg-slate-50 text-left text-xs uppercase text-muted"><th className={cell}>Line</th><th className={cell}>Row</th><th className={cell}>Result</th></tr></thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.line}>
                    <td className={`${cell} text-muted`}>{r.line}</td>
                    <td className={cell}>{r.summary}</td>
                    <td className={cell}>{r.ok ? <span className="font-semibold text-ok">Valid</span> : <span className="font-semibold text-err">Error</span>}
                      {[...r.errors, ...r.warnings].map((m) => <span key={m} className="block text-xs text-ink-2">{m}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ready && (
            <form action={action}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="step" value="COMMIT" />
              <input type="hidden" name="csv" value={state?.csv ?? ""} />
              <button type="submit" disabled={pending} className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark disabled:opacity-60">
                {kind === "PERSONNEL" ? `Import ${p.valid} record(s)` : `Propose ${p.valid} unit(s) for approval`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
