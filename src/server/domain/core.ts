import crypto from "node:crypto";
import type { DB } from "../db/connection";
import { one, run } from "../db/connection";

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

/** Injectable clock so tests can exercise expiry deterministically. */
let clockOverride: (() => Date) | null = null;
export const now = () => (clockOverride ? clockOverride() : new Date());
export const nowIso = () => now().toISOString();
export const today = () => nowIso().slice(0, 10);
export function setClock(fn: (() => Date) | null) {
  clockOverride = fn;
}

/** Domain error codes map to user-safe messages; never include internal detail. */
export type ErrorCode = "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT" | "UNAUTHENTICATED";
export class DomainError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}
export const forbidden = (msg = "You are not authorised to perform this action.") => new DomainError("FORBIDDEN", msg);
export const notFound = (msg = "Record not found or not within your authorised scope.") => new DomainError("NOT_FOUND", msg);
export const invalid = (msg: string) => new DomainError("INVALID", msg);
export const conflict = (msg: string) => new DomainError("CONFLICT", msg);

/** Generates a sequential human reference such as REQ-2026-000014. */
export function nextReference(db: DB, prefix: string, table: string): string {
  const year = nowIso().slice(0, 4);
  const like = `${prefix}-${year}-%`;
  const row = one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM ${table} WHERE reference LIKE ?`, like);
  return `${prefix}-${year}-${String((row?.c ?? 0) + 1).padStart(6, "0")}`;
}

export function notify(db: DB, userId: string, title: string, body: string, link?: string) {
  run(
    db,
    "INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?,?,?,?,?,?)",
    newId("ntf"),
    userId,
    title,
    body,
    link ?? null,
    nowIso(),
  );
}
