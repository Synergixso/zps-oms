import { environmentNotice } from "@/server/lib/environment";
import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { exportRoster, ROSTER_STATUS_LABEL } from "@/server/domain/manpower";
import { buildXlsx } from "@/server/lib/xlsx";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

const i = (v: string) => Number(v);

/** Audited export: native Excel workbook (?format=xlsx) or CSV. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  try {
    const xlsx = req.nextUrl.searchParams.get("format") === "xlsx";
    const r = await exportRoster(getDb(), actor, id, xlsx ? "xlsx" : "csv");
    const env = await environmentNotice(getDb());
    const head = [
      [env.outputStamp ? `ZPS-OMS roster - ${env.outputStamp}` : "ZPS-OMS roster"],
      ["Request", r.request.reference, r.request.purpose],
      ["Version", String(r.version.version_no), ROSTER_STATUS_LABEL[r.version.status]],
      ["Duty area", r.request.area_name ?? "-"],
      ["Commencement", r.request.commencement_date],
      [],
      ["No.", "Personnel record", "Service number", "Name", "Rank", "Home unit", "Contributed by", "Source", "Issues"],
    ];
    const body = r.entries.map((e, i) => [String(i + 1), e.personnel_id, e.service_number, e.full_name, e.rank_name, e.home_unit_name, e.contributor_unit_name ?? "-", e.source.toLowerCase(), e.issues ?? ""]);
    const base = `roster-${r.request.reference}-v${r.version.version_no}${env.synthetic ? "-SYNTHETIC" : ""}`;
    if (xlsx) {
      const book = buildXlsx({ sheetName: `Roster v${r.version.version_no}`, notes: head.slice(0, 5).map((x) => x.join(" · ")), header: head[6], rows: body.map((row) => [i(row[0]), ...row.slice(1)]) });
      return new NextResponse(new Uint8Array(book), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${base}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const text = [...head, ...body].map((row) => row.map(csv).join(",")).join("\r\n");
    return new NextResponse("﻿" + text, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found or not authorised.", { status: e.code === "NOT_FOUND" ? 404 : 403 });
    throw e;
  }
}
