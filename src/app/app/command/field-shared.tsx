/** Shared pieces for the Kamfinsa Mobile Unit field command workspaces (platoon, area, company). */
import Link from "next/link";
import type { Held } from "@/server/domain/command";
import { DIRECTIVE_STATUS, REPORT_CATEGORY, RECIPIENT_STATUS } from "@/server/domain/command";
import { Badge, Card, Notice, Table, td, fmtDate, fmtDateTime } from "@/components/ui";
import { indent } from "@/components/sizing";

export const FIELD_BOUNDARY =
  "Administrative command records only: appointments, attendance status, instructions and reports. No locations, routes, deployments, tactical or intelligence details are recorded here.";

type Holder = { name: string; authority: "SUBSTANTIVE" | "ACTING" };
export const holderText = (h: Holder[]) => (h.length ? h.map((x) => `${x.name}${x.authority === "ACTING" ? " (acting)" : ""}`).join(", ") : "Vacant");

export function NoFieldOffice({ what }: { what: string }) {
  return (
    <Notice tone="info" title={`You do not hold ${what} office`}>
      This workspace follows appointments to offices in the command structure, not roles or ranks. Your account has no current appointment or acting appointment to {what} office.
      See <Link className="text-zp-blue underline" href="/app/command">Command overview</Link> for the offices you hold.
    </Notice>
  );
}

export function OfficePicker({ offices, current, base }: { offices: Held[]; current: string; base: string }) {
  if (offices.length < 2) return null;
  return (
    <nav aria-label="Offices you hold" className="mb-4 flex flex-wrap gap-2">
      {offices.map((o) => (
        <Link key={o.positionId} href={`${base}?office=${encodeURIComponent(o.positionId)}`} aria-current={o.positionId === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${o.positionId === current ? "border-zp-blue bg-zp-blue text-white" : "border-line bg-white text-ink hover:bg-slate-50"}`}>
          {o.title}{o.authority === "ACTING" ? " · acting" : ""}
        </Link>
      ))}
    </nav>
  );
}

export function Superiors({ rows }: { rows: Array<{ positionId: string; title: string; unit: string; kind: "PRIMARY" | "PARALLEL"; relationship: string; channel: string | null; holders: Holder[] }> }) {
  return (
    <Table head={["Office", "Recipient", "Relationship / channel", "Holder"]} caption="Reporting line" empty="This office has no superior (highest authority).">
      {rows.map((r) => (
        <tr key={`${r.positionId}-${r.kind}`}>
          <td className={td}><span className="font-semibold">{r.title}</span><span className="block text-xs text-muted">{r.unit}</span></td>
          <td className={td}><Badge status={r.kind === "PRIMARY" ? "ACTIVE" : "PENDING"} label={r.kind === "PRIMARY" ? "Primary" : "Parallel"} /></td>
          <td className={`${td} text-ink-2`}>{r.relationship}{r.channel ? ` · ${r.channel}` : ""}</td>
          <td className={td}>{holderText(r.holders)}</td>
        </tr>
      ))}
    </Table>
  );
}

export function Chain({ rows }: { rows: Array<{ positionId: string; title: string; typeLabel: string; unit: string; depth: number; holders: Holder[] }> }) {
  return (
    <Table head={["Office", "Appointment type", "Unit", "Holder"]} caption="Offices under command" empty="No offices are configured under this office.">
      {rows.map((r) => (
        <tr key={r.positionId}>
          <td className={`${td} ${indent(r.depth - 1, 16)}`}>{r.depth > 1 && <span className="mr-1 text-muted" aria-hidden>└</span>}<span className="font-semibold">{r.title}</span></td>
          <td className={`${td} text-ink-2`}>{r.typeLabel}</td><td className={`${td} text-ink-2`}>{r.unit}</td><td className={td}>{holderText(r.holders)}</td>
        </tr>
      ))}
    </Table>
  );
}

export function PendingReports({ rows }: { rows: Array<{ report_id: string; reference: string; category: string; reporter: string; submitted: string; recipient_status: string; recipient_kind: string }> }) {
  return (
    <Card title="Reports awaiting this office" subtitle="Acknowledge, review, forward or return them on the report page" bodyClass="p-0">
      <Table head={["Reference", "From", "Category", "As", "Status", "Submitted"]} caption="Reports awaiting this office" empty="No reports are waiting.">
        {rows.map((r) => (
          <tr key={r.report_id}>
            <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/reports/${r.report_id}`}>{r.reference}</Link></td>
            <td className={td}>{r.reporter}</td><td className={`${td} text-ink-2`}>{REPORT_CATEGORY[r.category as keyof typeof REPORT_CATEGORY] ?? r.category}</td>
            <td className={`${td} text-ink-2`}>{r.recipient_kind === "PRIMARY" ? "Primary" : "Parallel"}</td>
            <td className={td}><Badge status={r.recipient_status} label={RECIPIENT_STATUS[r.recipient_status]} /></td><td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(r.submitted)}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

export function OpenDirectives({ rows }: { rows: Array<{ id: string; reference: string; subject: string; status: string; due_date: string | null; direction: "RECEIVED" | "ISSUED"; counterpart: string }> }) {
  return (
    <Card title="Open instructions" subtitle="Received from above and issued below" bodyClass="p-0">
      <Table head={["Reference", "Subject", "Direction", "Status", "Due"]} caption="Open instructions" empty="No open instructions.">
        {rows.map((d) => (
          <tr key={d.id}>
            <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/command/directives/${d.id}`}>{d.reference}</Link></td>
            <td className={td}>{d.subject}</td><td className={`${td} text-ink-2`}>{d.direction === "RECEIVED" ? `From ${d.counterpart}` : `To ${d.counterpart}`}</td>
            <td className={td}><Badge status={d.status} label={DIRECTIVE_STATUS[d.status]} /></td><td className={`${td} text-muted`}>{d.due_date ? fmtDate(d.due_date) : "—"}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
