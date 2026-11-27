import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { hasPermission } from "@/server/domain/policy";
import { calendar, type CalendarItem } from "@/server/domain/schedule";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Administrative calendar" };

const KIND_LABEL: Record<CalendarItem["kind"], string> = {
  EVENT: "Event", ASSIGNMENT_REVIEW: "Assignment review", CONTRIBUTION_DEADLINE: "Contribution deadline", TASK: "My task", CORRESPONDENCE_FOLLOW_UP: "Correspondence follow-up",
};
const KIND_TONE: Record<CalendarItem["kind"], string> = {
  EVENT: "border-l-zp-green", ASSIGNMENT_REVIEW: "border-l-zp-blue", CONTRIBUTION_DEADLINE: "border-l-[#a84a05]", TASK: "border-l-slate-400", CORRESPONDENCE_FOLLOW_UP: "border-l-[#6b3fa0]",
};

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10), prev: shift(-1), next: shift(1),
    label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "schedule.view")) return <AccessDenied what="the administrative calendar" />;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today().slice(0, 7);
  const b = monthBounds(month);
  const items = await calendar(getDb(), actor, b.from, b.to);
  const days = new Map<string, CalendarItem[]>();
  for (const i of items) days.set(i.date, [...(days.get(i.date) ?? []), i]);
  const t = today();
  return (
    <>
      <PageHeader eyebrow="Module 16 · Administrative scheduling" title="Administrative calendar"
        description="Non-sensitive administrative events for your units, with review dates, contribution deadlines, your tasks and correspondence follow-ups drawn from the registers you can see. Operational, patrol or deployment scheduling is not recorded here."
        actions={hasPermission(actor, "schedule.manage") ? <ButtonLink href="/app/calendar/new" variant="primary">Schedule an event</ButtonLink> : undefined} />
      <Card>
        <nav aria-label="Month" className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link href={`/app/calendar?month=${b.prev}`} className="text-sm font-semibold text-zp-blue hover:underline">← Previous month</Link>
          <h2 className="text-base font-bold text-ink" aria-live="polite">{b.label}</h2>
          <span className="flex gap-3">
            {month !== t.slice(0, 7) && <Link href="/app/calendar" className="text-sm font-semibold text-zp-blue hover:underline">This month</Link>}
            <Link href={`/app/calendar?month=${b.next}`} className="text-sm font-semibold text-zp-blue hover:underline">Next month →</Link>
          </span>
        </nav>
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Key">
          {(Object.keys(KIND_LABEL) as CalendarItem["kind"][]).map((k) => <li key={k} className={`border-l-4 pl-2 ${KIND_TONE[k]}`}>{KIND_LABEL[k]}</li>)}
        </ul>
        {items.length === 0 ? (
          <Notice>Nothing is scheduled or due in {b.label} within your authorised scope.</Notice>
        ) : (
          <ol className="space-y-4">
            {[...days.entries()].map(([d, list]) => (
              <li key={d}>
                <h3 className={`mb-1.5 text-sm font-bold ${d === t ? "text-zp-green" : "text-ink"}`}>
                  {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{d === t ? " · Today" : d < t ? " · Past" : ""}
                </h3>
                <ul className="space-y-1.5">
                  {list.map((i, n) => (
                    <li key={`${i.href}-${n}`} className={`flex flex-wrap items-start justify-between gap-2 rounded-md border border-l-4 border-line bg-white px-3 py-2 ${KIND_TONE[i.kind]}`}>
                      <div className="min-w-0">
                        <Link href={i.href} className="text-sm font-semibold text-ink hover:underline">{i.time ? `${i.time} · ` : ""}{i.title}</Link>
                        <p className="text-xs text-ink-2">{KIND_LABEL[i.kind]} · {i.detail}</p>
                      </div>
                      {i.status && i.kind === "EVENT" && i.status !== "SCHEDULED" && <Badge status={i.status} label={i.status === "COMPLETED" ? "Completed" : i.status} />}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-xs text-muted">{items.length} item(s) in {b.label}, from {fmtDate(b.from)} to {fmtDate(b.to)}.</p>
      </Card>
    </>
  );
}
