/**
 * Synthetic seed data. EVERYTHING here is fabricated for demonstration.
 * - Organisation names follow the user-supplied scope list and are flagged
 *   as provisional pending validation against the approved establishment.
 * - User names are obviously fictitious ("Demo …"); no ranks, service
 *   numbers or real identities are used.
 * - Vehicle and asset references use SYN- prefixes and cannot be real.
 */
import type { DB } from "./connection";
import { HQ_NAME } from "./schema";
import { run } from "./connection";
import { ASSET_CATEGORIES, REQUEST_CATEGORIES, ROLES, type RoleCode } from "../domain/catalogue";
import { setClock } from "../domain/core";
import { HQ_ID, loadActor } from "../domain/policy";
import { createDraft, performAction, type RequestAction } from "../domain/requests";
import { createMaintenance, maintenanceAction, type MaintAction } from "../domain/fleet";
import { assetAction } from "../domain/assets";
import { audit } from "../domain/audit";
import { proposeChange } from "../domain/org";
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
  ["u_dig", "demo.dig.exec", "Demo DIG Ops Executive", "DIG Operations (synthetic)", [["DIG_OPS_EXECUTIVE", HQ_ID]]],
  ["u_hqc", "demo.hq.coord", "Demo HQ Operations Coordinator", "HQ Operations Coordinator (synthetic)", [["HQ_OPS_COORDINATOR", HQ_ID]]],
  ["u_lsk_cmd", "demo.lsk.commander", "Demo Lusaka Division Commander", "Provincial Division Commander (synthetic)", [["PROVINCIAL_COMMANDER", "org_lsk"]]],
  ["u_lsk_sops", "demo.lsk.staffops", "Demo Lusaka Division Staff Ops", "Division Staff Ops (synthetic)", [["DIVISION_STAFF_OPS", "org_lsk"]]],
  ["u_cb_cmd", "demo.cb.commander", "Demo Copperbelt Division Commander", "Provincial Division Commander (synthetic)", [["PROVINCIAL_COMMANDER", "org_cb"]]],
  ["u_cb_sops", "demo.cb.staffops", "Demo Copperbelt Division Staff Ops", "Division Staff Ops (synthetic)", [["DIVISION_STAFF_OPS", "org_cb"]]],
  ["u_cen_sops", "demo.cen.staffops", "Demo Central Division Staff Ops", "Division Staff Ops (synthetic)", [["DIVISION_STAFF_OPS", "org_cen"]]],
  ["u_cen_cmd", "demo.cen.commander", "Demo Central Division Commander", "Provincial Division Commander (synthetic)", [["PROVINCIAL_COMMANDER", "org_cen"]]],
  ["u_mu_cmd", "demo.mu.commander", "Demo Mobile Unit Formation Commander", "Formation Commander (synthetic)", [["FORMATION_COMMANDER", "org_mu"]]],
  ["u_mu_adm", "demo.mu.admin", "Demo Mobile Unit Admin Officer", "Formation Administrative Officer (synthetic)", [["FORMATION_ADMIN_OFFICER", "org_mu"]]],
  ["u_ap_adm", "demo.ap.admin", "Demo Airport Division Admin Officer", "Formation Administrative Officer (synthetic)", [["FORMATION_ADMIN_OFFICER", "org_ap"]]],
  ["u_fleet", "demo.fleet.officer", "Demo Fleet Officer", "Fleet Officer (synthetic)", [["FLEET_OFFICER", "org_lsk"], ["FLEET_OFFICER", "org_mu"]]],
  ["u_fleet2", "demo.fleet.verifier", "Demo Fleet Verification Officer", "Fleet Officer (synthetic)", [["FLEET_OFFICER", "org_lsk"]]],
  ["u_asset", "demo.asset.custodian", "Demo Asset Custodian (Lusaka)", "General Asset Custodian (synthetic)", [["ASSET_CUSTODIAN", "org_lsk"]]],
  ["u_asset_cb", "demo.asset.cb", "Demo Asset Custodian (Copperbelt)", "General Asset Custodian (synthetic)", [["ASSET_CUSTODIAN", "org_cb"]]],
  ["u_audit", "demo.auditor", "Demo Internal Auditor", "Internal Auditor (synthetic)", [["INTERNAL_AUDITOR", HQ_ID, "2027-03-31T23:59:59.000Z"]]],
  ["u_plat", "demo.platform.admin", "Demo Platform Administrator", "Platform Administrator (synthetic)", [["PLATFORM_ADMIN", HQ_ID]]],
  ["u_sec", "demo.security.admin", "Demo Security Administrator", "Security Administrator (synthetic)", [["SECURITY_ADMIN", HQ_ID]]],
  ["u_org", "demo.org.registry", "Demo Organisation Registry Administrator", "Organisational Registry Administrator (synthetic)", [["ORG_REGISTRY_ADMIN", HQ_ID]]],
  ["u_staff", "demo.cen.staff", "Demo Authorised Operations Staff (Central)", "Authorised Operations Staff (synthetic)", [["OPERATIONS_STAFF", "org_cen"]]],
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

export function seedDatabase(db: DB) {
  const t = new Date().toISOString();
  const ins = (sql: string, ...p: unknown[]) => run(db, sql, ...p);

  // Organisations ---------------------------------------------------------
  ins(`INSERT INTO org_units (id, code, name, short_name, unit_type, status, effective_from, approval_ref, validation_note, created_at)
       VALUES (?,?,?,?, 'SERVICE_HQ', 'ACTIVE', ?, NULL, ?, ?)`,
    HQ_ID, "HQ-DIGOPS", HQ_NAME, "DIG Operations HQ", BASE,
    "Root scope for national administration. Intermediate HQ supervisory positions are not modelled pending establishment confirmation (DEC-004).", t);
  for (const [id, code, name] of PROVINCES) {
    ins(`INSERT INTO org_units (id, code, name, unit_type, status, effective_from, validation_note, created_at) VALUES (?,?,?, 'PROVINCIAL_DIVISION', 'ACTIVE', ?,?,?)`, id, code, name, BASE, PROVISIONAL, t);
    ins(`INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?, 'REPORTS_TO', ?, 'SYN-BASELINE', ?)`, `rel_${id}`, id, HQ_ID, BASE, t);
  }
  for (const [id, code, name] of FORMATIONS) {
    ins(`INSERT INTO org_units (id, code, name, unit_type, status, effective_from, validation_note, created_at) VALUES (?,?,?, 'FORMATION', 'ACTIVE', ?,?,?)`, id, code, name, BASE, PROVISIONAL, t);
    ins(`INSERT INTO org_relationships (id, child_id, parent_id, relationship, effective_from, approval_ref, created_at) VALUES (?,?,?, 'ADMINISTERED_BY', ?, 'SYN-BASELINE', ?)`, `rel_${id}`, id, HQ_ID, BASE, t);
  }

  // Roles and permissions --------------------------------------------------
  for (const r of ROLES) {
    ins("INSERT INTO roles (code, name, description, category, requires_expiry) VALUES (?,?,?,?,?)", r.code, r.name, r.description, r.category, r.requiresExpiry ? 1 : 0);
    for (const [perm, cov] of Object.entries(r.permissions)) ins("INSERT INTO role_permissions (role_code, permission, coverage) VALUES (?,?,?)", r.code, perm, cov);
  }

  // Users, assignments, delegations ---------------------------------------
  for (const [id, username, name, title, grants] of SEED_USERS) {
    ins("INSERT INTO users (id, username, display_name, position_title, status, created_at) VALUES (?,?,?,?, 'ACTIVE', ?)", id, username, name, title, BASE + "T08:00:00.000Z");
    grants.forEach(([role, org, validTo], i) =>
      ins(`INSERT INTO role_assignments (id, user_id, role_code, org_unit_id, valid_from, valid_to, justification, granted_by, created_at) VALUES (?,?,?,?,?,?,?, NULL, ?)`,
        `asg_${id}_${i}`, id, role, org, BASE + "T08:00:00.000Z", validTo ?? null, "Synthetic baseline assignment for demonstration (SYN-BASELINE).", t));
  }
  DELEGATIONS.forEach(([u, org, domain], i) =>
    ins(`INSERT INTO delegations (id, user_id, org_unit_id, domain, valid_from, approval_ref, created_at) VALUES (?,?,?,?,?,?,?)`,
      `dlg_seed_${i}`, u, org, domain, BASE + "T08:00:00.000Z", `SYN-DELEG-${String(i + 1).padStart(3, "0")}`, t));

  // Reference data ---------------------------------------------------------
  for (const c of REQUEST_CATEGORIES) ins("INSERT INTO request_categories (code, name, description) VALUES (?,?,?)", c.code, c.name, c.description);
  for (const c of REQUEST_CATEGORIES) {
    const steps = c.code === "ADMIN_RETURN"
      ? [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }, { level: 2, approverScope: "HQ", label: "National HQ approval" }]
      : [{ level: 1, approverScope: "ORIGIN", label: "Originating organisation approval" }];
    ins("INSERT INTO workflow_definitions (id, category_code, version, approval_steps, status, note, created_at) VALUES (?,?,1,?, 'ACTIVE', ?, ?)",
      `wf_${c.code.toLowerCase()}_v1`, c.code, JSON.stringify(steps), "Demonstration-only routing. Not an approved ZPS delegation matrix (DEC-008).", t);
  }
  for (const c of ASSET_CATEGORIES) ins("INSERT INTO asset_categories (code, name, allowed) VALUES (?,?,1)", c.code, c.name);
  for (const r of REPORTS) ins("INSERT INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
    r.code, r.name, r.description, "report.view", JSON.stringify(r.fields), "Report owner to be nominated by the Service (DEC-012).");
  ins("INSERT INTO report_definitions (code, name, description, permission, fields, owner_note) VALUES (?,?,?,?,?,?)",
    "AUDIT_EVIDENCE", "Audit evidence export", "Filtered audit events for authorised audit evidence.", "audit.export",
    JSON.stringify(["seq", "occurred_at", "actor_name", "action", "outcome", "category", "entity_type", "entity_id", "org_name", "details", "hash"]), "Internal Audit (to be confirmed).");
  ins("INSERT INTO app_settings (key, value, description) VALUES (?,?,?)", "maintenance.approval_threshold_zmw", "5000", "Synthetic threshold above which maintenance needs delegated approval (provisional).");
  ins("INSERT INTO app_settings (key, value, description) VALUES (?,?,?)", "request.sla_days", "10", "Days after submission before a request is flagged overdue (provisional).");
  ins("INSERT INTO app_settings (key, value, description) VALUES (?,?,?)", "integrations.external_notifications", "DISABLED", "Email/SMS/WhatsApp providers are disabled until approved (DEC-013).");
  ins("INSERT INTO app_settings (key, value, description) VALUES (?,?,?)", "environment.label", "LOCAL SYNTHETIC PROTOTYPE", "Displayed on every screen.");

  // Fleet -------------------------------------------------------------------
  const makes = [["Toyota", "Land Cruiser", "Utility (light)"], ["Toyota", "Hilux", "Utility (light)"], ["Nissan", "Navara", "Utility (light)"], ["Toyota", "Corolla", "Saloon"], ["Toyota", "Hiace", "Minibus"], ["Isuzu", "NPR", "Truck (general)"], ["Ford", "Ranger", "Utility (light)"], ["Mitsubishi", "Pajero", "Station wagon"]];
  const fleetOrgs = ["org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_cb", "org_cb", "org_cb", "org_cb", "org_cen", "org_cen", "org_sth", "org_est", "org_mu", "org_mu", "org_mu", "org_ap", "org_ap", HQ_ID, HQ_ID, "org_nw", "org_wst", "org_taz"];
  fleetOrgs.forEach((org, i) => {
    const [make, model, cls] = makes[i % makes.length];
    const due = new Date(Date.parse("2026-08-01") + i * 9 * 86400000).toISOString().slice(0, 10);
    const lic = new Date(Date.parse("2026-12-01") + i * 17 * 86400000).toISOString().slice(0, 10);
    ins(`INSERT INTO vehicles (id, fleet_ref, registration_ref, make, model, vehicle_class, custody_org_id, status, next_service_due, licence_expiry, insurance_expiry, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?, ?, ?,?,?,?,?)`,
      `veh_${i + 1}`, `SYN-FLT-${String(1001 + i)}`, `SYN-REG-${(0x1a2b + i * 37).toString(16).toUpperCase()}`, make, model, cls, org,
      i === 22 ? "AWAITING_DISPOSAL" : "IN_SERVICE", due, lic, lic, t, t);
  });

  // Assets ----------------------------------------------------------------
  const assetDefs: Array<[string, string, string]> = [
    ["OFFICE_FURNITURE", "Office desk, steel frame", "GOOD"], ["OFFICE_FURNITURE", "Filing cabinet, 4-drawer", "FAIR"],
    ["OFFICE_FURNITURE", "Conference table", "GOOD"], ["ICT_PERIPHERAL", "Desktop printer (mono laser)", "GOOD"],
    ["ICT_PERIPHERAL", "Document scanner", "NEW"], ["ICT_PERIPHERAL", "Desktop monitor 24-inch", "GOOD"],
    ["OFFICE_EQUIPMENT", "Photocopier, floor standing", "FAIR"], ["OFFICE_EQUIPMENT", "Paper shredder", "POOR"],
    ["OFFICE_EQUIPMENT", "Projector (meeting room)", "GOOD"], ["GENERAL_STORES", "Office chairs (set of 6)", "GOOD"],
  ];
  const assetOrgs = ["org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_lsk", "org_cb", "org_cb", "org_cb", "org_cb", "org_cen", "org_cen", "org_mu", "org_mu", "org_mu", "org_ap", "org_ap", HQ_ID, HQ_ID, HQ_ID, "org_sth", "org_est", "org_nth"];
  assetOrgs.forEach((org, i) => {
    const [cat, desc, cond] = assetDefs[i % assetDefs.length];
    const inspected = i % 3 === 0 ? null : new Date(Date.parse("2025-06-01") + i * 23 * 86400000).toISOString();
    ins(`INSERT INTO assets (id, asset_tag, category_code, description, condition, status, custody_org_id, custodian_ref, last_inspected_at, created_at, updated_at)
         VALUES (?,?,?,?,?, 'IN_STORE', ?, NULL, ?, ?, ?)`, `ast_${i + 1}`, `SYN-AST-${String(10001 + i)}`, cat, desc, cond, org, inspected, t, t);
    ins("INSERT INTO asset_events (id, asset_id, event_type, actor_id, after_state, note, created_at) VALUES (?,?,?,?,?,?,?)",
      `ase_seed_${i}`, `ast_${i + 1}`, "REGISTER", "u_plat", JSON.stringify({ status: "IN_STORE", condition: cond }), "Synthetic baseline registration", BASE + "T09:00:00.000Z");
  });

  audit(db, { actorId: null, action: "system.seed", category: "CONFIG", details: { note: "Synthetic demonstration dataset loaded" } });
  seedScenarios(db);
}

/** Drives the real domain services with a back-dated clock so history, notifications and audit are consistent. */
function seedScenarios(db: DB) {
  const A = (id: string) => loadActor(db, id)!;
  const at = (iso: string) => setClock(() => new Date(iso));
  const day = (n: number, h = 9) => new Date(Date.parse("2026-10-01T00:00:00Z") + n * 86400000 + h * 3600000).toISOString();
  try {
    type Step = [user: string, action: RequestAction, reason?: string];
    const scenario = (author: string, origin: string | undefined, cat: string, title: string, details: string, start: number, steps: Step[]) => {
      at(day(start));
      const r = createDraft(db, A(author), { categoryCode: cat, title, details, priority: "ROUTINE", originOrgId: origin });
      steps.forEach(([u, act, reason], i) => {
        at(day(start + i + 1, 10 + i));
        performAction(db, A(u), r.id, act, { reason });
      });
      return r.id;
    };
    const lsk = "org_lsk";
    scenario("u_lsk_sops", lsk, "OFFICE_SUPPLIES", "Quarterly stationery replenishment", "Routine replenishment of registry stationery for the divisional administration office (synthetic).", 2,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_lsk_sops", "START"], ["u_lsk_sops", "COMPLETE"], ["u_lsk_cmd", "CLOSE"]]);
    scenario("u_lsk_sops", lsk, "FACILITY_REPAIR", "Registry office door lock repair", "Replace a faulty door lock at the divisional registry office (synthetic example).", 20,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_lsk_sops", "START"]]);
    scenario("u_lsk_sops", lsk, "ICT_SUPPORT", "Replacement keyboard and mouse sets", "Two keyboard and mouse sets for the administration office are unserviceable (synthetic).", 40,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "RETURN", "Please attach the asset tags of the unserviceable items."]]);
    scenario("u_lsk_sops", lsk, "ADMIN_RETURN", "Monthly administrative return — October", "Submission of the routine monthly administrative return to national HQ (synthetic).", 44,
      [["u_lsk_sops", "SUBMIT"], ["u_lsk_cmd", "ASSIGN"], ["u_lsk_cmd", "APPROVE"], ["u_dig", "APPROVE"]]);
    scenario("u_lsk_sops", lsk, "OFFICE_SUPPLIES", "Toner cartridges for divisional printers", "Toner cartridges for two office printers in the divisional administration block (synthetic).", 46,
      [["u_lsk_sops", "SUBMIT"]]);
    scenario("u_lsk_sops", lsk, "FACILITY_REPAIR", "Office window glazing replacement", "Draft: cracked glazing in the administration corridor (synthetic).", 54, []);
    scenario("u_cb_sops", "org_cb", "OFFICE_SUPPLIES", "Copperbelt registry consumables", "Routine registry consumables for the Copperbelt divisional office (synthetic).", 10,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"], ["u_cb_cmd", "APPROVE"], ["u_cb_sops", "START"], ["u_cb_sops", "COMPLETE"]]);
    scenario("u_cb_sops", "org_cb", "FACILITY_REPAIR", "Meeting room air-conditioner service", "Air-conditioning unit in the meeting room requires servicing (synthetic).", 30,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"]]);
    scenario("u_cb_sops", "org_cb", "ADMIN_RETURN", "Monthly administrative return — October (Copperbelt)", "Routine monthly administrative return (synthetic).", 45,
      [["u_cb_sops", "SUBMIT"], ["u_cb_cmd", "ASSIGN"], ["u_cb_cmd", "APPROVE"]]);
    scenario("u_cen_sops", "org_cen", "ICT_SUPPORT", "Network printer configuration", "Office network printer requires reconfiguration by ICT support (synthetic).", 25,
      [["u_cen_sops", "SUBMIT"], ["u_cen_cmd", "ASSIGN"], ["u_cen_cmd", "REJECT", "Handled through the existing ICT helpdesk channel."]]);
    scenario("u_staff", "org_cen", "OFFICE_SUPPLIES", "Envelopes and file folders", "Envelopes and file folders for the Central divisional registry (synthetic).", 50,
      [["u_staff", "SUBMIT"]]);
    scenario("u_mu_adm", "org_mu", "FACILITY_REPAIR", "Administration block roof gutter repair", "Gutter repair at the formation administration block (synthetic).", 15,
      [["u_mu_adm", "SUBMIT"], ["u_mu_cmd", "ASSIGN"], ["u_mu_cmd", "APPROVE"], ["u_mu_adm", "START"], ["u_mu_adm", "COMPLETE"]]);
    scenario("u_mu_adm", "org_mu", "OFFICE_SUPPLIES", "Formation registry stationery", "Routine stationery for the formation registry (synthetic).", 48,
      [["u_mu_adm", "SUBMIT"], ["u_mu_cmd", "ASSIGN"]]);
    scenario("u_ap_adm", "org_ap", "ICT_SUPPORT", "Office UPS battery replacement", "Replace UPS batteries for administration desktops (synthetic).", 35,
      [["u_ap_adm", "SUBMIT"]]);
    scenario("u_hqc", undefined, "ADMIN_RETURN", "National consolidated administrative summary — Q3", "Consolidation of divisional administrative returns for national management (synthetic).", 38,
      [["u_hqc", "SUBMIT"], ["u_hqc", "ASSIGN"]]);
    scenario("u_hqc", undefined, "OFFICE_SUPPLIES", "Duplicate stationery request", "Raised in error; duplicate of an existing request (synthetic).", 12,
      [["u_hqc", "SUBMIT"], ["u_hqc", "CANCEL", "Duplicate of an existing request."]]);

    // Maintenance lifecycle examples
    type MStep = [string, MaintAction, { note?: string; workshopRef?: string; costRef?: string }?];
    const maint = (user: string, vehicle: string, type: string, desc: string, cost: number, start: number, steps: MStep[]) => {
      at(day(start));
      const m = createMaintenance(db, A(user), { vehicleId: vehicle, serviceType: type, description: desc, estimatedCost: cost });
      steps.forEach(([u, act, inp], i) => {
        at(day(start + i + 1, 11));
        maintenanceAction(db, A(u), m.id, act, inp ?? {});
      });
    };
    maint("u_lsk_sops", "veh_1", "Routine service", "Scheduled routine service at 6-month interval (synthetic).", 2500, 3,
      [["u_fleet", "VALIDATE"], ["u_fleet", "REFER", { workshopRef: "SYN-WS-0101" }], ["u_fleet", "START"], ["u_fleet", "SUBMIT_COMPLETION", { note: "Service completed per checklist." }], ["u_fleet2", "VERIFY", { costRef: "SYN-INV-5501" }]]);
    maint("u_fleet", "veh_2", "Brake and tyre check", "Brake pads worn; tyre replacement advised (synthetic).", 8200, 41,
      [["u_fleet", "VALIDATE"], ["u_lsk_cmd", "APPROVE"], ["u_fleet", "REFER", { workshopRef: "SYN-WS-0102" }], ["u_fleet", "START"]]);
    maint("u_fleet", "veh_3", "Electrical fault", "Intermittent dashboard warning light (synthetic).", 1200, 50, []);
    maint("u_mu_adm", "veh_15", "Engine repair", "Engine overheating reported (synthetic).", 15000, 47, [["u_fleet", "VALIDATE"]]);

    // Asset events
    at(day(5));
    assetAction(db, A("u_asset"), "ast_1", "ISSUE", { custodianRef: "Divisional Registry Office" });
    at(day(6));
    assetAction(db, A("u_asset"), "ast_2", "INSPECT", { condition: "FAIR", note: "Drawer runner stiff (synthetic)." });
    at(day(28));
    assetAction(db, A("u_asset"), "ast_4", "TRANSFER", { toOrgId: "org_cb", reference: "SYN-TRF-0007" });
    at(day(29));
    assetAction(db, A("u_asset"), "ast_7", "SEND_REPAIR", { note: "Paper feed fault (synthetic)." });

    // Pending organisational change
    at(day(52));
    proposeChange(db, A("u_org"), { changeType: "RENAME_UNIT", targetId: "org_cpss", name: "Crime Prevention and Support Services Directorate", reason: "Align display name with public DIG Ops page wording; requires validation (synthetic).", effectiveDate: "2026-12-01" });
  } finally {
    setClock(null);
  }
}
