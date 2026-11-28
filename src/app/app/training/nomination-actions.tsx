import { nominationStepAction } from "@/server/actions/portfolios";
import { ActionForm, Hidden, Submit } from "@/components/forms";

/** Buttons for the next step a nomination can take; the domain decides whether the user may take it. */
export function NominationActions({ id, status, back, admin, recommend, delivers }: { id: string; status: string; back: string; admin: boolean; recommend: boolean; delivers?: boolean }) {
  const step = (s: string, label: string, variant: "primary" | "secondary" | "danger" = "secondary", note?: string) => (
    <ActionForm action={nominationStepAction} className="inline-flex items-center gap-1">
      <Hidden name="id" value={id} /><Hidden name="step" value={s} /><Hidden name="back" value={back} />
      {note && <input name="note" aria-label={note} placeholder={note} maxLength={300} className="w-28 rounded-md border border-line-2 px-2 py-1 text-xs" />}
      {s === "COMPLETE" && <input name="certificateRef" aria-label="Certificate reference" placeholder="Certificate ref." maxLength={60} className="w-28 rounded-md border border-line-2 px-2 py-1 text-xs" />}
      <Submit variant={variant}>{label}</Submit>
    </ActionForm>
  );
  return (
    <div className="flex flex-wrap gap-1">
      {status === "NOMINATED" && recommend && <>{step("RECOMMEND", "Recommend")}{step("NOT_RECOMMEND", "Not recommend", "secondary", "Reason")}</>}
      {status === "RECOMMENDED" && admin && <>{step("APPROVE", "Approve", "primary")}{step("REJECT", "Reject", "danger", "Reason")}</>}
      {status === "APPROVED" && delivers && step("ATTEND", "Mark attending", "primary")}
      {status === "ATTENDED" && delivers && <>{step("COMPLETE", "Completed", "primary")}{step("NOT_COMPLETE", "Not completed", "secondary", "Note")}</>}
      {["NOMINATED", "RECOMMENDED", "APPROVED"].includes(status) && step("WITHDRAW", "Withdraw", "secondary", "Reason")}
    </div>
  );
}
