import type { ActivityRow, SessionRow } from "@/server/domain/account-activity";
import { endSessionAction } from "@/server/actions/sessions";
import { Card, Table, td, fmtDateTime } from "./ui";
import { ActionForm, Hidden, Submit } from "./forms";

/** Active sessions and sign-in / account history (Module 02). Server component; actions re-check on the server. */
export function AccountActivity({ sessions, history, canEnd, back, userId }: { sessions: SessionRow[]; history: ActivityRow[]; canEnd: boolean; back: "profile" | "admin"; userId: string }) {
  return (
    <>
      <Card title={`Active sessions (${sessions.length})`} subtitle="Sessions end after 30 minutes of inactivity and at most 8 hours after sign-in." bodyClass="p-0">
        <Table head={["Session", "Signed in", "Last activity", "Role context", ...(canEnd ? [""] : [])]} caption="Active sessions" empty="No active sessions.">
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className={`${td} font-mono text-xs`}>{s.short}{s.current && <span className="ml-1.5 rounded bg-ok-bg px-1.5 py-0.5 font-sans text-[10px] font-bold text-ok">THIS DEVICE</span>}</td>
              <td className={`${td} text-ink-2`}>{fmtDateTime(s.created_at)}</td>
              <td className={`${td} text-ink-2`}>{fmtDateTime(s.last_seen_at)}</td>
              <td className={`${td} text-ink-2`}>{s.role_context ?? "Default"}</td>
              {canEnd && (
                <td className={td}>
                  {!s.current && (
                    <ActionForm action={endSessionAction} className="">
                      <Hidden name="sessionId" value={s.id} /><Hidden name="back" value={back} /><Hidden name="userId" value={userId} />
                      <Submit variant="secondary" confirm="End this session? That device will be signed out.">End session</Submit>
                    </ActionForm>
                  )}
                </td>
              )}
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Sign-in and account history" subtitle="From the audit trail (latest 100 events). Failed sign-ins and lockouts are included." bodyClass="p-0">
        <Table head={["When", "Event", "Outcome", "Recorded by"]} caption="Sign-in and account history" empty="No sign-in or account events recorded.">
          {history.map((h, i) => (
            <tr key={i}>
              <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(h.occurred_at)}</td>
              <td className={td}>{h.summary}</td>
              <td className={`${td} ${h.outcome === "SUCCESS" ? "text-ok" : "font-semibold text-err"}`}>{h.outcome === "SUCCESS" ? "Success" : h.outcome === "DENIED" ? "Refused" : "Failed"}</td>
              <td className={`${td} text-ink-2`}>{h.actor_name ?? "System"}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
