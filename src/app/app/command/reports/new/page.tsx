import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb, one } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { designatedRecipients, officesHeld, PROGRESS, REPORT_CATEGORY } from "@/server/domain/command";
import { createReportAction } from "@/server/actions/command";
import { Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { COMMAND_BOUNDARY, NoOffice } from "../../shared";

export const metadata = { title: "New status report" };

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ directive?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { directive } = await searchParams;
  const held = (await officesHeld(db, actor)).filter((h) => h.actions.includes("SUBMIT_REPORT"));
  // A report on a directive comes from the office that received it; the domain re-checks this.
  const dir = directive ? await one<{ id: string; reference: string; recipient_position_id: string }>(db, "SELECT id, reference, recipient_position_id FROM command_directives WHERE id = ?", directive) : undefined;
  const offices = dir ? held.filter((h) => h.positionId === dir.recipient_position_id) : held;
  const recipients = await Promise.all(offices.map(async (h) => {
    const r = await designatedRecipients(db, h.positionId);
    const titles = async (ids: string[]) => ids.length ? (await Promise.all(ids.map((id) => one<{ title: string }>(db, "SELECT title FROM command_positions WHERE id = ?", id)))).map((x) => x?.title).join(", ") : "none";
    return { office: h.title, primary: await titles(r.primary.map((x) => x.superior_position_id)), parallel: await titles(r.parallel.map((x) => x.superior_position_id)) };
  }));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/command/reports/submitted" className="text-zp-blue hover:underline">← Reports submitted</Link></p>
      <PageHeader eyebrow="Command and reporting" title="New status report"
        description="A report goes to your office's designated superior and to any parallel recipients configured for it, as one report with one reference. You cannot choose to skip the designated superior." />
      {!offices.length ? <NoOffice /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <ActionForm action={createReportAction}>
              {dir && <Hidden name="directiveId" value={dir.id} />}
              <Select label="Reporting office" name="positionId" required options={offices.map((h) => ({ value: h.positionId, label: `${h.title}${h.authority === "ACTING" ? " (acting)" : ""}` }))} defaultValue={offices[0]?.positionId} />
              {dir && <p className="text-sm text-ink-2">On directive <span className="font-mono">{dir.reference}</span></p>}
              <Select label="Category" name="category" required options={Object.entries(REPORT_CATEGORY).map(([value, label]) => ({ value, label }))} defaultValue={dir ? "PROGRESS" : "STATUS"} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Reporting date" name="reportingDate" type="date" defaultValue={today()} />
                <TextField label="Period from (optional)" name="periodFrom" type="date" />
                <TextField label="Period to (optional)" name="periodTo" type="date" />
              </div>
              <TextArea label="General administrative summary" name="summary" required rows={5} maxLength={2000} />
              <Select label="Progress status" name="progressStatus" required options={Object.entries(PROGRESS).map(([value, label]) => ({ value, label }))} defaultValue="ON_TRACK" />
              <TextArea label="Outstanding administrative matters (optional)" name="outstanding" rows={3} maxLength={1000} />
              <TextField label="Supporting administrative references (optional)" name="supportingRefs" maxLength={200} placeholder="e.g. MPR-2026-000012, CORR-2026-000004" />
              <Select label="When saved" name="submitNow" options={[{ value: "1", label: "Submit now to the designated recipients" }, { value: "0", label: "Save as draft" }]} defaultValue="1" />
              <Submit>Save report</Submit>
            </ActionForm>
          </Card>
          <div className="space-y-3">
            <Card title="Who receives it">
              <ul className="space-y-2 text-sm">{recipients.map((r) => <li key={r.office}><span className="font-semibold">{r.office}</span><br />Primary: {r.primary}<br />Parallel: {r.parallel}</li>)}</ul>
            </Card>
            <Notice tone="warn">{COMMAND_BOUNDARY}</Notice>
          </div>
        </div>
      )}
    </>
  );
}
