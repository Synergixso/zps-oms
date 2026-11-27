import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { all, getDb, one } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { type Actor, dashboardKind, hasPermission, primaryAssignment, primaryRole, scopeFor } from "@/server/domain/policy";
import { breakdownByOrg, computeSummary, type Summary } from "@/server/domain/reports";
import { approvalInbox, assignmentQueue, listRequests, STATUS_LABEL, type RequestRow } from "@/server/domain/requests";
import { fleetFigures, listMaintenance, listVehicles, MAINT_LABEL } from "@/server/domain/fleet";
import { assetFigures, listAssets, ASSET_STATUS_LABEL } from "@/server/domain/assets";
import { listChanges } from "@/server/domain/org";
import { verifyAuditChain } from "@/server/domain/audit";
import { listReviews } from "@/server/domain/iam";
import { Badge, Bar, ButtonLink, Card, SectionHeader, Stat, Table, td, fmtDate, fmtDateTime, Notice } from "@/components/ui";

import { PersonnelDashboard } from "./dashboards";
import { CommandOverview } from "./overview";
import { StoresPanels, TechLocalPanels } from "./role-panels";
import { LiaisonPanels } from "./liaison-panels";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const actor = await requireActor();
  const kind = dashboardKind(actor);
  if (!kind) return <NoAccess />;
  return (
    <>
      <CommandOverview actor={actor} kind={kind} />
      <section aria-label="Workspace details" className="mt-8 border-t border-line pt-6">{detail(actor, kind)}</section>
    </>
  );
}

/** Role-specific working panels shown below the command overview. */
function detail(actor: Actor, kind: NonNullable<ReturnType<typeof dashboardKind>>) {
  switch (kind) {
    case "NATIONAL_EXECUTIVE":
    case "NATIONAL_COORDINATION":
      return <National actor={actor} coordinator={kind === "NATIONAL_COORDINATION"} />;
    case "DIVISION_COMMAND":
    case "FORMATION_COMMAND":
      return <UnitCommand actor={actor} />;
    case "DIVISION_STAFF_OPS":
    case "FORMATION_ADMIN":
    case "MY_WORKSPACE":
      return <StaffWorkspace actor={actor} />;
    case "DISTRICT_COMMAND":
    case "STATION":
    case "UNIT_COMMAND":
    case "OPS_STAFF_WORKSPACE":
    case "PERSONNEL_ADMIN":
    case "ASSIGNMENT_ADMIN":
    case "MANAGEMENT":
      return <PersonnelDashboard actor={actor} kind={kind} />;
    case "FLEET":
      return <FleetDash actor={actor} />;
    case "ASSETS":
      return <AssetDash actor={actor} />;
    case "STORES":
      return <StoresPanels actor={actor} />;
    case "LIAISON":
      return <LiaisonPanels actor={actor} />;
    case "AUDIT":
      return <AuditDash actor={actor} />;
    case "SECURITY":
      return <SecurityDash actor={actor} />;
    case "TECH_LOCAL":
      return <TechLocalPanels actor={actor} />;
    case "PLATFORM":
      return <PlatformDash actor={actor} />;
    case "ORG_REGISTRY":
      return <OrgDash actor={actor} />;
  }
}

function NoAccess() {
  return (
    <div className="py-12">
      <SectionHeader title="No active access" description="Your account has no active role assignment. Access is granted only through an approved role and organisational scope." />
      <Notice tone="warn">If you expected access, contact your access administrator. Expired or revoked assignments do not grant access.</Notice>
    </div>
  );
}

/** Heading of the working panels below the command overview (the back-office name is already the page heading). */
function title(actor: Actor) {
  return primaryRole(actor) ? "Working panels" : "Workspace";
}

function RequestTable({ rows, empty, showOrg = true }: { rows: RequestRow[]; empty: string; showOrg?: boolean }) {
  return (
    <Table head={["Reference", "Subject", ...(showOrg ? ["Organisation"] : []), "Status", "Updated"]} empty={empty}>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-slate-50">
          <td className={td}>
            <Link className="font-semibold text-zp-blue hover:underline" href={`/app/requests/${r.id}`}>
              {r.reference}
            </Link>
          </td>
          <td className={td}>{r.title}</td>
          {showOrg && <td className={td}>{r.origin_name}</td>}
          <td className={td}>
            <Badge status={r.status} label={r.status === "UNDER_REVIEW" ? `Under review (L${r.current_level})` : STATUS_LABEL[r.status]} />
          </td>
          <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(r.updated_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

function StatusBars({ s }: { s: Summary }) {
  const rows: Array<[string, number, "green" | "blue" | "amber" | "grey"]> = [
    ["Submitted / awaiting assignment", s.requests.SUBMITTED ?? 0, "amber"],
    ["Under review", s.requests.UNDER_REVIEW ?? 0, "amber"],
    ["Returned for correction", s.requests.RETURNED ?? 0, "grey"],
    ["Approved / in progress", (s.requests.APPROVED ?? 0) + (s.requests.IN_PROGRESS ?? 0), "blue"],
    ["Completed / closed", (s.requests.COMPLETED ?? 0) + (s.requests.CLOSED ?? 0), "green"],
    ["Rejected / cancelled", (s.requests.REJECTED ?? 0) + (s.requests.CANCELLED ?? 0), "grey"],
  ];
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="space-y-3">
      {rows.map(([l, v, t]) => (
        <Bar key={l} label={l} value={v} max={max} tone={t} />
      ))}
    </div>
  );
}

function Ageing({ s }: { s: Summary }) {
  const max = Math.max(1, ...s.ageing.map((a) => a.count));
  return (
    <div className="space-y-3">
      {s.ageing.map((a, i) => (
        <Bar key={a.band} label={a.band} value={a.count} max={max} tone={i >= 2 ? "amber" : "blue"} />
      ))}
      <p className="pt-1 text-xs text-muted">Average submission-to-final-approval time: {s.avgApprovalDays ?? "—"} days (synthetic data).</p>
    </div>
  );
}

function FleetAssetSummary({ s, fleet, assets }: { s: Summary; fleet: boolean; assets: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fleet && (
        <Card title="Fleet maintenance administration" subtitle="Approved general fleet indicators · aggregate">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted text-xs">Vehicles in service</dt><dd className="text-lg font-bold">{s.vehicles.IN_SERVICE ?? 0}</dd></div>
            <div><dt className="text-muted text-xs">Under maintenance</dt><dd className="text-lg font-bold">{s.vehicles.UNDER_MAINTENANCE ?? 0}</dd></div>
            <div><dt className="text-muted text-xs">Service overdue</dt><dd className={`text-lg font-bold ${s.vehiclesServiceOverdue ? "text-err" : ""}`}>{s.vehiclesServiceOverdue}</dd></div>
            <div><dt className="text-muted text-xs">Licence/insurance due ≤60 days</dt><dd className="text-lg font-bold">{s.vehiclesDocsExpiring}</dd></div>
            <div className="col-span-2"><dt className="text-muted text-xs">Open maintenance requests</dt><dd className="text-lg font-bold">{Object.entries(s.maintenance).filter(([k]) => !["CLOSED", "REJECTED"].includes(k)).reduce((a, [, v]) => a + v, 0)}</dd></div>
          </dl>
        </Card>
      )}
      {assets && (
        <Card title="General asset accountability" subtitle="Non-sensitive approved categories only · aggregate">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted text-xs">In store</dt><dd className="text-lg font-bold">{s.assets.IN_STORE ?? 0}</dd></div>
            <div><dt className="text-muted text-xs">Issued</dt><dd className="text-lg font-bold">{s.assets.ISSUED ?? 0}</dd></div>
            <div><dt className="text-muted text-xs">In transfer</dt><dd className="text-lg font-bold">{s.assetsInTransfer}</dd></div>
            <div><dt className="text-muted text-xs">Under repair</dt><dd className="text-lg font-bold">{s.assets.UNDER_REPAIR ?? 0}</dd></div>
            <div className="col-span-2"><dt className="text-muted text-xs">Not inspected in 12 months</dt><dd className={`text-lg font-bold ${s.assetsNotInspected12m ? "text-warn" : ""}`}>{s.assetsNotInspected12m}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  );
}

async function Notifications({ actor }: { actor: Actor }) {
  const rows = await all<{ id: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null }>(
    getDb(),
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
    actor.userId,
  );
  return (
    <Card title="Notifications" action={<Link href="/app/notifications" className="text-xs font-semibold text-zp-blue hover:underline">View all</Link>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No notifications.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li key={n.id} className="text-sm">
              {n.link ? <Link href={n.link} className={`hover:underline ${n.read_at ? "text-ink-2" : "font-semibold text-ink"}`}>{n.title}</Link> : <span>{n.title}</span>}
              <p className="text-xs text-muted">{fmtDateTime(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

async function National({ actor, coordinator }: { actor: Actor; coordinator: boolean }) {
  const db = getDb();
  const scope = scopeFor(actor, "dashboard.national.view");
  const s = await computeSummary(db, scope);
  const orgs = await breakdownByOrg(db, scope);
  const inbox = await approvalInbox(db, actor);
  const queue = coordinator ? await assignmentQueue(db, actor) : [];
  const overdue = coordinator ? await listRequests(db, actor, { overdue: true, sort: "due" }) : [];
  const provinces = orgs.filter((o) => o.unit_type === "PROVINCIAL_DIVISION");
  const formations = orgs.filter((o) => o.unit_type === "FORMATION");
  return (
    <>
      <SectionHeader
        eyebrow={coordinator ? "National operations · coordination" : "National operations · executive"}
        title={title(actor)}
        description="Aggregate administrative oversight across Service Headquarters, the ten Provincial Police Divisions and authorised formations. Figures are synthetic."
        actions={
          <>
            {hasPermission(actor, "report.view") && <ButtonLink href="/app/reports">Management reports</ButtonLink>}
            {hasPermission(actor, "request.create") && <ButtonLink href="/app/requests/new" variant="primary">New administrative request</ButtonLink>}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Provincial divisions" value={provinces.length} hint="Configured directory entries" href="/app/org" />
        <Stat label="Divisional formations" value={formations.length} hint="Provisional; validate internally" href="/app/org" />
        <Stat label="Open administrative requests" value={s.requestsOpen} hint="All in-scope organisations" />
        <Stat label="Overdue requests" value={s.requestsOverdue} tone={s.requestsOverdue ? "err" : "default"} hint="Past 10-day provisional SLA" />
        <Stat label="Awaiting my decision" value={inbox.length} tone={inbox.length ? "warn" : "default"} hint="Requires recorded delegation" href="/app/approvals" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Request status summary" subtitle="Non-draft requests · national aggregate">
          <StatusBars s={s} />
        </Card>
        <Card title="Workflow ageing" subtitle="Open requests by days since submission">
          <Ageing s={s} />
        </Card>
        <Card title="Pending national approvals" subtitle="Items at an HQ approval level where you hold a delegation" bodyClass="p-0">
          <RequestTable rows={inbox.slice(0, 6)} empty="No items awaiting your decision." showOrg={true} />
        </Card>
      </div>
      {coordinator && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="National assignment queue" subtitle="Submitted items awaiting assignment for review" bodyClass="p-0">
            <RequestTable rows={queue.slice(0, 8)} empty="Queue is clear." />
          </Card>
          <Card title="Overdue administrative actions" subtitle="Escalation list — no external notification is sent" bodyClass="p-0">
            <RequestTable rows={overdue.slice(0, 8)} empty="No overdue items." />
          </Card>
        </div>
      )}
      <div className="mt-4">
        <FleetAssetSummary s={s} fleet assets />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Organisational breakdown" subtitle="Aggregate counts only — no personnel, deployment or readiness information" className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Organisation", "Type", "Open requests", "Overdue", "Vehicles", "Open maintenance", "General assets"]}>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td className={`${td} font-medium`}>{o.name}</td>
                <td className={`${td} text-muted`}>{o.unit_type === "PROVINCIAL_DIVISION" ? "Province" : o.unit_type === "FORMATION" ? "Formation" : "HQ"}</td>
                <td className={`${td} tabular-nums`}>{o.open_requests}</td>
                <td className={`${td} tabular-nums ${o.overdue ? "font-semibold text-err" : ""}`}>{o.overdue}</td>
                <td className={`${td} tabular-nums`}>{o.vehicles}</td>
                <td className={`${td} tabular-nums`}>{o.maint_open}</td>
                <td className={`${td} tabular-nums`}>{o.assets}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Notifications actor={actor} />
      </div>
    </>
  );
}

async function UnitCommand({ actor }: { actor: Actor }) {
  const db = getDb();
  const pa = primaryAssignment(actor)!;
  const scope = { national: false, units: [pa.orgUnitId] };
  const s = await computeSummary(db, scope);
  const inbox = await approvalInbox(db, actor);
  const queue = await assignmentQueue(db, actor);
  const recent = (await listRequests(db, actor)).slice(0, 8);
  const maint = hasPermission(actor, "maintenance.view") ? await listMaintenance(db, actor, { status: "VALIDATED" }) : [];
  const unit = (await one<{ code: string; validation_note: string | null }>(db, "SELECT code, validation_note FROM org_units WHERE id = ?", pa.orgUnitId))!;
  const isProv = pa.orgUnitType === "PROVINCIAL_DIVISION";
  return (
    <>
      <SectionHeader
        eyebrow={isProv ? "Provincial Police Division · command" : "Divisional formation · command"}
        title={pa.orgUnitName}
        description={`${ROLE_BY_CODE[primaryRole(actor)!].name} · Organisation code ${unit.code}. Data restricted to this ${isProv ? "division" : "formation"} and explicitly shared information.`}
        actions={
          <>
            <ButtonLink href="/app/reports">Reports</ButtonLink>
            <ButtonLink href="/app/approvals" variant="primary">Open approvals inbox</ButtonLink>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Awaiting my decision" value={inbox.length} tone={inbox.length ? "warn" : "default"} href="/app/approvals" hint="Delegated approvals" />
        <Stat label="Submissions to assign" value={queue.length} href="/app/approvals" hint="Submitted, not yet under review" />
        <Stat label="Open requests" value={s.requestsOpen} href="/app/requests" />
        <Stat label="Overdue" value={s.requestsOverdue} tone={s.requestsOverdue ? "err" : "default"} />
        <Stat label="Maintenance approvals" value={maint.length} href="/app/fleet/maintenance?status=VALIDATED" hint="Above cost threshold" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Requests awaiting my action" subtitle="Approve, return or reject within delegated authority" className="lg:col-span-2" bodyClass="p-0">
          <RequestTable rows={[...inbox, ...queue].slice(0, 8)} empty="Nothing awaiting your action." showOrg={false} />
        </Card>
        <Card title="Request status" subtitle={`${pa.orgUnitName} · non-draft`}>
          <StatusBars s={s} />
        </Card>
      </div>
      <div className="mt-4">
        <FleetAssetSummary s={s} fleet={hasPermission(actor, "fleet.view")} assets={hasPermission(actor, "asset.view")} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Recent administrative activity" className="lg:col-span-2" bodyClass="p-0" action={<Link href="/app/requests" className="text-xs font-semibold text-zp-blue hover:underline">View register</Link>}>
          <RequestTable rows={recent} empty="No requests yet." showOrg={false} />
        </Card>
        <Notifications actor={actor} />
      </div>
      {unit.validation_note && (
        <div className="mt-4">
          <Notice tone="warn" title="Organisational record pending validation">{unit.validation_note}</Notice>
        </div>
      )}
    </>
  );
}

async function StaffWorkspace({ actor }: { actor: Actor }) {
  const db = getDb();
  const pa = primaryAssignment(actor)!;
  // Each list is its own SQL query over the whole scope (no capped list filtered in memory).
  const [drafts, returned, submitted, toAction, overdue, completed] = await Promise.all([
    listRequests(db, actor, { mine: true, status: "DRAFT" }),
    listRequests(db, actor, { mine: true, status: "RETURNED" }),
    listRequests(db, actor, { mine: true, statusIn: ["SUBMITTED", "UNDER_REVIEW"] }),
    hasPermission(actor, "request.progress") ? listRequests(db, actor, { statusIn: ["APPROVED", "IN_PROGRESS"] }) : Promise.resolve([]),
    listRequests(db, actor, { overdue: true, sort: "due" }),
    listRequests(db, actor, { mine: true, statusIn: ["COMPLETED", "CLOSED"] }),
  ]);
  return (
    <>
      <SectionHeader
        eyebrow="My workspace"
        title={title(actor)}
        description={`${pa.orgUnitName}. Prepare, submit and track administrative work. Approval authority is not part of this role unless a delegation is separately recorded.`}
        actions={
          <>
            <ButtonLink href="/app/requests">Request register</ButtonLink>
            {hasPermission(actor, "request.create") && <ButtonLink href="/app/requests/new" variant="primary">New administrative request</ButtonLink>}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="My drafts" value={drafts.length} href="/app/requests?status=DRAFT" />
        <Stat label="Returned to me" value={returned.length} tone={returned.length ? "warn" : "default"} href="/app/requests?status=RETURNED" hint="Correct and resubmit" />
        <Stat label="Submitted / in review" value={submitted.length} />
        <Stat label="Approved – to action" value={toAction.length} hint="Start / complete work" />
        <Stat label="Overdue in my unit" value={overdue.length} tone={overdue.length ? "err" : "default"} />
        <Stat label="Completed by me" value={completed.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="My assigned work" subtitle="Returned items and approved work requiring action" className="lg:col-span-2" bodyClass="p-0">
          <RequestTable rows={[...returned, ...toAction].slice(0, 10)} empty="No work currently assigned to you." showOrg={false} />
        </Card>
        <Card title="Shortcuts">
          <ul className="space-y-2 text-sm">
            {hasPermission(actor, "request.create") && <li><Link className="text-zp-blue hover:underline" href="/app/requests/new">Prepare an administrative submission</Link></li>}
            {hasPermission(actor, "maintenance.create") && <li><Link className="text-zp-blue hover:underline" href="/app/fleet/maintenance/new">Raise a fleet maintenance request</Link></li>}
            {hasPermission(actor, "fleet.view") && <li><Link className="text-zp-blue hover:underline" href="/app/fleet">Review fleet records</Link></li>}
            {hasPermission(actor, "asset.view") && <li><Link className="text-zp-blue hover:underline" href="/app/assets">Review general asset records</Link></li>}
            {hasPermission(actor, "report.view") && <li><Link className="text-zp-blue hover:underline" href="/app/reports">Prepare divisional reports</Link></li>}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Drafts and submissions" className="lg:col-span-2" bodyClass="p-0">
          <RequestTable rows={[...drafts, ...submitted].slice(0, 10)} empty="No drafts or pending submissions." showOrg={false} />
        </Card>
        <Notifications actor={actor} />
      </div>
    </>
  );
}

async function FleetDash({ actor }: { actor: Actor }) {
  const db = getDb();
  // Figures are SQL counts over the whole scope; the tables show the most relevant rows.
  const [fig, open, dueSoon] = await Promise.all([fleetFigures(db, actor), listMaintenance(db, actor, { open: true }), listVehicles(db, actor, { due: "30d" })]);
  const units = [...new Set(actor.assignments.filter((a) => a.roleCode === "MTO_OIC").map((a) => a.orgUnitName))];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <SectionHeader eyebrow="Fleet and transport" title={title(actor)} description={`Granted organisations: ${units.join(", ")}. Administrative fleet records only — no location, route, mission or deployment data.`}
        actions={<><ButtonLink href="/app/fleet">Fleet register</ButtonLink><ButtonLink href="/app/fleet/maintenance/new" variant="primary">New maintenance request</ButtonLink></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Vehicles in scope" value={fig.vehicles} href="/app/fleet" />
        <Stat label="Service overdue" value={fig.serviceOverdue} tone={fig.serviceOverdue ? "err" : "default"} href="/app/fleet?due=overdue" />
        <Stat label="Open maintenance" value={fig.openMaintenance} href="/app/fleet/maintenance" />
        <Stat label="Completion to verify" value={fig.completionToVerify} href="/app/fleet/maintenance?status=COMPLETION_SUBMITTED" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Maintenance workbench" subtitle="Open requests by stage" bodyClass="p-0">
          <Table head={["Reference", "Vehicle", "Stage", "Updated"]} empty="No open maintenance.">
            {open.map((m) => (
              <tr key={m.id}><td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/fleet/maintenance/${m.id}`}>{m.reference}</Link></td><td className={td}>{m.fleet_ref} · {m.make} {m.model}</td><td className={td}><Badge status={m.status} label={MAINT_LABEL[m.status]} /></td><td className={`${td} text-muted`}>{fmtDate(m.updated_at)}</td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Service due-date monitor" subtitle="Overdue or due within 30 days" bodyClass="p-0">
          <Table head={["Fleet ref", "Vehicle", "Custody", "Next service"]} empty="Nothing due.">
            {dueSoon.map((v) => (
              <tr key={v.id}><td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/fleet/${v.id}`}>{v.fleet_ref}</Link></td><td className={td}>{v.make} {v.model}</td><td className={td}>{v.custody_name}</td><td className={`${td} ${v.next_service_due! < today ? "font-semibold text-err" : ""}`}>{fmtDate(v.next_service_due)}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
      <div className="mt-4"><Notifications actor={actor} /></div>
    </>
  );
}

async function AssetDash({ actor }: { actor: Actor }) {
  const db = getDb();
  // Figures are SQL counts over the whole scope (never derived from a capped list).
  const [fig, uninspectedRows] = await Promise.all([assetFigures(db, actor), listAssets(db, actor, { notInspected: true })]);
  const by = (st: "IN_STORE" | "ISSUED" | "UNDER_REPAIR") => ({ IN_STORE: fig.inStore, ISSUED: fig.issued, UNDER_REPAIR: fig.underRepair })[st];
  const inbound = { length: fig.inbound };
  const uninspected = { length: fig.notInspected };
  return (
    <>
      <SectionHeader eyebrow="Assets and equipment" title={title(actor)} description="General non-sensitive assets in approved categories. Firearms, ammunition, armoury, communications and tactical equipment are excluded."
        actions={<><ButtonLink href="/app/assets">Asset register</ButtonLink><ButtonLink href="/app/assets/new" variant="primary">Register asset</ButtonLink></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {(["IN_STORE", "ISSUED", "UNDER_REPAIR"] as const).map((s) => <Stat key={s} label={ASSET_STATUS_LABEL[s]} value={by(s)} href={`/app/assets?status=${s}`} />)}
        <Stat label="Inbound transfers to receive" value={inbound.length} tone={inbound.length ? "warn" : "default"} href="/app/assets?status=IN_TRANSFER" />
        <Stat label="Not inspected ≥ 12 months" value={uninspected.length} tone={uninspected.length ? "warn" : "default"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Inspection due" subtitle="Reconciliation priority" bodyClass="p-0">
          <Table head={["Tag", "Description", "Custody", "Last inspected"]} empty="All assets inspected within 12 months.">
            {uninspectedRows.slice(0, 10).map((a) => (
              <tr key={a.id}><td className={td}><Link className="font-semibold text-zp-blue hover:underline" href={`/app/assets/${a.id}`}>{a.asset_tag}</Link></td><td className={td}>{a.description}</td><td className={td}>{a.custody_name}</td><td className={`${td} text-muted`}>{fmtDate(a.last_inspected_at)}</td></tr>
            ))}
          </Table>
        </Card>
        <Notifications actor={actor} />
      </div>
    </>
  );
}

async function AuditDash({ actor }: { actor: Actor }) {
  const db = getDb();
  const chain = await verifyAuditChain(db);
  const counts = await all<{ category: string; outcome: string; c: number }>(db, "SELECT category, outcome, COUNT(*) c FROM audit_events GROUP BY category, outcome ORDER BY category");
  const exp = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports"))!.c;
  const pa = actor.assignments.find((a) => a.roleCode === "INSPECTOR_GENERAL" || a.roleCode === "DIG_OPERATIONS");
  return (
    <>
      <SectionHeader eyebrow="Audit and compliance" title={title(actor)} description="Read-only evidence access within your time-limited audit grant." actions={<ButtonLink href="/app/audit" variant="primary">Open audit explorer</ButtonLink>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Audit chain integrity" value={chain.ok ? "Verified" : "BROKEN"} tone={chain.ok ? "ok" : "err"} hint={`${chain.checked} events hash-checked`} />
        <Stat label="Denied access attempts" value={counts.filter((c) => c.outcome === "DENIED").reduce((a, c) => a + c.c, 0)} href="/app/audit?outcome=DENIED" />
        <Stat label="Report exports logged" value={exp} href="/app/audit?category=EXPORT" />
        <Stat label="Audit grant expires" value={fmtDate(pa?.validTo)} hint="Time-limited, read-only" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Events by category" bodyClass="p-0">
          <Table head={["Category", "Outcome", "Events"]}>
            {counts.map((c) => <tr key={c.category + c.outcome}><td className={td}>{c.category}</td><td className={td}><Badge status={c.outcome} /></td><td className={`${td} tabular-nums`}>{c.c}</td></tr>)}
          </Table>
        </Card>
        <Card title="Audit scope">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Read-only: no business record can be modified with this role.</li>
            <li>Evidence exports are themselves audited.</li>
            <li>Grant valid until {fmtDate(pa?.validTo)}; access ends automatically.</li>
            <li>Business registers: <Link className="text-zp-blue hover:underline" href="/app/requests">requests</Link>, <Link className="text-zp-blue hover:underline" href="/app/fleet">fleet</Link>, <Link className="text-zp-blue hover:underline" href="/app/assets">assets</Link>.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

async function SecurityDash({ actor }: { actor: Actor }) {
  const db = getDb();
  const denied = await all<{ action: string; c: number }>(db, "SELECT action, COUNT(*) c FROM audit_events WHERE outcome='DENIED' GROUP BY action ORDER BY c DESC LIMIT 8");
  const iam = await all<{ occurred_at: string; action: string; actor: string | null; entity_id: string | null }>(db, "SELECT e.occurred_at, e.action, u.display_name actor, e.entity_id FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.category='IAM' ORDER BY e.seq DESC LIMIT 8");
  const suspended = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM users WHERE status <> 'ACTIVE'"))!.c;
  const reviews = await listReviews(db, actor);
  const auth = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM audit_events WHERE category='AUTH'"))!.c;
  return (
    <>
      <SectionHeader eyebrow="Security administration" title={title(actor)} description="Security events, privileged access changes and access recertification. Separate from business approvals."
        actions={<><ButtonLink href="/app/security">Security events</ButtonLink><ButtonLink href="/app/admin/reviews" variant="primary">Access reviews</ButtonLink></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Denied authorisation events" value={denied.reduce((a, d) => a + d.c, 0)} tone="warn" href="/app/security" />
        <Stat label="Authentication events" value={auth} href="/app/audit?category=AUTH" />
        <Stat label="Suspended / deactivated accounts" value={suspended} href="/app/admin/users" />
        <Stat label="Open access reviews" value={reviews.filter((r) => r.status === "OPEN").length} href="/app/admin/reviews" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Top denied actions" bodyClass="p-0">
          <Table head={["Action", "Count"]} empty="No denied events.">
            {denied.map((d) => <tr key={d.action}><td className={`${td} font-mono text-xs`}>{d.action}</td><td className={td}>{d.c}</td></tr>)}
          </Table>
        </Card>
        <Card title="Recent privileged access changes" bodyClass="p-0">
          <Table head={["When", "Action", "By"]} empty="No IAM changes.">
            {iam.map((e, i) => <tr key={i}><td className={`${td} text-muted`}>{fmtDateTime(e.occurred_at)}</td><td className={`${td} font-mono text-xs`}>{e.action}</td><td className={td}>{e.actor ?? "System"}</td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}

async function PlatformDash({ actor }: { actor: Actor }) {
  const db = getDb();
  const users = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM users"))!.c;
  const sessions = (await one<{ c: number }>(db, "SELECT COUNT(*) c FROM sessions"))!.c;
  const ver = await one<{ version: number; applied_at: string }>(db, "SELECT version, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1");
  return (
    <>
      <SectionHeader eyebrow="Platform administration" title={title(actor)} description="Technical administration and approved user provisioning. This role has no access to business records by default."
        actions={<><ButtonLink href="/app/platform">System health</ButtonLink><ButtonLink href="/app/admin/users" variant="primary">User provisioning</ButtonLink></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Application" value="Running" tone="ok" hint="Local process" />
        <Stat label="Database schema" value={`v${ver?.version ?? "?"}`} hint={`Applied ${fmtDate(ver?.applied_at)}`} />
        <Stat label="User accounts" value={users} href="/app/admin/users" />
        <Stat label="Active sessions" value={sessions} />
      </div>
      <div className="mt-4">
        <Notice tone="info" title="Separation of duties">
          The Superadmin provisions accounts and record approved role assignments and delegations, but cannot assign or change their own access, cannot approve business
          requests and cannot view requests, fleet or asset records.
        </Notice>
      </div>
    </>
  );
}

async function OrgDash({ actor }: { actor: Actor }) {
  const db = getDb();
  const changes = await listChanges(db, actor);
  const counts = await all<{ unit_type: string; c: number }>(db, "SELECT unit_type, COUNT(*) c FROM org_units WHERE status='ACTIVE' GROUP BY unit_type");
  const c = (t: string) => counts.find((x) => x.unit_type === t)?.c ?? 0;
  return (
    <>
      <SectionHeader eyebrow="Organisation registry" title={title(actor)} description="Propose effective-dated organisational changes for approval. You cannot approve your own proposals, and structural changes never grant user access."
        actions={<><ButtonLink href="/app/org">Directory</ButtonLink><ButtonLink href="/app/org/changes" variant="primary">Propose a change</ButtonLink></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Service HQ" value={c("SERVICE_HQ")} />
        <Stat label="Provincial divisions" value={c("PROVINCIAL_DIVISION")} href="/app/org" />
        <Stat label="Formations" value={c("FORMATION")} href="/app/org" />
        <Stat label="Changes awaiting decision" value={changes.filter((x) => x.status === "SUBMITTED").length} tone="warn" href="/app/org/changes" />
      </div>
      <div className="mt-4">
        <Card title="Recent change proposals" bodyClass="p-0">
          <Table head={["Reference", "Type", "Target", "Effective", "Status"]} empty="No proposals.">
            {changes.slice(0, 8).map((x) => <tr key={x.id}><td className={`${td} font-semibold`}>{x.reference}</td><td className={td}>{x.change_type.replace(/_/g, " ").toLowerCase()}</td><td className={td}>{x.target_name ?? JSON.parse(x.payload).name}</td><td className={td}>{fmtDate(x.effective_date)}</td><td className={td}><Badge status={x.status} /></td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
