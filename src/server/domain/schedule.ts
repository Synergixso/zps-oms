/**
 * Module 16 — Administrative scheduling and availability (DEC-068).
 *
 * NON-SENSITIVE administrative scheduling only: meetings, deadlines, review appointments, training and
 * inspections of administrative records. There is no location, route, patrol, deployment or officer-position
 * field, and free text is screened for excluded operational terms, so the calendar cannot be used for
 * tactical scheduling.
 *
 * The calendar view merges three sources, each scoped server-side:
 *  1. administrative events of units the actor can see (schedule.view);
 *  2. dates the system already holds about records the actor may see — assignment review dates
 *     (assignment.view), manpower contribution deadlines (manpower.view) and correspondence follow-ups;
 *  3. the actor's own open tasks with a due date.
 * Derived entries are read-only and link to their source record.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS } from "./catalogue";
import { conflict, invalid, newId, notFound, nowIso, tenantOf, today } from "./core";
import { type Actor, can, hasPermission, requirePermission, scopeFor } from "./policy";

export const EVENT_CATEGORIES = { MEETING: "Administrative meeting", DEADLINE: "Administrative deadline", REVIEW: "Review appointment", TRAINING: "Training (administrative)", INSPECTION: "Records inspection", OTHER: "Other administrative" } as const;
export type EventCategory = keyof typeof EVENT_CATEGORIES;

/** Terms that would turn the calendar into an operational schedule (in addition to PROHIBITED_TERMS). */
const OPERATIONAL_TERMS = ["deployment", "roadblock", "checkpoint", "raid", "operation order", "convoy", "escort", "stake-out", "stakeout", "coordinates", "route"];

function screen(text: string | undefined | null) {
  if (!text) return;
  const lower = text.toLowerCase();
  const hit = [...PROHIBITED_TERMS, ...OPERATIONAL_TERMS].find((t) => new RegExp(`\\b${t.replace(/[-]/g, "\\-")}`).test(lower));
  if (hit) throw invalid(`"${hit}" relates to operational or excluded matters. The administrative calendar holds non-sensitive administrative events only.`);
}

const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the 24-hour format HH:MM.");
export const eventSchema = z.object({
  orgUnitId: z.string().min(1, "Select the organisation."),
  title: z.string().trim().min(3, "Enter a title of at least 3 characters.").max(160),
  category: z.enum(Object.keys(EVENT_CATEGORIES) as [EventCategory, ...EventCategory[]]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date."),
  startTime: time.optional().or(z.literal("").transform(() => undefined)),
  endTime: time.optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(600).optional(),
}).refine((d) => !d.endTime || !d.startTime || d.endTime > d.startTime, { message: "The end time must be after the start time.", path: ["endTime"] })
  .refine((d) => !d.endTime || !!d.startTime, { message: "Enter a start time before an end time.", path: ["startTime"] });

export interface CalendarEvent {
  id: string; org_unit_id: string; unit_name: string; title: string; category: EventCategory; event_date: string;
  start_time: string | null; end_time: string | null; notes: string | null; status: string; status_reason: string | null;
  created_by: string; created_by_name: string; created_at: string;
}
const EVENT_SELECT = `SELECT e.*, o.name AS unit_name, u.display_name AS created_by_name
  FROM admin_calendar_events e JOIN org_units o ON o.id = e.org_unit_id JOIN users u ON u.id = e.created_by`;

/** One calendar line: an administrative event or a dated item derived from another module. */
export interface CalendarItem {
  date: string; time: string | null; kind: "EVENT" | "ASSIGNMENT_REVIEW" | "CONTRIBUTION_DEADLINE" | "TASK" | "CORRESPONDENCE_FOLLOW_UP";
  title: string; detail: string; href: string; status?: string;
}

export async function createEvent(db: DB, actor: Actor, input: z.input<typeof eventSchema>): Promise<CalendarEvent> {
  const d = eventSchema.parse(input);
  await requirePermission(db, actor, "schedule.manage", d.orgUnitId, { type: "calendar_event" });
  screen(d.title);
  screen(d.notes);
  if (d.eventDate < today()) throw invalid("An administrative event cannot be scheduled in the past.");
  const clash = await one(db, "SELECT id FROM admin_calendar_events WHERE org_unit_id = ? AND event_date = ? AND title = ? AND status = 'SCHEDULED'", d.orgUnitId, d.eventDate, d.title);
  if (clash) throw conflict("This event is already scheduled for the organisation on that date.");
  const id = newId("ace");
  const t = nowIso();
  await tx(db, async (db) => {
    await run(db, `INSERT INTO admin_calendar_events (id, tenant_id, org_unit_id, title, category, event_date, start_time, end_time, notes, status, created_by, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?, 'SCHEDULED', ?, ?, ?)`,
      id, await tenantOf(db, d.orgUnitId), d.orgUnitId, d.title, d.category, d.eventDate, d.startTime ?? null, d.endTime ?? null, d.notes || null, actor.userId, t, t);
    await audit(db, { actorId: actor.userId, action: "schedule.event.create", category: "BUSINESS", entityType: "calendar_event", entityId: id, orgUnitId: d.orgUnitId, details: { category: d.category, date: d.eventDate } });
  });
  return (await one<CalendarEvent>(db, `${EVENT_SELECT} WHERE e.id = ?`, id))!;
}

export async function getEvent(db: DB, actor: Actor, id: string): Promise<CalendarEvent> {
  const e = await one<CalendarEvent>(db, `${EVENT_SELECT} WHERE e.id = ?`, id);
  if (!e || !can(actor, "schedule.view", e.org_unit_id)) {
    await audit(db, { actorId: actor.userId, action: "schedule.event.view", outcome: "DENIED", category: "SECURITY", entityType: "calendar_event", entityId: id });
    throw notFound();
  }
  return e;
}

/** Cancel or mark complete; a reason is required for cancellation. Only schedule.manage at the event's unit. */
export async function setEventStatus(db: DB, actor: Actor, id: string, status: "CANCELLED" | "COMPLETED", reason?: string) {
  const e = await getEvent(db, actor, id);
  await requirePermission(db, actor, "schedule.manage", e.org_unit_id, { type: "calendar_event", id });
  if (e.status !== "SCHEDULED") throw conflict("Only a scheduled event can be changed.");
  const r = reason?.trim() ?? "";
  if (status === "CANCELLED" && r.length < 5) throw invalid("Give a reason of at least 5 characters for cancelling.");
  screen(r);
  await tx(db, async (db) => {
    await run(db, "UPDATE admin_calendar_events SET status = ?, status_reason = ?, updated_at = ? WHERE id = ? AND status = 'SCHEDULED'", status, r || null, nowIso(), id);
    await audit(db, { actorId: actor.userId, action: `schedule.event.${status === "CANCELLED" ? "cancel" : "complete"}`, category: "BUSINESS", entityType: "calendar_event", entityId: id, orgUnitId: e.org_unit_id, details: { reason: r || undefined } });
  });
}

function unitFilter(actor: Actor, perm: Parameters<typeof scopeFor>[1], column: string): { sql: string; params: string[] } | null {
  const s = scopeFor(actor, perm);
  if (s.national) return { sql: "1=1", params: [] };
  if (!s.units.length) return null;
  return { sql: `${column} IN (${s.units.map(() => "?").join(",")})`, params: s.units };
}

/** Administrative events visible to the actor between two dates (inclusive). */
export async function listEvents(db: DB, actor: Actor, from: string, to: string, includeCancelled = false): Promise<CalendarEvent[]> {
  await requirePermission(db, actor, "schedule.view");
  const f = unitFilter(actor, "schedule.view", "e.org_unit_id")!;
  return await all<CalendarEvent>(db, `${EVENT_SELECT} WHERE ${f.sql} AND e.event_date BETWEEN ? AND ? ${includeCancelled ? "" : "AND e.status <> 'CANCELLED'"}
    ORDER BY e.event_date, e.start_time IS NULL, e.start_time, e.title LIMIT 1000`, ...f.params, from, to);
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** The merged administrative calendar for a date range (at most 93 days). */
export async function calendar(db: DB, actor: Actor, from: string, to: string): Promise<CalendarItem[]> {
  if (!isoDate.test(from) || !isoDate.test(to) || to < from) throw invalid("Choose a valid date range.");
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 93) throw invalid("Choose a range of at most three months.");
  const items: CalendarItem[] = [];
  if (hasPermission(actor, "schedule.view")) {
    for (const e of await listEvents(db, actor, from, to)) {
      items.push({ date: e.event_date, time: e.start_time, kind: "EVENT", title: e.title, detail: `${EVENT_CATEGORIES[e.category]} · ${e.unit_name}${e.end_time ? ` · until ${e.end_time}` : ""}`, href: `/app/calendar/${e.id}`, status: e.status });
    }
  }
  // Same scope as the assignment register: the officer's home unit or the area's responsible unit.
  const asgUnits = unitFilter(actor, "assignment.view", "x");
  if (asgUnits) {
    const asg = asgUnits.sql === "1=1" ? asgUnits : { sql: `(${asgUnits.sql.replace("x IN", "a.home_unit_id IN")} OR ${asgUnits.sql.replace("x IN", "ar.responsible_unit_id IN")})`, params: [...asgUnits.params, ...asgUnits.params] };
    const rows = await all<{ id: string; reference: string; review_date: string; full_name: string; area_name: string }>(db,
      `SELECT a.id, a.reference, a.review_date, CONCAT(p.surname, ', ', p.first_names) AS full_name, ar.name AS area_name FROM personnel_assignments a
         JOIN personnel_records p ON p.id = a.personnel_id JOIN operational_areas ar ON ar.id = a.area_id
        WHERE ${asg.sql} AND a.status = 'ACTIVE' AND a.review_date BETWEEN ? AND ? ORDER BY a.review_date LIMIT 500`, ...asg.params, from, to);
    for (const r of rows) items.push({ date: r.review_date, time: null, kind: "ASSIGNMENT_REVIEW", title: `Assignment review: ${r.reference}`, detail: `${r.full_name} · ${r.area_name}`, href: `/app/assignments/${r.id}` });
  }
  const mp = unitFilter(actor, "manpower.view", "c.contributing_unit_id");
  if (mp) {
    const rows = await all<{ id: string; reference: string; deadline: string; unit_name: string; status: string }>(db,
      `SELECT c.id, m.reference, m.contribution_deadline AS deadline, o.name AS unit_name, c.status FROM manpower_contributions c
         JOIN manpower_requests m ON m.id = c.request_id JOIN org_units o ON o.id = c.contributing_unit_id
        WHERE ${mp.sql} AND m.status = 'APPROVED' AND c.status IN ('PENDING','RETURNED') AND m.contribution_deadline BETWEEN ? AND ? ORDER BY m.contribution_deadline LIMIT 500`, ...mp.params, from, to);
    for (const r of rows) items.push({ date: r.deadline, time: null, kind: "CONTRIBUTION_DEADLINE", title: `Contribution due: ${r.reference}`, detail: r.unit_name, href: `/app/manpower/contributions/${r.id}`, status: r.status });
  }
  const tasks = await all<{ title: string; due_date: string; link: string | null }>(db,
    "SELECT title, due_date, link FROM administrative_tasks WHERE user_id = ? AND status = 'OPEN' AND due_date BETWEEN ? AND ? ORDER BY due_date LIMIT 300", actor.userId, from, to);
  for (const t of tasks) items.push({ date: t.due_date, time: null, kind: "TASK", title: t.title, detail: "My task", href: t.link ?? "/app/tasks" });
  const corr = await all<{ id: string; reference: string; subject: string; follow_up_date: string }>(db,
    "SELECT id, reference, subject, follow_up_date FROM correspondence WHERE assigned_to = ? AND status NOT IN ('CLOSED','FILED') AND follow_up_date BETWEEN ? AND ? ORDER BY follow_up_date LIMIT 300", actor.userId, from, to);
  for (const c of corr) items.push({ date: c.follow_up_date, time: null, kind: "CORRESPONDENCE_FOLLOW_UP", title: `Follow up: ${c.reference}`, detail: c.subject, href: `/app/correspondence/${c.id}` });
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99") || a.title.localeCompare(b.title));
}

/** Units where the actor may schedule events (for the form). */
export async function schedulableUnits(db: DB, actor: Actor) {
  const f = unitFilter(actor, "schedule.manage", "o.id");
  if (!f) return [];
  return await all<{ value: string; label: string }>(db, `SELECT o.id AS value, o.name AS label FROM org_units o WHERE ${f.sql} AND o.status = 'ACTIVE' ORDER BY o.name LIMIT 500`, ...f.params);
}
