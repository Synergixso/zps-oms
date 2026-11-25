import { PublicHero } from "@/components/public-ui";
export const metadata = { title: "Features" };

const FEATURES: Array<[string, string[]]> = [
  ["Role-specific back offices", ["Dedicated dashboards for national executives, HQ coordinators, provincial commanders, Division Staff Ops, formation commanders and administrative officers.", "Functional workspaces for fleet officers, asset custodians, auditors, platform, security and registry administrators.", "Menus, actions and reports respond to the signed-in user's approved permissions."]],
  ["Organisational scope control", ["Each role assignment is tied to one organisation unit with a validity window.", "No automatic access to another division's or formation's records.", "Changing the organisation structure never grants access by itself."]],
  ["Delegated approvals", ["Approval requires a recorded delegation with an approval reference.", "Self-approval is prevented.", "Multi-level routing is enforced in sequence."]],
  ["Accountability", ["Append-only, hash-chained audit trail of authentication, access changes, approvals, records and exports.", "Time-limited, read-only auditor access.", "Periodic access recertification."]],
  ["Security by design", ["Deny-by-default, server-side authorisation on every action.", "Strict session handling and security headers.", "External integrations and notifications disabled until approved."]],
  ["Accessible, responsive interface", ["Keyboard-operable, labelled forms and visible focus.", "Desktop, tablet and mobile layouts.", "A4 portrait print styles for reports and information pages."]],
];

export default function Features() {
  return (
    <>
    <PublicHero eyebrow="Features" title="Built for accountable administration">Capabilities of the proposed platform. Items are subject to institutional validation and approval.</PublicHero>
    <div className="print-a4 mx-auto max-w-[1180px] px-4 py-12">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([t, items]) => (
          <section key={t} className="rounded-[9px] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold">{t}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-ink-2">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </>
  );
}
