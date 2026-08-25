import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "react-qr-code";
import { Megaphone, Truck, Wallet, ChevronRight } from "lucide-react";
import { getWargaDashboard } from "@/lib/warga.functions";
import { useMyAccount } from "@/lib/use-account";
import { formatRupiah, formatTanggalPanjang, formatTanggal } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/warga/")({
  head: () => ({ meta: [{ title: "Beranda Warga — Bank Sampah Digital" }] }),
  component: WargaDashboard,
});

function WargaDashboard() {
  const dashboardFn = useServerFn(getWargaDashboard);
  const { data } = useQuery({ queryKey: ["warga-dashboard"], queryFn: () => dashboardFn() });
  const { data: account } = useMyAccount();

  if (!data || !account) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Halo, {data.fullName.split(" ")[0]}!</h2>
        <p className="text-sm text-muted-foreground">{formatTanggalPanjang(new Date())}</p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                <Wallet className="h-3.5 w-3.5" /> Saldo Tabungan
              </p>
              <p className="mt-1 text-3xl font-bold">{formatRupiah(data.balance)}</p>
              <Link to="/warga/tabungan" className="mt-2 inline-flex items-center text-xs font-medium underline-offset-2 hover:underline">
                Lihat tabungan <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <QRCode value={account.id} size={96} />
              <p className="mt-1 text-center text-[10px] font-medium text-foreground">QR Setoran</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Truck className="h-4 w-4 text-primary" /> Jadwal Penjemputan
        </h3>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs text-muted-foreground">
              Jadwal rutin: <span className="font-medium text-foreground">Selasa & Jumat, 08.00–12.00</span>
            </p>
            {data.pickups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada permintaan penjemputan aktif.</p>
            ) : (
              data.pickups.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatTanggal(p.scheduled_date)}</p>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Megaphone className="h-4 w-4 text-accent" /> Pengumuman
        </h3>
        <div className="space-y-2">
          {data.announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{formatTanggal(a.published_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
