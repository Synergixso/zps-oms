"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { createMaintenance, createVehicle, maintenanceAction, recordService, updateVehicleAdmin, type MaintAction } from "../domain/fleet";
import { str, toState, type ActionState } from "./result";

export async function createVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    id = createVehicle(getDb(), actor, {
      fleetRef: str(fd, "fleetRef").toUpperCase(),
      registrationRef: str(fd, "registrationRef").toUpperCase(),
      make: str(fd, "make"),
      model: str(fd, "model"),
      vehicleClass: str(fd, "vehicleClass") as "Saloon",
      custodyOrgId: str(fd, "custodyOrgId"),
      nextServiceDue: str(fd, "nextServiceDue"),
      licenceExpiry: str(fd, "licenceExpiry"),
      insuranceExpiry: str(fd, "insuranceExpiry"),
    }).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app/fleet");
  redirect(`/app/fleet/${id}`);
}

export async function updateVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "id");
  try {
    updateVehicleAdmin(getDb(), actor, id, {
      status: str(fd, "status") || undefined,
      nextServiceDue: str(fd, "nextServiceDue"),
      licenceExpiry: str(fd, "licenceExpiry"),
      insuranceExpiry: str(fd, "insuranceExpiry"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/fleet/${id}`);
  return { ok: true, message: "Vehicle administrative record updated." };
}

export async function recordServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const id = str(fd, "vehicleId");
  try {
    recordService(getDb(), actor, {
      vehicleId: id,
      serviceDate: str(fd, "serviceDate"),
      serviceType: str(fd, "serviceType") as "Routine service",
      workshopRef: str(fd, "workshopRef"),
      costRef: str(fd, "costRef"),
      notes: str(fd, "notes"),
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/app/fleet/${id}`);
  return { ok: true, message: "Service record added." };
}

export async function createMaintenanceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  let id: string;
  try {
    const cost = str(fd, "estimatedCost");
    id = createMaintenance(getDb(), actor, {
      vehicleId: str(fd, "vehicleId"),
      serviceType: str(fd, "serviceType") as "Routine service",
      description: str(fd, "description"),
      estimatedCost: cost === "" ? undefined : Number(cost),
    }).id;
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/fleet/maintenance/${id}`);
}

const OK: MaintAction[] = ["VALIDATE", "APPROVE", "REJECT", "REFER", "START", "SUBMIT_COMPLETION", "RETURN_TO_WORKSHOP", "VERIFY"];

export async function maintenanceWorkflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const action = str(fd, "action") as MaintAction;
  if (!OK.includes(action)) return { error: "Unknown action." };
  try {
    maintenanceAction(getDb(), actor, str(fd, "id"), action, {
      note: str(fd, "note"),
      workshopRef: str(fd, "workshopRef") || undefined,
      costRef: str(fd, "costRef") || undefined,
    });
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Maintenance action recorded." };
}
