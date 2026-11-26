/** Role dashboards for the personnel, manpower and assignment levels (Directive §14). All figures are live, scoped queries. */
import Link from "next/link";
import { all, getDb } from "@/server/db/connection";
import { ROLE_BY_CODE, type DashboardKind } from "@/server/domain/catalogue";
import { type Actor, hasPermission, primaryAssignment, primaryRole, unitsFor } from "@/server/domain/policy";
import { DISPOSITIONS, personnelSummary } from "@/server/domain/personnel";
import { MPR_STATUS_LABEL, manpowerInbox, manpowerSummary, listManpowerRequests, myContributions } from "@/server/domain/manpower";
import { assignmentInbox, assignmentSummary, listAssignments, listTransfers } from "@/server/domain/assignments";
import { addDays, today } from "@/server/domain/core";
import { Badge, Bar, ButtonLink, Card, PageHeader, Stat, Table, td, fmtDate } from "@/components/ui";

type Inbox = Array<{ kind: string; reference: string; title: string; href: string }>;

async function inboxFor(actor: Actor): Promise<Inbox> {
  const db = getDb();
  const out: Inbox = [];
  if (hasPermission(actor, "manpower.view") || hasPermission(actor, "manpower.contribute")) out.push(...(await manpowerInbox(db, actor)));
  if (hasPermission(actor, "assignment.view")) out.push(...(await assignmentInbox(db, actor)).map((a) => ({ kind: a.kind, reference: a.reference, title: `${a.full_name} · ${a.area_name}`, href: a.href })));
  return out;
}

function InboxCard({ items, title = "Awaiting my action" }: { items: Inbox; title?: string }) {
  return (
    <Card title={`${title} (${items.length})`} action={<Link href="/app/approvals" className="text-xs font-semibold text-zp-blue hover:underline">All queues</Link>} bodyClass="p-0">
      <Table head={["Item", "Reference", "Subject"]} empty="Nothing awaiting your action.">
        {items.slice(0, 8).map((i, k) => <tr key={k}><td className={td}><Badge status="PENDING" label={i.kind} /></td><td className={td}><Link href={i.href} className="font-semibold text-zp-blue hover:underline">{i.reference}</Link></td><td className={td}>{i.title}</td></tr>)}
      </Table>
    </Card>
  );
}

/** Subordinate units of the actor's primary unit with live personnel and assignment counts. */
async function structure(actor: Actor) {
  const pa = primaryAssignment(actor);
  if (!pa) return [];
  return all<{ id: string; name: string; unit_type: string; depth: number; personnel: number; on_assignment: number }>(getDb(),
    `SELECT o.id, o.name, o.unit_type, c.depth,
            (SELECT COUNT(*) FROM personnel_records p JOIN org_unit_closure x ON x.descendant_id = p.home_unit_id AND x.ancestor_id = o.id) AS personnel,
            (SELECT COUNT(*) FROM personnel_assignments a JOIN org_unit_closure x ON x.descendant_id = a.home_unit_id AND x.ancestor_id = o.id WHERE a.status IN ('ACTIVE','TRANSFER_PENDING')) AS on_assignment
       FROM org_unit_closure c JOIN org_units o ON o.id = c.descendant_id WHERE c.ancestor_id = ? AND c.depth BETWEEN 0 AND 3 AND o.status = 'ACTIVE' ORDER BY c.depth, o.name LIMIT 40`, pa.orgUnitId);
}

function StructureCard({ rows, title }: { rows: Awaited<ReturnType<typeof structure>>; title: string }) {
  return (
    <Card title={title} subtitle="Personnel by home unit, including subordinate units" bodyClass="p-0">
      <Table head={["Unit", "Type", "Personnel", "On assignment"]} empty="No subordinate units.">
        {rows.map((u) => (
          <tr key={u.id}>
            <td className={td}><span style={{ paddingLeft: `${u.depth * 14}px` }} className="font-semibold">{u.name}</span></td>
            <td className={`${td} text-xs text-muted`}>{u.unit_type.replace(/_/g, " ").toLowerCase()}</td>
            <td className={`${td} tabular-nums`}>{hasLink(u.id, u.personnel)}</td>
            <td className={`${td} tabular-nums`}>{u.on_assignment}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
const hasLink = (unit: string, n: number) => <Link href={`/app/personnel?unit=${unit}`} className="text-zp-blue hover:underline">{n}</Link>;

/** Personnel, manpower and assignment tiles shared by every dashboard that has the permissions. */
export async function PersonnelOpsPanel({ actor }: { actor: Actor }) {
  const db = getDb();
  const [per, mpr, asg] = await Promise.all([
    hasPermission(actor, "personnel.view") ? personnelSummary(db, actor) : null,
    hasPermission(actor, "manpower.view") || hasPermission(actor, "manpower.contribute") ? manpowerSummary(db, actor) : null,
    hasPermission(actor, "assignment.view") ? assignmentSummary(db, actor) : null,
  ]);
  if (!per && !mpr && !asg) return null;
  return (
    <section aria-labelledby="ops-panel" className="mt-6">
      <h2 id="ops-panel" className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-2">Personnel, manpower and assignments</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {per && <Stat label="Personnel in scope" value={per.total} hint={`${per.available} available at home unit`} href="/app/personnel" />}
        {per && <Stat label="Unverified records" value={per.unverified} tone={per.unverified ? "warn" : "ok"} href="/app/personnel?verification=UNVERIFIED" />}
        {mpr && <Stat label="Open manpower requests" value={mpr.open} hint={`${mpr.approved} approved, in distribution`} href="/app/manpower?status=OPEN" />}
        {mpr && <Stat label="Contributions due" value={mpr.pendingContributions} tone={mpr.pendingContributions ? "warn" : "default"} href="/app/manpower/contributions" />}
        {asg && <Stat label="Active assignments" value={asg.active} hint={`${asg.underMinimumTenure} under minimum tenure`} href="/app/assignments" />}
        {asg && <Stat label="Reviews / transfers" value={`${asg.reviewDue} / ${asg.transfersOpen}`} tone={asg.reviewDue + asg.transfersOpen ? "warn" : "default"} href="/app/assignments?renewal=due" />}
      </div>
    </section>
  );
}

function header(actor: Actor, description: string) {
  const r = primaryRole(actor)!;
  const pa = primaryAssignment(actor);
  return <PageHeader eyebrow={pa?.orgUnitName ?? ""} title={ROLE_BY_CODE[r].dashboardTitle} description={description} />;
}

/** District, station and unit (post, department, company, detachment, platoon, section) command dashboards. */
async function UnitLevel({ actor, kind }: { actor: Actor; kind: DashboardKind }) {
  const db = getDb();
  const [rows, contribs, inbox, per, asg] = await Promise.all([
    structure(actor),
    hasPermission(actor, "manpower.contribute") ? myContributions(db, actor, "OPEN") : Promise.resolve([]),
    inboxFor(actor),
    hasPermission(actor, "personnel.view") ? personnelSummary(db, actor) : null,
    hasPermission(actor, "assignment.view") ? listAssignments(db, actor, { pageSize: 8 }) : null,
  ]);
  const label = kind === "DISTRICT_COMMAND" ? "District organisational overview" : kind === "STATION" ? "Station and posts" : "Unit structure";
  return (
    <>
      {header(actor, kind === "DISTRICT_COMMAND" ? "District Command overview: stations and posts, personnel, contribution requests, assignments and transfers." : kind === "STATION" ? "Station personnel register, contribution requests, draft submissions and assignment administration." : "Your unit's personnel, contribution requests and assignments.")}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Personnel" value={per?.total ?? 0} hint={`${per?.serving ?? 0} serving`} href="/app/personnel" />
        <Stat label="Available at home unit" value={per?.available ?? 0} href="/app/personnel?disposition=AVAILABLE_HOME" />
        <Stat label="On field assignment" value={per?.onAssignment ?? 0} href="/app/assignments" />
        <Stat label="Contribution requests open" value={contribs.length} tone={contribs.length ? "warn" : "default"} href="/app/manpower/contributions" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Contribution requests" bodyClass="p-0" action={<Link href="/app/manpower/contributions" className="text-xs font-semibold text-zp-blue hover:underline">Open</Link>}>
          <Table head={["Request", "Unit", "Required", "Selected", "Status"]} empty="No open contribution requests.">
            {contribs.map((c) => <tr key={c.id}><td className={td}><Link href={`/app/manpower/contributions/${c.id}`} className="font-semibold text-zp-blue hover:underline">{c.request_ref}</Link><span className="block text-xs text-muted">{c.purpose}</span></td><td className={td}>{c.unit_name}</td><td className={td}>{c.required_count}</td><td className={td}>{c.entries}</td><td className={td}><Badge status={c.status} label={c.status.toLowerCase()} /></td></tr>)}
          </Table>
        </Card>
        <InboxCard items={inbox} />
        <StructureCard rows={rows} title={label} />
        {asg && (
          <Card title="Current assignments of our personnel" bodyClass="p-0" action={<Link href="/app/assignments" className="text-xs font-semibold text-zp-blue hover:underline">Register</Link>}>
            <Table head={["Officer", "Area", "Review", "Status"]} empty="No current assignments.">
              {asg.rows.map((a) => <tr key={a.id}><td className={td}><Link href={`/app/assignments/${a.id}`} className="font-semibold text-zp-blue hover:underline">{a.full_name}</Link></td><td className={td}>{a.area_name}</td><td className={td}>{fmtDate(a.review_date)}</td><td className={td}><Badge status={a.status} label={DISPOSITIONS[a.disposition_status]} /></td></tr>)}
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}

/** Operations Staff Workspace — the main manpower working environment. */
async function OpsStaff({ actor }: { actor: Actor }) {
  const db = getDb();
  const [mpr, asg, inbox, requests, transfers] = await Promise.all([
    manpowerSummary(db, actor),
    hasPermission(actor, "assignment.view") ? assignmentSummary(db, actor) : null,
    inboxFor(actor),
    listManpowerRequests(db, actor, { status: "OPEN" }),
    hasPermission(actor, "assignment.view") ? listTransfers(db, actor, "OPEN") : Promise.resolve([]),
  ]);
  return (
    <>
      {header(actor, "Manpower request creation, contribution management, roster building, assignment register, transfers, tenure and renewals.")}
      <div className="mb-4 flex flex-wrap gap-2">
        {hasPermission(actor, "manpower.create") && <ButtonLink href="/app/manpower/new" variant="primary">New manpower request</ButtonLink>}
        {hasPermission(actor, "personnel.view") && <ButtonLink href="/app/personnel">Personnel directory</ButtonLink>}
        {hasPermission(actor, "roster.view") && <ButtonLink href="/app/rosters">Rosters</ButtonLink>}
        {hasPermission(actor, "assignment.view") && <ButtonLink href="/app/assignments">Assignment register</ButtonLink>}
        {hasPermission(actor, "area.view") && <ButtonLink href="/app/areas">Operational areas</ButtonLink>}
        {hasPermission(actor, "report.view") && <ButtonLink href="/app/reports">Reports</ButtonLink>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Requests in review" value={mpr.open} href="/app/manpower?status=OPEN" />
        <Stat label="Approved — distributing" value={mpr.approved} href="/app/manpower?status=APPROVED" />
        <Stat label="Contributions to review" value={mpr.contributionsToReview} tone={mpr.contributionsToReview ? "warn" : "default"} />
        <Stat label="Rosters in preparation" value={mpr.rostersInPreparation} href="/app/rosters" />
        <Stat label="Approved personnel lists" value={mpr.rostersApproved} href="/app/rosters" />
        <Stat label="Reviews due" value={asg?.reviewDue ?? 0} tone={asg?.reviewDue ? "warn" : "default"} href="/app/assignments?renewal=due" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InboxCard items={inbox} title="Workflow items for me" />
        <Card title="Manpower requests in progress" bodyClass="p-0">
          <Table head={["Reference", "Purpose", "Required / offered", "Status"]} empty="No open requests.">
            {requests.slice(0, 8).map((m) => <tr key={m.id}><td className={td}><Link href={`/app/manpower/${m.id}`} className="font-mono text-xs text-zp-blue hover:underline">{m.reference}</Link></td><td className={td}>{m.purpose}</td><td className={td}>{m.total_required} / {m.contributed}</td><td className={td}><Badge status={m.status} label={MPR_STATUS_LABEL[m.status]} /></td></tr>)}
          </Table>
        </Card>
        {asg && (
          <Card title="Active assignments by operational area">
            <div className="space-y-3">{asg.byArea.length ? asg.byArea.map((a) => <Bar key={a.area_id} label={a.name} value={Number(a.c)} max={Math.max(...asg.byArea.map((x) => Number(x.c)))} />) : <p className="text-sm text-muted">No active assignments.</p>}</div>
          </Card>
        )}
        <Card title="Transfers in progress" bodyClass="p-0">
          <Table head={["Reference", "Officer", "From → to", "Stage"]} empty="No open transfers.">
            {transfers.slice(0, 8).map((t) => <tr key={t.id}><td className={td}><Link href={`/app/transfers/${t.id}`} className="font-mono text-xs text-zp-blue hover:underline">{t.reference}</Link></td><td className={td}>{t.full_name}</td><td className={td}>{t.from_area_name} → {t.to_area_name}</td><td className={td}><Badge status="PENDING" label={t.status === "PENDING_RELEASE" ? "releasing" : "receiving"} /></td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}

async function PersonnelAdmin({ actor }: { actor: Actor }) {
  const db = getDb();
  const per = await personnelSummary(db, actor);
  const units = unitsFor(actor, "personnel.view");
  const scope = units === null ? "1=1" : units.length ? `p.home_unit_id IN (${units.map(() => "?").join(",")})` : "1=0";
  const recent = await all<{ id: string; personnel_ref: string; name: string; unit: string; verification_status: string; created_at: string }>(db,
    `SELECT p.id, p.personnel_ref, CONCAT(p.surname, ', ', p.first_names) AS name, o.name AS unit, p.verification_status, p.created_at FROM personnel_records p JOIN org_units o ON o.id = p.home_unit_id
      WHERE ${scope} AND p.verification_status <> 'VERIFIED' ORDER BY p.created_at DESC LIMIT 10`, ...(units ?? []));
  return (
    <>
      {header(actor, "Personnel master records, verification and organisational memberships within your scope.")}
      <div className="mb-4 flex flex-wrap gap-2">
        {hasPermission(actor, "personnel.register") && <ButtonLink href="/app/personnel/new" variant="primary">Register officer</ButtonLink>}
        <ButtonLink href="/app/personnel">Personnel register</ButtonLink>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Records in scope" value={per.total} href="/app/personnel" />
        <Stat label="Serving" value={per.serving} href="/app/personnel?employment=SERVING" />
        <Stat label="Awaiting verification" value={per.unverified} tone={per.unverified ? "warn" : "ok"} href="/app/personnel?verification=UNVERIFIED" />
        <Stat label="On field assignment" value={per.onAssignment} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Records not yet verified" bodyClass="p-0">
          <Table head={["Reference", "Officer", "Home unit", "Registered"]} empty="All records are verified.">
            {recent.map((p) => <tr key={p.id}><td className={`${td} font-mono text-xs`}><Link href={`/app/personnel/${p.id}`} className="text-zp-blue hover:underline">{p.personnel_ref}</Link></td><td className={td}>{p.name}</td><td className={td}>{p.unit}</td><td className={td}>{fmtDate(p.created_at)}</td></tr>)}
          </Table>
        </Card>
        <Card title="Disposition of personnel">
          <div className="space-y-3">{per.byDisposition.sort((a, b) => b[1] - a[1]).map(([k, n]) => <Bar key={k} label={DISPOSITIONS[k as keyof typeof DISPOSITIONS] ?? k} value={n} max={per.total} tone="blue" />)}</div>
        </Card>
      </div>
    </>
  );
}

async function AssignmentAdmin({ actor }: { actor: Actor }) {
  const db = getDb();
  const [asg, inbox, due, transfers] = await Promise.all([
    assignmentSummary(db, actor), inboxFor(actor),
    listAssignments(db, actor, { reviewBy: addDays(today(), 60), status: "ACTIVE", pageSize: 10 }),
    listTransfers(db, actor, "OPEN"),
  ]);
  return (
    <>
      {header(actor, `Assignments, transfers, disposition, tenure reviews and renewals. Proposed minimum tenure: ${asg.policy.minimumDays} days.`)}
      <div className="mb-4 flex flex-wrap gap-2">
        {hasPermission(actor, "assignment.propose") && <ButtonLink href="/app/assignments/new" variant="primary">Propose assignment</ButtonLink>}
        <ButtonLink href="/app/assignments">Assignment register</ButtonLink>
        <ButtonLink href="/app/transfers">Transfers</ButtonLink>
        {hasPermission(actor, "area.view") && <ButtonLink href="/app/areas">Operational areas</ButtonLink>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Active" value={asg.active} href="/app/assignments" />
        <Stat label="Awaiting approval" value={asg.pendingApproval} tone={asg.pendingApproval ? "warn" : "default"} href="/app/assignments?status=PENDING_APPROVAL" />
        <Stat label="Approved, not commenced" value={asg.approvedPending} href="/app/assignments?status=APPROVED" />
        <Stat label="Review / renewal due" value={asg.reviewDue} tone={asg.reviewDue ? "warn" : "default"} href="/app/assignments?renewal=due" />
        <Stat label="Transfers open" value={asg.transfersOpen} href="/app/transfers" />
        <Stat label="Under minimum tenure" value={asg.underMinimumTenure} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InboxCard items={inbox} title="Decisions awaiting me" />
        <Card title="Reviews due in the next 60 days" bodyClass="p-0">
          <Table head={["Officer", "Area", "Review date", "Disposition"]} empty="No reviews due.">
            {due.rows.map((a) => <tr key={a.id}><td className={td}><Link href={`/app/assignments/${a.id}`} className="font-semibold text-zp-blue hover:underline">{a.full_name}</Link></td><td className={td}>{a.area_name}</td><td className={td}>{fmtDate(a.review_date)}</td><td className={td}><Badge status="PENDING" label={DISPOSITIONS[a.disposition_status]} /></td></tr>)}
          </Table>
        </Card>
        <Card title="Active assignments by area"><div className="space-y-3">{asg.byArea.map((a) => <Bar key={a.area_id} label={a.name} value={Number(a.c)} max={Math.max(...asg.byArea.map((x) => Number(x.c)))} />)}</div></Card>
        <Card title="Transfers in progress" bodyClass="p-0">
          <Table head={["Reference", "Officer", "From → to"]} empty="No open transfers.">{transfers.slice(0, 8).map((t) => <tr key={t.id}><td className={td}><Link href={`/app/transfers/${t.id}`} className="font-mono text-xs text-zp-blue hover:underline">{t.reference}</Link></td><td className={td}>{t.full_name}</td><td className={td}>{t.from_area_name} → {t.to_area_name}</td></tr>)}</Table>
        </Card>
      </div>
    </>
  );
}

async function Management({ actor }: { actor: Actor }) {
  return (
    <>
      {header(actor, "Read-only management information within your authorised scope. No modification privileges.")}
      <div className="mb-4 flex flex-wrap gap-2">{hasPermission(actor, "report.view") && <ButtonLink href="/app/reports" variant="primary">Reports</ButtonLink>}{hasPermission(actor, "roster.view") && <ButtonLink href="/app/rosters">Approved personnel lists</ButtonLink>}</div>
      <PersonnelOpsPanel actor={actor} />
    </>
  );
}

export async function PersonnelDashboard({ actor, kind }: { actor: Actor; kind: DashboardKind }) {
  switch (kind) {
    case "DISTRICT_COMMAND":
    case "STATION":
    case "UNIT_COMMAND":
      return <UnitLevel actor={actor} kind={kind} />;
    case "OPS_STAFF_WORKSPACE":
      return <OpsStaff actor={actor} />;
    case "PERSONNEL_ADMIN":
      return <PersonnelAdmin actor={actor} />;
    case "ASSIGNMENT_ADMIN":
      return <AssignmentAdmin actor={actor} />;
    default:
      return <Management actor={actor} />;
  }
}
