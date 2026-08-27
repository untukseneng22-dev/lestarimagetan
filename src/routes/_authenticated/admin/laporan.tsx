import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, MessageSquareWarning, Scale, ShoppingBasket, Wallet } from "lucide-react";
import { getMarketReport, getReportData } from "@/lib/admin.functions";
import { getAppSettings } from "@/lib/common.functions";
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
  const settingsFn = useServerFn(getAppSettings);
  const marketFn = useServerFn(getMarketReport);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report", from, to],
    queryFn: () => reportFn({ data: { from, to } }),
    enabled: Boolean(from && to),
  });

  const { data: market } = useQuery({
    queryKey: ["admin-market-report", from, to],
    queryFn: () => marketFn({ data: { from, to } }),
    enabled: Boolean(from && to),
  });

  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });
  const org = settings?.org;

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
      exportPdf({ title: "Laporan Rekap Transaksi Bank Sampah", subtitle, columns, rows, filename: `laporan-transaksi-${from}-${to}.pdf`, org });
    } else {
      exportExcel({ sheetName: "Transaksi", columns, rows, filename: `laporan-transaksi-${from}-${to}.xlsx`, org, title: "Transaksi", subtitle });
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
      exportPdf({ title: "Laporan Berat Sampah per Kategori", subtitle, columns, rows, filename: `laporan-kategori-${from}-${to}.pdf`, org });
    } else {
      exportExcel({ sheetName: "Per Kategori", columns, rows, filename: `laporan-kategori-${from}-${to}.xlsx`, org, title: "Per Kategori", subtitle });
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
      exportPdf({ title: "Laporan Aduan Warga", subtitle, columns, rows, filename: `laporan-aduan-${from}-${to}.pdf`, org });
    } else {
      exportExcel({ sheetName: "Aduan", columns, rows, filename: `laporan-aduan-${from}-${to}.xlsx`, org, title: "Aduan", subtitle });
    }
    toast.success(`File ${kind.toUpperCase()} laporan aduan diunduh.`);
  }

  function exportMarket(kind: "pdf" | "excel") {
    if (!market || market.orders.length === 0) {
      toast.error("Tidak ada pesanan marketplace pada rentang ini");
      return;
    }
    const columns = [
      { header: "Tanggal", key: "tanggal" },
      { header: "Kode", key: "kode" },
      { header: "Warga", key: "warga" },
      { header: "Item", key: "item" },
      { header: "Metode", key: "metode" },
      { header: "Status", key: "status" },
      { header: "Ongkir (Rp)", key: "ongkir" },
      { header: "Total (Rp)", key: "total" },
      { header: "Potong Saldo (Rp)", key: "saldo" },
      { header: "Tunai (Rp)", key: "tunai" },
    ];
    const rows = market.orders.map((o) => ({
      tanggal: formatTanggalWaktu(o.date),
      kode: o.id.slice(0, 8).toUpperCase(),
      warga: o.residentName,
      item: o.items,
      metode: o.method === "antar" ? "Diantar" : "Ambil di kantor",
      status: statusLabel(o.status),
      ongkir: formatNumber(o.shippingFee),
      total: formatNumber(o.totalAmount),
      saldo: formatNumber(o.paidFromBalance),
      tunai: formatNumber(o.cashDue),
    }));
    if (kind === "pdf") {
      exportPdf({ title: "Rekap Pesanan Marketplace Sembako", subtitle, columns, rows, filename: `laporan-marketplace-${from}-${to}.pdf`, org });
    } else {
      exportExcel({ sheetName: "Marketplace", columns, rows, filename: `laporan-marketplace-${from}-${to}.xlsx`, org, title: "Marketplace", subtitle });
    }
    toast.success(`File ${kind.toUpperCase()} rekap marketplace diunduh.`);
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
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBasket className="h-4 w-4 text-primary" />
                  Rekap Marketplace ({market?.orders.length ?? 0})
                </CardTitle>
                {market && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Omzet {formatRupiah(market.totals.omzet)} · saldo {formatRupiah(market.totals.saldo)} ·
                    tunai {formatRupiah(market.totals.tunai)} · ongkir {formatRupiah(market.totals.ongkir)}
                  </p>
                )}
              </div>
              <ExportButtons onPdf={() => exportMarket("pdf")} onExcel={() => exportMarket("excel")} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Warga</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Tunai</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(market?.orders.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Tidak ada pesanan marketplace.</TableCell></TableRow>
                  )}
                  {(market?.orders ?? []).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatTanggal(o.date)}</TableCell>
                      <TableCell className="font-medium">{o.residentName}</TableCell>
                      <TableCell className="max-w-[18rem] truncate">{o.items}</TableCell>
                      <TableCell>{statusLabel(o.status)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(o.paidFromBalance)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(o.cashDue)}</TableCell>
                      <TableCell className="text-right font-medium text-primary">{formatRupiah(o.totalAmount)}</TableCell>
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
