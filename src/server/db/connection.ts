import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDatabase } from "./seed";

export type DB = DatabaseSync;

/** Opens (and if needed migrates + seeds) a database. ':memory:' is used by tests. */
export function openDatabase(file: string, opts: { seed?: boolean } = {}): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  db.exec(SCHEMA_SQL);
  const applied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(SCHEMA_VERSION);
  if (!applied) {
    db.prepare("INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)").run(
      SCHEMA_VERSION,
      new Date().toISOString(),
      "001 initial ZPS-OMS schema",
    );
    if (opts.seed !== false) seedDatabase(db);
  }
  return db;
}

const globalForDb = globalThis as unknown as { __zpsDb?: DB };

/** Process-wide database used by the Next.js server. */
export function getDb(): DB {
  if (!globalForDb.__zpsDb) {
    const file = process.env.ZPS_DB_FILE ?? path.join(process.cwd(), "data", "zps-oms-synthetic.db");
    globalForDb.__zpsDb = openDatabase(file);
  }
  return globalForDb.__zpsDb;
}

/** Runs fn inside a transaction; rolls back on any thrown error. */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

type Row = Record<string, unknown>;
export function all<T = Row>(db: DB, sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}
export function one<T = Row>(db: DB, sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as T | undefined;
}
export function run(db: DB, sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...(params as never[]));
}
