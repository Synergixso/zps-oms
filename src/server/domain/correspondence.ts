/**
 * Module 17 — Administrative correspondence management (DEC-068).
 *
 * A register of incoming and outgoing ADMINISTRATIVE correspondence: generated references (CORR-YYYY-NNNNNN),
 * dates, originating/receiving organisation, assigned officer, processing status, filing reference, follow-up
 * date and a full history. Scope is server-side: a record belongs to the registering unit; viewers need
 * correspondence.view covering that unit. RESTRICTED records are visible only to correspondence.manage holders
 * in scope, the creator and the assigned officer.
 *
 * Documents: PDF only, at most 5 MB, structurally screened before storage (signature, end marker, no encryption,
 * no JavaScript / launch / embedded-file / auto-run actions, including inside compressed streams). This is a
 * screen, not antivirus: files are also passed to the configured malware scanner (lib/malware-scan.ts, issue #12),
 * and production refuses uploads until an approved scanner is configured; information-security approval still applies
 * (KNOWN_LIMITATIONS). Storage can be switched off with the correspondence.files_enabled setting.
 *
 * Status flow: REGISTERED → ASSIGNED → IN_PROGRESS ⇄ AWAITING_REPLY → CLOSED → FILED (filing needs a file reference).
 */
import { firstRows, pageQuery, splitSelect, type Page, type Paging, type Query } from "./paging";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { PROHIBITED_TERMS } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, tenantOf, today } from "./core";
import { type Actor, can, hasPermission, loadActor, requirePermission, scopeFor } from "./policy";
import { requireScan } from "../lib/malware-scan";

export const CORR_STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Registered", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", AWAITING_REPLY: "Awaiting reply", CLOSED: "Closed", FILED: "Filed",
};
export type CorrStatus = keyof typeof CORR_STATUS_LABEL;
const NEXT: Record<string, CorrStatus[]> = {
  ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["AWAITING_REPLY", "CLOSED"], AWAITING_REPLY: ["IN_PROGRESS", "CLOSED"], CLOSED: ["FILED", "IN_PROGRESS"],
};
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface Correspondence {
  id: string; reference: string; org_unit_id: string; unit_name: string; direction: "INCOMING" | "OUTGOING"; subject: string;
  counterpart_org_id: string | null; counterpart_org_name: string | null; counterpart_name: string | null; letter_reference: string | null;
  letter_date: string | null; register_date: string; classification: "UNCLASSIFIED" | "RESTRICTED"; assigned_to: string | null;
  assigned_to_name: string | null; status: CorrStatus; file_reference: string | null; follow_up_date: string | null; summary: string | null;
  created_by: string; created_by_name: string; created_at: string; updated_at: string;
}
const SELECT = `SELECT c.*, o.name AS unit_name, co.name AS counterpart_org_name, a.display_name AS assigned_to_name, u.display_name AS created_by_name
  FROM correspondence c JOIN org_units o ON o.id = c.org_unit_id LEFT JOIN org_units co ON co.id = c.counterpart_org_id
  LEFT JOIN users a ON a.id = c.assigned_to JOIN users u ON u.id = c.created_by`;

function screen(text: string | undefined | null) {
  if (!text) return;
  const lower = text.toLowerCase();
  const hit = PROHIBITED_TERMS.find((t) => new RegExp(`\\b${t}`).test(lower));
  if (hit) throw invalid(`"${hit}" relates to an excluded class of information. The register holds administrative correspondence only.`);
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");
const optDate = date.optional().or(z.literal("").transform(() => undefined));
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
export const registerSchema = z.object({
  orgUnitId: z.string().min(1, "Select the registering organisation."),
  direction: z.enum(["INCOMING", "OUTGOING"]),
  subject: z.string().trim().min(5, "Enter a subject of at least 5 characters.").max(200),
  counterpartOrgId: optText(40),
  counterpartName: optText(160),
  letterReference: optText(80),
  letterDate: optDate,
  registerDate: date,
  classification: z.enum(["UNCLASSIFIED", "RESTRICTED"]).default("UNCLASSIFIED"),
  followUpDate: optDate,
  summary: optText(1000),
}).refine((d) => d.counterpartOrgId || d.counterpartName, { message: "Name the originating or receiving organisation.", path: ["counterpartName"] })
  .refine((d) => !d.letterDate || d.letterDate <= d.registerDate, { message: "The letter date cannot be after the register date.", path: ["letterDate"] });

/** Whether the actor may see this record (scope, and the extra RESTRICTED rule). */
function visible(actor: Actor, c: Pick<Correspondence, "org_unit_id" | "classification" | "assigned_to" | "created_by">) {
  if (c.assigned_to === actor.userId || c.created_by === actor.userId) return true;
  if (!can(actor, "correspondence.view", c.org_unit_id)) return false;
  return c.classification === "UNCLASSIFIED" || can(actor, "correspondence.manage", c.org_unit_id);
}

async function event(db: DB, id: string, actorId: string, action: string, from: string | null, to: string | null, note?: string) {
  await run(db, "INSERT INTO correspondence_events (id, correspondence_id, actor_id, action, from_status, to_status, note, at) VALUES (?,?,?,?,?,?,?,?)",
    newId("cev"), id, actorId, action, from, to, note ?? null, nowIso());
}

export async function registerCorrespondence(db: DB, actor: Actor, input: z.input<typeof registerSchema>): Promise<Correspondence> {
  const d = registerSchema.parse(input);
  await requirePermission(db, actor, "correspondence.register", d.orgUnitId, { type: "correspondence" });
  for (const t of [d.subject, d.counterpartName, d.summary, d.letterReference]) screen(t);
  if (d.registerDate > today()) throw invalid("The register date cannot be in the future.");
  if (d.followUpDate && d.followUpDate < d.registerDate) throw invalid("The follow-up date cannot be before the register date.");
  if (d.counterpartOrgId && !await one(db, "SELECT id FROM org_units WHERE id = ?", d.counterpartOrgId)) throw invalid("The named organisation does not exist.");
  if (d.letterReference && await one(db, "SELECT id FROM correspondence WHERE org_unit_id = ? AND direction = ? AND letter_reference = ?", d.orgUnitId, d.direction, d.letterReference)) {
    throw conflict("This letter reference is already registered by this organisation. Open the existing record instead.");
  }
  const id = newId("cor");
  const t = nowIso();
  let reference = "";
  await tx(db, async (db) => {
    reference = await nextReference(db, "CORR", "correspondence");
    await run(db, `INSERT INTO correspondence (id, reference, tenant_id, org_unit_id, direction, subject, counterpart_org_id, counterpart_name, letter_reference, letter_date,
                     register_date, classification, status, follow_up_date, summary, created_by, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'REGISTERED', ?,?,?,?,?)`,
      id, reference, await tenantOf(db, d.orgUnitId), d.orgUnitId, d.direction, d.subject, d.counterpartOrgId ?? null, d.counterpartName ?? null, d.letterReference ?? null,
      d.letterDate ?? null, d.registerDate, d.classification, d.followUpDate ?? null, d.summary ?? null, actor.userId, t, t);
    await event(db, id, actor.userId, "REGISTER", null, "REGISTERED");
    await audit(db, { actorId: actor.userId, action: "correspondence.register", category: "BUSINESS", entityType: "correspondence", entityId: id, orgUnitId: d.orgUnitId, details: { reference, direction: d.direction, classification: d.classification } });
  });
  return (await one<Correspondence>(db, `${SELECT} WHERE c.id = ?`, id))!;
}

export async function getCorrespondence(db: DB, actor: Actor, id: string): Promise<Correspondence> {
  const c = await one<Correspondence>(db, `${SELECT} WHERE c.id = ?`, id);
  if (!c || !visible(actor, c)) {
    await audit(db, { actorId: actor.userId, action: "correspondence.view", outcome: "DENIED", category: "SECURITY", entityType: "correspondence", entityId: id });
    throw notFound();
  }
  return c;
}

export type CorrespondenceFilters = { q?: string; status?: string; direction?: string; mine?: boolean };

function correspondenceQuery(actor: Actor, f: CorrespondenceFilters): Query {
  const where: string[] = [];
  const params: unknown[] = [];
  const s = scopeFor(actor, "correspondence.view");
  const m = scopeFor(actor, "correspondence.manage");
  if (f.mine || (!s.national && !s.units.length)) {
    where.push("(c.assigned_to = ? OR c.created_by = ?)"); params.push(actor.userId, actor.userId);
  } else {
    // In scope, and RESTRICTED only where the actor manages or is personally involved.
    const inView = s.national ? "1=1" : `c.org_unit_id IN (${s.units.map(() => "?").join(",")})`;
    const inManage = m.national ? "1=1" : m.units.length ? `c.org_unit_id IN (${m.units.map(() => "?").join(",")})` : "1=0";
    where.push(`((${inView}) AND (c.classification = 'UNCLASSIFIED' OR ${inManage}) OR c.assigned_to = ? OR c.created_by = ?)`);
    params.push(...(s.national ? [] : s.units), ...(m.national ? [] : m.units), actor.userId, actor.userId);
  }
  if (f.q) { where.push("(c.reference LIKE ? OR c.subject LIKE ? OR c.letter_reference LIKE ? OR c.counterpart_name LIKE ?)"); params.push(...Array(4).fill(`%${f.q}%`)); }
  if (f.status && f.status in CORR_STATUS_LABEL) { where.push("c.status = ?"); params.push(f.status); }
  if (f.direction === "INCOMING" || f.direction === "OUTGOING") { where.push("c.direction = ?"); params.push(f.direction); }
  return { ...splitSelect(SELECT), where: where.join(" AND "), params, order: "c.register_date DESC, c.reference DESC" };
}

/** Up to 500 records (panels and tests); the register uses pageCorrespondence. */
export async function listCorrespondence(db: DB, actor: Actor, f: CorrespondenceFilters = {}): Promise<Correspondence[]> {
  return firstRows<Correspondence>(db, correspondenceQuery(actor, f));
}
export async function pageCorrespondence(db: DB, actor: Actor, f: CorrespondenceFilters & Paging = {}): Promise<Page<Correspondence>> {
  return pageQuery<Correspondence>(db, correspondenceQuery(actor, f), f);
}

export async function correspondenceHistory(db: DB, actor: Actor, id: string) {
  await getCorrespondence(db, actor, id);
  return await all<{ id: string; action: string; from_status: string | null; to_status: string | null; note: string | null; at: string; actor_name: string }>(db,
    "SELECT e.*, u.display_name AS actor_name FROM correspondence_events e JOIN users u ON u.id = e.actor_id WHERE e.correspondence_id = ? ORDER BY e.at, e.id", id);
}

/** Officers who may be assigned: active users serving at the record's unit or below who can view its correspondence (not higher levels). */
export async function assignableOfficers(db: DB, actor: Actor, id: string) {
  const c = await getCorrespondence(db, actor, id);
  if (!can(actor, "correspondence.manage", c.org_unit_id)) return [];
  const candidates = await all<{ id: string; display_name: string }>(db,
    `SELECT DISTINCT u.id, u.display_name FROM users u JOIN role_assignments a ON a.user_id = u.id AND a.revoked_at IS NULL
       JOIN org_unit_closure cl ON cl.ancestor_id = ? AND cl.descendant_id = a.org_unit_id
      WHERE u.status = 'ACTIVE' ORDER BY u.display_name LIMIT 300`, c.org_unit_id);
  const out: { value: string; label: string }[] = [];
  for (const u of candidates) {
    const a = await loadActor(db, u.id);
    // A RESTRICTED record becomes visible to its assignee through the assignment itself.
    if (a && can(a, "correspondence.view", c.org_unit_id)) out.push({ value: u.id, label: u.display_name });
  }
  return out;
}

/** True when the user holds an active role assignment at the unit or at a unit below it. */
async function servesAtOrBelow(db: DB, userId: string, unitId: string) {
  return !!await one(db,
    `SELECT a.id FROM role_assignments a JOIN org_unit_closure cl ON cl.ancestor_id = ? AND cl.descendant_id = a.org_unit_id
      WHERE a.user_id = ? AND a.revoked_at IS NULL AND (a.valid_to IS NULL OR a.valid_to > ?) LIMIT 1`, unitId, userId, nowIso());
}

export async function assignCorrespondence(db: DB, actor: Actor, id: string, userId: string, note?: string) {
  const c = await getCorrespondence(db, actor, id);
  await requirePermission(db, actor, "correspondence.manage", c.org_unit_id, { type: "correspondence", id });
  if (c.status === "CLOSED" || c.status === "FILED") throw conflict("Closed correspondence cannot be reassigned.");
  const assignee = await loadActor(db, userId);
  if (!assignee || !can(assignee, "correspondence.view", c.org_unit_id) || !await servesAtOrBelow(db, userId, c.org_unit_id)) {
    throw invalid("The officer must serve in this organisation (or a unit below it) and hold a role that can see its correspondence.");
  }
  screen(note);
  const to: CorrStatus = c.status === "REGISTERED" ? "ASSIGNED" : c.status;
  await tx(db, async (db) => {
    await run(db, "UPDATE correspondence SET assigned_to = ?, status = ?, updated_at = ? WHERE id = ?", userId, to, nowIso(), id);
    await event(db, id, actor.userId, c.assigned_to ? "REASSIGN" : "ASSIGN", c.status, to, note);
    await audit(db, { actorId: actor.userId, action: "correspondence.assign", category: "BUSINESS", entityType: "correspondence", entityId: id, orgUnitId: c.org_unit_id, details: { to: userId, from: c.assigned_to } });
  });
  await notify(db, userId, `Correspondence assigned: ${c.reference}`, c.subject, `/app/correspondence/${id}`, { category: "GENERAL", dedupeKey: `corr-assign:${id}:${userId}` });
}

/** Progress the record. The assigned officer or a manager may progress and close; only a manager files. */
export async function setCorrespondenceStatus(db: DB, actor: Actor, id: string, to: CorrStatus, opts: { note?: string; fileReference?: string; followUpDate?: string } = {}) {
  const c = await getCorrespondence(db, actor, id);
  const manager = can(actor, "correspondence.manage", c.org_unit_id);
  const assignee = c.assigned_to === actor.userId;
  if (!manager && !assignee) {
    await audit(db, { actorId: actor.userId, action: "correspondence.status", outcome: "DENIED", category: "SECURITY", entityType: "correspondence", entityId: id });
    throw forbidden("Only the assigned officer or a correspondence manager can progress this record.");
  }
  if (!(NEXT[c.status] ?? []).includes(to)) throw conflict(`A record that is ${CORR_STATUS_LABEL[c.status].toLowerCase()} cannot move to ${CORR_STATUS_LABEL[to]?.toLowerCase() ?? to}.`);
  if (to === "FILED" && !manager) throw forbidden("Only a correspondence manager can file a record.");
  const fileRef = opts.fileReference?.trim();
  if (to === "FILED" && (!fileRef || fileRef.length < 3)) throw invalid("Enter the filing reference.");
  if (opts.followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(opts.followUpDate)) throw invalid("Enter a valid follow-up date.");
  if (to === "AWAITING_REPLY" && !opts.followUpDate && !c.follow_up_date) throw invalid("Set a follow-up date while awaiting a reply.");
  screen(opts.note);
  screen(fileRef);
  await tx(db, async (db) => {
    await run(db, `UPDATE correspondence SET status = ?, file_reference = COALESCE(?, file_reference), follow_up_date = COALESCE(?, follow_up_date), updated_at = ? WHERE id = ? AND status = ?`,
      to, to === "FILED" ? fileRef : null, opts.followUpDate ?? null, nowIso(), id, c.status);
    await event(db, id, actor.userId, "STATUS", c.status, to, opts.note);
    await audit(db, { actorId: actor.userId, action: "correspondence.status", category: "BUSINESS", entityType: "correspondence", entityId: id, orgUnitId: c.org_unit_id, details: { from: c.status, to } });
  });
}

// ---------------------------------------------------------------------------------------------------------
// Documents

export async function filesEnabled(db: DB) {
  return (await one<{ value: string }>(db, "SELECT value FROM app_settings WHERE `key` = 'correspondence.files_enabled'"))?.value === "1";
}

const DANGEROUS = [/\/JavaScript\b/, /\/JS\b/, /\/Launch\b/, /\/EmbeddedFiles?\b/, /\/RichMedia\b/, /\/XFA\b/, /\/AA\b/, /\/SubmitForm\b/, /\/ImportData\b/, /\/GoToE\b/];

/** Structural PDF screen. Returns a reason when the file must be refused, or null when it passes. */
export function screenPdf(bytes: Buffer): string | null {
  if (bytes.length === 0) return "The file is empty.";
  if (bytes.length > MAX_FILE_BYTES) return "The file is larger than 5 MB.";
  if (!/^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString("latin1"))) return "The file is not a PDF document.";
  if (!bytes.subarray(Math.max(0, bytes.length - 2048)).toString("latin1").includes("%%EOF")) return "The PDF is incomplete or damaged.";
  const raw = bytes.toString("latin1");
  if (/\/Encrypt\b/.test(raw)) return "Encrypted or password-protected PDFs cannot be checked and are not accepted.";
  const texts = [raw];
  // Inspect compressed streams too: actions can hide inside object streams.
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  let inflated = 0;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const out = inflateSync(bytes.subarray(start, end), { maxOutputLength: 20 * 1024 * 1024 });
      inflated += out.length;
      if (inflated > 50 * 1024 * 1024) return "The PDF expands to an unsafe size.";
      texts.push(out.toString("latin1"));
    } catch { /* not a Flate stream (images, fonts): nothing to inspect */ }
    re.lastIndex = end;
  }
  for (const t of texts) for (const d of DANGEROUS) if (d.test(t)) return "The PDF contains scripts, embedded files or automatic actions and is not accepted.";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9 ._()-]/g, "_").replace(/\s+/g, " ").trim().slice(0, 116);
  if (!cleaned.toLowerCase().endsWith(".pdf")) return `${cleaned.replace(/\.+$/, "") || "document"}.pdf`;
  return cleaned;
}

export async function listFiles(db: DB, actor: Actor, id: string) {
  await getCorrespondence(db, actor, id);
  return await all<{ id: string; file_name: string; size_bytes: number; sha256: string; uploaded_at: string; uploaded_by_name: string }>(db,
    `SELECT f.id, f.file_name, f.size_bytes, f.sha256, f.uploaded_at, u.display_name AS uploaded_by_name FROM correspondence_files f JOIN users u ON u.id = f.uploaded_by
      WHERE f.correspondence_id = ? AND f.removed_at IS NULL ORDER BY f.uploaded_at`, id);
}

export async function attachFile(db: DB, actor: Actor, id: string, fileName: string, bytes: Buffer) {
  const c = await getCorrespondence(db, actor, id);
  if (!(can(actor, "correspondence.register", c.org_unit_id) || can(actor, "correspondence.manage", c.org_unit_id) || c.assigned_to === actor.userId)) {
    await audit(db, { actorId: actor.userId, action: "correspondence.file.attach", outcome: "DENIED", category: "SECURITY", entityType: "correspondence", entityId: id });
    throw forbidden("You cannot add documents to this record.");
  }
  if (!await filesEnabled(db)) throw forbidden("Document storage is switched off for correspondence.");
  if (c.status === "FILED") throw conflict("A filed record cannot receive new documents.");
  const reason = screenPdf(bytes);
  if (reason) {
    await audit(db, { actorId: actor.userId, action: "correspondence.file.attach", outcome: "DENIED", category: "SECURITY", entityType: "correspondence", entityId: id, details: { reason, size: bytes.length } });
    throw invalid(reason);
  }
  // Malware scan (issue #12): fails closed in production when no approved scanner is configured.
  const scan = await requireScan(bytes);
  if (scan.refusal) {
    await audit(db, { actorId: actor.userId, action: "correspondence.file.attach", outcome: "DENIED", category: "SECURITY", entityType: "correspondence", entityId: id, details: { reason: scan.refusal, scan: scan.verdict.outcome, size: bytes.length } });
    throw invalid(scan.refusal);
  }
  const count = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM correspondence_files WHERE correspondence_id = ? AND removed_at IS NULL", id))?.n ?? 0);
  if (count >= 10) throw conflict("A record can hold at most 10 documents.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (await one(db, "SELECT id FROM correspondence_files WHERE correspondence_id = ? AND sha256 = ? AND removed_at IS NULL", id, sha256)) throw conflict("This document is already attached.");
  const fid = newId("cfl");
  const name = safeFileName(fileName);
  await tx(db, async (db) => {
    await run(db, "INSERT INTO correspondence_files (id, correspondence_id, file_name, content_type, size_bytes, sha256, content, uploaded_by, uploaded_at) VALUES (?,?,?,?,?,?,?,?,?)",
      fid, id, name, "application/pdf", bytes.length, sha256, bytes, actor.userId, nowIso());
    await event(db, id, actor.userId, "FILE_ADD", null, null, name);
    await audit(db, { actorId: actor.userId, action: "correspondence.file.attach", category: "BUSINESS", entityType: "correspondence", entityId: id, orgUnitId: c.org_unit_id, details: { file: fid, name, size: bytes.length, sha256, scan: scan.verdict.outcome, scanEngine: scan.verdict.engine } });
  });
  return fid;
}

/** Returns the document for download; every download is audited. */
export async function downloadFile(db: DB, actor: Actor, fileId: string) {
  const f = await one<{ id: string; correspondence_id: string; file_name: string; content: Buffer; sha256: string }>(db,
    "SELECT id, correspondence_id, file_name, content, sha256 FROM correspondence_files WHERE id = ? AND removed_at IS NULL", fileId);
  if (!f) throw notFound();
  const c = await getCorrespondence(db, actor, f.correspondence_id);
  if (createHash("sha256").update(f.content).digest("hex") !== f.sha256) throw conflict("The stored document failed its integrity check. Report this to the technical administrator.");
  await audit(db, { actorId: actor.userId, action: "correspondence.file.download", category: "EXPORT", entityType: "correspondence", entityId: c.id, orgUnitId: c.org_unit_id, details: { file: f.id } });
  return { fileName: f.file_name, content: Buffer.from(f.content) };
}

export async function removeFile(db: DB, actor: Actor, fileId: string, reason: string) {
  const f = await one<{ id: string; correspondence_id: string; file_name: string }>(db, "SELECT id, correspondence_id, file_name FROM correspondence_files WHERE id = ? AND removed_at IS NULL", fileId);
  if (!f) throw notFound();
  const c = await getCorrespondence(db, actor, f.correspondence_id);
  await requirePermission(db, actor, "correspondence.manage", c.org_unit_id, { type: "correspondence", id: c.id });
  if (reason.trim().length < 5) throw invalid("Give a reason of at least 5 characters.");
  await tx(db, async (db) => {
    // Kept, not deleted: the record of what was attached and removed is part of the history.
    await run(db, "UPDATE correspondence_files SET removed_at = ?, removed_by = ? WHERE id = ?", nowIso(), actor.userId, fileId);
    await event(db, c.id, actor.userId, "FILE_REMOVE", null, null, `${f.file_name}: ${reason.trim()}`);
    await audit(db, { actorId: actor.userId, action: "correspondence.file.remove", category: "BUSINESS", entityType: "correspondence", entityId: c.id, orgUnitId: c.org_unit_id, details: { file: fileId, reason: reason.trim() } });
  });
}

/** Units where the actor may register correspondence (for the form). */
export async function registrableUnits(db: DB, actor: Actor) {
  const s = scopeFor(actor, "correspondence.register");
  if (!s.national && !s.units.length) return [];
  return await all<{ value: string; label: string }>(db,
    `SELECT id AS value, name AS label FROM org_units WHERE status = 'ACTIVE' ${s.national ? "" : `AND id IN (${s.units.map(() => "?").join(",")})`} ORDER BY name LIMIT 500`, ...(s.national ? [] : s.units));
}

export const canRegister = (actor: Actor) => hasPermission(actor, "correspondence.register");
