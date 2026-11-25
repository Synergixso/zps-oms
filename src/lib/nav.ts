import type { Permission } from "@/server/domain/catalogue";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Shown when the user holds ANY of these permissions. Server-side checks still apply on every page. */
  any: Permission[];
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type IconName = "home" | "inbox" | "file" | "building" | "truck" | "wrench" | "box" | "chart" | "users" | "key" | "shield" | "search" | "server" | "flow" | "bell" | "help" | "check" | "layers" | "arrow" | "user" | "lock" | "map" | "eye" | "car" | "play" | "network" | "tools" | "shieldCheck" | "bars" | "gear" | "target" | "scale" | "handshake" | "starShield" | "sitemap" | "clipboardCheck" | "star" | "chevron";

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: "home", any: [] },
      { href: "/app/approvals", label: "Approvals & queues", icon: "inbox", any: ["request.assign", "request.view"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/requests", label: "Administrative requests", icon: "file", any: ["request.view"] },
      { href: "/app/fleet", label: "Fleet register", icon: "truck", any: ["fleet.view"] },
      { href: "/app/fleet/maintenance", label: "Fleet maintenance", icon: "wrench", any: ["maintenance.view"] },
      { href: "/app/assets", label: "General assets", icon: "box", any: ["asset.view"] },
      { href: "/app/reports", label: "Reports", icon: "chart", any: ["report.view"] },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/app/org", label: "Organisation directory", icon: "building", any: ["org.view"] },
      { href: "/app/org/changes", label: "Structure changes", icon: "flow", any: ["org.propose", "org.view"] },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/app/admin/users", label: "Users & access", icon: "users", any: ["user.view"] },
      { href: "/app/admin/roles", label: "Roles & permissions", icon: "key", any: ["user.view", "audit.view", "platform.view"] },
      { href: "/app/admin/reviews", label: "Access reviews", icon: "check", any: ["accessreview.manage"] },
      { href: "/app/audit", label: "Audit explorer", icon: "search", any: ["audit.view"] },
      { href: "/app/security", label: "Security events", icon: "shield", any: ["security.view"] },
      { href: "/app/workflows", label: "Workflow definitions", icon: "flow", any: ["workflow.view"] },
      { href: "/app/platform", label: "System health", icon: "server", any: ["platform.view"] },
    ],
  },
];
