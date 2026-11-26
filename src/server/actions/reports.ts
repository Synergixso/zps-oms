"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { deleteSavedReport, saveReport } from "../domain/reports";
import { str, toState, type ActionState } from "./result";

export async function saveReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  const code = str(fd, "code");
  try {
    id = await saveReport(getDb(), actor, { name: str(fd, "name"), code, fields: fd.getAll("fields").map(String), sortField: str(fd, "sortField"), sortDir: str(fd, "sortDir") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/reports");
  redirect(`/app/reports/${code}?saved=${id}`);
}

export async function deleteSavedReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await deleteSavedReport(getDb(), actor, str(fd, "id"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/reports");
  return { ok: true, message: "Saved report removed." };
}
