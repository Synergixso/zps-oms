/**
 * Executive portfolios (final master directive Parts B–E; DEC-086 … DEC-088). Synthetic data from seed step 019.
 * Positive AND negative: each office can do what its mandate allows, and nothing more.
 */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { commandChain, issueDirective, officesHeld } from "@/server/domain/command";
import { addDays, today } from "@/server/domain/core";
import {
  administersTraining, createCourse, createSession, decideNeed, decideNomination, getSession, listNominations, nominate, recommendNomination, recordAttendance, recordResult,
  submitNeed, trainingOverview, withdrawNomination,
} from "@/server/domain/training";
import { createAgreement, getActivity, getAgreement, listActivities, recordServiceReport, registerActivity, updateActivity } from "@/server/domain/ops-admin";
import { actOnCoordination, getCoordination, listCoordination, submitCoordination } from "@/server/domain/coordination";
import { actor, withDb } from "./helpers";

type Db = Parameters<typeof nominate>[0];
const cbOfficer = async (db: Db, skip = 20) => (await one<{ id: string }>(db,
  "SELECT id FROM personnel_records WHERE employment_status = 'SERVING' AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb') ORDER BY id LIMIT 1 OFFSET ?", skip))!.id;
const openSession = async (db: Db) => (await one<{ id: string }>(db, "SELECT id FROM training_sessions WHERE status = 'OPEN' AND delivering_unit_id = 'org_mu' ORDER BY start_date LIMIT 1"))!.id;

describe("executive hierarchy (Part B)", () => {
  it("the IG has no superior; DIG Operations, DIG Administration and DIG Special Duties / State House each report directly to the IG", () => withDb(async (db) => {
    expect(await commandChain(db, "pos_ig")).toEqual([]);
    for (const p of ["pos_dig_ops", "pos_dig_adm", "pos_dig_sd"]) expect(await commandChain(db, p)).toEqual(["pos_ig"]);
    expect((await one<{ title: string }>(db, "SELECT title FROM command_positions WHERE id = 'pos_dig_sd'"))!.title).toBe("Deputy Inspector General – Special Duties / State House");
    // No DIG can instruct the IG or another DIG.
    const dig = await actor(db, "u_dig");
    for (const to of ["pos_ig", "pos_dig_adm", "pos_dig_sd"]) {
      await expect(issueDirective(db, dig, { fromPositionId: "pos_dig_ops", toPositionId: to, category: "ADMIN_INSTRUCTION", subject: "Synthetic instruction", instructions: "Synthetic instruction to a peer or superior office." })).rejects.toThrow();
    }
  }));

  it("executive appointees without an application role hold their own office only", () => withDb(async (db) => {
    expect((await officesHeld(db, await actor(db, "u_digadm"))).map((h) => h.positionId)).toEqual(["pos_dig_adm"]);
    expect((await officesHeld(db, await actor(db, "u_digsd"))).map((h) => h.positionId)).toEqual(["pos_dig_sd"]);
    expect(await administersTraining(db, await actor(db, "u_digadm"))).toBe(true);
    expect(await administersTraining(db, await actor(db, "u_dig"))).toBe(false); // DIG Operations does not administer training
  }));
});

describe("training management (DIG Administration, Part C)", () => {
  it("need → nomination → recommendation → approval → attendance → certified completion, each by the right office", () => withDb(async (db) => {
    const adm = await actor(db, "u_digadm"), sops = await actor(db, "u_cb_sops"), cmd = await actor(db, "u_cb_cmd"), spom = await actor(db, "u_mu_cmd");
    const need = await submitNeed(db, sops, { requestingUnitId: "org_cb", topic: "Synthetic test training need", category: "PUBLIC_ORDER", officersCount: 5, priority: "LOW", justification: "Synthetic justification for the test." });
    await decideNeed(db, adm, need.id, "ACCEPTED");
    const session = await openSession(db);
    const n = await nominate(db, sops, { sessionId: session, personnelId: await cbOfficer(db) });
    await expect(recommendNomination(db, sops, n.id, true)).rejects.toThrow(); // Staff I holds no training.recommend; and is the nominator
    await recommendNomination(db, cmd, n.id, true);
    await expect(decideNomination(db, cmd, n.id, true)).rejects.toThrow(/DIG Administration office/); // only DIG Administration approves
    await decideNomination(db, adm, n.id, true);
    await expect(recordAttendance(db, sops, n.id)).rejects.toThrow(/delivering unit/); // the nominating Division does not record attendance
    await recordAttendance(db, spom, n.id);
    await recordResult(db, spom, n.id, { completed: true, certificateRef: "SYN-POM-T01" });
    const row = (await one<{ status: string; certificate_ref: string; certificate_expiry: string | null }>(db, "SELECT status, certificate_ref, certificate_expiry FROM training_nominations WHERE id = ?", n.id))!;
    expect(row).toMatchObject({ status: "COMPLETED", certificate_ref: "SYN-POM-T01" });
    expect(row.certificate_expiry).toBeTruthy(); // POM-BASIC renews every 36 months
    // Five successful actions, and the two refused attempts recorded as SECURITY events.
    expect(await all(db, "SELECT action FROM audit_events WHERE entity_type = 'training_nomination' AND entity_id = ? AND outcome = 'SUCCESS' ORDER BY seq", n.id)).toHaveLength(5);
    expect(await all(db, "SELECT action FROM audit_events WHERE entity_type = 'training_nomination' AND entity_id = ? AND outcome = 'DENIED'", n.id)).toHaveLength(2);
  }));

  it("enforces scope, separation of duties and capacity", () => withDb(async (db) => {
    const adm = await actor(db, "u_digadm"), lsk = await actor(db, "u_lsk_sops"), sops = await actor(db, "u_cb_sops"), cmd = await actor(db, "u_cb_cmd");
    const session = await openSession(db);
    await expect(nominate(db, lsk, { sessionId: session, personnelId: await cbOfficer(db) })).rejects.toThrow(); // Lusaka cannot nominate Copperbelt officers
    await expect(submitNeed(db, lsk, { requestingUnitId: "org_cb", topic: "Out of scope need", category: "OTHER", officersCount: 1, priority: "LOW", justification: "Synthetic out-of-scope need." })).rejects.toThrow();
    await expect(createCourse(db, sops, { code: "X-TEST", title: "Not allowed", institutionId: "tin_lilayi", category: "OTHER", durationDays: 1 })).rejects.toThrow(/DIG Administration office/);
    // Capacity: a one-place session admits one approval only.
    const small = await createSession(db, adm, { courseId: (await one<{ id: string }>(db, "SELECT id FROM training_courses WHERE code = 'POM-BASIC'"))!.id, deliveringUnitId: "org_mu", startDate: addDays(today(), 70), endDate: addDays(today(), 80), capacity: 1 });
    const a = await nominate(db, sops, { sessionId: small.id, personnelId: await cbOfficer(db, 21) });
    const b = await nominate(db, sops, { sessionId: small.id, personnelId: await cbOfficer(db, 22) });
    await expect(nominate(db, sops, { sessionId: small.id, personnelId: await cbOfficer(db, 21) })).rejects.toThrow(/already nominated/);
    for (const x of [a, b]) await recommendNomination(db, cmd, x.id, true);
    await decideNomination(db, adm, a.id, true);
    await expect(decideNomination(db, adm, b.id, true)).rejects.toThrow(/full/);
    await expect(decideNomination(db, adm, b.id, false)).rejects.toThrow(/reason/);
    await withdrawNomination(db, sops, b.id, "Substituted by a later session (synthetic).");
    // Excluded terms are refused in free text.
    await expect(submitNeed(db, sops, { requestingUnitId: "org_cb", topic: "Firearm handling course", category: "TECHNICAL", officersCount: 3, priority: "LOW", justification: "Synthetic excluded topic." })).rejects.toThrow(/excluded class/);
  }));

  it("visibility: the delivering formation sees its session's nominees; another Division sees only its own; oversight is counts", () => withDb(async (db) => {
    const session = await openSession(db);
    const spomView = await getSession(db, await actor(db, "u_mu_cmd"), session);
    expect(spomView.nominations.length).toBeGreaterThan(0);
    const lskView = await getSession(db, await actor(db, "u_lsk_sops"), session);
    expect(lskView.nominations).toHaveLength(0); // the seeded nominees are Copperbelt officers
    expect((await listNominations(db, await actor(db, "u_lsk_sops"))).every((n) => !/Copperbelt/.test(n.home_unit))).toBe(true);
    const o = await trainingOverview(db, await actor(db, "u_digadm"));
    expect(o.national).toBe(true);
    expect(o.byDivision.find((d) => d.division === "Copperbelt Division")?.completed).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(o)).not.toMatch(/Demo [A-Z][a-z]+,/); // no officer names in the oversight figures
  }));
});

describe("operations administration (DIG Operations, Part D)", () => {
  it("registers and progresses an administrative record within scope; completion needs an outcome; excluded content is refused", () => withDb(async (db) => {
    const sops = await actor(db, "u_cb_sops");
    const a = await registerActivity(db, sops, { category: "PUBLIC_ORDER", classification: "DEMONSTRATION", title: "Synthetic demonstration — administrative record", authorisingRef: "SYN-T-001", responsibleUnitId: "org_cb_kitwe", startDate: today(), personnelCommitted: 30 });
    await updateActivity(db, sops, a.id, { kind: "STATUS", toStatus: "ACTIVE" });
    await expect(updateActivity(db, sops, a.id, { kind: "STATUS", toStatus: "COMPLETED" })).rejects.toThrow(/outcome/);
    await expect(updateActivity(db, sops, a.id, { kind: "PROGRESS", note: "Patrol route changed to the north gate" })).rejects.toThrow(/excluded class/);
    await updateActivity(db, sops, a.id, { kind: "STATUS", toStatus: "COMPLETED", outcome: "Concluded without incident (synthetic)." });
    const v = await getActivity(db, sops, a.id);
    expect(v.activity.status).toBe("COMPLETED");
    expect(v.updates.map((u) => u.kind)).toEqual(["REGISTER", "STATUS", "STATUS"]);
    // Another Division cannot see it; DIG Operations can (national).
    await expect(getActivity(db, await actor(db, "u_lsk_sops"), a.id)).rejects.toThrow();
    expect((await listActivities(db, await actor(db, "u_dig"))).some((x) => x.id === a.id)).toBe(true);
    await expect(registerActivity(db, await actor(db, "u_lsk_sops"), { category: "ILLEGAL_MINING", classification: "ENFORCEMENT", title: "Out of scope record", authorisingRef: "SYN-T-002", responsibleUnitId: "org_cb", startDate: today(), personnelCommitted: 1 })).rejects.toThrow();
  }));

  it("mining security services: agreement on a duty area, service reports, scope", () => withDb(async (db) => {
    const sops = await actor(db, "u_cb_sops");
    const g = await createAgreement(db, sops, { partnerId: "ptn_mine_b", areaId: "area_kcm", authorisationRef: "SYN-MSS-T", validFrom: today(), officersRequired: 10 });
    await expect(recordServiceReport(db, sops, g.id, { periodFrom: addDays(today(), -7), periodTo: addDays(today(), -1), officersProvided: 8, serviceStatus: "PARTIAL" })).rejects.toThrow(/Explain/);
    await recordServiceReport(db, sops, g.id, { periodFrom: addDays(today(), -7), periodTo: addDays(today(), -1), officersProvided: 10, serviceStatus: "DELIVERED" });
    expect((await getAgreement(db, sops, g.id)).reports).toHaveLength(1);
    await expect(getAgreement(db, await actor(db, "u_lsk_sops"), g.id)).rejects.toThrow();
    const cols = (await all<{ Field: string }>(db, "SHOW COLUMNS FROM security_service_agreements")).map((c) => c.Field);
    expect(cols.some((c) => /gps|lat|lon|route|position|layout|vulnerab/i.test(c))).toBe(false);
  }));
});

describe("inter-office coordination (Part D §5.6, Part E)", () => {
  it("DIG Operations ↔ DIG Special Duties: restricted to the two offices and the IG; the receiver acts; protection details refused", () => withDb(async (db) => {
    const dig = await actor(db, "u_dig"), sd = await actor(db, "u_digsd"), adm = await actor(db, "u_digadm"), ig = await actor(db, "u_rom");
    await expect(submitCoordination(db, dig, { fromPositionId: "pos_dig_ops", toPositionId: "pos_dig_sd", category: "PERSONNEL_SUPPORT", subject: "Synthetic support request", requirement: "Provide the motorcade route and escort plan for the visit.", authorisationRef: "SYN-T" })).rejects.toThrow(/protection or movement/);
    const r = await submitCoordination(db, dig, { fromPositionId: "pos_dig_ops", toPositionId: "pos_dig_sd", category: "PERSONNEL_SUPPORT", subject: "Synthetic support request", requirement: "Confirm administrative arrangements for authorised personnel support (synthetic).", officersRequired: 10, authorisationRef: "SYN-T" });
    await expect(actOnCoordination(db, dig, r.id, "ACKNOWLEDGE")).rejects.toThrow(/receiving office/);
    await actOnCoordination(db, sd, r.id, "ACKNOWLEDGE");
    await actOnCoordination(db, sd, r.id, "COMPLETE", "Arrangements confirmed (synthetic).");
    expect((await getCoordination(db, ig, r.id)).observer).toBe(true); // the IG sees it
    await expect(getCoordination(db, adm, r.id)).rejects.toThrow(); // DIG Administration does not
    await expect(getCoordination(db, await actor(db, "u_mu_cmd"), r.id)).rejects.toThrow(); // nor a formation commander
    expect((await listCoordination(db, adm)).some((x) => x.id === r.id)).toBe(false);
    // A coordination request is not an instruction: no directive was created between the DIG offices.
    expect(await all(db, "SELECT id FROM command_directives WHERE issuer_position_id = 'pos_dig_ops' AND recipient_position_id = 'pos_dig_sd'")).toHaveLength(0);
  }));
});
