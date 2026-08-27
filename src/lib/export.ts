import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoAsset from "@/assets/logo-lestari.png.asset.json";

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

/** Nama kop dokumen: huruf kapital dan selalu diawali "BANK SAMPAH". */
export function formatKopName(name: string | undefined): string {
  const upper = (name ?? "").trim().toUpperCase() || "LESTARI MAGETAN";
  return upper.startsWith("BANK SAMPAH") ? upper : `BANK SAMPAH ${upper}`;
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

let logoDataUrl: string | null = null;
let logoPromise: Promise<string | null> | null = null;

/** Memuat & mengecilkan logo untuk disisipkan di kop dokumen. */
export function ensureLogo(): Promise<string | null> {
  if (logoDataUrl) return Promise.resolve(logoDataUrl);
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const size = 256;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          const scale = Math.min(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          logoDataUrl = canvas.toDataURL("image/png");
          resolve(logoDataUrl);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoAsset.url;
    });
  }
  return logoPromise;
}

if (typeof window !== "undefined") void ensureLogo();

/** Membangun dokumen PDF ukuran F4 portrait tanpa langsung mengunduhnya. */
export function buildPdf(opts: PdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: F4_FORMAT });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 14;

  if (opts.org) {
    const logoSize = 22;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", margin, y, logoSize, logoSize);
      } catch {
        /* abaikan bila logo gagal dimuat */
      }
    }
    const textLeft = margin + logoSize + 6;
    const textCenter = (textLeft + (pageWidth - margin)) / 2;
    let ty = y + 6;
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(formatKopName(opts.org.name), textCenter, ty, { align: "center" });
    ty += 6;
    doc.setFont("times", "normal");
    if (opts.org.address) {
      doc.setFontSize(10.5);
      doc.setTextColor(60);
      doc.text(opts.org.address, textCenter, ty, { align: "center", maxWidth: pageWidth - textLeft - margin });
      ty += 5;
    }
    const kontak = [opts.org.phone ? `Telp/WA: ${opts.org.phone}` : "", opts.org.city]
      .filter(Boolean)
      .join(" · ");
    if (kontak) {
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(kontak, textCenter, ty, { align: "center" });
      ty += 5;
    }
    y = Math.max(y + logoSize, ty) + 2;
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(1.1);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.35);
    doc.line(margin, y + 1.4, pageWidth - margin, y + 1.4);
    y += 12;
  }

  const centered = Boolean(opts.org);
  const titleX = centered ? pageWidth / 2 : margin;
  const align = centered ? ({ align: "center" } as const) : undefined;

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(opts.title.toUpperCase(), titleX, y, align);
  y += 5.5;
  doc.setFont("times", "normal");
  if (opts.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(70);
    doc.text(opts.subtitle, titleX, y, align);
    y += 5;
  }
  doc.setFontSize(9.5);
  doc.setTextColor(120);
  doc.text(`Dicetak pada ${new Date().toLocaleString("id-ID")}`, titleX, y, align);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [opts.columns.map((c) => c.header)],
    body: rowsToArrays(opts.columns, opts.rows),
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 9.5,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2.4, right: 2.4 },
      textColor: [35, 35, 35],
      lineColor: [200, 210, 200],
      lineWidth: 0.15,
      valign: "middle",
    },
    headStyles: {
      font: "times",
      fontStyle: "bold",
      fillColor: [22, 101, 52],
      textColor: 255,
      fontSize: 9.5,
      halign: "center",
      lineColor: [22, 101, 52],
    },
    alternateRowStyles: { fillColor: [244, 250, 244] },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const page = doc.getNumberOfPages();
      doc.setFont("times", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(130);
      doc.text(opts.org ? formatKopName(opts.org.name) : "BANK SAMPAH LESTARI MAGETAN", margin, pageHeight - 10);
      doc.text(`Halaman ${page}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    },
  });

  const org = opts.org;
  if (org && (org.headName || org.treasurerName)) {
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    let sy = lastY + 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (sy + 45 > pageHeight - 15) {
      doc.addPage();
      sy = 24;
    }
    const leftX = margin + 6;
    const rightX = pageWidth - margin - 60;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`${org.city || "Magetan"}, ${tanggalPanjang()}`, rightX, sy);
    doc.text("Mengetahui,", leftX, sy + 7);
    doc.text("Ketua Bank Sampah", leftX, sy + 13);
    doc.text("Bendahara", rightX, sy + 13);
    doc.setFont("times", "bold");
    doc.setTextColor(20);
    doc.text(org.headName || "........................", leftX, sy + 36);
    doc.text(org.treasurerName || "........................", rightX, sy + 36);
    doc.setFont("times", "normal");
    doc.setDrawColor(120);
    doc.setLineWidth(0.2);
    doc.line(leftX, sy + 37.5, leftX + 55, sy + 37.5);
    doc.line(rightX, sy + 37.5, rightX + 55, sy + 37.5);
  }

  return doc;
}

/** URL blob untuk pratinjau PDF di iframe. Ingat panggil URL.revokeObjectURL saat selesai. */
export function createPdfPreviewUrl(opts: PdfOptions): string {
  return URL.createObjectURL(buildPdf(opts).output("blob"));
}

export async function exportPdf(opts: PdfOptions) {
  await ensureLogo();
  buildPdf(opts).save(opts.filename);
}

/** Mencetak dokumen PDF langsung (dialog cetak bawaan browser). */
export async function printPdf(opts: PdfOptions) {
  await ensureLogo();
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
