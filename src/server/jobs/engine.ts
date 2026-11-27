/**
 * Automation engine (Master Execution Prompt Part IX).
 *
 * - In-process scheduler started from `instrumentation.ts` (XAMPP's MySQL provides no job scheduler).
 * - Every job has a defined trigger (schedule / manual / start-up), conditions, business logic, an execution
 *   record in `job_runs`, error handling with retries (exponential back-off), and audit or notification where relevant.
 * - A MySQL named lock prevents overlapping runs across server processes.
 * - Jobs never approve anything: they only apply already-approved, effective-dated changes, raise reminders
 *   and tasks, expire temporary access, and monitor backups.
 */
import type { DB } from "../db/connection";
import { all, one, run } from "../db/connection";
import { audit } from "../domain/audit";
import { addDays, newId, nowIso, notify, today, type NotificationCategory } from "../domain/core";
import { applyDueChanges } from "../domain/org";
import { applyDueAssignmentEvents, tenurePolicy } from "../domain/assignments";

export interface JobResult { processed: number; message?: string }
export interface JobDef { name: string; title: string; description: string; run: (db: DB) => Promise<JobResult> }

/** Users holding `perm` over `unitId` (assignment at the unit, or SUBTREE/NATIONAL coverage at an ancestor). */
export async function usersWithPermissionAt(db: DB, perm: string, unitId: string): Promise<string[]> {
  const t = nowIso();
  const rows = await all<{ user_id: string }>(db,
    `SELECT DISTINCT ra.user_id FROM role_assignments ra
       JOIN users u ON u.id = ra.user_id AND u.status = 'ACTIVE'
       JOIN role_permissions rp ON rp.role_code = ra.role_code AND rp.permission = ?
       JOIN org_unit_closure c ON c.ancestor_id = ra.org_unit_id AND c.descendant_id = ?
      WHERE ra.revoked_at IS NULL AND ra.valid_from <= ? AND (ra.valid_to IS NULL OR ra.valid_to > ?)
        AND (c.depth = 0 OR rp.coverage IN ('SUBTREE','NATIONAL'))`, perm, unitId, t, t);
  return rows.map((r) => r.user_id);
}

/** Users with an active delegation for `domain` at `unitId` or an ancestor. */
export async function delegatesAt(db: DB, domain: string, unitId: string): Promise<string[]> {
  const t = nowIso();
  const rows = await all<{ user_id: string }>(db,
    `SELECT DISTINCT d.user_id FROM delegations d JOIN org_unit_closure c ON c.ancestor_id = d.org_unit_id AND c.descendant_id = ?
      WHERE d.domain = ? AND d.revoked_at IS NULL AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?)`, unitId, domain, t, t);
  return rows.map((r) => r.user_id);
}

/** Creates (idempotently, by source key) an administrative task. */
export async function createTask(db: DB, input: { userId: string; title: string; body?: string; link?: string; category?: NotificationCategory; dueDate?: string | null; sourceKey?: string; createdBy?: string | null }) {
  const r = await run(db,
    `INSERT IGNORE INTO administrative_tasks (id, user_id, title, body, link, category, due_date, status, source_key, created_by, created_at) VALUES (?,?,?,?,?,?,?, 'OPEN', ?,?,?)`,
    newId("tsk"), input.userId, input.title.slice(0, 200), input.body?.slice(0, 500) ?? null, input.link ?? null, input.category ?? "GENERAL", input.dueDate ?? null,
    input.sourceKey ? input.sourceKey.slice(0, 160) : null, input.createdBy ?? null, nowIso());
  return r.changes > 0;
}

/** Closes open automated tasks whose source matches a prefix (e.g. when the underlying matter is resolved). */
async function closeTasks(db: DB, likePrefix: string) {
  return (await run(db, "UPDATE administrative_tasks SET status = 'DONE', completed_at = ? WHERE status = 'OPEN' AND source_key LIKE ?", nowIso(), `${likePrefix}%`)).changes;
}

async function setting(db: DB, key: string, fallback: number) {
  const v = Number((await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = ?", key))?.value);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const JOBS: JobDef[] = [
  {
    name: "org.effective-changes",
    title: "Apply effective-dated organisation changes",
    description: "Applies approved structural changes whose effective date has arrived and rebuilds the hierarchy.",
    run: async (db) => {
      const n = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM org_change_requests WHERE status = 'APPROVED' AND effective_date <= ?", today()))?.c ?? 0);
      await applyDueChanges(db);
      return { processed: n };
    },
  },
  {
    name: "assignment.time-events",
    title: "Assignment commencement and review-due flags",
    description: "Activates approved assignments on their commencement date and flags assignments entering the review window.",
    run: async (db) => {
      const before = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM disposition_history"))?.c ?? 0);
      await applyDueAssignmentEvents(db);
      const after = Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM disposition_history"))?.c ?? 0);
      return { processed: after - before };
    },
  },
  {
    name: "manpower.contribution-reminders",
    title: "Contribution reminders and overdue tracking",
    description: "Reminds contributing units two days before the deadline and flags overdue contributions to the originator.",
    run: async (db) => {
      const t = today();
      const rows = await all<{ id: string; request_id: string; reference: string; contributing_unit_id: string; unit_name: string; required_count: number; deadline: string; requested_by: string }>(db,
        `SELECT c.id, c.request_id, m.reference, c.contributing_unit_id, o.name AS unit_name, c.required_count, m.contribution_deadline AS deadline, m.requested_by
           FROM manpower_contributions c JOIN manpower_requests m ON m.id = c.request_id JOIN org_units o ON o.id = c.contributing_unit_id
          WHERE m.status = 'APPROVED' AND c.status IN ('PENDING','RETURNED') AND m.contribution_deadline IS NOT NULL AND m.contribution_deadline <= ?`, addDays(t, 2));
      let n = 0;
      for (const c of rows) {
        const overdue = c.deadline < t;
        for (const u of await usersWithPermissionAt(db, "manpower.contribute", c.contributing_unit_id)) {
          if (await notify(db, u, `${overdue ? "Overdue" : "Due soon"}: contribution for ${c.reference}`, `${c.unit_name} must submit ${c.required_count} officer(s) by ${c.deadline}.`, `/app/manpower/contributions/${c.id}`, { category: "MANPOWER", dedupeKey: `contrib:${c.id}:${overdue ? "overdue" : "due"}` })) n++;
          await createTask(db, { userId: u, title: `Submit contribution for ${c.reference} (${c.unit_name})`, link: `/app/manpower/contributions/${c.id}`, category: "MANPOWER", dueDate: c.deadline, sourceKey: `contrib:${c.id}:${u}` });
        }
        if (overdue) await notify(db, c.requested_by, `Contribution overdue: ${c.reference}`, `${c.unit_name} has not submitted its contribution (deadline ${c.deadline}).`, `/app/manpower/${c.request_id}`, { category: "MANPOWER", dedupeKey: `contrib-overdue:${c.id}` });
      }
      // Close contribution tasks for submissions that are no longer pending.
      const resolved = await all<{ id: string }>(db, "SELECT c.id FROM manpower_contributions c WHERE c.status IN ('SUBMITTED','ACCEPTED')");
      for (const r of resolved) await closeTasks(db, `contrib:${r.id}:`);
      return { processed: n, message: `${rows.length} contribution(s) due or overdue` };
    },
  },
  {
    name: "assignment.review-reminders",
    title: "Tenure review and renewal reminders",
    description: "Notifies delegated approvers of active assignments inside the review window and creates review tasks.",
    run: async (db) => {
      const policy = await tenurePolicy(db);
      const rows = await all<{ id: string; reference: string; responsible_unit_id: string; review_date: string; name: string; area: string }>(db,
        `SELECT a.id, a.reference, a.responsible_unit_id, a.review_date, CONCAT(p.surname, ', ', p.first_names) AS name, ar.name AS area
           FROM personnel_assignments a JOIN personnel_records p ON p.id = a.personnel_id JOIN operational_areas ar ON ar.id = a.area_id
          WHERE a.status = 'ACTIVE' AND a.review_date <= ?`, addDays(today(), policy.reviewWindowDays));
      let n = 0;
      for (const a of rows) {
        for (const u of await delegatesAt(db, "ASSIGNMENT", a.responsible_unit_id)) {
          if (await notify(db, u, `Review due: ${a.reference}`, `${a.name} (${a.area}) — review date ${a.review_date}.`, `/app/assignments/${a.id}`, { category: "RENEWAL", dedupeKey: `review:${a.id}:${a.review_date}` })) n++;
          await createTask(db, { userId: u, title: `Review assignment ${a.reference} — ${a.name}`, link: `/app/assignments/${a.id}`, category: "RENEWAL", dueDate: a.review_date, sourceKey: `review:${a.id}:${a.review_date}:${u}` });
        }
      }
      // Reviews already decided (review date moved or assignment closed) close their tasks.
      const open = await all<{ source_key: string }>(db, "SELECT source_key FROM administrative_tasks WHERE status = 'OPEN' AND source_key LIKE 'review:%'");
      for (const t of open) {
        const [, id, date] = t.source_key.split(":");
        const a = await one<{ status: string; review_date: string }>(db, "SELECT status, review_date FROM personnel_assignments WHERE id = ?", id);
        if (!a || a.status !== "ACTIVE" || a.review_date !== date) await run(db, "UPDATE administrative_tasks SET status = 'DONE', completed_at = ? WHERE source_key = ?", nowIso(), t.source_key);
      }
      return { processed: n, message: `${rows.length} assignment(s) in the review window` };
    },
  },
  {
    name: "workflow.overdue-approvals",
    title: "Overdue approval escalation",
    description: "Reminds delegated approvers about manpower requests and assignment proposals pending longer than the configured SLA.",
    run: async (db) => {
      const sla = await setting(db, "request.sla_days", 10);
      const cutoff = new Date(Date.now() - sla * 86400000).toISOString();
      let n = 0;
      for (const m of await all<{ id: string; reference: string; approval_unit_id: string }>(db, "SELECT id, reference, approval_unit_id FROM manpower_requests WHERE status IN ('SUBMITTED','UNDER_REVIEW','RECOMMENDED') AND submitted_at < ?", cutoff)) {
        for (const u of await delegatesAt(db, "MANPOWER", m.approval_unit_id)) if (await notify(db, u, `Overdue decision: ${m.reference}`, `This manpower request has waited more than ${sla} days for a decision.`, `/app/manpower/${m.id}`, { category: "APPROVAL", dedupeKey: `overdue-mpr:${m.id}` })) n++;
      }
      for (const a of await all<{ id: string; reference: string; responsible_unit_id: string }>(db, "SELECT id, reference, responsible_unit_id FROM personnel_assignments WHERE status = 'PENDING_APPROVAL' AND created_at < ?", cutoff)) {
        for (const u of await delegatesAt(db, "ASSIGNMENT", a.responsible_unit_id)) if (await notify(db, u, `Overdue decision: ${a.reference}`, `This assignment proposal has waited more than ${sla} days.`, `/app/assignments/${a.id}`, { category: "APPROVAL", dedupeKey: `overdue-asg:${a.id}` })) n++;
      }
      return { processed: n };
    },
  },
  {
    name: "access.temporary-expiry",
    title: "Expire temporary access",
    description: "Formally revokes role assignments and delegations whose validity has ended, audits it and informs the user.",
    run: async (db) => {
      const t = nowIso();
      const expired = await all<{ id: string; user_id: string; role_code: string; org_unit_id: string; valid_to: string }>(db, "SELECT id, user_id, role_code, org_unit_id, valid_to FROM role_assignments WHERE revoked_at IS NULL AND valid_to IS NOT NULL AND valid_to <= ?", t);
      for (const a of expired) {
        await run(db, "UPDATE role_assignments SET revoked_at = valid_to, revoke_reason = 'Validity ended (automatic)' WHERE id = ? AND revoked_at IS NULL", a.id);
        await audit(db, { actorId: null, action: "iam.assignment.expired", category: "IAM", entityType: "user", entityId: a.user_id, orgUnitId: a.org_unit_id, details: { role: a.role_code, validTo: a.valid_to } });
        await notify(db, a.user_id, "A role assignment has expired", `${a.role_code.replace(/_/g, " ").toLowerCase()} access ended on ${a.valid_to.slice(0, 10)}.`, "/app/profile", { category: "ACCOUNT", dedupeKey: `expired:${a.id}` });
      }
      const dels = await all<{ id: string; user_id: string; org_unit_id: string; domain: string }>(db, "SELECT id, user_id, org_unit_id, domain FROM delegations WHERE revoked_at IS NULL AND valid_to IS NOT NULL AND valid_to <= ?", t);
      for (const d of dels) {
        await run(db, "UPDATE delegations SET revoked_at = valid_to WHERE id = ? AND revoked_at IS NULL", d.id);
        await audit(db, { actorId: null, action: "iam.delegation.expired", category: "IAM", entityType: "user", entityId: d.user_id, orgUnitId: d.org_unit_id, details: { domain: d.domain } });
      }
      return { processed: expired.length + dels.length };
    },
  },
  {
    name: "fleet.maintenance-reminders",
    title: "Fleet service and documentation reminders",
    description: "Reminds fleet officers of services due within 14 days and licences or insurance expiring within 30 days.",
    run: async (db) => {
      const t = today();
      let n = 0;
      const vehicles = await all<{ id: string; fleet_ref: string; custody_org_id: string; next_service_due: string | null; licence_expiry: string | null; insurance_expiry: string | null }>(db,
        "SELECT id, fleet_ref, custody_org_id, next_service_due, licence_expiry, insurance_expiry FROM vehicles WHERE status IN ('IN_SERVICE','UNDER_MAINTENANCE')");
      for (const v of vehicles) {
        const items: Array<[string, string, string]> = [];
        if (v.next_service_due && v.next_service_due <= addDays(t, 14)) items.push(["service", v.next_service_due, `Service due ${v.next_service_due}`]);
        if (v.licence_expiry && v.licence_expiry <= addDays(t, 30)) items.push(["licence", v.licence_expiry, `Licence expires ${v.licence_expiry}`]);
        if (v.insurance_expiry && v.insurance_expiry <= addDays(t, 30)) items.push(["insurance", v.insurance_expiry, `Insurance expires ${v.insurance_expiry}`]);
        for (const [kind, date, text] of items) {
          for (const u of await usersWithPermissionAt(db, "fleet.manage", v.custody_org_id)) {
            if (await notify(db, u, `${v.fleet_ref}: ${text}`, "Administrative fleet reminder.", `/app/fleet/${v.id}`, { category: "FLEET", dedupeKey: `fleet:${v.id}:${kind}:${date}` })) n++;
          }
        }
      }
      return { processed: n };
    },
  },
  {
    name: "asset.custody-reminders",
    title: "Asset inspection and custody reminders",
    description: "Flags assets not inspected in the last 12 months and issued assets held for more than 90 days without confirmation.",
    run: async (db) => {
      const t = today();
      let n = 0;
      const assets = await all<{ id: string; asset_tag: string; custody_org_id: string; status: string; last_inspected_at: string | null; issued_at: string | null }>(db,
        `SELECT a.id, a.asset_tag, a.custody_org_id, a.status, a.last_inspected_at,
                (SELECT MAX(e.created_at) FROM asset_events e WHERE e.asset_id = a.id AND e.event_type = 'ISSUE') AS issued_at
           FROM assets a WHERE a.status <> 'DISPOSED'`);
      for (const a of assets) {
        const reasons: Array<[string, string]> = [];
        if (!a.last_inspected_at || a.last_inspected_at.slice(0, 10) < addDays(t, -365)) reasons.push(["inspect", "Inspection overdue (more than 12 months)"]);
        if (a.status === "ISSUED" && a.issued_at && a.issued_at.slice(0, 10) < addDays(t, -90)) reasons.push(["custody", "Issued for more than 90 days: confirm custody or record the return"]);
        for (const [kind, text] of reasons) {
          for (const u of await usersWithPermissionAt(db, "asset.inspect", a.custody_org_id)) {
            if (await notify(db, u, `${a.asset_tag}: ${text}`, "Administrative asset reminder.", `/app/assets/${a.id}`, { category: "ASSET", dedupeKey: `asset:${a.id}:${kind}:${t.slice(0, 7)}` })) n++;
          }
        }
      }
      return { processed: n };
    },
  },
  {
    name: "security.unusual-access",
    title: "Unusual access flags",
    description: "Flags users with 10 or more denied actions, and usernames with 10 or more failed sign-ins, in the last 24 hours to security administrators.",
    run: async (db) => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const threshold = 10;
      const denied = await all<{ actor_id: string; name: string; c: number }>(db,
        `SELECT e.actor_id, u.display_name AS name, COUNT(*) AS c FROM audit_events e JOIN users u ON u.id = e.actor_id
          WHERE e.outcome = 'DENIED' AND e.occurred_at > ? GROUP BY e.actor_id, u.display_name HAVING COUNT(*) >= ?`, since, threshold);
      const failed = await all<{ username: string; c: number }>(db,
        "SELECT username, COUNT(*) AS c FROM login_attempts WHERE succeeded = 0 AND created_at > ? GROUP BY username HAVING COUNT(*) >= ?", since, threshold);
      const admins = await usersWithPermissionAt(db, "security.view", "org_hq");
      let n = 0;
      for (const d of denied) {
        let flagged = false;
        for (const u of admins) if (await notify(db, u, `Unusual access: ${d.name}`, `${d.c} denied actions in the last 24 hours. Review the security events.`, "/app/security", { category: "SYSTEM", dedupeKey: `flag-denied:${d.actor_id}:${today()}` })) flagged = true;
        if (flagged) { n++; await audit(db, { actorId: null, action: "security.flag.denied", outcome: "SUCCESS", category: "SECURITY", entityType: "user", entityId: d.actor_id, details: { denied: d.c } }); }
      }
      for (const f of failed) {
        let flagged = false;
        for (const u of admins) if (await notify(db, u, `Repeated failed sign-ins: ${f.username}`, `${f.c} failed sign-in attempts in the last 24 hours.`, "/app/security", { category: "SYSTEM", dedupeKey: `flag-login:${f.username}:${today()}` })) flagged = true;
        if (flagged) { n++; await audit(db, { actorId: null, action: "security.flag.signin", outcome: "SUCCESS", category: "SECURITY", details: { username: f.username, failures: f.c } }); }
      }
      return { processed: n, message: `${denied.length} user(s) with repeated denials, ${failed.length} username(s) with repeated failed sign-ins` };
    },
  },
  {
    name: "stores.reorder-and-requisitions",
    title: "General stores reorder and requisition reminders",
    description: "Gives store keepers a task for every item at or below its reorder level, reminds delegated approvers of requisitions awaiting a decision and store keepers of approved requisitions not yet issued; closes those tasks once resolved.",
    run: async (db) => {
      const t = today();
      const decideDays = await setting(db, "stores.requisition_decision_days", 3);
      const issueDays = await setting(db, "stores.requisition_issue_days", 2);
      let n = 0;
      // Reorder: one open task per item and keeper while the item stays at or below its reorder level.
      const low = await all<{ id: string; code: string; name: string; org_unit_id: string; quantity_on_hand: number; reorder_level: number; unit_of_measure: string }>(db,
        "SELECT id, code, name, org_unit_id, quantity_on_hand, reorder_level, unit_of_measure FROM store_items WHERE status = 'ACTIVE' AND quantity_on_hand <= reorder_level");
      const lowIds = new Set(low.map((i) => i.id));
      for (const i of low) {
        for (const u of await usersWithPermissionAt(db, "stores.manage", i.org_unit_id)) {
          if (await createTask(db, { userId: u, title: `Reorder ${i.code}: ${i.name}`, body: `${i.quantity_on_hand} ${i.unit_of_measure} on hand; reorder level ${i.reorder_level}.`, link: `/app/stores/${i.id}`, category: "ASSET", sourceKey: `stores-reorder:${i.id}:${u}` })) n++;
        }
      }
      for (const o of await all<{ source_key: string }>(db, "SELECT DISTINCT source_key FROM administrative_tasks WHERE status = 'OPEN' AND source_key LIKE 'stores-reorder:%'")) {
        const itemId = o.source_key.split(":")[1];
        if (!lowIds.has(itemId)) await closeTasks(db, `stores-reorder:${itemId}:`);
      }
      // Requisitions waiting too long for a decision (delegated approvers, never the requester) or for issue (store keepers).
      const reqs = await all<{ id: string; reference: string; status: string; requesting_unit_id: string; store_unit_id: string; requested_by: string; submitted_at: string | null; approved_at: string | null; purpose: string }>(db,
        "SELECT id, reference, status, requesting_unit_id, store_unit_id, requested_by, submitted_at, approved_at, purpose FROM store_requisitions WHERE status IN ('SUBMITTED','APPROVED')");
      const open = new Set<string>();
      for (const r of reqs) {
        if (r.status === "SUBMITTED" && r.submitted_at && r.submitted_at.slice(0, 10) <= addDays(t, -decideDays)) {
          open.add(`srq-decide:${r.id}`);
          for (const u of await delegatesAt(db, "STORES", r.requesting_unit_id)) {
            if (u === r.requested_by) continue;
            if (await createTask(db, { userId: u, title: `Decide stores requisition ${r.reference}`, body: r.purpose, link: `/app/stores/requisitions/${r.id}`, category: "APPROVAL", dueDate: t, sourceKey: `srq-decide:${r.id}:${u}` })) n++;
          }
        }
        if (r.status === "APPROVED" && r.approved_at && r.approved_at.slice(0, 10) <= addDays(t, -issueDays)) {
          open.add(`srq-issue:${r.id}`);
          for (const u of await usersWithPermissionAt(db, "stores.manage", r.store_unit_id)) {
            if (u === r.requested_by) continue;
            if (await createTask(db, { userId: u, title: `Issue stores for ${r.reference}`, body: r.purpose, link: `/app/stores/requisitions/${r.id}`, category: "ASSET", dueDate: t, sourceKey: `srq-issue:${r.id}:${u}` })) n++;
          }
        }
      }
      for (const o of await all<{ source_key: string }>(db, "SELECT DISTINCT source_key FROM administrative_tasks WHERE status = 'OPEN' AND (source_key LIKE 'srq-decide:%' OR source_key LIKE 'srq-issue:%')")) {
        const [kind, id] = o.source_key.split(":");
        if (!open.has(`${kind}:${id}`)) await closeTasks(db, `${kind}:${id}:`);
      }
      return { processed: n, message: `${low.length} item(s) at or below reorder level; ${open.size} overdue requisition step(s)` };
    },
  },
  {
    name: "reports.scheduled-delivery",
    title: "Scheduled report delivery",
    description: "Generates due scheduled reports through the audited export path under the owner's role context, delivers them in the application, suspends schedules that are no longer authorised and removes deliveries older than 30 days.",
    run: async (db) => {
      const { runDueSchedules } = await import("../domain/report-schedules");
      const r = await runDueSchedules(db);
      return { processed: r.delivered + r.suspended + r.expired, message: `${r.delivered} delivered, ${r.suspended} suspended, ${r.expired} expired` };
    },
  },
  {
    name: "system.backup-monitor",
    title: "Backup monitoring",
    description: "Warns platform administrators when the last verified database backup is older than the configured age.",
    run: async (db) => {
      const maxAge = await setting(db, "backup.max_age_hours", 24);
      const last = await one<{ finished_at: string }>(db, "SELECT finished_at FROM backup_runs WHERE status = 'SUCCESS' AND verified = 1 ORDER BY id DESC LIMIT 1");
      const stale = !last || Date.now() - Date.parse(last.finished_at) > maxAge * 3600000;
      if (!stale) return { processed: 0, message: `Last verified backup ${last!.finished_at}` };
      let n = 0;
      for (const u of await usersWithPermissionAt(db, "platform.operate", "org_hq")) {
        if (await notify(db, u, "Database backup overdue", last ? `The last verified backup finished ${last.finished_at}.` : "No verified backup has been recorded.", "/app/platform", { category: "SYSTEM", dedupeKey: `backup:${today()}` })) n++;
      }
      return { processed: n, message: last ? `Last verified backup ${last.finished_at}` : "No verified backup" };
    },
  },
  {
    name: "system.restore-drill",
    title: "Backup restore drill",
    description: "Every N days (backup.restore_drill_days) restores the latest verified backup into a scratch database, checks core tables, schema version and the audit hash chain, then drops it. Failures are logged and reported to technical operators.",
    run: async (db) => {
      const days = await setting(db, "backup.restore_drill_days", 7);
      const recent = await one(db, "SELECT id FROM backup_restore_checks WHERE status IN ('PASSED','FAILED','RUNNING') AND started_at > ?", new Date(Date.now() - days * 86400000).toISOString());
      if (recent) return { processed: 0, message: `Last drill within ${days} day(s)` };
      if (!await one(db, "SELECT id FROM backup_runs WHERE status = 'SUCCESS' AND verified = 1 LIMIT 1")) return { processed: 0, message: "No verified backup to drill" };
      const { runRestoreDrill } = await import("../domain/platform");
      const r = await runRestoreDrill(db, null, null);
      if (r.status !== "PASSED") {
        for (const u of await usersWithPermissionAt(db, "platform.operate", "org_hq")) await notify(db, u, "Backup restore drill failed", r.details ?? "See the platform console.", "/app/platform", { category: "SYSTEM", dedupeKey: `restore-drill:${r.id}` });
      }
      return { processed: 1, message: `Restore drill ${r.status.toLowerCase()}: ${r.details ?? ""}`.slice(0, 300) };
    },
  },
  {
    name: "schedule.event-reminders",
    title: "Administrative calendar reminders",
    description: "Reminds the creator of each scheduled administrative event N days before it (schedule.reminder_days), once per event, and lists events whose date has passed without being completed.",
    run: async (db) => {
      const t = today();
      const days = await setting(db, "schedule.reminder_days", 1);
      const due = await all<{ id: string; title: string; event_date: string; start_time: string | null; created_by: string; unit_name: string }>(db,
        `SELECT e.id, e.title, e.event_date, e.start_time, e.created_by, o.name AS unit_name FROM admin_calendar_events e JOIN org_units o ON o.id = e.org_unit_id
          WHERE e.status = 'SCHEDULED' AND e.event_date BETWEEN ? AND ?`, t, addDays(t, days));
      let n = 0;
      for (const e of due) {
        if (await notify(db, e.created_by, `Coming up: ${e.title}`, `${e.unit_name} · ${e.event_date}${e.start_time ? ` at ${e.start_time}` : ""}.`, `/app/calendar/${e.id}`, { category: "GENERAL", dedupeKey: `event-reminder:${e.id}` })) n++;
      }
      // Past events still marked scheduled: ask the creator to complete or cancel them (one task per event).
      const stale = await all<{ id: string; title: string; event_date: string; created_by: string }>(db,
        "SELECT id, title, event_date, created_by FROM admin_calendar_events WHERE status = 'SCHEDULED' AND event_date < ?", t);
      for (const e of stale) await createTask(db, { userId: e.created_by, title: `Record the outcome of “${e.title}” (${e.event_date})`, link: `/app/calendar/${e.id}`, dueDate: t, sourceKey: `event-outcome:${e.id}` });
      // Close outcome tasks for events that have since been completed or cancelled.
      for (const r of await all<{ source_key: string }>(db, "SELECT t.source_key FROM administrative_tasks t JOIN admin_calendar_events e ON CONCAT('event-outcome:', e.id) = t.source_key WHERE t.status = 'OPEN' AND e.status <> 'SCHEDULED'")) await closeTasks(db, r.source_key);
      return { processed: n, message: `${due.length} event(s) within ${days} day(s); ${stale.length} past event(s) awaiting an outcome` };
    },
  },
  {
    name: "correspondence.follow-ups",
    title: "Correspondence follow-ups and retention review",
    description: "Reminds the assigned officer when a correspondence follow-up date is reached (and the manager when it is overdue), and flags closed or filed records older than correspondence.retention_years for retention review. Nothing is deleted automatically.",
    run: async (db) => {
      const t = today();
      const due = await all<{ id: string; reference: string; subject: string; follow_up_date: string; assigned_to: string | null; org_unit_id: string }>(db,
        "SELECT id, reference, subject, follow_up_date, assigned_to, org_unit_id FROM correspondence WHERE status NOT IN ('CLOSED','FILED') AND follow_up_date IS NOT NULL AND follow_up_date <= ?", t);
      let n = 0;
      for (const c of due) {
        const overdue = c.follow_up_date < t;
        if (c.assigned_to) {
          if (await notify(db, c.assigned_to, `${overdue ? "Overdue" : "Follow up today"}: ${c.reference}`, c.subject, `/app/correspondence/${c.id}`, { category: "GENERAL", dedupeKey: `corr-follow:${c.id}:${c.follow_up_date}:${overdue ? "o" : "d"}` })) n++;
          await createTask(db, { userId: c.assigned_to, title: `Follow up correspondence ${c.reference}`, link: `/app/correspondence/${c.id}`, dueDate: c.follow_up_date, sourceKey: `corr-follow:${c.id}:${c.follow_up_date}` });
        }
        if (overdue || !c.assigned_to) {
          for (const u of await usersWithPermissionAt(db, "correspondence.manage", c.org_unit_id)) {
            await notify(db, u, `${c.assigned_to ? "Follow-up overdue" : "Unassigned correspondence due"}: ${c.reference}`, c.subject, `/app/correspondence/${c.id}`, { category: "GENERAL", dedupeKey: `corr-overdue:${c.id}:${c.follow_up_date}` });
          }
        }
      }
      // Close follow-up tasks for records that are closed, filed or rescheduled.
      for (const r of await all<{ source_key: string }>(db, "SELECT source_key FROM administrative_tasks WHERE status = 'OPEN' AND source_key LIKE 'corr-follow:%'")) {
        const [, id, date] = r.source_key.split(":");
        const c = await one<{ status: string; follow_up_date: string | null }>(db, "SELECT status, follow_up_date FROM correspondence WHERE id = ?", id);
        if (!c || ["CLOSED", "FILED"].includes(c.status) || c.follow_up_date !== date) await closeTasks(db, r.source_key);
      }
      const years = await setting(db, "correspondence.retention_years", 7);
      const cutoff = `${Number(t.slice(0, 4)) - years}${t.slice(4)}`;
      const old = await all<{ id: string; reference: string; org_unit_id: string }>(db,
        "SELECT id, reference, org_unit_id FROM correspondence WHERE status IN ('CLOSED','FILED') AND updated_at < ? LIMIT 200", cutoff);
      for (const c of old) for (const u of await usersWithPermissionAt(db, "correspondence.manage", c.org_unit_id)) {
        await createTask(db, { userId: u, title: `Retention review: ${c.reference} is older than ${years} years`, link: `/app/correspondence/${c.id}`, sourceKey: `corr-retention:${c.id}:${u}` });
      }
      return { processed: n, message: `${due.length} follow-up(s) due or overdue; ${old.length} record(s) due for retention review` };
    },
  },
  {
    name: "system.housekeeping",
    title: "Session and log housekeeping",
    description: "Removes expired sessions and sign-in attempt records older than 90 days.",
    run: async (db) => {
      const t = nowIso();
      const s = await run(db, "DELETE FROM sessions WHERE expires_at < ?", t);
      const l = await run(db, "DELETE FROM login_attempts WHERE created_at < ?", new Date(Date.now() - 90 * 86400000).toISOString());
      return { processed: s.changes + l.changes };
    },
  },
];

export const JOB_BY_NAME = Object.fromEntries(JOBS.map((j) => [j.name, j]));

/** Runs one job with up to three attempts, recording the run. */
export async function runJob(db: DB, name: string, trigger: "SCHEDULE" | "MANUAL" | "STARTUP", triggeredBy: string | null = null) {
  const job = JOB_BY_NAME[name];
  if (!job) throw new Error(`Unknown job ${name}`);
  const { insertId } = await run(db, "INSERT INTO job_runs (job, trigger_type, started_at, status, triggered_by) VALUES (?,?,?, 'RUNNING', ?)", name, trigger, nowIso(), triggeredBy);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await job.run(db);
      await run(db, "UPDATE job_runs SET status = 'SUCCESS', finished_at = ?, processed = ?, attempts = ?, message = ? WHERE id = ?", nowIso(), r.processed, attempt, r.message?.slice(0, 500) ?? null, insertId);
      return { ok: true as const, ...r };
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : "unknown error";
      if (attempt === 3) {
        await run(db, "UPDATE job_runs SET status = 'FAILED', finished_at = ?, attempts = ?, message = ? WHERE id = ?", nowIso(), attempt, msg.slice(0, 500), insertId);
        await run(db, "INSERT INTO error_logs (occurred_at, source, error_name, message) VALUES (?,?,?,?)", nowIso(), `job:${name}`, e instanceof Error ? e.name : "Error", msg.slice(0, 500));
        for (const u of await usersWithPermissionAt(db, "platform.configure", "org_hq")) await notify(db, u, `Automation job failed: ${job.title}`, msg.slice(0, 300), "/app/platform", { category: "SYSTEM", dedupeKey: `jobfail:${name}:${today()}` });
        return { ok: false as const, processed: 0, message: msg };
      }
      await new Promise((ok) => setTimeout(ok, 500 * 2 ** attempt));
    }
  }
  return { ok: false as const, processed: 0 };
}

/** Runs every job once. Returns null when another process holds the run lock. */
export async function runAllJobs(db: DB, trigger: "SCHEDULE" | "MANUAL" | "STARTUP", triggeredBy: string | null = null) {
  const conn = "getConnection" in db ? await db.getConnection() : db;
  try {
    const got = await one<{ l: number }>(conn, "SELECT GET_LOCK('zps_oms_jobs', 0) AS l");
    if (Number(got?.l) !== 1) return null;
    try {
      const results: Array<{ name: string; ok: boolean; processed: number; message?: string }> = [];
      for (const j of JOBS) results.push({ name: j.name, ...(await runJob(db, j.name, trigger, triggeredBy)) });
      return results;
    } finally {
      await conn.query("SELECT RELEASE_LOCK('zps_oms_jobs')");
    }
  } finally {
    if ("release" in conn && conn !== db) conn.release();
  }
}

/** Starts the in-process scheduler once per server process. */
export function startScheduler(db: DB, minutes: number) {
  const g = globalThis as unknown as { __zpsScheduler?: NodeJS.Timeout };
  if (g.__zpsScheduler) return;
  const tick = () => runAllJobs(db, "SCHEDULE").catch((e) => console.error("[zps-oms] automation run failed:", e instanceof Error ? e.message : e));
  g.__zpsScheduler = setInterval(tick, Math.max(1, minutes) * 60000);
  g.__zpsScheduler.unref?.();
}
