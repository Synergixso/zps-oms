import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb, one } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { hasPermission, primaryAssignment, primaryRole } from "@/server/domain/policy";
import { signOut } from "@/server/actions/auth";
import { NAV } from "@/lib/nav";
import { SideNav } from "@/components/shell";
import { Crest } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CurrentYear } from "@/components/current-year";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.any.length === 0 || i.any.some((p) => hasPermission(actor, p))) })).filter((g) => g.items.length);
  const role = primaryRole(actor);
  const pa = primaryAssignment(actor);
  const unread = one<{ c: number }>(getDb(), "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL", actor.userId)?.c ?? 0;
  const initials = actor.displayName.replace(/^Demo\s+/, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen">
      <div className="zp-band fixed inset-x-0 top-0 z-40" aria-hidden />
      <SideNav groups={groups} workspace={role ? ROLE_BY_CODE[role].dashboardTitle : "No active access"} crest={<Crest className="h-10 w-[69px]" />} />
      <div className="pt-[9px] lg:pl-[260px]">
        <header className="no-print sticky top-[9px] z-20 flex h-[62px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 pl-16 backdrop-blur lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-muted">
              Zambia Police Service <span aria-hidden>/</span> <span className="font-semibold text-ink">{pa ? pa.orgUnitName : "—"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-800 md:inline">
              Synthetic demo
            </span>
            <Link href="/app/help" className="rounded-md p-2 text-ink-2 hover:bg-slate-100" aria-label="Help">
              <Icon name="help" />
            </Link>
            <Link href="/app/notifications" className="relative rounded-md p-2 text-ink-2 hover:bg-slate-100" aria-label={`Notifications (${unread} unread)`}>
              <Icon name="bell" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-err px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
            <Link href="/app/profile" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-ink">{initials}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[220px] truncate text-[13px] font-semibold text-ink">{actor.displayName}</span>
                <span className="block max-w-[220px] truncate text-[11px] text-muted">{role ? ROLE_BY_CODE[role].name : "No active role"}</span>
              </span>
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-md border border-line-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:bg-slate-50">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900 lg:px-8">
          <strong>Prototype environment.</strong> All names, organisations, figures and references are synthetic demonstration data. Not connected to Zambia Police Service systems; not
          approved for real police information. Active role: <strong>{role ? ROLE_BY_CODE[role].name : "none"}</strong>
          {pa ? ` · Scope: ${pa.orgUnitName}` : ""}.
        </div>
        <main id="main" className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
          {children}
        </main>
        <footer className="no-print border-t border-line px-4 py-4 text-[12px] text-muted lg:px-8">
          <div className="mx-auto flex max-w-[1480px] flex-col items-center gap-2 text-center md:flex-row md:justify-between md:text-left">
            <p>
              © <CurrentYear /> Zambia Police Service. All rights reserved. Designed and developed by{" "}
              <span className="font-semibold text-ink-2">SPOM Technical Services Section Team</span>.
            </p>
            <span className="inline-flex items-center gap-2">
              ZPS-OMS
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
