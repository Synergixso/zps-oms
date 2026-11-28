/**
 * Seed step 014 — institutional command structure, directives and reports (SYNTHETIC data only; DEC-074 … DEC-077).
 *
 * Offices (command positions) for the national Operations chain, the Mobile Unit chain from the Divisional Commander to
 * the Constable, a Copperbelt District and Station chain, and a Lusaka chain used for confidentiality tests. The IG has
 * no superior; DIG Administration and DIG Special Duties sit under the IG with no Operations relationships and no holder.
 * The Area Commander has two channels: B (Mobile Unit formation: Staff II → Staff I → Divisional Commander →
 * Commissioner → DIG Operations → IG) as the primary command line, and A (Kitwe District: administrative coordination
 * with the District Operations Officer and parallel reporting to the Officer Commanding). These relationships and the
 * proposed office-to-role mappings are synthetic configuration awaiting institutional validation.
 * Development databases only (runSeedSteps refuses databases holding non-synthetic users).
 */
import type { DB } from "./connection";
import { one, run } from "./connection";
import { ROLE_BY_CODE, type RoleCode } from "../domain/catalogue";
import { hashPassword } from "../domain/auth";
import { addDays, today } from "../domain/core";
import { loadActor } from "../domain/policy";
import { POSITION_TYPES, acknowledgeReport, acknowledgeDirective, createReport, forwardDirective, issueDirective, submitReport } from "../domain/command";
import { SYNTHETIC_DEV_PASSWORD } from "./constants";

type NewUser = [id: string, username: string, name: string, role: RoleCode | null, org: string, title: string];
export const COMMAND_USERS: NewUser[] = [
  ["u_mu_s1", "demo.mu.staff1", "Demo Mobile Unit Senior Staff Officer Operations", "DIVISION_STAFF_I", "org_mu", "Staff I (synthetic)"],
  ["u_mu_s2", "demo.mu.staff2", "Demo Mobile Unit Deputy Staff Officer Operations", "DIVISION_STAFF_II", "org_mu", "Staff II (synthetic)"],
  ["u_mu_ddc", "demo.mu.deputy", "Demo Mobile Unit Deputy Division Commander", "DEPUTY_DIVISION_COMMANDER", "org_mu", "Deputy Division Commander (synthetic)"],
  // Appointment holders with none of the 31 application roles (DEC-076): command and reporting access for their own office only.
  ["u_mu_sgt", "demo.mu.sergeant", "Demo Mobile Unit Sergeant", null, "org_mu_a1p1s1", "Sergeant (synthetic)"],
  ["u_mu_cst", "demo.mu.constable", "Demo Mobile Unit Constable", null, "org_mu_a1p1s1", "Police Officer / Constable (synthetic)"],
];

// [id, type, unit, holder, title]
const POSITIONS: Array<[string, string, string, string | null, string]> = [
  ["pos_ig", "IG", "org_hq", "u_rom", "Inspector General of Police"],
  ["pos_dig_ops", "DIG_OPERATIONS", "org_hq", "u_dig", "Deputy Inspector General of Police - Operations (DIG Operations)"],
  ["pos_dig_adm", "DIG_ADMINISTRATION", "org_hq", null, "Deputy Inspector General – Administration"],
  ["pos_dig_sd", "DIG_SPECIAL_DUTIES", "org_hq", null, "Deputy Inspector General – Special Duties / State House"],
  ["pos_comm", "COMMISSIONER_OPS", "org_hq", "u_hqc", "Commissioner – Operations HQ"],
  ["pos_dcomm", "DEPUTY_COMMISSIONER_OPS", "org_hq", "u_hqstaff", "Deputy Commissioner – Operations HQ"],
  ["pos_mu_cmd", "DIVISIONAL_COMMANDER", "org_mu", "u_mu_cmd", "Divisional Commander, Mobile Unit"],
  ["pos_mu_ddc", "DEPUTY_DIVISION_COMMANDER", "org_mu", "u_mu_ddc", "Deputy Division Commander, Mobile Unit"],
  ["pos_mu_s1", "STAFF_I", "org_mu", "u_mu_s1", "Senior Staff Officer Operations (Staff I), Mobile Unit"],
  ["pos_mu_s2", "STAFF_II", "org_mu", "u_mu_s2", "Deputy Staff Officer Operations (Staff II), Mobile Unit"],
  ["pos_mu_adm", "FORMATION_STAFF_ADMIN", "org_mu", "u_mu_adm", "Formation Operations Staff Administrator, Mobile Unit"],
  ["pos_mu_area_a", "AREA_COMMANDER", "org_mu_a", "u_mu_acoy", "Area Commander, A Company area (Kitwe)"],
  ["pos_mu_plt", "SECTION_PLATOON_COMMANDER", "org_mu_a1p1", "u_mu_plt", "Section/Platoon Commander, 1 Platoon"],
  ["pos_mu_insp", "INSPECTOR", "org_mu_a1p1s1", "u_mu_sec", "Inspector, 1 Section"],
  ["pos_mu_sgt", "SERGEANT", "org_mu_a1p1s1", "u_mu_sgt", "Sergeant, 1 Section"],
  ["pos_mu_cst", "CONSTABLE", "org_mu_a1p1s1", "u_mu_cst", "Police Officer / Constable, 1 Section"],
  ["pos_cb_cmd", "DIVISIONAL_COMMANDER", "org_cb", "u_cb_cmd", "Divisional Commander, Copperbelt"],
  ["pos_cb_ddc", "DEPUTY_DIVISION_COMMANDER", "org_cb", "u_aao", "Deputy Division Commander, Copperbelt"],
  ["pos_cb_s1", "STAFF_I", "org_cb", "u_cb_sops", "Senior Staff Officer Operations (Staff I), Copperbelt"],
  ["pos_cb_s2", "STAFF_II", "org_cb", "u_cb_asg", "Deputy Staff Officer Operations (Staff II), Copperbelt"],
  ["pos_kit_oc", "OC_DISTRICT", "org_cb_kitwe", "u_kit_cmd", "Officer Commanding, Kitwe District"],
  ["pos_kit_doc", "DEPUTY_OC_DISTRICT", "org_cb_kitwe", "u_kit_asg", "Deputy OC, Kitwe District"],
  ["pos_kit_ops", "OPS_OFFICER_DISTRICT", "org_cb_kitwe", "u_kit_ops", "Operations Officer, Kitwe District"],
  ["pos_kitc_oic", "OIC_STATION", "org_cb_kitwe_central", "u_kitc_cmd", "Officer-in-Charge, Kitwe Central Police Station"],
  ["pos_kitc_si", "STATION_INSPECTOR", "org_cb_kitwe_central", "u_kitc_ops", "Station Inspector, Kitwe Central Police Station"],
  ["pos_kitc_adm", "STATION_ADMINISTRATOR", "org_cb_kitwe_central", "u_kitc_stores", "Police Station Administrator, Kitwe Central"],
  ["pos_lsk_cmd", "DIVISIONAL_COMMANDER", "org_lsk", "u_lsk_cmd", "Divisional Commander, Lusaka"],
  ["pos_lsk_s1", "STAFF_I", "org_lsk", "u_lsk_sops", "Senior Staff Officer Operations (Staff I), Lusaka"],
];

const B = "B: Mobile Unit formation command";
const A = "A: Area / District administrative coordination";
// [subordinate, superior, type, channel]
const RELATIONSHIPS: Array<[string, string, string, string | null]> = [
  ["pos_dig_ops", "pos_ig", "PRIMARY_COMMAND", "National command"], ["pos_dig_adm", "pos_ig", "PRIMARY_COMMAND", "National command"], ["pos_dig_sd", "pos_ig", "PRIMARY_COMMAND", "National command"],
  ["pos_comm", "pos_dig_ops", "PRIMARY_COMMAND", "National Operations command"], ["pos_dcomm", "pos_comm", "PRIMARY_COMMAND", "National Operations command"],
  ["pos_mu_cmd", "pos_comm", "PRIMARY_COMMAND", B], ["pos_cb_cmd", "pos_comm", "PRIMARY_COMMAND", "Provincial command"], ["pos_lsk_cmd", "pos_comm", "PRIMARY_COMMAND", "Provincial command"],
  ["pos_mu_ddc", "pos_mu_cmd", "PRIMARY_COMMAND", B], ["pos_mu_s1", "pos_mu_cmd", "PRIMARY_COMMAND", B], ["pos_mu_s2", "pos_mu_s1", "PRIMARY_COMMAND", B], ["pos_mu_adm", "pos_mu_s1", "PRIMARY_COMMAND", B],
  ["pos_mu_area_a", "pos_mu_s2", "PRIMARY_COMMAND", B],
  ["pos_mu_area_a", "pos_kit_ops", "ADMIN_COORDINATION", A], ["pos_mu_area_a", "pos_kit_oc", "PARALLEL_REPORTING", A],
  ["pos_mu_plt", "pos_mu_area_a", "PRIMARY_COMMAND", "Mobile Unit field command"], ["pos_mu_insp", "pos_mu_plt", "PRIMARY_COMMAND", "Mobile Unit field command"],
  ["pos_mu_sgt", "pos_mu_insp", "PRIMARY_COMMAND", "Mobile Unit field command"], ["pos_mu_cst", "pos_mu_sgt", "PRIMARY_COMMAND", "Mobile Unit field command"],
  ["pos_cb_ddc", "pos_cb_cmd", "PRIMARY_COMMAND", "Provincial command"], ["pos_cb_s1", "pos_cb_cmd", "PRIMARY_COMMAND", "Provincial command"], ["pos_cb_s2", "pos_cb_s1", "PRIMARY_COMMAND", "Provincial command"],
  ["pos_kit_oc", "pos_cb_cmd", "PRIMARY_COMMAND", "Provincial command"], ["pos_kit_doc", "pos_kit_oc", "PRIMARY_COMMAND", "District command"], ["pos_kit_ops", "pos_kit_oc", "PRIMARY_COMMAND", "District command"],
  ["pos_kitc_oic", "pos_kit_oc", "PRIMARY_COMMAND", "District command"], ["pos_kitc_si", "pos_kitc_oic", "PRIMARY_COMMAND", "Station command"], ["pos_kitc_adm", "pos_kitc_oic", "PRIMARY_COMMAND", "Station command"],
  ["pos_lsk_s1", "pos_lsk_cmd", "PRIMARY_COMMAND", "Provincial command"],
];

export async function seedCommand(db: DB) {
  const t0 = "2025-01-01T08:00:00.000Z";
  const now = new Date().toISOString();
  for (const [id, username, name, role, org, title] of COMMAND_USERS) {
    if (await one(db, "SELECT id FROM users WHERE id = ? OR username = ?", id, username)) continue;
    if (!await one(db, "SELECT id FROM org_units WHERE id = ?", org)) continue;
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, role ? `${ROLE_BY_CODE[role].name} (synthetic)` : title, t0);
    if (role) await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES (?,?,?,?,?,?,?)",
      `asg_${id}_0`, id, role, org, t0, "Synthetic baseline assignment for demonstration (SYN-BASELINE-CMD).", now);
  }
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE synthetic = 1 AND password_hash IS NULL", await hashPassword(SYNTHETIC_DEV_PASSWORD), now);

  if (await one(db, "SELECT id FROM command_positions LIMIT 1")) return;
  for (const [id, type, unit, holder, title] of POSITIONS) {
    if (!await one(db, "SELECT id FROM org_units WHERE id = ?", unit)) continue;
    const role = POSITION_TYPES[type]?.role ?? null;
    await run(db, "INSERT INTO command_positions (id, code, title, position_type, org_unit_id, mapped_role_code, created_at) VALUES (?,?,?,?,?,?,?)", id, id.replace(/^pos_/, "").toUpperCase(), title, type, unit, role, t0);
    if (holder && await one(db, "SELECT id FROM users WHERE id = ?", holder)) {
      await run(db, "INSERT INTO position_appointments (id, position_id, user_id, valid_from, authorising_ref, created_at) VALUES (?,?,?,?,?,?)", `pap_${id}`, id, holder, t0, "SYN-APPT-001", now);
    }
  }
  for (const [i, [sub, sup, type, channel]] of RELATIONSHIPS.entries()) {
    if (!await one(db, "SELECT id FROM command_positions WHERE id = ?", sub) || !await one(db, "SELECT id FROM command_positions WHERE id = ?", sup)) continue;
    await run(db, "INSERT INTO reporting_relationships (id, subordinate_position_id, superior_position_id, relationship_type, channel, valid_from, authorising_ref, created_at) VALUES (?,?,?,?,?,?,?,?)",
      `rel_${String(i + 1).padStart(3, "0")}`, sub, sup, type, channel, t0, "SYN-STRUCT-001", now);
  }

  // Example traffic, created through the domain functions (same validation, authority and audit as user input).
  const A_ = async (id: string) => (await loadActor(db, id))!;
  const t = today();
  const ig = await A_("u_rom"), dig = await A_("u_dig"), comm = await A_("u_hqc");
  const d1 = await issueDirective(db, ig, { fromPositionId: "pos_ig", toPositionId: "pos_dig_ops", category: "COMMAND_DIRECTIVE", subject: "Demo quarterly review of Operations manpower returns",
    instructions: "Consolidate the quarterly manpower returns of all Divisions and Formations and report the position to the Inspector General (synthetic).", dueDate: addDays(t, 21) });
  await acknowledgeDirective(db, dig, d1.id);
  const d2 = await forwardDirective(db, dig, d1.id, { toPositionId: "pos_comm", category: "COMMAND_DIRECTIVE", subject: "Demo quarterly manpower returns: national consolidation",
    instructions: "Obtain and consolidate the quarterly returns from every Division and Formation (synthetic).", dueDate: addDays(t, 14) });
  await acknowledgeDirective(db, comm, d2.id);
  await forwardDirective(db, comm, d2.id, { toPositionId: "pos_mu_cmd", category: "ADMIN_INSTRUCTION", subject: "Demo Mobile Unit quarterly manpower return",
    instructions: "Submit the Mobile Unit quarterly manpower return through Staff I (synthetic).", dueDate: addDays(t, 10) });

  const area = await A_("u_mu_acoy");
  const r = await createReport(db, area, { positionId: "pos_mu_area_a", category: "AREA_STATUS", summary: "Demo weekly area administrative status: personnel records reconciled, two leave returns outstanding (synthetic).",
    progressStatus: "ON_TRACK", outstanding: "Two leave returns to be submitted by 1 Section (synthetic)." });
  await submitReport(db, area, r.id);
  const ops = await A_("u_kit_ops");
  const rc = await one<{ id: string }>(db, "SELECT id FROM report_recipients WHERE report_id = ? AND position_id = 'pos_kit_ops'", r.id);
  if (rc) await acknowledgeReport(db, ops, rc.id);
}
