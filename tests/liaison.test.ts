/**
 * Police Intelligence Officer roles (07, 19, 30, 31) and liaison administration (DEC-072, DEC-073).
 * Restricted permission template, scope at every level, approved routing channels, the metadata-only boundary
 * (no content can be stored), refused access audited, notifications and the routing history. Synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { PERMISSIONS, ROLE_BY_CODE, ROLES, type Permission } from "@/server/domain/catalogue";
import { hasPermission } from "@/server/domain/policy";
import { listPersonnel } from "@/server/domain/personnel";
import { pageAudit } from "@/server/domain/auditq";
import { pageCorrespondence } from "@/server/domain/correspondence";
import {
  acknowledgeLiaison, closeLiaison, createLiaison, getLiaison, LIAISON_ROLES, liaisonFigures, liaisonRouting, pageLiaison, pageLiaisonHistory,
  receiveLiaison, routingOptions, submitLiaison, updateLiaison, withdrawLiaison,
} from "@/server/domain/liaison";
import { today } from "@/server/domain/core";
import { actor, withDb } from "./helpers";

const LIAISON_PERMS = Object.keys(PERMISSIONS).filter((p) => p.startsWith("liaison.")) as Permission[];
const refs = async (db: Parameters<typeof pageLiaison>[0], a: Awaited<ReturnType<typeof actor>>, view?: "assigned" | "submissions" | "incoming" | "acknowledgements" | "reports") =>
  (await pageLiaison(db, a, { view, pageSize: 200 })).rows.map((r) => r.external_reference).sort();

describe("liaison role catalogue", () => {
  it("the four liaison roles hold the restricted liaison template only, at national, subtree, subtree and unit coverage", () => {
    expect(LIAISON_ROLES).toEqual(["NATIONAL_INTEL_OFFICER", "DIVISION_INTEL_OFFICER", "DISTRICT_INTEL_OFFICER", "INTEL_OFFICER"]);
    expect(LIAISON_PERMS).toHaveLength(7);
    const cover = { NATIONAL_INTEL_OFFICER: "NATIONAL", DIVISION_INTEL_OFFICER: "SUBTREE", DISTRICT_INTEL_OFFICER: "SUBTREE", INTEL_OFFICER: "UNIT" } as const;
    for (const code of LIAISON_ROLES) {
      const r = ROLE_BY_CODE[code];
      expect(Object.keys(r.permissions).sort(), code).toEqual([...LIAISON_PERMS].sort());
      for (const p of LIAISON_PERMS) expect(r.permissions[p]).toBe(cover[code as keyof typeof cover]);
      expect(r.category).toBe("FUNCTIONAL");
      expect(r.dashboard).toBe("LIAISON");
    }
    // No other role holds any liaison permission, and liaison roles hold nothing else.
    for (const r of ROLES.filter((x) => !LIAISON_ROLES.includes(x.code))) for (const p of LIAISON_PERMS) expect(r.permissions[p], `${r.code} ${p}`).toBeUndefined();
    expect(ROLE_BY_CODE.NATIONAL_INTEL_OFFICER.assignableTo).toEqual(["SERVICE_HQ"]);
    expect(ROLE_BY_CODE.DISTRICT_INTEL_OFFICER.assignableTo).toEqual(["DISTRICT"]);
    expect(ROLE_BY_CODE.INTEL_OFFICER.assignableTo).toEqual(["SECTION", "STATION"]);
  });

  it("the data model has no free-text content column (metadata-only boundary)", () => withDb(async (db) => {
    const cols = (await all<{ c: string }>(db, "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'liaison_records' ORDER BY ORDINAL_POSITION")).map((r) => r.c);
    expect(cols).toEqual(["id", "reference", "tenant_id", "kind", "external_reference", "origin_unit_id", "holding_unit_id", "responsible_user_id", "classification", "status",
      "date_submitted", "date_received", "date_acknowledged", "approval_reference", "version", "created_by", "created_at", "updated_at"]);
    const routing = (await all<{ c: string }>(db, "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'liaison_routing'")).map((r) => r.c);
    for (const banned of ["note", "notes", "subject", "summary", "body", "content", "description", "details", "comment"]) {
      expect(cols).not.toContain(banned);
      expect(routing).not.toContain(banned);
    }
  }));
});

describe("liaison officers cannot reach any other register", () => {
  it("no personnel, manpower, roster, assignment, correspondence, calendar, stores, fleet, report or audit access, refused server-side", () => withDb(async (db) => {
    for (const id of ["u_hq_pio", "u_cb_pio", "u_kit_pio", "u_kitc_pio", "u_mus_pio"]) {
      const a = await actor(db, id);
      for (const p of Object.keys(PERMISSIONS) as Permission[]) if (!p.startsWith("liaison.")) expect(hasPermission(a, p), `${id} ${p}`).toBe(false);
      await expect(listPersonnel(db, a)).rejects.toThrow(/not authorised/);
      await expect(pageAudit(db, a, {})).rejects.toThrow(/not authorised/);
      expect((await pageCorrespondence(db, a, {})).rows).toHaveLength(0);
    }
    // Each refusal of the registers is a SECURITY audit event.
    const denied = await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE actor_id = 'u_hq_pio' AND outcome = 'DENIED'");
    expect(Number(denied!.c)).toBeGreaterThanOrEqual(2);
  }));

  it("other roles cannot see liaison records", () => withDb(async (db) => {
    for (const id of ["u_cb_sops", "u_plat", "u_rom"]) {
      const a = await actor(db, id);
      for (const p of Object.keys(PERMISSIONS).filter((x) => x.startsWith("liaison.")) as Permission[]) expect(hasPermission(a, p)).toBe(false);
      await expect(pageLiaison(db, a, {})).rejects.toThrow(/not authorised/);
    }
  }));
});

describe("liaison scope at every level (seeded synthetic records)", () => {
  it("station, district, division and national officers each see only their own scope; another Province sees nothing", () => withDb(async (db) => {
    const [station, district, division, national, lusaka, section] = await Promise.all(["u_kitc_pio", "u_kit_pio", "u_cb_pio", "u_hq_pio", "u_lsk_pio", "u_mus_pio"].map((id) => actor(db, id)));
    expect(await refs(db, station)).toEqual(["SYN-KCS-LIA-0001", "SYN-KCS-RPT-0002", "SYN-KIT-LIA-0003"]);
    expect(await refs(db, district)).toEqual(["SYN-KCS-LIA-0001", "SYN-KIT-LIA-0003"]);
    expect(await refs(db, division)).toEqual(["SYN-HQ-RPT-0004", "SYN-KCS-LIA-0001", "SYN-KIT-LIA-0003"]);
    // Drafts stay at their own office: the national officer does not see the station's or Lusaka's drafts.
    expect(await refs(db, national)).toEqual(["SYN-HQ-RPT-0004", "SYN-KCS-LIA-0001", "SYN-KIT-LIA-0003"]);
    expect(await refs(db, lusaka)).toEqual(["SYN-LSK-LIA-0005"]);
    expect(await refs(db, section)).toEqual([]);
    // Views: the district's queue holds the downward submission awaiting the station; the division's queue holds both items routed to it.
    expect(await refs(db, station, "incoming")).toEqual(["SYN-KIT-LIA-0003"]);
    expect(await refs(db, division, "incoming")).toEqual(["SYN-HQ-RPT-0004", "SYN-KCS-LIA-0001"]);
    expect(await refs(db, national, "reports")).toEqual(["SYN-HQ-RPT-0004"]);
    expect(await refs(db, station, "reports")).toEqual(["SYN-KCS-RPT-0002"]);
    // Out-of-scope record: NOT_FOUND (existence not disclosed) and a DENIED security event.
    const r1 = (await one<{ id: string }>(db, "SELECT id FROM liaison_records WHERE external_reference = 'SYN-KCS-LIA-0001'"))!.id;
    await expect(getLiaison(db, lusaka, r1)).rejects.toThrow(/not found/i);
    await expect(getLiaison(db, section, r1)).rejects.toThrow(/not found/i);
    expect((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE actor_id = 'u_lsk_pio' AND action = 'liaison.view' AND outcome = 'DENIED' AND entity_id = ?", r1))!.c).toBe(1);
    // Figures follow the same scope.
    const f = (await liaisonFigures(db, lusaka))!;
    expect(Object.values(f.status).reduce((a, b) => a + b, 0)).toBe(1);
  }));
});

describe("liaison workflow", () => {
  it("record → submit → receive → acknowledge → route onward → receive → acknowledge → close, with history, audit and notifications", () => withDb(async (db) => {
    const [station, district, division] = await Promise.all(["u_kitc_pio", "u_kit_pio", "u_cb_pio"].map((id) => actor(db, id)));
    const t = today();
    const r = await createLiaison(db, station, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe_central", externalReference: "SYN-T-0100" });
    expect(r.reference).toMatch(/^LIA-\d{4}-\d{6}$/);
    expect(r.status).toBe("DRAFT");
    const options = (await routingOptions(db, station, r.id)).map((o) => o.id);
    expect(options).toContain("org_cb_kitwe");
    expect(options).not.toContain("org_cb_kitwe_nkana"); // no liaison officer there
    await submitLiaison(db, station, r.id, { toUnitId: "org_cb_kitwe", dateSubmitted: t });
    expect(await one(db, "SELECT id FROM notifications WHERE user_id = 'u_kit_pio' AND link = ?", `/app/liaison/records/${r.id}`)).toBeTruthy();
    // The station cannot record receipt at the district.
    await expect(receiveLiaison(db, station, r.id, { dateReceived: t })).rejects.toThrow(/not authorised/);
    const received = await receiveLiaison(db, district, r.id, { dateReceived: t });
    expect(received.responsible_user_id).toBe("u_kit_pio");
    await expect(withdrawLiaison(db, station, r.id)).rejects.toThrow(/withdrawn|responsible/);
    await acknowledgeLiaison(db, district, r.id, { dateAcknowledged: t, approvalReference: "SYN-APPR-T-1" });
    expect(await one(db, "SELECT id FROM notifications WHERE user_id = 'u_kitc_pio' AND title = 'Liaison reference acknowledged' AND link = ?", `/app/liaison/records/${r.id}`)).toBeTruthy();
    await submitLiaison(db, district, r.id, { toUnitId: "org_cb", dateSubmitted: t });
    await receiveLiaison(db, division, r.id, { dateReceived: t });
    await acknowledgeLiaison(db, division, r.id, { dateAcknowledged: t });
    const closed = await closeLiaison(db, division, r.id);
    expect(closed.status).toBe("CLOSED");
    const h = await liaisonRouting(db, station, r.id);
    expect(h.map((e) => e.action)).toEqual(["RECORD", "SUBMIT", "RECEIVE", "ACKNOWLEDGE", "ROUTE", "RECEIVE", "ACKNOWLEDGE", "CLOSE"]);
    expect(h.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Audit events carry previous and resulting status, the units and the approval reference.
    const route = await one<{ details: string }>(db, "SELECT details FROM audit_events WHERE action = 'liaison.route' AND entity_id = ?", r.id);
    expect(JSON.parse(route!.details)).toMatchObject({ from: "org_cb_kitwe", to: "org_cb", previousStatus: "ACKNOWLEDGED", status: "SUBMITTED", approvalReference: "SYN-APPR-T-1" });
    // The history page shows the same events to the station (origin in scope) but not to another Province.
    expect((await pageLiaisonHistory(db, station, { q: r.reference })).total).toBe(8);
    expect((await pageLiaisonHistory(db, await actor(db, "u_lsk_pio"), { q: r.reference })).total).toBe(0);
  }));

  it("refuses routing outside approved channels, to offices without a liaison officer, and by anyone but the responsible officer", () => withDb(async (db) => {
    const [station, division, district] = await Promise.all(["u_kitc_pio", "u_cb_pio", "u_kit_pio"].map((id) => actor(db, id)));
    const t = today();
    const r = await createLiaison(db, station, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe_central" });
    await expect(submitLiaison(db, station, r.id, { toUnitId: "org_lsk_central", dateSubmitted: t })).rejects.toThrow(/approved organisational channels/);
    await expect(submitLiaison(db, station, r.id, { toUnitId: "org_cb_kitwe_nkana", dateSubmitted: t })).rejects.toThrow(/approved organisational channels|No liaison officer/);
    // A draft is not visible above its own office, so a supervising officer can neither see nor act on it.
    await expect(submitLiaison(db, division, r.id, { toUnitId: "org_cb_kitwe", dateSubmitted: t })).rejects.toThrow(/not found/i);
    await expect(updateLiaison(db, division, r.id, { kind: "REPORT_REFERENCE", classification: "UNCLASSIFIED" })).rejects.toThrow(/not found/i);
    // Records are created for the officer's own office only, never for a subordinate unit or another Province.
    await expect(createLiaison(db, district, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe_central" })).rejects.toThrow(/own office/);
    await expect(createLiaison(db, district, { kind: "SUBMISSION", originUnitId: "org_lsk_central" })).rejects.toThrow(/not authorised/);
    // Dates: not in the future, receipt not before submission.
    await expect(submitLiaison(db, station, r.id, { toUnitId: "org_cb_kitwe", dateSubmitted: "2999-01-01" })).rejects.toThrow(/future/);
    await submitLiaison(db, station, r.id, { toUnitId: "org_cb_kitwe", dateSubmitted: t });
    await expect(receiveLiaison(db, district, r.id, { dateReceived: "2000-01-01" })).rejects.toThrow(/cannot be before/);
    // The division sees the submission (subtree) but only the receiving office's own officer records receipt.
    await expect(receiveLiaison(db, division, r.id, { dateReceived: t })).rejects.toThrow(/receiving office/);
    // A submission not yet received can be withdrawn by the responsible officer.
    expect((await withdrawLiaison(db, station, r.id)).status).toBe("WITHDRAWN");
  }));

  it("reference fields accept reference numbers only: no free text and no excluded descriptive terms", () => withDb(async (db) => {
    const station = await actor(db, "u_kitc_pio");
    const base = { kind: "SUBMISSION" as const, originUnitId: "org_cb_kitwe_central" };
    await expect(createLiaison(db, station, { ...base, externalReference: "Informant meeting at the market" })).rejects.toThrow();
    await expect(createLiaison(db, station, { ...base, externalReference: "SURVEILLANCE-01" })).rejects.toThrow(/reference number only/);
    await expect(createLiaison(db, station, { ...base, approvalReference: "covert/ops/1" })).rejects.toThrow(/reference number only/);
    await expect(createLiaison(db, station, { ...base, externalReference: "<script>" })).rejects.toThrow();
    const ok = await createLiaison(db, station, { ...base, externalReference: "ABC/123/2026" });
    await expect(createLiaison(db, station, { ...base, externalReference: "ABC/123/2026" })).rejects.toThrow(/already recorded/);
    expect(ok.external_reference).toBe("ABC/123/2026");
  }));
});

describe("liaison concurrency", () => {
  it("a step that loses a race to another change records nothing (no routing event, no audit event)", () => withDb(async (db) => {
    const [station, district] = await Promise.all(["u_kitc_pio", "u_kit_pio"].map((id) => actor(db, id)));
    const t = today();
    const r = await createLiaison(db, station, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe_central", externalReference: "SYN-RACE-0001" });
    await submitLiaison(db, station, r.id, { toUnitId: "org_cb_kitwe", dateSubmitted: t });
    // Another officer's change lands between this officer's read and write: bump the version just before the receipt update runs.
    let fired = false;
    const racing = new Proxy(db, {
      get(target, prop, recv) {
        if (prop === "query") {
          return async (sql: string, params?: unknown[]) => {
            if (!fired && /UPDATE liaison_records SET status = 'RECEIVED'/.test(sql)) {
              fired = true;
              await target.query("UPDATE liaison_records SET version = version + 1 WHERE id = ?", [r.id]);
            }
            return target.query(sql, params);
          };
        }
        const v = Reflect.get(target, prop, recv);
        return typeof v === "function" ? v.bind(target) : v;
      },
    }) as typeof db;
    await expect(receiveLiaison(racing, district, r.id, { dateReceived: t })).rejects.toThrow(/changed by someone else/);
    expect(fired).toBe(true);
    const after = (await one<{ status: string }>(db, "SELECT status FROM liaison_records WHERE id = ?", r.id))!;
    expect(after.status).toBe("SUBMITTED");
    expect(await one(db, "SELECT id FROM liaison_routing WHERE record_id = ? AND action = 'RECEIVE'", r.id)).toBeUndefined();
    expect(await one(db, "SELECT seq FROM audit_events WHERE action = 'liaison.receive' AND entity_id = ?", r.id)).toBeUndefined();
  }));
});
