"use server";
import { revalidatePath } from "next/cache";
import { getDb, run } from "../db/connection";
import { requireActor } from "../auth/session";
import { nowIso } from "../domain/core";

export async function markAllReadAction() {
  const actor = await requireActor();
  // Scoped to the caller's own notifications only.
  run(getDb(), "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowIso(), actor.userId);
  revalidatePath("/app", "layout");
}
