import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb, one } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { hasPermission, primaryAssignment, primaryRole } from "@/server/domain/policy";
import { signOut, switchContext } from "@/server/actions/auth";
import { NAV, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { workspaceFor } from "@/server/domain/workspaces";
import { Breadcrumbs, SideNav, UserMenu } from "@/components/shell";
import { Crest } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CurrentYear } from "@/components/current-year";

export const dynamic = "force-dynamic";

const VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version as string;
  } catch {
    return "0";
  }
})();

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  // Role-specific navigation from the workspace configuration (falls back to the generic tree); every entry is
  // still filtered by permission here and re-checked by each page and domain function.
  const ws = workspaceFor(actor);
  const allowed = (i: NavItem) => i.any.length === 0 || i.any.some((p) => hasPermission(actor, p));
  const source = ws ? ws.nav.map((g) => ({ label: g.label, items: g.items.map((h) => NAV_ITEMS[h]).filter(Boolean) })) : NAV;
  const groups = source.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
  const role = primaryRole(actor);
  const pa = primaryAssignment(actor);
  const unread = Number((await one<{ c: number }>(getDb(), "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL", actor.userId))?.c ?? 0);
  const initials = actor.displayName.replace(/^Demo\s+/, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const user = { name: actor.displayName, role: role ? ROLE_BY_CODE[role].name : "No active role", initials };
  const contexts = (actor.contexts ?? []).map((a) => ({ id: a.id, role: ROLE_BY_CODE[a.roleCode].name, unit: a.orgUnitName, active: a.id === actor.activeAssignmentId }));

  return (
    <div className="min-h-screen">
      <div className="zp-band fixed inset-x-0 top-0 z-40" aria-hidden />
      <SideNav groups={groups} crest={<Crest className="h-[42px] w-[64px]" />} user={user} version={VERSION} />
      <div className="pt-[9px] lg:pl-[268px]">
        <header className="no-print sticky top-[9px] z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-[64px] items-center gap-3 px-4 pl-16 lg:px-8">
            <form action="/app/search" method="get" role="search" className="relative hidden min-w-0 flex-1 md:block md:max-w-[520px]">
              <label htmlFor="global-search" className="sr-only">Search personnel, requests, assignments</label>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" /></span>
              <input id="global-search" name="q" type="search" minLength={2} maxLength={60} placeholder="Search personnel, requests, assignments…" className="h-10 w-full rounded-full border border-line-2 bg-slate-50 pl-10 pr-4 text-sm text-ink placeholder:text-slate-500 focus:border-zp-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-zp-blue/20" />
            </form>
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted md:hidden">{pa ? pa.orgUnitName : "ZPS-OMS"}</p>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link href="/app/search" className="rounded-lg p-2 text-ink-2 hover:bg-slate-100 md:hidden" aria-label="Search"><Icon name="search" /></Link>
              <span className="hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-800 xl:inline">Synthetic demo</span>
              <Link href="/app/notifications" className="relative rounded-lg p-2 text-ink-2 hover:bg-slate-100" aria-label={`Notifications (${unread} unread)`}>
                <Icon name="bell" className="h-[22px] w-[22px]" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[19px] rounded-full bg-err px-1 text-center text-[10px] font-bold leading-[19px] text-white">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <Link href="/app/help" className="rounded-lg p-2 text-ink-2 hover:bg-slate-100" aria-label="Help">
                <Icon name="help" className="h-[22px] w-[22px]" />
              </Link>
              <UserMenu user={user} signOut={signOut} contexts={contexts} switchContext={switchContext} />
            </div>
          </div>
        </header>
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[12px] text-amber-900 lg:px-8">
          <strong>Prototype environment</strong> — synthetic demonstration data only; not connected to Zambia Police Service systems. {ws ? <>{ws.backOffice} · </> : null}Active role: <strong>{role ? ROLE_BY_CODE[role].name : "none"}</strong>
          {pa ? ` · Scope: ${pa.orgUnitName}` : ""}.
        </div>
        <main id="main" className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
          <Breadcrumbs />
          {children}
        </main>
        <footer className="no-print border-t border-line px-4 py-4 text-[12px] text-muted lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-2 text-center md:flex-row md:justify-between md:text-left">
            <p>
              © <CurrentYear /> Zambia Police Service. All rights reserved. Designed and developed by{" "}
              <span className="font-semibold text-ink-2">SPOM Technical Services Section Team</span>.
            </p>
            <span className="inline-flex items-center gap-2">
              ZPS-OMS v{VERSION}
              <span className="inline-flex gap-0.5" aria-label="Institutional colours: green, white, blue">
                <span className="h-3 w-3 bg-zp-green" />
                <span className="h-3 w-3 border border-line-2 bg-white" />
                <span className="h-3 w-3 bg-zp-blue" />
              </span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
