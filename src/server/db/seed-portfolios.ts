/**
 * Seed step 019 — executive portfolio demonstration data (SYNTHETIC; final master directive Parts C–E, I).
 * DIG Administration and DIG Special Duties / State House office holders (no application role — DEC-088), training
 * institutions, courses, sessions, needs and nominations; operations-administration records; partner organisations and
 * a mining security service agreement; an inter-office coordination request. Everything is created through the domain
 * functions (same validation, authority and audit as user input). Names are "Demo"/"(synthetic)"; no real persons,
 * partners' confidential arrangements, protection details or operational information.
 */
import type { DB } from "./connection";
import { all, one, run } from "./connection";
import { hashPassword } from "../domain/auth";
import { addDays, setClock, today } from "../domain/core";
import { loadActor } from "../domain/policy";
import { SYNTHETIC_DEV_PASSWORD } from "./constants";
import { createCourse, createSession, decideNeed, decideNomination, nominate, recommendNomination, recordAttendance, recordResult, submitNeed } from "../domain/training";
import { createAgreement, recordServiceReport, registerActivity, updateActivity } from "../domain/ops-admin";
import { actOnCoordination, submitCoordination } from "../domain/coordination";

const USERS: Array<[id: string, username: string, name: string, title: string, office: string]> = [
  ["u_digadm", "demo.dig.admin", "Demo DIG Administration", "Deputy Inspector General – Administration (synthetic)", "pos_dig_adm"],
  ["u_digsd", "demo.dig.specialduties", "Demo DIG Special Duties", "Deputy Inspector General – Special Duties / State House (synthetic)", "pos_dig_sd"],
];

export async function seedPortfolios(db: DB) {
  const t0 = "2025-01-01T08:00:00.000Z";
  const now = new Date().toISOString();
  if (!await one(db, "SELECT id FROM command_positions WHERE id = 'pos_dig_adm'")) return;
  for (const [id, username, name, title, office] of USERS) {
    if (!await one(db, "SELECT id FROM users WHERE id = ? OR username = ?", id, username)) {
      await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, title, t0);
    }
    if (!await one(db, "SELECT id FROM position_appointments WHERE position_id = ? AND ended_at IS NULL", office)) {
      await run(db, "INSERT INTO position_appointments (id, position_id, user_id, valid_from, authorising_ref, created_at) VALUES (?,?,?,?,?,?)", `pap_${office}`, office, id, t0, "SYN-APPT-EXEC", now);
    }
  }
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE synthetic = 1 AND password_hash IS NULL", await hashPassword(SYNTHETIC_DEV_PASSWORD), now);
  if (await one(db, "SELECT id FROM training_institutions LIMIT 1")) return;

  const A = async (id: string) => { const a = await loadActor(db, id); if (!a) throw new Error(`seed actor ${id} missing`); return a; };
  const adm = await A("u_digadm"), dig = await A("u_dig"), sd = await A("u_digsd");
  const t = today();

  // Training institutions and catalogue ---------------------------------------------------------------
  await run(db, "INSERT INTO training_institutions (id, code, name, kind, org_unit_id, created_at) VALUES ('tin_lilayi','TI-LILAYI','Lilayi Police Training College','COLLEGE',NULL,?), ('tin_spom','TI-SPOM','Kamfinsa School of Public Order Maintenance (SPOM) / Mobile Unit','FORMATION','org_mu',?), ('tin_ext','TI-EXT','External provider (synthetic)','EXTERNAL',NULL,?)", now, now, now);
  const c1 = await createCourse(db, adm, { code: "POM-BASIC", title: "Public Order Maintenance — Basic Course", institutionId: "tin_spom", category: "PUBLIC_ORDER", durationDays: 20, eligibility: "Constables and Sergeants with one year of service (synthetic criterion)", certification: "Public Order Maintenance Certificate", renewalMonths: 36 });
  const c2 = await createCourse(db, adm, { code: "LDR-INSP", title: "Inspectorate Leadership and Administration", institutionId: "tin_lilayi", category: "LEADERSHIP", durationDays: 15, eligibility: "Inspectors and Chief Inspectors", certification: "Leadership Certificate" });
  const c3 = await createCourse(db, adm, { code: "REC-ADMIN", title: "Records and Registry Administration", institutionId: "tin_lilayi", category: "ADMINISTRATION", durationDays: 5 });
  void c3;
  // A completed past session and an open upcoming one at SPOM; a planned leadership session at Lilayi.
  setClock(() => new Date(`${addDays(t, -60)}T08:00:00.000Z`));
  const past = await createSession(db, adm, { courseId: c1, deliveringUnitId: "org_mu", startDate: addDays(t, -50), endDate: addDays(t, -31), capacity: 30 });
  setClock(null);
  const open = await createSession(db, adm, { courseId: c1, deliveringUnitId: "org_mu", startDate: addDays(t, 21), endDate: addDays(t, 40), capacity: 25 });
  await createSession(db, adm, { courseId: c2, deliveringUnitId: "org_hq", startDate: addDays(t, 45), endDate: addDays(t, 59), capacity: 20 });

  // Training needs from units -------------------------------------------------------------------------
  const n1 = await submitNeed(db, await A("u_cb_sops"), { requestingUnitId: "org_cb", topic: "Public order refresher for Copperbelt district stations", category: "PUBLIC_ORDER", courseId: c1, officersCount: 40, priority: "HIGH", justification: "Increase in public gatherings requiring trained officers in Copperbelt districts (synthetic justification)." });
  await submitNeed(db, await A("u_lsk_sops"), { requestingUnitId: "org_lsk", topic: "Registry administration for station administrators", category: "ADMINISTRATION", officersCount: 12, priority: "MEDIUM", justification: "New station registries require trained administrators (synthetic justification)." });
  const n3 = await submitNeed(db, await A("u_mu_cmd"), { requestingUnitId: "org_mu", topic: "Inspectorate leadership for newly promoted Inspectors", category: "LEADERSHIP", courseId: c2, officersCount: 8, priority: "MEDIUM", justification: "Recently promoted Inspectors in the Mobile Unit (synthetic justification)." });
  await decideNeed(db, adm, n1.id, "PLANNED", `Placed on session ${open.reference}.`);
  await decideNeed(db, adm, n3.id, "ACCEPTED", "To be planned at Lilayi Police Training College.");

  // Nominations: Copperbelt officers to the past session (completed) and the open session (various states) ------
  const cbOfficers = await all<{ id: string }>(db, "SELECT id FROM personnel_records WHERE employment_status = 'SERVING' AND home_unit_id IN (SELECT descendant_id FROM org_unit_closure WHERE ancestor_id = 'org_cb') ORDER BY id LIMIT 8");
  const sops = await A("u_cb_sops"), cmd = await A("u_cb_cmd"), deliver = await A("u_mu_cmd");
  for (const [i, p] of cbOfficers.slice(0, 4).entries()) {
    const nm = await nominate(db, sops, { sessionId: past.id, personnelId: p.id });
    await recommendNomination(db, cmd, nm.id, true);
    await decideNomination(db, adm, nm.id, true);
    await recordAttendance(db, deliver, nm.id);
    await recordResult(db, deliver, nm.id, i < 3 ? { completed: true, certificateRef: `SYN-POM-${String(i + 1).padStart(3, "0")}` } : { completed: false, note: "Did not complete the assessment (synthetic)." });
  }
  await run(db, "UPDATE training_sessions SET status = 'COMPLETED' WHERE id = ?", past.id);
  const states = ["APPROVED", "RECOMMENDED", "NOMINATED", "NOMINATED"];
  for (const [i, p] of cbOfficers.slice(4, 8).entries()) {
    const nm = await nominate(db, sops, { sessionId: open.id, personnelId: p.id });
    if (states[i] !== "NOMINATED") await recommendNomination(db, cmd, nm.id, true);
    if (states[i] === "APPROVED") await decideNomination(db, adm, nm.id, true);
  }

  // Operations administration ---------------------------------------------------------------------------
  const po = await registerActivity(db, await A("u_lsk_sops"), { category: "PUBLIC_ORDER", classification: "PUBLIC_GATHERING", title: "Demo national commemorative event — public order administration (synthetic)", authorisingRef: "SYN-AUTH-PO-001", responsibleUnitId: "org_lsk", startDate: addDays(t, -10), endDate: addDays(t, -9), personnelCommitted: 120 });
  await updateActivity(db, await A("u_lsk_sops"), po.id, { kind: "STATUS", toStatus: "ACTIVE" });
  await updateActivity(db, await A("u_lsk_sops"), po.id, { kind: "STATUS", toStatus: "COMPLETED", outcome: "Event concluded without reported disorder; personnel released to home units (synthetic)." });
  await updateActivity(db, await A("u_lsk_sops"), po.id, { kind: "REVIEW", note: "Post-event administrative review: rostering and welfare arrangements adequate; earlier manpower request recommended (synthetic)." });
  const im = await registerActivity(db, sops, { category: "ILLEGAL_MINING", classification: "JOINT_OPERATION", title: "Demo illegal mining enforcement — Copperbelt joint administrative operation (synthetic)", authorisingRef: "SYN-AUTH-IM-001", responsibleUnitId: "org_cb", coordinatingUnitId: "org_mu", startDate: addDays(t, -5), personnelCommitted: 60 });
  await updateActivity(db, sops, im.id, { kind: "STATUS", toStatus: "ACTIVE" });
  await updateActivity(db, sops, im.id, { kind: "PROGRESS", note: "Administrative progress: personnel roster confirmed with the Mobile Unit; welfare provisions arranged (synthetic).", personnel: 64 });
  await updateActivity(db, sops, im.id, { kind: "RESOURCE_REQUEST", note: "Request for two additional administrative transport allocations through the fleet register (synthetic)." });

  // Partners and a mining security service agreement on an administrative duty area ------------------------
  await run(db, "INSERT INTO partner_organisations (id, code, name, sector, created_at) VALUES ('ptn_mine_a','PTN-MINE-A','Demo Copper Mining Company A (synthetic)','MINING',?), ('ptn_mine_b','PTN-MINE-B','Demo Copper Mining Company B (synthetic)','MINING',?)", now, now);
  const ag = await createAgreement(db, sops, { partnerId: "ptn_mine_a", areaId: "area_kcm", authorisationRef: "SYN-MSS-AUTH-001", validFrom: addDays(t, -120), officersRequired: 24 });
  await recordServiceReport(db, sops, ag.id, { periodFrom: addDays(t, -37), periodTo: addDays(t, -8), officersProvided: 22, serviceStatus: "PARTIAL", followUp: "OPEN", summary: "Two officers on approved leave not replaced during the period; replacement requested through manpower (synthetic)." });
  await createAgreement(db, sops, { partnerId: "ptn_mine_b", areaId: "area_mopani", authorisationRef: "SYN-MSS-AUTH-002", validFrom: addDays(t, -90), officersRequired: 16 });

  // Inter-office coordination: DIG Operations facilitates authorised personnel support for DIG Special Duties ----
  const cr = await submitCoordination(db, dig, { fromPositionId: "pos_dig_ops", toPositionId: "pos_dig_sd", category: "PERSONNEL_SUPPORT", subject: "Demo facilitation of authorised personnel support (synthetic)",
    requirement: "Confirm the administrative arrangements for the provision of authorised personnel from Operations formations for a national ceremonial occasion (synthetic). No operational details are recorded here.", officersRequired: 30, authorisationRef: "SYN-IG-AUTH-001", requiredBy: addDays(t, 14) });
  void sd;
  await actOnCoordination(db, sd, cr.id, "ACKNOWLEDGE");
  await submitCoordination(db, adm, { fromPositionId: "pos_dig_adm", toPositionId: "pos_dig_ops", category: "TRAINING_SUPPORT", subject: "Demo public order course places for 2027 (synthetic)",
    requirement: "Request Operations to confirm the number of SPOM public order course places that Provincial Divisions can release officers for in 2027 (synthetic).", officersRequired: 120, authorisationRef: "SYN-DIGA-001" });
}
