import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { all, getDb } from "@/server/db/connection";
import { markAllReadAction } from "@/server/actions/notifications";
import { Card, Notice, PageHeader, fmtDateTime, btnSecondary } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const actor = await requireActor();
  const rows = await all<{ id: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null }>(
    getDb(),
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200",
    actor.userId,
  );
  return (
    <>
      <PageHeader eyebrow="M09 · Notifications" title="Notifications" description="In-app notifications only. Email, SMS and other external channels are disabled until separately approved."
        actions={<form action={markAllReadAction}><button className={btnSecondary}>Mark all as read</button></form>} />
      <Card bodyClass="p-0">
        {rows.length === 0 ? (
          <div className="p-6"><Notice>No notifications.</Notice></div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read_at ? "" : "bg-info-bg/40"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-slate-300" : "bg-zp-blue"}`} aria-label={n.read_at ? "Read" : "Unread"} />
                <div className="min-w-0 flex-1">
                  {n.link ? <Link href={n.link} className="text-sm font-semibold text-ink hover:underline">{n.title}</Link> : <p className="text-sm font-semibold">{n.title}</p>}
                  {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
                </div>
                <time className="whitespace-nowrap text-xs text-muted">{fmtDateTime(n.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
