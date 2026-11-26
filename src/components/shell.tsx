"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavGroup } from "@/lib/nav";
import { Icon } from "./icons";

function isActive(path: string, href: string) {
  if (href === "/app") return path === "/app";
  if (href === "/app/fleet") return path === "/app/fleet" || (/^\/app\/fleet\/(?!maintenance)/.test(path));
  if (href === "/app/manpower") return path === "/app/manpower" || /^\/app\/manpower\/(?!contributions)/.test(path);
  if (href === "/app/org") return path === "/app/org" || (/^\/app\/org\/(?!changes)/.test(path));
  return path === href || path.startsWith(href + "/");
}

export function SideNav({ groups, workspace, crest }: { groups: NavGroup[]; workspace: string; crest: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nav = (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <div className="flex h-12 w-[78px] items-center justify-center rounded-md bg-white p-1">{crest}</div>
        <div>
          <p className="text-[17px] font-bold tracking-wide text-white">ZPS-OMS</p>
          <p className="text-[11px] text-slate-300">Operations Management</p>
        </div>
      </div>
      <div className="mx-3 mt-3 rounded-md border border-white/10 bg-sidebar-2 px-3 py-2 text-[12px] font-semibold text-white">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
        {workspace}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.label} className="mt-5">
            <p className="px-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{g.label}</p>
            <ul className="mt-1.5 space-y-0.5">
              {g.items.map((i) => {
                const active = isActive(path, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] ${active ? "bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_var(--color-zp-green)]" : "text-slate-200 hover:bg-white/6 hover:text-white"}`}
                    >
                      <Icon name={i.icon} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-300">
        <p className="font-semibold text-amber-200">Synthetic data · Local prototype</p>
        <p>Not an authorised operational system</p>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 top-[9px] z-30 hidden w-[260px] bg-sidebar lg:block">{nav}</aside>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed left-3 top-[18px] z-40 rounded-md border border-line-2 bg-white p-2 text-ink shadow-sm lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-sidebar">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-2 rounded p-2 text-white" aria-label="Close navigation menu">
              ✕
            </button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
