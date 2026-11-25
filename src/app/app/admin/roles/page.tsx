import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { PERMISSIONS, ROLES, type Permission } from "@/server/domain/catalogue";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const actor = await requireActor();
  if (!pageAllowed(actor, "user.view", "audit.view", "platform.view")) return <AccessDenied what="the permission catalogue" />;
  const perms = Object.keys(PERMISSIONS) as Permission[];
  return (
    <>
      <PageHeader eyebrow="M02 · Access governance" title="Roles & permissions matrix" description="Action-level permission catalogue for each proposed role. Generated from the same catalogue the server enforces." />
      <div className="mb-4 space-y-2">
        <Notice tone="warn" title="Proposed starting matrix — not an approved delegation">
          Roles, names and permissions require validation by the Service. Approval authority is never a role permission: it requires a recorded delegation plus an active business
          role at the same organisation.
        </Notice>
        <p className="text-xs text-muted"><strong>U</strong> = own assigned organisation unit only · <strong>N</strong> = national (only when the assignment is held at Service HQ) · blank = denied.</p>
      </div>
      <Card bodyClass="p-0">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th scope="col" className="sticky left-0 z-20 min-w-[260px] border-b border-r border-line bg-white px-3 py-2 text-left">Permission</th>
                {ROLES.map((r) => (
                  <th key={r.code} scope="col" className="min-w-[88px] border-b border-line px-2 py-2 text-left align-bottom text-[11px] font-semibold leading-tight">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr key={p} className="hover:bg-slate-50">
                  <th scope="row" className="sticky left-0 border-b border-r border-line bg-white px-3 py-1.5 text-left font-normal">
                    <span className="font-mono text-[11px]">{p}</span>
                    <span className="block text-[11px] text-muted">{PERMISSIONS[p]}</span>
                  </th>
                  {ROLES.map((r) => {
                    const c = r.permissions[p];
                    return (
                      <td key={r.code} className={`border-b border-line px-2 py-1.5 text-center font-bold ${c === "NATIONAL" ? "bg-info-bg text-info" : c ? "bg-ok-bg text-ok" : ""}`}>
                        {c === "NATIONAL" ? "N" : c ? "U" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r.code} title={r.name} subtitle={`${r.category} · ${r.dashboardTitle}`}>
            <p className="text-sm text-ink-2">{r.description}</p>
            <p className="mt-2 text-xs text-muted">Assignable at: {r.assignableTo.join(", ").toLowerCase().replace(/_/g, " ")}{r.requiresExpiry ? " · time-limited" : ""}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
