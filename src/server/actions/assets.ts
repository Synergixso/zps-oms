"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { assetAction, registerAsset, type AssetAction } from "../domain/assets";
import { str, toState, type ActionState } from "./result";

export async function registerAssetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = (await registerAsset(getDb(), actor, {
      assetTag: str(fd, "assetTag").toUpperCase(),
      categoryCode: str(fd, "categoryCode"),
      description: str(fd, "description"),
      condition: str(fd, "condition") as "NEW",
      custodyOrgId: str(fd, "custodyOrgId"),
      custodianRef: str(fd, "custodianRef"),
    })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/assets");
  redirect(`/app/assets/${id}`);
}

const OK: AssetAction[] = ["ISSUE", "RETURN", "TRANSFER", "RECEIVE", "INSPECT", "SEND_REPAIR", "REPAIRED", "DISPOSE"];

export async function assetWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const action = str(fd, "action") as AssetAction;
  if (!OK.includes(action)) return { error: "Unknown action." };
  try {
    await assetAction(getDb(), actor, str(fd, "id"), action, {
      custodianRef: str(fd, "custodianRef"),
      toOrgId: str(fd, "toOrgId"),
      condition: str(fd, "condition") || undefined,
      reference: str(fd, "reference"),
      note: str(fd, "note"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Asset event recorded." };
}

export async function openReconciliationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    const { openReconciliation } = await import("../domain/reconciliation");
    id = await openReconciliation(getDb(), actor, str(fd, "unitId"), str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  redirect(`/app/assets/reconciliation/${id}`);
}

export async function reconciliationItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    const { closeReconciliation, recordItem } = await import("../domain/reconciliation");
    if (str(fd, "op") === "close") {
      const summary = await closeReconciliation(getDb(), actor, id);
      revalidatePath(`/app/assets/reconciliation/${id}`);
      return { ok: true, message: `Reconciliation closed: ${summary}.` };
    }
    await recordItem(getDb(), actor, id, str(fd, "itemId"), str(fd, "result") as "FOUND", str(fd, "note"));
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/assets/reconciliation/${id}`);
  return { ok: true, message: "Recorded." };
}
