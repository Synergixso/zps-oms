import "server-only";
import { notFound } from "next/navigation";
import { getDb } from "../db/connection";
import { audit } from "../domain/audit";
import type { Permission } from "../domain/catalogue";
import { DomainError } from "../domain/core";
import { type Actor, hasPermission } from "../domain/policy";

/** Page-level check (defence in depth; the domain layer re-checks). Records denied page access. */
export function pageAllowed(actor: Actor, ...anyOf: Permission[]): boolean {
  if (anyOf.some((p) => hasPermission(actor, p))) return true;
  audit(getDb(), { actorId: actor.userId, action: `page.denied:${anyOf.join("|")}`, outcome: "DENIED", category: "SECURITY" });
  return false;
}

/** Runs a domain read; maps NOT_FOUND/FORBIDDEN to a 404 so record existence outside scope is not disclosed. */
export function loadOr404<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof DomainError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
}
