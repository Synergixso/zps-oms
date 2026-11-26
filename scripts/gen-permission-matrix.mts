/**
 * Generates, from the catalogue the server enforces:
 *   docs/generated/PERMISSION_MATRIX.md       (permission × role grid)
 *   docs/development/USER_ROLE_CATALOGUE.md   (the 41 roles, grouped by level, with scoped permissions)
 * Run: npm run docs:permissions
 */
import fs from "node:fs";
import { PERMISSIONS, ROLES, type Coverage, type Permission, type RoleLevel } from "../src/server/domain/catalogue.ts";

const perms = Object.keys(PERMISSIONS) as Permission[];
const code = (c?: Coverage) => (c === "NATIONAL" ? "N" : c === "SUBTREE" ? "S" : c ? "U" : "");
const legend = "Legend: **U** = assigned unit only · **S** = assigned unit and every subordinate unit · **N** = national (only when the assignment is held at Service HQ; otherwise treated as S) · blank = denied.";
const approval = "Approval authority is never a role permission: it needs an active delegation (domain ADMIN_REQUEST, MAINTENANCE, ORG_CHANGE, MANPOWER or ASSIGNMENT) at the record's unit or an ancestor **and** a BUSINESS-category role at that delegating unit (`policy.approvalUnitFor` / `policy.canApprove`). Rank never confers authority.";

const m: string[] = ["# Generated permission matrix", "", "> Generated from `src/server/domain/catalogue.ts`. Do not edit by hand.", "", legend, "", approval, ""];
m.push(`| Permission | ${ROLES.map((r) => `R${String(r.no).padStart(2, "0")}`).join(" | ")} |`);
m.push(`|---|${ROLES.map(() => ":-:").join("|")}|`);
for (const p of perms) m.push(`| \`${p}\` | ${ROLES.map((r) => code(r.permissions[p])).join(" | ")} |`);
m.push("", "Role numbers: " + ROLES.map((r) => `R${String(r.no).padStart(2, "0")} ${r.name}`).join(" · "), "");
fs.mkdirSync("docs/generated", { recursive: true });
fs.writeFileSync("docs/generated/PERMISSION_MATRIX.md", m.join("\n"));

const LEVELS: Array<[RoleLevel, string]> = [
  ["NATIONAL", "National Headquarters"], ["PROVINCIAL", "Provincial level"], ["DISTRICT", "District level"], ["STATION", "Police Station level"],
  ["POST", "Police Post level"], ["FORMATION", "Divisional formations"], ["FUNCTIONAL", "Specialist and functional roles"],
];
const c: string[] = [
  "# User Role Catalogue (41 roles)", "",
  "> Generated from `src/server/domain/catalogue.ts` — the catalogue the server enforces and synchronises to the `roles` / `role_permissions` tables at start-up. Do not edit by hand; run `npm run docs:permissions`.", "",
  "Every role has a unique code, official name, category, workspace (dashboard), the organisation unit types it may be assigned at, and scoped action permissions. A user may hold several roles, each at its own unit and with its own validity period.", "",
  legend, "", approval, "",
];
for (const [lvl, title] of LEVELS) {
  c.push(`## ${title}`, "");
  for (const r of ROLES.filter((x) => x.level === lvl).sort((a, b) => a.no - b.no)) {
    const granted = perms.filter((p) => r.permissions[p]);
    c.push(`### Role ${String(r.no).padStart(2, "0")} — ${r.name}`, "");
    c.push(`- **Code:** \`${r.code}\` · **Category:** ${r.category}${r.requiresExpiry ? " · **Time-limited assignment**" : ""}`);
    c.push(`- **Workspace:** ${r.dashboardTitle}`);
    c.push(`- **Assignable at:** ${r.assignableTo.join(", ").toLowerCase().replace(/_/g, " ")}`);
    c.push(`- **Purpose:** ${r.description}`);
    c.push(`- **Permissions (${granted.length}):** ${granted.map((p) => `\`${p}\` (${code(r.permissions[p])})`).join(", ") || "none"}`, "");
  }
}
fs.mkdirSync("docs/development", { recursive: true });
fs.writeFileSync("docs/development/USER_ROLE_CATALOGUE.md", c.join("\n"));
console.log(`Wrote docs/generated/PERMISSION_MATRIX.md and docs/development/USER_ROLE_CATALOGUE.md (${perms.length} permissions × ${ROLES.length} roles)`);
