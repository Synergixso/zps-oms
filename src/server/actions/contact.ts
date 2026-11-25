"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { markContactHandled, submitContactMessage, type ContactSubject } from "../domain/contact";
import { str, toState, type ActionState } from "./result";

/** Public, unauthenticated: the domain layer validates, rate-limits and audits. */
export async function submitContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { reference } = submitContactMessage(getDb(), {
      fullName: str(fd, "fullName"),
      email: str(fd, "email"),
      phone: str(fd, "phone"),
      subject: str(fd, "subject") as ContactSubject,
      message: str(fd, "message"),
      website: str(fd, "website"),
    });
    return { ok: true, message: reference };
  } catch (e) {
    return toState(e);
  }
}

export async function markContactHandledAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    markContactHandled(getDb(), actor, str(fd, "id"), str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/messages");
  return { ok: true, message: "Marked as handled." };
}
