/** Command overview shown at the top of every role dashboard (owner's dashboard design). Live, scoped data only. */
import Link from "next/link";
import { getDb } from "@/server/db/connection";
import { ROLE_BY_CODE, type DashboardKind } from "@/server/domain/catalogue";
import { type Actor, hasPermission, primaryAssignment, primaryRole } from "@/server/domain/policy";
import { activityTrends, assignmentsByArea, headlineKpis, recentActivity, systemStatus, type Kpi } from "@/server/domain/overview";
import { quickActionsFor, workspaceFor } from "@/server/domain/workspaces";
import { listTasks } from "@/server/domain/tasks";
import { today } from "@/server/domain/core";
import { Icon } from "@/components/icons";
import { BarChart, DonutChart } from "@/components/charts";
import type { IconName } from "@/lib/nav";
import type { Permission } from "@/server/domain/catalogue";

const TONE: Record<Kpi["tone"], string> = {
  blue: "from-[#1f5fb0] to-[#2a78d6]",
  green: "from-[#127a35] to-[#1f9d4a]",
  violet: "from-[#5b3fc4] to-[#7a5ce0]",
  indigo: "from-[#1d3f8f] to-[#3159c4]",
  orange: "from-[#d2591f] to-[#ef8a3c]",
  teal: "from-[#0f8a7e] to-[#1fb3a3]",
  red: "from-[#b3261e] to-[#df4a40]",
  slate: "from-[#475569] to-[#64748b]",
};
const CARD_BG: Record<Kpi["tone"], string> = {
  blue: "bg-[#eef4fc]", green: "bg-[#ecf7f0]", violet: "bg-[#f2effd]", indigo: "bg-[#edf1fb]", orange: "bg-[#fdf2ea]", teal: "bg-[#eaf7f5]", red: "bg-[#fdeeee]", slate: "bg-[#f1f4f7]",
};

function KpiTile({ k }: { k: Kpi }) {
  const inner = (
    <div className={`flex h-full items-start gap-3 rounded-xl border border-line ${CARD_BG[k.tone]} p-3.5 shadow-[0_1px_2px_rgba(20,40,63,0.06)] transition hover:-translate-y-0.5 hover:shadow-md`}>
      <span className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${TONE[k.tone]} text-white shadow-sm min-[420px]:flex`}>
        <Icon name={k.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-[26px] font-extrabold leading-none tabular-nums text-ink">{typeof k.value === "number" ? k.value.toLocaleString() : k.value}</span>
        <span className="mt-1 block text-[13px] font-bold leading-tight text-ink">{k.label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-2">{k.hint}</span>
      </span>
    </div>
  );
  return k.href ? <Link href={k.href} className="block rounded-xl">{inner}</Link> : inner;
}

function Panel({ title, icon, action, children, className = "" }: { title: string; icon: IconName; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(20,40,63,0.06)] ${className}`}>
      <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#0d2a5e] to-[#173f8a] px-4 py-2.5 text-white">
        <h2 className="flex items-center gap-2 text-[14.5px] font-bold"><Icon name={icon} className="h-[18px] w-[18px] text-white/90" />{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

const QUICK: Array<{ label: string; href: string; icon: IconName; any: Permission[] }> = [
  { label: "Add organisation unit", href: "/app/org/changes", icon: "building", any: ["org.propose"] },
  { label: "Create user account", href: "/app/admin/users", icon: "userPlus", any: ["user.provision"] },
  { label: "Register personnel", href: "/app/personnel/new", icon: "userCircle", any: ["personnel.register"] },
  { label: "Create manpower request", href: "/app/manpower/new", icon: "fileEdit", any: ["manpower.create"] },
  { label: "Submit unit contribution", href: "/app/manpower/contributions", icon: "handshake", any: ["manpower.contribute"] },
  { label: "Build or review rosters", href: "/app/rosters", icon: "list", any: ["roster.build", "roster.review"] },
  { label: "New assignment", href: "/app/assignments/new", icon: "layers", any: ["assignment.propose"] },
  { label: "Process transfers", href: "/app/transfers", icon: "arrow", any: ["assignment.transfer", "assignment.receive"] },
  { label: "Approvals and queues", href: "/app/approvals", icon: "stamp", any: ["manpower.view", "assignment.view", "request.view"] },
  { label: "New administrative request", href: "/app/requests/new", icon: "file", any: ["request.create"] },
  { label: "Raise vehicle maintenance", href: "/app/fleet/maintenance/new", icon: "wrench", any: ["maintenance.create"] },
  { label: "Open asset reconciliation", href: "/app/assets/reconciliation", icon: "clipboardCheck", any: ["asset.inspect"] },
  { label: "Security events", href: "/app/security", icon: "shield", any: ["security.view"] },
  { label: "Audit register", href: "/app/audit", icon: "docSearch", any: ["audit.view"] },
  { label: "Back up the database", href: "/app/platform", icon: "database", any: ["platform.configure"] },
  { label: "Management reports", href: "/app/reports", icon: "chart", any: ["report.view"] },
];

/** The 17 modules of the Master Execution Prompt; 16 and 17 are later-phase and labelled as such. */
const QUICK_ICON: Record<string, IconName> = {
  "/app/stores": "database", "/app/stores/requisitions/new": "clipboardCheck", "/app/stores/requisitions?status=APPROVED": "send", "/app/admin/users": "users",
  "/app/platform": "server", "/app/org/tenants": "network", "/app/fleet": "truck", "/app/fleet/maintenance": "wrench", "/app/reports": "chart", "/app/approvals": "stamp",
};

const MODULES: Array<{ no: number; name: string; icon: IconName; href?: string; any: Permission[]; planned?: boolean }> = [
  { no: 1, name: "Organisation & Multi-Tenant Management", icon: "bank", href: "/app/org", any: ["org.view"] },
  { no: 2, name: "User, Roles & Access Management", icon: "users", href: "/app/admin/users", any: ["user.view"] },
  { no: 3, name: "Personnel Registry & Records", icon: "userCircle", href: "/app/personnel", any: ["personnel.view"] },
  { no: 4, name: "Manpower Requests & Contributions", icon: "fileEdit", href: "/app/manpower", any: ["manpower.view"] },
  { no: 5, name: "Roster Builder & Lists", icon: "list", href: "/app/rosters", any: ["roster.view"] },
  { no: 6, name: "Operational Areas", icon: "pin", href: "/app/areas", any: ["area.view"] },
  { no: 7, name: "Field Assignment & Disposition", icon: "layers", href: "/app/assignments", any: ["assignment.view"] },
  { no: 8, name: "Transfers, Tenure & Renewal", icon: "arrow", href: "/app/transfers", any: ["assignment.view"] },
  { no: 9, name: "Approval & Workflow Engine", icon: "flow", href: "/app/approvals", any: ["manpower.view", "assignment.view", "request.view", "workflow.view"] },
  { no: 10, name: "Fleet & Transport Administration", icon: "truck", href: "/app/fleet", any: ["fleet.view"] },
  { no: 11, name: "General Asset Accountability", icon: "box", href: "/app/assets", any: ["asset.view"] },
  { no: 12, name: "Dashboards & Reporting", icon: "chart", href: "/app/reports", any: ["report.view"] },
  { no: 13, name: "Notifications & Tasks", icon: "bell", href: "/app/notifications", any: [] },
  { no: 14, name: "Audit & Compliance", icon: "shieldCheck", href: "/app/audit", any: ["audit.view"] },
  { no: 15, name: "Platform Administration", icon: "server", href: "/app/platform", any: ["platform.view"] },
  { no: 16, name: "Administrative Scheduling", icon: "gauge", any: [], planned: true },
  { no: 17, name: "Correspondence Management", icon: "mail", any: [], planned: true },
];

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });
const KIND_ICON: Record<string, IconName> = { manpower: "users", roster: "list", assignment: "layers", transfer: "arrow", system: "server", security: "shield", general: "bell" };
const KIND_TONE: Record<string, string> = { manpower: "bg-[#1f9d4a]", roster: "bg-[#2a78d6]", assignment: "bg-[#ef8a3c]", transfer: "bg-[#7a5ce0]", system: "bg-[#0f8a7e]", security: "bg-[#df4a40]", general: "bg-[#64748b]" };

export async function CommandOverview({ actor, kind }: { actor: Actor; kind: DashboardKind }) {
  const db = getDb();
  const role = primaryRole(actor)!;
  const def = ROLE_BY_CODE[role];
  const pa = primaryAssignment(actor);
  const [kpis, areas, trends, activity, status, tasks] = await Promise.all([
    headlineKpis(db, actor, kind), assignmentsByArea(db, actor), activityTrends(db, actor), recentActivity(db, actor), systemStatus(db, actor), listTasks(db, actor, "OPEN"),
  ]);
  const ws = workspaceFor(actor);
  // Role-specific quick actions from the workspace configuration; the generic list is the fallback.
  const wsQuick = quickActionsFor(actor).map((q) => ({ ...q, icon: QUICK.find((x) => x.href === q.href)?.icon ?? QUICK_ICON[q.href] ?? "send" }));
  const quick = wsQuick.length ? wsQuick : QUICK.filter((q) => q.any.some((p) => hasPermission(actor, p))).slice(0, 7);
  const now = new Date();
  const t = today();
  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <section className="relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-r from-[#0a2557] via-[#123f8f] to-[#1d5fc4] text-white lg:-mx-8">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-[url('/hero/hero-02.webp')] bg-cover bg-[42%_22%] md:block" aria-hidden />
        <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-gradient-to-r from-[#123f8f] via-[#123f8f]/40 to-transparent md:block" aria-hidden />
        <div className="relative px-5 py-6 lg:px-8">
          <h1 className="text-[22px] font-extrabold tracking-tight md:text-[28px]">Zambia Police Service – ZPS-OMS</h1>
          <p className="mt-1 max-w-[560px] text-[13.5px] text-white/90 md:text-[15px]">National Operations Administration, Manpower &amp; Personnel Management Platform</p>
        </div>
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="relative block h-[14px] w-full" aria-hidden>
          <path d="M0 18 C 480 40, 960 0, 1440 22 L1440 40 L0 40 Z" fill="var(--color-zp-green)" />
          <path d="M0 26 C 480 44, 960 8, 1440 30 L1440 40 L0 40 Z" fill="var(--color-canvas)" />
        </svg>
      </section>

      {/* Dashboard heading */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8eef9] text-[#173f8a]"><Icon name="gauge" className="h-6 w-6" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#173f8a]">Tier {def.tier} · Role {String(def.no).padStart(2, "0")} · {def.name}</p>
            <h2 className="text-[22px] font-extrabold leading-tight text-[#0d2149] md:text-[26px]">{ws?.backOffice ?? def.dashboardTitle}</h2>
            <p className="text-[13.5px] text-ink-2">{ws?.purpose ?? def.description}</p>
            {pa && <p className="mt-0.5 text-[12px] font-semibold text-muted">Scope: {pa.orgUnitName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start rounded-xl border border-line bg-white px-3.5 py-2 shadow-sm md:self-auto">
          <Icon name="list" className="h-5 w-5 text-[#173f8a]" />
          <div className="text-right leading-tight">
            <p className="text-[13px] font-bold text-ink">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" })}</p>
            <p className="text-[12px] text-ink-2">{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" })} (Lusaka)</p>
          </div>
        </div>
      </div>

      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k) => <KpiTile key={k.key} k={k} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {areas !== null && (
              <Panel title="Personnel assignments overview" icon="chart">
                <DonutChart data={areas} centerLabel="Active assignments" emptyText="No active assignments in your scope." />
              </Panel>
            )}
            <Panel title="Key activity (last 30 days)" icon="chartMonitor">
              <BarChart data={trends} caption="Administrative activity in the last 30 days within your scope" />
            </Panel>
          </div>

          <Panel title="ZPS-OMS system modules" icon="sitemap" action={<span className="text-[12px] text-white/85">15 active · 2 planned</span>}>
            {/* Phones: only the modules this role can open, as compact links. */}
            <ul className="space-y-1.5 md:hidden">
              {MODULES.filter((m) => !m.planned && m.href && (m.any.length === 0 || m.any.some((p) => hasPermission(actor, p)))).map((m) => (
                <li key={m.no}>
                  <Link href={m.href!} className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-[13px] font-semibold text-[#0d2149] hover:border-[#173f8a]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#173f8a] to-[#2a78d6] text-white"><Icon name={m.icon} className="h-4 w-4" /></span>
                    {String(m.no).padStart(2, "0")}. {m.name}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="hidden grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid lg:grid-cols-3 2xl:grid-cols-5">
              {MODULES.map((m) => {
                const allowed = !m.planned && (m.any.length === 0 || m.any.some((p) => hasPermission(actor, p)));
                const body = (
                  <div className={`flex h-full items-start gap-2.5 rounded-lg border p-2.5 ${m.planned ? "border-dashed border-line-2 bg-slate-50" : allowed ? "border-line bg-white transition hover:border-[#173f8a] hover:shadow-sm" : "border-line bg-slate-50/60"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.planned ? "bg-slate-200 text-slate-500" : "bg-gradient-to-br from-[#173f8a] to-[#2a78d6] text-white"}`}><Icon name={m.icon} className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold leading-tight text-[#0d2149]">{String(m.no).padStart(2, "0")}. {m.name}</span>
                      <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${m.planned ? "text-muted" : "text-ok"}`}>
                        {m.planned ? "Planned (later phase)" : <><Icon name="checkCircle" className="h-3.5 w-3.5" />Active{allowed ? "" : " · not in your role"}</>}
                      </span>
                    </span>
                  </div>
                );
                return <li key={m.no}>{allowed && m.href ? <Link href={m.href} className="block h-full rounded-lg">{body}</Link> : body}</li>;
              })}
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#eef4fc] px-3 py-2 text-[12px] text-ink-2"><Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-[#173f8a]" />Modules 16 and 17 are planned for a later phase, subject to institutional requirements validation and security approval.</p>
          </Panel>
        </div>

        {/* On phones the actionable column (quick actions, status, activity, tasks) comes before the charts. */}
        <div className="order-first space-y-4 xl:order-none">
            <Panel title="Quick actions" icon="send">
            {quick.length ? (
              <ul className="space-y-1.5">
                {quick.map((q) => (
                  <li key={q.href + q.label}>
                    <Link href={q.href} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[13.5px] font-semibold text-[#0d2149] transition hover:border-[#173f8a] hover:bg-[#f2f6fd]">
                      <Icon name={q.icon} className="h-[18px] w-[18px] text-[#173f8a]" />{q.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No quick actions for your role.</p>}
          </Panel>
          {status && (
            <Panel title="System status" icon="server" action={<span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.allOk ? "bg-[#157a37] text-white" : "bg-[#a84a05] text-white"}`}>{status.allOk ? "All systems operational" : "Attention needed"}</span>}>
              <ul className="space-y-2">
                {status.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-2 text-ink"><span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-white ${r.ok ? "bg-[#1f9d4a]" : "bg-[#ef8a3c]"}`}><Icon name={r.ok ? "check" : "info"} className="h-3 w-3" /></span>{r.label}</span>
                    <span className={`text-right font-semibold ${r.ok ? "text-ok" : "text-warn"}`}>{r.value}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Recent administrative activity" icon="flow">
            {activity.length ? (
              <ol className="space-y-3">
                {activity.map((a, i) => {
                  const row = (
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${KIND_TONE[a.kind]}`}><Icon name={KIND_ICON[a.kind]} className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold capitalize leading-tight text-ink">{a.title}</span>
                        <span className="block truncate text-[12px] text-ink-2">{a.detail}</span>
                      </span>
                      <time className="shrink-0 text-[11px] text-muted">{fmt(a.at)}</time>
                    </div>
                  );
                  return <li key={i}>{a.href ? <Link href={a.href} className="block rounded-md hover:bg-slate-50">{row}</Link> : row}</li>;
                })}
              </ol>
            ) : <p className="text-sm text-muted">No recent activity in your scope.</p>}
          </Panel>
          <Panel title={`My tasks (${tasks.length})`} icon="clipboardCheck" action={<Link href="/app/tasks" className="text-[12px] font-semibold text-white hover:underline">View all →</Link>}>
            {tasks.length ? (
              <ul className="space-y-2">
                {tasks.slice(0, 5).map((k) => {
                  const overdue = k.due_date && k.due_date < t;
                  const days = k.due_date ? Math.round((Date.parse(k.due_date) - Date.parse(t)) / 86400000) : null;
                  return (
                    <li key={k.id} className="flex items-start justify-between gap-2 text-[13px]">
                      <Link href={k.link ?? "/app/tasks"} className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline">{k.title}</Link>
                      {days !== null && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${overdue ? "bg-err-bg text-err" : days <= 2 ? "bg-warn-bg text-warn" : "bg-info-bg text-info"}`}>{overdue ? "Overdue" : days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted">No open tasks.</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
