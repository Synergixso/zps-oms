import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { can } from "@/server/domain/policy";
import { EVENT_CATEGORIES, getEvent } from "@/server/domain/schedule";
import { eventStatusAction } from "@/server/actions/admin-records";
import { Badge, Card, DL, PageHeader, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextArea } from "@/components/forms";

export const metadata = { title: "Administrative event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const e = await loadOr404(() => getEvent(getDb(), actor, id));
  const manage = e.status === "SCHEDULED" && can(actor, "schedule.manage", e.org_unit_id);
  const label = { SCHEDULED: "Scheduled", CANCELLED: "Cancelled", COMPLETED: "Completed" }[e.status] ?? e.status;
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/app/calendar?month=${e.event_date.slice(0, 7)}`} className="text-zp-blue hover:underline">← Administrative calendar</Link></p>
      <PageHeader eyebrow={`${EVENT_CATEGORIES[e.category]} · ${e.unit_name}`} title={e.title} description={<Badge status={e.status} label={label} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Event" className="lg:col-span-2">
          <DL items={[
            ["Date", fmtDate(e.event_date)], ["Time", e.start_time ? `${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}` : "All day"],
            ["Organisation", e.unit_name], ["Category", EVENT_CATEGORIES[e.category]], ["Notes", e.notes ?? "—"],
            ["Scheduled by", e.created_by_name], ["Scheduled", fmtDateTime(e.created_at)], ...(e.status_reason ? [["Reason", e.status_reason] as [string, string]] : []),
          ]} />
        </Card>
        <Card title="Actions" subtitle="Offered according to your role and scope; the server re-validates.">
          {!manage ? <p className="text-sm text-muted">{e.status === "SCHEDULED" ? "You can view this event but not change it." : `This event is ${label.toLowerCase()}.`}</p> : (
            <div className="space-y-3">
              <ActionForm action={eventStatusAction}>
                <Hidden name="id" value={e.id} /><Hidden name="status" value="COMPLETED" />
                <Submit variant="secondary">Mark as completed</Submit>
              </ActionForm>
              <ActionForm action={eventStatusAction} className="space-y-2 border-t border-line pt-3">
                <Hidden name="id" value={e.id} /><Hidden name="status" value="CANCELLED" />
                <TextArea label="Reason for cancelling" name="reason" rows={2} maxLength={200} required />
                <Submit variant="danger" confirm="Cancel this event?">Cancel event</Submit>
              </ActionForm>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
