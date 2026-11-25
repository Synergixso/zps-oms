import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { HOURLY_LIMIT_PER_EMAIL, listContactMessages, markContactHandled, submitContactMessage } from "@/server/domain/contact";
import { actor, freshDb } from "./helpers";

const valid = {
  fullName: "Demo Visitor",
  email: "Demo.Visitor@example.org",
  phone: "+260 97 123 4567",
  subject: "SUPPORT" as const,
  message: "Synthetic test message asking for technical support.",
};

describe("Public contact messages", () => {
  it("stores a valid message with a reference, audits it and notifies the inbox", () => {
    const db = freshDb();
    const { reference } = submitContactMessage(db, valid);
    expect(reference).toMatch(/^CON-\d{4}-\d{6}$/);
    const row = one<{ email: string; status: string }>(db, "SELECT email, status FROM contact_messages WHERE reference = ?", reference)!;
    expect(row).toEqual({ email: "demo.visitor@example.org", status: "NEW" });
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE action = 'public.contact.submit' AND outcome = 'SUCCESS'")!.c).toBe(1);
    const notified = all<{ user_id: string }>(db, "SELECT user_id FROM notifications WHERE link = '/app/messages'").map((n) => n.user_id).sort();
    expect(notified).toEqual(["u_hqc", "u_plat"]);
  });

  it("rejects invalid input on the server", () => {
    const db = freshDb();
    expect(() => submitContactMessage(db, { ...valid, email: "not-an-email" })).toThrow();
    expect(() => submitContactMessage(db, { ...valid, subject: "TACTICAL" as never })).toThrow();
    expect(() => submitContactMessage(db, { ...valid, message: "short" })).toThrow();
    expect(() => submitContactMessage(db, { ...valid, message: "x".repeat(1001) })).toThrow();
    expect(() => submitContactMessage(db, { ...valid, phone: "call me" })).toThrow();
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM contact_messages")!.c).toBe(0);
  });

  it("silently discards honeypot submissions", () => {
    const db = freshDb();
    submitContactMessage(db, { ...valid, website: "http://spam.example" });
    expect(one<{ c: number }>(db, "SELECT COUNT(*) c FROM contact_messages")!.c).toBe(0);
  });

  it("limits messages per email per hour", () => {
    const db = freshDb();
    for (let i = 0; i < HOURLY_LIMIT_PER_EMAIL; i++) submitContactMessage(db, valid);
    expect(() => submitContactMessage(db, valid)).toThrow(/wait an hour/i);
  });

  it("only inbox roles can read and handle messages", () => {
    const db = freshDb();
    const { reference } = submitContactMessage(db, valid);
    expect(() => listContactMessages(db, actor(db, "u_lsk_sops"))).toThrow(/not authorised/i);
    expect(() => listContactMessages(db, actor(db, "u_dig"))).toThrow(/not authorised/i);
    const rows = listContactMessages(db, actor(db, "u_hqc"), "NEW");
    expect(rows.map((r) => r.reference)).toEqual([reference]);
    expect(() => markContactHandled(db, actor(db, "u_audit"), rows[0].id)).toThrow(/not authorised/i);
    markContactHandled(db, actor(db, "u_plat"), rows[0].id, "Account access granted (synthetic).");
    expect(listContactMessages(db, actor(db, "u_hqc"), "HANDLED")[0].handled_by_name).toBe("Demo Platform Administrator");
    expect(() => markContactHandled(db, actor(db, "u_hqc"), rows[0].id)).toThrow(/already/i);
  });
});
