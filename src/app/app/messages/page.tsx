import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import { CONTACT_SUBJECTS, listContactMessages } from "@/server/domain/contact";
import { markContactHandledAction } from "@/server/actions/contact";
import { AccessDenied, Badge, Card, PageHeader, Notice, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Contact messages" };

export default async function Messages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "contact.view")) return <AccessDenied what="contact messages" />;
  const { status } = await searchParams;
  const filter = status === "HANDLED" || status === "NEW" ? status : undefined;
  const rows = await listContactMessages(getDb(), actor, filter);
  const canManage = hasPermission(actor, "contact.manage");
  const tab = (s: string | undefined, label: string) => (
    <Link
      href={s ? `/app/messages?status=${s}` : "/app/messages"}
      aria-current={filter === s ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold ${filter === s ? "bg-zp-blue text-white" : "border border-line-2 bg-white text-ink hover:bg-slate-50"}`}
    >
      {label}
    </Link>
  );
  return (
    <>
      <PageHeader
        eyebrow="Public Contact page"
        title="Contact messages"
        description="Messages submitted through the public Contact page. Treat sender details as personal data; reply through official channels."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {tab(undefined, "All")}
        {tab("NEW", "New")}
        {tab("HANDLED", "Handled")}
      </div>
      {rows.length === 0 ? (
        <Notice>No messages{filter ? ` with status "${filter.toLowerCase()}"` : ""}.</Notice>
      ) : (
        <div className="space-y-4">
          {rows.map((m) => (
            <Card
              key={m.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {m.reference} · {CONTACT_SUBJECTS[m.subject]} <Badge status={m.status === "NEW" ? "PENDING" : "COMPLETED"} label={m.status === "NEW" ? "New" : "Handled"} />
                </span>
              }
              subtitle={`Received ${fmtDateTime(m.created_at)}`}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-sm">
                    <strong>{m.full_name}</strong> ·{" "}
                    <a className="text-zp-blue hover:underline" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.reference}`)}`}>
                      {m.email}
                    </a>
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{m.message}</p>
                  {m.status === "HANDLED" && (
                    <p className="mt-3 text-xs text-muted">
                      Handled by {m.handled_by_name} on {fmtDateTime(m.handled_at)}
                      {m.handled_note ? ` — ${m.handled_note}` : ""}
                    </p>
                  )}
                </div>
                {m.status === "NEW" && canManage && (
                  <ActionForm action={markContactHandledAction} className="space-y-2 rounded-md border border-line p-3">
                    <Hidden name="id" value={m.id} />
                    <TextField label="Note (optional)" name="note" maxLength={500} />
                    <Submit variant="secondary">Mark as handled</Submit>
                  </ActionForm>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
