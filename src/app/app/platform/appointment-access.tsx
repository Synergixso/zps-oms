/** Platform console card: the appointment-only command access policy (DEC-076). Changes are audited; see domain/command.ts. */
import { getDb } from "@/server/db/connection";
import { hasPermission, type Actor } from "@/server/domain/policy";
import { appointmentAccessPolicy, listAppointmentOnlyAccounts, APPOINTMENT_ONLY_ELIGIBLE, POSITION_TYPES } from "@/server/domain/command";
import { isProduction } from "@/server/lib/environment";
import { appointmentAccessAction } from "@/server/actions/command";
import { Card, DL, Notice, fmtDateTime } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export async function AppointmentAccessCard({ actor }: { actor: Actor }) {
  const db = getDb();
  const p = await appointmentAccessPolicy(db);
  const canChange = hasPermission(actor, "platform.configure");
  const accounts = hasPermission(actor, "user.view") ? await listAppointmentOnlyAccounts(db, actor) : [];
  const prod = isProduction();
  return (
    <Card title="Appointment-only command access" subtitle="For ranks the 31-role catalogue does not represent (DEC-076)">
      <DL items={[
        ["State", `${p.enabled ? "On" : "Off"} (${p.source === "setting" ? "set on this console" : `${prod ? "production" : "non-production"} default`})`],
        ["Office types", p.types.map((t) => POSITION_TYPES[t]?.label ?? t).join(", ")],
        ["Accounts affected", `${accounts.filter((a) => a.effective).length} with access, ${accounts.length} appointment-only in total`],
        ["Last change", p.lastChange ? `${fmtDateTime(p.lastChange.at)} by ${p.lastChange.by ?? "system"} — ${p.lastChange.reason ?? ""}${p.lastChange.reference ? ` (${p.lastChange.reference})` : ""}` : "Never changed (default applies)"],
      ]} />
      <div className="mt-3"><Notice tone="info">An account that holds an allowed office but none of the 31 application roles can see and act on its own office&apos;s directives and reports only, and nothing else in ZPS-OMS. Every other office (Inspector, Area Commander and above) needs an application role; where the role is still to be decided (DEC-075), there is no command access without it.</Notice></div>
      {canChange && (
        <ActionForm action={appointmentAccessAction} className="mt-4 space-y-3">
          <Select label="Policy" name="enabled" required options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} defaultValue={p.enabled ? "on" : "off"} />
          <fieldset><legend className="text-sm font-semibold">Office types without an application role</legend>
            <div className="mt-1 flex flex-wrap gap-4">{APPOINTMENT_ONLY_ELIGIBLE.map((t) => <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" name="types" value={t} defaultChecked={p.types.includes(t)} /> {POSITION_TYPES[t].label}</label>)}</div>
          </fieldset>
          <TextField label="Reason for the change" name="reason" required maxLength={500} />
          <TextField label={prod ? "Service decision reference (required to switch on)" : "Decision reference (optional)"} name="reference" maxLength={60} />
          <Submit variant="secondary" confirm="Change the appointment-only access policy? It applies to the affected accounts immediately.">Update policy</Submit>
        </ActionForm>
      )}
    </Card>
  );
}
