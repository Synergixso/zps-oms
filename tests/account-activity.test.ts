import { describe, expect, it } from "vitest";
import { all } from "@/server/db/connection";
import { authenticate } from "@/server/domain/auth";
import { endSession, myAccountActivity, userAccountActivity } from "@/server/domain/account-activity";
import { createSession } from "@/server/domain/sessions";
import { actor, withDb } from "./helpers";

describe("Module 02 — sessions and sign-in history", () => {
  it("lists own sessions and history, ends other sessions, and refuses ending the current one", () => withDb(async (db) => {
    const me = await actor(db, "u_cb_sops");
    await db.query("DELETE FROM sessions WHERE user_id = ?", [me.userId]);
    const current = await createSession(db, me.userId);
    const other = await createSession(db, me.userId);
    await authenticate(db, "demo.cb.staffops", "not-the-password", "test-client");
    const a = await myAccountActivity(db, me, current);
    expect(a.sessions).toHaveLength(2);
    expect(a.sessions.filter((s) => s.current)).toHaveLength(1);
    expect(a.sessions.every((s) => s.short.length === 8)).toBe(true);
    expect(a.history.some((h) => h.action === "auth.signin" && h.outcome === "DENIED" && /bad password/.test(h.summary))).toBe(true);
    const cur = a.sessions.find((s) => s.current)!;
    await expect(endSession(db, me, cur.id, current)).rejects.toThrow(/Sign out/);
    const oth = a.sessions.find((s) => !s.current)!;
    await endSession(db, me, oth.id, current);
    expect((await myAccountActivity(db, me, current)).sessions).toHaveLength(1);
    void other;
  }));

  it("lets account support in scope end a user's session, and hides sessions of users outside scope", () => withDb(async (db) => {
    const user = await actor(db, "u_cb_sops");
    await db.query("DELETE FROM sessions WHERE user_id = ?", [user.userId]);
    await createSession(db, user.userId);
    const [s] = await all<{ id: string }>(db, "SELECT id FROM sessions WHERE user_id = ?", user.userId);
    // Another Division's staff officer can neither see nor end it.
    await expect(endSession(db, await actor(db, "u_lsk_sops"), s.id, undefined)).rejects.toThrow();
    // The Division's technical administrator (account support in scope) can.
    const tech = await actor(db, "u_cb_tech");
    expect((await userAccountActivity(db, tech, user.userId)).sessions.map((x) => x.id)).toEqual([s.id]);
    await endSession(db, tech, s.id, undefined);
    expect(await all(db, "SELECT id FROM sessions WHERE id = ?", s.id)).toEqual([]);
    const notes = await all<{ title: string }>(db, "SELECT title FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", user.userId);
    expect(notes[0].title).toMatch(/sessions was ended/);
    expect((await userAccountActivity(db, tech, user.userId)).history.some((h) => h.action === "iam.session.end")).toBe(true);
    // Lusaka is outside the Copperbelt technical administrator's scope.
    await expect(userAccountActivity(db, tech, "u_lsk_sops")).rejects.toThrow();
  }));
});
