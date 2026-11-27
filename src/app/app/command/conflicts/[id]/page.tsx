import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getConflict, officesHeld } from "@/server/domain/command";
import { resolveConflictAction } from "@/server/actions/command";
import { Badge, Card, Notice, PageHeader, fmtDateTime } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea } from "@/components/forms";
import { Done } from "../../shared";

export const metadata = { title: "Command conflict" };
const DECISION: Record<string, string> = { A_PRECEDES: "Directive A takes precedence", B_PRECEDES: "Directive B takes precedence", BOTH_STAND: "Both stand (no conflict in practice)", WITHDRAW_A: "Withdraw directive A", WITHDRAW_B: "Withdraw directive B" };

export default async function ConflictPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const c = await loadOr404(() => getConflict(db, actor, id));
  const held = await officesHeld(db, actor);
  const decides = c.status === "OPEN" && !!c.common_superior_position_id && held.some((h) => h.positionId === c.common_superior_position_id && h.actions.includes("RESOLVE_CONFLICT"));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/command/conflicts" className="text-zp-blue hover:underline">← Command conflicts</Link></p>
      <PageHeader eyebrow="Command and reporting" title={`${c.reference} — conflicting tasking`} description={`Both directives are addressed to ${c.recipient_title}.`} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Conflict">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-muted">Status</dt><dd><Badge status={c.status} label={c.status === "OPEN" ? "Open" : "Decided"} /></dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Referred to</dt><dd>{c.superior_title ?? "No common superior configured"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Directive A</dt><dd><Link className="text-zp-blue hover:underline" href={`/app/command/directives/${c.directive_a_id}`}>{c.a_reference}</Link> — {c.a_subject}<br /><span className="text-ink-2">from {c.issuer_a_title}</span></dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Directive B</dt><dd><Link className="text-zp-blue hover:underline" href={`/app/command/directives/${c.directive_b_id}`}>{c.b_reference}</Link> — {c.b_subject}<br /><span className="text-ink-2">from {c.issuer_b_title}</span></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted">Reason ({c.source === "AUTOMATIC" ? "flagged by the system" : "flagged by the receiving office"})</dt><dd className="whitespace-pre-line">{c.reason}</dd></div>
            </dl>
          </Card>
          {c.status === "RESOLVED" && (
            <Card title="Decision">
              <p className="text-sm"><span className="font-semibold">{DECISION[c.decision ?? ""]}</span> — decided by {c.decided_name}{c.decided_authority === "ACTING" ? " (acting)" : ""} as {c.superior_title}, {c.decided_at ? fmtDateTime(c.decided_at) : ""}.</p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{c.decision_note}</p>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {decides ? (
            <Card title="Decide">
              <ActionForm action={resolveConflictAction}>
                <Hidden name="id" value={c.id} />
                <Select label="Decision" name="decision" required options={Object.entries(DECISION).map(([value, label]) => ({ value, label }))} placeholder="Select decision" />
                <TextArea label="Reasons" name="note" required rows={4} maxLength={500} />
                <Submit>Record decision</Submit>
              </ActionForm>
            </Card>
          ) : c.status === "OPEN" ? <Notice tone="info">Awaiting the decision of {c.superior_title ?? "a common superior office (none is configured: the structure must be corrected)"}.</Notice> : null}
        </div>
      </div>
    </>
  );
}
