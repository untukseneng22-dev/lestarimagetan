import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportColumn = { header: string; key: string };

/** Identitas lembaga untuk kop dan tanda tangan dokumen laporan bulanan. */
export type OrgIdentity = {
  name: string;
  address?: string;
  phone?: string;
  city?: string;
  headName?: string;
  treasurerName?: string;
};

function rowsToArrays(columns: ExportColumn[], rows: Record<string, unknown>[]): string[][] {
  return rows.map((row) => columns.map((c) => String(row[c.key] ?? "-")));
}

function tanggalPanjang(): string {
  return new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export type PdfOptions = {
  title: string;
  subtitle?: string | undefined;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
  org?: OrgIdentity | undefined;
};

/** Ukuran kertas F4 / Folio (215 x 330 mm). */
export const F4_FORMAT: [number, number] = [215, 330];

/** Membangun dokumen PDF ukuran F4 portrait tanpa langsung mengunduhnya. */
export function buildPdf(opts: PdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: F4_FORMAT });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  if (opts.org) {
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text(opts.org.name.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 6;
    const kontak = [opts.org.address, opts.org.phone ? `Telp/WA: ${opts.org.phone}` : ""]
      .filter(Boolean)
      .join(" · ");
    if (kontak) {
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(kontak, pageWidth / 2, y, { align: "center" });
      y += 5;
    }
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.8);
    doc.line(14, y, pageWidth - 14, y);
    y += 9;
  }

  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(opts.title, opts.org ? pageWidth / 2 : 14, y, opts.org ? { align: "center" } : undefined);
  y += 6;
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, opts.org ? pageWidth / 2 : 14, y, opts.org ? { align: "center" } : undefined);
    y += 5;
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Diekspor pada ${new Date().toLocaleString("id-ID")}`,
    opts.org ? pageWidth / 2 : 14,
    y,
    opts.org ? { align: "center" } : undefined,
  );
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [opts.columns.map((c) => c.header)],
    body: rowsToArrays(opts.columns, opts.rows),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 163, 74] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  const org = opts.org;
  if (org && (org.headName || org.treasurerName)) {
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    let sy = lastY + 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (sy + 40 > pageHeight) {
      doc.addPage();
      sy = 20;
    }
    doc.setFontSize(10);
    doc.setTextColor(40);
    const leftX = 20;
    const rightX = pageWidth - 75;
    doc.text(`${org.city || "Magetan"}, ${tanggalPanjang()}`, rightX, sy);
    doc.text("Mengetahui,", leftX, sy + 8);
    doc.text("Ketua Bank Sampah", leftX, sy + 14);
    doc.text("Bendahara", rightX, sy + 14);
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(`( ${org.headName || "........................"} )`, leftX, sy + 38);
    doc.text(`( ${org.treasurerName || "........................"} )`, rightX, sy + 38);
  }

  return doc;
}

/** URL blob untuk pratinjau PDF di iframe. Ingat panggil URL.revokeObjectURL saat selesai. */
export function createPdfPreviewUrl(opts: PdfOptions): string {
  return URL.createObjectURL(buildPdf(opts).output("blob"));
}

export function exportPdf(opts: PdfOptions) {
  buildPdf(opts).save(opts.filename);
}

/** Mencetak dokumen PDF langsung (dialog cetak bawaan browser). */
export function printPdf(opts: PdfOptions) {
  const doc = buildPdf(opts);
  // Sisipkan aksi cetak otomatis di dalam PDF-nya
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");
  if (!win) {
    // Popup diblokir → fallback unduh berkas
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}


export function exportExcel(opts: {
  sheetName: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
  org?: OrgIdentity | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
}) {
  const head: string[][] = [];
  if (opts.org) {
    head.push([opts.org.name]);
    if (opts.org.address) head.push([opts.org.address]);
    if (opts.org.phone) head.push([`Telp/WA: ${opts.org.phone}`]);
    if (opts.title) head.push([opts.title]);
    if (opts.subtitle) head.push([opts.subtitle]);
    head.push([`Diekspor pada ${new Date().toLocaleString("id-ID")}`]);
    head.push([]);
  }

  const foot: string[][] = [];
  const org = opts.org;
  if (org && (org.headName || org.treasurerName)) {
    foot.push([]);
    foot.push(["", `${org.city || "Magetan"}, ${tanggalPanjang()}`]);
    foot.push(["Mengetahui, Ketua Bank Sampah", "Bendahara"]);
    foot.push([]);
    foot.push([]);
    foot.push([org.headName || "........................", org.treasurerName || "........................"]);
  }

  const data = [
    ...head,
    opts.columns.map((c) => c.header),
    ...rowsToArrays(opts.columns, opts.rows),
    ...foot,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = opts.columns.map((c) => ({
    wch: Math.max(
      c.header.length + 2,
      ...opts.rows.map((r) => String(r[c.key] ?? "").length + 2),
      12,
    ),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31));
  XLSX.writeFile(wb, opts.filename);
}
