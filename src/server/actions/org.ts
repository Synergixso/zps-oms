"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { decideChange, proposeChange } from "../domain/org";
import { str, toState, type ActionState } from "./result";

export async function proposeChangeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const t = str(fd, "changeType");
    const base = { reason: str(fd, "reason"), effectiveDate: str(fd, "effectiveDate") };
    const input =
      t === "CREATE_UNIT"
        ? { changeType: t, code: str(fd, "code").toUpperCase(), name: str(fd, "name"), unitType: str(fd, "unitType"), parentId: str(fd, "parentId"), ...base }
        : t === "RENAME_UNIT"
          ? { changeType: t, targetId: str(fd, "targetId"), name: str(fd, "name"), ...base }
          : t === "CHANGE_PARENT"
            ? { changeType: t, targetId: str(fd, "targetId"), parentId: str(fd, "parentId"), ...base }
            : { changeType: "DEACTIVATE_UNIT", targetId: str(fd, "targetId"), ...base };
    const c = await proposeChange(getDb(), actor, input as never);
    revalidatePath("/app/org", "layout");
    return { ok: true, message: `Change ${c.reference} submitted for approval.` };
  } catch (e) {
    return toState(e);
  }
}

export async function decideChangeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await decideChange(getDb(), actor, str(fd, "id"), str(fd, "decision") === "APPROVE" ? "APPROVE" : "REJECT", str(fd, "reason"), str(fd, "approvalRef"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/org", "layout");
  return { ok: true, message: "Decision recorded." };
}

export async function provisionTenantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const { provisionFormationTenant } = await import("../domain/tenants");
    const r = await provisionFormationTenant(getDb(), actor, { code: str(fd, "code"), name: str(fd, "name"), formationId: str(fd, "formationId"), reason: str(fd, "reason") });
    revalidatePath("/app/org/tenants");
    return { ok: true, message: `Tenant provisioned: ${r.moved.org_units} unit(s) moved with their records.` };
  } catch (e) {
    return toState(e);
  }
}
