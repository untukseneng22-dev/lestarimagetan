import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "react-qr-code";
import { Megaphone, Truck, Wallet, ChevronRight, CalendarClock, MapPin, Trophy, Tag, ShoppingBasket, QrCode, MessageSquareWarning } from "lucide-react";
import { getWargaDashboard } from "@/lib/warga.functions";
import { getAppSettings, getLeaderboard, getCategoriesWithPrices } from "@/lib/common.functions";
import { useMyAccount } from "@/lib/use-account";
import { formatNumber, formatRupiah, formatTanggalPanjang, formatTanggal, formatTanggalWaktu } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/warga/")({
  head: () => ({ meta: [{ title: "Beranda Warga — LESTARI MAGETAN" }] }),
  component: WargaDashboard,
});

function WargaDashboard() {
  const dashboardFn = useServerFn(getWargaDashboard);
  const settingsFn = useServerFn(getAppSettings);
  const leaderboardFn = useServerFn(getLeaderboard);
  const pricesFn = useServerFn(getCategoriesWithPrices);
  const { data } = useQuery({ queryKey: ["warga-dashboard"], queryFn: () => dashboardFn() });
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });
  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: () => leaderboardFn() });
  const { data: prices } = useQuery({ queryKey: ["prices"], queryFn: () => pricesFn() });
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Halo, {data.fullName.split(" ")[0]}!</h2>
        <p className="text-[12px] text-muted-foreground">{formatTanggalPanjang(new Date())}</p>
      </div>

      {/* Kartu saldo utama ala m-banking */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-accent/25" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary-foreground/80">
              <Wallet className="h-3.5 w-3.5" /> Saldo Tabungan
            </p>
            <p className="mt-1.5 text-[28px] font-extrabold leading-none tracking-tight">
              {formatRupiah(data.balance)}
            </p>
            <Link
              to="/warga/tabungan"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              Mutasi tabungan <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-card">
            <QRCode value={account.id} size={80} />
            <p className="mt-1 text-center text-[10px] font-semibold text-foreground">QR Setoran</p>
          </div>
        </div>
      </div>

      {/* Menu pintas ikon ala aplikasi perbankan */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: "/warga/tabungan", label: "Tabungan", icon: Wallet },
            { to: "/warga/marketplace", label: "Belanja", icon: ShoppingBasket },
            { to: "/kartu", label: "Kartu QR", icon: QrCode },
            { to: "/warga/aduan", label: "Aduan", icon: MessageSquareWarning },
          ].map((m) => (
            <Link key={m.to} to={m.to} className="flex flex-col items-center gap-1.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors hover:bg-primary/15">
                <m.icon className="h-[22px] w-[22px]" />
              </span>
              <span className="text-center text-[11px] font-medium leading-tight">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Tag className="h-4 w-4 text-primary" /> Harga Sampah Hari Ini
        </h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Sampah</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="w-14 text-right">Satuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(prices?.categories ?? []).map((c) => (
                  <TableRow key={c.category_id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatRupiah(c.price_per_kg)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">/{c.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {prices?.lastUpdatedAt && (
          <p className="mt-1.5 text-[11px] italic text-muted-foreground">
            Harga terakhir diperbarui oleh Admin pada {formatTanggalWaktu(prices.lastUpdatedAt)}.
          </p>
        )}
      </section>


      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Truck className="h-4 w-4 text-primary" /> Jadwal Penjemputan
        </h3>
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CalendarClock className="h-3.5 w-3.5" /> Jadwal rutin
              </p>
              <p className="mt-1 text-sm font-medium">
                {settings?.pickupSchedule ?? "Memuat jadwal…"}
              </p>
              {settings?.dropoffInfo && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {settings.dropoffInfo}
                </p>
              )}
            </div>
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

      {leaderboard && leaderboard.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
            <Trophy className="h-4 w-4 text-accent" /> Warga Teladan Bulan Ini
          </h3>
          <Card>
            <CardContent className="space-y-2.5 p-4">
              {leaderboard.map((r, i) => (
                <div key={r.resident_id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-accent text-accent-foreground shadow-glow"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{r.full_name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(Number(r.total_weight))} kg
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Megaphone className="h-4 w-4 text-accent" /> Pengumuman
        </h3>
        <div className="space-y-2">
          {data.announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatTanggal(a.published_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
