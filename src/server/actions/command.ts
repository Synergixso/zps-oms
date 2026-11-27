"use server";
/** Server actions for command and reporting. All authority, scope and audit rules live in the domain layer (`domain/command.ts`). */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import {
  setAppointmentAccess, acknowledgeDirective, acknowledgeReport, addRelationship, appoint, appointActing, cancelDirective, closeDirective, closeReport, completeDirective, createReport,
  flagConflict, forwardDirective, forwardReport, issueDirective, progressDirective, resolveConflict, reviewReport, revokeActing, submitReport,
  type CommandAction, type DirectiveCategory, type ReportCategory,
} from "../domain/command";
import { str, toState, type ActionState } from "./result";

const done = (path: string, msg: string) => redirect(`${path}${path.includes("?") ? "&" : "?"}done=${encodeURIComponent(msg)}`);

export async function issueDirectiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const [fromPositionId, toPositionId] = str(fd, "route").split("|");
  const related = str(fd, "relatedType");
  let id: string;
  try {
    const input = {
      toPositionId: toPositionId ?? "", category: str(fd, "category") as DirectiveCategory, subject: str(fd, "subject"), instructions: str(fd, "instructions"),
      effectiveDate: str(fd, "effectiveDate") || undefined, dueDate: str(fd, "dueDate"), ackRequired: str(fd, "ackRequired") !== "0",
      relatedType: (related || undefined) as "MANPOWER_REQUEST" | "ASSIGNMENT" | "TRANSFER" | undefined, relatedReference: str(fd, "relatedReference"),
    };
    const parent = str(fd, "parentId");
    id = parent ? (await forwardDirective(getDb(), actor, parent, input)).id : (await issueDirective(getDb(), actor, { ...input, fromPositionId: fromPositionId ?? "" })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/directives/${id}`, "Directive issued. The receiving office has been notified.");
  return null;
}

export async function directiveStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const db = getDb();
  const id = str(fd, "id");
  const step = str(fd, "step");
  const note = str(fd, "note");
  const msg: Record<string, string> = { ACKNOWLEDGE: "Acknowledged.", PROGRESS: "Progress recorded.", COMPLETE: "Completion reported to the issuing office.", CLOSE: "Directive closed.", CANCEL: "Directive cancelled." };
  try {
    if (step === "ACKNOWLEDGE") await acknowledgeDirective(db, actor, id);
    else if (step === "PROGRESS") await progressDirective(db, actor, id, note);
    else if (step === "COMPLETE") await completeDirective(db, actor, id, note || undefined, str(fd, "reportId") || undefined);
    else if (step === "CLOSE") await closeDirective(db, actor, id, note || undefined);
    else if (step === "CANCEL") await cancelDirective(db, actor, id, note);
    else return { error: "Unknown action." };
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/directives/${id}`, msg[step]);
  return null;
}

export async function flagConflictAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await flagConflict(getDb(), actor, { directiveAId: str(fd, "directiveAId"), directiveBId: str(fd, "directiveBId"), reason: str(fd, "reason") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/conflicts/${id}`, "Conflict referred to the common superior office.");
  return null;
}

export async function resolveConflictAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await resolveConflict(getDb(), actor, id, str(fd, "decision") as "A_PRECEDES", str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/conflicts/${id}`, "Decision recorded.");
  return null;
}

export async function createReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    const r = await createReport(getDb(), actor, {
      positionId: str(fd, "positionId"), category: str(fd, "category") as ReportCategory, directiveId: str(fd, "directiveId"), reportingDate: str(fd, "reportingDate") || undefined,
      periodFrom: str(fd, "periodFrom"), periodTo: str(fd, "periodTo"), summary: str(fd, "summary"), progressStatus: str(fd, "progressStatus") as "ON_TRACK",
      outstanding: str(fd, "outstanding"), supportingRefs: str(fd, "supportingRefs"),
    });
    id = r.id;
    if (str(fd, "submitNow") === "1") await submitReport(getDb(), actor, id);
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/reports/${id}`, str(fd, "submitNow") === "1" ? "Report submitted to the designated recipients." : "Draft saved.");
  return null;
}

export async function reportStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const db = getDb();
  const reportId = str(fd, "reportId");
  const recipientId = str(fd, "recipientId");
  const step = str(fd, "step");
  const note = str(fd, "note");
  const msg: Record<string, string> = { SUBMIT: "Report submitted to the designated recipients.", ACKNOWLEDGE: "Receipt acknowledged.", NOTED: "Review recorded.", RECOMMENDED: "Review recorded.",
    RETURNED: "Report returned to the reporting office for correction.", FORWARD: "Report forwarded to the next superior office.", CLOSE: "Report closed." };
  try {
    if (step === "SUBMIT") await submitReport(db, actor, reportId, str(fd, "summary") ? { summary: str(fd, "summary"), outstanding: str(fd, "outstanding") || undefined } : undefined);
    else if (step === "ACKNOWLEDGE") await acknowledgeReport(db, actor, recipientId);
    else if (step === "NOTED" || step === "RECOMMENDED" || step === "RETURNED") await reviewReport(db, actor, recipientId, step, note || undefined);
    else if (step === "FORWARD") await forwardReport(db, actor, recipientId, note || undefined);
    else if (step === "CLOSE") await closeReport(db, actor, recipientId, note || undefined);
    else return { error: "Unknown action." };
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  done(`/app/command/reports/${reportId}`, msg[step]);
  return null;
}

export async function appointActingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await appointActing(getDb(), actor, {
      positionId: str(fd, "positionId"), actingUserId: str(fd, "actingUserId"), validFrom: str(fd, "validFrom"), validTo: str(fd, "validTo"),
      actions: fd.getAll("actions").map(String) as CommandAction[], authorisingRef: str(fd, "authorisingRef"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  return { ok: true, message: "Acting appointment recorded. The acting officer has been notified." };
}

export async function revokeActingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await revokeActing(getDb(), actor, str(fd, "id"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command", "layout");
  return { ok: true, message: "Acting appointment revoked." };
}

export async function addRelationshipAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await addRelationship(getDb(), actor, {
      subordinatePositionId: str(fd, "subordinatePositionId"), superiorPositionId: str(fd, "superiorPositionId"),
      relationshipType: str(fd, "relationshipType") as "PRIMARY_COMMAND", channel: str(fd, "channel"), authorisingRef: str(fd, "authorisingRef"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command/structure");
  return { ok: true, message: "Relationship recorded." };
}

export async function appointAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await appoint(getDb(), actor, { positionId: str(fd, "positionId"), userId: str(fd, "userId"), authorisingRef: str(fd, "authorisingRef") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/command/structure");
  return { ok: true, message: "Appointment recorded." };
}

export async function appointmentAccessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setAppointmentAccess(getDb(), actor, { enabled: str(fd, "enabled") === "on", types: fd.getAll("types").map(String), reason: str(fd, "reason"), reference: str(fd, "reference") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Appointment-only access policy updated and audited. It applies from each account's next request." };
}
