import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { hasPermission, loadActor, type Actor } from "../domain/policy";
import { maintenanceMode } from "../domain/platform";
import { resolveSessionContext } from "../domain/sessions";
import { applyDueChanges } from "../domain/org";
import { applyDueAssignmentEvents } from "../domain/assignments";

export const SESSION_COOKIE = "zps_session";

/** Local review aid: list the synthetic accounts on the sign-in page. Off in production unless explicitly enabled. */
export const SHOW_DEMO_ACCOUNTS = process.env.ZPS_SHOW_DEMO_ACCOUNTS === "1" || (process.env.NODE_ENV !== "production" && process.env.ZPS_SHOW_DEMO_ACCOUNTS !== "0");

export async function getActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = getDb();
  const ctx = await resolveSessionContext(db, token);
  if (!ctx) return null;
  await applyDueChanges(db); // effective-dated org changes become live on their date
  await applyDueAssignmentEvents(db); // commencements and review-due flags
  // The selected context is re-validated on every request; with none selected the primary assignment applies.
  return await loadActor(db, ctx.userId, ctx.activeAssignmentId ?? "PRIMARY");
}

export async function requireActor(): Promise<Actor> {
  const a = await getActor();
  if (!a) redirect("/login?reason=signin");
  if (a.mustChangePassword && (await headers()).get("x-zps-path") !== "/app/profile") redirect("/app/profile?reason=change-password");
  // Maintenance mode: only platform administrators keep access to the back office.
  if (!hasPermission(a, "platform.view") && (await maintenanceMode(getDb()))) redirect("/maintenance");
  return a;
}

/** CSRF defence for route handlers (server actions get Next's built-in Origin check). */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new Error("Cross-origin request refused");
}
