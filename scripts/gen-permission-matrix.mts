/**
 * Generates docs/generated/PERMISSION_MATRIX.md from the catalogue the server enforces.
 * Run: node --experimental-strip-types scripts/gen-permission-matrix.mts
 */
import fs from "node:fs";
import { PERMISSIONS, ROLES, type Permission } from "../src/server/domain/catalogue.ts";

const perms = Object.keys(PERMISSIONS) as Permission[];
const lines: string[] = [];
lines.push("# Generated permission matrix", "");
lines.push("> Generated from `src/server/domain/catalogue.ts` — the same catalogue the server enforces. Do not edit by hand.", "");
lines.push("Legend: **U** = own assigned organisation unit only · **N** = national (only when the assignment is held at Service HQ) · blank = denied.", "");
lines.push("Approval authority is not a role permission: it requires an active delegation record **and** an active BUSINESS-category role at the same organisation unit (`policy.canApprove`).", "");
lines.push(`| Permission | ${ROLES.map((r) => r.name).join(" | ")} |`);
lines.push(`|---|${ROLES.map(() => ":-:").join("|")}|`);
for (const p of perms) {
  lines.push(`| \`${p}\` — ${PERMISSIONS[p]} | ${ROLES.map((r) => (r.permissions[p] === "NATIONAL" ? "N" : r.permissions[p] ? "U" : "")).join(" | ")} |`);
}
lines.push("", "## Role catalogue", "");
lines.push("| Code | Name | Category | Dashboard | Assignable at | Time-limited | Description |", "|---|---|---|---|---|---|---|");
for (const r of ROLES) {
  lines.push(`| \`${r.code}\` | ${r.name} | ${r.category} | ${r.dashboardTitle} | ${r.assignableTo.join(", ")} | ${r.requiresExpiry ? "Yes (≤180 days)" : "No"} | ${r.description} |`);
}
fs.mkdirSync("docs/generated", { recursive: true });
fs.writeFileSync("docs/generated/PERMISSION_MATRIX.md", lines.join("\n") + "\n");
console.log(`Wrote docs/generated/PERMISSION_MATRIX.md (${perms.length} permissions × ${ROLES.length} roles)`);
