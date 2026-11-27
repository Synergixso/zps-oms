import { environmentNotice } from "@/server/lib/environment";
import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { exportRoster, ROSTER_STATUS_LABEL } from "@/server/domain/manpower";
import { rosterPdf } from "@/server/domain/pdf";

/** Audited, server-generated roster PDF (A4). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  try {
    const r = await exportRoster(getDb(), actor, id, "pdf");
    const env = await environmentNotice(getDb());
    const pdf = await rosterPdf({
      request: r.request,
      version: { ...r.version, reference: (r.version as { reference?: string | null }).reference ?? null },
      entries: r.entries,
      statusLabel: ROSTER_STATUS_LABEL[r.version.status],
      printedBy: actor.displayName,
      stamp: env.outputStamp,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="roster-${r.request.reference}-v${r.version.version_no}${env.synthetic ? "-SYNTHETIC" : ""}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found or not authorised.", { status: e.code === "NOT_FOUND" ? 404 : 403 });
    throw e;
  }
}
