import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { listConflicts } from "@/server/domain/command";
import { Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Command conflicts" };

export default async function ConflictsPage() {
  const actor = await requireActor();
  const rows = await listConflicts(getDb(), actor);
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title="Command conflicts"
        description="Conflicting tasking from parallel channels is referred to the nearest common superior office, which records a decision. Nothing decides precedence automatically, and acknowledging a parallel report never confers authority to instruct." />
      <Card bodyClass="p-0">
        <Table head={["Reference", "Office receiving both", "Directive A", "Directive B", "Referred to", "Raised by", "Status", "Raised"]} caption="Command conflicts" empty="No conflicts involve your offices.">
          {rows.map((c) => (
            <tr key={c.id}>
              <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/conflicts/${c.id}`}>{c.reference}</Link></td>
              <td className={td}>{c.recipient_title}</td><td className={`${td} text-ink-2`}>{c.a_reference} · {c.issuer_a_title}</td><td className={`${td} text-ink-2`}>{c.b_reference} · {c.issuer_b_title}</td>
              <td className={td}>{c.superior_title ?? "no common superior configured"}</td><td className={`${td} text-ink-2`}>{c.source === "AUTOMATIC" ? "System (same related record)" : "Receiving office"}</td>
              <td className={td}><Badge status={c.status} label={c.status === "OPEN" ? "Open" : "Decided"} /></td><td className={`${td} text-muted`}>{fmtDate(c.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
