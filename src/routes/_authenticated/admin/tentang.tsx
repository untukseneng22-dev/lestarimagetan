import { createFileRoute } from "@tanstack/react-router";
import {
  Recycle, QrCode, Wallet, Truck, Tag, MessageSquareWarning, FileBarChart, BellRing,
  GraduationCap, MapPin, Leaf,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang Aplikasi — LESTARI MAGETAN" },
      { name: "description", content: "Tentang LESTARI MAGETAN — Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan." },
    ],
  }),
  component: TentangPage,
});

const FEATURES = [
  { icon: QrCode, title: "QR Code Warga", desc: "Setiap warga memiliki kartu QR yang dapat dicetak dan dipindai petugas saat penyetoran." },
  { icon: Wallet, title: "Tabungan Sampah", desc: "Hasil penjualan sampah otomatis masuk saldo dan dapat dicairkan melalui pengajuan." },
  { icon: Truck, title: "Penjemputan Rutin", desc: "Jadwal penjemputan mingguan dengan tugas terpantau hingga selesai." },
  { icon: Tag, title: "Harga Transparan", desc: "Harga per kilogram dikelola admin dengan histori perubahan dan penguncian harga saat setor." },
  { icon: MessageSquareWarning, title: "Aduan Warga", desc: "Sampaikan keluhan berfoto dan pantau status tindak lanjutnya." },
  { icon: BellRing, title: "Notifikasi WhatsApp", desc: "Kabar akun, setoran, penjemputan, pencairan, dan aduan terkirim otomatis." },
  { icon: FileBarChart, title: "Laporan & Ekspor", desc: "Rekap transaksi, berat per kategori, dan aduan — siap diekspor ke PDF/Excel." },
  { icon: Leaf, title: "Dampak Lingkungan", desc: "Estimasi jejak lingkungan dari sampah yang berhasil didaur ulang." },
];

function TentangPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-primary px-8 py-10 text-center text-primary-foreground">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            <Recycle className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LESTARI MAGETAN</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-primary-foreground/85">
            Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan
          </p>
        </div>
        <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            LESTARI MAGETAN adalah aplikasi bank sampah digital yang memudahkan warga menyetor sampah
            terpilah, menabung dari hasil penjualannya, serta membantu petugas dan pengelola mencatat
            operasional secara rapi — dari penimbangan, penjemputan, hingga pencairan saldo.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Kabupaten Magetan, Jawa Timur</span>
            <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-primary" /> Dikembangkan oleh Tim Kreatif SMAS PGRI Maospati</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold">Fitur Utama</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-5 text-center">
          <p className="text-xs text-muted-foreground">Versi 1.0.0</p>
          <p className="mt-1 text-xs text-muted-foreground">
            © 2026 LESTARI MAGETAN — Dikembangkan oleh Tim Kreatif SMAS PGRI Maospati
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
