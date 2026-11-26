"use client";

/** Opens the browser print dialog (print or "Save as PDF"). */
export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-md bg-zp-green px-3.5 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">
      {label}
    </button>
  );
}
