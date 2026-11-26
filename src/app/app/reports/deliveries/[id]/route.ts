import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { getDelivery } from "@/server/domain/report-schedules";

export const dynamic = "force-dynamic";

/** Downloads a scheduled report delivery: owner only, while the report is still within the owner's functions (audited). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.redirect(new URL("/login?reason=signin", req.url), 303);
  const { id } = await params;
  try {
    const { filename, csv } = await getDelivery(getDb(), actor, id);
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
