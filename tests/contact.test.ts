import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { HOURLY_LIMIT_PER_EMAIL, listContactMessages, markContactHandled, submitContactMessage } from "@/server/domain/contact";
import { actor, withDb } from "./helpers";

const valid = {
  fullName: "Demo Visitor",
  email: "Demo.Visitor@example.org",
  phone: "+260 97 123 4567",
  subject: "SUPPORT" as const,
  message: "Synthetic test message asking for technical support.",
};

describe("Public contact messages", () => {
  it("stores a valid message with a reference, audits it and notifies the inbox", () => withDb(async (db) => {
    const { reference } = await submitContactMessage(db, valid);
    expect(reference).toMatch(/^CON-\d{4}-\d{6}$/);
    const row = (await one<{ email: string; status: string }>(db, "SELECT email, status FROM contact_messages WHERE reference = ?", reference))!;
    expect(row).toEqual({ email: "demo.visitor@example.org", status: "NEW" });
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE action = 'public.contact.submit' AND outcome = 'SUCCESS'"))!.c).toBe(1);
    const notified = (await all<{ user_id: string }>(db, "SELECT user_id FROM notifications WHERE link = '/app/messages'")).map((n) => n.user_id).sort();
    expect(notified).toEqual(["u_hqc", "u_plat"]);
  }));

  it("rejects invalid input on the server", () => withDb(async (db) => {
    await expect(submitContactMessage(db, { ...valid, email: "not-an-email" })).rejects.toThrow();
    await expect(submitContactMessage(db, { ...valid, subject: "TACTICAL" as never })).rejects.toThrow();
    await expect(submitContactMessage(db, { ...valid, message: "short" })).rejects.toThrow();
    await expect(submitContactMessage(db, { ...valid, message: "x".repeat(1001) })).rejects.toThrow();
    await expect(submitContactMessage(db, { ...valid, phone: "call me" })).rejects.toThrow();
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM contact_messages"))!.c).toBe(0);
  }));

  it("silently discards honeypot submissions", () => withDb(async (db) => {
    await submitContactMessage(db, { ...valid, website: "http://spam.example" });
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM contact_messages"))!.c).toBe(0);
  }));

  it("limits messages per email per hour", () => withDb(async (db) => {
    for (let i = 0; i < HOURLY_LIMIT_PER_EMAIL; i++) await submitContactMessage(db, valid);
    await expect(submitContactMessage(db, valid)).rejects.toThrow(/wait an hour/i);
  }));

  it("only inbox roles can read and handle messages", () => withDb(async (db) => {
    const { reference } = await submitContactMessage(db, valid);
    await expect(listContactMessages(db, await actor(db, "u_lsk_sops"))).rejects.toThrow(/not authorised/i);
    await expect(listContactMessages(db, await actor(db, "u_dig"))).rejects.toThrow(/not authorised/i);
    const rows = await listContactMessages(db, await actor(db, "u_hqc"), "NEW");
    expect(rows.map((r) => r.reference)).toEqual([reference]);
    await expect(markContactHandled(db, await actor(db, "u_audit"), rows[0].id)).rejects.toThrow(/not authorised/i);
    await markContactHandled(db, await actor(db, "u_plat"), rows[0].id, "Account access granted (synthetic).");
    expect((await listContactMessages(db, await actor(db, "u_hqc"), "HANDLED"))[0].handled_by_name).toBe("Demo Platform Administrator");
    await expect(markContactHandled(db, await actor(db, "u_hqc"), rows[0].id)).rejects.toThrow(/already/i);
  }));
});
