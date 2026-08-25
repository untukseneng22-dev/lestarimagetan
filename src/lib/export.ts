import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportColumn = { header: string; key: string };

function rowsToArrays(columns: ExportColumn[], rows: Record<string, unknown>[]): string[][] {
  return rows.map((row) => columns.map((c) => String(row[c.key] ?? "-")));
}

export function exportPdf(opts: {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
}) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(opts.title, 14, 16);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, 14, 23);
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Diekspor pada ${new Date().toLocaleString("id-ID")}`, 14, opts.subtitle ? 29 : 23);

  autoTable(doc, {
    startY: opts.subtitle ? 34 : 29,
    head: [opts.columns.map((c) => c.header)],
    body: rowsToArrays(opts.columns, opts.rows),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [239, 246, 255] },
  });

  doc.save(opts.filename);
}

export function exportExcel(opts: {
  sheetName: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
}) {
  const data = [
    opts.columns.map((c) => c.header),
    ...rowsToArrays(opts.columns, opts.rows),
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
