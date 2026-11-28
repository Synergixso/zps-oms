/**
 * Seed step 016 — Kamfinsa Mobile Unit established structure (institutional compliance directive, 28 Nov 2026, Part V).
 *
 * ESTABLISHED (confirmed by the ZPS project stakeholders; recorded with synthetic = 0 and the directive as the source):
 *  - Companies: HQ Company, A Company, B Company, C Company, D Company;
 *  - Detachments and parent Companies, with their duty stations: HQ 5 (HQ Company, Kitwe), B4 (B Company, Sikanze
 *    Police Camp, Lusaka), A2 (A Company, Kabwe), A4 (A Company, Mansa), D3 (D Company, Mufulira), D4 (D Company, Choma);
 *  - the ten Provincial Divisions and the named Divisional Units/formations are established institutional coverage.
 * Offices: a Company Commander and a Deputy Company Commander for each Company, a Detachment Commander for each
 * Detachment. Relationships: Detachment Commander → Company Commander (primary command) and → Deputy Company Commander
 * (parallel reporting); Deputy → Company Commander; Company Commander → Senior Operations Officer (Staff II, then
 * Staff I) → Divisional Commander, Mobile Unit — the established route stated by the stakeholders (final directive,
 * 28 Nov 2026, Part F §7.3; issue #2). Configuration, changeable without code.
 *
 * SYNTHETIC (development only): office HOLDERS, user accounts and personnel records are fictitious ("Demo" names, SYN-
 * service numbers). The two earlier placeholder detachments ("1 Detachment, A Company", "1 Detachment, B Company") stay
 * as clearly labelled synthetic training units until the Service supplies the full detachment list; nothing else is
 * invented. Idempotent and additive: A and B Company keep their ids and history and are relabelled in place.
 */
import type { DB } from "./connection";
import { all, one, run } from "./connection";
import { ROLE_BY_CODE, type RoleCode } from "../domain/catalogue";
import { hashPassword } from "../domain/auth";
import { nameKey } from "../domain/personnel";
import { POSITION_TYPES } from "../domain/command";
import { rebuildClosure } from "../domain/org";
import { audit } from "../domain/audit";
import { SYNTHETIC_DEV_PASSWORD } from "./constants";

export const ESTABLISHED_SOURCE = "KMU-DIR-2026-11-28";
export const ESTABLISHED_NOTE = "Established structure confirmed by the Zambia Police Service project stakeholders (Master Development, Implementation and Institutional Compliance Directive, Technical Services Section, Kamfinsa Mobile Unit, 28 Nov 2026).";
const COVERAGE_NOTE = "Established institutional coverage (Master Development, Implementation and Institutional Compliance Directive, 28 Nov 2026, §5). Districts, Stations and Posts beneath it in development are synthetic examples.";
const TRAINING_NOTE = "Synthetic training unit for development and tests only; not part of the established Kamfinsa Mobile Unit structure. To be retired when the Service supplies the full detachment list.";

/** [id, code, name, shortName, parent] — the five established Companies of Kamfinsa Mobile Unit. */
export const KMU_COMPANIES: Array<[string, string, string, string]> = [
  ["org_mu_hq", "CO-MU-HQ", "HQ Company", "HQ Coy"],
  ["org_mu_a", "CO-MU-A", "A Company", "A Coy"],
  ["org_mu_b", "CO-MU-B", "B Company", "B Coy"],
  ["org_mu_c", "CO-MU-C", "C Company", "C Coy"],
  ["org_mu_d", "CO-MU-D", "D Company", "D Coy"],
];
/** [id, code, name, parent company, duty station] — the established Detachments (directive §9.3). */
export const KMU_DETACHMENTS: Array<[string, string, string, string, string]> = [
  ["org_mu_hq5", "DT-MU-HQ5", "HQ 5 Detachment", "org_mu_hq", "Kitwe, Copperbelt Province"],
  ["org_mu_b4", "DT-MU-B4", "B4 Detachment", "org_mu_b", "Sikanze Police Camp, Lusaka"],
  ["org_mu_a2", "DT-MU-A2", "A2 Detachment", "org_mu_a", "Kabwe, Central Province"],
  ["org_mu_a4", "DT-MU-A4", "A4 Detachment", "org_mu_a", "Mansa, Luapula Province"],
  ["org_mu_d3", "DT-MU-D3", "D3 Detachment", "org_mu_d", "Mufulira, Copperbelt Province"],
  ["org_mu_d4", "DT-MU-D4", "D4 Detachment", "org_mu_d", "Choma, Southern Province"],
];
const ESTABLISHED_COVERAGE = ["org_lsk", "org_cb", "org_cen", "org_sth", "org_est", "org_nth", "org_lua", "org_wst", "org_nw", "org_muc", "org_mu", "org_pmb", "org_ap", "org_taz", "org_pu"];

const short = (id: string) => id.replace(/^org_mu_/, "");
/** Office ids: pos_mu_<coy>_cc / _dcc for Companies, pos_mu_<det>_dc for Detachments. */
/** The office directly above every Company Commander (Staff II; Staff II → Staff I → Divisional Commander). */
export const COMPANY_SUPERIOR = "pos_mu_s2";
export const companyOffice = (companyId: string, deputy = false) => `pos_mu_${short(companyId)}_${deputy ? "dcc" : "cc"}`;
export const detachmentOffice = (detachmentId: string) => `pos_mu_${short(detachmentId)}_dc`;

type NewUser = [id: string, username: string, name: string, role: RoleCode, org: string];
/** Synthetic office holders demonstrating the HQ Company → HQ 5 Detachment (Kitwe) example of directive §9.4. */
export const KMU_USERS: NewUser[] = [
  ["u_mu_hqcc", "demo.mu.hqcoy.commander", "Demo HQ Company Commander", "COMPANY_COMMANDER", "org_mu_hq"],
  ["u_mu_hqdcc", "demo.mu.hqcoy.deputy", "Demo HQ Company Deputy Commander", "COMPANY_COMMANDER", "org_mu_hq"],
  ["u_mu_hq5", "demo.mu.hq5.commander", "Demo HQ 5 Detachment Commander", "SECTION_HEAD", "org_mu_hq5"],
  ["u_mu_d3", "demo.mu.d3.commander", "Demo D3 Detachment Commander", "SECTION_HEAD", "org_mu_d3"],
];
/**
 * [office, holder]. A Company Commander is left VACANT: the synthetic account "demo.mu.acoy.commander" holds the Area
 * Commander office, and the Area Commander is a distinct appointment (directive §10–§11; seed step 017).
 */
const HOLDERS: Array<[string, string]> = [
  ["pos_mu_hq_cc", "u_mu_hqcc"], ["pos_mu_hq_dcc", "u_mu_hqdcc"], ["pos_mu_hq5_dc", "u_mu_hq5"], ["pos_mu_d3_dc", "u_mu_d3"],
];

export async function seedKmu(db: DB) {
  const t0 = "2025-01-01T08:00:00.000Z";
  const now = new Date().toISOString();
  if (!await one(db, "SELECT id FROM org_units WHERE id = 'org_mu'")) return;
  const tenant = (await one<{ tenant_id: string }>(db, "SELECT tenant_id FROM org_units WHERE id = 'org_mu'"))!.tenant_id;

  // Established coverage: Provincial Divisions and named formations are not "provisional".
  for (const id of ESTABLISHED_COVERAGE) {
    await run(db, "UPDATE org_units SET validation_note = ?, synthetic = 0 WHERE id = ? AND synthetic = 1", COVERAGE_NOTE, id);
  }

  const upsertUnit = async (id: string, code: string, name: string, shortName: string | null, type: "COMPANY" | "DETACHMENT", parent: string, dutyStation: string | null) => {
    if (await one(db, "SELECT id FROM org_units WHERE id = ?", id)) {
      await run(db, "UPDATE org_units SET name = ?, short_name = ?, duty_station = ?, validation_note = ?, approval_ref = COALESCE(approval_ref, ?), synthetic = 0 WHERE id = ?",
        name, shortName, dutyStation, ESTABLISHED_NOTE, ESTABLISHED_SOURCE, id);
      return;
    }
    await run(db, `INSERT INTO org_units (id, tenant_id, code, name, short_name, duty_station, unit_type, branch, status, effective_from, approval_ref, validation_note, synthetic, created_at)
                   VALUES (?,?,?,?,?,?,?, 'FORMATION', 'ACTIVE', '2025-01-01', ?, ?, 0, ?)`, id, tenant, code, name, shortName, dutyStation, type, ESTABLISHED_SOURCE, ESTABLISHED_NOTE, now);
    await run(db, "INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?, 'REPORTS_TO', '2025-01-01', ?, ?)",
      `rel_${id}`, id, parent, ESTABLISHED_SOURCE, now);
  };
  for (const [id, code, name, shortName] of KMU_COMPANIES) await upsertUnit(id, code, name, shortName, "COMPANY", "org_mu", null);
  for (const [id, code, name, parent, station] of KMU_DETACHMENTS) await upsertUnit(id, code, name, short(id).toUpperCase(), "DETACHMENT", parent, station);
  for (const [id, name] of [["org_mu_a1", "1 Detachment, A Company (synthetic training unit)"], ["org_mu_b1", "1 Detachment, B Company (synthetic training unit)"]]) {
    await run(db, "UPDATE org_units SET name = ?, validation_note = ? WHERE id = ? AND synthetic = 1", name, TRAINING_NOTE, id);
  }
  await rebuildClosure(db);

  // Synthetic office holders --------------------------------------------------------------------------------
  for (const [id, username, name, role, org] of KMU_USERS) {
    if (await one(db, "SELECT id FROM users WHERE id = ? OR username = ?", id, username)) continue;
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, `${ROLE_BY_CODE[role].name} (synthetic)`, t0);
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES (?,?,?,?,?,?,?)",
      `asg_${id}_0`, id, role, org, t0, "Synthetic baseline assignment for demonstration (SYN-BASELINE-KMU).", now);
  }
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE synthetic = 1 AND password_hash IS NULL", await hashPassword(SYNTHETIC_DEV_PASSWORD), now);

  // Offices and relationships (only where the command structure of seed step 014 exists) -------------------------
  if (!await one(db, "SELECT id FROM command_positions WHERE id = 'pos_mu_cmd'")) return;
  const office = async (id: string, type: string, unit: string, title: string) => {
    if (await one(db, "SELECT id FROM command_positions WHERE id = ?", id)) return;
    await run(db, "INSERT INTO command_positions (id, code, title, position_type, org_unit_id, mapped_role_code, created_at) VALUES (?,?,?,?,?,?,?)",
      id, id.replace(/^pos_/, "").toUpperCase(), title, type, unit, POSITION_TYPES[type]?.role ?? null, t0);
  };
  const relate = async (sub: string, sup: string, type: string, channel: string) => {
    if (await one(db, "SELECT id FROM reporting_relationships WHERE subordinate_position_id = ? AND superior_position_id = ? AND relationship_type = ? AND ended_at IS NULL", sub, sup, type)) return;
    await run(db, "INSERT INTO reporting_relationships (id, subordinate_position_id, superior_position_id, relationship_type, channel, valid_from, authorising_ref, created_at) VALUES (?,?,?,?,?,?,?,?)",
      `rel_kmu_${sub.replace(/^pos_mu_/, "")}_${sup.replace(/^pos_mu_/, "")}_${type.toLowerCase()}`.slice(0, 40), sub, sup, type, channel, t0, ESTABLISHED_SOURCE, now);
  };
  const CH = "Mobile Unit company command";
  for (const [id, , name] of KMU_COMPANIES) {
    await office(companyOffice(id), "COMPANY_COMMANDER", id, `Company Commander, ${name}`);
    await office(companyOffice(id, true), "DEPUTY_COMPANY_COMMANDER", id, `Deputy Company Commander, ${name}`);
    await relate(companyOffice(id), COMPANY_SUPERIOR, "PRIMARY_COMMAND", CH);
    await relate(companyOffice(id, true), companyOffice(id), "PRIMARY_COMMAND", CH);
  }
  for (const [id, , name, parent] of KMU_DETACHMENTS) {
    await office(detachmentOffice(id), "DETACHMENT_COMMANDER", id, `Detachment Commander, ${name}`);
    await relate(detachmentOffice(id), companyOffice(parent), "PRIMARY_COMMAND", CH);
    await relate(detachmentOffice(id), companyOffice(parent, true), "PARALLEL_REPORTING", CH);
  }
  for (const [pos, user] of HOLDERS) {
    if (!await one(db, "SELECT id FROM users WHERE id = ?", user)) continue;
    if (await one(db, "SELECT id FROM position_appointments WHERE position_id = ? AND ended_at IS NULL", pos)) continue;
    await run(db, "INSERT INTO position_appointments (id, position_id, user_id, valid_from, authorising_ref, created_at) VALUES (?,?,?,?,?,?)", `pap_${pos}`, pos, user, t0, "SYN-APPT-KMU", now);
  }

  // Synthetic personnel in the established Detachments (so commanders' views have records to show) -------------
  const existing = await all<{ personnel_ref: string }>(db, "SELECT personnel_ref FROM personnel_records WHERE home_unit_id IN (?,?,?,?,?,?)", ...KMU_DETACHMENTS.map(([id]) => id));
  if (!existing.length) {
    const max = await one<{ n: number }>(db, "SELECT MAX(CAST(SUBSTRING(personnel_ref, 5) AS UNSIGNED)) AS n FROM personnel_records WHERE personnel_ref LIKE 'PER-%'");
    let n = Number(max?.n ?? 0);
    const SURNAMES = ["Kalunga", "Mwiinga", "Sichone", "Chibwe", "Malama", "Ng'andu", "Kaoma", "Mubita"];
    const GIVEN = ["Chanda", "Mutale", "Nalukui", "Kabaso", "Mweemba", "Chisala"];
    const RANKS = ["INSP", "SGT", "SGT", "PC", "PC", "PC"];
    for (const [unit] of KMU_DETACHMENTS) {
      for (let i = 0; i < 6; i++) {
        n++;
        const id = `per_${String(n).padStart(4, "0")}`;
        const surname = SURNAMES[(n * 3) % SURNAMES.length], first = `Demo ${GIVEN[(n * 5) % GIVEN.length]}`;
        const ref = `PER-${String(n).padStart(6, "0")}`;
        await run(db, `INSERT INTO personnel_records (id, tenant_id, personnel_ref, service_number, surname, first_names, name_key, rank_code, home_unit_id, employment_status, disposition_status, verification_status, synthetic, created_by, created_at, updated_at)
                       VALUES (?,?,?,?,?,?,?,?,?, 'SERVING', 'AVAILABLE_HOME', 'UNVERIFIED', 1, 'u_mu_adm', ?, ?)`,
          id, tenant, ref, `SYN-${String(500000 + n * 13).padStart(6, "0")}`, surname, first, nameKey(surname, first), RANKS[i], unit, now, now);
        await run(db, "INSERT INTO personnel_memberships (id, personnel_id, org_unit_id, valid_from, reason, recorded_by, created_at) VALUES (?,?,?,?,?,?,?)", `pmb_${id}`, id, unit, now.slice(0, 10), "Synthetic baseline registration", "u_mu_adm", now);
        await run(db, "INSERT INTO personnel_history (personnel_id, field, new_value, reason, actor_id, created_at) VALUES (?,?,?,?,?,?)", id, "record", ref, "Synthetic baseline registration", "u_mu_adm", now);
        await run(db, "INSERT INTO disposition_history (personnel_id, previous_status, new_status, reason, authorised_by, effective_date, created_at) VALUES (?,NULL,'AVAILABLE_HOME','Initial registration',?,?,?)", id, "u_mu_adm", now.slice(0, 10), now);
      }
    }
  }
  await audit(db, { actorId: null, action: "system.seed", category: "CONFIG", details: { note: "Kamfinsa Mobile Unit established Companies, Detachments and command offices loaded (directive 28 Nov 2026)", companies: KMU_COMPANIES.length, detachments: KMU_DETACHMENTS.length } });
}

/**
 * Seed step 017 — keeps the Area Commander a distinct appointment (directive §10–§11): ends the synthetic appointment of
 * the Area Commander account to the A Company Commander office made by the first version of step 016, and corrects the
 * DIG Special Duties office title to the published name ("Special Duties / State House", official website R3).
 * Development data only; the appointment row is end-dated (history kept), never deleted.
 */
export async function seedKmuCorrections(db: DB) {
  const t = new Date().toISOString();
  await run(db, "UPDATE position_appointments SET ended_at = ?, end_reason = ?, valid_to = COALESCE(valid_to, ?) WHERE position_id = 'pos_mu_a_cc' AND user_id = 'u_mu_acoy' AND ended_at IS NULL",
    t, "Synthetic correction: the Area Commander is a distinct appointment from the Company Commander (directive 28 Nov 2026, §10-§11).", t);
  await run(db, "UPDATE command_positions SET title = 'Deputy Inspector General – Special Duties / State House' WHERE id = 'pos_dig_sd' AND title LIKE '%Stately%'");
}

/**
 * Seed step 018 — Company Commander reporting route (issue #2): Company Commander → Senior Operations Officer
 * (Staff II → Staff I) → Divisional Commander, Mobile Unit, as stated by the stakeholders. Ends the interim direct
 * relationship to the Divisional Commander (history kept: end-dated, never deleted) and adds the Staff II line.
 */
export async function seedCompanyRoute(db: DB) {
  const t = new Date().toISOString();
  if (!await one(db, "SELECT id FROM command_positions WHERE id = ?", COMPANY_SUPERIOR)) return;
  for (const [id] of KMU_COMPANIES) {
    const cc = companyOffice(id);
    if (!await one(db, "SELECT id FROM command_positions WHERE id = ?", cc)) continue;
    await run(db, "UPDATE reporting_relationships SET ended_at = ?, valid_to = COALESCE(valid_to, ?) WHERE subordinate_position_id = ? AND superior_position_id = 'pos_mu_cmd' AND relationship_type = 'PRIMARY_COMMAND' AND ended_at IS NULL", t, t, cc);
    if (!await one(db, "SELECT id FROM reporting_relationships WHERE subordinate_position_id = ? AND superior_position_id = ? AND relationship_type = 'PRIMARY_COMMAND' AND ended_at IS NULL", cc, COMPANY_SUPERIOR)) {
      await run(db, "INSERT INTO reporting_relationships (id, subordinate_position_id, superior_position_id, relationship_type, channel, valid_from, authorising_ref, created_at) VALUES (?,?,?, 'PRIMARY_COMMAND', 'Mobile Unit company command', ?, ?, ?)",
        `rel_kmu_${id.replace(/^org_mu_/, "")}_cc_s2`, cc, COMPANY_SUPERIOR, t, "KMU-DIR-2026-11-28-F7.3", t);
    }
  }
}
