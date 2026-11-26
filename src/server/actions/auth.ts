"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { authenticate, changePassword, clientKey } from "../domain/auth";
import { createSession, destroySession, SESSION_ABSOLUTE_HOURS } from "../domain/sessions";
import { requireActor, SESSION_COOKIE } from "../auth/session";
import { str, toState, type ActionState } from "./result";

const MESSAGES = {
  invalid: "The username or password is not correct.",
  locked: "This account is temporarily locked after repeated failed sign-in attempts. Try again later or contact your security administrator.",
  throttled: "Too many failed sign-in attempts from this device. Wait 15 minutes and try again.",
  inactive: "This account is not active. Contact your access administrator.",
} as const;

/** Username + password sign-in (scrypt hashes, lockout and throttling in the domain layer). */
export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = getDb();
  const h = await headers();
  const client = clientKey(`${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}|${h.get("user-agent") ?? ""}`);
  const username = str(fd, "username");
  const password = str(fd, "password");
  if (!username || !password) return { error: "Enter your username and password." };
  let mustChange = false;
  try {
    const r = await authenticate(db, username, password, client);
    if (!r.ok) return { error: MESSAGES[r.reason] };
    mustChange = r.mustChangePassword;
    const token = await createSession(db, r.userId);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production" && process.env.ZPS_INSECURE_COOKIE !== "1",
      path: "/",
      // "Remember me" keeps the cookie across browser restarts (still bounded by the 8-hour server-side session);
      // otherwise it is a browser-session cookie.
      ...(str(fd, "remember") === "1" ? { maxAge: SESSION_ABSOLUTE_HOURS * 3600 } : {}),
    });
  } catch (e) {
    return toState(e);
  }
  redirect(mustChange ? "/app/profile?reason=change-password" : "/app");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  if (str(fd, "next") !== str(fd, "confirm")) return { error: "The new passwords do not match.", fieldErrors: { confirm: "Does not match." } };
  try {
    await changePassword(getDb(), actor, str(fd, "current"), str(fd, "next"));
  } catch (e) {
    return toState(e);
  }
  return { ok: true, message: "Password changed." };
}

export async function signOut() {
  const jar = await cookies();
  await destroySession(getDb(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login?reason=signedout");
}
