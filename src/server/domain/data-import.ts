/**
 * Controlled import of establishment and personnel data (issue #8). Two steps, both server-side:
 *  1. PREVIEW validates every row and changes nothing;
 *  2. COMMIT re-validates the same file and applies it ALL-OR-NOTHING in one transaction, refusing if any row fails.
 *
 * Personnel rows go through `registerPersonnel` (the registry's own rules: identifier format for the environment —
 * synthetic SYN- numbers outside production, the Service's configured format in production — rank, home unit,
 * one canonical record per service number, personnel.register scope, audit). Establishment rows become ordinary
 * organisation change PROPOSALS (`proposeChange`, WF-03): nothing enters the directory until a different officer with
 * an ORG_CHANGE delegation approves each change, with an approval reference. The file itself is never stored; its
 * SHA-256 fingerprint, row count and outcome are audited. At most 500 rows per file.
 *
 * Real personnel data must not be imported into a development or demonstration environment: outside production the
 * identifier rule accepts synthetic service numbers only, so a real service number is refused there.
 */
import { createHash } from "node:crypto";
import type { DB } from "../db/connection";
import { one, tx } from "../db/connection";
import { audit } from "./audit";
import { invalid, today } from "./core";
import { type Actor, can, requirePermission } from "./policy";
import { EMPLOYMENT_STATUSES, nameKey, registerPersonnel, registerSchema } from "./personnel";
import { changeSchema, proposeChange } from "./org";

export const MAX_IMPORT_ROWS = 500;
export const PERSONNEL_COLUMNS = ["service_number", "surname", "first_names", "rank_code", "home_unit_code", "employment_status", "confirm_distinct"] as const;
export const ESTABLISHMENT_COLUMNS = ["code", "name", "unit_type", "parent_code", "duty_station", "record_basis", "effective_date", "reason"] as const;

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF. Returns rows of trimmed cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export interface RowResult { line: number; ok: boolean; errors: string[]; warnings: string[]; summary: string }
export interface ImportPreview { kind: "PERSONNEL" | "ESTABLISHMENT"; rows: RowResult[]; valid: number; invalid: number; fingerprint: string; fileErrors: string[] }

function table(text: string, columns: readonly string[], required: string[]) {
  const fileErrors: string[] = [];
  const rows = parseCsv(text);
  if (!rows.length) return { fileErrors: ["The file is empty."], records: [] as Array<{ line: number; r: Record<string, string> }> };
  const header = rows[0].map((h) => h.toLowerCase());
  const unknown = header.filter((h) => !columns.includes(h));
  const missing = required.filter((c) => !header.includes(c));
  if (unknown.length) fileErrors.push(`Unknown column(s): ${unknown.join(", ")}. Expected: ${columns.join(", ")}.`);
  if (missing.length) fileErrors.push(`Missing column(s): ${missing.join(", ")}.`);
  if (rows.length - 1 > MAX_IMPORT_ROWS) fileErrors.push(`At most ${MAX_IMPORT_ROWS} rows per file (this file has ${rows.length - 1}).`);
  if (rows.length < 2) fileErrors.push("The file has a header but no data rows.");
  const records = rows.slice(1).map((cells, i) => ({ line: i + 2, r: Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""])) }));
  return { fileErrors, records };
}
const publicRow = (r: RowResult): RowResult => ({ line: r.line, ok: r.ok, errors: r.errors, warnings: r.warnings, summary: r.summary });
const fingerprint = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const zodErrors = (e: unknown) => {
  const issues = (e as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues;
  return issues ? issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`) : [(e as Error).message];
};

// ── Personnel ───────────────────────────────────────────────────────────────────────────────────────
type PersonnelInput = Parameters<typeof registerPersonnel>[2];

async function validatePersonnel(db: DB, actor: Actor, text: string) {
  await requirePermission(db, actor, "personnel.register");
  const { fileErrors, records } = table(text, PERSONNEL_COLUMNS, ["service_number", "surname", "first_names", "rank_code", "home_unit_code"]);
  const seen = new Map<string, number>();
  const rows: Array<RowResult & { input?: PersonnelInput }> = [];
  for (const { line, r } of records) {
    const errors: string[] = [], warnings: string[] = [];
    const unit = r.home_unit_code ? await one<{ id: string; status: string }>(db, "SELECT id, status FROM org_units WHERE code = ?", r.home_unit_code) : undefined;
    if (!unit) errors.push(`home_unit_code: unit "${r.home_unit_code}" not found.`);
    else if (unit.status !== "ACTIVE") errors.push(`home_unit_code: unit "${r.home_unit_code}" is not active.`);
    else if (!can(actor, "personnel.register", unit.id)) errors.push(`home_unit_code: "${r.home_unit_code}" is outside your personnel registration scope.`);
    const employment = (r.employment_status || "SERVING").toUpperCase();
    if (!(EMPLOYMENT_STATUSES as readonly string[]).includes(employment)) errors.push(`employment_status: "${r.employment_status}" is not one of ${EMPLOYMENT_STATUSES.join(", ")}.`);
    const confirmDistinct = /^(yes|y|true|1)$/i.test(r.confirm_distinct ?? "");
    const parsed = registerSchema.safeParse({ serviceNumber: r.service_number, surname: r.surname, firstNames: r.first_names, rankCode: r.rank_code, homeUnitId: unit?.id ?? "-", employmentStatus: employment, confirmDistinct });
    if (!parsed.success) errors.push(...zodErrors(parsed.error));
    else {
      const sn = parsed.data.serviceNumber;
      if (seen.has(sn)) errors.push(`service_number: ${sn} also appears on line ${seen.get(sn)}.`);
      else seen.set(sn, line);
      if (await one(db, "SELECT id FROM personnel_records WHERE service_number = ?", sn)) errors.push(`service_number: ${sn} is already registered.`);
      if (!(await one(db, "SELECT code FROM ranks WHERE code = ?", parsed.data.rankCode))) errors.push(`rank_code: "${parsed.data.rankCode}" is not a valid rank.`);
      const similar = await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM personnel_records WHERE name_key = ? AND rank_code = ?", nameKey(parsed.data.surname, parsed.data.firstNames), parsed.data.rankCode);
      if (Number(similar?.n ?? 0) > 0) (confirmDistinct ? warnings : errors).push(`${similar!.n} existing record(s) have the same name and rank${confirmDistinct ? " (confirmed as a different officer)" : "; set confirm_distinct=yes if this is a different officer"}.`);
    }
    rows.push({ line, ok: errors.length === 0, errors, warnings, summary: `${r.service_number} ${r.surname}, ${r.first_names} (${r.rank_code}) → ${r.home_unit_code}`, input: parsed.success && unit ? { ...parsed.data, homeUnitId: unit.id } : undefined });
  }
  return { fileErrors, rows };
}

export async function previewPersonnelImport(db: DB, actor: Actor, text: string): Promise<ImportPreview> {
  const { fileErrors, rows } = await validatePersonnel(db, actor, text);
  return { kind: "PERSONNEL", fileErrors, rows: rows.map(publicRow), valid: rows.filter((r) => r.ok).length, invalid: rows.filter((r) => !r.ok).length, fingerprint: fingerprint(text) };
}

/** Registers every row or none. Returns the new personnel ids. */
export async function commitPersonnelImport(db: DB, actor: Actor, text: string): Promise<{ ids: string[]; fingerprint: string }> {
  const { fileErrors, rows } = await validatePersonnel(db, actor, text);
  const fp = fingerprint(text);
  if (fileErrors.length || rows.some((r) => !r.ok)) {
    await audit(db, { actorId: actor.userId, action: "personnel.import", outcome: "DENIED", category: "BUSINESS", details: { fingerprint: fp, rows: rows.length, invalid: rows.filter((r) => !r.ok).length, fileErrors: fileErrors.length } });
    throw invalid("The file has errors. Run the validation, correct every listed row and try again; nothing was imported.");
  }
  const ids = await tx(db, async (c) => {
    const out: string[] = [];
    for (const r of rows) out.push(await registerPersonnel(c, actor, r.input!));
    await audit(c, { actorId: actor.userId, action: "personnel.import", category: "BUSINESS", details: { fingerprint: fp, rows: out.length } });
    return out;
  });
  return { ids, fingerprint: fp };
}

// ── Establishment (organisation units, through WF-03 proposals) ─────────────────────────────────────
type ChangeInput = Parameters<typeof proposeChange>[2];

async function validateEstablishment(db: DB, actor: Actor, text: string) {
  await requirePermission(db, actor, "org.propose");
  const { fileErrors, records } = table(text, ESTABLISHMENT_COLUMNS, ["code", "name", "unit_type", "parent_code", "reason"]);
  const codes = new Map<string, number>();
  const rows: Array<RowResult & { input?: ChangeInput }> = [];
  for (const { line, r } of records) {
    const errors: string[] = [], warnings: string[] = [];
    const code = r.code.toUpperCase();
    if (codes.has(code)) errors.push(`code: ${code} also appears on line ${codes.get(code)}.`);
    codes.set(code, line);
    const parent = r.parent_code ? await one<{ id: string; status: string }>(db, "SELECT id, status FROM org_units WHERE code = ?", r.parent_code.toUpperCase()) : undefined;
    if (!parent) errors.push(records.some((x) => x.r.code.toUpperCase() === r.parent_code.toUpperCase())
      ? `parent_code: ${r.parent_code} is created by this file; import parent units first, have them approved and applied, then import their sub-units.`
      : `parent_code: unit "${r.parent_code}" not found.`);
    else if (parent.status !== "ACTIVE") errors.push(`parent_code: "${r.parent_code}" is not active.`);
    const basis = (r.record_basis || "").toUpperCase();
    if (basis && !["ESTABLISHED", "SYNTHETIC"].includes(basis)) errors.push(`record_basis: use ESTABLISHED or SYNTHETIC.`);
    const input = { changeType: "CREATE_UNIT" as const, code, name: r.name, unitType: r.unit_type.toUpperCase(), parentId: parent?.id ?? "-", reason: r.reason,
      effectiveDate: r.effective_date || today(), dutyStation: r.duty_station || undefined, recordBasis: (basis || undefined) as "ESTABLISHED" | "SYNTHETIC" | undefined };
    const parsed = changeSchema.safeParse(input);
    if (!parsed.success) errors.push(...zodErrors(parsed.error));
    if (await one(db, "SELECT id FROM org_units WHERE code = ?", code)) errors.push(`code: ${code} already exists.`);
    if (parent && parsed.success) {
      const pt = (await one<{ unit_type: string }>(db, "SELECT unit_type FROM org_units WHERE id = ?", parent.id))!.unit_type;
      if (!(await one(db, "SELECT 1 AS ok FROM org_type_rules WHERE parent_type = ? AND child_type = ?", pt, input.unitType))) errors.push(`unit_type: a ${input.unitType} cannot be placed under a ${pt}.`);
    }
    rows.push({ line, ok: errors.length === 0, errors, warnings, summary: `${code} ${r.name} (${r.unit_type}) under ${r.parent_code}${r.duty_station ? `, ${r.duty_station}` : ""}`, input: parsed.success ? (input as ChangeInput) : undefined });
  }
  return { fileErrors, rows };
}

export async function previewEstablishmentImport(db: DB, actor: Actor, text: string): Promise<ImportPreview> {
  const { fileErrors, rows } = await validateEstablishment(db, actor, text);
  return { kind: "ESTABLISHMENT", fileErrors, rows: rows.map(publicRow), valid: rows.filter((r) => r.ok).length, invalid: rows.filter((r) => !r.ok).length, fingerprint: fingerprint(text) };
}

/** Creates one WF-03 proposal per row, all or none. Returns the change references awaiting approval. */
export async function commitEstablishmentImport(db: DB, actor: Actor, text: string): Promise<{ references: string[]; fingerprint: string }> {
  const { fileErrors, rows } = await validateEstablishment(db, actor, text);
  const fp = fingerprint(text);
  if (fileErrors.length || rows.some((r) => !r.ok)) {
    await audit(db, { actorId: actor.userId, action: "org.import", outcome: "DENIED", category: "ORG", details: { fingerprint: fp, rows: rows.length, invalid: rows.filter((r) => !r.ok).length } });
    throw invalid("The file has errors. Run the validation, correct every listed row and try again; nothing was proposed.");
  }
  const references = await tx(db, async (c) => {
    const out: string[] = [];
    for (const r of rows) out.push((await proposeChange(c, actor, r.input!)).reference);
    await audit(c, { actorId: actor.userId, action: "org.import", category: "ORG", details: { fingerprint: fp, proposals: out.length } });
    return out;
  });
  return { references, fingerprint: fp };
}
