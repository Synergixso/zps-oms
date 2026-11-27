import Link from "next/link";

/**
 * Register pagination (server component): "Showing x–y of N" and previous / next links that keep the current
 * filters. Page numbers are clamped on the server (src/server/domain/paging.ts).
 */
export function Pager({ path, params, page, pages, total, pageSize, label = "Register pages" }: {
  path: string; params: Record<string, string | undefined>; page: number; pages: number; total: number; pageSize: number; label?: string;
}) {
  if (total === 0) return null;
  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return `${path}${s ? `?${s}` : ""}`;
  };
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const link = "font-semibold text-zp-blue hover:underline";
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs">
      <p className="text-muted">Showing {first}–{last} of {total}</p>
      {pages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? <Link href={href(page - 1)} className={link} rel="prev">← Previous</Link> : <span className="text-muted">← Previous</span>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className={link} rel="next">Next →</Link> : <span className="text-muted">Next →</span>}
        </div>
      )}
    </nav>
  );
}
