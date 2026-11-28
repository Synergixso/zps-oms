/**
 * Controlled establishment and personnel import (issue #8). Synthetic data only: outside production the identifier
 * rule accepts SYN- service numbers only, so a real-looking number is refused.
 */
import { describe, expect, it } from "vitest";
import { all, one } from "@/server/db/connection";
import { setClock } from "@/server/domain/core";
import { decideChange } from "@/server/domain/org";
import { commitEstablishmentImport, commitPersonnelImport, parseCsv, previewEstablishmentImport, previewPersonnelImport } from "@/server/domain/data-import";
import { actor, withDb } from "./helpers";

const P_HEAD = "service_number,surname,first_names,rank_code,home_unit_code,employment_status,confirm_distinct";

describe("CSV parsing", () => {
  it("handles quotes, doubled quotes, CRLF and a byte-order mark", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n\n1,2')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["1", "2"]]);
  });
});

describe("personnel import (#8)", () => {
  it("previews without writing, then imports every row in one audited transaction", () => withDb(async (db) => {
    const per = await actor(db, "u_cb_per");
    const csv = `${P_HEAD}\nSYN-990001,Demo Imported,Demo One,PC,DC-CB-KIT,,\nSYN-990002,Demo Imported,Demo Two,SGT,ST-CB-KITC,SERVING,\n`;
    const before = Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM personnel_records"))!.n);
    const p = await previewPersonnelImport(db, per, csv);
    expect(p).toMatchObject({ kind: "PERSONNEL", valid: 2, invalid: 0, fileErrors: [] });
    expect(Number((await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM personnel_records"))!.n)).toBe(before);
    const r = await commitPersonnelImport(db, per, csv);
    expect(r.ids).toHaveLength(2);
    expect(await all(db, "SELECT service_number, synthetic FROM personnel_records WHERE service_number IN ('SYN-990001','SYN-990002') ORDER BY service_number"))
      .toEqual([{ service_number: "SYN-990001", synthetic: 1 }, { service_number: "SYN-990002", synthetic: 1 }]);
    const a = await one<{ details: string }>(db, "SELECT details FROM audit_events WHERE action = 'personnel.import' AND outcome = 'SUCCESS' ORDER BY seq DESC LIMIT 1");
    expect(JSON.parse(a!.details)).toMatchObject({ rows: 2, fingerprint: r.fingerprint });
  }));

  it("refuses the whole file when any row fails: real-looking numbers, duplicates, out-of-scope units, unknown ranks", () => withDb(async (db) => {
    const per = await actor(db, "u_cb_per");
    const existing = (await one<{ service_number: string }>(db, "SELECT service_number FROM personnel_records LIMIT 1"))!.service_number;
    const csv = [P_HEAD,
      "SYN-990010,Demo Good,Demo Row,PC,DC-CB-KIT,,",
      "12345678,Demo Real,Demo Looking,PC,DC-CB-KIT,,",
      "SYN-990010,Demo Twice,Demo Row,PC,DC-CB-KIT,,",
      `${existing},Demo Existing,Demo Row,PC,DC-CB-KIT,,`,
      "SYN-990011,Demo Other,Demo Division,PC,DC-LSK-CEN,,",
      "SYN-990012,Demo Bad,Demo Rank,XYZ,DC-CB-KIT,,",
    ].join("\n");
    const p = await previewPersonnelImport(db, per, csv);
    expect(p.valid).toBe(1);
    const errs = p.rows.map((r) => r.errors.join(" | "));
    expect(errs[1]).toMatch(/synthetic service number/);
    expect(errs[2]).toMatch(/also appears on line 2/);
    expect(errs[3]).toMatch(/already registered/);
    expect(errs[4]).toMatch(/outside your personnel registration scope/);
    expect(errs[5]).toMatch(/not a valid rank/);
    await expect(commitPersonnelImport(db, per, csv)).rejects.toThrow(/nothing was imported/);
    expect(await one(db, "SELECT id FROM personnel_records WHERE service_number = 'SYN-990010'")).toBeUndefined();
    expect(await one(db, "SELECT seq FROM audit_events WHERE action = 'personnel.import' AND outcome = 'DENIED'")).toBeTruthy();
  }));

  it("checks the header and the row limit, and requires personnel.register", () => withDb(async (db) => {
    const per = await actor(db, "u_cb_per");
    const p = await previewPersonnelImport(db, per, "service_number,surname,nickname\nSYN-1,a,b");
    expect(p.fileErrors.join(" ")).toMatch(/Unknown column\(s\): nickname.*Missing column\(s\): first_names, rank_code, home_unit_code/);
    const big = [P_HEAD, ...Array.from({ length: 501 }, (_, i) => `SYN-${String(980000 + i)},Demo Bulk,Demo ${i},PC,DC-CB-KIT,,`)].join("\n");
    expect((await previewPersonnelImport(db, per, big)).fileErrors.join(" ")).toMatch(/At most 500 rows/);
    await expect(previewPersonnelImport(db, await actor(db, "u_mu_acoy"), `${P_HEAD}\n`)).resolves.toBeTruthy(); // company commanders hold personnel.register in scope
    await expect(previewPersonnelImport(db, await actor(db, "u_cb_tech"), `${P_HEAD}\n`)).rejects.toThrow();
  }));
});

describe("establishment import (#8) — proposals through the approval workflow", () => {
  it("creates one WF-03 proposal per row; units appear only after a different officer approves", () => withDb(async (db) => {
    setClock(() => new Date("2026-11-28T10:00:00Z"));
    try {
      const org = await actor(db, "u_org");
      const csv = "code,name,unit_type,parent_code,duty_station,record_basis,effective_date,reason\nPL-MU-HQ5-1,1 Platoon HQ 5 Detachment (synthetic test),PLATOON,DT-MU-HQ5,\"Kitwe, Copperbelt Province\",SYNTHETIC,2026-11-28,Synthetic test of the controlled establishment import.\n";
      const p = await previewEstablishmentImport(db, org, csv);
      expect(p).toMatchObject({ valid: 1, invalid: 0 });
      const r = await commitEstablishmentImport(db, org, csv);
      expect(r.references).toHaveLength(1);
      expect(await one(db, "SELECT id FROM org_units WHERE code = 'PL-MU-HQ5-1'")).toBeUndefined();
      const change = (await one<{ id: string }>(db, "SELECT id FROM org_change_requests WHERE reference = ?", r.references[0]))!;
      await decideChange(db, await actor(db, "u_dig"), change.id, "APPROVE", "", "SYN-EST-IMPORT-001");
      const unit = await one<{ duty_station: string; synthetic: number; parent: string }>(db,
        "SELECT o.duty_station, o.synthetic, p.code AS parent FROM org_units o JOIN org_relationships r ON r.child_id = o.id AND r.effective_to IS NULL JOIN org_units p ON p.id = r.parent_id WHERE o.code = 'PL-MU-HQ5-1'");
      expect(unit).toEqual({ duty_station: "Kitwe, Copperbelt Province", synthetic: 1, parent: "DT-MU-HQ5" });
    } finally {
      setClock(null);
    }
  }));

  it("refuses rows whose parent is in the same file, unknown parents, type-rule breaches and duplicate codes", () => withDb(async (db) => {
    const org = await actor(db, "u_org");
    const csv = [
      "code,name,unit_type,parent_code,reason",
      "DT-MU-C1,C1 Detachment (synthetic test),DETACHMENT,CO-MU-C,Synthetic test row for validation.",
      "PL-MU-C1-1,1 Platoon C1 (synthetic test),PLATOON,DT-MU-C1,Synthetic test row for validation.",
      "ST-MU-BAD,Station under a company,STATION,CO-MU-C,Synthetic test row for validation.",
      "DT-MU-HQ5,Duplicate code,DETACHMENT,CO-MU-HQ,Synthetic test row for validation.",
      "DT-MU-X,Unknown parent,DETACHMENT,CO-MU-ZZ,Synthetic test row for validation.",
    ].join("\n");
    const p = await previewEstablishmentImport(db, org, csv);
    const errs = p.rows.map((r) => r.errors.join(" | "));
    expect(p.rows[0].ok).toBe(true);
    expect(errs[1]).toMatch(/created by this file; import parent units first/);
    expect(errs[2]).toMatch(/cannot be placed under/);
    expect(errs[3]).toMatch(/already exists/);
    expect(errs[4]).toMatch(/not found/);
    await expect(commitEstablishmentImport(db, org, csv)).rejects.toThrow(/nothing was proposed/);
    expect(await one(db, "SELECT id FROM org_change_requests WHERE payload LIKE '%DT-MU-C1%'")).toBeUndefined();
  }));
});
