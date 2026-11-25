import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Help" };

export default async function Help() {
  await requireActor();
  const faqs: Array<[string, React.ReactNode]> = [
    ["Why can't I see another division's records?", "Access is limited to the organisation named on your role assignment. Cross-division access is never automatic."],
    ["Why can't I approve a request?", "Approval requires a recorded delegation for that organisation and category, plus an active business role there. You can never approve a request you prepared."],
    ["How do I correct a returned request?", "Open the request, edit the fields in 'Correct and resubmit', save, then use 'Submit for review'."],
    ["Can a closed request be changed?", "No. A closed request can only be reopened through the controlled reopening action with a justification; its prior history is kept."],
    ["What must never be entered?", "Real personal data, service numbers, vehicle registrations, operational, tactical, intelligence, case or armoury information."],
    ["Where can I see my access?", <Link key="p" href="/app/profile" className="text-zp-blue hover:underline">My profile and access</Link>],
  ];
  return (
    <>
      <PageHeader eyebrow="Help" title="Using ZPS-OMS" description="Guidance for the local synthetic prototype." />
      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map(([q, a]) => (
          <Card key={q} title={q}><p className="text-sm text-ink-2">{a}</p></Card>
        ))}
      </div>
    </>
  );
}
