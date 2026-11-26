import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { loadOr404, pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { ROLE_BY_CODE } from "@/server/domain/catalogue";
import { reviewItems } from "@/server/domain/iam";
import { decideReviewItemAction } from "@/server/actions/iam";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Hidden, Submit } from "@/components/forms";

export const metadata = { title: "Access review" };

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  if (!await pageAllowed(actor, "accessreview.manage")) return <AccessDenied what="access reviews" />;
  const { review, items } = await loadOr404(() => reviewItems(getDb(), actor, id));
  const open = review.status === "OPEN";
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/admin/reviews" className="text-zp-blue hover:underline">← Access reviews</Link></p>
      <PageHeader eyebrow={review.reference} title={review.title} description={<Badge status={review.status} />} />
      <Card bodyClass="p-0" title={`${items.filter((i) => i.decision).length} of ${items.length} decided`}>
        <Table head={["User", "Role", "Scope", "Valid to", "Justification", "Decision"]}>
          {items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className={td}><Link className="text-zp-blue hover:underline" href={`/app/admin/users/${i.user_id}`}>{i.user_name}</Link></td>
              <td className={td}>{ROLE_BY_CODE[i.role_code]?.name}</td>
              <td className={td}>{i.org_name}</td>
              <td className={td}>{fmtDate(i.valid_to)}</td>
              <td className={`${td} text-xs text-ink-2`}>{i.justification}</td>
              <td className={`${td} min-w-[250px]`}>
                {i.decision ? (
                  <span><Badge status={i.decision} />{i.note ? <span className="block text-xs text-muted">{i.note}</span> : null}</span>
                ) : open ? (
                  <ActionForm action={decideReviewItemAction} className="flex flex-wrap items-end gap-2">
                    <Hidden name="itemId" value={i.id} />
                    <label className="sr-only" htmlFor={`n-${i.id}`}>Note</label>
                    <input id={`n-${i.id}`} name="note" placeholder="Note (required to revoke)" className="w-40 rounded-md border border-line-2 px-2 py-1.5 text-xs" />
                    <Submit name="decision" value="RETAIN" variant="secondary">Retain</Submit>
                    <Submit name="decision" value="REVOKE" variant="danger">Revoke</Submit>
                  </ActionForm>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
