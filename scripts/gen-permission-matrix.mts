/**
 * Generates, from the catalogue and workspace configuration the server enforces:
 *   docs/generated/PERMISSION_MATRIX.md                         (permission × role grid)
 *   docs/development/USER_ROLE_CATALOGUE.md                     (the 27 roles with scoped permissions)
 *   docs/role-architecture/ROLE_CATALOGUE.md                    (27 roles by tier)
 *   docs/role-architecture/PERMISSION_MATRIX.md                 (functional mapping + grid by tier)
 *   docs/role-architecture/DASHBOARD_CONFIGURATION.md           (back office, navigation, figures, quick actions)
 *   docs/role-architecture/TIER_1/2/3_*_IMPLEMENTATION.md       (per-role implementation detail)
 * Run: npm run docs:permissions
 */
import fs from "node:fs";
import { PERMISSIONS, RETIRED_ROLE_CODES, ROLES, type Coverage, type Permission, type RoleDef } from "../src/server/domain/catalogue.ts";
import { WORKSPACE_CONFIG } from "../src/server/domain/workspace-config.ts";

const perms = Object.keys(PERMISSIONS) as Permission[];
const code = (c?: Coverage) => (c === "NATIONAL" ? "N" : c === "SUBTREE" ? "S" : c ? "U" : "");
const nn = (n: number) => String(n).padStart(2, "0");
const units = (r: RoleDef) => r.assignableTo.join(", ").toLowerCase().replace(/_/g, " ");
const ws = (r: RoleDef) => WORKSPACE_CONFIG.find((w) => w.role === r.code)!;
const legend = "Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.";
const approval = "Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER, ASSIGNMENT or STORES) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority. Technical, functional and audit roles never approve.";
const head = (title: string) => [`# ${title}`, "", "> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.", ""];
const TIERS: Array<[1 | 2 | 3, string]> = [[1, "Tier 1 — National Headquarters"], [2, "Tier 2 — Provincial Divisions and Unit Formations"], [3, "Tier 3 — District Commands and Police Stations"]];
const write = (file: string, lines: string[]) => { fs.mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true }); fs.writeFileSync(file, lines.join("\n") + "\n"); };

function grid(roles: RoleDef[]) {
  const used = perms.filter((p) => roles.some((r) => r.permissions[p]));
  const out = [`| Permission | ${roles.map((r) => `R${nn(r.no)}`).join(" | ")} |`, `|---|${roles.map(() => ":-:").join("|")}|`];
  for (const p of used) out.push(`| \`${p}\` | ${roles.map((r) => code(r.permissions[p])).join(" | ")} |`);
  return out;
}

function roleBlock(r: RoleDef, full: boolean) {
  const w = ws(r);
  const granted = perms.filter((p) => r.permissions[p]);
  const out = [`### Role ${nn(r.no)} — ${r.name}`, ""];
  out.push(`- **Code:** \`${r.code}\` · **Tier:** ${r.tier} · **Category:** ${r.category}`);
  out.push(`- **Back office:** ${r.backOffice}`);
  out.push(`- **Organisational context:** ${r.context} — assignable at: ${units(r)}`);
  out.push(`- **Purpose:** ${r.description}`);
  if (full) {
    out.push(`- **Workspace purpose line:** ${w.purpose}`);
    out.push(`- **Navigation:** ${w.nav.map((g) => `${g.label} (${g.items.map((h) => `\`${h}\``).join(", ")})`).join(" · ")}`);
    out.push(`- **Headline figures:** ${w.kpis.map((k) => `\`${k}\``).join(", ")}`);
    out.push(`- **Quick actions:** ${w.quick.map((q) => q.label).join(", ") || "none"}`);
    out.push(`- **Working panels:** dashboard kind \`${r.dashboard}\``);
  }
  out.push(`- **Permissions (${granted.length}):** ${granted.map((p) => `\`${p}\` (${code(r.permissions[p])})`).join(", ") || "none"}`, "");
  return out;
}

// docs/generated/PERMISSION_MATRIX.md
write("docs/generated/PERMISSION_MATRIX.md", [...head("Generated permission matrix (27 roles)"), legend, "", approval, "", ...grid(ROLES), "",
  "Role numbers: " + ROLES.map((r) => `R${nn(r.no)} ${r.name}`).join(" · ")]);

// docs/development/USER_ROLE_CATALOGUE.md
const cat = [...head("User Role Catalogue (27 roles, three tiers)"),
  "Every role has a unique code and number, a tier, an official back-office name, the organisation unit types it may be assigned at, and scoped action permissions. A user may hold several roles, each at its own unit and validity period, and switches between them (one active context per session).", "",
  legend, "", approval, ""];
for (const [t, title] of TIERS) { cat.push(`## ${title}`, ""); for (const r of ROLES.filter((x) => x.tier === t)) cat.push(...roleBlock(r, false)); }
cat.push("## Retired roles", "", `The previous 41-role catalogue is retired (status RETIRED in \`roles\`; kept for assignment history, never any permission): ${RETIRED_ROLE_CODES.map((c) => `\`${c}\``).join(", ")}. \`COMPANY_COMMANDER\` keeps its code as Role 12.`);
write("docs/development/USER_ROLE_CATALOGUE.md", cat);

// docs/role-architecture/ROLE_CATALOGUE.md
const rc = [...head("Role Catalogue — Three-Tier 27-Role Configuration"),
  "This is the only active role configuration (DEC-049). Roles are not added, removed or renamed without project-owner approval.", "",
  "| No. | Tier | Role | Code | Category | Back office | Assignable at |", "|--:|:-:|---|---|---|---|---|"];
for (const r of ROLES) rc.push(`| ${nn(r.no)} | ${r.tier} | ${r.name} | \`${r.code}\` | ${r.category} | ${r.backOffice} | ${units(r)} |`);
rc.push("", "## Role descriptions", "");
for (const [t, title] of TIERS) { rc.push(`### ${title}`, ""); for (const r of ROLES.filter((x) => x.tier === t)) rc.push(`- **${nn(r.no)} ${r.name}** — ${r.description}`); rc.push(""); }
write("docs/role-architecture/ROLE_CATALOGUE.md", rc);

// docs/role-architecture/PERMISSION_MATRIX.md
const FUNCTIONAL: Array<[string, string]> = [
  ["View role dashboard", "`dashboard.national/division/formation/district/station/unit.view` (live, scoped figures)"],
  ["View aggregate (summary) information only", "`dashboard.national.view` without `personnel.view` → national summary figures, no record links"],
  ["Personnel registry: view / create / correct / verify / export", "`personnel.view` / `personnel.register` / `personnel.edit` / `personnel.verify` (second officer) / `personnel.export` (audited)"],
  ["Manpower requests: originate / review / contribute", "`manpower.create` / `manpower.review` / `manpower.contribute` (+ `manpower.view`)"],
  ["Rosters: build / review / export", "`roster.build` / `roster.review` / `roster.export` (+ `roster.view`)"],
  ["Assignments, transfers, tenure, renewals, disposition", "`assignment.view/propose/transfer/renew/receive`, `disposition.change`, `area.view/manage`"],
  ["Approve or reject", "Not a permission: delegation + BUSINESS role (`policy.approvalUnitFor`)"],
  ["Administrative requests", "`request.view/create/edit/submit/cancel/assign/progress/close/reopen`"],
  ["Motor transport", "`fleet.view/manage`, `maintenance.view/create/process/verify`, `service.record`"],
  ["General assets", "`asset.view/register/custody/inspect/dispose`"],
  ["General stores", "`stores.view` / `stores.manage` (receipts, issues, returns, adjustments) / `stores.requisition` / `stores.approve` (+ STORES delegation)"],
  ["Reports", "`report.view` / `report.export` (audited, field allow-list)"],
  ["Organisation structure", "`org.view` / `org.propose` (approval: ORG_CHANGE delegation)"],
  ["Tenants", "`tenant.view` / `tenant.manage`"],
  ["User accounts and access (HQ)", "`user.view/provision/suspend/deactivate`, `grant.assign/revoke`, `delegation.grant/revoke`, `accessreview.manage`"],
  ["Scoped technical account support", "`user.view` + `user.support` (temporary password, unlock, end sessions) within scope"],
  ["System health / technical operations / configuration", "`health.view` / `platform.view` + `platform.operate` / `platform.configure`"],
  ["Security monitoring", "`security.view`"],
  ["Audit oversight", "`audit.view` / `audit.export`"],
  ["Workflow configuration", "`workflow.view` / `workflow.configure`"],
];
const pm = [...head("Permission Matrix — 27 Roles"), legend, "", approval, "", "## Directive functions mapped to enforced permissions", "",
  "| Function in the directive | Enforced permission(s) |", "|---|---|", ...FUNCTIONAL.map(([a, b]) => `| ${a} | ${b} |`), ""];
for (const [t, title] of TIERS) pm.push(`## ${title}`, "", ...grid(ROLES.filter((r) => r.tier === t)), "", ROLES.filter((r) => r.tier === t).map((r) => `R${nn(r.no)} ${r.name}`).join(" · "), "");
write("docs/role-architecture/PERMISSION_MATRIX.md", pm);

// docs/role-architecture/DASHBOARD_CONFIGURATION.md
const dc = [...head("Dashboard and Workspace Configuration"),
  "One architecture, 27 configurations. `src/server/domain/workspace-config.ts` holds, per role: back-office name, purpose line, navigation sections (order and labels), headline figures (live, scoped — `overview.ts`) and quick actions. The layout renders the navigation of the **active context** and filters every entry by permission; pages and domain functions re-check on the server.", "",
  "| No. | Back office | Navigation sections | Headline figures | Quick actions | Working panels |", "|--:|---|---|---|---|---|"];
for (const r of ROLES) { const w = ws(r); dc.push(`| ${nn(r.no)} | ${r.backOffice} | ${w.nav.map((g) => g.label).join(" · ")} | ${w.kpis.join(", ")} | ${w.quick.map((q) => q.label).join(", ")} | \`${r.dashboard}\` |`); }
write("docs/role-architecture/DASHBOARD_CONFIGURATION.md", dc);

// Tier implementation documents
const TIER_FILES: Record<number, [string, string, string]> = {
  1: ["TIER_1_HEADQUARTERS_IMPLEMENTATION.md", "Tier 1 Implementation — National Headquarters", "Six roles held at Service Headquarters. NATIONAL coverage applies only to assignments at HQ. Superadmin and HQ Tech are TECHNICAL (no personnel records, no approvals); the Inspector General sees national summaries and audit evidence, not individual records; DIG Operations, the Commissioner and the Deputy Commissioner work the national Operations processes and decide only within delegations."],
  2: ["TIER_2_DIVISION_AND_FORMATION_IMPLEMENTATION.md", "Tier 2 Implementation — Provincial Divisions and Unit Formations", "Eleven roles held at a Provincial Division or Unit Formation (Company Commander at a company; Section Head at a section, platoon, detachment or department). SUBTREE coverage reaches every subordinate unit and never a sibling Division or Formation. Role 16 (Principal Armourer) is a non-sensitive administrative workspace only."],
  3: ["TIER_3_DISTRICT_AND_STATION_IMPLEMENTATION.md", "Tier 3 Implementation — District Commands and Police Stations", "Ten roles held at a District Command or a Police Station (station roles may also be assigned at a Police Post). Scope never extends to another District or Station. The station and district stores roles keep general consumables only."],
};
for (const [t] of TIERS) {
  const [file, title, intro] = TIER_FILES[t];
  const out = [...head(title), intro, "", "Status, tests and evidence per role: `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and `docs/role-architecture/ROLE_TEST_RESULTS.md`.", ""];
  for (const r of ROLES.filter((x) => x.tier === t)) out.push(...roleBlock(r, true));
  write(`docs/role-architecture/${file}`, out);
}
console.log(`Wrote role documentation (${perms.length} permissions × ${ROLES.length} roles).`);
