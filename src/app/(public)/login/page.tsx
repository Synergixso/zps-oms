import { redirect } from "next/navigation";
import { all, getDb } from "@/server/db/connection";
import { DASHBOARD_PRECEDENCE, ROLE_BY_CODE, type RoleCode } from "@/server/domain/catalogue";
import { DEMO_AUTH_ENABLED, getActor } from "@/server/auth/session";
import { demoSignIn } from "@/server/actions/auth";
import { Notice } from "@/components/ui";

export const metadata = { title: "Secure sign-in" };
export const dynamic = "force-dynamic";

const REASONS: Record<string, [string, "info" | "warn" | "err" | "ok"]> = {
  signin: ["Please sign in to continue. Sessions expire after 30 minutes of inactivity.", "info"],
  signedout: ["You have been signed out.", "ok"],
  refused: ["Sign-in refused: the account is not active.", "err"],
  disabled: ["Synthetic demonstration sign-in is disabled in this environment.", "err"],
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  if (await getActor()) redirect("/app");
  const { reason } = await searchParams;
  const users = all<{ id: string; display_name: string; position_title: string; status: string; role_code: RoleCode; org_name: string }>(
    getDb(),
    `SELECT u.id, u.display_name, u.position_title, u.status, a.role_code, o.name AS org_name
       FROM users u JOIN role_assignments a ON a.user_id = u.id AND a.revoked_at IS NULL JOIN org_units o ON o.id = a.org_unit_id
      WHERE u.synthetic = 1 GROUP BY u.id ORDER BY u.display_name`,
  ).sort((a, b) => DASHBOARD_PRECEDENCE.indexOf(a.role_code) - DASHBOARD_PRECEDENCE.indexOf(b.role_code));
  const msg = reason ? REASONS[reason] : undefined;
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zp-green">Secure sign-in</p>
          <h1 className="mt-1 text-2xl font-bold">Sign in to ZPS-OMS</h1>
          <p className="mt-2 text-sm text-ink-2">
            Production sign-in will use an institutionally approved identity provider with multi-factor authentication, determined by the Technical Services Directorate. There is no
            public registration; accounts are provisioned only through the approved access process.
          </p>
          <div className="mt-5 space-y-3">
            {msg && <Notice tone={msg[1]}>{msg[0]}</Notice>}
            <Notice tone="warn" title="Synthetic demonstration sign-in">
              This local prototype uses a role simulator with fictitious accounts so reviewers can see each role&apos;s workspace. It is <strong>not</strong> Zambia Police Service
              authentication. No passwords are used or stored. Every sign-in is recorded in the audit log.
            </Notice>
            <div className="rounded-md border border-line bg-canvas p-4 text-[13px] text-ink-2">
              <p className="font-semibold text-ink">Session controls in this prototype</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>HTTP-only, same-site strict session cookie; only a hash of the token is stored.</li>
                <li>30-minute idle timeout, 8-hour absolute lifetime.</li>
                <li>Suspension or deactivation ends sessions immediately.</li>
              </ul>
            </div>
          </div>
        </section>
        <section aria-labelledby="demo-accounts">
          <h2 id="demo-accounts" className="text-sm font-bold">Choose a synthetic demonstration account</h2>
          <p className="text-xs text-muted">Each account holds an explicit role and organisational scope. Permissions are evaluated on the server for every action.</p>
          {DEMO_AUTH_ENABLED ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {users.map((u) => (
                <li key={u.id}>
                  <form action={demoSignIn}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      disabled={u.status !== "ACTIVE"}
                      className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-left shadow-sm hover:border-zp-green hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="block text-[13px] font-semibold text-ink">{ROLE_BY_CODE[u.role_code]?.name}</span>
                      <span className="block text-[12px] text-ink-2">{u.display_name}</span>
                      <span className="block text-[11px] text-muted">
                        {u.org_name}
                        {u.status !== "ACTIVE" ? ` · ${u.status.toLowerCase()}` : ""}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Notice tone="err">Demonstration sign-in is disabled. Configure the approved identity provider.</Notice>
          )}
        </section>
      </div>
    </div>
  );
}
