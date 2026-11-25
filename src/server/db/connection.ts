/**
 * MySQL data-access layer (mysql2/promise, XAMPP MariaDB/MySQL).
 *
 * - `getDb()` returns the process-wide pool.
 * - `all` / `one` / `run` run parameterised SQL (client-side escaping; never
 *   interpolate user input into SQL text).
 * - `tx(db, async (db) => …)` runs the callback on a dedicated connection inside
 *   a transaction. The callback parameter deliberately shadows `db`, so every
 *   statement in the body uses the transaction. Nested `tx` calls join the
 *   outer transaction.
 */
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";

export type DB = Pool | PoolConnection;

const TX = Symbol("zps.inTransaction");
type TxConnection = PoolConnection & { [TX]?: boolean };

const POOL_OPTIONS = {
  connectionLimit: 10,
  decimalNumbers: true, // SUM()/AVG() as numbers, not strings
  dateStrings: true,
  timezone: "Z" as const,
  multipleStatements: false,
};

export function createPool(url: string): Pool {
  return mysql.createPool({ uri: url, ...POOL_OPTIONS });
}

const globalForDb = globalThis as unknown as { __zpsPool?: Pool };

/** Process-wide pool for the Next.js server. Requires DATABASE_URL (see .env.example). */
export function getDb(): Pool {
  if (!globalForDb.__zpsPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and start MySQL in XAMPP.");
    globalForDb.__zpsPool = createPool(url);
  }
  return globalForDb.__zpsPool;
}

type Row = Record<string, unknown>;

export async function all<T = Row>(db: DB, sql: string, ...params: unknown[]): Promise<T[]> {
  const [rows] = await db.query(sql, params);
  return rows as T[];
}

export async function one<T = Row>(db: DB, sql: string, ...params: unknown[]): Promise<T | undefined> {
  const rows = await all<T>(db, sql, ...params);
  return rows[0];
}

export async function run(db: DB, sql: string, ...params: unknown[]): Promise<{ changes: number; insertId: number }> {
  const [res] = await db.query(sql, params);
  const h = res as ResultSetHeader;
  return { changes: h.affectedRows, insertId: h.insertId };
}

/** Runs `fn` in a transaction; rolls back on any thrown error. */
export async function tx<T>(db: DB, fn: (db: PoolConnection) => Promise<T>): Promise<T> {
  const maybe = db as TxConnection;
  if (maybe[TX]) return fn(maybe); // join the outer transaction
  const conn = (await (db as Pool).getConnection()) as TxConnection;
  try {
    await conn.beginTransaction();
    conn[TX] = true;
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn[TX] = false;
    conn.release();
  }
}

/** Placeholder list for an IN (...) clause; returns "NULL" for an empty list so the query stays valid and matches nothing. */
export function inList(values: readonly unknown[]): string {
  return values.length ? values.map(() => "?").join(",") : "NULL";
}
