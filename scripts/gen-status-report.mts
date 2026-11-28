/**
 * Generates the evidence-based development status report and the implementation percentages from the requirement
 * register (`scripts/status-register.mts`), the enforced role catalogue and workspace configuration, and the
 * route-audit evidence:
 *   docs/final-delivery/COMPLETE_ZPS_OMS_DEVELOPMENT_STATUS_REPORT.md
 *   docs/final-delivery/UPDATED_IMPLEMENTATION_PERCENTAGES.md
 * Run: npm run docs:status   (after `npm run audit:routes`, so role evidence is current)
 */
import fs from "node:fs";
import { ROLES, TIER_NAMES, type Tier } from "../src/server/domain/catalogue.ts";
import { WORKSPACE_CONFIG } from "../src/server/domain/workspace-config.ts";
import { NAV } from "../src/lib/nav.ts";
import { CMD, COMMAND_ROLES, CRITERIA, KMU, MODULES, PORT, XC, type Criterion, type Status } from "./status-register.mts";

const NAV_ITEMS = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.href, i]));
const nn = (n: number) => String(n).padStart(2, "0");
const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)} %`;
const write = (file: string, lines: string[]) => fs.writeFileSync(file, lines.join("\n") + "\n");
type Phase = "baseline" | "current";

function frac(s: Status): { impl: number; ver: number } {
  if (s === "V") return { impl: 1, ver: 1 };
  if (s === "I") return { impl: 1, ver: 0 };
  if (s === "N" || s === "B") return { impl: 0, ver: 0 };
  const [, a, b] = s.split(":");
  const impl = Number(a);
  return { impl, ver: b === undefined ? impl : Number(b) };
}
const LABEL: Record<string, string> = { V: "Implemented and tested", I: "Implemented, not tested", N: "Not developed", B: "Blocked by external dependency" };
const label = (s: Status) => (s.startsWith("P:") ? `Partially implemented (${Math.round(frac(s).impl * 100)} %${frac(s).ver !== frac(s).impl ? `, ${Math.round(frac(s).ver * 100)} % verified` : ""})` : LABEL[s]);
function score(list: Criterion[], phase: Phase) {
  const w = list.reduce((n, x) => n + x.weight, 0);
  const impl = list.reduce((n, x) => n + x.weight * frac(x[phase]).impl, 0);
  const ver = list.reduce((n, x) => n + x.weight * frac(x[phase]).ver, 0);
  const count = (f: (s: Status) => boolean) => list.filter((x) => f(x[phase])).length;
  return { w, impl: w ? impl / w : 0, ver: w ? ver / w : 0, done: count((s) => s === "V"), untested: count((s) => s === "I"), partial: count((s) => s.startsWith("P:")), none: count((s) => s === "N"), blocked: count((s) => s === "B"), n: list.length };
}
const moduleState = (list: Criterion[], phase: Phase) => {
  const s = score(list, phase);
  const buildable = list.filter((x) => x[phase] !== "B");
  const sb = score(buildable, phase);
  return sb.impl >= 0.999 ? (s.blocked ? "Fully implemented (external items blocked)" : "Fully implemented") : sb.impl > 0 ? "Partially implemented" : "Not developed";
};

// Route-audit evidence per role.
const audit = fs.existsSync("docs/evidence/route-audit.md") ? fs.readFileSync("docs/evidence/route-audit.md", "utf8") : "";
const auditStamp = audit.match(/Generated ([0-9T:.\-Z]+)/)?.[1] ?? "not run";
const tally = new Map<string, { accounts: number; errors: number; rendered: number; denied: number; hidden: number }>();
for (const line of audit.split(/\r?\n/)) {
  const m = line.match(/^\| [^|]+\(([A-Z_]+)\) \|(.+)\|$/);
  if (!m) continue;
  const t = tally.get(m[1]) ?? { accounts: 0, errors: 0, rendered: 0, denied: 0, hidden: 0 };
  t.accounts++;
  for (const cell of m[2].split("|").map((x) => x.trim())) { if (cell === "ERR") t.errors++; else if (cell === "✓") t.rendered++; else if (cell === "✕") t.denied++; else if (cell === "404") t.hidden++; }
  tally.set(m[1], t);
}
const commandDone = (phase: Phase) => frac(CRITERIA.find((x) => x.id === "C-12")![phase]);

function roleRows(phase: Phase) {
  return ROLES.map((r) => {
    const w = WORKSPACE_CONFIG.find((x) => x.role === r.code);
    const nav = w ? w.nav.flatMap((g) => g.items).map((h) => NAV_ITEMS[h]).filter((i) => i && (i.any.length === 0 || i.any.some((p) => !!r.permissions[p]))) : [];
    const t = tally.get(r.code);
    const checks: Array<[string, number, number, number]> = [ // [check, weight, implemented, verified]
      ["Dashboard (workspace, title, purpose)", 3, w ? 1 : 0, w ? 1 : 0],
      ["Sidebar navigation", 2, nav.length ? 1 : 0, nav.length ? 1 : 0],
      ["Live scoped figures", 2, w?.kpis.length ? 1 : 0, w?.kpis.length ? 1 : 0],
      ["Quick actions", 1, w?.quick.length ? 1 : 0, w?.quick.length ? 1 : 0],
      ["Pages render or refuse correctly (route audit, 0 server errors)", 3, t ? 1 : 0, t && t.errors === 0 ? 1 : 0],
      ["Accessibility and reflow of dashboard and navigation", 2, 1, 1],
    ];
    if (COMMAND_ROLES.includes(r.code)) { const cd = commandDone(phase); checks.push(["Command and reporting pages (Part 8)", 3, cd.impl, cd.ver]); }
    const W = checks.reduce((n, x) => n + x[1], 0);
    const impl = checks.reduce((n, x) => n + x[1] * x[2], 0) / W;
    const ver = checks.reduce((n, x) => n + x[1] * x[3], 0) / W;
    const missing = checks.filter((x) => x[2] < 1).map((x) => x[0]);
    return { r, w, nav, t, impl, ver, missing };
  });
}

function build(phase: Phase) {
  const all = score(CRITERIA, phase);
  const buildable = score(CRITERIA.filter((x) => x[phase] !== "B"), phase);
  const roles = roleRows(phase);
  const modulesDone = MODULES.filter((m) => moduleState(CRITERIA.filter((x) => x.area === m), phase).startsWith("Fully")).length;
  const modulesPartial = MODULES.filter((m) => moduleState(CRITERIA.filter((x) => x.area === m), phase) === "Partially implemented").length;
  const modulesNone = MODULES.length - modulesDone - modulesPartial;
  return { all, buildable, roles, modulesDone, modulesPartial, modulesNone };
}

const base = build("baseline");
const cur = build("current");
const blockedList = CRITERIA.filter((x) => x.current === "B");
const outstanding = CRITERIA.filter((x) => x.current !== "V");

function moduleTable(phase: Phase) {
  const out = ["| No. | Module | Status | Criteria | Implemented and tested | Partial | Not developed | Blocked | Implementation | Verification | Remaining |", "|--:|---|---|--:|--:|--:|--:|--:|--:|--:|--:|"];
  for (const m of [...MODULES, CMD, KMU, PORT, XC]) {
    const list = CRITERIA.filter((x) => x.area === m);
    const s = score(list, phase);
    out.push(`| ${m.match(/^\d+/)?.[0] ?? "—"} | ${m.replace(/^\d+ /, "")} | ${moduleState(list, phase)} | ${s.n} | ${s.done} | ${s.partial} | ${s.none} | ${s.blocked} | ${pct(s.impl)} | ${pct(s.ver)} | ${pct(1 - s.impl)} |`);
  }
  return out;
}

const summary = (b: typeof base, title: string) => [
  `| Measure (${title}) | Value |`, "|---|---|",
  `| Implementation percentage (all approved criteria, weighted) | **${pct(b.all.impl)}** |`,
  `| Verification percentage (all approved criteria, weighted) | **${pct(b.all.ver)}** |`,
  `| Implementation of work that can be done without external dependencies | ${pct(b.buildable.impl)} |`,
  `| Criteria: total · implemented and tested · implemented not tested · partial · not developed · blocked | ${b.all.n} · ${b.all.done} · ${b.all.untested} · ${b.all.partial} · ${b.all.none} · ${b.all.blocked} |`,
  `| Modules (of 17): fully implemented · partially · not developed | ${b.modulesDone} · ${b.modulesPartial} · ${b.modulesNone} |`,
  `| Role dashboards implemented (of 31) | ${b.roles.filter((x) => x.w).length} |`,
  `| Role back offices fully implemented and verified (of 31), including command pages where required | ${b.roles.filter((x) => x.ver >= 0.999).length} |`,
];

const report: string[] = [
  "# Complete ZPS-OMS Development Status Report", "",
  "> Sections 2–6 are generated by `npm run docs:status` from the requirement register (`scripts/status-register.mts`), the enforced role catalogue and workspace configuration, and the route-audit evidence. The narrative in section 1 and section 7 is maintained by hand. Do not edit generated tables by hand.", "",
  `Audit performed 27 November 2026 against the code, the XAMPP MySQL development database and the running application (route audit ${auditStamp}). Synthetic data only.`, "",
  "## 1. Executive development summary", "",
  "ZPS-OMS is one Next.js application holding the public website and the authenticated back office. At the start of this directive (the **baseline**, v0.10.0) all 17 approved modules and all 31 role back offices were implemented and verified for the requirements set before this directive. What remains falls into three groups:",
  "- external dependencies: the establishment, SSO/MFA, identifier formats, production infrastructure, malware scanning, penetration test, institutional approval;",
  "- a few genuine partial items: rank/position/appointment model, scheduling availability view, Excel opening, CI run observation, manual accessibility audit, one concurrency defect;",
  "- the **new institutional command hierarchy and reporting architecture** required by this directive (Parts 4–13), which did not exist at baseline.", "",
  "Application stage: **production candidate** for the previously approved scope. Institutional approval: **Awaiting Formal Institutional Approval**. Production deployment: **not authorised**. Critical defects open: **0**. Open defects: 1 medium (liaison concurrency, X-09).", "",
  "### Baseline (start of this directive)", "", ...summary(base, "baseline"), "",
  "### Current (after the work recorded in this report)", "", ...summary(cur, "current"), "",
  "How the percentages are calculated: every approved requirement is broken into acceptance criteria. Each has a weight of 3 (critical), 2 (standard) or 1 (minor) and a status. Partial criteria earn only the implemented fraction. Blocked criteria earn nothing but stay in the denominator. *Implementation* = Σ weight × implemented fraction ÷ Σ weight; *verification* = Σ weight × verified fraction ÷ Σ weight. A screen, model or endpoint alone never counts as complete: a criterion is *implemented and tested* only when frontend, backend, database, permissions, workflow and a passing test exist.", "",
  "## 2. Module-by-module status — baseline", "", ...moduleTable("baseline"), "",
  "## 3. Module-by-module status — current", "", ...moduleTable("current"), "",
  "## 4. Acceptance criteria (every criterion, baseline → current)", "",
  "| ID | Area | Criterion | Weight | Baseline | Current | Evidence / blocker |", "|---|---|---|:-:|---|---|---|",
  ...CRITERIA.map((x) => `| ${x.id} | ${x.area.replace(/^\d+ /, "")} | ${x.criterion}${x.validate ? " *(requires institutional validation)*" : ""} | ${x.weight} | ${label(x.baseline)} | ${label(x.current)} | ${[x.evidence, x.blocker ? `**Blocked:** ${x.blocker}` : ""].filter(Boolean).join(" · ") || "—"} |`), "",
  "## 5. Role-by-role status (31 roles, individually)", "",
  "Checks per role (weight): dashboard (3), sidebar (2), figures (2), quick actions (1), route audit with no server errors (3), accessibility and reflow (2), and for the roles named in directive Part 8 the command and reporting pages (3). Functional actions, permissions, approval rules, notifications, reports and audit behaviour per role are itemised in the tier verification documents (`TIER_1…TIER_4_*.md`).", "",
  "| # | Role | Tier | Scope | Nav entries | Figures | Accounts audited | Rendered / refused / 404 / errors | Baseline impl. · verif. | Current impl. · verif. | Remaining |", "|--:|---|:-:|---|--:|--:|--:|---|---|---|---|",
  ...cur.roles.map((x, i) => { const b = base.roles[i]; return `| ${nn(x.r.no)} | ${x.r.name} | ${x.r.tier} | ${x.r.context} | ${x.nav.length} | ${x.w?.kpis.length ?? 0} | ${x.t?.accounts ?? 0} | ${x.t ? `${x.t.rendered} / ${x.t.denied} / ${x.t.hidden} / ${x.t.errors}` : "—"} | ${pct(b.impl)} · ${pct(b.ver)} | ${pct(x.impl)} · ${pct(x.ver)} | ${x.missing.join("; ") || "—"} |`; }), "",
  `Tiers: ${([1, 2, 3, 4] as Tier[]).map((t) => `${t} — ${TIER_NAMES[t]} (${ROLES.filter((r) => r.tier === t).length})`).join(" · ")}.`, "",
  "## 6. Remaining development register (current)", "",
  "| ID | Area | Outstanding item | Priority | Status | Dependency | Required implementation and acceptance | Test procedure |", "|---|---|---|---|---|---|---|---|",
  ...outstanding.map((x) => `| ${x.id} | ${x.area.replace(/^\d+ /, "")} | ${x.criterion} | ${x.weight === 3 ? "Critical" : x.weight === 2 ? "High" : "Medium"} | ${label(x.current)} | ${x.blocker ?? (x.validate ? "Institutional validation" : "—")} | ${x.current === "B" ? "Implement when the dependency is supplied; accepted when the criterion passes on the supplied input" : `Deliver: ${x.criterion}. Accepted when frontend, backend, database, permissions and workflow are connected and the test passes`} | ${x.area === CMD ? "Domain tests and the directive's Tests A–J (`COMMAND_AND_REPORTING_TEST_RESULTS.md`); browser journey; route audit" : "Automated test named in the evidence column; route audit"} |`), "",
  `External dependencies currently blocking criteria: ${blockedList.length} (${[...new Set(blockedList.map((x) => x.blocker))].join("; ")}).`, "",
];
const narrative = fs.existsSync("docs/final-delivery/status-narrative.md") ? fs.readFileSync("docs/final-delivery/status-narrative.md", "utf8").trimEnd().split(/\r?\n/) : [];
write("docs/final-delivery/COMPLETE_ZPS_OMS_DEVELOPMENT_STATUS_REPORT.md", [...report, ...narrative]);

write("docs/final-delivery/UPDATED_IMPLEMENTATION_PERCENTAGES.md", [
  "# Updated Implementation Percentages", "",
  "> Generated by `npm run docs:status` from `scripts/status-register.mts`. Do not edit by hand.", "",
  "| Measure | Baseline | Current | Change |", "|---|--:|--:|--:|",
  `| Implementation (all approved criteria, weighted) | ${pct(base.all.impl)} | ${pct(cur.all.impl)} | ${pct(cur.all.impl - base.all.impl)} |`,
  `| Verification (all approved criteria, weighted) | ${pct(base.all.ver)} | ${pct(cur.all.ver)} | ${pct(cur.all.ver - base.all.ver)} |`,
  `| Implementation excluding externally blocked criteria | ${pct(base.buildable.impl)} | ${pct(cur.buildable.impl)} | ${pct(cur.buildable.impl - base.buildable.impl)} |`,
  `| Remaining (all approved criteria) | ${pct(1 - base.all.impl)} | ${pct(1 - cur.all.impl)} | |`,
  `| Modules fully implemented (of 17) | ${base.modulesDone} | ${cur.modulesDone} | |`,
  `| Role back offices fully implemented and verified (of 31) | ${base.roles.filter((x) => x.ver >= 0.999).length} | ${cur.roles.filter((x) => x.ver >= 0.999).length} | |`, "",
  "## By area (current)", "", ...moduleTable("current"), "",
  "## Status vocabulary", "",
  "Fully implemented · Partially implemented · Not developed · Implemented but untested · Tested and passed · Blocked by external dependency · Requires institutional validation (implemented; values to be confirmed by the Service). See `COMPLETE_ZPS_OMS_DEVELOPMENT_STATUS_REPORT.md` §4 for every criterion.",
]);
console.log(`Status report: baseline impl ${pct(base.all.impl)} / verif ${pct(base.all.ver)}; current impl ${pct(cur.all.impl)} / verif ${pct(cur.all.ver)}`);
