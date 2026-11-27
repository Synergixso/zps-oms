import { requireActor } from "@/server/auth/session";
import { all, getDb } from "@/server/db/connection";
import { today } from "@/server/domain/core";
import { actingAppointments, commandChain, officesHeld, COMMAND_ACTIONS } from "@/server/domain/command";
import { appointActingAction, revokeActingAction } from "@/server/actions/command";
import { Badge, Card, Notice, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextField } from "@/components/forms";
import { NoOffice } from "../shared";

export const metadata = { title: "Acting appointments" };

export default async function ActingPage() {
  const actor = await requireActor();
  const db = getDb();
  const held = await officesHeld(db, actor);
  const rows = await actingAppointments(db, actor);
  // Offices the actor may delegate: its own substantive offices and every office below them in the command chain.
  const substantive = held.filter((h) => h.authority === "SUBSTANTIVE").map((h) => h.positionId);
  const positions = await all<{ id: string; title: string }>(db, "SELECT id, title FROM command_positions WHERE status = 'ACTIVE' ORDER BY title");
  const delegable: Array<{ id: string; title: string }> = [];
  for (const p of positions) if (substantive.includes(p.id) || (await commandChain(db, p.id)).some((x) => substantive.includes(x))) delegable.push(p);
  const users = delegable.length ? await all<{ value: string; label: string }>(db, "SELECT id AS value, display_name AS label FROM users WHERE status = 'ACTIVE' AND id <> ? ORDER BY display_name LIMIT 500", actor.userId) : [];
  return (
    <>
      <PageHeader eyebrow="Command and reporting" title="Acting appointments"
        description="An acting officer exercises only the actions delegated, only between the dates recorded. When the appointment expires or is revoked, the ordinary authority applies again automatically. Being a deputy does not by itself confer any authority." />
      {!held.length && !rows.length ? <NoOffice /> : null}
      <Card title="Acting appointments involving you or your offices" bodyClass="p-0" className="mb-4">
        <Table head={["Office", "Acting officer", "Substantive holder", "Delegated actions", "From", "To", "Authorised by", "State", ""]} caption="Acting appointments" empty="No acting appointments.">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.title}</td><td className={td}>{r.acting_name}</td><td className={`${td} text-ink-2`}>{r.original_name ?? "vacant"}</td>
              <td className={`${td} text-ink-2`}>{r.actions.split(",").map((a) => COMMAND_ACTIONS[a as keyof typeof COMMAND_ACTIONS] ?? a).join("; ")}</td>
              <td className={`${td} text-muted`}>{fmtDate(r.valid_from)}</td><td className={`${td} text-muted`}>{fmtDate(r.valid_to)}</td>
              <td className={`${td} text-ink-2`}>{r.authorised_name} · {r.authorising_ref}</td>
              <td className={td}><Badge status={r.state === "Active" ? "ACTIVE" : r.state.toUpperCase()} label={r.state} /></td>
              <td className={td}>{r.state === "Active" || r.state === "Scheduled" ? <ActionForm action={revokeActingAction} className=""><Hidden name="id" value={r.id} /><Submit variant="secondary" confirm="Revoke this acting appointment?">Revoke</Submit></ActionForm> : null}</td>
            </tr>
          ))}
        </Table>
      </Card>
      {delegable.length > 0 && (
        <Card title="Appoint an acting officer" subtitle="For an office you hold, or an office below it in the command chain">
          <ActionForm action={appointActingAction} resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Office" name="positionId" required options={delegable.map((p) => ({ value: p.id, label: p.title }))} placeholder="Select office" />
              <Select label="Acting officer" name="actingUserId" required options={users} placeholder="Select officer" />
              <TextField label="From" name="validFrom" type="date" required defaultValue={today()} />
              <TextField label="To (at most 180 days)" name="validTo" type="date" required />
            </div>
            <fieldset><legend className="text-sm font-semibold">Delegated actions</legend>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(COMMAND_ACTIONS).map(([k, v]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="actions" value={k} /> {v}</label>)}</div>
            </fieldset>
            <TextField label="Authorising reference" name="authorisingRef" required maxLength={60} placeholder="e.g. HQ/OPS/ACT/014" />
            <Submit>Record acting appointment</Submit>
          </ActionForm>
          <div className="mt-3"><Notice tone="info">Technical administrators and liaison officers cannot act in command offices. The acting officer is notified.</Notice></div>
        </Card>
      )}
    </>
  );
}
