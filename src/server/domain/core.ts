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

/** Calendar arithmetic on YYYY-MM-DD dates in UTC (replaces SQLite date(?, '+N days')). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Adds calendar months, clamping to the last day of the target month (e.g. 31 Aug + 6 months = 28/29 Feb). */
export function addMonths(date: string, months: number): string {
  const [y, m, day] = date.slice(0, 10).split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

/** The tenant that owns an organisation unit (records inherit their organisation's tenant). */
export async function tenantOf(db: DB, orgUnitId: string): Promise<string> {
  const row = await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = ?", orgUnitId);
  if (!row) throw invalid("Organisation not found.");
  return row.tenant_id;
}

/** Generates a sequential human reference such as REQ-2026-000014. */
export async function nextReference(db: DB, prefix: string, table: string): Promise<string> {
  const year = nowIso().slice(0, 4);
  const like = `${prefix}-${year}-%`;
  const row = await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM ${table} WHERE reference LIKE ?`, like);
  return `${prefix}-${year}-${String((row?.c ?? 0) + 1).padStart(6, "0")}`;
}

export const NOTIFICATION_CATEGORIES = {
  GENERAL: "General",
  APPROVAL: "Approvals and decisions",
  MANPOWER: "Manpower and contributions",
  ASSIGNMENT: "Assignments and transfers",
  RENEWAL: "Tenure reviews and renewals",
  FLEET: "Fleet maintenance",
  ASSET: "Asset inspections and returns",
  ACCOUNT: "My account and access",
  SYSTEM: "Platform and backups",
} as const;
export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;
/** Categories a user may switch off (decisions about their own work and account notices always arrive). */
export const OPTIONAL_CATEGORIES: NotificationCategory[] = ["MANPOWER", "ASSIGNMENT", "RENEWAL", "FLEET", "ASSET", "SYSTEM"];

/**
 * In-application notification (external channels are disabled, DEC-013).
 * `dedupeKey` makes automated reminders idempotent; optional categories respect user preferences.
 */
export async function notify(db: DB, userId: string, title: string, body: string, link?: string, opts: { category?: NotificationCategory; dedupeKey?: string } = {}) {
  const category = opts.category ?? "GENERAL";
  if (OPTIONAL_CATEGORIES.includes(category)) {
    const pref = await one<{ enabled: number }>(db, "SELECT enabled FROM notification_preferences WHERE user_id = ? AND category = ?", userId, category);
    if (pref && pref.enabled === 0) return false;
  }
  const r = await run(
    db,
    "INSERT IGNORE INTO notifications (id, user_id, title, body, link, created_at, category, dedupe_key) VALUES (?,?,?,?,?,?,?,?)",
    newId("ntf"),
    userId,
    title,
    body,
    link ?? null,
    nowIso(),
    category,
    opts.dedupeKey ? `${opts.dedupeKey}|${userId}`.slice(0, 160) : null,
  );
  return r.changes > 0;
}
