/**
 * M13 — Notifications, tasks and administrative reminders (in-application only).
 * Every function acts only on the signed-in user's own notifications, tasks and preferences.
 */
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "./audit";
import { NOTIFICATION_CATEGORIES, OPTIONAL_CATEGORIES, invalid, notFound, nowIso, today, type NotificationCategory } from "./core";
import type { Actor } from "./policy";

export interface TaskRow { id: string; title: string; body: string | null; link: string | null; category: string; due_date: string | null; status: string; created_at: string; completed_at: string | null }

export async function listTasks(db: DB, actor: Actor, view: "OPEN" | "OVERDUE" | "DONE" = "OPEN"): Promise<TaskRow[]> {
  const where = view === "DONE" ? "status = 'DONE'" : view === "OVERDUE" ? "status = 'OPEN' AND due_date IS NOT NULL AND due_date < ?" : "status = 'OPEN'";
  return all<TaskRow>(db, `SELECT id, title, body, link, category, due_date, status, created_at, completed_at FROM administrative_tasks WHERE user_id = ? AND ${where}
                            ORDER BY due_date IS NULL, due_date, created_at DESC LIMIT 300`, actor.userId, ...(view === "OVERDUE" ? [today()] : []));
}

export async function taskCounts(db: DB, actor: Actor) {
  const r = await one<{ open: number; overdue: number }>(db,
    "SELECT SUM(status = 'OPEN') AS open, SUM(status = 'OPEN' AND due_date IS NOT NULL AND due_date < ?) AS overdue FROM administrative_tasks WHERE user_id = ?", today(), actor.userId);
  return { open: Number(r?.open ?? 0), overdue: Number(r?.overdue ?? 0) };
}

export async function completeTask(db: DB, actor: Actor, id: string) {
  const t = await one<{ status: string }>(db, "SELECT status FROM administrative_tasks WHERE id = ? AND user_id = ?", id, actor.userId);
  if (!t) throw notFound();
  if (t.status !== "OPEN") throw invalid("This task is already closed.");
  await run(db, "UPDATE administrative_tasks SET status = 'DONE', completed_at = ? WHERE id = ?", nowIso(), id);
  await audit(db, { actorId: actor.userId, action: "task.complete", category: "BUSINESS", entityType: "task", entityId: id });
}

export async function listNotifications(db: DB, actor: Actor, category?: string, unreadOnly = false) {
  const params: unknown[] = [actor.userId];
  let where = "user_id = ?";
  if (category && category in NOTIFICATION_CATEGORIES) { where += " AND category = ?"; params.push(category); }
  if (unreadOnly) where += " AND read_at IS NULL";
  return all<{ id: string; title: string; body: string; link: string | null; category: string; created_at: string; read_at: string | null }>(db,
    `SELECT id, title, body, link, category, created_at, read_at FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT 300`, ...params);
}

export async function markRead(db: DB, actor: Actor, id: string) {
  await run(db, "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", nowIso(), id, actor.userId);
}

export async function preferences(db: DB, actor: Actor) {
  const rows = await all<{ category: string; enabled: number }>(db, "SELECT category, enabled FROM notification_preferences WHERE user_id = ?", actor.userId);
  const set = new Map(rows.map((r) => [r.category, r.enabled === 1]));
  return (Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map((c) => ({
    category: c, label: NOTIFICATION_CATEGORIES[c], optional: OPTIONAL_CATEGORIES.includes(c), enabled: OPTIONAL_CATEGORIES.includes(c) ? set.get(c) ?? true : true,
  }));
}

export async function savePreferences(db: DB, actor: Actor, enabled: string[]) {
  for (const c of OPTIONAL_CATEGORIES) {
    const on = enabled.includes(c) ? 1 : 0;
    await run(db, "INSERT INTO notification_preferences (user_id, category, enabled) VALUES (?,?,?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)", actor.userId, c, on);
  }
  await audit(db, { actorId: actor.userId, action: "notification.preferences.update", category: "CONFIG", details: { enabled } });
}
