import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { addDays, today } from "@/server/domain/core";
import { availabilityGroup, availabilitySummary, calendar, createEvent, getEvent, listEvents, setEventStatus } from "@/server/domain/schedule";
import { changeDisposition } from "@/server/domain/personnel";
import {
  assignCorrespondence, attachFile, downloadFile, getCorrespondence, listCorrespondence, listFiles, registerCorrespondence,
  removeFile, safeFileName, screenPdf, setCorrespondenceStatus,
} from "@/server/domain/correspondence";
import { actor, withDb } from "./helpers";

/** A minimal, well-formed synthetic PDF with an optional extra object (uncompressed or Flate-compressed). */
function pdf(extra = "", compressed = false): Buffer {
  const head = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\n", "latin1");
  let body = Buffer.alloc(0);
  if (extra && !compressed) body = Buffer.from(`3 0 obj ${extra} endobj\n`, "latin1");
  if (extra && compressed) {
    const z = deflateSync(Buffer.from(extra, "latin1"));
    body = Buffer.concat([Buffer.from(`3 0 obj << /Type /ObjStm /Filter /FlateDecode /Length ${z.length} >> stream\n`, "latin1"), z, Buffer.from("\nendstream endobj\n", "latin1")]);
  }
  return Buffer.concat([head, body, Buffer.from("trailer << /Root 1 0 R >>\n%%EOF\n", "latin1")]);
}

const base = { direction: "INCOMING" as const, subject: "Demo request for duty-roster statistics", counterpartName: "Demo Ministry Registry", registerDate: today() };

describe("Module 16 — administrative scheduling", () => {
  it("schedules non-sensitive events within scope, refuses operational content, and audits changes", () => withDb(async (db) => {
    const staff = await actor(db, "u_cb_sops"); // Division Staff I, Copperbelt
    const date = addDays(today(), 3);
    const e = await createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo quarterly records review meeting", category: "MEETING", eventDate: date, startTime: "09:00", endTime: "11:00" });
    expect(e.status).toBe("SCHEDULED");
    await expect(createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo quarterly records review meeting", category: "MEETING", eventDate: date })).rejects.toThrow(/already scheduled/);
    // Operational, tactical and excluded content is refused.
    await expect(createEvent(db, staff, { orgUnitId: "org_cb", title: "Patrol briefing", category: "MEETING", eventDate: date })).rejects.toThrow(/operational or excluded/);
    await expect(createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo meeting", category: "MEETING", eventDate: date, notes: "Plan the deployment of officers" })).rejects.toThrow(/operational or excluded/);
    await expect(createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo meeting", category: "MEETING", eventDate: addDays(today(), -1) })).rejects.toThrow(/past/);
    await expect(createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo meeting", category: "MEETING", eventDate: date, startTime: "10:00", endTime: "09:00" })).rejects.toThrow();
    // Another Division cannot schedule for, or see, Copperbelt events.
    const lsk = await actor(db, "u_lsk_sops");
    await expect(createEvent(db, lsk, { orgUnitId: "org_cb", title: "Demo meeting", category: "MEETING", eventDate: date })).rejects.toThrow(/not authorised/);
    await expect(getEvent(db, lsk, e.id)).rejects.toThrow();
    expect((await listEvents(db, lsk, today(), addDays(today(), 30))).some((x) => x.id === e.id)).toBe(false);
    // A District in the Division sees it (subtree is downwards only: the District sees its own and below, not the Division's).
    const kitweOps = await actor(db, "u_kit_ops");
    expect((await listEvents(db, kitweOps, today(), addDays(today(), 30))).some((x) => x.id === e.id)).toBe(false);
    const kitweEvent = await createEvent(db, kitweOps, { orgUnitId: "org_cb_kitwe", title: "Demo district returns deadline", category: "DEADLINE", eventDate: date });
    expect((await listEvents(db, staff, today(), addDays(today(), 30))).some((x) => x.id === kitweEvent.id)).toBe(true);
    // Technical administrators hold no business scheduling.
    await expect(listEvents(db, await actor(db, "u_cb_tech"), today(), addDays(today(), 30))).rejects.toThrow(/not authorised/);
    // Cancelling needs a reason; changes are audited.
    await expect(setEventStatus(db, staff, e.id, "CANCELLED", "no")).rejects.toThrow(/reason/);
    await setEventStatus(db, staff, e.id, "CANCELLED", "Demo: rescheduled by the division");
    await expect(setEventStatus(db, staff, e.id, "COMPLETED")).rejects.toThrow(/Only a scheduled/);
    const acts = (await all<{ action: string }>(db, "SELECT action FROM audit_events WHERE entity_id = ? AND outcome = 'SUCCESS' ORDER BY occurred_at", e.id)).map((r) => r.action);
    expect(acts).toEqual(["schedule.event.create", "schedule.event.cancel"]);
    // The other Division's attempt to open it was refused and recorded.
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE entity_id = ? AND outcome = 'DENIED'", e.id))?.n)).toBeGreaterThanOrEqual(1);
  }));

  it("merges events with dates held by other modules, within scope", () => withDb(async (db) => {
    const staff = await actor(db, "u_cb_sops");
    const from = today();
    const to = addDays(today(), 90);
    await createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo renewal deadline briefing", category: "DEADLINE", eventDate: addDays(today(), 5) });
    const items = await calendar(db, staff, from, to);
    expect(items.some((i) => i.kind === "EVENT")).toBe(true);
    // Every assignment review shown is one the actor may see in the assignment register.
    const reviews = items.filter((i) => i.kind === "ASSIGNMENT_REVIEW");
    const expected = Number((await one<{ n: number }>(db,
      `SELECT COUNT(*) AS n FROM personnel_assignments a JOIN operational_areas ar ON ar.id = a.area_id
        WHERE a.status = 'ACTIVE' AND a.review_date BETWEEN ? AND ? AND (a.home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb')
          OR ar.responsible_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb'))`, from, to))?.n ?? 0);
    expect(reviews.length).toBe(Math.min(expected, 500));
    expect([...items].map((i) => i.date)).toEqual([...items].map((i) => i.date).sort());
    await expect(calendar(db, staff, "2026-01-01", "2026-12-31")).rejects.toThrow(/three months/);
  }));

  it("shows personnel availability derived from disposition, within personnel scope (M16-2)", () => withDb(async (db) => {
    expect(availabilityGroup("AVAILABLE_HOME")).toBe("AVAILABLE");
    expect(availabilityGroup("RETURNED_HOME")).toBe("AVAILABLE");
    expect(availabilityGroup("AWAITING_APPROVAL")).toBe("IN_PROCESS");
    expect(availabilityGroup("ACTIVE_ASSIGNMENT")).toBe("ON_ASSIGNMENT");
    expect(availabilityGroup("TEMP_UNAVAILABLE")).toBe("UNAVAILABLE");
    const cb = await actor(db, "u_cb_sops");
    const sum = (await availabilitySummary(db, cb))!;
    const serving = Number((await one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM personnel_records WHERE employment_status = 'SERVING'
      AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb')`))!.n);
    expect(sum.serving).toBe(serving);
    expect(Object.values(sum.groups).reduce((a, b) => a + b, 0)).toBe(serving);
    // A manual change to Temporarily Unavailable today appears as one line for the officer's home unit.
    const p = (await one<{ id: string; home_unit_id: string; surname: string }>(db, `SELECT id, home_unit_id, surname FROM personnel_records WHERE disposition_status = 'AVAILABLE_HOME' AND employment_status = 'SERVING'
      AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb') ORDER BY id LIMIT 1`))!;
    await changeDisposition(db, cb, p.id, "TEMP_UNAVAILABLE", "Demo administrative leave recorded for the test");
    const items = (await calendar(db, cb, today(), today())).filter((i) => i.kind === "AVAILABILITY_CHANGE");
    const line = items.find((i) => i.href === `/app/personnel?unit=${p.home_unit_id}`)!;
    expect(line.title).toMatch(/1 unavailable/);
    expect(line.detail).toContain(p.surname);
    expect(line.detail).toContain("Temporarily Unavailable");
    expect((await availabilitySummary(db, cb))!.groups.UNAVAILABLE).toBe(sum.groups.UNAVAILABLE + 1);
    // Outside the personnel scope: Lusaka staff do not see the Copperbelt change; no personnel.view, no availability.
    expect((await calendar(db, await actor(db, "u_lsk_sops"), today(), today())).some((i) => i.href === line.href)).toBe(false);
    const liaison = await actor(db, "u_hq_pio");
    expect(await availabilitySummary(db, liaison)).toBeNull();
  }));
});

describe("Module 17 — administrative correspondence", () => {
  it("registers with a generated reference, enforces scope, flow and separation, and keeps history", () => withDb(async (db) => {
    const staff = await actor(db, "u_cb_sops");      // registers and manages (Division Staff I)
    const c = await registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb", letterReference: "DEMO/MIN/001", followUpDate: addDays(today(), 7) });
    expect(c.reference).toMatch(/^CORR-\d{4}-\d{6}$/);
    expect(c.status).toBe("REGISTERED");
    await expect(registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb", letterReference: "DEMO/MIN/001" })).rejects.toThrow(/already registered/);
    await expect(registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb", subject: "Request for ammunition returns" })).rejects.toThrow(/excluded/);
    await expect(registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb", registerDate: addDays(today(), 2) })).rejects.toThrow(/future/);
    // Another Division neither sees nor registers for Copperbelt.
    const lsk = await actor(db, "u_lsk_sops");
    await expect(getCorrespondence(db, lsk, c.id)).rejects.toThrow();
    await expect(registerCorrespondence(db, lsk, { ...base, orgUnitId: "org_cb" })).rejects.toThrow(/not authorised/);
    expect((await listCorrespondence(db, lsk)).some((x) => x.id === c.id)).toBe(false);
    // A technical administrator has no business access.
    await expect(getCorrespondence(db, await actor(db, "u_cb_tech"), c.id)).rejects.toThrow();

    // Assign to an officer who can see the Division's correspondence; progress through the flow.
    const officer = await actor(db, "u_cb_asg");      // Division Staff II
    await expect(assignCorrespondence(db, staff, c.id, "u_lsk_sops")).rejects.toThrow(/must serve in this organisation/);
    // National HQ users can see Division correspondence but are not assignees for it.
    await expect(assignCorrespondence(db, staff, c.id, "u_dig")).rejects.toThrow(/must serve in this organisation/);
    await assignCorrespondence(db, staff, c.id, officer.userId, "Demo: please prepare a reply");
    expect((await getCorrespondence(db, staff, c.id)).status).toBe("ASSIGNED");
    await expect(setCorrespondenceStatus(db, officer, c.id, "CLOSED")).rejects.toThrow(/cannot move/);
    await setCorrespondenceStatus(db, officer, c.id, "IN_PROGRESS");
    await setCorrespondenceStatus(db, officer, c.id, "AWAITING_REPLY", { followUpDate: addDays(today(), 10) });
    await setCorrespondenceStatus(db, officer, c.id, "CLOSED", { note: "Demo: reply received" });
    // Only a manager files, and filing needs a file reference.
    await expect(setCorrespondenceStatus(db, officer, c.id, "FILED", { fileReference: "DEMO/F/12" })).rejects.toThrow(/manager/);
    await expect(setCorrespondenceStatus(db, staff, c.id, "FILED")).rejects.toThrow(/filing reference/);
    await setCorrespondenceStatus(db, staff, c.id, "FILED", { fileReference: "DEMO/F/12" });
    const done = await getCorrespondence(db, staff, c.id);
    expect(done).toMatchObject({ status: "FILED", file_reference: "DEMO/F/12" });
    const events = await all<{ action: string; to_status: string | null }>(db, "SELECT action, to_status FROM correspondence_events WHERE correspondence_id = ? ORDER BY at, id", c.id);
    expect(events.map((e) => e.to_status ?? e.action)).toEqual(["REGISTERED", "ASSIGNED", "IN_PROGRESS", "AWAITING_REPLY", "CLOSED", "FILED"]);
    // Six recorded changes (register, assign, four status moves); the refused cross-Division and technical-role reads are recorded as denials.
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE entity_id = ? AND action LIKE 'correspondence.%' AND outcome = 'SUCCESS'", c.id))?.n)).toBe(6);
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE entity_id = ? AND outcome = 'DENIED'", c.id))?.n)).toBe(2);
  }));

  it("shows RESTRICTED records only to managers in scope, the creator and the assignee", () => withDb(async (db) => {
    const staff = await actor(db, "u_cb_sops");
    const r = await registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb", classification: "RESTRICTED", subject: "Demo restricted staffing correspondence" });
    const viewerOnly = await actor(db, "u_cb_asg"); // can view Division correspondence but does not manage it
    await expect(getCorrespondence(db, viewerOnly, r.id)).rejects.toThrow();
    expect((await listCorrespondence(db, viewerOnly)).some((x) => x.id === r.id)).toBe(false);
    await assignCorrespondence(db, staff, r.id, viewerOnly.userId);
    expect((await getCorrespondence(db, viewerOnly, r.id)).id).toBe(r.id);
    expect((await listCorrespondence(db, viewerOnly)).some((x) => x.id === r.id)).toBe(true);
  }));

  it("screens PDF documents structurally and audits every download", () => withDb(async (db) => {
    expect(screenPdf(pdf())).toBeNull();
    expect(screenPdf(Buffer.from("MZ\x90\x00 not a pdf"))).toMatch(/not a PDF/);
    expect(screenPdf(Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n"))).toMatch(/incomplete/);
    expect(screenPdf(pdf("<< /Type /Action /S /JavaScript /JS (app.alert(1)) >>"))).toMatch(/scripts/);
    expect(screenPdf(pdf("<< /Type /Action /S /Launch /F (cmd.exe) >>"))).toMatch(/scripts/);
    expect(screenPdf(pdf("<< /Names << /EmbeddedFiles 4 0 R >> >>"))).toMatch(/embedded/);
    expect(screenPdf(pdf("<< /OpenAction 5 0 R /AA << >> >>"))).toMatch(/automatic/);
    expect(screenPdf(pdf("<< /S /JavaScript /JS (hidden) >>", true))).toMatch(/scripts/); // hidden in a compressed object stream
    expect(screenPdf(pdf("<< /Encrypt 6 0 R >>"))).toMatch(/Encrypted/);
    expect(screenPdf(Buffer.concat([pdf(), Buffer.alloc(5 * 1024 * 1024)]))).toMatch(/5 MB/);
    expect(safeFileName("..\\..\\windows\\evil<script>.exe")).toBe("evil_script_.exe.pdf");
    expect(safeFileName("Demo letter 001.PDF")).toBe("Demo letter 001.PDF");

    const staff = await actor(db, "u_cb_sops");
    const c = await registerCorrespondence(db, staff, { ...base, orgUnitId: "org_cb" });
    await expect(attachFile(db, staff, c.id, "bad.pdf", pdf("<< /S /JavaScript /JS (x) >>"))).rejects.toThrow(/scripts/);
    const fid = await attachFile(db, staff, c.id, "Demo letter.pdf", pdf());
    await expect(attachFile(db, staff, c.id, "again.pdf", pdf())).rejects.toThrow(/already attached/);
    expect((await listFiles(db, staff, c.id)).map((f) => f.file_name)).toEqual(["Demo letter.pdf"]);
    await expect(attachFile(db, await actor(db, "u_lsk_sops"), c.id, "x.pdf", pdf("<< >>"))).rejects.toThrow();
    await expect(downloadFile(db, await actor(db, "u_lsk_sops"), fid)).rejects.toThrow();
    const d = await downloadFile(db, staff, fid);
    expect(d.content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE action = 'correspondence.file.download' AND entity_id = ?", c.id))?.n)).toBe(1);
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM audit_events WHERE action = 'correspondence.file.attach' AND outcome = 'DENIED' AND entity_id = ?", c.id))?.n)).toBeGreaterThanOrEqual(1);
    // Removal keeps the row (history) but hides the document.
    await removeFile(db, staff, fid, "Demo: attached to the wrong record");
    expect(await listFiles(db, staff, c.id)).toEqual([]);
    expect(await one(db, "SELECT id FROM correspondence_files WHERE id = ? AND removed_at IS NOT NULL", fid)).toBeTruthy();
    // Storage can be switched off.
    await db.query("UPDATE app_settings SET value = '0' WHERE `key` = 'correspondence.files_enabled'");
    await expect(attachFile(db, staff, c.id, "x.pdf", pdf("<< /Type /Font >>"))).rejects.toThrow(/switched off/);
  }));
});
