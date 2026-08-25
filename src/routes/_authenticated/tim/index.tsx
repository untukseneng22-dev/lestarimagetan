import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, Truck, ClipboardList, ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { getDailyRecap, listPickupTasks } from "@/lib/tim.functions";
import { getAppSettings } from "@/lib/common.functions";
import { useMyAccount } from "@/lib/use-account";
import { formatNumber, formatRupiah, todayISO } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tim/")({
  head: () => ({ meta: [{ title: "Beranda Tim — Bank Sampah Digital" }] }),
  component: TimDashboard,
});

function TimDashboard() {
  const recapFn = useServerFn(getDailyRecap);
  const tasksFn = useServerFn(listPickupTasks);
  const settingsFn = useServerFn(getAppSettings);
  const { data: account } = useMyAccount();
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });
  const { data: recap } = useQuery({
    queryKey: ["recap", todayISO()],
    queryFn: () => recapFn({ data: { date: todayISO() } }),
  });
  const { data: tasks } = useQuery({ queryKey: ["pickup-tasks"], queryFn: () => tasksFn() });

  const activeTasks = (tasks ?? []).filter((t) =>
    ["menunggu", "dijadwalkan", "dalam_perjalanan"].includes(t.status),
  );

  if (!recap || !account) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Halo, {account.fullName.split(" ")[0]}!</h2>
        <p className="text-sm text-muted-foreground">Siap melayani warga hari ini.</p>
      </div>

      {settings && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CalendarClock className="h-3.5 w-3.5" /> Jadwal rutin
          </p>
          <p className="mt-1 text-sm font-medium">{settings.pickupSchedule}</p>
          {settings.dropoffInfo && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {settings.dropoffInfo}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/tim/setor">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Scale className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Setor Sampah</p>
            <p className="text-xs text-muted-foreground">Scan QR / cari warga</p>
          </div>
        </Link>
        <Link to="/tim/pickup">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground shadow-glow">
              <Truck className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Penjemputan</p>
            <p className="text-xs text-muted-foreground">{activeTasks.length} tugas aktif</p>
          </div>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" /> Rekap Hari Ini
            </h3>
            <Link to="/tim/rekap" className="flex items-center gap-1 text-xs font-medium text-primary">
              Detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/60 p-2.5">
              <p className="text-lg font-bold text-foreground">{recap.totalTransactions}</p>
              <p className="text-[10px] text-muted-foreground">Transaksi</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-2.5">
              <p className="text-lg font-bold text-foreground">{formatNumber(recap.totalWeight)}</p>
              <p className="text-[10px] text-muted-foreground">Kg Sampah</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-2.5">
              <p className="text-lg font-bold text-accent">{formatRupiah(recap.totalAmount)}</p>
              <p className="text-[10px] text-muted-foreground">Nilai Setoran</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Tugas Penjemputan Terdekat</h3>
        <div className="space-y-2">
          {activeTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada tugas aktif.</p>
          )}
          {activeTasks.slice(0, 3).map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3.5">
                <p className="text-sm font-medium">{t.resident_name}</p>
                <p className="text-xs text-muted-foreground">{t.address} · {t.scheduled_date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
