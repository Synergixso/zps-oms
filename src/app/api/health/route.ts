import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/connection";
import { liveness, readiness } from "@/server/domain/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/health           readiness: 200 when the database answers and the schema is current, else 503.
 * GET /api/health?probe=live liveness: 200 while the process answers (no database call).
 * No sensitive information is returned (see src/server/domain/health.ts).
 */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (req.nextUrl.searchParams.get("probe") === "live") return NextResponse.json(liveness(), { headers });
  const h = await readiness(getDb());
  return NextResponse.json(h, { status: h.status === "ok" ? 200 : 503, headers });
}
