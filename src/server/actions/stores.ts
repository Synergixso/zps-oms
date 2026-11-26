"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { createItem, createRequisition, recordMovement, requisitionAction, TXN_TYPES, type RequisitionAction, type TxnType } from "../domain/stores";
import { str, toState, type ActionState } from "./result";

export async function createStoreItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = (await createItem(getDb(), actor, {
      orgUnitId: str(fd, "orgUnitId"),
      code: str(fd, "code").toUpperCase(),
      categoryCode: str(fd, "categoryCode"),
      name: str(fd, "name"),
      unitOfMeasure: str(fd, "unitOfMeasure"),
      reorderLevel: Number(str(fd, "reorderLevel") || 0),
    })).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/stores");
  redirect(`/app/stores/${id}`);
}

export async function storeMovementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const type = str(fd, "type") as TxnType;
  if (!(TXN_TYPES as readonly string[]).includes(type)) return { error: "Unknown movement type." };
  try {
    const balance = await recordMovement(getDb(), actor, str(fd, "id"), {
      type,
      quantity: Number(str(fd, "quantity")),
      reference: str(fd, "reference") || undefined,
      counterparty: str(fd, "counterparty") || undefined,
      note: str(fd, "note") || undefined,
      version: Number(str(fd, "version")),
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: `Recorded. Balance on hand: ${balance}.` };
  } catch (e) {
    return toState(e);
  }
}

export async function createRequisitionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const lines: Array<{ itemId: string; quantity: number }> = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("qty_")) continue;
    const n = Number(String(v).trim() || 0);
    if (n > 0) lines.push({ itemId: k.slice(4), quantity: n });
  }
  let id: string;
  try {
    id = await createRequisition(getDb(), actor, {
      requestingUnitId: str(fd, "requestingUnitId"),
      storeUnitId: str(fd, "storeUnitId"),
      purpose: str(fd, "purpose"),
      lines,
    }, str(fd, "submit") === "1");
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/stores/requisitions");
  redirect(`/app/stores/requisitions/${id}`);
}

const ACTIONS: RequisitionAction[] = ["SUBMIT", "CANCEL", "APPROVE", "REJECT", "ISSUE"];

export async function requisitionWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const action = str(fd, "action") as RequisitionAction;
  if (!ACTIONS.includes(action)) return { error: "Unknown action." };
  const issued: Record<string, number> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("issued_")) issued[k.slice(7)] = Number(String(v).trim() || 0);
  try {
    await requisitionAction(getDb(), actor, str(fd, "id"), action, { comment: str(fd, "comment") || undefined, issued });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Requisition updated." };
}
