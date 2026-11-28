import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { hasPermission } from "@/server/domain/policy";
import {
  administersTraining, listCourses, listInstitutions, listNeeds, listNominations, listSessions, trainingFormOptions, trainingOverview,
  NEED_STATUS, NOMINATION_STATUS, SESSION_STATUS, TRAINING_CATEGORY,
} from "@/server/domain/training";
import { createCourseAction, createSessionAction, decideNeedAction, submitNeedAction } from "@/server/actions/portfolios";
import { NominationActions } from "./nomination-actions";
import { AccessDenied, Badge, Card, Notice, PageHeader, Stat, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit, TextArea, TextField } from "@/components/forms";
import { Done } from "../command/shared";

export const metadata = { title: "Training and development" };

const TABS = [["overview", "Overview"], ["needs", "Training needs"], ["sessions", "Sessions"], ["nominations", "Nominations"], ["catalogue", "Course catalogue"]] as const;
const catOptions = Object.entries(TRAINING_CATEGORY).map(([value, label]) => ({ value, label }));

/**
 * Training and professional development (DIG Administration portfolio, DEC-086). Units submit needs and nominate;
 * a recommending officer recommends; the DIG Administration office plans and approves; the delivering formation records
 * attendance and results. Every rule is enforced in domain/training.ts.
 */
export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ tab?: string; done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const admin = await administersTraining(db, actor);
  if (!admin && !hasPermission(actor, "training.view")) return <AccessDenied />;
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "overview";
  const opt = await trainingFormOptions(db, actor);
  return (
    <>
      <PageHeader eyebrow="DIG Administration portfolio" title="Training and professional development"
        description="Service-wide training needs, course catalogue, sessions, nominations, attendance and certification. Delivering formations keep their own command line; DIG Administration administers the national programme." />
      <Done message={sp.done} />
      <nav aria-label="Training sections" className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/app/training?tab=${k}`} aria-current={k === tab ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${k === tab ? "border-zp-blue bg-zp-blue text-white" : "border-line bg-white text-ink hover:bg-slate-50"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "overview" && <Overview />}
      {tab === "needs" && <Needs />}
      {tab === "sessions" && <Sessions />}
      {tab === "nominations" && <Nominations />}
      {tab === "catalogue" && <Catalogue />}
    </>
  );

  async function Overview() {
    const o = await trainingOverview(db, actor);
    const sum = (k: "nominated" | "approved" | "completed" | "notCompleted") => o.byDivision.reduce((a, r) => a + r[k], 0);
    const openNeeds = o.needs.filter((n) => ["SUBMITTED", "ACCEPTED"].includes(n.status)).reduce((a, n) => a + n.count, 0);
    const cap = o.sessions.filter((s) => ["OPEN", "IN_PROGRESS", "PLANNED"].includes(s.status)).reduce((a, s) => ({ c: a.c + s.capacity, f: a.f + s.filled }), { c: 0, f: 0 });
    return (
      <>
        <div className="mb-4"><Notice tone="info">{o.national ? "National view (DIG Administration)." : "Figures for the units in your scope."} Counts only — individual records are on the nominations list for authorised users.</Notice></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Training needs open" value={openNeeds} href="/app/training?tab=needs" />
          <Stat label="Awaiting decision" value={sum("nominated")} href="/app/training?tab=nominations" />
          <Stat label="Approved / attending" value={sum("approved")} />
          <Stat label="Completed" value={sum("completed")} tone="ok" />
          <Stat label="Not completed" value={sum("notCompleted")} />
          <Stat label="Certificates due for renewal (90 days)" value={o.renewalsDue90} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Participation by Division / formation" bodyClass="p-0">
            <Table head={["Division / formation", "Awaiting decision", "Approved / attending", "Completed", "Not completed"]} caption="Training participation by Division" empty="No nominations yet.">
              {o.byDivision.map((r) => <tr key={r.division}><td className={td}>{r.division}</td><td className={td}>{r.nominated}</td><td className={td}>{r.approved}</td><td className={td}>{r.completed}</td><td className={td}>{r.notCompleted}</td></tr>)}
            </Table>
          </Card>
          <Card title="Capacity utilisation" subtitle={`${cap.f} of ${cap.c} places filled on planned, open and running sessions`} bodyClass="p-0">
            <Table head={["Session status", "Sessions", "Places", "Filled"]} caption="Session capacity" empty="No sessions.">
              {o.sessions.map((s) => <tr key={s.status}><td className={td}>{SESSION_STATUS[s.status as keyof typeof SESSION_STATUS] ?? s.status}</td><td className={td}>{s.count}</td><td className={td}>{s.capacity}</td><td className={td}>{s.filled}</td></tr>)}
            </Table>
          </Card>
        </div>
      </>
    );
  }

  async function Needs() {
    const needs = await listNeeds(db, actor);
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Training needs" subtitle="Submitted by Provincial Divisions, formations and commands; decided by DIG Administration" bodyClass="p-0">
            <Table head={["Reference", "Unit", "Need", "Officers", "Priority", "Status", ...(admin ? ["Decision"] : [])]} caption="Training needs" empty="No training needs recorded.">
              {needs.map((n) => (
                <tr key={n.id}>
                  <td className={`${td} font-mono text-xs`}>{n.reference}</td><td className={td}>{n.unit}</td>
                  <td className={td}><span className="font-semibold">{n.topic}</span><span className="block text-xs text-muted">{TRAINING_CATEGORY[n.category]} · {n.justification}</span>{n.decision_note && <span className="block text-xs text-ink-2">Decision: {n.decision_note}</span>}</td>
                  <td className={td}>{n.officers_count}</td><td className={td}>{n.priority.toLowerCase()}</td><td className={td}><Badge status={n.status} label={NEED_STATUS[n.status as keyof typeof NEED_STATUS]} /></td>
                  {admin && <td className={td}>{["SUBMITTED", "ACCEPTED", "PLANNED"].includes(n.status) ? (
                    <ActionForm action={decideNeedAction} className="flex flex-wrap items-center gap-1">
                      <Hidden name="id" value={n.id} />
                      <select name="status" aria-label={`Decision on ${n.reference}`} className="rounded-md border border-line-2 px-2 py-1 text-xs" defaultValue={n.status === "SUBMITTED" ? "ACCEPTED" : "MET"}>
                        {["ACCEPTED", "PLANNED", "MET", "DECLINED"].map((s) => <option key={s} value={s}>{NEED_STATUS[s as keyof typeof NEED_STATUS]}</option>)}
                      </select>
                      <input name="note" aria-label={`Note for ${n.reference}`} placeholder="Note" maxLength={300} className="w-28 rounded-md border border-line-2 px-2 py-1 text-xs" />
                      <Submit variant="secondary">Save</Submit>
                    </ActionForm>) : "—"}</td>}
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        {opt.canSubmitNeed && (
          <Card title="Submit a training need">
            <ActionForm action={submitNeedAction} resetOnSuccess>
              <Select label="Requesting unit" name="requestingUnitId" required options={opt.needUnits.map((u) => ({ value: u.id, label: u.name }))} />
              <TextField label="Training need" name="topic" required maxLength={160} />
              <Select label="Category" name="category" required options={catOptions} />
              <Select label="Course (if known)" name="courseId" placeholder="Not specified" options={opt.courses.map((c) => ({ value: c.id, label: c.title }))} />
              <TextField label="Officers" name="officersCount" type="number" required defaultValue={1} />
              <Select label="Priority" name="priority" required defaultValue="MEDIUM" options={[{ value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" }]} />
              <TextArea label="Justification" name="justification" required maxLength={500} rows={3} />
              <Submit>Submit need</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    );
  }

  async function Sessions() {
    const sessions = await listSessions(db, actor);
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Training sessions" bodyClass="p-0">
            <Table head={["Reference", "Course", "Delivered by", "Dates", "Places", "Status"]} caption="Training sessions" empty="No sessions planned.">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className={td}><Link className="font-mono text-xs font-semibold text-zp-blue hover:underline" href={`/app/training/sessions/${s.id}`}>{s.reference}</Link></td>
                  <td className={td}>{s.title}<span className="block text-xs text-muted">{TRAINING_CATEGORY[s.category]}</span></td><td className={`${td} text-ink-2`}>{s.delivering_unit}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(s.start_date)} – {fmtDate(s.end_date)}</td><td className={td}>{s.approved}/{s.capacity}{s.nominated ? <span className="block text-xs text-muted">{s.nominated} pending</span> : null}</td>
                  <td className={td}><Badge status={s.status} label={SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        {admin && (
          <Card title="Plan a session" subtitle="DIG Administration">
            <ActionForm action={createSessionAction}>
              <Select label="Course" name="courseId" required options={opt.courses.map((c) => ({ value: c.id, label: c.title }))} />
              <Select label="Delivering unit or formation" name="deliveringUnitId" required options={opt.deliveringUnits.map((u) => ({ value: u.id, label: u.name }))} />
              <TextField label="Start date" name="startDate" type="date" required />
              <TextField label="End date" name="endDate" type="date" required />
              <TextField label="Places" name="capacity" type="number" required defaultValue={20} />
              <Submit>Plan session</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    );
  }

  async function Nominations() {
    const list = await listNominations(db, actor);
    return (
      <Card title="Nominations" subtitle="Nominate from a session's page. Recommendation by a different officer; approval by DIG Administration; attendance and results by the delivering unit." bodyClass="p-0">
        <Table head={["Reference", "Officer", "Session", "Nominated by unit", "Status", "Action"]} caption="Training nominations" empty="No nominations in your scope.">
          {list.map((n) => (
            <tr key={n.id}>
              <td className={`${td} font-mono text-xs`}>{n.reference}</td>
              <td className={td}>{n.officer}<span className="block text-xs text-muted">{n.rank_code} · {n.home_unit}</span></td>
              <td className={td}><Link className="text-zp-blue hover:underline" href={`/app/training/sessions/${n.session_id}`}>{n.session_ref}</Link><span className="block text-xs text-muted">{n.title}</span></td>
              <td className={`${td} text-ink-2`}>{n.nominating_unit}</td>
              <td className={td}><Badge status={n.status} label={NOMINATION_STATUS[n.status as keyof typeof NOMINATION_STATUS]} />{n.certificate_ref && <span className="block text-xs text-muted">Certificate {n.certificate_ref}{n.certificate_expiry ? `, renew by ${fmtDate(n.certificate_expiry)}` : ""}</span>}</td>
              <td className={td}><NominationActions id={n.id} status={n.status} back="/app/training?tab=nominations" admin={admin} recommend={opt.canRecommend} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    );
  }

  async function Catalogue() {
    const [courses, institutions] = await Promise.all([listCourses(db, actor), listInstitutions(db, actor)]);
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Course catalogue" bodyClass="p-0">
            <Table head={["Code", "Course", "Institution", "Days", "Certification", "Renewal"]} caption="Course catalogue" empty="No courses.">
              {courses.map((c) => (
                <tr key={c.id}><td className={`${td} font-mono text-xs`}>{c.code}</td><td className={td}>{c.title}<span className="block text-xs text-muted">{TRAINING_CATEGORY[c.category]}{c.eligibility ? ` · ${c.eligibility}` : ""}</span></td>
                  <td className={`${td} text-ink-2`}>{c.institution}</td><td className={td}>{c.duration_days}</td><td className={td}>{c.certification ?? "—"}</td><td className={td}>{c.renewal_months ? `${c.renewal_months} months` : "—"}</td></tr>
              ))}
            </Table>
          </Card>
          <Card title="Training institutions" bodyClass="p-0">
            <Table head={["Code", "Institution", "Type", "Unit"]} caption="Training institutions">
              {institutions.map((i) => <tr key={i.id}><td className={`${td} font-mono text-xs`}>{i.code}</td><td className={td}>{i.name}</td><td className={td}>{i.kind.toLowerCase()}</td><td className={`${td} text-ink-2`}>{i.unit ?? "—"}</td></tr>)}
            </Table>
          </Card>
        </div>
        {admin && (
          <Card title="Add a course" subtitle="DIG Administration">
            <ActionForm action={createCourseAction} resetOnSuccess>
              <TextField label="Code" name="code" required maxLength={30} hint="Upper-case letters, digits, hyphens." />
              <TextField label="Title" name="title" required maxLength={160} />
              <Select label="Institution" name="institutionId" required options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
              <Select label="Category" name="category" required options={catOptions} />
              <TextField label="Duration (days)" name="durationDays" type="number" required defaultValue={5} />
              <TextField label="Eligibility" name="eligibility" maxLength={200} />
              <TextField label="Certification" name="certification" maxLength={120} />
              <TextField label="Renewal (months)" name="renewalMonths" type="number" />
              <Submit>Add course</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    );
  }
}
