import { openDatabase, type DB } from "@/server/db/connection";
import { loadActor, type Actor } from "@/server/domain/policy";

export function freshDb(): DB {
  return openDatabase(":memory:");
}
export function actor(db: DB, id: string): Actor {
  const a = loadActor(db, id);
  if (!a) throw new Error(`actor ${id} not active`);
  return a;
}
