import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { getDb } from "@/server/db/connection";
import { listReviews } from "@/server/domain/iam";
import { openReviewAction } from "@/server/actions/iam";
import { AccessDenied, Badge, Card, PageHeader, Table, td, fmtDate } from "@/components/ui";
import { ActionForm, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Access reviews" };

export default async function Reviews() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "accessreview.manage")) return <AccessDenied what="access reviews" />;
  const reviews = await listReviews(getDb(), actor);
  return (
    <>
      <PageHeader eyebrow="M02 · Access recertification" title="Access reviews" description="Periodic recertification of every active role assignment. Reviewers cannot certify their own access. Revocations take effect immediately." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" bodyClass="p-0">
          <Table head={["Reference", "Title", "Progress", "Status", "Opened", "Completed"]} empty="No reviews yet.">
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className={td}><Link href={`/app/admin/reviews/${r.id}`} className="font-semibold text-zp-blue hover:underline">{r.reference}</Link></td>
                <td className={td}>{r.title}</td>
                <td className={`${td} tabular-nums`}>{r.decided} / {r.total}</td>
                <td className={td}><Badge status={r.status} /></td>
                <td className={td}>{fmtDate(r.created_at)}</td>
                <td className={td}>{fmtDate(r.completed_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Open a review campaign" subtitle="Snapshots all currently active assignments">
          <ActionForm action={openReviewAction}>
            <TextField label="Title" name="title" required placeholder="e.g. Quarterly recertification (synthetic)" />
            <Submit>Open review</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
