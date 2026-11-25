import "server-only";
import { ZodError } from "zod";
import { DomainError } from "../domain/core";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

/** Converts domain/validation errors into user-safe messages. Unexpected errors are logged without payloads. */
export function toState(e: unknown): ActionState {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
  console.error("[zps-oms] unexpected action error:", e instanceof Error ? e.name + ": " + e.message : "unknown");
  return { error: "An unexpected error occurred. The action was not completed." };
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
