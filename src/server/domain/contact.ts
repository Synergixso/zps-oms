/**
 * Public Contact page messages.
 * - Submitted anonymously from /contact; validated server-side; stored with a reference.
 * - Abuse controls: honeypot field, per-email hourly limit, length limits.
 * - Read and handled only by roles holding contact.view / contact.manage (HQ scope).
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { conflict, invalid, newId, nextReference, notFound, notify, now, nowIso } from "./core";
import { type Actor, HQ_ID, requirePermission } from "./policy";
import { ROLES } from "./catalogue";

export const CONTACT_SUBJECTS = {
  ENQUIRY: "General enquiry",
  SUPPORT: "Technical support",
  ACCESS: "System access / user accounts",
  FEEDBACK: "Feedback / suggestions",
} as const;
export type ContactSubject = keyof typeof CONTACT_SUBJECTS;

export const MESSAGE_MAX = 1000;
export const HOURLY_LIMIT_PER_EMAIL = 5;

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "Name is limited to 80 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^$|^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number, e.g. +260 97 123 4567.")
    .optional(),
  subject: z.enum(Object.keys(CONTACT_SUBJECTS) as [ContactSubject, ...ContactSubject[]], { message: "Select a subject." }),
  message: z.string().trim().min(10, "Your message must be at least 10 characters.").max(MESSAGE_MAX, `Your message is limited to ${MESSAGE_MAX} characters.`),
  /** Honeypot: hidden from people; automated submitters fill it in. */
  website: z.string().optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export interface ContactRow {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  subject: ContactSubject;
  message: string;
  status: "NEW" | "HANDLED";
  handled_by_name: string | null;
  handled_at: string | null;
  handled_note: string | null;
  created_at: string;
}

/** Stores a public message. Returns the reference shown to the sender. */
export async function submitContactMessage(db: DB, input: ContactInput): Promise<{ reference: string }> {
  const d = contactSchema.parse(input);
  if (d.website && d.website.trim() !== "") {
    // Silently discard automated submissions; the response looks identical.
    await audit(db, { actorId: null, action: "public.contact.submit", outcome: "DENIED", category: "SECURITY", details: { reason: "honeypot" } });
    return { reference: "CON-PENDING" };
  }
  const since = new Date(now().getTime() - 3600_000).toISOString();
  const recent = (await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM contact_messages WHERE email = ? AND created_at > ?", d.email, since))!.c;
  if (recent >= HOURLY_LIMIT_PER_EMAIL) {
    await audit(db, { actorId: null, action: "public.contact.submit", outcome: "DENIED", category: "SECURITY", details: { reason: "rate_limited" } });
    throw conflict("You have sent several messages recently. Please wait an hour before sending another.");
  }
  let reference = "";
  await tx(db, async (db) => {
    const id = newId("con");
    reference = await nextReference(db, "CON", "contact_messages");
    await run(
      db,
      `INSERT INTO contact_messages (id, reference, full_name, email, phone, subject, message, status, created_at) VALUES (?,?,?,?,?,?,?, 'NEW', ?)`,
      id,
      reference,
      d.fullName,
      d.email,
      d.phone || null,
      d.subject,
      d.message,
      nowIso(),
    );
    await audit(db, { actorId: null, action: "public.contact.submit", category: "BUSINESS", entityType: "contact_message", entityId: id, details: { reference, subject: d.subject } });
    for (const u of await inboxRecipients(db)) {
      await notify(db, u, `New contact message ${reference}`, `${CONTACT_SUBJECTS[d.subject]} from ${d.fullName}`, "/app/messages");
    }
  });
  return { reference };
}

/** Active users holding a role with contact.view at Service HQ. */
async function inboxRecipients(db: DB): Promise<string[]> {
  const roles = ROLES.filter((r) => r.permissions["contact.view"]).map((r) => r.code);
  if (!roles.length) return [];
  const t = nowIso();
  return (await all<{ user_id: string }>(
    db,
    `SELECT DISTINCT a.user_id FROM role_assignments a JOIN users u ON u.id = a.user_id
      WHERE a.org_unit_id = ? AND a.role_code IN (${roles.map(() => "?").join(",")}) AND a.revoked_at IS NULL
        AND u.status = 'ACTIVE' AND (a.valid_to IS NULL OR a.valid_to > ?)`,
    HQ_ID,
    ...roles,
    t,
  )).map((r) => r.user_id);
}

export async function listContactMessages(db: DB, actor: Actor, status?: "NEW" | "HANDLED"): Promise<ContactRow[]> {
  await requirePermission(db, actor, "contact.view", HQ_ID);
  return await all<ContactRow>(
    db,
    `SELECT c.*, u.display_name AS handled_by_name FROM contact_messages c LEFT JOIN users u ON u.id = c.handled_by
      ${status ? "WHERE c.status = ?" : ""} ORDER BY c.created_at DESC LIMIT 500`,
    ...(status ? [status] : []),
  );
}

export async function markContactHandled(db: DB, actor: Actor, id: string, note?: string) {
  await requirePermission(db, actor, "contact.manage", HQ_ID);
  const c = await one<{ status: string; reference: string }>(db, "SELECT status, reference FROM contact_messages WHERE id = ?", id);
  if (!c) throw notFound();
  if (c.status === "HANDLED") throw conflict("This message has already been marked as handled.");
  const n = note?.trim() ?? "";
  if (n.length > 500) throw invalid("The note is limited to 500 characters.");
  await tx(db, async (db) => {
    await run(db, "UPDATE contact_messages SET status = 'HANDLED', handled_by = ?, handled_at = ?, handled_note = ? WHERE id = ?", actor.userId, nowIso(), n || null, id);
    await audit(db, { actorId: actor.userId, action: "contact.handled", category: "BUSINESS", entityType: "contact_message", entityId: id, details: { reference: c.reference } });
  });
}
