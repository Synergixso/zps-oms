/**
 * Seed step 003 — three-tier 27-role catalogue (SYNTHETIC data only).
 *
 *  1. Re-maps every synthetic account still holding a retired (41-catalogue) role: the old assignment is
 *     REVOKED with a reason (history kept), and an assignment of the mapped role is granted at the same unit.
 *  2. Creates synthetic accounts for the roles that had no equivalent (07, 18, 23, 24, 27).
 *  3. Records SYNTHETIC stores-approval delegations for the existing synthetic commanders (demonstration
 *     configuration only, references SYN-DELEG-STORES-*; the Service must configure real delegations).
 *  4. Creates general-stores items, receipts, and requisitions through the stores domain.
 * Idempotent: re-running changes nothing.
 */
import type { DB } from "./connection";
import { all, one, run } from "./connection";
import { ROLE_BY_CODE, type RoleCode } from "../domain/catalogue";
import { hashPassword } from "../domain/auth";
import { loadActor } from "../domain/policy";
import { createItem, createRequisition, recordMovement, requisitionAction } from "../domain/stores";
import { ROLE_REMAP, type RetiredRoleCode } from "./role-remap";
import { SYNTHETIC_DEV_PASSWORD } from "./constants";

type NewUser = [id: string, username: string, name: string, role: RoleCode, org: string];

export const THREE_TIER_USERS: NewUser[] = [
  ["u_cb_tech", "demo.cb.tech", "Demo Copperbelt Division System Administrator", "UNIT_TECH_ADMIN", "org_cb"],
  ["u_mu_tech", "demo.mu.tech", "Demo Mobile Unit System Administrator", "UNIT_TECH_ADMIN", "org_mu"],
  ["u_kit_tech", "demo.kitwe.tech", "Demo Kitwe District System Administrator", "DISTRICT_TECH_ADMIN", "org_cb_kitwe"],
  ["u_kit_stores", "demo.kitwe.stores", "Demo Kitwe District Stores Officer", "STORES_OFFICER_DISTRICT", "org_cb_kitwe"],
  ["u_kitc_tech", "demo.kitwec.tech", "Demo Kitwe Central Station System Administrator", "STATION_TECH_ADMIN", "org_cb_kitwe_central"],
  ["u_kitc_stores", "demo.kitwec.stores", "Demo Kitwe Central Station Administrator (Stores)", "STATION_ADMIN_STORES", "org_cb_kitwe_central"],
];

const STORES_DELEGATIONS: Array<[user: string, org: string]> = [
  ["u_lsk_cmd", "org_lsk"], ["u_cb_cmd", "org_cb"], ["u_mu_cmd", "org_mu"], ["u_kit_cmd", "org_cb_kitwe"], ["u_kitc_cmd", "org_cb_kitwe_central"],
];

type Item = [code: string, category: string, name: string, uom: string, reorder: number, receipt: number];
const STORE_ITEMS: Array<[keeper: string, org: string, items: Item[]]> = [
  ["u_asset", "org_lsk", [
    ["SYN-STO-1001", "STATIONERY", "A4 copy paper (synthetic)", "ream", 40, 120],
    ["SYN-STO-1002", "STATIONERY", "Ballpoint pens, blue (synthetic)", "box", 10, 25],
    ["SYN-STO-1003", "ICT_CONSUMABLES", "Laser toner cartridge (synthetic)", "each", 4, 6],
    ["SYN-STO-1004", "CLEANING", "Floor detergent 5 L (synthetic)", "can", 6, 4],
  ]],
  ["u_asset_cb", "org_cb", [
    ["SYN-STO-2001", "STATIONERY", "A4 copy paper (synthetic)", "ream", 30, 90],
    ["SYN-STO-2002", "GENERAL_HARDWARE", "Padlocks, office (synthetic)", "each", 5, 12],
    ["SYN-STO-2003", "KITCHEN_WELFARE", "Drinking water 20 L (synthetic)", "bottle", 8, 20],
  ]],
  ["u_kit_stores", "org_cb_kitwe", [
    ["SYN-STO-3001", "STATIONERY", "Occurrence-book refill pads (synthetic)", "pad", 10, 40],
    ["SYN-STO-3002", "CLEANING", "Hand soap (synthetic)", "bar", 12, 30],
    ["SYN-STO-3003", "UNIFORM_GENERAL", "Name tags, general uniform (synthetic)", "each", 10, 8],
  ]],
  ["u_kitc_stores", "org_cb_kitwe_central", [
    ["SYN-STO-4001", "STATIONERY", "Envelopes A4 (synthetic)", "pack", 5, 15],
    ["SYN-STO-4002", "ICT_CONSUMABLES", "USB flash drive 16 GB (synthetic)", "each", 2, 0],
  ]],
];

export async function seedThreeTier(db: DB) {
  const t0 = "2025-01-01T08:00:00.000Z";
  const now = new Date().toISOString();

  // 1. Re-map retired-role assignments of synthetic accounts --------------------------------
  const old = await all<{ id: string; user_id: string; role_code: RetiredRoleCode; org_unit_id: string; valid_to: string | null }>(db,
    `SELECT a.id, a.user_id, a.role_code, a.org_unit_id, a.valid_to FROM role_assignments a JOIN users u ON u.id = a.user_id JOIN roles r ON r.code = a.role_code
      WHERE u.synthetic = 1 AND a.revoked_at IS NULL AND r.status = 'RETIRED'`);
  for (const a of old) {
    const to = ROLE_REMAP[a.role_code];
    if (!to) continue;
    await run(db, "UPDATE role_assignments SET revoked_at = ?, revoked_by = NULL, revoke_reason = ? WHERE id = ?", now, "Superseded by the 27-role catalogue (SYN-REMAP-27).", a.id);
    const dup = await one(db, "SELECT id FROM role_assignments WHERE user_id = ? AND role_code = ? AND org_unit_id = ? AND revoked_at IS NULL", a.user_id, to, a.org_unit_id);
    if (!dup) {
      await run(db, `INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, valid_to, justification, granted_by, created_at) VALUES (?,?,?,?,?,?,?, NULL, ?)`,
        `${a.id}_r27`.slice(0, 40), a.user_id, to, a.org_unit_id, now, a.valid_to, `Re-mapped from retired role ${a.role_code} to the 27-role catalogue (SYN-REMAP-27).`, now);
    }
    await run(db, "UPDATE users SET position_title = ? WHERE id = ? AND synthetic = 1", `${ROLE_BY_CODE[to].name} (synthetic)`, a.user_id);
  }

  // 2. Accounts for the roles that had no equivalent ------------------------------------------
  for (const [id, username, name, role, org] of THREE_TIER_USERS) {
    if (await one(db, "SELECT id FROM users WHERE id = ? OR username = ?", id, username)) continue;
    await run(db, "INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, `${ROLE_BY_CODE[role].name} (synthetic)`, t0);
    await run(db, "INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, justification, created_at) VALUES (?,?,?,?,?,?,?)",
      `asg_${id}_0`, id, role, org, t0, "Synthetic baseline assignment for demonstration (SYN-BASELINE).", now);
  }
  await run(db, "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE synthetic = 1 AND password_hash IS NULL", await hashPassword(SYNTHETIC_DEV_PASSWORD), now);

  // 3. Synthetic stores-approval delegations (demonstration configuration) ------------------
  for (const [i, [u, org]] of STORES_DELEGATIONS.entries()) {
    if (!await one(db, "SELECT id FROM users WHERE id = ?", u)) continue;
    if (await one(db, "SELECT id FROM delegations WHERE user_id = ? AND org_unit_id = ? AND domain = 'STORES' AND revoked_at IS NULL", u, org)) continue;
    await run(db, "INSERT INTO delegations (id, user_id, org_unit_id, domain, valid_from, approval_ref, created_at) VALUES (?,?,?, 'STORES', ?, ?, ?)",
      `dlg_st_${i}`, u, org, t0, `SYN-DELEG-STORES-${String(i + 1).padStart(3, "0")}`, now);
  }

  // 4. General stores data, created through the domain (authorisation, ledger and audit apply) --
  if (Number((await one<{ c: number }>(db, "SELECT COUNT(*) AS c FROM store_items"))!.c) > 0) return;
  const as = async (id: string) => (await loadActor(db, id))!;
  const codes = new Map<string, string>();
  for (const [keeper, org, items] of STORE_ITEMS) {
    const k = await as(keeper);
    for (const [code, category, name, uom, reorder, receipt] of items) {
      const it = await createItem(db, k, { orgUnitId: org, code, categoryCode: category, name, unitOfMeasure: uom, reorderLevel: reorder });
      codes.set(code, it.id);
      if (receipt > 0) await recordMovement(db, k, it.id, { type: "RECEIPT", quantity: receipt, reference: `SYN-GRV-${code.slice(-4)}`, counterparty: "Synthetic supplier", note: "Opening synthetic stock." });
    }
  }
  const lskKeeper = await as("u_asset");
  await recordMovement(db, lskKeeper, codes.get("SYN-STO-1001")!, { type: "ISSUE", quantity: 30, counterparty: "Lusaka Division registry (synthetic)", reference: "SYN-ISS-0001" });
  await recordMovement(db, lskKeeper, codes.get("SYN-STO-1003")!, { type: "ADJUSTMENT", quantity: -1, note: "Stock-take count: one cartridge damaged (synthetic)." });

  // Kitwe Central Station requisitions from the Kitwe District store: approved by the Station OIC, issued by the district stores officer.
  const station = await as("u_kitc_stores");
  const r1 = await createRequisition(db, station, { requestingUnitId: "org_cb_kitwe_central", storeUnitId: "org_cb_kitwe", purpose: "Monthly station stationery and hygiene supplies (synthetic)",
    lines: [{ itemId: codes.get("SYN-STO-3001")!, quantity: 10 }, { itemId: codes.get("SYN-STO-3002")!, quantity: 6 }] }, true);
  await requisitionAction(db, await as("u_kitc_cmd"), r1, "APPROVE", { comment: "Approved for the month (synthetic)." });
  await requisitionAction(db, await as("u_kit_stores"), r1, "ISSUE");
  await createRequisition(db, station, { requestingUnitId: "org_cb_kitwe_central", storeUnitId: "org_cb_kitwe", purpose: "Name tags for newly posted officers (synthetic)",
    lines: [{ itemId: codes.get("SYN-STO-3003")!, quantity: 4 }] }, true);
  await createRequisition(db, station, { requestingUnitId: "org_cb_kitwe_central", storeUnitId: "org_cb_kitwe", purpose: "Draft: cleaning materials for the charge office (synthetic)",
    lines: [{ itemId: codes.get("SYN-STO-3002")!, quantity: 4 }] }, false);
  // Kitwe District requisitions from the Copperbelt Division store (awaiting the District OC's decision).
  await createRequisition(db, await as("u_kit_ops"), { requestingUnitId: "org_cb_kitwe", storeUnitId: "org_cb", purpose: "Drinking water for the district office (synthetic)",
    lines: [{ itemId: codes.get("SYN-STO-2003")!, quantity: 6 }] }, true);
}
