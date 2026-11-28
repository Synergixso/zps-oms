/**
 * DEC-076 — appointment-only command access, governed (owner direction 27 Nov 2026), and the DEC-075 review change to the
 * Area Commander mapping. Synthetic data only.
 */
import { afterEach, describe, expect, it } from "vitest";
import { all, one, run } from "@/server/db/connection";
import {
  APPOINTMENT_ONLY_ELIGIBLE, POSITION_TYPES, appointmentAccessPolicy, appointmentsOfUser, listAppointmentOnlyAccounts, officesHeld, setAppointmentAccess,
} from "@/server/domain/command";
import { userInScope } from "@/server/domain/iam";
import { actor, withDb } from "./helpers";

const ENV = process.env.ZPS_ENVIRONMENT;
afterEach(() => { if (ENV === undefined) delete process.env.ZPS_ENVIRONMENT; else process.env.ZPS_ENVIRONMENT = ENV; });
const REASON = "Owner direction recorded for the synthetic test (DEC-076).";

describe("appointment-only access policy", () => {
  it("eligibility is explicit (Sergeant and Constable only), never derived from an undecided role mapping", () => {
    expect(APPOINTMENT_ONLY_ELIGIBLE.sort()).toEqual(["CONSTABLE", "SERGEANT"]);
    // The Area Commander has no mapped role after the DEC-075 review, yet must not become appointment-only.
    expect(POSITION_TYPES.AREA_COMMANDER.role).toBeUndefined();
    expect(APPOINTMENT_ONLY_ELIGIBLE).not.toContain("AREA_COMMANDER");
  });

  it("defaults to on outside production and off in production; only platform configuration changes it, with a reason, audited", () => withDb(async (db) => {
    expect(await appointmentAccessPolicy(db)).toMatchObject({ enabled: true, source: "environment default", types: ["SERGEANT", "CONSTABLE"] });
    process.env.ZPS_ENVIRONMENT = "production";
    expect((await appointmentAccessPolicy(db)).enabled).toBe(false);
    expect(await officesHeld(db, await actor(db, "u_mu_cst"))).toEqual([]);
    const plat = await actor(db, "u_plat");
    // Production: switching on needs a Service decision reference.
    await expect(setAppointmentAccess(db, plat, { enabled: true, types: ["CONSTABLE", "SERGEANT"], reason: REASON })).rejects.toThrow(/Service decision/);
    await setAppointmentAccess(db, plat, { enabled: true, types: ["CONSTABLE", "SERGEANT"], reason: REASON, reference: "SYN-ZPS-DEC-076" });
    expect((await officesHeld(db, await actor(db, "u_mu_cst"))).map((h) => h.positionId)).toEqual(["pos_mu_cst"]);
    delete process.env.ZPS_ENVIRONMENT;
    // Not platform configuration: refused and audited.
    for (const id of ["u_rom", "u_hqc", "u_mu_cmd", "u_cb_tech"]) {
      await expect(setAppointmentAccess(db, await actor(db, id), { enabled: false, types: ["SERGEANT"], reason: REASON })).rejects.toThrow(/not authorised/);
    }
    await expect(setAppointmentAccess(db, plat, { enabled: false, types: ["SERGEANT"], reason: "short" })).rejects.toThrow();
    await expect(setAppointmentAccess(db, plat, { enabled: true, types: ["AREA_COMMANDER"], reason: REASON })).rejects.toThrow(/not an appointment-only office type/);
    await expect(setAppointmentAccess(db, plat, { enabled: true, types: ["INSPECTOR"], reason: REASON })).rejects.toThrow(/not an appointment-only office type/);
    const ev = (await one<{ details: string }>(db, "SELECT details FROM audit_events WHERE action = 'command.appointment_access.update' AND outcome = 'SUCCESS' ORDER BY seq DESC LIMIT 1"))!;
    expect(JSON.parse(ev.details)).toMatchObject({ from: { enabled: false }, to: { enabled: true, types: ["CONSTABLE", "SERGEANT"] }, reason: REASON, reference: "SYN-ZPS-DEC-076", environment: "production" });
    expect((await appointmentAccessPolicy(db)).lastChange?.reference).toBe("SYN-ZPS-DEC-076");
  }));

  it("office types narrow access: Constable only removes the Sergeant's access; switching off removes both at the next request", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    await setAppointmentAccess(db, plat, { enabled: true, types: ["CONSTABLE"], reason: REASON });
    expect(await officesHeld(db, await actor(db, "u_mu_sgt"))).toEqual([]);
    expect((await officesHeld(db, await actor(db, "u_mu_cst"))).length).toBe(1);
    await setAppointmentAccess(db, plat, { enabled: false, types: ["CONSTABLE", "SERGEANT"], reason: REASON });
    expect(await officesHeld(db, await actor(db, "u_mu_cst"))).toEqual([]);
    // Role holders are unaffected by the policy.
    expect((await officesHeld(db, await actor(db, "u_mu_sec"))).map((h) => h.positionId)).toEqual(["pos_mu_insp"]);
    // The Area Commander is a distinct appointment: the account holds the Area Commander office only (seed step 017).
    expect((await officesHeld(db, await actor(db, "u_mu_acoy"))).map((h) => h.positionId)).toEqual(["pos_mu_area_a"]);
  }));

  it("an appointment-only account in an office that is not an appointment-only type gets no command access", () => withDb(async (db) => {
    const t = new Date().toISOString();
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES ('u_t_area', 'demo.test.area', 'Demo Test Area Commander', 'Area Commander (synthetic)', 'ACTIVE', ?)", t);
    await run(db, "INSERT INTO command_positions (id, code, title, position_type, org_unit_id, created_at) VALUES ('pos_t_area', 'T_AREA', 'Test Area Commander (synthetic)', 'AREA_COMMANDER', 'org_mu_b', ?)", t);
    await run(db, "INSERT INTO position_appointments (id, position_id, user_id, valid_from, authorising_ref, created_at) VALUES ('pap_t_area', 'pos_t_area', 'u_t_area', '2025-01-01T00:00:00.000Z', 'SYN-T', ?)", t);
    expect(await officesHeld(db, await actor(db, "u_t_area"))).toEqual([]);
    const acc = (await listAppointmentOnlyAccounts(db, await actor(db, "u_plat"))).find((a) => a.user_id === "u_t_area")!;
    expect(acc.effective).toBe(false);
  }));

  it("administrators see appointment-only accounts within their scope and can support them there", () => withDb(async (db) => {
    const plat = await actor(db, "u_plat");
    const list = await listAppointmentOnlyAccounts(db, plat);
    expect(list.filter((a) => a.effective).map((a) => a.user_id).sort()).toEqual(["u_mu_cst", "u_mu_sgt"]);
    // The Mobile Unit technical administrator's scope covers 1 Section; the Kitwe District one does not.
    expect((await listAppointmentOnlyAccounts(db, await actor(db, "u_mu_tech"))).map((a) => a.user_id).sort()).toEqual(["u_mu_cst", "u_mu_sgt"]);
    expect(await listAppointmentOnlyAccounts(db, await actor(db, "u_kit_tech"))).toEqual([]);
    expect(await userInScope(db, await actor(db, "u_mu_tech"), "user.support", "u_mu_cst", "all")).toBe(true);
    expect(await userInScope(db, await actor(db, "u_kit_tech"), "user.support", "u_mu_cst", "all")).toBe(false);
    expect((await appointmentsOfUser(db, plat, "u_mu_cst")).map((r) => r.title)).toEqual(["Police Officer / Constable, 1 Section"]);
    await expect(listAppointmentOnlyAccounts(db, await actor(db, "u_mu_cst"))).rejects.toThrow(/not authorised/);
  }));
});

describe("DEC-075 review: Area Commander mapping withdrawn", () => {
  it("the seeded Area Commander office has no proposed role; validated mappings would be untouched", () => withDb(async (db) => {
    expect((await one<{ mapped_role_code: string | null }>(db, "SELECT mapped_role_code FROM command_positions WHERE id = 'pos_mu_area_a'"))!.mapped_role_code).toBeNull();
    const others = await all<{ position_type: string; mapped_role_code: string | null }>(db, "SELECT position_type, mapped_role_code FROM command_positions WHERE position_type IN ('DIVISIONAL_COMMANDER','STAFF_I','SECTION_PLATOON_COMMANDER')");
    for (const o of others) expect(o.mapped_role_code).not.toBeNull();
  }));
});
