/** Dashboard panel for holders of command offices (any role, or appointment-only). Figures are scoped to the offices held. */
import Link from "next/link";
import { getDb } from "@/server/db/connection";
import type { Actor } from "@/server/domain/policy";
import { commandOverview } from "@/server/domain/command";
import { ButtonLink, SectionHeader, Stat } from "@/components/ui";
import { OfficesHeld } from "./shared";

export async function CommandPanel({ actor, standalone = false }: { actor: Actor; standalone?: boolean }) {
  const o = await commandOverview(getDb(), actor);
  if (!o) return null;
  const ig = o.held.some((h) => h.positionType === "IG");
  return (
    <section aria-label="Command and reporting" className={standalone ? "" : "mt-8 border-t border-line pt-6"}>
      <SectionHeader title={ig ? "National command" : "Command and reporting"}
        description={ig ? "Directives start at the Inspector General and flow down the configured chain; status reports arrive through the executive reporting chain." : "Instructions you received and issued, and reports awaiting your offices."}
        actions={<><ButtonLink href="/app/command/reports/new">New status report</ButtonLink><ButtonLink href="/app/command" variant="primary">Command overview</ButtonLink></>} />
      <div className="mb-3"><OfficesHeld held={o.held} /></div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="To acknowledge" value={o.toAcknowledge} href="/app/command/directives?status=ISSUED" tone={o.toAcknowledge ? "warn" : "default"} />
        <Stat label="Open directives received" value={o.openReceived} href="/app/command/directives" />
        <Stat label="Overdue" value={o.overdue} href="/app/command/directives" tone={o.overdue ? "err" : "default"} />
        <Stat label="Issued, awaiting closure" value={o.openIssued} href="/app/command/directives/issued" />
        <Stat label="Reports to act on" value={o.reportsToAct} href="/app/command/reports" tone={o.reportsToAct ? "warn" : "default"} />
        <Stat label="Open conflicts" value={o.conflicts} href="/app/command/conflicts" />
      </div>
      {o.returned > 0 && <p className="mt-2 text-sm text-warn"><Link className="underline" href="/app/command/reports/submitted?status=RETURNED">{o.returned} report(s) returned for correction</Link></p>}
    </section>
  );
}
