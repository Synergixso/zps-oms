"use server";
/** Server actions for intelligence-liaison administration (roles 07, 19, 30, 31). All rules, scope and audit live in the domain layer. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { acknowledgeLiaison, closeLiaison, createLiaison, receiveLiaison, submitLiaison, updateLiaison, withdrawLiaison } from "../domain/liaison";
import { str, toState, type ActionState } from "./result";

const kindOf = (fd: FormData) => (str(fd, "kind") === "REPORT_REFERENCE" ? "REPORT_REFERENCE" : "SUBMISSION");
const classOf = (fd: FormData) => (str(fd, "classification") === "RESTRICTED" ? "RESTRICTED" : "UNCLASSIFIED");

export async function createLiaisonAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = (await createLiaison(getDb(), actor, {
      kind: kindOf(fd), originUnitId: str(fd, "originUnitId"), externalReference: str(fd, "externalReference"),
      classification: classOf(fd), approvalReference: str(fd, "approvalReference"),
    })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/liaison", "layout");
  redirect(`/app/liaison/records/${id}`);
}

export async function updateLiaisonAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await updateLiaison(getDb(), actor, str(fd, "id"), {
      kind: kindOf(fd), externalReference: str(fd, "externalReference"), classification: classOf(fd), approvalReference: str(fd, "approvalReference"),
      expectedVersion: Number(str(fd, "version")) || undefined,
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/liaison", "layout");
  return { ok: true, message: "Metadata corrected." };
}

export async function liaisonStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const db = getDb();
  const id = str(fd, "id");
  const step = str(fd, "step");
  try {
    switch (step) {
      case "SUBMIT":
        await submitLiaison(db, actor, id, { toUnitId: str(fd, "toUnitId"), dateSubmitted: str(fd, "date"), approvalReference: str(fd, "approvalReference") });
        break;
      case "RECEIVE":
        await receiveLiaison(db, actor, id, { dateReceived: str(fd, "date") });
        break;
      case "ACKNOWLEDGE":
        await acknowledgeLiaison(db, actor, id, { dateAcknowledged: str(fd, "date"), approvalReference: str(fd, "approvalReference") });
        break;
      case "CLOSE":
        await closeLiaison(db, actor, id);
        break;
      case "WITHDRAW":
        await withdrawLiaison(db, actor, id);
        break;
      default:
        return { error: "Unknown action." };
    }
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/liaison", "layout");
  // A successful step changes the status, which removes this form; the confirmation is shown on the record page.
  redirect(`/app/liaison/records/${encodeURIComponent(id)}?done=${step}`);
}
