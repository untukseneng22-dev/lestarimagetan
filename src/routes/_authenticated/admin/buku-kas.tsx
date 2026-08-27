import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, FileText, Scale, Wallet } from "lucide-react";
import { getCashBook } from "@/lib/admin.functions";
import { getAppSettings } from "@/lib/common.functions";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { exportExcel, printPdf } from "@/lib/export";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/admin/buku-kas")({
  head: () => ({
    meta: [
      { title: "Buku Kas & Rekap Keuangan — LESTARI MAGETAN" },
      { name: "description", content: "Catatan lengkap arus kas bank sampah: setoran, pencairan, dan belanja marketplace." },
    ],
  }),
  component: BukuKasPage,
});

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function BukuKasPage() {
  const cashFn = useServerFn(getCashBook);
  const settingsFn = useServerFn(getAppSettings);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [preview, setPreview] = useState<PdfOptions | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-cashbook", from, to],
    queryFn: () => cashFn({ data: { from, to } }),
  });
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });
  const org = settings?.org;

  const s = data?.summary;
  const subtitle = `Periode ${formatTanggal(from)} s/d ${formatTanggal(to)}`;

  const columns = useMemo(
    () => [
      { header: "Tanggal", key: "tanggal" },
      { header: "Jenis", key: "jenis" },
      { header: "Warga", key: "warga" },
      { header: "Keterangan", key: "keterangan" },
      { header: "Status", key: "status" },
      { header: "Debit (Kewajiban/Keluar)", key: "debit" },
      { header: "Kredit (Kas Masuk)", key: "kredit" },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      (data?.entries ?? []).map((e) => ({
        tanggal: formatTanggal(e.date),
        jenis: e.type,
        warga: e.residentName,
        keterangan: e.description,
        status: e.status,
        debit: e.debit ? formatRupiah(e.debit) : "-",
        kredit: e.credit ? formatRupiah(e.credit) : "-",
      })),
    [data],
  );

  const ringkasanRows = useMemo(
    () =>
      s
        ? [
            { tanggal: "", jenis: "RINGKASAN", warga: "", keterangan: `Nilai setoran sampah (${s.jumlahSetoran} transaksi, ${s.totalBerat.toFixed(2)} kg)`, status: "", debit: formatRupiah(s.totalSetoran), kredit: "-" },
            { tanggal: "", jenis: "RINGKASAN", warga: "", keterangan: "Pencairan tunai dibayarkan", status: "", debit: formatRupiah(s.totalPencairan), kredit: "-" },
            { tanggal: "", jenis: "RINGKASAN", warga: "", keterangan: "Belanja marketplace (termasuk ongkir)", status: "", debit: "-", kredit: formatRupiah(s.totalBelanja) },
            { tanggal: "", jenis: "RINGKASAN", warga: "", keterangan: "Saldo tabungan warga beredar", status: "", debit: formatRupiah(s.saldoBeredar), kredit: "-" },
          ]
        : [],
    [s],
  );

  function doExport(kind: "pdf" | "xlsx") {
    const all = [...rows, ...ringkasanRows];
    if (kind === "pdf") {
      setPreview({ title: "Buku Kas & Rekap Keuangan", subtitle, columns, rows: all, filename: `buku-kas-${from}-${to}.pdf`, org });
    } else {
      exportExcel({ sheetName: "Buku Kas", columns, rows: all, filename: `buku-kas-${from}-${to}.xlsx`, org, title: "Buku Kas & Rekap Keuangan", subtitle });
    }
  }

  return (
    <div className="space-y-5">
      <PdfPreviewDialog options={preview} onClose={() => setPreview(null)} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Buku Kas & Rekap Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Semua catatan keuangan: setoran sampah, pencairan tunai, dan belanja marketplace. Ekspor memakai kop resmi lembaga.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <Button variant="outline" className="h-9" onClick={() => doExport("pdf")} disabled={!data}>
            <FileText className="mr-1.5 size-4" /> Pratinjau & Cetak PDF
          </Button>
          <Button className="h-9" onClick={() => doExport("xlsx")} disabled={!data}>
            <FileSpreadsheet className="mr-1.5 size-4" /> Excel
          </Button>
        </div>
      </div>

      {!org?.headName && (
        <Card className="border-dashed">
          <CardContent className="py-3 text-xs text-muted-foreground">
            Lengkapi <b>Identitas Lembaga</b> (menu Sistem) agar kop dan kolom tanda tangan Ketua/Bendahara tampil pada dokumen ekspor.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Scale className="size-5" />} label="Nilai Setoran Sampah" value={formatRupiah(s?.totalSetoran ?? 0)} hint={`${s?.jumlahSetoran ?? 0} transaksi · ${(s?.totalBerat ?? 0).toFixed(2)} kg`} />
        <StatCard icon={<ArrowUpCircle className="size-5" />} label="Pencairan Dibayarkan" value={formatRupiah(s?.totalPencairan ?? 0)} hint={`Menunggu: ${formatRupiah(s?.pencairanMenunggu ?? 0)}`} />
        <StatCard icon={<ArrowDownCircle className="size-5" />} label="Belanja Marketplace" value={formatRupiah(s?.totalBelanja ?? 0)} hint={`Saldo ${formatRupiah(s?.belanjaSaldo ?? 0)} · Tunai ${formatRupiah(s?.belanjaTunai ?? 0)}`} />
        <StatCard icon={<Wallet className="size-5" />} label="Saldo Warga Beredar" value={formatRupiah(s?.saldoBeredar ?? 0)} hint="Kewajiban bank sampah s/d akhir periode" />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Jenis</th>
                <th className="px-3 py-2 text-left">Warga</th>
                <th className="px-3 py-2 text-left">Keterangan</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {(data?.entries ?? []).map((e, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-3 py-2">{formatTanggal(e.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{e.type}</td>
                  <td className="px-3 py-2">{e.residentName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.description}</td>
                  <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{e.debit ? formatRupiah(e.debit) : "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-accent">{e.credit ? formatRupiah(e.credit) : "-"}</td>
                </tr>
              ))}
              {!isFetching && (data?.entries ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Belum ada catatan keuangan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary">{icon}</span> {label}
        </div>
        <p className="text-xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
