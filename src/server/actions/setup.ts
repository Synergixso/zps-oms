"use server";
import { getDb } from "../db/connection";
import { createFirstSuperadmin } from "../domain/setup";
import { str, toState, type ActionState } from "./result";

/** One-time creation of the first Superadmin on an empty database. The temporary password is shown once. */
export async function firstAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await createFirstSuperadmin(getDb(), {
      token: str(fd, "token"), username: str(fd, "username"), displayName: str(fd, "displayName"), positionTitle: str(fd, "positionTitle"),
    });
    return { ok: true, message: `Superadmin “${r.username}” created. Temporary password (shown once, change it at first sign-in): ${r.temporaryPassword}` };
  } catch (e) {
    return toState(e);
  }
}
