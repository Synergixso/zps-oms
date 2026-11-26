"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavGroup } from "@/lib/nav";
import { Icon } from "./icons";

function isActive(path: string, href: string) {
  if (href === "/app") return path === "/app";
  if (href === "/app/fleet") return path === "/app/fleet" || /^\/app\/fleet\/(?!maintenance)/.test(path);
  if (href === "/app/manpower") return path === "/app/manpower" || /^\/app\/manpower\/(?!contributions)/.test(path);
  if (href === "/app/audit") return path === "/app/audit";
  if (href === "/app/org") return path === "/app/org" || /^\/app\/org\/(?!changes|tenants)/.test(path);
  return path === href || path.startsWith(href + "/");
}

const STORE = "zps.nav.collapsed";

export interface ShellUser { name: string; role: string; initials: string }

export function SideNav({ groups, crest, user, version }: { groups: NavGroup[]; crest: React.ReactNode; user: ShellUser; version: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    try {
      setCollapsed(JSON.parse(localStorage.getItem(STORE) ?? "{}"));
    } catch {
      /* storage unavailable: everything expanded */
    }
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const toggle = (label: string) =>
    setCollapsed((c) => {
      const next = { ...c, [label]: !c[label] };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const nav = (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <Link href="/app" className="flex items-center gap-2.5 px-3 pb-3 pt-4">
        <span className="flex h-[50px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md">{crest}</span>
        <span className="leading-tight">
          <span className="block whitespace-nowrap text-[12px] font-extrabold tracking-wide text-white">ZAMBIA POLICE SERVICE</span>
          <span className="block whitespace-nowrap text-[8.5px] font-semibold tracking-[0.06em] text-white/75">OPERATIONS MANAGEMENT SYSTEM</span>
          <span className="mt-1 inline-block rounded-full bg-zp-green px-2.5 py-0.5 text-[12px] font-extrabold tracking-wider text-white shadow">ZPS-OMS</span>
        </span>
      </Link>
      <Link href="/app/profile" className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 hover:bg-white/[0.12]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2a78d6] to-[#173f8a] text-[13px] font-bold text-white ring-2 ring-white/30">{user.initials}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13.5px] font-bold text-white">{user.name}</span>
          <span className="block truncate text-[11.5px] text-white/70">{user.role}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />Online</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:rgba(255,255,255,.25)_transparent] [scrollbar-width:thin]">
        {groups.map((g) => {
          const hasActive = g.items.some((i) => isActive(path, i.href));
          const isOpen = hasActive || !collapsed[g.label];
          return (
            <div key={g.label} className="mt-3">
              <button
                type="button"
                onClick={() => toggle(g.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55 hover:text-white/85"
              >
                {g.label}
                <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}><Icon name="chevron" className="h-3.5 w-3.5" /></span>
              </button>
              {isOpen && (
                <ul className="mt-1 space-y-0.5">
                  {g.items.map((i) => {
                    const active = isActive(path, i.href);
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition ${active ? "bg-gradient-to-r from-[#16823b] to-[#1f9d4a] font-bold text-white shadow-[0_2px_8px_rgba(22,130,59,0.45)]" : "text-white/85 hover:bg-white/[0.08] hover:text-white"}`}
                        >
                          <Icon name={i.icon} className="h-[19px] w-[19px] shrink-0" />
                          <span className="truncate">{i.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-[11px]">
        <p className="flex items-center gap-2 font-semibold text-white/85"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />ZPS-OMS v{version} (Dev)</p>
        <p className="mt-0.5 text-amber-200/90">Synthetic data · not an authorised operational system</p>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 top-[9px] z-30 hidden w-[268px] bg-gradient-to-b from-[#0a2557] via-[#0c2a5f] to-[#071a3d] lg:block">{nav}</aside>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed left-3 top-[20px] z-40 rounded-md border border-line-2 bg-white p-2 text-ink shadow-sm lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[86vw] bg-gradient-to-b from-[#0a2557] to-[#071a3d]">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-2 z-10 rounded p-2 text-white" aria-label="Close navigation menu">
              ✕
            </button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

const LABELS: Record<string, string> = {
  app: "Dashboard", approvals: "Approvals", personnel: "Personnel", manpower: "Manpower", contributions: "Contributions", rosters: "Rosters", assignments: "Assignments",
  transfers: "Transfers", areas: "Operational areas", requests: "Requests", fleet: "Fleet", maintenance: "Maintenance", assets: "Assets", reconciliation: "Reconciliation",
  reports: "Reports", org: "Organisation", changes: "Structure changes", tenants: "Tenants", admin: "Administration", users: "Users", roles: "Roles", reviews: "Access reviews",
  audit: "Audit", history: "Record history", security: "Security", workflows: "Workflows", platform: "Platform", notifications: "Notifications", tasks: "My tasks",
  profile: "My profile", help: "Help", messages: "Contact messages", search: "Search", new: "New", review: "Review", print: "Print",
};

/** Breadcrumbs derived from the path (record ids are shown as “Record”). */
export function Breadcrumbs() {
  const path = usePathname();
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  const crumbs = parts.map((p, i) => ({ href: "/" + parts.slice(0, i + 1).join("/"), label: LABELS[p] ?? (/^[A-Z_]+$/.test(p) ? p.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Record") }));
  return (
    <nav aria-label="Breadcrumb" className="no-print mb-3 text-[12.5px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-line-2">/</span>}
            {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-ink">{c.label}</span> : <Link href={c.href} className="hover:text-zp-blue hover:underline">{c.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Account menu in the top bar. */
export function UserMenu({ user, signOut }: { user: ShellUser; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2a78d6] to-[#173f8a] text-[12px] font-bold text-white">{user.initials}</span>
        <span className="hidden max-w-[200px] text-left leading-tight sm:block">
          <span className="block truncate text-[13.5px] font-bold text-ink">{user.name.replace(/^Demo\s+/, "")}</span>
          <span className="block truncate text-[11px] text-muted">{user.role}</span>
        </span>
        <Icon name="chevron" className="h-4 w-4 rotate-90 text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
          <Link role="menuitem" href="/app/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"><Icon name="userCircle" />My profile and access</Link>
          <Link role="menuitem" href="/app/tasks" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"><Icon name="check" />My tasks</Link>
          <Link role="menuitem" href="/app/notifications" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"><Icon name="bell" />Notifications</Link>
          <Link role="menuitem" href="/app/help" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"><Icon name="help" />Help</Link>
          <form action={signOut} className="border-t border-line">
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-err hover:bg-err-bg"><Icon name="lock" />Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
