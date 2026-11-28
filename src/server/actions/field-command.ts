"use server";
/** Server actions for the Kamfinsa Mobile Unit field command workspaces. All authority, scope and audit rules live in `domain/field-command.ts`. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { FOLLOW_UP, MUSTER_STATUS, recordEngagement, recordMuster, setEngagementFollowUp, type EngagementType, type MusterStatus } from "../domain/field-command";
import { str, toState, type ActionState } from "./result";

const done = (path: string, msg: string) => redirect(`${path}${path.includes("?") ? "&" : "?"}done=${encodeURIComponent(msg)}`);

export async function recordMusterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const positionId = str(fd, "positionId");
  const date = str(fd, "date");
  const entries: Record<string, MusterStatus> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("s:") && typeof v === "string" && v in MUSTER_STATUS) entries[k.slice(2)] = v as MusterStatus;
  }
  try {
    await recordMuster(getDb(), actor, { positionId, date, entries });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/platoon?office=${encodeURIComponent(positionId)}&date=${encodeURIComponent(date)}`, `Attendance for ${date} recorded.`);
  return null;
}

export async function recordEngagementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const positionId = str(fd, "positionId");
  let reference: string;
  try {
    reference = (await recordEngagement(getDb(), actor, {
      positionId, engagementDate: str(fd, "engagementDate"), partner: str(fd, "partner"), engagementType: str(fd, "engagementType") as EngagementType,
      recordReference: str(fd, "recordReference"), followUp: (str(fd, "followUp") || "NONE") as keyof typeof FOLLOW_UP,
    })).reference;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command/area");
  done(`/app/command/area?office=${encodeURIComponent(positionId)}`, `Engagement ${reference} recorded.`);
  return null;
}

export async function engagementFollowUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const positionId = str(fd, "positionId");
  try {
    await setEngagementFollowUp(getDb(), actor, str(fd, "id"), str(fd, "followUp") as keyof typeof FOLLOW_UP);
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command/area");
  done(`/app/command/area?office=${encodeURIComponent(positionId)}`, "Follow-up status updated.");
  return null;
}
