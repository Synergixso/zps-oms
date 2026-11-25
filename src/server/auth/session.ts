import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { loadActor, type Actor } from "../domain/policy";
import { resolveSession } from "../domain/sessions";
import { applyDueChanges } from "../domain/org";

export const SESSION_COOKIE = "zps_session";

/** Demo sign-in is a synthetic role simulator. It must be replaced by an approved IdP before any non-local use (DEC-005). */
export const DEMO_AUTH_ENABLED = process.env.ZPS_DEMO_AUTH !== "off";

export async function getActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = getDb();
  const userId = resolveSession(db, token);
  if (!userId) return null;
  applyDueChanges(db); // effective-dated org changes become live on their date
  return loadActor(db, userId);
}

export async function requireActor(): Promise<Actor> {
  const a = await getActor();
  if (!a) redirect("/login?reason=signin");
  return a;
}

/** CSRF defence for route handlers (server actions get Next's built-in Origin check). */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new Error("Cross-origin request refused");
}
