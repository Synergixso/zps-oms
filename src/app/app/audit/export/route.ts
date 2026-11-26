import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, getActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { exportAuditEvidence } from "@/server/domain/auditq";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await assertSameOrigin();
  } catch {
    return new NextResponse("Cross-origin request refused", { status: 403 });
  }
  const actor = await getActor();
  if (!actor) return NextResponse.redirect(new URL("/login?reason=signin", req.url), 303);
  const sp = req.nextUrl.searchParams;
  const f = { q: sp.get("q") ?? undefined, category: sp.get("category") ?? undefined, outcome: sp.get("outcome") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined };
  try {
    const { filename, csv } = await exportAuditEvidence(getDb(), actor, f);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (e) {
    return new NextResponse(e instanceof DomainError ? e.message : "Export failed.", { status: e instanceof DomainError && e.code === "FORBIDDEN" ? 403 : 400 });
  }
}
