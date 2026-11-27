import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { addDays, today } from "@/server/domain/core";
import { EVENT_CATEGORIES, schedulableUnits } from "@/server/domain/schedule";
import { createEventAction } from "@/server/actions/admin-records";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextArea, TextField } from "@/components/forms";

export const metadata = { title: "Schedule an administrative event" };

export default async function NewEventPage() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "schedule.manage")) return <AccessDenied what="administrative scheduling" />;
  const units = await schedulableUnits(getDb(), actor);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/calendar" className="text-zp-blue hover:underline">← Administrative calendar</Link></p>
      <PageHeader eyebrow="Module 16 · Administrative scheduling" title="Schedule an administrative event" description="Meetings, deadlines, review appointments, administrative training and records inspections. Do not record locations, patrols, deployments or any operational detail." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ActionForm action={createEventAction}>
            <Select label="Organisation" name="orgUnitId" required options={units} defaultValue={units[0]?.value} hint="Events are visible to authorised users of this organisation and the levels above it." />
            <TextField label="Title" name="title" required maxLength={160} placeholder="e.g. Quarterly personnel records review" />
            <Select label="Category" name="category" required options={Object.entries(EVENT_CATEGORIES).map(([value, label]) => ({ value, label }))} defaultValue="MEETING" />
            <TextField label="Date" name="eventDate" type="date" required defaultValue={addDays(today(), 1)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Start time (optional)" name="startTime" type="time" />
              <TextField label="End time (optional)" name="endTime" type="time" />
            </div>
            <TextArea label="Notes (optional)" name="notes" rows={3} maxLength={600} hint="Administrative purpose only. Text is checked for operational and excluded terms." />
            <Submit>Schedule event</Submit>
          </ActionForm>
        </Card>
        <Notice tone="info">The creator is reminded before the event (platform setting “schedule.reminder_days”). Events can be cancelled with a reason or marked completed; every change is audited.</Notice>
      </div>
    </>
  );
}
