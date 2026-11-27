"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const LINKS = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "Features"],
  ["/technical-team", "Technical Team"],
  ["/how-it-works", "How It Works"],
  ["/contact", "Contact"],
] as const;

/**
 * Public navigation — always visible on every screen size.
 * ≥1024 px: inline beside the brand (compact up to 1280 px).
 * <1024 px: a wrapped row of links beneath the brand (no toggle to open).
 */
export function PublicNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const link = (href: string, label: string, size: string) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative whitespace-nowrap font-semibold transition-colors ${size} ${active ? "text-zp-green" : "text-ink hover:text-zp-green"} after:absolute after:-bottom-0.5 after:h-[3px] after:rounded-full ${active ? "after:bg-zp-green" : "after:bg-transparent"}`}
      >
        {label}
      </Link>
    );
  };

  const login = (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-zp-blue px-3 py-2 text-[13.5px] font-semibold text-white shadow-sm hover:bg-[#0e3277] sm:px-4 sm:py-2.5 sm:text-[14px]"
    >
      <Icon name="user" className="hidden h-4 w-4 sm:block" />
      Login
    </Link>
  );

  return (
    <>
      {/* Laptops and desktops */}
      <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex xl:gap-1">
        {LINKS.map(([href, label]) => link(href, label, "px-2 py-2 text-[13.5px] after:inset-x-2 xl:px-3 xl:text-[14px] xl:after:inset-x-3"))}
        <span className="ml-3 xl:ml-4">{login}</span>
      </nav>

      {/* Tablets and phones: Login on the brand row, links always shown beneath */}
      <div className="lg:hidden">{login}</div>
      <nav aria-label="Main" className="order-last flex w-full flex-wrap justify-center gap-x-1 gap-y-1 border-t border-line pt-2 lg:hidden">
        {LINKS.map(([href, label]) => link(href, label, "px-2.5 py-1.5 text-[14px] after:inset-x-2.5"))}
      </nav>
    </>
  );
}
