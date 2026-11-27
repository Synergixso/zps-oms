"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { endSession } from "../domain/account-activity";
import { str, toState, type ActionState } from "./result";

/** Ends one session (own other sessions, or a user's session for account support). */
export async function endSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await endSession(getDb(), actor, str(fd, "sessionId"), (await cookies()).get("zps_session")?.value);
  } catch (e) {
    return toState(e);
  }
  revalidatePath(str(fd, "back") === "profile" ? "/app/profile" : `/app/admin/users/${str(fd, "userId")}`);
  return { ok: true, message: "Session ended." };
}
