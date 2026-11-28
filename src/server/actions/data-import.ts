"use server";
/** Server actions for the controlled import (issue #8). All validation, scope and audit rules live in `domain/data-import.ts`. */
import { revalidatePath } from "next/cache";
import { getDb } from "../db/connection";
import { requireActor } from "../auth/session";
import { commitEstablishmentImport, commitPersonnelImport, previewEstablishmentImport, previewPersonnelImport, type ImportPreview } from "../domain/data-import";
import { str, toState } from "./result";

export type ImportState = { error?: string; preview?: ImportPreview; csv?: string; done?: string } | null;
const MAX_BYTES = 1024 * 1024;

async function readCsv(fd: FormData): Promise<string> {
  const f = fd.get("file");
  if (f && typeof f === "object" && "arrayBuffer" in f && (f as File).size > 0) {
    if ((f as File).size > MAX_BYTES) throw new Error("TOO_BIG");
    return Buffer.from(await (f as File).arrayBuffer()).toString("utf8");
  }
  return str(fd, "csv");
}

export async function importAction(_: ImportState, fd: FormData): Promise<ImportState> {
  const actor = await requireActor();
  const kind = str(fd, "kind") === "ESTABLISHMENT" ? "ESTABLISHMENT" : "PERSONNEL";
  const step = str(fd, "step");
  let csv: string;
  try {
    csv = await readCsv(fd);
  } catch {
    return { error: "The file is larger than 1 MB." };
  }
  if (!csv.trim()) return { error: "Choose a CSV file." };
  const db = getDb();
  try {
    if (step === "COMMIT") {
      if (kind === "PERSONNEL") {
        const r = await commitPersonnelImport(db, actor, csv);
        revalidatePath("/app/personnel");
        return { done: `${r.ids.length} personnel record(s) registered (file fingerprint ${r.fingerprint.slice(0, 12)}…).` };
      }
      const r = await commitEstablishmentImport(db, actor, csv);
      revalidatePath("/app/org/changes");
      return { done: `${r.references.length} organisation change proposal(s) created and sent for approval: ${r.references.join(", ")}.` };
    }
    const preview = kind === "PERSONNEL" ? await previewPersonnelImport(db, actor, csv) : await previewEstablishmentImport(db, actor, csv);
    return { preview, csv };
  } catch (e) {
    const s = toState(e);
    return { error: s?.error ?? "The import failed." };
  }
}
