import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { NOTIFICATION_CATEGORIES, today } from "@/server/domain/core";
import { listTasks, taskCounts } from "@/server/domain/tasks";
import { completeTaskAction } from "@/server/actions/notifications";
import { Badge, Card, PageHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit } from "@/components/forms";

export const metadata = { title: "My tasks" };

export default async function Tasks({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const actor = await requireActor();
  const { view = "OPEN" } = await searchParams;
  const v = (["OPEN", "OVERDUE", "DONE"].includes(view) ? view : "OPEN") as "OPEN" | "OVERDUE" | "DONE";
  const db = getDb();
  const [rows, counts] = await Promise.all([listTasks(db, actor, v), taskCounts(db, actor)]);
  const t = today();
  return (
    <>
      <PageHeader eyebrow="Module 13 · Tasks" title="My tasks" description="Administrative tasks created by the automation engine (contribution deadlines, tenure reviews) and by workflows. Tasks close automatically when the underlying matter is resolved." />
      <nav className="mb-3 flex gap-1" aria-label="Task view">
        {[["OPEN", `Open (${counts.open})`], ["OVERDUE", `Overdue (${counts.overdue})`], ["DONE", "Completed"]].map(([k, l]) => <Link key={k} href={`?view=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${v === k ? "bg-zp-green text-white" : "border border-line-2 bg-white text-ink"}`}>{l}</Link>)}
      </nav>
      <Card bodyClass="p-0">
        <Table head={["Task", "Category", "Due", "Status", ""]} empty="No tasks in this view.">
          {rows.map((k) => (
            <tr key={k.id}>
              <td className={td}>{k.link ? <Link href={k.link} className="font-semibold text-zp-blue hover:underline">{k.title}</Link> : <span className="font-semibold">{k.title}</span>}{k.body && <span className="block text-xs text-muted">{k.body}</span>}<span className="block text-[11px] text-muted">Created {fmtDateTime(k.created_at)}</span></td>
              <td className={`${td} text-xs`}>{NOTIFICATION_CATEGORIES[k.category as keyof typeof NOTIFICATION_CATEGORIES] ?? k.category}</td>
              <td className={`${td} ${k.status === "OPEN" && k.due_date && k.due_date < t ? "font-semibold text-err" : ""}`}>{fmtDate(k.due_date)}</td>
              <td className={td}><Badge status={k.status === "DONE" ? "COMPLETED" : k.due_date && k.due_date < t ? "OVERDUE" : "PENDING"} label={k.status === "DONE" ? `done ${fmtDate(k.completed_at)}` : k.due_date && k.due_date < t ? "overdue" : "open"} /></td>
              <td className={td}>{k.status === "OPEN" && <ActionForm action={completeTaskAction} className=""><Hidden name="id" value={k.id} /><Submit variant="secondary">Mark done</Submit></ActionForm>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
