/**
 * Scheduled report delivery (Module 12; known issue 5).
 *
 * A user schedules one of the reports available to them (optionally a saved custom view) daily, weekly or
 * monthly. The automation engine generates the CSV through the SAME audited export path as an interactive
 * download (`exportReport`: report.export, approved fields, scope, export register) and delivers it inside
 * the application (notification + "My deliveries"); no e-mail or external channel (DEC-013).
 *
 * Safety:
 *  - a schedule runs under the role context (assignment) it was created in, re-loaded and re-validated at every
 *    run; if that assignment or the permission has gone, the schedule is SUSPENDED and the owner told;
 *  - deliveries can be downloaded only by their owner, only while the report is still available to them;
 *  - deliveries are kept for 30 days.
 */
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "./audit";
import { conflict, invalid, newId, notFound, notify, nowIso } from "./core";
import { type Actor, hasPermission, loadActor, requirePermission } from "./policy";
import { availableReports, exportReport, getSavedReport, REPORTS } from "./reports";

export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABEL: Record<Frequency, string> = { DAILY: "Daily", WEEKLY: "Weekly (Mondays)", MONTHLY: "Monthly (1st of the month)" };
export const MAX_ACTIVE_SCHEDULES = 10;
export const DELIVERY_RETENTION_DAYS = 30;
/** Deliveries are generated at 06:00 Africa/Lusaka (UTC+2). */
const RUN_HOUR_UTC = 4;

/** Next run strictly after `from`: daily 06:00, Mondays 06:00, or the 1st of the month 06:00 (Lusaka). */
export function nextRunAfter(from: Date, f: Frequency): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), RUN_HOUR_UTC));
  if (f === "MONTHLY") {
    d.setUTCDate(1);
    if (d <= from) d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString();
  }
  while (d <= from || (f === "WEEKLY" && d.getUTCDay() !== 1)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export interface ScheduleRow {
  id: string; report_code: string; saved_report_id: string | null; saved_name: string | null; frequency: Frequency; status: string;
  status_reason: string | null; next_run_at: string; last_run_at: string | null; created_at: string; unit_name: string | null;
}

export async function listSchedules(db: DB, actor: Actor): Promise<ScheduleRow[]> {
  return await all<ScheduleRow>(db,
    `SELECT s.*, sr.name AS saved_name, o.name AS unit_name FROM report_schedules s LEFT JOIN saved_reports sr ON sr.id = s.saved_report_id
       LEFT JOIN role_assignments a ON a.id = s.assignment_id LEFT JOIN org_units o ON o.id = a.org_unit_id
      WHERE s.user_id = ? AND s.status <> 'CANCELLED' ORDER BY s.created_at DESC`, actor.userId);
}

export async function createSchedule(db: DB, actor: Actor, input: { code: string; frequency: string; savedReportId?: string | null }) {
  await requirePermission(db, actor, "report.export", undefined, { type: "report", id: input.code });
  if (!(FREQUENCIES as readonly string[]).includes(input.frequency)) throw invalid("Choose daily, weekly or monthly.");
  if (!availableReports(actor).some((r) => r.code === input.code)) throw notFound();
  const context = actor.activeAssignmentId ?? (actor.assignments.length === 1 ? actor.assignments[0].id : null);
  if (!context) throw invalid("Select a role context before scheduling a report.");
  let savedId: string | null = null;
  if (input.savedReportId) {
    const saved = await getSavedReport(db, actor, input.savedReportId);
    if (!saved || saved.report_code !== input.code) throw notFound();
    savedId = saved.id;
  }
  const active = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM report_schedules WHERE user_id = ? AND status = 'ACTIVE'", actor.userId))!.c);
  if (active >= MAX_ACTIVE_SCHEDULES) throw conflict(`You already have ${MAX_ACTIVE_SCHEDULES} active schedules. Cancel one first.`);
  if (await one(db, "SELECT id FROM report_schedules WHERE user_id = ? AND report_code = ? AND frequency = ? AND status = 'ACTIVE' AND (saved_report_id <=> ?)", actor.userId, input.code, input.frequency, savedId)) {
    throw conflict("This report is already scheduled at that frequency.");
  }
  const id = newId("rsc");
  const t = nowIso();
  await run(db, "INSERT INTO report_schedules (id, user_id, assignment_id, report_code, saved_report_id, frequency, status, next_run_at, created_at) VALUES (?,?,?,?,?,?, 'ACTIVE', ?, ?)",
    id, actor.userId, context, input.code, savedId, input.frequency, nextRunAfter(new Date(t), input.frequency as Frequency), t);
  await audit(db, { actorId: actor.userId, action: "report.schedule.create", category: "EXPORT", entityType: "report_schedule", entityId: id, details: { report: input.code, frequency: input.frequency, savedReportId: savedId } });
  return id;
}

export async function cancelSchedule(db: DB, actor: Actor, id: string) {
  const s = await one<{ id: string; status: string }>(db, "SELECT id, status FROM report_schedules WHERE id = ? AND user_id = ?", id, actor.userId);
  if (!s) throw notFound();
  if (s.status === "CANCELLED") return;
  await run(db, "UPDATE report_schedules SET status = 'CANCELLED', status_reason = 'Cancelled by the owner' WHERE id = ?", id);
  await audit(db, { actorId: actor.userId, action: "report.schedule.cancel", category: "EXPORT", entityType: "report_schedule", entityId: id });
}

export interface DeliveryRow { id: string; report_code: string; file_name: string; row_count: number; created_at: string; downloaded_at: string | null }

export async function listDeliveries(db: DB, actor: Actor, limit = 20): Promise<DeliveryRow[]> {
  const rows = await all<DeliveryRow>(db,
    "SELECT id, report_code, file_name, row_count, created_at, downloaded_at FROM report_deliveries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", actor.userId, limit);
  const allowed = new Set(availableReports(actor).map((r) => r.code));
  return rows.filter((r) => allowed.has(r.report_code));
}

/** Owner-only download, and only while the report is still within the owner's authorised functions. */
export async function getDelivery(db: DB, actor: Actor, id: string) {
  const d = await one<{ id: string; user_id: string; report_code: string; file_name: string; content: string }>(db,
    "SELECT id, user_id, report_code, file_name, content FROM report_deliveries WHERE id = ?", id);
  if (!d || d.user_id !== actor.userId || !hasPermission(actor, "report.export") || !availableReports(actor).some((r) => r.code === d.report_code)) {
    await audit(db, { actorId: actor.userId, action: "report.delivery.download", outcome: "DENIED", category: "SECURITY", entityType: "report_delivery", entityId: id.slice(0, 40) });
    throw notFound();
  }
  await run(db, "UPDATE report_deliveries SET downloaded_at = COALESCE(downloaded_at, ?) WHERE id = ?", nowIso(), id);
  await audit(db, { actorId: actor.userId, action: "report.delivery.download", category: "EXPORT", entityType: "report_delivery", entityId: id, details: { report: d.report_code } });
  return { filename: d.file_name, csv: d.content };
}

async function suspend(db: DB, s: { id: string; user_id: string; report_code: string }, reason: string) {
  await run(db, "UPDATE report_schedules SET status = 'SUSPENDED', status_reason = ? WHERE id = ?", reason.slice(0, 200), s.id);
  await audit(db, { actorId: null, action: "report.schedule.suspend", category: "EXPORT", entityType: "report_schedule", entityId: s.id, details: { reason } });
  const name = REPORTS.find((r) => r.code === s.report_code)?.name ?? s.report_code;
  await notify(db, s.user_id, "Scheduled report suspended", `${name}: ${reason}`, "/app/reports", { category: "GENERAL", dedupeKey: `rsc-suspend:${s.id}` });
}

/** Automation job body: generate every due delivery, suspend schedules that are no longer authorised, expire old deliveries. */
export async function runDueSchedules(db: DB, now = new Date()): Promise<{ delivered: number; suspended: number; expired: number }> {
  const t = now.toISOString();
  let delivered = 0, suspended = 0;
  const due = await all<{ id: string; user_id: string; assignment_id: string; report_code: string; saved_report_id: string | null; frequency: Frequency }>(db,
    "SELECT id, user_id, assignment_id, report_code, saved_report_id, frequency FROM report_schedules WHERE status = 'ACTIVE' AND next_run_at <= ? ORDER BY next_run_at LIMIT 200", t);
  for (const s of due) {
    const actor = await loadActor(db, s.user_id, s.assignment_id);
    if (!actor || actor.activeAssignmentId !== s.assignment_id) { await suspend(db, s, "The role assignment it was scheduled under is no longer active."); suspended++; continue; }
    if (!hasPermission(actor, "report.export") || !availableReports(actor).some((r) => r.code === s.report_code)) { await suspend(db, s, "The report or export permission is no longer part of your role."); suspended++; continue; }
    const saved = s.saved_report_id ? await getSavedReport(db, actor, s.saved_report_id) : undefined;
    if (s.saved_report_id && !saved) { await suspend(db, s, "The saved report view was removed."); suspended++; continue; }
    const out = await exportReport(db, actor, s.report_code, saved?.fields, { sortField: saved?.sort_field, sortDir: saved?.sort_dir, source: "scheduled" });
    const id = newId("rdl");
    await run(db, "INSERT INTO report_deliveries (id, schedule_id, user_id, report_code, file_name, row_count, content, created_at) VALUES (?,?,?,?,?,?,?,?)",
      id, s.id, s.user_id, s.report_code, out.filename, out.rows, out.csv, t);
    await run(db, "UPDATE report_schedules SET last_run_at = ?, next_run_at = ? WHERE id = ?", t, nextRunAfter(now, s.frequency), s.id);
    const name = saved?.name ?? REPORTS.find((r) => r.code === s.report_code)?.name ?? s.report_code;
    await notify(db, s.user_id, `Scheduled report ready: ${name}`, `${out.rows} row(s). Available for ${DELIVERY_RETENTION_DAYS} days.`, `/app/reports/deliveries/${id}`, { category: "GENERAL", dedupeKey: `rdl:${id}` });
    delivered++;
  }
  const expired = (await run(db, "DELETE FROM report_deliveries WHERE created_at < ?", new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 86400000).toISOString())).changes;
  return { delivered, suspended, expired };
}
