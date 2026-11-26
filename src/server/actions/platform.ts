"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { createBackup, runJobsNow, setMaintenanceMode, updateSetting, verifyBackup } from "../domain/platform";
import { str, toState, type ActionState } from "./result";

export async function runJobsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const r = await runJobsNow(getDb(), actor, str(fd, "job") || undefined);
    const failed = r.filter((x) => !x.ok).length;
    revalidatePath("/app/platform");
    return failed ? { error: `${failed} job(s) failed; see the error log.` } : { ok: true, message: `${r.length} job(s) ran successfully (${r.reduce((n, x) => n + x.processed, 0)} item(s) processed).` };
  } catch (e) {
    return toState(e);
  }
}

export async function backupAction(): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const r = await createBackup(getDb(), actor);
    revalidatePath("/app/platform");
    return { ok: true, message: `Backup verified: ${r.file} (${Math.round(r.size / 1024)} KB).` };
  } catch (e) {
    revalidatePath("/app/platform");
    return toState(e);
  }
}

export async function verifyBackupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await verifyBackup(getDb(), actor, Number(str(fd, "id")));
    revalidatePath("/app/platform");
    return { ok: true, message: "Checksum matches; the backup file is unchanged." };
  } catch (e) {
    revalidatePath("/app/platform");
    return toState(e);
  }
}

export async function maintenanceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await setMaintenanceMode(getDb(), actor, str(fd, "mode") === "ON", str(fd, "reason"));
    revalidatePath("/app", "layout");
    return { ok: true, message: `Maintenance mode ${str(fd, "mode") === "ON" ? "enabled" : "disabled"}.` };
  } catch (e) {
    return toState(e);
  }
}

export async function settingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await updateSetting(getDb(), actor, str(fd, "key"), str(fd, "value"));
    revalidatePath("/app/platform");
    return { ok: true, message: "Setting updated." };
  } catch (e) {
    return toState(e);
  }
}
