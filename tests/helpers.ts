import type { Pool, PoolConnection } from "mysql2/promise";
import { afterAll } from "vitest";
import { createPool, withRollback, type DB } from "@/server/db/connection";
import { loadActor, type Actor } from "@/server/domain/policy";
import { testDatabaseUrl } from "./env";

let pool: Pool | undefined;
afterAll(async () => {
  await pool?.end();
  pool = undefined;
});

/** Runs a test body against the seeded test database inside a transaction that is always rolled back. */
export function withDb<T>(fn: (db: PoolConnection) => Promise<T>): Promise<T> {
  pool ??= createPool(testDatabaseUrl());
  return withRollback(pool, fn);
}

export async function actor(db: DB, id: string): Promise<Actor> {
  const a = await loadActor(db, id);
  if (!a) throw new Error(`actor ${id} not active`);
  return a;
}
