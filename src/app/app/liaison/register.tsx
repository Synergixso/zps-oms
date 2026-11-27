/**
 * The liaison register, shown as the directive's per-role pages (register, assigned references, submission status,
 * receiving and review queue, acknowledgements, report reference tracking). Each view is its own route; scope and
 * permission are enforced by the domain layer for every view.
 */
import Link from "next/link";
import { Pager } from "@/components/pager";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import type { Permission } from "@/server/domain/catalogue";
import { hasPermission, type Actor } from "@/server/domain/policy";
import { LIAISON_KIND_LABEL, LIAISON_STATUS_LABEL, LIAISON_VIEWS, pageLiaison, type LiaisonView } from "@/server/domain/liaison";
import { workspaceFor } from "@/server/domain/workspaces";
import { AccessDenied, Badge, ButtonLink, Card, Notice, PageHeader, Table, td, fmtDate, btnSecondary } from "@/components/ui";
import { LIAISON_BOUNDARY_NOTICE } from "../liaison-panels";

const PATH: Record<LiaisonView, string> = {
  all: "/app/liaison", assigned: "/app/liaison/assigned", submissions: "/app/liaison/submissions", incoming: "/app/liaison/incoming",
  acknowledgements: "/app/liaison/acknowledgements", reports: "/app/liaison/reports",
};
const NEEDS: Record<LiaisonView, Permission> = {
  all: "liaison.metadata.view", assigned: "liaison.metadata.view", submissions: "liaison.status.view", incoming: "liaison.submission.acknowledge",
  acknowledgements: "liaison.status.view", reports: "liaison.metadata.view",
};

/** The page title for the actor's workspace (role-specific names from the directive), falling back to the view title. */
export function viewTitle(actor: Actor, path: string, fallback: string) {
  return workspaceFor(actor)?.labels?.[path] ?? fallback;
}

export async function LiaisonRegister({ view, searchParams }: { view: LiaisonView; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  if (!await pageAllowed(actor, NEEDS[view])) return <AccessDenied what="liaison administration" />;
  const sp = await searchParams;
  const status = sp.status && LIAISON_STATUS_LABEL[sp.status] ? sp.status : undefined;
  const kind = sp.kind && sp.kind in LIAISON_KIND_LABEL ? sp.kind : undefined;
  const q = (sp.q ?? "").trim().slice(0, 40);
  const list = await pageLiaison(getDb(), actor, { view, q: q || undefined, status, kind, page: Number(sp.page) || 1 });
  const path = PATH[view];
  const meta = LIAISON_VIEWS[view];
  return (
    <>
      <PageHeader eyebrow="Intelligence liaison administration" title={viewTitle(actor, path, meta.title)} description={meta.hint}
        actions={hasPermission(actor, "liaison.metadata.create") ? <ButtonLink href="/app/liaison/new" variant="primary">Record a liaison reference</ButtonLink> : undefined} />
      <div className="mb-4"><Notice tone="info">{LIAISON_BOUNDARY_NOTICE}</Notice></div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-3 border-b border-line p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold text-ink-2">Search</label>
            <input id="q" name="q" defaultValue={q} placeholder="Reference number" maxLength={40} className="mt-1 w-52 rounded-md border border-line-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-ink-2">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {Object.entries(LIAISON_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {view !== "reports" && (
            <div>
              <label htmlFor="kind" className="block text-xs font-semibold text-ink-2">Type</label>
              <select id="kind" name="kind" defaultValue={kind ?? ""} className="mt-1 rounded-md border border-line-2 px-3 py-2 text-sm">
                <option value="">All types</option>
                {Object.entries(LIAISON_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <button type="submit" className={btnSecondary}>Apply filters</button>
          {(q || status || kind) && <Link href={path} className="py-2 text-sm text-zp-blue hover:underline">Clear</Link>}
          <p className="ml-auto self-center text-xs text-muted">{list.total} reference(s)</p>
        </form>
        <Table head={["Reference", "Type", "Document reference", "Originating office", "Held at", "Responsible", "Status", "Submitted", "Received"]} caption={meta.title}
          empty="No liaison reference matches the current filters in your scope.">
          {list.rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className={td}>
                <Link href={`/app/liaison/records/${r.id}`} className="font-mono text-xs font-semibold text-zp-blue hover:underline">{r.reference}</Link>
                {r.classification === "RESTRICTED" && <span className="ml-1.5 rounded bg-err-bg px-1.5 py-0.5 text-[10px] font-bold text-err">RESTRICTED</span>}
              </td>
              <td className={`${td} text-ink-2`}>{LIAISON_KIND_LABEL[r.kind]}</td>
              <td className={`${td} font-mono text-xs`}>{r.external_reference ?? "—"}</td>
              <td className={`${td} text-ink-2`}>{r.origin_name}</td>
              <td className={td}>{r.holding_name}</td>
              <td className={`${td} text-ink-2`}>{r.responsible_name}</td>
              <td className={td}><Badge status={r.status} label={LIAISON_STATUS_LABEL[r.status]} /></td>
              <td className={`${td} whitespace-nowrap text-muted`}>{r.date_submitted ? fmtDate(r.date_submitted) : "—"}</td>
              <td className={`${td} whitespace-nowrap text-muted`}>{r.date_received ? fmtDate(r.date_received) : "—"}</td>
            </tr>
          ))}
        </Table>
        <Pager path={path} params={sp} page={list.page} pages={list.pages} total={list.total} pageSize={list.pageSize} />
      </Card>
    </>
  );
}
