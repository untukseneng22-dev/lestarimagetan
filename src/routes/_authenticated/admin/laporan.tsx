import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, MessageSquareWarning, Scale, Wallet } from "lucide-react";
import { getReportData } from "@/lib/admin.functions";
import { exportExcel, exportPdf } from "@/lib/export";
import { formatNumber, formatRupiah, formatTanggal, formatTanggalWaktu, statusLabel, todayISO } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/laporan")({
  head: () => ({ meta: [{ title: "Laporan — LESTARI MAGETAN" }] }),
  component: LaporanPage,
});

function monthStartISO(): string {
  return todayISO().slice(0, 8) + "01";
}

function ExportButtons({ onPdf, onExcel }: { onPdf: () => void; onExcel: () => void }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onPdf}><FileText className="h-4 w-4" /> PDF</Button>
      <Button size="sm" variant="outline" onClick={onExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
    </div>
  );
}

function LaporanPage() {
  const reportFn = useServerFn(getReportData);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report", from, to],
    queryFn: () => reportFn({ data: { from, to } }),
    enabled: Boolean(from && to),
  });

  const subtitle = `Periode ${formatTanggal(from)} s.d. ${formatTanggal(to)}`;

  function exportTransactions(kind: "pdf" | "excel") {
    if (!data || data.transactions.length === 0) {
      toast.error("Tidak ada data transaksi pada rentang ini");
      return;
    }
    const columns = [
      { header: "Tanggal", key: "tanggal" },
      { header: "Warga", key: "warga" },
      { header: "Jenis Item", key: "item" },
      { header: "Berat (kg)", key: "berat" },
      { header: "Nilai (Rp)", key: "nilai" },
    ];
    const rows = data.transactions.map((t) => ({
      tanggal: formatTanggal(t.date),
      warga: t.residentName,
      item: t.itemCount,
      berat: formatNumber(t.totalWeight),
      nilai: formatNumber(t.totalAmount),
    }));
    if (kind === "pdf") {
      exportPdf({ title: "Laporan Rekap Transaksi Bank Sampah", subtitle, columns, rows, filename: `laporan-transaksi-${from}-${to}.pdf` });
    } else {
      exportExcel({ sheetName: "Transaksi", columns, rows, filename: `laporan-transaksi-${from}-${to}.xlsx` });
    }
    toast.success(`File ${kind.toUpperCase()} laporan transaksi diunduh.`);
  }

  function exportCategories(kind: "pdf" | "excel") {
    if (!data || data.weightPerCategory.length === 0) {
      toast.error("Tidak ada data kategori pada rentang ini");
      return;
    }
    const columns = [
      { header: "Kategori", key: "kategori" },
      { header: "Jumlah Setoran", key: "jumlah" },
      { header: "Total Berat (kg)", key: "berat" },
      { header: "Total Nilai (Rp)", key: "nilai" },
    ];
    const rows = data.weightPerCategory.map((c) => ({
      kategori: c.name,
      jumlah: c.count,
      berat: formatNumber(c.weight),
      nilai: formatNumber(c.amount),
    }));
    if (kind === "pdf") {
      exportPdf({ title: "Laporan Berat Sampah per Kategori", subtitle, columns, rows, filename: `laporan-kategori-${from}-${to}.pdf` });
    } else {
      exportExcel({ sheetName: "Per Kategori", columns, rows, filename: `laporan-kategori-${from}-${to}.xlsx` });
    }
    toast.success(`File ${kind.toUpperCase()} laporan kategori diunduh.`);
  }

  function exportComplaints(kind: "pdf" | "excel") {
    if (!data || data.complaints.length === 0) {
      toast.error("Tidak ada aduan pada rentang ini");
      return;
    }
    const columns = [
      { header: "Tanggal", key: "tanggal" },
      { header: "Warga", key: "warga" },
      { header: "Judul Aduan", key: "judul" },
      { header: "Status", key: "status" },
    ];
    const rows = data.complaints.map((c) => ({
      tanggal: formatTanggalWaktu(c.date),
      warga: c.residentName,
      judul: c.title,
      status: statusLabel(c.status),
    }));
    if (kind === "pdf") {
      exportPdf({ title: "Laporan Aduan Warga", subtitle, columns, rows, filename: `laporan-aduan-${from}-${to}.pdf` });
    } else {
      exportExcel({ sheetName: "Aduan", columns, rows, filename: `laporan-aduan-${from}-${to}.xlsx` });
    }
    toast.success(`File ${kind.toUpperCase()} laporan aduan diunduh.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-sm text-muted-foreground">Rekap transaksi, berat per kategori, dan aduan. Ekspor ke PDF atau Excel.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dari">Dari tanggal</Label>
          <Input id="dari" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sampai">Sampai tanggal</Label>
          <Input id="sampai" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Transaksi</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatNumber(data.totals.transactions)}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Berat</CardTitle><Scale className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-xl font-bold">{formatNumber(data.totals.weight)} kg</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Nilai</CardTitle><Wallet className="h-4 w-4 text-accent" /></CardHeader><CardContent><p className="text-xl font-bold">{formatRupiah(data.totals.amount)}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Aduan</CardTitle><MessageSquareWarning className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><p className="text-xl font-bold">{formatNumber(data.totals.complaints)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Rekap Transaksi ({data.transactions.length})</CardTitle>
              <ExportButtons onPdf={() => exportTransactions("pdf")} onExcel={() => exportTransactions("excel")} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Warga</TableHead>
                    <TableHead>Jenis Item</TableHead>
                    <TableHead className="text-right">Berat</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Tidak ada transaksi.</TableCell></TableRow>
                  )}
                  {data.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatTanggal(t.date)}</TableCell>
                      <TableCell className="font-medium">{t.residentName}</TableCell>
                      <TableCell>{t.itemCount}</TableCell>
                      <TableCell className="text-right">{formatNumber(t.totalWeight)} kg</TableCell>
                      <TableCell className="text-right font-medium text-accent">{formatRupiah(t.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Berat Sampah per Kategori ({data.weightPerCategory.length})</CardTitle>
              <ExportButtons onPdf={() => exportCategories("pdf")} onExcel={() => exportCategories("excel")} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jumlah Setoran</TableHead>
                    <TableHead className="text-right">Total Berat</TableHead>
                    <TableHead className="text-right">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.weightPerCategory.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                  )}
                  {data.weightPerCategory.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.count}</TableCell>
                      <TableCell className="text-right">{formatNumber(c.weight)} kg</TableCell>
                      <TableCell className="text-right font-medium text-accent">{formatRupiah(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Aduan Warga ({data.complaints.length})</CardTitle>
              <ExportButtons onPdf={() => exportComplaints("pdf")} onExcel={() => exportComplaints("excel")} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Warga</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.complaints.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Tidak ada aduan.</TableCell></TableRow>
                  )}
                  {data.complaints.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{formatTanggalWaktu(c.date)}</TableCell>
                      <TableCell className="font-medium">{c.residentName}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{statusLabel(c.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
