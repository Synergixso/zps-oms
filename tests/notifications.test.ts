import { describe, expect, it } from "vitest";
import { run } from "@/server/db/connection";
import { NOTIFICATION_PAGE_SIZE, listNotifications } from "@/server/domain/tasks";
import { actor, withDb } from "./helpers";

describe("notifications centre paging (NFR-002 low bandwidth)", () => {
  it("returns the actor's own notifications one page at a time, newest first, with clamped pages and filters", () => withDb(async (db) => {
    const me = await actor(db, "u_cb_sops");
    const other = await actor(db, "u_lsk_sops");
    await run(db, "DELETE FROM notifications WHERE user_id IN (?, ?)", me.userId, other.userId);
    const n = NOTIFICATION_PAGE_SIZE * 2 + 7;
    for (let i = 0; i < n; i++) {
      const at = new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString();
      await run(db, "INSERT INTO notifications (id, user_id, title, body, link, created_at, read_at, category) VALUES (?,?,?,?,?,?,?,?)",
        `ntf_page_${i}`, me.userId, `Demo notice ${i}`, "Synthetic", null, at, i % 2 ? at : null, i < 10 ? "APPROVAL" : "GENERAL");
    }
    await run(db, "INSERT INTO notifications (id, user_id, title, body, link, created_at, read_at, category) VALUES (?,?,?,?,?,?,?,?)",
      "ntf_page_other", other.userId, "Demo other", "Synthetic", null, new Date().toISOString(), null, "GENERAL");

    const p1 = await listNotifications(db, me);
    expect(p1).toMatchObject({ total: n, page: 1, pages: 3 });
    expect(p1.rows).toHaveLength(NOTIFICATION_PAGE_SIZE);
    expect(p1.rows[0].id).toBe(`ntf_page_${n - 1}`);
    const p3 = await listNotifications(db, me, undefined, false, 3);
    expect(p3.rows).toHaveLength(7);
    expect(p3.rows.at(-1)!.id).toBe("ntf_page_0");
    // Pages never overlap and together cover every notification exactly once.
    const p2 = await listNotifications(db, me, undefined, false, 2);
    expect(new Set([...p1.rows, ...p2.rows, ...p3.rows].map((r) => r.id)).size).toBe(n);
    // Out-of-range and malformed pages are clamped, never an error or an empty page.
    expect((await listNotifications(db, me, undefined, false, 99)).page).toBe(3);
    expect((await listNotifications(db, me, undefined, false, Number("x"))).page).toBe(1);
    expect((await listNotifications(db, me, undefined, false, -4)).page).toBe(1);
    // Filters apply to the count as well as the rows; nobody sees another user's notifications.
    expect((await listNotifications(db, me, undefined, true)).total).toBe(Math.ceil(n / 2));
    expect((await listNotifications(db, me, "APPROVAL")).total).toBe(10);
    expect((await listNotifications(db, me, "NOT_A_CATEGORY")).total).toBe(n); // unknown filters are ignored
    expect(p1.rows.concat(p2.rows, p3.rows).some((r) => r.id === "ntf_page_other")).toBe(false);
  }));
});
