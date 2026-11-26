import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { NOTIFICATION_CATEGORIES } from "@/server/domain/core";
import { listNotifications, preferences } from "@/server/domain/tasks";
import { markAllReadAction, markReadAction, preferencesAction } from "@/server/actions/notifications";
import { Card, Notice, PageHeader, fmtDateTime, btnSecondary } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "Notifications" };

export default async function Notifications({ searchParams }: { searchParams: Promise<{ category?: string; unread?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const db = getDb();
  const [rows, prefs] = await Promise.all([listNotifications(db, actor, sp.category, sp.unread === "1"), preferences(db, actor)]);
  const chip = (href: string, label: string, active: boolean) => <Link key={href} href={href} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{label}</Link>;
  return (
    <>
      <PageHeader
        eyebrow="Module 13 · Notifications"
        title="Notifications centre"
        description="In-application notifications and automated reminders. Email, SMS and other external channels are disabled until separately approved."
        actions={<><Link href="/app/tasks" className={btnSecondary}>My tasks</Link><form action={markAllReadAction}><button className={btnSecondary}>Mark all as read</button></form></>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <nav aria-label="Filter notifications" className="mb-3 flex flex-wrap gap-1.5">
            {chip("/app/notifications", "All", !sp.category && sp.unread !== "1")}
            {chip("/app/notifications?unread=1", "Unread", sp.unread === "1")}
            {Object.entries(NOTIFICATION_CATEGORIES).map(([k, v]) => chip(`/app/notifications?category=${k}`, v, sp.category === k))}
          </nav>
          <Card bodyClass="p-0">
            {rows.length === 0 ? (
              <div className="p-6"><Notice>No notifications in this view.</Notice></div>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((n) => (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read_at ? "" : "bg-info-bg/40"}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-slate-300" : "bg-zp-blue"}`} aria-label={n.read_at ? "Read" : "Unread"} />
                    <div className="min-w-0 flex-1">
                      {n.link ? <Link href={n.link} className="text-sm font-semibold text-ink hover:underline">{n.title}</Link> : <p className="text-sm font-semibold">{n.title}</p>}
                      {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-muted">{NOTIFICATION_CATEGORIES[n.category as keyof typeof NOTIFICATION_CATEGORIES] ?? n.category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <time className="whitespace-nowrap text-xs text-muted">{fmtDateTime(n.created_at)}</time>
                      {!n.read_at && <form action={markReadAction}><input type="hidden" name="id" value={n.id} /><button className="text-[11px] font-semibold text-zp-blue hover:underline">Mark read</button></form>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Notification preferences" subtitle="Decisions on your own work and account notices always arrive">
          <ActionForm action={preferencesAction}>
            <ul className="space-y-2">
              {prefs.map((p) => (
                <li key={p.category}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="enabled" value={p.category} defaultChecked={p.enabled} disabled={!p.optional} className="h-4 w-4 accent-zp-green" />
                    {p.label}{!p.optional && <span className="text-xs text-muted">(always on)</span>}
                  </label>
                </li>
              ))}
            </ul>
            <Submit variant="secondary">Save preferences</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
