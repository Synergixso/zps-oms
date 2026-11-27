import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { all, getDb } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { structure, POSITION_TYPES, RELATIONSHIP_LABEL } from "@/server/domain/command";
import { addRelationshipAction, appointAction } from "@/server/actions/command";
import { AccessDenied, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Command structure" };

export default async function StructurePage() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "command.structure.view")) return <AccessDenied what="the command structure" />;
  const db = getDb();
  const s = await structure(db, actor);
  const title = Object.fromEntries(s.positions.map((p) => [p.id, p.title]));
  const users = s.canManage ? await all<{ value: string; label: string }>(db, "SELECT id AS value, display_name AS label FROM users WHERE status = 'ACTIVE' ORDER BY display_name LIMIT 500") : [];
  const ig = s.positions.find((p) => p.position_type === "IG");
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title="Command structure"
        description="Offices (positions), who holds them, and the relationships between them. Rank, office, command appointment and application role are separate: the proposed office-to-role correspondence is recorded for institutional validation and confers nothing by itself." />
      <div className="mb-4 space-y-3">
        {ig && <Notice tone="info">The <span className="font-semibold">Inspector General of Police</span> is the highest command authority and has no superior office. DIG Operations reports to the IG. DIG Administration and DIG Special Duties are subordinate to the IG and have no relationships in the Operations chain.</Notice>}
        <Notice tone="warn">The relationships shown are synthetic configuration for review. Precedence, channels and office-to-role mappings require formal institutional validation (DEC-075).</Notice>
      </div>
      <Card title={`Offices (${s.positions.length})`} bodyClass="p-0" className="mb-4">
        <Table head={["Office", "Type", "Unit", "Indicative rank", "Holder", "Proposed application role"]} caption="Command offices">
          {s.positions.map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.title}</td><td className={`${td} text-ink-2`}>{POSITION_TYPES[p.position_type]?.label ?? p.position_type}</td><td className={`${td} text-ink-2`}>{p.unit}</td>
              <td className={`${td} text-ink-2`}>{POSITION_TYPES[p.position_type]?.rank ?? "—"}</td><td className={td}>{p.holder ?? <span className="text-muted">vacant</span>}</td>
              <td className={`${td} text-ink-2`}>{p.mapped_role_code ? `${ROLE_BY_CODE[p.mapped_role_code as keyof typeof ROLE_BY_CODE]?.name ?? p.mapped_role_code}${p.mapping_validated ? "" : " (to be validated)"}` : POSITION_TYPES[p.position_type]?.appointmentOnly ? "none: appointment-only rank (DEC-076)" : POSITION_TYPES[p.position_type]?.mappingNote ? <span title={POSITION_TYPES[p.position_type]!.mappingNote}>not mapped: to be decided by the Service</span> : "none"}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title={`Relationships (${s.relationships.length})`} bodyClass="p-0" className="mb-4">
        <Table head={["Office", "Relationship", "Superior office", "Channel", "Since", "Authorising reference"]} caption="Reporting relationships">
          {s.relationships.map((r) => (
            <tr key={r.id}><td className={td}>{title[r.subordinate_position_id] ?? r.subordinate_position_id}</td><td className={td}>{RELATIONSHIP_LABEL[r.relationship_type]}</td>
              <td className={td}>{title[r.superior_position_id] ?? r.superior_position_id}</td><td className={`${td} text-ink-2`}>{r.channel ?? "—"}</td>
              <td className={`${td} text-muted`}>{fmtDate(r.valid_from)}</td><td className={`${td} font-mono text-xs`}>{r.authorising_ref}</td></tr>
          ))}
        </Table>
      </Card>
      {s.canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Add a relationship" subtitle="Loops and a second primary command superior are refused">
            <ActionForm action={addRelationshipAction} resetOnSuccess>
              <Select label="Office" name="subordinatePositionId" required options={s.positions.map((p) => ({ value: p.id, label: p.title }))} placeholder="Select office" />
              <Select label="Relationship" name="relationshipType" required options={Object.entries(RELATIONSHIP_LABEL).map(([value, label]) => ({ value, label }))} />
              <Select label="Superior office" name="superiorPositionId" required options={s.positions.map((p) => ({ value: p.id, label: p.title }))} placeholder="Select office" />
              <TextField label="Channel (optional)" name="channel" maxLength={60} />
              <TextField label="Authorising reference" name="authorisingRef" required maxLength={60} />
              <Submit>Record relationship</Submit>
            </ActionForm>
          </Card>
          <Card title="Appoint to an office" subtitle="The previous appointment ends; history is kept">
            <ActionForm action={appointAction} resetOnSuccess>
              <Select label="Office" name="positionId" required options={s.positions.map((p) => ({ value: p.id, label: p.title }))} placeholder="Select office" />
              <Select label="Officer" name="userId" required options={users} placeholder="Select officer" />
              <TextField label="Authorising reference" name="authorisingRef" required maxLength={60} />
              <Submit>Record appointment</Submit>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
