/**
 * Working panels for the stores roles (15, 23, 27) and the scoped technical administrators (07, 18, 24).
 * Every figure is read through a scoped domain function or a query bounded by the actor's scope.
 */
import Link from "next/link";
import { all, getDb, one } from "@/server/db/connection";
import { type Actor, hasPermission, unitsFor } from "@/server/domain/policy";
import { listItems, listRequisitions, REQ_STATUS_LABEL } from "@/server/domain/stores";
import { listUsers } from "@/server/domain/iam";
import { Badge, ButtonLink, Card, Notice, SectionHeader, Table, td, fmtDate, fmtDateTime } from "@/components/ui";

export async function StoresPanels({ actor }: { actor: Actor }) {
  const db = getDb();
  // Each list is filtered in SQL over the whole scope (not derived from a capped list).
  const [low, approved, pending, mine] = await Promise.all([
    listItems(db, actor, { low: true }),
    listRequisitions(db, actor, { status: "APPROVED" }),
    listRequisitions(db, actor, { status: "SUBMITTED" }),
    listRequisitions(db, actor, { mine: true, statusIn: ["DRAFT", "SUBMITTED", "APPROVED"] }),
  ]);
  const manageUnits = unitsFor(actor, "stores.manage");
  const toIssue = approved.filter((r) => manageUnits?.includes(r.store_unit_id) !== false);
  const s = unitsFor(actor, "stores.view");
  const recent = s === null || s.length
    ? await all<{ id: string; item_id: string; code: string; name: string; txn_type: string; quantity: number; balance_after: number; created_at: string; actor_name: string }>(db,
        `SELECT t.id, t.item_id, i.code, i.name, t.txn_type, t.quantity, t.balance_after, t.created_at, u.display_name AS actor_name
           FROM store_transactions t JOIN store_items i ON i.id = t.item_id JOIN users u ON u.id = t.actor_id
          ${s === null ? "" : `WHERE i.org_unit_id IN (${s.map(() => "?").join(",")})`} ORDER BY t.seq DESC LIMIT 8`, ...(s ?? []))
    : [];
  return (
    <>
      <SectionHeader title="Stores work" description="Reorder needs, requisitions to issue and the latest stock movements in your store."
        actions={<><ButtonLink href="/app/stores">Stores and stock</ButtonLink>{hasPermission(actor, "stores.requisition") && <ButtonLink href="/app/stores/requisitions/new" variant="primary">New requisition</ButtonLink>}</>} />
      <div className="mb-4"><Notice tone="info">General consumables and non-sensitive stock only. Firearms, ammunition, armoury records and sensitive equipment are not part of ZPS-OMS.</Notice></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Reorder needed" subtitle="At or below the reorder level" bodyClass="p-0">
          <Table head={["Item", "Store", "On hand", "Reorder at"]} empty="No item is at or below its reorder level.">
            {low.slice(0, 8).map((i) => (
              <tr key={i.id}>
                <td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/stores/${i.id}`}>{i.name}</Link></td>
                <td className={`${td} text-ink-2`}>{i.unit_name}</td>
                <td className={`${td} tabular-nums font-semibold ${i.quantity_on_hand === 0 ? "text-err" : "text-warn"}`}>{i.quantity_on_hand}</td>
                <td className={`${td} tabular-nums`}>{i.reorder_level}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title={hasPermission(actor, "stores.manage") ? "Requisitions to issue" : "My open requisitions"} bodyClass="p-0">
          <Table head={["Reference", "Requesting unit", "Status", "Raised"]} empty="Nothing waiting.">
            {(hasPermission(actor, "stores.manage") ? [...toIssue, ...pending] : mine).slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/stores/requisitions/${r.id}`}>{r.reference}</Link></td>
                <td className={td}>{r.requesting_unit_name}</td>
                <td className={td}><Badge status={r.status} label={REQ_STATUS_LABEL[r.status]} /></td>
                <td className={`${td} text-muted`}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Latest stock movements" className="lg:col-span-2" bodyClass="p-0">
          <Table head={["When", "Item", "Movement", "Quantity", "Balance", "By"]} empty="No movements recorded.">
            {recent.map((t) => (
              <tr key={t.id}>
                <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(t.created_at)}</td>
                <td className={td}><Link className="text-zp-blue hover:underline" href={`/app/stores/${t.item_id}`}>{t.name}</Link></td>
                <td className={td}>{t.txn_type.charAt(0) + t.txn_type.slice(1).toLowerCase()}</td>
                <td className={`${td} tabular-nums ${t.quantity < 0 ? "text-err" : "text-ok"}`}>{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                <td className={`${td} tabular-nums`}>{t.balance_after}</td>
                <td className={`${td} text-ink-2`}>{t.actor_name}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}

export async function TechLocalPanels({ actor }: { actor: Actor }) {
  const db = getDb();
  const users = await listUsers(db, actor);
  const now = new Date().toISOString();
  const ids = users.map((u) => u.id);
  const detail = ids.length
    ? await all<{ id: string; locked_until: string | null; failed_logins: number; last_login_at: string | null; must_change_password: number }>(db,
        `SELECT id, locked_until, failed_logins, last_login_at, must_change_password FROM users WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids)
    : [];
  const by = new Map(detail.map((d) => [d.id, d]));
  const attention = users.filter((u) => { const d = by.get(u.id); return d && ((d.locked_until && d.locked_until > now) || d.failed_logins > 0 || d.must_change_password); });
  const failed = ids.length
    ? await all<{ username: string; created_at: string }>(db,
        `SELECT l.username, l.created_at FROM login_attempts l JOIN users u ON u.username = l.username WHERE l.succeeded = 0 AND u.id IN (${ids.map(() => "?").join(",")}) ORDER BY l.created_at DESC LIMIT 8`, ...ids)
    : [];
  const health = hasPermission(actor, "health.view") ? await one<{ ok: number; last: string | null; failed: number }>(db,
    "SELECT 1 AS ok, (SELECT MAX(started_at) FROM job_runs) AS last, (SELECT COUNT(*) FROM job_runs WHERE status = 'FAILED' AND started_at > ?) AS failed", new Date(Date.now() - 86400000).toISOString()) : null;
  return (
    <>
      <SectionHeader title="Technical administration" description="Account support for users assigned within your unit. Role assignments, delegations and higher-level technical issues are referred to System Administrator – HQ Tech."
        actions={<ButtonLink href="/app/admin/users" variant="primary">Account support</ButtonLink>} />
      <div className="mb-4"><Notice tone="info">This workspace has no access to personnel records, assignments or approvals. Accounts holding a technical role are supported by HQ Tech.</Notice></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Accounts needing attention" className="lg:col-span-2" bodyClass="p-0">
          <Table head={["User", "Position", "Issue"]} empty="No locked accounts, failed sign-ins or pending password changes in your scope.">
            {attention.map((u) => {
              const d = by.get(u.id)!;
              const issue = d.locked_until && d.locked_until > now ? "Locked after failed sign-ins" : d.must_change_password ? "Temporary password not yet changed" : `${d.failed_logins} failed sign-in attempt(s)`;
              return (
                <tr key={u.id}>
                  <td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/admin/users/${u.id}`}>{u.display_name}</Link></td>
                  <td className={`${td} text-ink-2`}>{u.position_title}</td>
                  <td className={td}>{issue}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card title="Service health">
          {health ? (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Database</span><Badge status="ACTIVE" label="Reachable" /></li>
              <li className="flex justify-between"><span>Last automation run</span><span className="text-ink-2">{health.last ? fmtDateTime(health.last) : "—"}</span></li>
              <li className="flex justify-between"><span>Automation failures (24 h)</span><span className={Number(health.failed) ? "font-semibold text-err" : "text-ink-2"}>{Number(health.failed)}</span></li>
            </ul>
          ) : <p className="text-sm text-muted">Health indicators are not part of this role.</p>}
          <p className="mt-3 text-xs text-muted">Platform configuration, backups and job control are Headquarters functions.</p>
        </Card>
        <Card title="Recent failed sign-ins in your scope" className="lg:col-span-3" bodyClass="p-0">
          <Table head={["When", "Username"]} empty="No failed sign-ins.">
            {failed.map((f, i) => <tr key={i}><td className={`${td} text-muted`}>{fmtDateTime(f.created_at)}</td><td className={`${td} font-mono text-xs`}>{f.username}</td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
