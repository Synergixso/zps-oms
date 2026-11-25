"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, one } from "../db/connection";
import { audit } from "../domain/audit";
import { createSession, destroySession, SESSION_ABSOLUTE_HOURS } from "../domain/sessions";
import { DEMO_AUTH_ENABLED, SESSION_COOKIE } from "../auth/session";
import { str } from "./result";

/** Synthetic demonstration sign-in. NOT Zambia Police Service authentication. */
export async function demoSignIn(fd: FormData) {
  if (!DEMO_AUTH_ENABLED) redirect("/login?reason=disabled");
  const db = getDb();
  const userId = str(fd, "userId");
  const user = one<{ id: string; status: string; synthetic: number }>(db, "SELECT id, status, synthetic FROM users WHERE id = ?", userId);
  if (!user || user.status !== "ACTIVE" || user.synthetic !== 1) {
    audit(db, { actorId: user?.id ?? null, action: "auth.signin", outcome: "DENIED", category: "AUTH", details: { reason: user ? "account_not_active" : "unknown_account" } });
    redirect("/login?reason=refused");
  }
  const token = createSession(db, user.id);
  audit(db, { actorId: user.id, action: "auth.signin", category: "AUTH", details: { method: "synthetic-demo" } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.ZPS_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: SESSION_ABSOLUTE_HOURS * 3600,
  });
  redirect("/app");
}

export async function signOut() {
  const jar = await cookies();
  destroySession(getDb(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login?reason=signedout");
}
