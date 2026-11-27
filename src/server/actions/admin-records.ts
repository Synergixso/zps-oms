"use server";
/** Server actions for Module 16 (administrative calendar) and Module 17 (correspondence). All rules live in the domain layer. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { createEvent, setEventStatus, type EventCategory } from "../domain/schedule";
import {
  assignCorrespondence, attachFile, registerCorrespondence, removeFile, setCorrespondenceStatus, MAX_FILE_BYTES, type CorrStatus,
} from "../domain/correspondence";
import { str, toState, type ActionState } from "./result";

export async function createEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = (await createEvent(getDb(), actor, {
      orgUnitId: str(fd, "orgUnitId"), title: str(fd, "title"), category: str(fd, "category") as EventCategory, eventDate: str(fd, "eventDate"),
      startTime: str(fd, "startTime"), endTime: str(fd, "endTime"), notes: str(fd, "notes") || undefined,
    })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/calendar");
  redirect(`/app/calendar/${id}`);
}

export async function eventStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const status = str(fd, "status");
  if (status !== "CANCELLED" && status !== "COMPLETED") return { error: "Unknown action." };
  try {
    await setEventStatus(getDb(), actor, str(fd, "id"), status, str(fd, "reason"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/calendar", "layout");
  return { ok: true, message: status === "CANCELLED" ? "Event cancelled." : "Event marked as completed." };
}

export async function registerCorrespondenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    const counterpart = str(fd, "counterpartOrgId");
    id = (await registerCorrespondence(getDb(), actor, {
      orgUnitId: str(fd, "orgUnitId"), direction: str(fd, "direction") === "OUTGOING" ? "OUTGOING" : "INCOMING", subject: str(fd, "subject"),
      counterpartOrgId: counterpart || undefined, counterpartName: str(fd, "counterpartName") || undefined, letterReference: str(fd, "letterReference"),
      letterDate: str(fd, "letterDate"), registerDate: str(fd, "registerDate"), classification: str(fd, "classification") === "RESTRICTED" ? "RESTRICTED" : "UNCLASSIFIED",
      followUpDate: str(fd, "followUpDate"), summary: str(fd, "summary"),
    })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/correspondence");
  redirect(`/app/correspondence/${id}`);
}

export async function assignCorrespondenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await assignCorrespondence(getDb(), actor, str(fd, "id"), str(fd, "userId"), str(fd, "note") || undefined);
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/correspondence/${str(fd, "id")}`);
  return { ok: true, message: "Officer assigned and notified." };
}

export async function correspondenceStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setCorrespondenceStatus(getDb(), actor, str(fd, "id"), str(fd, "status") as CorrStatus, {
      note: str(fd, "note") || undefined, fileReference: str(fd, "fileReference") || undefined, followUpDate: str(fd, "followUpDate") || undefined,
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/correspondence/${str(fd, "id")}`);
  return { ok: true, message: "Status updated." };
}

export async function attachCorrespondenceFileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF document.", fieldErrors: { file: "Choose a PDF document." } };
  if (file.size > MAX_FILE_BYTES) return { error: "The file is larger than 5 MB.", fieldErrors: { file: "The file is larger than 5 MB." } };
  try {
    await attachFile(getDb(), actor, str(fd, "id"), file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/correspondence/${str(fd, "id")}`);
  return { ok: true, message: "Document checked and stored." };
}

export async function removeCorrespondenceFileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await removeFile(getDb(), actor, str(fd, "fileId"), str(fd, "reason"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/correspondence/${str(fd, "id")}`);
  return { ok: true, message: "Document removed from the record (kept in its history)." };
}
