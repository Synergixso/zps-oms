"use server";
/** Server actions for the executive portfolio modules. All authority, scope and audit rules live in the domain layer. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import {
  createCourse, createSession, decideNeed, decideNomination, nominate, recommendNomination, recordAttendance, recordResult, setSessionStatus, submitNeed, withdrawNomination,
  type TrainingCategory,
} from "../domain/training";
import { createAgreement, recordServiceReport, registerActivity, updateActivity } from "../domain/ops-admin";
import { actOnCoordination, submitCoordination } from "../domain/coordination";
import { str, toState, type ActionState } from "./result";

const done = (path: string, msg: string) => redirect(`${path}${path.includes("?") ? "&" : "?"}done=${encodeURIComponent(msg)}`);
async function attempt(fn: () => Promise<unknown>): Promise<ActionState | undefined> {
  try { await fn(); return undefined; } catch (e) { return toState(e); }
}

// ── Training ──
export async function submitNeedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let ref = "";
  const err = await attempt(async () => { ref = (await submitNeed(getDb(), actor, { requestingUnitId: str(fd, "requestingUnitId"), topic: str(fd, "topic"), category: str(fd, "category") as TrainingCategory, courseId: str(fd, "courseId"), officersCount: str(fd, "officersCount"), priority: str(fd, "priority") as "HIGH", justification: str(fd, "justification") })).reference; });
  if (err) return err;
  revalidatePath("/app/training"); done("/app/training?tab=needs", `Training need ${ref} submitted to DIG Administration.`); return null;
}
export async function decideNeedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const err = await attempt(() => decideNeed(getDb(), actor, str(fd, "id"), str(fd, "status") as "ACCEPTED", str(fd, "note")));
  if (err) return err;
  revalidatePath("/app/training"); done("/app/training?tab=needs", "Decision recorded."); return null;
}
export async function createCourseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const err = await attempt(() => createCourse(getDb(), actor, { code: str(fd, "code"), title: str(fd, "title"), institutionId: str(fd, "institutionId"), category: str(fd, "category") as TrainingCategory, durationDays: str(fd, "durationDays"), eligibility: str(fd, "eligibility"), certification: str(fd, "certification"), renewalMonths: str(fd, "renewalMonths") }));
  if (err) return err;
  revalidatePath("/app/training"); done("/app/training?tab=catalogue", "Course added to the catalogue."); return null;
}
export async function createSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id = "";
  const err = await attempt(async () => { id = (await createSession(getDb(), actor, { courseId: str(fd, "courseId"), deliveringUnitId: str(fd, "deliveringUnitId"), startDate: str(fd, "startDate"), endDate: str(fd, "endDate"), capacity: str(fd, "capacity") })).id; });
  if (err) return err;
  revalidatePath("/app/training"); done(`/app/training/sessions/${id}`, "Session planned and open for nominations."); return null;
}
export async function sessionStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const err = await attempt(() => setSessionStatus(getDb(), actor, id, str(fd, "status") as "OPEN"));
  if (err) return err;
  revalidatePath("/app/training"); done(`/app/training/sessions/${id}`, "Session status updated."); return null;
}
export async function nominateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const session = str(fd, "sessionId");
  const err = await attempt(() => nominate(getDb(), actor, { sessionId: session, personnelId: str(fd, "personnelId") }));
  if (err) return err;
  revalidatePath("/app/training"); done(`/app/training/sessions/${session}`, "Officer nominated; awaiting recommendation."); return null;
}
export async function nominationStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const db = getDb();
  const id = str(fd, "id"), step = str(fd, "step"), note = str(fd, "note"), back = str(fd, "back") || "/app/training?tab=nominations";
  const MSG: Record<string, string> = { RECOMMEND: "Recommended.", NOT_RECOMMEND: "Not recommended.", APPROVE: "Approved.", REJECT: "Rejected.", WITHDRAW: "Withdrawn.", ATTEND: "Attendance recorded.", COMPLETE: "Completion recorded.", NOT_COMPLETE: "Result recorded." };
  const err = await attempt(async () => {
    if (step === "RECOMMEND" || step === "NOT_RECOMMEND") await recommendNomination(db, actor, id, step === "RECOMMEND", note);
    else if (step === "APPROVE" || step === "REJECT") await decideNomination(db, actor, id, step === "APPROVE", note);
    else if (step === "WITHDRAW") await withdrawNomination(db, actor, id, note);
    else if (step === "ATTEND") await recordAttendance(db, actor, id);
    else if (step === "COMPLETE" || step === "NOT_COMPLETE") await recordResult(db, actor, id, { completed: step === "COMPLETE", certificateRef: str(fd, "certificateRef"), note });
    else throw new Error("unknown step");
  });
  if (err) return err;
  revalidatePath("/app/training"); done(back, MSG[step] ?? "Done."); return null;
}

// ── Operations administration ──
export async function registerActivityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id = "";
  const err = await attempt(async () => { id = (await registerActivity(getDb(), actor, { category: str(fd, "category") as "PUBLIC_ORDER", classification: str(fd, "classification"), title: str(fd, "title"), authorisingRef: str(fd, "authorisingRef"), authorisingOffice: str(fd, "authorisingOffice"), responsibleUnitId: str(fd, "responsibleUnitId"), coordinatingUnitId: str(fd, "coordinatingUnitId"), startDate: str(fd, "startDate"), endDate: str(fd, "endDate"), personnelCommitted: str(fd, "personnelCommitted") })).id; });
  if (err) return err;
  revalidatePath("/app/operations"); done(`/app/operations/${id}`, "Record registered."); return null;
}
export async function updateActivityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const err = await attempt(() => updateActivity(getDb(), actor, id, { kind: str(fd, "kind") as "PROGRESS", note: str(fd, "note"), personnel: str(fd, "personnel"), toStatus: str(fd, "toStatus"), outcome: str(fd, "outcome") }, Number(str(fd, "version")) || undefined));
  if (err) return err;
  revalidatePath("/app/operations"); done(`/app/operations/${id}`, "Update recorded."); return null;
}
export async function createAgreementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id = "";
  const err = await attempt(async () => { id = (await createAgreement(getDb(), actor, { partnerId: str(fd, "partnerId"), areaId: str(fd, "areaId"), authorisationRef: str(fd, "authorisationRef"), validFrom: str(fd, "validFrom"), validTo: str(fd, "validTo"), officersRequired: str(fd, "officersRequired") })).id; });
  if (err) return err;
  revalidatePath("/app/operations/security-services"); done(`/app/operations/security-services/${id}`, "Service agreement recorded."); return null;
}
export async function serviceReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const err = await attempt(() => recordServiceReport(getDb(), actor, id, { periodFrom: str(fd, "periodFrom"), periodTo: str(fd, "periodTo"), officersProvided: str(fd, "officersProvided"), serviceStatus: str(fd, "serviceStatus") as "DELIVERED", followUp: (str(fd, "followUp") || "NONE") as "NONE", summary: str(fd, "summary") }));
  if (err) return err;
  revalidatePath("/app/operations/security-services"); done(`/app/operations/security-services/${id}`, "Service report recorded."); return null;
}

// ── Coordination ──
export async function submitCoordinationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id = "";
  const err = await attempt(async () => { id = (await submitCoordination(getDb(), actor, { fromPositionId: str(fd, "fromPositionId"), toPositionId: str(fd, "toPositionId"), category: str(fd, "category") as "OTHER", subject: str(fd, "subject"), requirement: str(fd, "requirement"), officersRequired: str(fd, "officersRequired"), authorisationRef: str(fd, "authorisationRef"), requiredBy: str(fd, "requiredBy") })).id; });
  if (err) return err;
  revalidatePath("/app/coordination"); done(`/app/coordination/${id}`, "Coordination request sent. The receiving office has been notified."); return null;
}
export async function coordinationStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const err = await attempt(() => actOnCoordination(getDb(), actor, id, str(fd, "step") as "ACKNOWLEDGE", str(fd, "note")));
  if (err) return err;
  revalidatePath("/app/coordination"); done(`/app/coordination/${id}`, "Recorded."); return null;
}
