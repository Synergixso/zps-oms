import "server-only";
import { notFound } from "next/navigation";
import { getDb } from "../db/connection";
import { audit } from "../domain/audit";
import type { Permission } from "../domain/catalogue";
import { DomainError } from "../domain/core";
import { type Actor, hasPermission } from "../domain/policy";

/** Page-level check (defence in depth; the domain layer re-checks). Records denied page access. */
export async function pageAllowed(actor: Actor, ...anyOf: Permission[]): Promise<boolean> {
  if (anyOf.some((p) => hasPermission(actor, p))) return true;
  await audit(getDb(), { actorId: actor.userId, action: `page.denied:${anyOf.join("|")}`, outcome: "DENIED", category: "SECURITY" });
  return false;
}

/** Runs a domain read; maps NOT_FOUND/FORBIDDEN to a 404 so record existence outside scope is not disclosed. */
export async function loadOr404<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
}
