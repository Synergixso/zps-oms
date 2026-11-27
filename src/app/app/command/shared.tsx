/** Shared pieces for the command and reporting pages. */
import Link from "next/link";
import type { Held } from "@/server/domain/command";
import { Notice } from "@/components/ui";

export const COMMAND_BOUNDARY =
  "Administrative instructions and status reports only. Do not record tactical plans, patrol routes, deployments, officer locations, intelligence or investigation details; text is checked for excluded terms.";

export function Done({ message }: { message?: string }) {
  return message ? <div className="mb-4" role="status"><Notice tone="ok">{message}</Notice></div> : null;
}

export function NoOffice() {
  return (
    <Notice tone="info" title="You do not hold a command office">
      Command and reporting follow appointments to offices in the institutional structure. Your account has no current appointment or acting appointment, so there is nothing to show.
      Appointments are recorded by the Commissioner – Operations HQ on the <Link className="text-zp-blue underline" href="/app/command/structure">command structure</Link> page.
    </Notice>
  );
}

export function OfficesHeld({ held }: { held: Held[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {held.map((h) => (
        <li key={`${h.positionId}-${h.authority}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${h.authority === "ACTING" ? "border-warn/40 bg-warn-bg text-ink" : "border-line bg-white text-ink"}`}>
          {h.title}{h.authority === "ACTING" ? ` · acting (${h.actions.length} delegated action${h.actions.length === 1 ? "" : "s"})` : ""}
        </li>
      ))}
    </ul>
  );
}

export const tabCls = (active: boolean) => `rounded-md px-3 py-1.5 text-sm font-semibold ${active ? "bg-[#173f8a] text-white" : "text-zp-blue hover:bg-slate-100"}`;
