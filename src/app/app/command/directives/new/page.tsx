import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { instructableOffices, DIRECTIVE_CATEGORY, RELATIONSHIP_LABEL } from "@/server/domain/command";
import { issueDirectiveAction } from "@/server/actions/command";
import { Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";
import { COMMAND_BOUNDARY, NoOffice } from "../../shared";

export const metadata = { title: "Issue a directive" };

export default async function NewDirectivePage() {
  const actor = await requireActor();
  const routes = await instructableOffices(getDb(), actor);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/command/directives/issued" className="text-zp-blue hover:underline">← Directives issued</Link></p>
      <PageHeader eyebrow="Command and reporting" title="Issue a directive"
        description="A directive goes to an office directly below yours in a configured relationship; that office assigns it onward to the next level. Instructions never go upward: report upward instead." />
      {!routes.length ? <><NoOffice /><div className="mt-3"><Notice tone="info">If you hold an office, it has no subordinate office you may instruct, or your acting appointment does not include issuing directives.</Notice></div></> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <ActionForm action={issueDirectiveAction}>
              <Select label="From → to" name="route" required placeholder="Select issuing and receiving office"
                options={routes.map((r) => ({ value: `${r.fromPositionId}|${r.toPositionId}`, label: `${r.fromTitle} → ${r.toTitle} (${r.toUnit.replace(/ \(synthetic\)$/, "")}; ${RELATIONSHIP_LABEL[r.type].toLowerCase()})` }))} />
              <Select label="Category" name="category" required options={Object.entries(DIRECTIVE_CATEGORY).map(([value, label]) => ({ value, label }))} defaultValue="ADMIN_INSTRUCTION"
                hint="Administrative coordination allows administrative instructions and operations administrative tasks only." />
              <TextField label="Administrative subject" name="subject" required maxLength={160} />
              <TextArea label="General instructions" name="instructions" required rows={5} maxLength={2000} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Effective date" name="effectiveDate" type="date" defaultValue={today()} />
                <TextField label="Due date (optional)" name="dueDate" type="date" />
              </div>
              <Select label="Acknowledgement" name="ackRequired" options={[{ value: "1", label: "Acknowledgement required" }, { value: "0", label: "No acknowledgement required" }]} defaultValue="1" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Related record (optional)" name="relatedType" placeholder="— None —" options={[{ value: "MANPOWER_REQUEST", label: "Manpower request" }, { value: "ASSIGNMENT", label: "Assignment" }, { value: "TRANSFER", label: "Transfer" }]} />
                <TextField label="Related reference" name="relatedReference" maxLength={40} placeholder="e.g. MPR-2026-000012" hint="Must be within your authorised scope." />
              </div>
              <Submit>Issue directive</Submit>
            </ActionForm>
          </Card>
          <div className="space-y-3"><Notice tone="warn">{COMMAND_BOUNDARY}</Notice><Notice tone="info">The directive is recorded under your actual authority: substantive, or acting with a delegated action.</Notice></div>
        </div>
      )}
    </>
  );
}
