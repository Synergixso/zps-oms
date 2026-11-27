/**
 * Seed step 013 — the four Police Intelligence Officer roles (31-role catalogue, DEC-072/073). SYNTHETIC data only.
 *
 * Creates synthetic liaison officers at Service HQ (role 07), Copperbelt Division (19), Kitwe District (30),
 * Kitwe Central Police Station and a Mobile Unit section (31), plus a Lusaka Central District officer used to prove
 * that one Province cannot see another's records. Example liaison records are created through the liaison domain
 * functions, so they pass the same validation, scope, channel and audit rules as user input. The records hold
 * synthetic reference numbers ("SYN-…") and nothing else: the model has no content fields.
 * Development databases only (runSeedSteps refuses databases holding non-synthetic users).
 */
import type { DB } from "./connection";
import { one, run } from "./connection";
import { ROLE_BY_CODE, type RoleCode } from "../domain/catalogue";
import { hashPassword } from "../domain/auth";
import { today } from "../domain/core";
import { loadActor } from "../domain/policy";
import { acknowledgeLiaison, createLiaison, receiveLiaison, submitLiaison } from "../domain/liaison";
import { SYNTHETIC_DEV_PASSWORD } from "./constants";

type NewUser = [id: string, username: string, name: string, role: RoleCode, org: string];
export const LIAISON_USERS: NewUser[] = [
  ["u_hq_pio", "demo.hq.pio", "Demo National Police Intelligence Officer", "NATIONAL_INTEL_OFFICER", "org_hq"],
  ["u_cb_pio", "demo.cb.pio", "Demo Copperbelt Division Police Intelligence Officer", "DIVISION_INTEL_OFFICER", "org_cb"],
  ["u_kit_pio", "demo.kitwe.pio", "Demo Kitwe District Police Intelligence Officer", "DISTRICT_INTEL_OFFICER", "org_cb_kitwe"],
  ["u_kitc_pio", "demo.kitwec.pio", "Demo Kitwe Central Police Intelligence Officer", "INTEL_OFFICER", "org_cb_kitwe_central"],
  ["u_mus_pio", "demo.mu.section.pio", "Demo Mobile Unit Section Police Intelligence Officer", "INTEL_OFFICER", "org_mu_a1p1s1"],
  ["u_lsk_pio", "demo.lsk.pio", "Demo Lusaka Central District Police Intelligence Officer", "DISTRICT_INTEL_OFFICER", "org_lsk_central"],
];

export async function seedLiaison(db: DB) {
  const t0 = "2025-01-01T08:00:00.000Z";
  const now = new Date().toISOString();
  for (const [id, username, name, role, org] of LIAISON_USERS) {
    if (await one(db, "SELECT id FROM users WHERE id = ? OR username = ?", id, username)) continue;
    if (!await one(db, "SELECT id FROM org_units WHERE id = ?", org)) continue;
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, `${ROLE_BY_CODE[role].name} (synthetic)`, t0);
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES (?,?,?,?,?,?,?)",
      `asg_${id}_0`, id, role, org, t0, "Synthetic baseline liaison assignment for demonstration (SYN-BASELINE-31).", now);
  }
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE synthetic = 1 AND password_hash IS NULL", await hashPassword(SYNTHETIC_DEV_PASSWORD), now);

  if (Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM liaison_records"))!.c) > 0) return;
  const A = async (id: string) => (await loadActor(db, id))!;
  const t = today();
  const station = await A("u_kitc_pio"), district = await A("u_kit_pio"), division = await A("u_cb_pio"), national = await A("u_hq_pio");

  // 1. Station → District (received, acknowledged) → Division (submitted, awaiting receipt).
  const r1 = await createLiaison(db, station, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe_central", externalReference: "SYN-KCS-LIA-0001", classification: "RESTRICTED" });
  await submitLiaison(db, station, r1.id, { toUnitId: "org_cb_kitwe", dateSubmitted: t });
  await receiveLiaison(db, district, r1.id, { dateReceived: t });
  await acknowledgeLiaison(db, district, r1.id, { dateAcknowledged: t, approvalReference: "SYN-APPR-KIT-001" });
  await submitLiaison(db, district, r1.id, { toUnitId: "org_cb", dateSubmitted: t });
  // 2. Station report reference kept as a draft.
  await createLiaison(db, station, { kind: "REPORT_REFERENCE", originUnitId: "org_cb_kitwe_central", externalReference: "SYN-KCS-RPT-0002" });
  // 3. District → Station (downward channel), awaiting receipt.
  const r3 = await createLiaison(db, district, { kind: "SUBMISSION", originUnitId: "org_cb_kitwe", externalReference: "SYN-KIT-LIA-0003" });
  await submitLiaison(db, district, r3.id, { toUnitId: "org_cb_kitwe_central", dateSubmitted: t });
  // 4. National → Division report reference, received by the Division, awaiting acknowledgement.
  const r4 = await createLiaison(db, national, { kind: "REPORT_REFERENCE", originUnitId: "org_hq", externalReference: "SYN-HQ-RPT-0004", approvalReference: "SYN-APPR-HQ-004" });
  await submitLiaison(db, national, r4.id, { toUnitId: "org_cb", dateSubmitted: t });
  await receiveLiaison(db, division, r4.id, { dateReceived: t });
  // 5. Lusaka Central District draft (another Province: invisible to Copperbelt officers).
  if (await one(db, "SELECT id FROM users WHERE id = 'u_lsk_pio'")) {
    await createLiaison(db, await A("u_lsk_pio"), { kind: "SUBMISSION", originUnitId: "org_lsk_central", externalReference: "SYN-LSK-LIA-0005" });
  }
}
