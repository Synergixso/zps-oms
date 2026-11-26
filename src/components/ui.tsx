import Link from "next/link";
import type { ReactNode } from "react";

export function Crest({ className = "h-10 w-[69px]" }: { className?: string }) {
  // Exact supplied crest asset (339×197 PNG). Never altered; object-fit: contain.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/zambia-police-service-crest.png" alt="Zambia Police Service crest" width={339} height={197} className={`crest ${className}`} />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zp-green">{eyebrow}</p>}
        <h1 className="text-[22px] font-bold leading-tight text-ink md:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading used for the working panels below the dashboard overview (the page title lives in the overview). */
export function SectionHeader({ title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zp-green">Workspace details</p>
        <h2 className="text-[18px] font-bold leading-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className = "", bodyClass = "p-4" }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`min-w-0 rounded-[9px] border border-line bg-surface shadow-[0_1px_2px_rgba(20,40,63,0.05)] ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href, tone = "default" }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "default" | "warn" | "err" | "ok" }) {
  const toneCls = { default: "text-ink", warn: "text-warn", err: "text-err", ok: "text-ok" }[tone];
  const inner = (
    <>
      <p className="text-xs font-semibold text-ink-2">{label}</p>
      <p className={`mt-2 text-[28px] font-bold leading-none tabular-nums ${toneCls}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-[9px] border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(20,40,63,0.05)]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-zp-green`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

const BADGE: Record<string, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  err: "bg-err-bg text-err",
  info: "bg-info-bg text-info",
  neutral: "bg-slate-100 text-slate-700",
};

export function toneFor(status: string): keyof typeof BADGE {
  if (["APPROVED", "COMPLETED", "CLOSED", "IN_SERVICE", "ACTIVE", "IN_STORE", "APPLIED", "SUCCESS", "RETAIN", "NEW", "GOOD", "COMPLETED_REVIEW"].includes(status)) return "ok";
  if (["SUBMITTED", "UNDER_REVIEW", "VALIDATED", "REQUESTED", "COMPLETION_SUBMITTED", "IN_TRANSFER", "OPEN", "FAIR", "AWAITING_DISPOSAL", "PENDING", "SUSPENDED"].includes(status)) return "warn";
  if (["REJECTED", "DENIED", "FAILURE", "UNSERVICEABLE", "POOR", "DEACTIVATED", "REVOKE", "OVERDUE"].includes(status)) return "err";
  if (["IN_PROGRESS", "ASSIGNED", "ISSUED", "UNDER_REPAIR", "UNDER_MAINTENANCE", "RETURNED"].includes(status)) return "info";
  return "neutral";
}

export function Badge({ status, label }: { status: string; label?: string }) {
  const tone = toneFor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function Table({ head, children, empty, caption }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode; caption?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    // Wide registers scroll inside their card: the region is focusable and named so keyboard users can scroll it.
    <div className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-zp-blue/40" {...(head.length > 3 ? { tabIndex: 0, role: "region", "aria-label": caption ?? "Table (scrolls sideways)" } : {})}>
      {/* Narrow tables wrap on phones; wide registers scroll inside their card. */}
      <table className={`w-full border-collapse text-left text-[13px] ${head.length <= 3 ? "" : head.length === 4 ? "min-w-[520px]" : "min-w-[640px]"}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-slate-50/70">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {!hasRows && <div className="px-4 py-8 text-center text-sm text-muted">{empty ?? "No records match the current filters."}</div>}
    </div>
  );
}

export const td = "px-3 py-2.5 align-top";

export function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? btnPrimary : btnSecondary}>
      {children}
    </Link>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-zp-green px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zp-green-dark disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-md border border-line-2 bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-md border border-err/30 bg-white px-3.5 py-2 text-sm font-semibold text-err hover:bg-err-bg disabled:opacity-60";

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "err" | "ok"; title?: string; children: ReactNode }) {
  const cls = { info: "border-info/25 bg-info-bg", warn: "border-warn/30 bg-warn-bg", err: "border-err/30 bg-err-bg", ok: "border-ok/30 bg-ok-bg" }[tone];
  return (
    <div role={tone === "err" ? "alert" : "note"} className={`rounded-md border px-4 py-3 text-sm ${cls}`}>
      {title && <p className="font-semibold text-ink">{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function AccessDenied({ what }: { what?: string }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-err">Access restricted</p>
      <h1 className="mt-2 text-xl font-bold">You are not authorised to view {what ?? "this page"}</h1>
      <p className="mt-2 text-sm text-muted">
        Access in ZPS-OMS is determined by your approved role, organisational scope and delegations. This attempt has been recorded in the audit log. Contact your
        access administrator if you believe you require access.
      </p>
      <Link href="/app" className={`${btnSecondary} mt-6`}>
        Return to my dashboard
      </Link>
    </div>
  );
}

export function DL({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold text-muted">{k}</dt>
          <dd className="mt-0.5 text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export const fmtDate = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T00:00:00Z" : s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lusaka" }) : "—");
export const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" }) : "—";

export function Timeline({ items }: { items: Array<{ key: string; title: ReactNode; meta: ReactNode; body?: ReactNode }> }) {
  if (!items.length) return <p className="text-sm text-muted">No history recorded.</p>;
  return (
    <ol className="relative ml-2 border-l border-line-2">
      {items.map((i) => (
        <li key={i.key} className="mb-4 ml-4">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-zp-blue" aria-hidden />
          <p className="text-sm font-semibold text-ink">{i.title}</p>
          <p className="text-xs text-muted">{i.meta}</p>
          {i.body && <p className="mt-1 text-sm text-ink-2">{i.body}</p>}
        </li>
      ))}
    </ol>
  );
}

export function Bar({ label, value, max, tone = "green" }: { label: string; value: number; max: number; tone?: "green" | "blue" | "amber" | "grey" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const col = { green: "bg-zp-green", blue: "bg-zp-blue", amber: "bg-[#c98a2b]", grey: "bg-slate-400" }[tone];
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100" role="presentation">
        <div className={`h-1.5 rounded-full ${col}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
