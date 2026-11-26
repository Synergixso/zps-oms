import { redirect } from "next/navigation";
import { all, getDb } from "@/server/db/connection";
import { SYNTHETIC_DEV_PASSWORD } from "@/server/db/constants";
import { DASHBOARD_PRECEDENCE, ROLE_BY_CODE, type RoleCode } from "@/server/domain/catalogue";
import { SHOW_DEMO_ACCOUNTS, getActor } from "@/server/auth/session";
import { signIn } from "@/server/actions/auth";
import { LoginForm, UseAccount } from "@/components/login-form";
import { Crest } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconName } from "@/lib/nav";

export const metadata = { title: "System Login" };
export const dynamic = "force-dynamic";

const REASONS: Record<string, [string, string]> = {
  signin: ["Please sign in to continue. Sessions expire after 30 minutes of inactivity.", "border-info/25 bg-info-bg text-info"],
  signedout: ["You have been signed out.", "border-ok/30 bg-ok-bg text-ok"],
};

const FEATURES: Array<[IconName, string, string]> = [
  ["shieldCheck", "Secure Access", "Protected, audited sign-in with account lockout"],
  ["layers", "Operational Control", "Manage personnel, manpower, resources and assets"],
  ["chart", "Up-to-date Information", "Current administrative visibility and reporting"],
  ["users", "Authorised Users Only", "Restricted access for approved personnel"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  if (await getActor()) redirect("/app");
  const { reason } = await searchParams;
  const msg = reason ? REASONS[reason] : undefined;
  const users = SHOW_DEMO_ACCOUNTS
    ? (await all<{ username: string; status: string; role_code: RoleCode; org_name: string }>(
        getDb(),
        `SELECT u.username, u.status, a.role_code, o.name AS org_name
           FROM users u
           JOIN role_assignments a ON a.id = (SELECT MIN(x.id) FROM role_assignments x WHERE x.user_id = u.id AND x.revoked_at IS NULL)
           JOIN org_units o ON o.id = a.org_unit_id
          WHERE u.synthetic = 1 AND u.password_hash IS NOT NULL ORDER BY u.display_name`,
      )).sort((a, b) => DASHBOARD_PRECEDENCE.indexOf(a.role_code) - DASHBOARD_PRECEDENCE.indexOf(b.role_code))
    : [];

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {/* Background photograph with institutional blue overlay */}
        <div className="absolute inset-0 -z-20 bg-[url('/hero/hero-02.webp')] bg-cover bg-[38%_center]" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b2a6b]/95 via-[#123f93]/75 to-[#1d5fc4]/20 lg:to-transparent" aria-hidden />
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className="absolute inset-x-0 top-0 -z-10 h-[70px] w-full md:h-[110px]" aria-hidden>
          <path d="M0 0 H1440 V18 C 1000 30, 520 0, 0 120 Z" fill="var(--color-zp-green)" />
          <path d="M0 0 H1440 V8 C 1000 22, 520 -6, 0 100 Z" fill="#ffffff" />
          <path d="M0 0 H1440 V2 C 1000 14, 520 -10, 0 84 Z" fill="var(--color-zp-blue)" />
        </svg>

        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 pb-20 pt-24 lg:items-start md:pt-28 lg:grid-cols-[minmax(0,1fr)_440px] lg:pb-28">
          <div className="text-white lg:pt-10">
            <p className="flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.2em]">
              <span className="h-[3px] w-8 bg-[#5bd36f]" aria-hidden />
              Secure access
            </p>
            <h1 className="mt-3 text-[52px] font-extrabold leading-none tracking-tight md:text-[72px]">ZPS-OMS</h1>
            <p className="mt-2 text-[22px] font-bold md:text-[28px]">Operations Management System</p>
            <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-white/90">
              A centralised platform for operational coordination, personnel and manpower administration, resource management and administrative control across DIG
              Operations, Provincial Divisions and Divisional Units.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/60 bg-white/95 p-6 shadow-[0_20px_50px_rgba(8,30,80,0.35)] backdrop-blur sm:p-8">
            <div className="text-center">
              <Crest className="mx-auto h-[100px] w-[172px]" />
              <p className="mt-3 text-[22px] font-extrabold leading-tight tracking-wide text-[#0d2149] sm:text-[24px]">ZAMBIA POLICE SERVICE</p>
              <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-2 sm:text-[13px]">OPERATIONS MANAGEMENT SYSTEM</p>
              <span className="mt-2 inline-block rounded-full bg-zp-green px-4 py-0.5 text-[15px] font-bold tracking-wider text-white">ZPS-OMS</span>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-[2px] flex-1 bg-zp-green" aria-hidden />
                <h2 className="text-[24px] font-bold text-[#0d2149]">System Login</h2>
                <span className="h-[2px] flex-1 bg-zp-green" aria-hidden />
              </div>
              <p className="mt-1 text-[14px] text-ink-2">Access your authorised ZPS-OMS account</p>
            </div>

            {msg && <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${msg[1]}`}>{msg[0]}</p>}
            <div className="mt-5">
              <LoginForm action={signIn} />
            </div>

            <div className="my-4 flex items-center gap-3 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line-2" aria-hidden />
              or
              <span className="h-px flex-1 bg-line-2" aria-hidden />
            </div>
            <button
              type="button"
              disabled
              aria-describedby="sso-note"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-line-2 bg-white px-4 py-2.5 text-[15px] font-semibold text-ink/60"
            >
              <Icon name="userCircle" />
              Login with Government ID (SSO)
            </button>
            <p id="sso-note" className="mt-1.5 text-center text-[12px] text-muted">
              Not yet available. Single sign-on will be enabled once the Service approves an identity provider.
            </p>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="flex items-center gap-2.5 text-[15px] font-bold text-[#0d2149]">
                <span className="text-zp-blue">
                  <Icon name="shieldCheck" />
                </span>
                Secure &amp; Compliant Access
              </p>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink">
                {[
                  "Role-based access control (RBAC) with organisational scope",
                  "All activities are logged in a tamper-evident audit trail",
                  "Subject to Zambia Police Service ICT and information security policies",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-0.5 text-ok">
                      <Icon name="checkCircle" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <nav aria-label="Sign-in help" className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4 text-[13px] font-medium text-ink">
              <a href="/how-it-works" className="flex items-center justify-center gap-1.5 px-1 hover:text-zp-blue">
                <Icon name="list" /> User Guide
              </a>
              <a href="/contact" className="flex items-center justify-center gap-1.5 px-1 hover:text-zp-blue">
                <Icon name="headset" /> ICT Support
              </a>
              <a href="mailto:support@zambiapolice.org.zm" className="flex items-center justify-center gap-1.5 px-1 hover:text-zp-blue">
                <Icon name="mail" /> Help Desk
              </a>
            </nav>
          </div>
        </div>

        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[56px] w-full md:h-[90px]" aria-hidden>
          <path d="M0 40 C 420 120, 980 0, 1440 70 L1440 120 L0 120 Z" fill="var(--color-zp-green)" />
          <path d="M0 54 C 420 132, 980 14, 1440 84 L1440 120 L0 120 Z" fill="#ffffff" />
          <path d="M0 64 C 420 140, 980 24, 1440 94 L1440 120 L0 120 Z" fill="var(--color-zp-blue)" />
          <path d="M0 78 C 420 150, 980 38, 1440 106 L1440 120 L0 120 Z" fill="#ffffff" />
        </svg>
      </section>

      <section className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-8 px-4 py-10 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {FEATURES.map(([icon, title, body]) => (
          <div key={title} className="px-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center text-zp-blue [&_svg]:h-10 [&_svg]:w-10">
              <Icon name={icon} />
            </span>
            <p className="mt-2 text-[17px] font-bold text-[#0d2149]">{title}</p>
            <p className="mt-1 text-[14px] text-ink-2">{body}</p>
          </div>
        ))}
      </section>

      {SHOW_DEMO_ACCOUNTS && (
        <section className="mx-auto max-w-[1180px] px-4 pb-10">
          <details className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-amber-900">Local review only: synthetic accounts ({users.length})</summary>
            <p className="mt-2 text-[13px] text-amber-900">
              Every account is fictitious and shares the published development password <code className="rounded bg-white px-1 font-mono">{SYNTHETIC_DEV_PASSWORD}</code>. This list is
              not shown in production builds.
            </p>
            <div className="mt-3 max-h-[420px] overflow-y-auto rounded-md border border-line bg-white">
              <table className="w-full text-left text-[12.5px]">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-bold">Role and scope</th>
                    <th className="px-3 py-2 font-bold">Username</th>
                    <th className="px-3 py-2">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => (
                    <tr key={u.username} className={u.status !== "ACTIVE" ? "opacity-50" : ""}>
                      <td className="px-3 py-1.5">
                        <span className="block font-semibold text-ink">{ROLE_BY_CODE[u.role_code]?.name ?? u.role_code}</span>
                        <span className="block text-[11px] text-muted">
                          {u.org_name}
                          {u.status !== "ACTIVE" ? ` · ${u.status.toLowerCase()}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[12px]">{u.username}</td>
                      <td className="px-3 py-1.5 text-right">{u.status === "ACTIVE" && <UseAccount username={u.username} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </>
  );
}
