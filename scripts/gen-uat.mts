/**
 * Generates the user-acceptance-test (UAT) scripts, one per role, from the enforced configuration
 * (catalogue + workspace config) and the synthetic accounts in the local database.
 *
 *   docs/uat/scripts/ROLE_NN_<code>.md    one script per role
 *   docs/uat/UAT_SIGNOFF.md               sign-off register for all 27 roles
 *
 * Run: npm run docs:uat   (needs DATABASE_URL to a local zps_oms_* database with the synthetic seed)
 */
import fs from "node:fs";
import mysql from "mysql2/promise";
import { ROLES, type Permission, type RoleDef } from "../src/server/domain/catalogue.ts";
import { KPI_LABELS, WORKSPACE_CONFIG } from "../src/server/domain/workspace-config.ts";
import { NAV } from "../src/lib/nav.ts";

let url = process.env.DATABASE_URL;
if (!url && fs.existsSync(".env.local")) for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) { const m = l.match(/^DATABASE_URL=(.*)$/); if (m) url = m[1].trim(); }
if (!/\/zps_oms_[a-z0-9_]+$/.test(url ?? "")) throw new Error("DATABASE_URL must point at a local zps_oms_* synthetic database.");
const db = await mysql.createConnection({ uri: url });
const [rows] = await db.query(`SELECT a.role_code, u.username, u.display_name, o.name AS unit FROM role_assignments a JOIN users u ON u.id = a.user_id JOIN org_units o ON o.id = a.org_unit_id
  WHERE a.revoked_at IS NULL AND u.status = 'ACTIVE' AND u.synthetic = 1 ORDER BY u.username`) as unknown as [Array<{ role_code: string; username: string; display_name: string; unit: string }>];
await db.end();

const nn = (n: number) => String(n).padStart(2, "0");
const words = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/24h/, " (24 h)").replace(/30d/, " (30 days)");
const has = (r: RoleDef, p: Permission) => !!r.permissions[p];
// Navigation names come from the application's own navigation (src/lib/nav.ts), filtered by the role's permissions.
const NAV_ITEMS = Object.fromEntries(NAV.flatMap((g) => g.items).map((it) => [it.href, it]));
const holds = (r: RoleDef, any: Permission[]) => any.length === 0 || any.some((p) => has(r, p));

/** Functional steps derived from the role's permissions (what the role must be able to do). */
function functional(r: RoleDef): Array<[string, string]> {
  const s: Array<[string, string]> = [];
  if (has(r, "schedule.manage")) s.push(["Schedule an administrative meeting for your unit (Administrative calendar → Schedule an event); then try a title such as “Patrol planning”.", "The meeting appears in the calendar for your unit and the levels above; the operational title is refused."]);
  else if (has(r, "schedule.view")) s.push(["Open the Administrative calendar.", "Events, review dates and deadlines for your scope only; no option to schedule."]);
  if (has(r, "correspondence.register")) s.push(["Register an incoming letter and attach a small PDF.", "A CORR- reference is generated; the PDF is checked and listed; registering the same letter reference again is refused."]);
  if (has(r, "correspondence.manage")) s.push(["Assign a registered letter to an officer of your unit, then close and file it with a filing reference.", "The officer is notified; only officers of your unit or below are offered; the history shows each step."]);
  if (has(r, "personnel.register")) s.push(["Register a synthetic officer in your unit (Personnel register → Register).", "Record saved as unverified; duplicate service numbers are refused."]);
  if (has(r, "personnel.verify")) s.push(["Verify a record registered by another officer.", "Status becomes verified; you cannot verify a record you registered."]);
  if (has(r, "manpower.create")) s.push(["Raise a manpower request and submit it.", "Request is submitted and appears in the approver's queue; you cannot approve it."]);
  if (has(r, "manpower.contribute")) s.push(["Open Unit contributions, select eligible officers for an open requirement and submit.", "Only eligible officers in your scope can be selected; contribution submitted."]);
  if (has(r, "roster.build")) s.push(["Build a roster version from accepted contributions; print and download Excel.", "Roster built; Excel and PDF downloads work and are audited."]);
  if (has(r, "assignment.propose")) s.push(["Propose a duty-area assignment for an available officer.", "Assignment pending approval; minimum tenure and conflicts are enforced."]);
  if (has(r, "assignment.transfer")) s.push(["Initiate a transfer of an active assignment.", "Refused before minimum tenure unless an approved exception exists."]);
  if (has(r, "request.create")) s.push(["Create and submit an administrative request.", "Request submitted; you cannot approve your own request."]);
  if (has(r, "fleet.manage") || has(r, "maintenance.process")) s.push(["Validate a maintenance request and record its progress.", "Status advances; verification must be done by a different officer."]);
  if (has(r, "stores.manage")) s.push(["Record a receipt, then try to issue more than the balance.", "Receipt updates the balance and ledger; the over-issue is refused."]);
  if (has(r, "stores.requisition")) s.push(["Raise a stores requisition from your own or a higher store and submit it.", "Requisition submitted; you cannot approve or issue it."]);
  if (has(r, "stores.approve")) s.push(["Open a submitted requisition from a unit under you and approve or reject it.", "Decision recorded only if you hold a STORES delegation; otherwise refused."]);
  if (has(r, "user.support")) s.push(["Users & access: issue a temporary password to an account in your unit.", "Password shown once; the user must change it at next sign-in."], ["Open an account outside your unit by URL.", "Not found (existence not disclosed)."]);
  if (has(r, "platform.operate")) s.push(["System health: create a backup, then run a restore drill.", "Backup verified (SHA-256); restore drill passes and the scratch database is removed."]);
  if (has(r, "platform.configure")) s.push(["System health: change an editable setting.", "Setting saved and audited; policy settings cannot be changed here."]);
  if (has(r, "tenant.manage")) s.push(["Tenant management: review tenants and their units.", "Tenants listed; provisioning is audited."]);
  if (has(r, "audit.view")) s.push(["Audit explorer: run chain verification.", "Chain reported intact."]);
  if (has(r, "workflow.configure")) s.push(["Workflow definitions: review approval chains (do not publish unless instructed).", "Versions and levels shown; publishing would apply only to new matters."]);
  if (has(r, "report.export")) s.push(["Open a report, download Excel, then schedule a weekly delivery.", "Workbook opens in Excel; schedule listed under My scheduled deliveries."]);
  else if (has(r, "report.view")) s.push(["Open a report available to you.", "Figures limited to your scope; no export button."]);
  if (has(r, "dashboard.national.view") && !has(r, "personnel.view")) s.push(["Check the national summary figures on the dashboard.", "Aggregate figures shown without links to individual records."]);
  if (!s.length) s.push(["Use each page in your navigation once.", "Each page opens and shows only your own work."]);
  return s;
}

function negative(r: RoleDef): Array<[string, string]> {
  const s: Array<[string, string]> = [];
  if (r.category === "TECHNICAL") s.push(["Open /app/personnel and /app/approvals directly.", "Access-denied page (audited); no business records shown."]);
  if (r.code === "PRINCIPAL_ARMOURER") s.push(["Look for any firearm, ammunition or armoury function.", "None exists; entering such terms in free text is refused."]);
  if (!has(r, "audit.view")) s.push(["Open /app/audit directly.", "Access-denied page."]);
  if (r.tier > 1) s.push(["Open a record from another Division/District by pasting its URL (ask the test lead for one).", "Not found — existence not disclosed."]);
  s.push(["Try to approve or issue something you raised yourself.", "Refused: separation of duties."]);
  return s;
}

const table = (steps: Array<[string, string]>, start: number) => steps.map(([a, e], i) => `| ${start + i} | ${a} | ${e} | ☐ Pass ☐ Fail | |`);

fs.mkdirSync("docs/uat/scripts", { recursive: true });
const signoff = ["# UAT Sign-off Register — 27 Roles", "", "> Generated by `npm run docs:uat`. One row per role; the tester signs only after every step in the role's script passes or has an accepted defect reference.", "",
  "| No. | Role | Script | Tester (rank, name) | Date | Result | Open defects | Signature |", "|--:|---|---|---|---|---|---|---|"];
for (const r of ROLES) {
  const w = WORKSPACE_CONFIG.find((x) => x.role === r.code)!;
  const accounts = rows.filter((x) => x.role_code === r.code);
  const file = `ROLE_${nn(r.no)}_${r.code}.md`;
  const steps: Array<[string, string]> = [
    [`Sign in as ${accounts[0] ? `\`${accounts[0].username}\`` : "the role's account"} with the published development password.`, `Dashboard titled “${r.backOffice}”; heading shows Tier ${r.tier} · Role ${nn(r.no)}.`],
    ["Check the side navigation sections.", `Sections: ${w.nav.map((g) => ({ label: g.label, items: g.items.map((h) => NAV_ITEMS[h]).filter((it) => it && holds(r, it.any)) })).filter((g) => g.items.length).map((g) => `${g.label} (${g.items.map((it) => it.label).join(", ")})`).join("; ")}. No other sections appear.`],
    ["Check the headline figures.", `Tiles for: ${w.kpis.map((k) => KPI_LABELS[k] ?? words(k)).join(", ")} — figures for your scope only.`],
    ["Use each quick action once.", `Quick actions: ${w.quick.map((q) => q.label).join(", ") || "none"} — each opens the right page.`],
    ...functional(r),
    ...negative(r),
    ["Open Help (?) in the top bar.", `“Your workspace: ${r.backOffice}”, with your pages, approval authority, limits and support contact.`],
    ["Open the dashboard on a phone (or a narrow browser window).", "No sideways scrolling; quick actions and tasks appear near the top."],
  ];
  const md = [
    `# UAT Script — Role ${nn(r.no)}: ${r.name}`, "",
    "> Generated from the enforced configuration by `npm run docs:uat`. Synthetic data only — never enter real personnel data.", "",
    `| | |`, `|---|---|`,
    `| Tier | ${r.tier} |`, `| Back office | ${r.backOffice} |`, `| Organisational context | ${r.context} |`, `| Category | ${r.category} |`,
    `| Synthetic account(s) | ${accounts.map((a) => `\`${a.username}\` (${a.unit})`).join("; ") || "—"} |`, "",
    `**Purpose:** ${w.purpose}`, "",
    "| # | Action | Expected result | Result | Notes / defect ref |", "|--:|---|---|---|---|",
    ...table(steps, 1), "",
    "**Tester:** ______________________  **Date:** ____________  **Overall:** ☐ Accepted ☐ Accepted with defects ☐ Rejected", "",
  ];
  fs.writeFileSync(`docs/uat/scripts/${file}`, md.join("\n"));
  signoff.push(`| ${nn(r.no)} | ${r.name} | [${file}](scripts/${file}) | | | | | |`);
}
fs.writeFileSync("docs/uat/UAT_SIGNOFF.md", signoff.join("\n") + "\n");
console.log(`Wrote ${ROLES.length} UAT scripts and the sign-off register.`);
