import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404 } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { getSession, nominableOfficers, trainingFormOptions, NOMINATION_STATUS, SESSION_STATUS, TRAINING_CATEGORY } from "@/server/domain/training";
import { nominateAction, sessionStatusAction } from "@/server/actions/portfolios";
import { Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Select, Submit } from "@/components/forms";
import { Done } from "../../../command/shared";
import { NominationActions } from "../../nomination-actions";

export const metadata = { title: "Training session" };

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await requireActor();
  const db = getDb();
  const { id } = await params;
  const { done } = await searchParams;
  const v = await loadOr404(() => getSession(db, actor, id));
  const s = v.session;
  const opt = await trainingFormOptions(db, actor);
  const officers = v.canNominate ? await nominableOfficers(db, actor) : [];
  const nextStatus: Array<[string, string]> = v.administers
    ? ({ PLANNED: [["OPEN", "Open for nominations"], ["CANCELLED", "Cancel"]], OPEN: [["IN_PROGRESS", "Start"], ["CANCELLED", "Cancel"]], IN_PROGRESS: [["COMPLETED", "Complete"]] } as Record<string, Array<[string, string]>>)[s.status] ?? []
    : v.delivers ? ({ OPEN: [["IN_PROGRESS", "Start delivery"]], IN_PROGRESS: [["COMPLETED", "Complete delivery"]] } as Record<string, Array<[string, string]>>)[s.status] ?? [] : [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/training?tab=sessions" className="text-zp-blue hover:underline">← Training sessions</Link></p>
      <PageHeader eyebrow={`Training session · ${TRAINING_CATEGORY[s.category]}`} title={`${s.reference} — ${s.title}`}
        description={<>Delivered by {s.delivering_unit} · {fmtDate(s.start_date)} – {fmtDate(s.end_date)} · {s.approved} of {s.capacity} places filled · <Badge status={s.status} label={SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]} /></>} />
      <Done message={done} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Nominations" subtitle={v.delivers ? "Your unit delivers this session: record attendance and results." : v.administers ? "All nominees." : "Nominees from your units."} bodyClass="p-0">
            <Table head={["Reference", "Officer", "Nominated by unit", "Status", "Action"]} caption="Session nominations" empty="No nominations.">
              {v.nominations.map((n) => (
                <tr key={n.id}>
                  <td className={`${td} font-mono text-xs`}>{n.reference}</td>
                  <td className={td}>{n.officer}<span className="block text-xs text-muted">{n.rank_code} · {n.home_unit}</span></td>
                  <td className={`${td} text-ink-2`}>{n.nominating_unit}</td>
                  <td className={td}><Badge status={n.status} label={NOMINATION_STATUS[n.status as keyof typeof NOMINATION_STATUS]} />{n.certificate_ref && <span className="block text-xs text-muted">{n.certificate_ref}</span>}</td>
                  <td className={td}><NominationActions id={n.id} status={n.status} back={`/app/training/sessions/${s.id}`} admin={v.administers} recommend={opt.canRecommend} delivers={v.delivers} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {v.canNominate && officers.length > 0 && (
            <Card title="Nominate an officer" subtitle="Serving officers in your nomination scope">
              <ActionForm action={nominateAction}>
                <Hidden name="sessionId" value={s.id} />
                <Select label="Officer" name="personnelId" required options={officers.map((o) => ({ value: o.id, label: o.label }))} />
                <Submit>Nominate</Submit>
              </ActionForm>
            </Card>
          )}
          {nextStatus.length > 0 && (
            <Card title="Session status">
              <div className="flex flex-wrap gap-2">
                {nextStatus.map(([st, label]) => (
                  <ActionForm key={st} action={sessionStatusAction} className=""><Hidden name="id" value={s.id} /><Hidden name="status" value={st} /><Submit variant={st === "CANCELLED" ? "danger" : "secondary"}>{label}</Submit></ActionForm>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
