"use server";
/** Server actions for personnel, manpower, rosters, duty areas, assignments and transfers (thin: parse → domain). */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { changeDisposition, changeHomeUnit, registerPersonnel, updatePersonnel, verifyPersonnel, type Disposition } from "../domain/personnel";
import {
  acceptDecision, cancelAssignment, cancelTransfer, createArea, decideAssignment, decideException, initiateTransfer, markRenewalPending, proposeAssignment,
  raiseException, releaseAssignment, releaseDecision, renewAssignment, setAreaStatus, updateArea,
} from "../domain/assignments";
import {
  addContributionEntries, addRosterEntry, amendRoster, buildRoster, contributionAction, createManpowerRequest, manpowerAction, removeContributionEntry,
  publishManpowerWorkflow, removeRequirement, removeRosterEntry, reuseRosterList, revalidateRoster, rosterAction, setRequirement, updateManpowerRequest, type MprAction, type RosterAction,
} from "../domain/manpower";
import { str, toState, type ActionState } from "./result";

const done = (message: string, ...paths: string[]): ActionState => {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/app", "layout");
  return { ok: true, message };
};

// ── Personnel ───────────────────────────────────────────────────────────────
export async function registerPersonnelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await registerPersonnel(getDb(), actor, {
      serviceNumber: str(fd, "serviceNumber"), surname: str(fd, "surname"), firstNames: str(fd, "firstNames"), rankCode: str(fd, "rankCode"),
      homeUnitId: str(fd, "homeUnitId"), employmentStatus: (str(fd, "employmentStatus") || "SERVING") as "SERVING", eligibilityNote: str(fd, "eligibilityNote"),
      confirmDistinct: str(fd, "confirmDistinct") === "1",
    });
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/personnel/${id}`);
}

export async function updatePersonnelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await updatePersonnel(getDb(), actor, id, {
      surname: str(fd, "surname"), firstNames: str(fd, "firstNames"), rankCode: str(fd, "rankCode"), employmentStatus: str(fd, "employmentStatus") as "SERVING",
      eligibilityNote: str(fd, "eligibilityNote"), reason: str(fd, "reason"), expectedVersion: Number(str(fd, "version")) || undefined,
    });
  } catch (e) {
    return toState(e);
  }
  return done("Record updated.", `/app/personnel/${id}`);
}

export async function homeUnitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await changeHomeUnit(getDb(), actor, id, { newUnitId: str(fd, "newUnitId"), effectiveDate: str(fd, "effectiveDate"), reason: str(fd, "reason") });
  } catch (e) {
    return toState(e);
  }
  return done("Home-unit membership recorded.", `/app/personnel/${id}`);
}

export async function verifyPersonnelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await verifyPersonnel(getDb(), actor, id, str(fd, "decision") === "REJECTED" ? "REJECTED" : "VERIFIED", str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  return done("Verification recorded.", `/app/personnel/${id}`);
}

export async function dispositionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await changeDisposition(getDb(), actor, id, str(fd, "status") as Disposition, str(fd, "reason"), str(fd, "effectiveDate") || undefined);
  } catch (e) {
    return toState(e);
  }
  return done("Disposition status recorded.", `/app/personnel/${id}`);
}

// ── Manpower requests ───────────────────────────────────────────────────────
const mprInput = (fd: FormData) => ({
  requestingUnitId: str(fd, "requestingUnitId"), category: str(fd, "category") as "NATIONAL_DUTY", purpose: str(fd, "purpose"), areaId: str(fd, "areaId"),
  totalRequired: str(fd, "totalRequired"), personnelCategories: str(fd, "personnelCategories"), commencementDate: str(fd, "commencementDate"),
  durationDays: str(fd, "durationDays"), justification: str(fd, "justification"), approvalUnitId: str(fd, "approvalUnitId"),
}) as never;

export async function createManpowerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await createManpowerRequest(getDb(), actor, mprInput(fd));
    if (str(fd, "intent") === "submit") await manpowerAction(getDb(), actor, id, "SUBMIT");
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/manpower/${id}`);
}

export async function updateManpowerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await updateManpowerRequest(getDb(), actor, id, mprInput(fd));
  } catch (e) {
    return toState(e);
  }
  return done("Changes saved.", `/app/manpower/${id}`);
}

const MPR_ACTIONS: MprAction[] = ["SUBMIT", "TAKE_REVIEW", "RETURN", "RECOMMEND", "APPROVE", "REJECT", "CANCEL", "COMPLETE"];
export async function manpowerWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const action = str(fd, "action") as MprAction;
  if (!MPR_ACTIONS.includes(action)) return { error: "Unknown action." };
  try {
    await manpowerAction(getDb(), actor, id, action, str(fd, "comment"));
  } catch (e) {
    return toState(e);
  }
  return done("Action recorded.", `/app/manpower/${id}`);
}

export async function setRequirementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await setRequirement(getDb(), actor, id, { unitId: str(fd, "unitId"), count: Number(str(fd, "count")), rankNote: str(fd, "rankNote"), deadline: str(fd, "deadline") || undefined });
  } catch (e) {
    return toState(e);
  }
  return done("Contribution requirement recorded and the unit notified.", `/app/manpower/${id}`);
}

export async function removeRequirementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await removeRequirement(getDb(), actor, str(fd, "contributionId"));
  } catch (e) {
    return toState(e);
  }
  return done("Requirement removed.", `/app/manpower/${str(fd, "id")}`);
}

// ── Contributions ───────────────────────────────────────────────────────────
export async function addEntriesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await addContributionEntries(getDb(), actor, id, fd.getAll("personnelId").map(String));
  } catch (e) {
    return toState(e);
  }
  return done("Officers added to the submission.", `/app/manpower/contributions/${id}`);
}

export async function removeEntryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await removeContributionEntry(getDb(), actor, id, str(fd, "entryId"));
  } catch (e) {
    return toState(e);
  }
  return done("Officer removed.", `/app/manpower/contributions/${id}`);
}

export async function reuseListAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    const r = await reuseRosterList(getDb(), actor, id, str(fd, "rosterId"));
    const skipped = r.skipped.slice(0, 5).map((s) => `${s.name} (${s.reasons.join(", ")})`).join("; ");
    return done(`${r.added} officer(s) added after revalidation.${r.skipped.length ? ` ${r.skipped.length} skipped: ${skipped}${r.skipped.length > 5 ? "…" : ""}` : ""}`, `/app/manpower/contributions/${id}`);
  } catch (e) {
    return toState(e);
  }
}

export async function contributionWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const action = str(fd, "action") as "SUBMIT" | "RECALL" | "ACCEPT" | "RETURN";
  if (!["SUBMIT", "RECALL", "ACCEPT", "RETURN"].includes(action)) return { error: "Unknown action." };
  try {
    await contributionAction(getDb(), actor, id, action, str(fd, "comment"));
  } catch (e) {
    return toState(e);
  }
  return done("Action recorded.", `/app/manpower/contributions/${id}`);
}

// ── Rosters ─────────────────────────────────────────────────────────────────
export async function buildRosterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await buildRoster(getDb(), actor, str(fd, "requestId"));
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/rosters/${id}`);
}

const ROSTER_ACTIONS: RosterAction[] = ["SUBMIT", "REVIEW", "RETURN", "APPROVE", "FINALISE", "WITHDRAW"];
export async function rosterWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const action = str(fd, "action") as RosterAction;
  if (!ROSTER_ACTIONS.includes(action)) return { error: "Unknown action." };
  try {
    const r = await rosterAction(getDb(), actor, id, action, str(fd, "comment"));
    return done(action === "FINALISE" ? `Roster finalised; ${r.created} assignment record(s) created.` : "Action recorded.", `/app/rosters/${id}`);
  } catch (e) {
    return toState(e);
  }
}

export async function amendRosterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await amendRoster(getDb(), actor, str(fd, "id"), str(fd, "reason"));
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/rosters/${id}`);
}

export async function rosterEntryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    const op = str(fd, "op");
    if (op === "add") await addRosterEntry(getDb(), actor, id, str(fd, "personnelId"), str(fd, "reason"));
    else if (op === "remove") await removeRosterEntry(getDb(), actor, id, str(fd, "entryId"), str(fd, "reason"));
    else {
      const n = await revalidateRoster(getDb(), actor, id);
      return done(n ? `${n} entr${n === 1 ? "y has" : "ies have"} issues.` : "All entries are valid.", `/app/rosters/${id}`);
    }
  } catch (e) {
    return toState(e);
  }
  return done("Roster updated.", `/app/rosters/${id}`);
}

// ── Areas ───────────────────────────────────────────────────────────────────
export async function createAreaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await createArea(getDb(), actor, { code: str(fd, "code"), name: str(fd, "name"), description: str(fd, "description"), responsibleUnitId: str(fd, "responsibleUnitId") });
  } catch (e) {
    return toState(e);
  }
  return done("Operational area created.", "/app/areas");
}

export async function areaStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setAreaStatus(getDb(), actor, str(fd, "id"), str(fd, "status") === "ACTIVE" ? "ACTIVE" : "INACTIVE");
  } catch (e) {
    return toState(e);
  }
  return done("Area status updated.", "/app/areas");
}

export async function updateAreaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    await updateArea(getDb(), actor, id, { name: str(fd, "name"), description: str(fd, "description"), reason: str(fd, "reason") });
  } catch (e) {
    return toState(e);
  }
  return done("Operational area updated.", `/app/areas/${id}`, "/app/areas");
}

// ── Assignments ─────────────────────────────────────────────────────────────
export async function proposeAssignmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await proposeAssignment(getDb(), actor, { personnelId: str(fd, "personnelId"), areaId: str(fd, "areaId"), commencementDate: str(fd, "commencementDate"), notes: str(fd, "notes") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/assignments/${id}`);
}

export async function assignmentWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const db = getDb();
  try {
    switch (str(fd, "action")) {
      case "APPROVE":
      case "REJECT":
        await decideAssignment(db, actor, id, str(fd, "action") as "APPROVE", str(fd, "comment"));
        break;
      case "CANCEL":
        await cancelAssignment(db, actor, id, str(fd, "comment"));
        break;
      case "RELEASE":
      case "COMPLETE":
        await releaseAssignment(db, actor, id, { outcome: str(fd, "action") === "COMPLETE" ? "COMPLETED" : "RELEASED", reason: str(fd, "comment"), effectiveDate: str(fd, "effectiveDate"), exceptionId: str(fd, "exceptionId") || undefined });
        break;
      case "RENEWAL_PENDING":
        await markRenewalPending(db, actor, id, str(fd, "comment"));
        break;
      case "RENEWED":
      case "NOT_RENEWED":
        await renewAssignment(db, actor, id, { decision: str(fd, "action") as "RENEWED", comment: str(fd, "comment") });
        break;
      case "EXCEPTION":
        await raiseException(db, actor, id, { purpose: str(fd, "purpose") as "EARLY_RELEASE", categoryCode: str(fd, "categoryCode"), justification: str(fd, "justification"), documentRef: str(fd, "documentRef") });
        break;
      case "EXCEPTION_APPROVE":
      case "EXCEPTION_REJECT":
        await decideException(db, actor, str(fd, "exceptionId"), str(fd, "action") === "EXCEPTION_APPROVE" ? "APPROVE" : "REJECT", str(fd, "comment"));
        break;
      default:
        return { error: "Unknown action." };
    }
  } catch (e) {
    return toState(e);
  }
  return done("Action recorded.", `/app/assignments/${id}`);
}

export async function initiateTransferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await initiateTransfer(getDb(), actor, str(fd, "id"), { toAreaId: str(fd, "toAreaId"), justification: str(fd, "justification"), proposedDate: str(fd, "proposedDate"), exceptionId: str(fd, "exceptionId") });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/transfers/${id}`);
}

export async function transferWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  const db = getDb();
  try {
    switch (str(fd, "action")) {
      case "RELEASE_APPROVE":
      case "RELEASE_REJECT":
        await releaseDecision(db, actor, id, str(fd, "action") === "RELEASE_APPROVE" ? "APPROVE" : "REJECT", str(fd, "comment"));
        break;
      case "ACCEPT":
      case "DECLINE":
        await acceptDecision(db, actor, id, str(fd, "action") as "ACCEPT", { effectiveDate: str(fd, "effectiveDate"), comment: str(fd, "comment") });
        break;
      case "CANCEL":
        await cancelTransfer(db, actor, id, str(fd, "comment"));
        break;
      default:
        return { error: "Unknown action." };
    }
  } catch (e) {
    return toState(e);
  }
  return done("Action recorded.", `/app/transfers/${id}`);
}

export async function publishWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const steps = [1, 2, 3].map((i) => ({ authority: str(fd, `authority_${i}`), label: str(fd, `label_${i}`) })).filter((x) => x.authority && x.label);
    await publishManpowerWorkflow(getDb(), actor, str(fd, "category"), steps, str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  return done("New workflow version published; requests already submitted keep their version.", "/app/workflows");
}
