import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, getActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { exportReport } from "@/server/domain/reports";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await assertSameOrigin();
  } catch {
    return new NextResponse("Cross-origin request refused", { status: 403 });
  }
  const actor = await getActor();
  if (!actor) return NextResponse.redirect(new URL("/login?reason=signin", req.url), 303);
  const { code } = await params;
  const fd = await req.formData();
  const fields = fd.getAll("fields").filter((f): f is string => typeof f === "string");
  const format = fd.get("format") === "xlsx" ? "xlsx" : "csv";
  try {
    const { filename, csv, xlsx } = await exportReport(getDb(), actor, code, fields, { format });
    return new NextResponse(xlsx ? new Uint8Array(xlsx) : csv, {
      headers: {
        "Content-Type": xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof DomainError ? e.message : "Export failed.";
    return NextResponse.redirect(new URL(`/app/reports/${encodeURIComponent(code)}?error=${encodeURIComponent(msg)}`, req.url), 303);
  }
}
