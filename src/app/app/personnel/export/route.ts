import { environmentNotice } from "@/server/lib/environment";
import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { DomainError } from "@/server/domain/core";
import { DISPOSITIONS, EMPLOYMENT_LABEL, exportPersonnel, type PersonnelFilters } from "@/server/domain/personnel";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  // Neutralise spreadsheet formula injection and quote every field.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const actor = await requireActor();
  const p = req.nextUrl.searchParams;
  const f: PersonnelFilters = {
    q: p.get("q") ?? undefined, rank: p.get("rank") ?? undefined, unit: p.get("unit") ?? undefined, employment: p.get("employment") ?? undefined,
    disposition: p.get("disposition") ?? undefined, verification: p.get("verification") ?? undefined, sort: (p.get("sort") as PersonnelFilters["sort"]) ?? "name",
  };
  try {
    const rows = await exportPersonnel(getDb(), actor, f);
    const lines = [
      ["Personnel reference", "Service number", "Surname", "First names", "Rank", "Home unit", "Employment", "Disposition", "Verification"].map(csv).join(","),
      ...rows.map((r) => [r.personnel_ref, r.service_number, r.surname, r.first_names, r.rank_name, r.home_unit_name, EMPLOYMENT_LABEL[r.employment_status], DISPOSITIONS[r.disposition_status], r.verification_status].map(csv).join(",")),
    ];
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="zps-oms-personnel${(await environmentNotice(getDb())).synthetic ? "-SYNTHETIC" : ""}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not authorised to export personnel records.", { status: 403 });
    throw e;
  }
}
