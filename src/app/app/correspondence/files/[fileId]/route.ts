import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { downloadFile } from "@/server/domain/correspondence";

/**
 * Audited download of a stored correspondence document. Always served as an attachment (never rendered inline
 * by this origin) with a sandboxing policy, so a document cannot run in the application's context.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const actor = await requireActor();
  const { fileId } = await params;
  try {
    const f = await downloadFile(getDb(), actor, fileId);
    const ascii = f.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
    return new NextResponse(new Uint8Array(f.content), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found or not authorised.", { status: e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 403 });
    throw e;
  }
}
