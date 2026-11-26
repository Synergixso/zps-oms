import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { canApprove, hasPermission, HQ_ID } from "@/server/domain/policy";
import { listChanges, listOrgUnits } from "@/server/domain/org";
import { decideChangeAction, proposeChangeAction } from "@/server/actions/org";
import { AccessDenied, Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Structure changes" };

export default async function OrgChanges() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "org.view", "org.propose")) return <AccessDenied what="organisational changes" />;
  const db = getDb();
  const changes = await listChanges(db, actor);
  const units = await listOrgUnits(db, actor);
  const unitOpts = units.map((u) => ({ value: u.id, label: u.name }));
  const canPropose = hasPermission(actor, "org.propose");
  const approver = await canApprove(db, actor, "ORG_CHANGE", HQ_ID);
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const common = (
    <>
      <TextArea label="Reason / justification" name="reason" required rows={2} hint="At least 10 characters. Cite the establishment instrument where known." />
      <TextField label="Effective date" name="effectiveDate" type="date" required defaultValue={tomorrow} />
    </>
  );
  return (
    <>
      <PageHeader eyebrow="M01 · Organisation registry" title="Organisational structure changes" description="Propose → approve (separate person with a recorded delegation) → applied on the effective date. Historical relationships are preserved, and no user access is granted by a structural change." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Change register" className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Reference", "Change", "Target / proposed", "Effective", "Proposed by", "Status", ""]} empty="No change proposals.">
            {changes.map((c) => {
              const p = JSON.parse(c.payload) as Record<string, string>;
              const mine = c.proposed_by === actor.userId;
              return (
                <tr key={c.id} className="align-top">
                  <td className={`${td} font-semibold`}>{c.reference}</td>
                  <td className={td}>{c.change_type.replace(/_/g, " ").toLowerCase()}<p className="text-xs text-muted">{c.reason}</p></td>
                  <td className={td}>{c.target_name ?? "New unit"}{p.name ? <p className="text-xs text-ink-2">→ {p.name}</p> : null}{p.parentId ? <p className="text-xs text-ink-2">parent → {units.find((u) => u.id === p.parentId)?.name ?? p.parentId}</p> : null}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(c.effective_date)}</td>
                  <td className={td}>{c.proposer_name}{c.decider_name ? <p className="text-xs text-muted">Decided: {c.decider_name}{c.approval_ref ? ` · ${c.approval_ref}` : ""}</p> : null}</td>
                  <td className={td}><Badge status={c.status} /></td>
                  <td className={`${td} min-w-[220px]`}>
                    {c.status === "SUBMITTED" && approver && !mine && (
                      <ActionForm action={decideChangeAction} className="space-y-2">
                        <Hidden name="id" value={c.id} />
                        <TextField label="Approval reference" name="approvalRef" maxLength={40} hint="Required to approve" />
                        <TextField label="Reason" name="reason" maxLength={200} hint="Required to reject" />
                        <div className="flex gap-2">
                          <Submit name="decision" value="APPROVE">Approve</Submit>
                          <Submit name="decision" value="REJECT" variant="danger">Reject</Submit>
                        </div>
                      </ActionForm>
                    )}
                    {c.status === "SUBMITTED" && mine && <p className="text-xs text-muted">Awaiting a different approver (separation of duties).</p>}
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <div className="space-y-3">
          {!canPropose && <Notice tone="info">You can view the change register. Proposals are made by the Organisational Registry Administrator.</Notice>}
          {canPropose && (
            <>
              <h2 className="text-sm font-bold">Propose a change</h2>
              {[
                ["RENAME_UNIT", "Rename a unit"],
                ["CHANGE_PARENT", "Change reporting relationship"],
                ["CREATE_UNIT", "Create a new unit"],
                ["DEACTIVATE_UNIT", "Deactivate a unit"],
              ].map(([t, label]) => (
                <details key={t} className="rounded-[9px] border border-line bg-white p-3">
                  <summary className="cursor-pointer text-sm font-semibold">{label}</summary>
                  <ActionForm action={proposeChangeAction} className="mt-3 space-y-3" resetOnSuccess>
                    <Hidden name="changeType" value={t} />
                    {t !== "CREATE_UNIT" && <Select label="Target unit" name="targetId" required placeholder="Select" options={unitOpts} />}
                    {t === "CREATE_UNIT" && (
                      <>
                        <TextField label="Code" name="code" required hint="e.g. FM-NEW" />
                        <Select label="Entity type" name="unitType" options={[{ value: "FORMATION", label: "Divisional Unit / formation" }, { value: "PROVINCIAL_DIVISION", label: "Provincial Police Division" }, { value: "HQ_OFFICE", label: "HQ office" }]} />
                      </>
                    )}
                    {(t === "RENAME_UNIT" || t === "CREATE_UNIT") && <TextField label="Official name" name="name" required maxLength={120} />}
                    {(t === "CHANGE_PARENT" || t === "CREATE_UNIT") && <Select label="Reports to / administered by" name="parentId" required placeholder="Select" options={unitOpts} />}
                    {common}
                    <Submit variant="secondary">Submit for approval</Submit>
                  </ActionForm>
                </details>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
