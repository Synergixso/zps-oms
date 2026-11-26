"use server";
import { revalidatePath } from "next/cache";
import { getDb, run } from "../db/connection";
import { requireActor } from "../auth/session";
import { nowIso } from "../domain/core";
import { completeTask, markRead, savePreferences } from "../domain/tasks";
import { str, toState, type ActionState } from "./result";

export async function markAllReadAction() {
  const actor = await requireActor();
  // Scoped to the caller's own notifications only.
  await run(getDb(), "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowIso(), actor.userId);
  revalidatePath("/app", "layout");
}

export async function markReadAction(fd: FormData) {
  const actor = await requireActor();
  await markRead(getDb(), actor, str(fd, "id"));
  revalidatePath("/app", "layout");
}

export async function completeTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await completeTask(getDb(), actor, str(fd, "id"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Task marked as done." };
}

export async function preferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await savePreferences(getDb(), actor, fd.getAll("enabled").map(String));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/notifications");
  return { ok: true, message: "Notification preferences saved." };
}
