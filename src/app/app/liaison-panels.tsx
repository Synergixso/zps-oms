/**
 * Working panels for the four Police Intelligence Officer liaison workspaces (roles 07, 19, 30, 31).
 * Administrative metadata only, read through the scoped liaison domain functions.
 */
import Link from "next/link";
import { getDb } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { LIAISON_KIND_LABEL, LIAISON_STATUS_LABEL, liaisonFigures, listLiaison, type LiaisonRecord } from "@/server/domain/liaison";
import { type Actor, hasPermission, primaryRole } from "@/server/domain/policy";
import { Badge, ButtonLink, Card, Notice, SectionHeader, Table, td, fmtDate } from "@/components/ui";

export const LIAISON_BOUNDARY_NOTICE =
  "ZPS-OMS records liaison administration metadata only: reference numbers, organisation units, dates, status and routing. It holds no intelligence content, sources, informants, surveillance, targets, collection or tasking, and gives no access to personnel, manpower, roster or assignment registers.";

function Rows({ rows }: { rows: LiaisonRecord[] }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/liaison/records/${r.id}`}>{r.reference}</Link></td>
          <td className={`${td} text-ink-2`}>{LIAISON_KIND_LABEL[r.kind]}</td>
          <td className={td}>{r.holding_name.replace(/ \(synthetic\)$/, "")}</td>
          <td className={td}><Badge status={r.status} label={LIAISON_STATUS_LABEL[r.status]} /></td>
          <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(r.updated_at)}</td>
        </tr>
      ))}
    </>
  );
}

export async function LiaisonPanels({ actor }: { actor: Actor }) {
  const db = getDb();
  const role = primaryRole(actor);
  const tier = role ? ROLE_BY_CODE[role].tier : null;
  const [figures, assigned, queue, awaiting] = await Promise.all([
    liaisonFigures(db, actor),
    listLiaison(db, actor, { view: "assigned" }, 8),
    hasPermission(actor, "liaison.submission.acknowledge") ? listLiaison(db, actor, { view: "incoming" }, 8) : Promise.resolve([]),
    listLiaison(db, actor, { view: "submissions", status: "SUBMITTED" }, 8),
  ]);
  const scopeWord = tier === 1 ? "national" : tier === 2 ? "divisional" : tier === 3 ? "district" : "local";
  return (
    <>
      <SectionHeader title={`${scopeWord.charAt(0).toUpperCase()}${scopeWord.slice(1)} liaison administration`}
        description="Administrative references for which you are responsible, items awaiting receipt or acknowledgement, and the status of submissions from your scope."
        actions={<>{hasPermission(actor, "liaison.audit.view") && <ButtonLink href="/app/liaison/history">History</ButtonLink>}
          {hasPermission(actor, "liaison.metadata.create") && <ButtonLink href="/app/liaison/new" variant="primary">Record a liaison reference</ButtonLink>}</>} />
      <div className="mb-4"><Notice tone="info">{LIAISON_BOUNDARY_NOTICE}</Notice></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Assigned administrative references" subtitle="You are the responsible officer" bodyClass="p-0">
          <Table head={["Reference", "Type", "Held at", "Status", "Updated"]} empty="No reference is assigned to you.">
            <Rows rows={assigned} />
          </Table>
        </Card>
        <Card title="Pending at your offices" subtitle="Awaiting receipt or acknowledgement" bodyClass="p-0">
          <Table head={["Reference", "Type", "Held at", "Status", "Updated"]} empty="Nothing is waiting at offices in your scope.">
            <Rows rows={queue} />
          </Table>
        </Card>
        <Card title="Submissions awaiting receipt elsewhere" subtitle="Submitted from your scope" bodyClass="p-0">
          <Table head={["Reference", "Type", "Held at", "Status", "Updated"]} empty="No submission from your scope is awaiting receipt.">
            <Rows rows={awaiting} />
          </Table>
        </Card>
        <Card title="Status summary" subtitle={tier === 1 ? "Organisational submission summaries (by originating office)" : "Liaison references in your scope"} bodyClass="p-0">
          <Table head={["Status", "References"]} empty="No liaison references yet.">
            {figures && Object.entries(figures.status).filter(([, n]) => n > 0).map(([k, n]) => (
              <tr key={k}><td className={td}><Badge status={k} label={LIAISON_STATUS_LABEL[k]} /></td><td className={`${td} tabular-nums font-semibold`}>{n}</td></tr>
            ))}
          </Table>
          {figures && figures.byOrigin.length > 0 && (
            <div className="border-t border-line">
              <Table head={["Originating office", "References", "Open"]} empty="—">
                {figures.byOrigin.map((o) => (
                  <tr key={o.label}><td className={td}>{o.label}</td><td className={`${td} tabular-nums`}>{o.value}</td><td className={`${td} tabular-nums`}>{o.open}</td></tr>
                ))}
              </Table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
