"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { createDraft, performAction, updateDraft, type RequestAction } from "../domain/requests";
import { str, toState, type ActionState } from "./result";

export async function createRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    const r = createDraft(getDb(), actor, {
      categoryCode: str(fd, "categoryCode"),
      title: str(fd, "title"),
      details: str(fd, "details"),
      priority: (str(fd, "priority") || "ROUTINE") as "ROUTINE",
      originOrgId: str(fd, "originOrgId") || undefined,
    });
    id = r.id;
    if (str(fd, "intent") === "submit") performAction(getDb(), actor, id, "SUBMIT");
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/requests/${id}`);
}

export async function updateRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    updateDraft(getDb(), actor, id, { categoryCode: str(fd, "categoryCode"), title: str(fd, "title"), details: str(fd, "details"), priority: (str(fd, "priority") || "ROUTINE") as "ROUTINE" });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/requests/${id}`);
  return { ok: true, message: "Changes saved." };
}

const ALLOWED: RequestAction[] = ["SUBMIT", "ASSIGN", "APPROVE", "RETURN", "REJECT", "START", "COMPLETE", "CLOSE", "CANCEL", "REOPEN"];

export async function requestWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const action = str(fd, "action") as RequestAction;
  if (!ALLOWED.includes(action)) return { error: "Unknown action." };
  try {
    performAction(getDb(), actor, id, action, {
      reason: str(fd, "reason"),
      assigneeId: str(fd, "assigneeId") || undefined,
      expectedVersion: Number(str(fd, "version")) || undefined,
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: `Action recorded: ${action.toLowerCase()}.` };
}
