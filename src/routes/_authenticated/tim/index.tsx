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
  head: () => ({ meta: [{ title: "Beranda Tim — LESTARI MAGETAN" }] }),
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Halo, {account.fullName.split(" ")[0]}!</h2>
        <p className="text-[12px] text-muted-foreground">Siap melayani warga hari ini.</p>
      </div>

      {/* Ringkasan hari ini bergaya kartu utama m-banking */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary-foreground/80">
              Nilai Setoran Hari Ini
            </p>
            <p className="mt-1.5 text-[28px] font-extrabold leading-none tracking-tight">
              {formatRupiah(recap.totalAmount)}
            </p>
          </div>
          <Link
            to="/tim/rekap"
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition-colors hover:bg-white/25"
          >
            Rekap <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/12 p-2.5 backdrop-blur">
            <p className="text-lg font-bold leading-none">{recap.totalTransactions}</p>
            <p className="mt-1 text-[11px] text-primary-foreground/80">Transaksi</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-2.5 backdrop-blur">
            <p className="text-lg font-bold leading-none">{formatNumber(recap.totalWeight)} kg</p>
            <p className="mt-1 text-[11px] text-primary-foreground/80">Sampah</p>
          </div>
        </div>
      </div>

      {/* Menu pintas ikon */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: "/tim/setor", label: "Setor", icon: Scale },
            { to: "/tim/pickup", label: "Jemput", icon: Truck },
            { to: "/tim/rekap", label: "Rekap", icon: ClipboardList },
            { to: "/tim/profil", label: "Profil", icon: CalendarClock },
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

      {settings && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <CalendarClock className="h-3.5 w-3.5" /> Jadwal rutin
          </p>
          <p className="mt-1 text-[13px] font-medium">{settings.pickupSchedule}</p>
          {settings.dropoffInfo && (
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {settings.dropoffInfo}
            </p>
          )}
        </div>
      )}

      <section>
        <h3 className="mb-2 text-[13px] font-semibold">
          Tugas Penjemputan Terdekat ({activeTasks.length})
        </h3>

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
