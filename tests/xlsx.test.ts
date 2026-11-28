/** Native .xlsx export (known issue 6): valid package, safe cells, audited like CSV. */
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { one } from "@/server/db/connection";
import { exportReport } from "@/server/domain/reports";
import { buildXlsx } from "@/server/lib/xlsx";
import { actor, withDb } from "./helpers";

/** Reads a ZIP through its central directory, inflating each entry and checking its CRC-32. */
function unzip(buf: Buffer): Record<string, string> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = zlib.inflateRawSync(buf.subarray(dataStart, dataStart + size));
    expect(zlib.crc32(data) >>> 0).toBe(crc);
    out[name] = data.toString("utf8");
    p += 46 + nameLen;
  }
  return out;
}

describe("xlsx writer", () => {
  it("produces a valid workbook package with safe, typed cells", () => {
    const files = unzip(buildXlsx({ sheetName: "A/B:[C]", notes: ["SYNTHETIC"], header: ["name", "n"], rows: [["=HYPERLINK(\"x\")", 7], ["a & <b>\u0002", 2.5]] }));
    expect(Object.keys(files)).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]);
    const sheet = files["xl/worksheets/sheet1.xml"];
    expect(sheet).not.toContain("<f>"); // never a formula
    expect(sheet).toContain('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;x&quot;)</t>');
    expect(sheet).toContain("<v>7</v>");
    expect(sheet).toContain("a &amp; &lt;b&gt;</t>");
    expect(sheet).not.toContain("\u0002");
    expect(files["xl/workbook.xml"]).toContain('name="A B  C "');
  });

  it("keeps formula-like text as text, sizes columns, freezes the header and handles Unicode (#14)", () => {
    const rows = [["+SUM(A1)", "-1+2", "@cmd", "=1+1", "	lead"], ["Mwansa Ng’andu — Kabwe", "2026-11-28", "A".repeat(200), "", null]];
    const files = unzip(buildXlsx({ sheetName: "X".repeat(40), header: ["a", "b", "c", "d", "e"], rows: rows as Array<Array<string | null>> }));
    const sheet = files["xl/worksheets/sheet1.xml"];
    for (const v of ["+SUM(A1)", "-1+2", "@cmd", "=1+1"]) expect(sheet).toContain(`<t xml:space="preserve">${v}</t>`);
    expect(sheet).not.toMatch(/<f>|<f /);
    expect(sheet).toContain("Mwansa Ng’andu — Kabwe"); // UTF-8 preserved
    expect(sheet).toContain('<t xml:space="preserve">2026-11-28</t>'); // dates are ISO text (no locale-dependent serials)
    expect(sheet).toMatch(/<col min="3" max="3" width="60" customWidth="1"\/>/); // capped width
    expect(sheet).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    expect(sheet.indexOf("<sheetViews>")).toBeLessThan(sheet.indexOf("<cols>")); // schema order Excel requires
    expect(sheet.indexOf("<cols>")).toBeLessThan(sheet.indexOf("<sheetData>"));
    expect(files["xl/workbook.xml"]).toContain(`name="${"X".repeat(31)}"`); // Excel's 31-character sheet-name limit
  });

  it("report exports in xlsx go through the same audited path", () => withDb(async (db) => {
    const cmd = await actor(db, "u_lsk_cmd");
    const before = Number((await one<{ c: number }>(db, "SELECT COUNT(*) c FROM report_exports WHERE user_id = 'u_lsk_cmd'"))!.c);
    const r = await exportReport(db, cmd, "REQ_STATUS_BY_ORG", undefined, { format: "xlsx" });
    expect(r.filename).toMatch(/\.xlsx$/);
    const sheet = unzip(r.xlsx!)["xl/worksheets/sheet1.xml"];
    expect(sheet).toContain("SYNTHETIC DEMONSTRATION DATA");
    expect(sheet).not.toContain("Copperbelt");
    const row = (await one<{ c: number; filters: string }>(db, "SELECT COUNT(*) c, MAX(filters) filters FROM report_exports WHERE user_id = 'u_lsk_cmd'"))!;
    expect(Number(row.c)).toBe(before + 1);
    expect(JSON.parse(row.filters).format).toBe("xlsx");
    await expect(exportReport(db, cmd, "REQ_STATUS_BY_ORG", ["organisation", "creator_name"], { format: "xlsx" })).rejects.toThrow(/not approved for export/);
  }));
});
