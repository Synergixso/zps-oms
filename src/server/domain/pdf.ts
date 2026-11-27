/**
 * Server-generated PDF documents (pdfkit, MIT, pure JavaScript — no paid service or native dependency).
 * Rosters are rendered from the same scoped, audited data as the print view.
 */
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { RosterEntry } from "./manpower";

interface RosterPdfInput {
  request: { reference: string; purpose: string; requesting_unit_name: string; area_name: string | null; commencement_date: string; duration_days: number };
  version: { version_no: number; status: string; reference?: string | null; created_by_name: string; created_at: string; approved_by_name: string | null; approved_at: string | null };
  entries: RosterEntry[];
  statusLabel: string;
  printedBy: string;
  /** Stamp for outputs while synthetic data is present (environment.ts); omitted in production with real data. Defaults to the synthetic stamp. */
  stamp?: string;
}

const GREEN = "#1a7d34";
const NAVY = "#0d2149";
const d = (s?: string | null) => (s ? new Date(s.length === 10 ? `${s}T00:00:00Z` : s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lusaka" }) : "—");

export function rosterPdf(input: RosterPdfInput): Promise<Buffer> {
  const stamp = input.stamp ?? "SYNTHETIC DEMONSTRATION DATA — NOT AN OFFICIAL DOCUMENT";
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, info: { Title: `Roster ${input.request.reference} v${input.version.version_no}`, Author: "ZPS-OMS", Subject: "Synthetic demonstration data" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const crest = path.join(process.cwd(), "public", "brand", "zambia-police-service-crest.png");
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    // Institutional band: green / white / blue.
    doc.rect(0, 0, doc.page.width, 6).fill(GREEN).rect(0, 6, doc.page.width, 3).fill("#ffffff").rect(0, 9, doc.page.width, 6).fill("#1f4fa0");
    if (fs.existsSync(crest)) doc.image(crest, left, 26, { fit: [86, 50] });
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(13).text("ZAMBIA POLICE SERVICE — OPERATIONS MANAGEMENT SYSTEM", left + 96, 30, { width: width - 96 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000").text(`Personnel roster ${input.version.reference ?? input.request.reference} · Version ${input.version.version_no} (${input.statusLabel})`, left + 96, doc.y + 2, { width: width - 96 });
    if (stamp) doc.font("Helvetica-Bold").fontSize(8).fillColor("#b91c1c").text(stamp, left + 96, doc.y + 2);
    doc.moveTo(left, 84).lineTo(left + width, 84).lineWidth(1).strokeColor("#000").stroke();

    doc.fillColor("#000").fontSize(9).font("Helvetica");
    let y = 92;
    const row = (k: string, v: string) => {
      doc.font("Helvetica-Bold").text(k, left, y, { width: 120 });
      doc.font("Helvetica").text(v, left + 125, y, { width: width - 125 });
      y = doc.y + 3;
    };
    row("Purpose", input.request.purpose);
    row("Requesting unit", input.request.requesting_unit_name);
    row("Duty-area reference", input.request.area_name ?? "—");
    row("Commencement", `${d(input.request.commencement_date)} · ${input.request.duration_days} days`);
    row("Compiled", `${input.version.created_by_name}, ${d(input.version.created_at)}`);
    row("Approved", input.version.approved_by_name ? `${input.version.approved_by_name}, ${d(input.version.approved_at)}` : "Not yet approved");

    const cols = [{ h: "No.", w: 30 }, { h: "Service no.", w: 80 }, { h: "Rank", w: 95 }, { h: "Name", w: 170 }, { h: "Remarks", w: width - 375 }];
    const groups = new Map<string, RosterEntry[]>();
    for (const e of input.entries) groups.set(e.home_unit_name, [...(groups.get(e.home_unit_name) ?? []), e]);
    let n = 0;
    const ensure = (h: number) => {
      if (y + h > doc.page.height - 50) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };
    const header = () => {
      let x = left;
      doc.font("Helvetica-Bold").fontSize(8.5);
      for (const c of cols) { doc.text(c.h, x + 2, y, { width: c.w - 4 }); x += c.w; }
      y += 13;
      doc.moveTo(left, y - 2).lineTo(left + width, y - 2).lineWidth(0.5).stroke();
    };
    y += 6;
    for (const [unit, list] of groups) {
      ensure(40);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(`${unit} (${list.length})`, left, y);
      doc.fillColor("#000");
      y = doc.y + 3;
      header();
      doc.font("Helvetica").fontSize(8.5);
      for (const e of list) {
        const cells = [String(++n), e.service_number, e.rank_name, e.full_name, e.issues ?? ""];
        const h = Math.max(...cells.map((t, i) => doc.heightOfString(t, { width: cols[i].w - 4 }))) + 4;
        ensure(h);
        let x = left;
        cells.forEach((t, i) => { doc.text(t, x + 2, y + 1, { width: cols[i].w - 4 }); x += cols[i].w; });
        y += h;
        doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.25).strokeColor("#bbbbbb").stroke().strokeColor("#000");
      }
      y += 8;
    }
    ensure(30);
    doc.font("Helvetica").fontSize(8).fillColor("#333").text(
      `Total officers: ${input.entries.length}. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by ${input.printedBy} from registry records; every entry is traceable to its source personnel record.`,
      left, y + 6, { width },
    );
    // Page numbers.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(7.5).fillColor("#555").text(`Page ${i + 1} of ${range.count} · ZPS-OMS${stamp ? " · SYNTHETIC" : ""}`, left, doc.page.height - 30, { width, align: "center", lineBreak: false });
    }
    doc.end();
  });
}
