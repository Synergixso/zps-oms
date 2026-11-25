import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getOrgUnit, relationshipHistory, UNIT_TYPE_LABEL } from "@/server/domain/org";
import { AccessDenied, Badge, Card, DL, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";

export const metadata = { title: "Organisation" };

export default async function OrgDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!pageAllowed(actor, "org.view")) return <AccessDenied />;
  const db = getDb();
  const u = loadOr404(() => getOrgUnit(db, actor, id));
  const hist = relationshipHistory(db, actor, id);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/org" className="text-zp-blue hover:underline">← Organisation directory</Link></p>
      <PageHeader eyebrow={`${u.code} · ${UNIT_TYPE_LABEL[u.unit_type]}`} title={u.name} description={<Badge status={u.status} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Organisation record">
          <DL items={[["Stable identifier", <span key="i" className="font-mono text-xs">{u.id}</span>], ["Code", u.code], ["Entity type", UNIT_TYPE_LABEL[u.unit_type]], ["Current parent", u.parent_name ?? "—"], ["Effective from", fmtDate(u.effective_from)], ["Effective to", fmtDate(u.effective_to)], ["Approval reference", u.approval_ref ?? "Not yet approved (synthetic baseline)"]]} />
          {u.validation_note && <div className="mt-4"><Notice tone="warn">{u.validation_note}</Notice></div>}
        </Card>
        <Card title="Reporting relationship history" subtitle="Effective-dated; historical relationships are end-dated, never deleted" bodyClass="p-0">
          <Table head={["Parent", "Relationship", "From", "To", "Approval ref"]} empty="No relationships (root).">
            {hist.map((h) => (
              <tr key={h.id}><td className={td}>{h.parent_name}</td><td className={td}>{h.relationship.replace("_", " ").toLowerCase()}</td><td className={td}>{fmtDate(h.effective_from)}</td><td className={td}>{h.effective_to ? fmtDate(h.effective_to) : <Badge status="ACTIVE" label="Current" />}</td><td className={`${td} font-mono text-xs`}>{h.approval_ref ?? "—"}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
