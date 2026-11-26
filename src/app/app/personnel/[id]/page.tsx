import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can, hasPermission } from "@/server/domain/policy";
import { DISPOSITIONS, EMPLOYMENT_LABEL, EMPLOYMENT_STATUSES, MANUAL_DISPOSITIONS, eligibilityOf, personnelDetail, ranks } from "@/server/domain/personnel";
import { ASSIGNMENT_STATUS_LABEL } from "@/server/domain/assignments";
import { scopedUnits, unitOptions } from "@/server/domain/lookup";
import { dispositionAction, homeUnitAction, updatePersonnelAction, verifyPersonnelAction } from "@/server/actions/personnel";
import { today } from "@/server/domain/core";
import { AccessDenied, Badge, ButtonLink, Card, DL, Notice, PageHeader, Table, Timeline, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Officer record" };

export default async function PersonnelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!(await pageAllowed(actor, "personnel.view"))) return <AccessDenied what="personnel records" />;
  const db = getDb();
  const { person: p, memberships, history, dispositions, assignments } = await loadOr404(() => personnelDetail(db, actor, id));
  const canEdit = can(actor, "personnel.edit", p.home_unit_id);
  const canVerify = can(actor, "personnel.verify", p.home_unit_id) && p.created_by !== actor.userId;
  const canDisp = can(actor, "disposition.change", p.home_unit_id);
  const elig = await eligibilityOf(db, id);
  const [rankList, units] = canEdit ? await Promise.all([ranks(db), scopedUnits(db, actor, "personnel.edit")]) : [[], []];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/personnel" className="text-zp-blue hover:underline">← Personnel register</Link></p>
      <PageHeader
        eyebrow={`${p.personnel_ref} · ${p.service_number}`}
        title={`${p.rank_name} ${p.surname}, ${p.first_names}`}
        description={<span className="flex flex-wrap gap-2"><Badge status={p.disposition_status} label={DISPOSITIONS[p.disposition_status]} /><Badge status={p.verification_status === "VERIFIED" ? "APPROVED" : "PENDING"} label={p.verification_status.toLowerCase()} /></span>}
        actions={hasPermission(actor, "assignment.propose") && elig.eligible ? <ButtonLink href={`/app/assignments/new?personnel=${p.id}`} variant="primary">Propose assignment</ButtonLink> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Registry record">
            <DL items={[
              ["Personnel reference", p.personnel_ref], ["Service number", p.service_number], ["Rank", p.rank_name], ["Home unit", p.home_unit_name],
              ["Employment status", EMPLOYMENT_LABEL[p.employment_status]], ["Disposition", DISPOSITIONS[p.disposition_status]],
              ["Eligibility for selection", elig.eligible ? "Eligible" : elig.reasons.join("; ")], ["Eligibility note", p.eligibility_note ?? "—"],
              ["Created", fmtDateTime(p.created_at)], ["Last modified", fmtDateTime(p.updated_at)], ["Verified", p.verified_at ? fmtDateTime(p.verified_at) : "Not verified"], ["Record version", String(p.version)],
            ]} />
          </Card>
          <Card title="Assignment history" bodyClass="p-0">
            <Table head={["Reference", "Operational area", "Commenced", "Continuous from", "Review", "Status"]} empty="No assignments recorded.">
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className={`${td} font-mono text-xs`}><Link href={`/app/assignments/${a.id}`} className="text-zp-blue hover:underline">{a.reference}</Link></td>
                  <td className={td}>{a.area_name}</td>
                  <td className={td}>{fmtDate(a.commencement_date)}</td>
                  <td className={td}>{fmtDate(a.continuous_start_date)}</td>
                  <td className={td}>{a.ended_on ? `Ended ${fmtDate(a.ended_on)}` : fmtDate(a.review_date)}</td>
                  <td className={td}><Badge status={a.status} label={`${ASSIGNMENT_STATUS_LABEL[a.status] ?? a.status}${a.close_reason ? ` (${a.close_reason.toLowerCase()})` : ""}`} /></td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Disposition history">
            <Timeline items={dispositions.map((d) => ({ key: String(d.seq), title: `${d.previous_status ? DISPOSITIONS[d.previous_status as keyof typeof DISPOSITIONS] ?? d.previous_status : "—"} → ${DISPOSITIONS[d.new_status as keyof typeof DISPOSITIONS] ?? d.new_status}`, meta: `Effective ${fmtDate(d.effective_date)} · ${d.actor_name ?? "System"} · ${fmtDateTime(d.created_at)}${d.reference ? ` · ${d.reference}` : ""}`, body: d.reason }))} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Home-unit membership" bodyClass="p-0">
              <Table head={["Unit", "From", "To"]}>{memberships.map((m) => <tr key={m.id}><td className={td}>{m.org_name}<span className="block text-xs text-muted">{m.reason}</span></td><td className={td}>{fmtDate(m.valid_from)}</td><td className={td}>{m.valid_to ? fmtDate(m.valid_to) : "Current"}</td></tr>)}</Table>
            </Card>
            <Card title="Record modification history" bodyClass="p-0">
              <Table head={["Change", "By", "When"]}>{history.map((h) => <tr key={h.seq}><td className={td}><span className="font-semibold">{h.field.replace(/_/g, " ")}</span>{h.old_value || h.new_value ? <span className="block text-xs text-muted">{h.old_value ?? "—"} → {h.new_value ?? "—"}</span> : null}{h.reason && <span className="block text-xs text-ink-2">{h.reason}</span>}</td><td className={td}>{h.actor_name ?? "—"}</td><td className={td}>{fmtDate(h.created_at)}</td></tr>)}</Table>
            </Card>
          </div>
        </div>
        <div className="space-y-4">
          {canVerify && p.verification_status !== "VERIFIED" && (
            <Card title="Verify record" subtitle="Must be someone other than the registering officer">
              <ActionForm action={verifyPersonnelAction}>
                <Hidden name="id" value={p.id} />
                <Select label="Decision" name="decision" options={[{ value: "VERIFIED", label: "Verified against source records" }, { value: "REJECTED", label: "Could not be verified" }]} />
                <TextField label="Note" name="note" />
                <Submit>Record verification</Submit>
              </ActionForm>
            </Card>
          )}
          {canEdit && (
            <Card title="Correct details" subtitle="Identity changes return the record to unverified">
              <ActionForm action={updatePersonnelAction}>
                <Hidden name="id" value={p.id} />
                <Hidden name="version" value={String(p.version)} />
                <TextField label="Surname" name="surname" defaultValue={p.surname} required />
                <TextField label="First name(s)" name="firstNames" defaultValue={p.first_names} required />
                <Select label="Rank" name="rankCode" defaultValue={p.rank_code} options={rankList.map((r) => ({ value: r.code, label: r.name }))} />
                <Select label="Employment status" name="employmentStatus" defaultValue={p.employment_status} options={EMPLOYMENT_STATUSES.map((s) => ({ value: s, label: EMPLOYMENT_LABEL[s] }))} />
                <TextField label="Eligibility note" name="eligibilityNote" defaultValue={p.eligibility_note ?? ""} />
                <TextField label="Reason for correction" name="reason" required />
                <Submit>Save correction</Submit>
              </ActionForm>
            </Card>
          )}
          {canEdit && (
            <Card title="Change home unit" subtitle="Effective-dated; the officer remains one record">
              <ActionForm action={homeUnitAction} resetOnSuccess>
                <Hidden name="id" value={p.id} />
                <Select label="New home unit" name="newUnitId" required placeholder="Select unit" options={unitOptions(units).filter((u) => u.value !== p.home_unit_id)} />
                <TextField label="Effective date" name="effectiveDate" type="date" defaultValue={today()} required />
                <TextField label="Reason and authority" name="reason" required placeholder="e.g. posting order reference" />
                <Submit>Record change</Submit>
              </ActionForm>
            </Card>
          )}
          {canDisp && (
            <Card title="Disposition status" subtitle="Assignment statuses change through the assignment workflow">
              <ActionForm action={dispositionAction} resetOnSuccess>
                <Hidden name="id" value={p.id} />
                <Select label="New status" name="status" options={MANUAL_DISPOSITIONS.map((d) => ({ value: d, label: DISPOSITIONS[d] }))} />
                <TextField label="Effective date" name="effectiveDate" type="date" defaultValue={today()} />
                <TextField label="Reason" name="reason" required />
                <Submit variant="secondary">Record status</Submit>
              </ActionForm>
            </Card>
          )}
          {!canEdit && !canVerify && !canDisp && <Notice tone="info">You have read-only access to this record.</Notice>}
        </div>
      </div>
    </>
  );
}
