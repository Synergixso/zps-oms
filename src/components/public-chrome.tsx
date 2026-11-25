"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";

const LINKS = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "Features"],
  ["/technical-team", "Technical Team"],
  ["/contact", "Contact"],
] as const;

/** Public navigation with active-page underline and a mobile toggle. */
export function PublicNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.map(([href, label]) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={`relative px-3 py-2 text-[14px] font-semibold transition-colors ${active ? "text-zp-green" : "text-ink hover:text-zp-green"} after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[3px] after:rounded-full ${active ? "after:bg-zp-green" : "after:bg-transparent"}`}
      >
        {label}
      </Link>
    );
  });
  const login = (
    <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-zp-blue px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0e3277]">
      <Icon name="user" className="h-4 w-4" />
      Login
    </Link>
  );
  return (
    <>
      <nav aria-label="Public" className="hidden items-center gap-1 lg:flex">
        {links}
        <span className="ml-4">{login}</span>
      </nav>
      <div className="flex items-center gap-2 lg:hidden">
        {login}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="public-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-md border border-line-2 p-2 text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
      {open && (
        <nav id="public-menu" aria-label="Public (mobile)" className="flex w-full flex-col border-t border-line pt-2 lg:hidden">
          {links}
        </nav>
      )}
    </>
  );
}
