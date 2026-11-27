/**
 * Server-side pagination for registers (directive §5.1).
 *
 * Registers used to return at most 500 rows with no indication that more existed. `pageQuery` returns one page
 * of an already-scoped, filtered query plus the true total (COUNT over the same query), so nothing is silently
 * cut off. Callers build the query once (select + where + params) and use it for both the page and the count,
 * so the two can never disagree. Page numbers are clamped; page sizes are bounded.
 */
import type { DB } from "../db/connection";
import { all, one } from "../db/connection";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface Paging { page?: number; pageSize?: number }
export interface Page<T> { rows: T[]; total: number; page: number; pages: number; pageSize: number }

/** A filtered query: `columns` (the SELECT list), `from` (FROM … JOIN …), `where` (a boolean SQL expression). */
export interface Query { columns: string; from: string; where: string; params: unknown[]; order: string }

export async function pageQuery<T>(db: DB, q: Query, p: Paging = {}): Promise<Page<T>> {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(5, Math.floor(Number(p.pageSize) || DEFAULT_PAGE_SIZE)));
  const total = await countQuery(db, q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(p.page) || 1)));
  const rows = await all<T>(db, `SELECT ${q.columns} ${q.from} WHERE ${q.where} ORDER BY ${q.order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, ...q.params);
  return { rows, total, page, pages, pageSize };
}

/** The first `limit` rows of a query (for dashboard panels and other short lists). */
export async function firstRows<T>(db: DB, q: Query, limit = 500): Promise<T[]> {
  return all<T>(db, `SELECT ${q.columns} ${q.from} WHERE ${q.where} ORDER BY ${q.order} LIMIT ${Math.max(1, Math.min(1000, limit))}`, ...q.params);
}

/** COUNT over a query, for dashboard figures. */
export async function countQuery(db: DB, q: Pick<Query, "from" | "where" | "params">): Promise<number> {
  return Number((await one<{ n: number }>(db, `SELECT COUNT(*) AS n ${q.from} WHERE ${q.where}`, ...q.params))?.n ?? 0);
}

/**
 * Splits "SELECT <columns> FROM …" at its top-level FROM (FROMs inside brackets, such as correlated subqueries
 * in the column list, are skipped), so an existing select constant can be paged and counted.
 */
export function splitSelect(select: string): Pick<Query, "columns" | "from"> {
  const text = select.trim();
  if (!/^SELECT\s/i.test(text)) throw new Error("splitSelect expects a SELECT statement");
  let depth = 0;
  for (let i = 6; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && /\s/.test(text[i - 1] ?? "") && /^FROM\s/i.test(text.slice(i, i + 5))) {
      return { columns: text.slice(6, i).trim(), from: text.slice(i).trim() };
    }
  }
  throw new Error("splitSelect: no top-level FROM");
}
