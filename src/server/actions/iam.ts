"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { assignRole, decideReviewItem, grantDelegation, issueTemporaryPassword, openReview, provisionUser, revokeAssignment, revokeDelegation, setUserStatus, unlockAccount } from "../domain/iam";
import { str, toState, type ActionState } from "./result";

export async function provisionUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await provisionUser(getDb(), actor, { username: str(fd, "username").toLowerCase(), displayName: str(fd, "displayName"), positionTitle: str(fd, "positionTitle") });
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/admin/users/${id}`);
}

export async function assignRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await assignRole(getDb(), actor, {
      userId: str(fd, "userId"),
      roleCode: str(fd, "roleCode"),
      orgUnitId: str(fd, "orgUnitId"),
      validTo: str(fd, "validTo"),
      justification: str(fd, "justification"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/admin/users/${str(fd, "userId")}`);
  return { ok: true, message: "Role assignment recorded." };
}

export async function revokeAssignmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await revokeAssignment(getDb(), actor, str(fd, "assignmentId"), str(fd, "reason"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/admin", "layout");
  return { ok: true, message: "Assignment revoked." };
}

export async function grantDelegationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await grantDelegation(getDb(), actor, {
      userId: str(fd, "userId"),
      orgUnitId: str(fd, "orgUnitId"),
      domain: str(fd, "domain") as "ADMIN_REQUEST",
      categoryCode: str(fd, "categoryCode"),
      validTo: str(fd, "validTo"),
      approvalRef: str(fd, "approvalRef"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/admin/users/${str(fd, "userId")}`);
  return { ok: true, message: "Delegation recorded." };
}

export async function revokeDelegationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await revokeDelegation(getDb(), actor, str(fd, "delegationId"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/admin", "layout");
  return { ok: true, message: "Delegation revoked." };
}

export async function setUserStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const status = str(fd, "status");
  if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) return { error: "Invalid status." };
  try {
    await setUserStatus(getDb(), actor, str(fd, "userId"), status as "ACTIVE", str(fd, "reason"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/admin", "layout");
  return { ok: true, message: "Account status updated." };
}

export async function openReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = await openReview(getDb(), actor, str(fd, "title"));
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/admin/reviews/${id}`);
}

export async function decideReviewItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await decideReviewItem(getDb(), actor, str(fd, "itemId"), str(fd, "decision") === "REVOKE" ? "REVOKE" : "RETAIN", str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/admin/reviews", "layout");
  return { ok: true };
}

export async function issueTemporaryPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const pw = await issueTemporaryPassword(getDb(), actor, str(fd, "userId"));
    revalidatePath(`/app/admin/users/${str(fd, "userId")}`);
    return { ok: true, message: `Temporary password (shown once — give it to the officer through the approved channel): ${pw}` };
  } catch (e) {
    return toState(e);
  }
}

export async function unlockAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await unlockAccount(getDb(), actor, str(fd, "userId"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/admin/users/${str(fd, "userId")}`);
  return { ok: true, message: "Sign-in lockout cleared." };
}
