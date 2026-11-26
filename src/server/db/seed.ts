/**
 * Synthetic seed data. EVERYTHING here is fabricated for demonstration.
 * - Organisation names follow the user-supplied scope list and are flagged
 *   as provisional pending validation against the approved establishment.
 * - User names are obviously fictitious ("Demo …"); no ranks, service
 *   numbers or real identities are used.
 * - Vehicle and asset references use SYN- prefixes and cannot be real.
 */
import type { DB } from "./connection";
import { HQ_NAME } from "./constants";
import { run } from "./connection";
import { ASSET_CATEGORIES, REQUEST_CATEGORIES, ROLES, type RoleCode } from "../domain/catalogue";
import { setClock } from "../domain/core";
import { HQ_ID, loadActor } from "../domain/policy";
import { createDraft, performAction, type RequestAction } from "../domain/requests";
import { createMaintenance, maintenanceAction, type MaintAction } from "../domain/fleet";
import { assetAction } from "../domain/assets";
import { audit } from "../domain/audit";
import { proposeChange, rebuildClosure } from "../domain/org";
import { REPORTS } from "../domain/reports";

const BASE = "2025-01-01";
const PROVISIONAL = "Provisional synthetic entry: name, status and reporting line require validation against the current approved DIG Operations establishment.";

export const PROVINCES = [
  ["org_lsk", "PD-LSK", "Lusaka Division"],
  ["org_cb", "PD-CB", "Copperbelt Division"],
  ["org_cen", "PD-CEN", "Central Division"],
  ["org_sth", "PD-STH", "Southern Division"],
  ["org_est", "PD-EST", "Eastern Division"],
  ["org_nth", "PD-NTH", "Northern Division"],
  ["org_lua", "PD-LUA", "Luapula Division"],
  ["org_wst", "PD-WST", "Western Division"],
  ["org_nw", "PD-NW", "North-Western Division"],
  ["org_muc", "PD-MUC", "Muchinga Division"],
] as const;

export const FORMATIONS = [
  ["org_mu", "FM-MU", "Mobile Unit Division / SPOM, Kamfinsa"],
  ["org_pmb", "FM-PMB", "Paramilitary Battalion"],
  ["org_pu", "FM-PU", "Protective Unit"],
  ["org_ap", "FM-AP", "Airport Division"],
  ["org_taz", "FM-TAZ", "TAZARA Division"],
  ["org_cpss", "FM-CPSS", "Crime Prevention and Support Services"],
  ["org_paw", "FM-PAW", "Police Air Wing"],
  ["org_ncc", "FM-NCC", "National Command Centre"],
] as const;

type SeedUser = [id: string, username: string, name: string, title: string, grants: Array<[RoleCode, string, string?]>];

export const SEED_USERS: SeedUser[] = [
  ["u_dig", "demo.dig.exec", "Demo DIG Ops Executive", "Deputy Inspector General of Police - Operations (DIG Operations) (synthetic)", [["DIG_OPERATIONS", HQ_ID]]],
  ["u_hqc", "demo.hq.coord", "Demo HQ Operations Coordinator", "Commissioner – Operations HQ (synthetic)", [["COMMISSIONER_OPS_HQ", HQ_ID]]],
  ["u_lsk_cmd", "demo.lsk.commander", "Demo Lusaka Division Commander", "Formation Commanding Officer (synthetic)", [["FORMATION_COMMANDING_OFFICER", "org_lsk"]]],
  ["u_lsk_sops", "demo.lsk.staffops", "Demo Lusaka Division Staff Ops", "Division Senior Staff Officer – Operations (Staff I) (synthetic)", [["DIVISION_STAFF_I", "org_lsk"]]],
  ["u_cb_cmd", "demo.cb.commander", "Demo Copperbelt Division Commander", "Formation Commanding Officer (synthetic)", [["FORMATION_COMMANDING_OFFICER", "org_cb"]]],
  ["u_cb_sops", "demo.cb.staffops", "Demo Copperbelt Division Staff Ops", "Division Senior Staff Officer – Operations (Staff I) (synthetic)", [["DIVISION_STAFF_I", "org_cb"]]],
  ["u_cen_sops", "demo.cen.staffops", "Demo Central Division Staff Ops", "Division Senior Staff Officer – Operations (Staff I) (synthetic)", [["DIVISION_STAFF_I", "org_cen"]]],
  ["u_cen_cmd", "demo.cen.commander", "Demo Central Division Commander", "Formation Commanding Officer (synthetic)", [["FORMATION_COMMANDING_OFFICER", "org_cen"]]],
  ["u_mu_cmd", "demo.mu.commander", "Demo Mobile Unit Formation Commander", "Formation Commanding Officer (synthetic)", [["FORMATION_COMMANDING_OFFICER", "org_mu"]]],
  ["u_mu_adm", "demo.mu.admin", "Demo Mobile Unit Admin Officer", "Formation Operations Staff Administrator (synthetic)", [["FORMATION_OPS_STAFF_ADMIN", "org_mu"]]],
  ["u_ap_adm", "demo.ap.admin", "Demo Airport Division Admin Officer", "Formation Operations Staff Administrator (synthetic)", [["FORMATION_OPS_STAFF_ADMIN", "org_ap"]]],
  ["u_fleet", "demo.fleet.officer", "Demo Fleet Officer", "Divisional MTO Officer-in-Charge (synthetic)", [["MTO_OIC", "org_lsk"], ["MTO_OIC", "org_mu"]]],
  ["u_fleet2", "demo.fleet.verifier", "Demo Fleet Verification Officer", "Divisional MTO Officer-in-Charge (synthetic)", [["MTO_OIC", "org_lsk"]]],
  ["u_asset", "demo.asset.custodian", "Demo Asset Custodian (Lusaka)", "Divisional Quarter Masters Stores Officer (synthetic)", [["QM_STORES_OFFICER", "org_lsk"]]],
  ["u_asset_cb", "demo.asset.cb", "Demo Asset Custodian (Copperbelt)", "Divisional Quarter Masters Stores Officer (synthetic)", [["QM_STORES_OFFICER", "org_cb"]]],
  ["u_audit", "demo.auditor", "Demo Internal Auditor", "Inspector General of Police (IG) (synthetic)", [["INSPECTOR_GENERAL", HQ_ID, "2027-03-31T23:59:59.000Z"]]],
  ["u_plat", "demo.platform.admin", "Demo Platform Administrator", "Superadmin (synthetic)", [["SUPERADMIN", HQ_ID]]],
  ["u_sec", "demo.security.admin", "Demo Security Administrator", "System Administrator – HQ Tech (synthetic)", [["HQ_TECH_ADMIN", HQ_ID]]],
  ["u_org", "demo.org.registry", "Demo Organisation Registry Administrator", "Superadmin (synthetic)", [["SUPERADMIN", HQ_ID]]],
  ["u_staff", "demo.cen.staff", "Demo Authorised Operations Staff (Central)", "Divisional Principal Armourer (synthetic)", [["PRINCIPAL_ARMOURER", "org_cen"]]],
];

const DELEGATIONS: Array<[string, string, "ADMIN_REQUEST" | "MAINTENANCE" | "ORG_CHANGE"]> = [
  ["u_dig", HQ_ID, "ADMIN_REQUEST"],
  ["u_dig", HQ_ID, "ORG_CHANGE"],
  ["u_lsk_cmd", "org_lsk", "ADMIN_REQUEST"],
  ["u_lsk_cmd", "org_lsk", "MAINTENANCE"],
  ["u_cb_cmd", "org_cb", "ADMIN_REQUEST"],
  ["u_cb_cmd", "org_cb", "MAINTENANCE"],
  ["u_cen_cmd", "org_cen", "ADMIN_REQUEST"],
  ["u_mu_cmd", "org_mu", "ADMIN_REQUEST"],
  ["u_mu_cmd", "org_mu", "MAINTENANCE"],
];

/** Tenants: national root, one per Provincial Division, and the Mobile Unit formation tenant. */
export const TENANTS: Array<[id: string, code: string, name: string, type: "NATIONAL" | "PROVINCIAL" | "FORMATION", parent: string | null]> = [
  ["t_zps", "ZPS", "Zambia Police Service — National", "NATIONAL", null],
  ...PROVINCES.map(([id, code, name]): [string, string, string, "PROVINCIAL", string] => [`t_${id.slice(4)}`, code, name, "PROVINCIAL", "t_zps"]),
  ["t_mu", "FM-MU", "Mobile Unit Division / SPOM, Kamfinsa", "FORMATION", "t_zps"],
];

/** Synthetic sub-units exercising the territorial and formation hierarchies (provisional, development only). */
export const SUB_UNITS: Array<[id: string, code: string, name: string, type: string, parent: string]> = [
  ["org_cb_kitwe", "DC-CB-KIT", "Kitwe District Command (synthetic)", "DISTRICT", "org_cb"],
  ["org_cb_kitwe_central", "ST-CB-KITC", "Kitwe Central Police Station (synthetic)", "STATION", "org_cb_kitwe"],
  ["org_cb_kitwe_nkana", "ST-CB-NKE", "Nkana East Police Station (synthetic)", "STATION", "org_cb_kitwe"],
  ["org_cb_kitwe_chim", "PP-CB-CHM", "Chimwemwe Police Post (synthetic)", "POST", "org_cb_kitwe_central"],
  ["org_cb_mufulira", "DC-CB-MUF", "Mufulira District Command (synthetic)", "DISTRICT", "org_cb"],
  ["org_cb_mufulira_central", "ST-CB-MUFC", "Mufulira Central Police Station (synthetic)", "STATION", "org_cb_mufulira"],
  ["org_lsk_central", "DC-LSK-CEN", "Lusaka Central District Command (synthetic)", "DISTRICT", "org_lsk"],
  ["org_lsk_central_stn", "ST-LSK-CEN", "Lusaka Central Police Station (synthetic)", "STATION", "org_lsk_central"],
  ["org_lsk_central_post", "PP-LSK-CEN", "Lusaka Central Police Post (synthetic)", "POST", "org_lsk_central_stn"],
  ["org_mu_ops", "DP-MU-OPS", "Operations Department, Mobile Unit (synthetic)", "DEPARTMENT", "org_mu"],
  ["org_mu_a", "CO-MU-A", "A Company, Mobile Unit (synthetic)", "COMPANY", "org_mu"],
  ["org_mu_b", "CO-MU-B", "B Company, Mobile Unit (synthetic)", "COMPANY", "org_mu"],
  ["org_mu_a1", "DT-MU-A1", "1 Detachment, A Company (synthetic)", "DETACHMENT", "org_mu_a"],
  ["org_mu_a1p1", "PL-MU-A1P1", "1 Platoon, 1 Detachment (synthetic)", "PLATOON", "org_mu_a1"],
  ["org_mu_a1p1s1", "SC-MU-A1P1S1", "1 Section, 1 Platoon (synthetic)", "SECTION", "org_mu_a1p1"],
  ["org_mu_a1p1s2", "SC-MU-A1P1S2", "2 Section, 1 Platoon (synthetic)", "SECTION", "org_mu_a1p1"],
  ["org_mu_b1", "DT-MU-B1", "1 Detachment, B Company (synthetic)", "DETACHMENT", "org_mu_b"],
];

/** Default parent → child type rules (configuration data, adjustable in the database). */
export const TYPE_RULES: Array<[string, string]> = [
  ["SERVICE_HQ", "HQ_OFFICE"], ["SERVICE_HQ", "PROVINCIAL_DIVISION"], ["SERVICE_HQ", "FORMATION"], ["HQ_OFFICE", "FORMATION"],
  ["PROVINCIAL_DIVISION", "DISTRICT"], ["PROVINCIAL_DIVISION", "FORMATION"], ["DISTRICT", "STATION"], ["STATION", "POST"],
  ["FORMATION", "DEPARTMENT"], ["FORMATION", "COMPANY"], ["DEPARTMENT", "COMPANY"], ["DEPARTMENT", "SECTION"],
  ["COMPANY", "DETACHMENT"], ["COMPANY", "PLATOON"], ["DETACHMENT", "PLATOON"], ["PLATOON", "SECTION"],
];

export async function seedDatabase(db: DB) {
  const t = new Date().toISOString();
  const ins = (sql: string, ...p: unknown[]) => run(db, sql, ...p);
  const tenantOfOrg = new Map<string, string>();

  // Tenants -----------------------------------------------------------------
  for (const [id, code, name, type, parent] of TENANTS) {
    await ins("INSERT INTO tenants (id, code, name, tenant_type, parent_tenant_id, status, created_at) VALUES (?,?,?,?,?, 'ACTIVE', ?)", id, code, name, type, parent, t);
  }
  for (const [p, c] of TYPE_RULES) await ins("INSERT INTO org_type_rules (parent_type, child_type) VALUES (?,?)", p, c);

  // Organisations -----------------------------------------------------------
  const unit = async (id: string, tenant: string, code: string, name: string, type: string, branch: string, note: string, shortName: string | null = null) => {
    tenantOfOrg.set(id, tenant);
    await ins(`INSERT INTO org_units (id, tenant_id, code, name, short_name, unit_type, branch, status, effective_from, validation_note, created_at)
               VALUES (?,?,?,?,?,?,?, 'ACTIVE', ?,?,?)`, id, tenant, code, name, shortName, type, branch, BASE, note, t);
  };
  const rel = (child: string, parent: string, kind: "REPORTS_TO" | "ADMINISTERED_BY") =>
    ins(`INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?,?,?, 'SYN-BASELINE', ?)`,
      `rel_${child}`, child, parent, kind, BASE, t);

  await unit(HQ_ID, "t_zps", "HQ-DIGOPS", HQ_NAME, "SERVICE_HQ", "HQ",
    "Root scope for national administration. Intermediate HQ supervisory positions are not modelled pending establishment confirmation (DEC-004).", "DIG Operations HQ");
  for (const [id, code, name] of PROVINCES) {
    await unit(id, `t_${id.slice(4)}`, code, name, "PROVINCIAL_DIVISION", "TERRITORIAL", PROVISIONAL);
    await rel(id, HQ_ID, "REPORTS_TO");
  }
  for (const [id, code, name] of FORMATIONS) {
    await unit(id, id === "org_mu" ? "t_mu" : "t_zps", code, name, "FORMATION", "FORMATION", PROVISIONAL);
    await rel(id, HQ_ID, "ADMINISTERED_BY");
  }
  for (const [id, code, name, type, parent] of SUB_UNITS) {
    const branch = ["DISTRICT", "STATION", "POST"].includes(type) ? "TERRITORIAL" : "FORMATION";
    await unit(id, tenantOfOrg.get(parent)!, code, name, type, branch, PROVISIONAL);
    await rel(id, parent, "REPORTS_TO");
  }
  await rebuildClosure(db);

  // Roles and permissions ---------------------------------------------------
  // Roles come from the code catalogue (bootstrap.syncCatalogue runs before any seed step).
  if (!ROLES.length) throw new Error("Role catalogue is empty.");

  // Users, assignments, delegations -----------------------------------------
  for (const [id, username, name, title, grants] of SEED_USERS) {
    await ins("INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, title, BASE + "T08:00:00.000Z");
    for (const [i, [role, org, validTo]] of grants.entries()) {
      await ins(`INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, valid_to, justification, granted_by, created_at) VALUES (?,?,?,?,?,?,?, NULL, ?)`,
        `asg_${id}_${i}`, id, role, org, BASE + "T08:00:00.000Z", validTo ?? null, "Synthetic baseline assignment for demonstration (SYN-BASELINE).", t);
    }
  }
  for (const [i, [u, org, domain]] of DELEGATIONS.entries()) {
    await ins(`INSERT INTO delegations (id, user_id, org_unit_id, domain, valid_from, approval_ref, created_at) VALUES (?,?,?,?,?,?,?)`,
      `dlg_seed_${i}`, u, org, domain, BASE + "T08:00:00.000Z", `SYN-DELEG-${String(i + 1).padStart(3, "0")}`, t);
  }

  // Reference data ----------------------------------------------------------
  for (const c of REQUEST_CATEGORIES) await ins("INSERT INTO request_categories (code, name, description) VALUES (?,?,?)", c.code, c.name, c.description);
  for (const c of REQUEST_CATEGORIES) {
    const steps = c.code === "ADMIN_RETURN"
      ? [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }, { level: 2, approverScope: "HQ", label: "National HQ approval" }]
      : [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }];
    await ins("INSERT INTO workflow_definitions (id, category_code, version, approval_steps, status, note, created_at) VALUES (?,?,1,?, 'ACTIVE', ?, ?)",
      `wf_${c.code.toLowerCase()}_v1`, c.code, JSON.stringify(steps), "Demonstration-only routing. Not an approved ZPS delegation matrix (DEC-008).", t);
  }
  for (const c of ASSET_CATEGORIES) await ins("INSERT INTO asset_categories (code, name, allowed) VALUES (?,?,1)", c.code, c.name);
  for (const r of REPORTS) {
    await ins("INSERT IGNORE INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
      r.code, r.name, r.description, "report.view", JSON.stringify(r.fields), "Report owner to be nominated by the Service (DEC-012).");
  }
  await ins("INSERT INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
    "AUDIT_EVIDENCE", "Audit evidence export", "Filtered audit events for authorised audit evidence.", "audit.export",
    JSON.stringify(["seq", "occurred_at", "actor_name", "action", "outcome", "category", "entity_type", "entity_id", "org_name", "details", "hash"]), "Internal Audit (to be confirmed).");
  const setting = (k: string, v: string, d: string) => ins("INSERT INTO app_settings (`key`, value, description) VALUES (?,?,?)", k, v, d);
  await setting("maintenance.approval_threshold_zmw", "5000", "Synthetic threshold above which maintenance needs delegated approval (provisional).");
  await setting("request.sla_days", "10", "Days after submission before a request is flagged overdue (provisional).");
  await setting("integrations.external_notifications", "DISABLED", "Email/SMS/WhatsApp providers are disabled until approved (DEC-013).");
  await setting("environment.label", "LOCAL SYNTHETIC PROTOTYPE", "Displayed on every screen.");

  // Fleet -------------------------------------------------------------------
  const makes = [["Toyota", "Land Cruiser", "Utility (light)"], ["Toyota", "Hilux", "Utility (light)"], ["Nissan", "Navara", "Utility (light)"], ["Toyota", "Corolla", "Saloon"], ["Toyota", "Hiace", "Minibus"], ["Isuzu", "NPR", "Truck (general)"], ["Ford", "Ranger", "Utility (light)"], ["Mitsubishi", "Pajero", "Station wagon"]];
  const fleetOrgs = ["org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_cb", "org_cb", "org_cb", "org_cb", "org_cen", "org_cen", "org_sth", "org_est", "org_mu", "org_mu", "org_mu", "org_ap", "org_ap", HQ_ID, HQ_ID, "org_nw", "org_wst", "org_taz"];
  for (const [i, org] of fleetOrgs.entries()) {
    const [make, model, cls] = makes[i % makes.length];
    const due = new Date(Date.parse("2026-08-01") + i * 9 * 86400000).toISOString().slice(0, 10);
    const lic = new Date(Date.parse("2026-12-01") + i * 17 * 86400000).toISOString().slice(0, 10);
    await ins(`INSERT INTO vehicles (id, tenant_id, fleet_ref, registration_ref, make, model, vehicle_class, custody_org_id, status, next_service_due, licence_expiry, insurance_expiry, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      `veh_${i + 1}`, tenantOfOrg.get(org)!, `SYN-FLT-${String(1001 + i)}`, `SYN-REG-${(0x1a2b + i * 37).toString(16).toUpperCase()}`, make, model, cls, org,
      i === 22 ? "AWAITING_DISPOSAL" : "IN_SERVICE", due, lic, lic, t, t);
  }

  // Assets ------------------------------------------------------------------
  const assetDefs: Array<[string, string, string]> = [
    ["OFFICE_FURNITURE", "Office desk, steel frame", "GOOD"], ["OFFICE_FURNITURE", "Filing cabinet, 4-drawer", "FAIR"],
    ["OFFICE_FURNITURE", "Conference table", "GOOD"], ["ICT_PERIPHERAL", "Desktop printer (mono laser)", "GOOD"],
    ["ICT_PERIPHERAL", "Document scanner", "NEW"], ["ICT_PERIPHERAL", "Desktop monitor 24-inch", "GOOD"],
    ["OFFICE_EQUIPMENT", "Photocopier, floor standing", "FAIR"], ["OFFICE_EQUIPMENT", "Paper shredder", "POOR"],
    ["OFFICE_EQUIPMENT", "Projector (meeting room)", "GOOD"], ["GENERAL_STORES", "Office chairs (set of 6)", "GOOD"],
  ];
  const assetOrgs = ["org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_cb", "org_cb", "org_cb", "org_cb", "org_cen", "org_cen", "org_mu", "org_mu", "org_mu", "org_ap", "org_ap", HQ_ID, HQ_ID, HQ_ID, "org_sth", "org_est", "org_nth"];
  for (const [i, org] of assetOrgs.entries()) {
    const [cat, desc, cond] = assetDefs[i % assetDefs.length];
    const inspected = i % 3 === 0 ? null : new Date(Date.parse("2025-06-01") + i * 23 * 86400000).toISOString();
    await ins(`INSERT INTO assets (id, tenant_id, asset_tag, category_code, description, \`condition\`, status, custody_org_id, custodian_ref, last_inspected_at, created_at, updated_at)
               VALUES (?,?,?,?,?,?, 'IN_STORE', ?, NULL, ?, ?, ?)`, `ast_${i + 1}`, tenantOfOrg.get(org)!, `SYN-AST-${String(10001 + i)}`, cat, desc, cond, org, inspected, t, t);
    await ins("INSERT INTO asset_events (id, asset_id, event_type, actor_id, after_state, note, created_at) VALUES (?,?,?,?,?,?,?)",
      `ase_seed_${i}`, `ast_${i + 1}`, "REGISTER", "u_plat", JSON.stringify({ status: "IN_STORE", condition: cond }), "Synthetic baseline registration", BASE + "T09:00:00.000Z");
  }

  await audit(db, { actorId: null, action: "system.seed", category: "CONFIG", details: { note: "Synthetic demonstration dataset loaded" } });
  await seedScenarios(db);
}

/** Drives the real domain services with a back-dated clock so history, notifications and audit are consistent. */
async function seedScenarios(db: DB) {
  const A = async (id: string) => {
    const a = await loadActor(db, id);
    if (!a) throw new Error(`Seed actor ${id} is not active`);
    return a;
  };
  const at = (iso: string) => setClock(() => new Date(iso));
  const day = (n: number, h = 9) => new Date(Date.parse("2026-10-01T00:00:00Z") + n * 86400000 + h * 3600000).toISOString();
  try {
    type Step = [user: string, action: RequestAction, reason?: string];
    const scenario = async (author: string, origin: string | undefined, cat: string, title: string, details: string, start: number, steps: Step[]) => {
      at(day(start));
      const r = await createDraft(db, await A(author), { categoryCode: cat, title, details, priority: "ROUTINE", originOrgId: origin });
      for (const [i, [u, act, reason]] of steps.entries()) {
        at(day(start + i + 1, 10 + i));
        await performAction(db, await A(u), r.id, act, { reason });
      }
      return r.id;
    };
    const lsk = "org_lsk";
    await scenario("u_lsk_sops", lsk, "OFFICE_SUPPLIES", "Quarterly stationery replenishment", "Routine replenishment of registry stationery for the divisional administration office (synthetic).", 2,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_lsk_sops", "START"], ["u_lsk_sops", "COMPLETE"], ["u_lsk_cmd", "CLOSE"]]);
    await scenario("u_lsk_sops", lsk, "FACILITY_REPAIR", "Registry office door lock repair", "Replace a faulty door lock at the divisional registry office (synthetic example).", 20,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_lsk_sops", "START"]]);
    await scenario("u_lsk_sops", lsk, "ICT_SUPPORT", "Replacement keyboard and mouse sets", "Two keyboard and mouse sets for the administration office are unserviceable (synthetic).", 40,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "RETURN", "Please attach the asset tags of the unserviceable items."]]);
    await scenario("u_lsk_sops", lsk, "ADMIN_RETURN", "Monthly administrative return — October", "Submission of the routine monthly administrative return to national HQ (synthetic).", 44,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_dig", "APPROVE"]]);
    await scenario("u_lsk_sops", lsk, "OFFICE_SUPPLIES", "Toner cartridges for divisional printers", "Toner cartridges for two office printers in the divisional administration block (synthetic).", 46,
      [["u_lsk_sops", "SUBMIT"]]);
    await scenario("u_lsk_sops", lsk, "FACILITY_REPAIR", "Office window glazing replacement", "Draft: cracked glazing in the administration corridor (synthetic).", 54, []);
    await scenario("u_cb_sops", "org_cb", "OFFICE_SUPPLIES", "Copperbelt registry consumables", "Routine registry consumables for the Copperbelt divisional office (synthetic).", 10,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"], ["u_cb_cmd", "APPROVE"], ["u_cb_sops", "START"], ["u_cb_sops", "COMPLETE"]]);
    await scenario("u_cb_sops", "org_cb", "FACILITY_REPAIR", "Meeting room air-conditioner service", "Air-conditioning unit in the meeting room requires servicing (synthetic).", 30,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"]]);
    await scenario("u_cb_sops", "org_cb", "ADMIN_RETURN", "Monthly administrative return — October (Copperbelt)", "Routine monthly administrative return (synthetic).", 45,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"], ["u_cb_cmd", "APPROVE"]]);
    await scenario("u_cen_sops", "org_cen", "ICT_SUPPORT", "Network printer configuration", "Office network printer requires reconfiguration by ICT support (synthetic).", 25,
      [["u_cen_sops", "SUBMIT"], ["u_cen_cmd", "ASSIGN"], ["u_cen_cmd", "REJECT", "Handled through the existing ICT helpdesk channel."]]);
    await scenario("u_staff", "org_cen", "OFFICE_SUPPLIES", "Envelopes and file folders", "Envelopes and file folders for the Central divisional registry (synthetic).", 50,
      [["u_staff", "SUBMIT"]]);
    await scenario("u_mu_adm", "org_mu", "FACILITY_REPAIR", "Administration block roof gutter repair", "Gutter repair at the formation administration block (synthetic).", 15,
      [["u_mu_adm", "SUBMIT"], ["u_mu_cmd", "ASSIGN"], ["u_mu_cmd", "APPROVE"], ["u_mu_adm", "START"], ["u_mu_adm", "COMPLETE"]]);
    await scenario("u_mu_adm", "org_mu", "OFFICE_SUPPLIES", "Formation registry stationery", "Routine stationery for the formation registry (synthetic).", 48,
      [["u_mu_adm", "SUBMIT"], ["u_mu_cmd", "ASSIGN"]]);
    await scenario("u_ap_adm", "org_ap", "ICT_SUPPORT", "Office UPS battery replacement", "Replace UPS batteries for administration desktops (synthetic).", 35,
      [["u_ap_adm", "SUBMIT"]]);
    await scenario("u_hqc", undefined, "ADMIN_RETURN", "National consolidated administrative summary — Q3", "Consolidation of divisional administrative returns for national management (synthetic).", 38,
      [["u_hqc", "SUBMIT"], ["u_hqc", "ASSIGN"]]);
    await scenario("u_hqc", undefined, "OFFICE_SUPPLIES", "Duplicate stationery request", "Raised in error; duplicate of an existing request (synthetic).", 12,
      [["u_hqc", "SUBMIT"], ["u_hqc", "CANCEL", "Duplicate of an existing request."]]);

    // Maintenance lifecycle examples
    type MStep = [string, MaintAction, { note?: string; workshopRef?: string; costRef?: string }?];
    const maint = async (user: string, vehicle: string, type: string, desc: string, cost: number, start: number, steps: MStep[]) => {
      at(day(start));
      const m = await createMaintenance(db, await A(user), { vehicleId: vehicle, serviceType: type, description: desc, estimatedCost: cost });
      for (const [i, [u, act, inp]] of steps.entries()) {
        at(day(start + i + 1, 11));
        await maintenanceAction(db, await A(u), m.id, act, inp ?? {});
      }
    };
    await maint("u_lsk_sops", "veh_1", "Routine service", "Scheduled routine service at 6-month interval (synthetic).", 2500, 3,
      [["u_fleet", "VALIDATE"], ["u_fleet", "REFER", { workshopRef: "SYN-WS-0101" }], ["u_fleet", "START"], ["u_fleet", "SUBMIT_COMPLETION", { note: "Service completed per checklist." }], ["u_fleet2", "VERIFY", { costRef: "SYN-INV-5501" }]]);
    await maint("u_fleet", "veh_2", "Brake and tyre check", "Brake pads worn; tyre replacement advised (synthetic).", 8200, 41,
      [["u_fleet", "VALIDATE"], ["u_lsk_cmd", "APPROVE"], ["u_fleet", "REFER", { workshopRef: "SYN-WS-0102" }], ["u_fleet", "START"]]);
    await maint("u_fleet", "veh_3", "Electrical fault", "Intermittent dashboard warning light (synthetic).", 1200, 50, []);
    await maint("u_mu_adm", "veh_15", "Engine repair", "Engine overheating reported (synthetic).", 15000, 47, [["u_fleet", "VALIDATE"]]);

    // Asset events
    at(day(5));
    await assetAction(db, await A("u_asset"), "ast_1", "ISSUE", { custodianRef: "Divisional Registry Office" });
    at(day(6));
    await assetAction(db, await A("u_asset"), "ast_2", "INSPECT", { condition: "FAIR", note: "Drawer runner stiff (synthetic)." });
    at(day(28));
    await assetAction(db, await A("u_asset"), "ast_4", "TRANSFER", { toOrgId: "org_cb", reference: "SYN-TRF-0007" });
    at(day(29));
    await assetAction(db, await A("u_asset"), "ast_7", "SEND_REPAIR", { note: "Paper feed fault (synthetic)." });

    // Pending organisational change
    at(day(52));
    await proposeChange(db, await A("u_org"), { changeType: "RENAME_UNIT", targetId: "org_cpss", name: "Crime Prevention and Support Services Directorate", reason: "Align display name with public DIG Ops page wording; requires validation (synthetic).", effectiveDate: "2026-12-01" });
  } finally {
    setClock(null);
  }
}
