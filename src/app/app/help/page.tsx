import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { helpCentre } from "@/server/domain/help";
import { Badge, Card, Notice, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Help" };

const FAQS: Array<[string, string]> = [
  ["Why can't I see another division's records?", "Access is limited to the organisation named on your role assignment and the units under it. Cross-division access is never automatic."],
  ["Why can't I approve something?", "Approval requires a recorded delegation for that organisation and matter, plus an active business role there. You can never approve something you prepared."],
  ["I hold more than one role. Which one am I using?", "One at a time. The active role is shown in the account menu (top right) and the notice at the top; switch it there. Pages and figures follow the active role only."],
  ["How do I correct a returned request?", "Open it, correct the fields, save, then submit it again. Its history is kept."],
  ["Can a closed record be changed?", "No. Closed matters can only be reopened through the controlled reopening action with a justification; nothing is overwritten."],
  ["Where do my scheduled reports go?", "Into Reports → My deliveries, with a notification. Nothing is e-mailed. Deliveries are kept for 30 days."],
  ["What must never be entered?", "Real personal data, service numbers, vehicle registrations, operational, tactical, intelligence, case or armoury information. This is a synthetic prototype."],
];

export default async function Help() {
  const actor = await requireActor();
  const h = await helpCentre(getDb(), actor);
  const sections = [...new Set(h.pages.map((p) => p.section))];
  return (
    <>
      <PageHeader eyebrow="Help" title={h.role ? `Your workspace: ${h.role.backOffice}` : "Using ZPS-OMS"}
        description={h.role ? `${h.role.name} · Tier ${h.role.tier} · Role ${String(h.role.no).padStart(2, "0")}${h.role.unit ? ` · ${h.role.unit}` : ""}` : "Guidance for the local synthetic prototype."} />
      {h.role && (
        <div className="mb-4 space-y-3">
          <Notice tone="info" title="What this workspace is for">{h.role.purpose}</Notice>
          {h.contexts > 1 && <Notice tone="warn" title={`You hold ${h.contexts} roles`}>You work in one at a time. Switch the active role from the account menu (top right); everything on screen follows the active role.</Notice>}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {sections.map((sec) => (
            <Card key={sec} title={sec} bodyClass="p-0">
              <ul className="divide-y divide-line">
                {h.pages.filter((p) => p.section === sec).map((p) => (
                  <li key={p.href} className="px-4 py-2.5">
                    <Link href={p.href} className="font-semibold text-zp-blue hover:underline">{p.label}</Link>
                    {p.help && <p className="text-sm text-ink-2">{p.help}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <Card title="Frequently asked questions" bodyClass="p-0">
            <dl className="divide-y divide-line">
              {FAQS.map(([q, a]) => (
                <div key={q} className="px-4 py-2.5"><dt className="font-semibold text-ink">{q}</dt><dd className="text-sm text-ink-2">{a}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Your approval authority" subtitle="From recorded delegations, never from rank">
            {h.delegations.length ? (
              <ul className="space-y-2 text-sm">
                {h.delegations.map((d, i) => (
                  <li key={i}><span className="font-semibold text-ink">{d.domain}</span><span className="block text-xs text-muted">{d.unit} and units under it · {d.ref}{d.until ? ` · until ${fmtDate(d.until)}` : ""}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">None recorded for you.</p>}
          </Card>
          <Card title="Limits of this role">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">{h.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          </Card>
          <Card title="Account and access support">
            {h.support.length ? (
              <ul className="space-y-2 text-sm">
                {h.support.map((s, i) => <li key={i}><span className="font-semibold text-ink">{s.name}</span><span className="block text-xs text-muted">{s.role} · {s.unit}</span></li>)}
              </ul>
            ) : <p className="text-sm text-muted">Contact System Administrator – HQ Tech.</p>}
            <p className="mt-3 text-xs text-muted">They can issue a temporary password, clear a lockout or end your sessions. Role changes go through HQ.</p>
          </Card>
          <Card title="See also"><p className="text-sm"><Link href="/app/profile" className="text-zp-blue hover:underline">My profile and access</Link> · <Badge status="ACTIVE" label="Synthetic data only" /></p></Card>
        </div>
      </div>
    </>
  );
}
