import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, Truck, ClipboardList, ArrowRight } from "lucide-react";
import { getDailyRecap, listPickupTasks } from "@/lib/tim.functions";
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
  const { data: account } = useMyAccount();
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

      <div className="grid grid-cols-2 gap-2.5">
        <Link to="/tim/setor">
          <Card className="border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10">
            <CardContent className="p-4">
              <Scale className="h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-semibold">Setor Sampah</p>
              <p className="text-xs text-muted-foreground">Scan QR / cari warga</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tim/pickup">
          <Card className="border-accent/30 bg-accent/5 transition-colors hover:bg-accent/10">
            <CardContent className="p-4">
              <Truck className="h-6 w-6 text-accent" />
              <p className="mt-2 text-sm font-semibold">Penjemputan</p>
              <p className="text-xs text-muted-foreground">{activeTasks.length} tugas aktif</p>
            </CardContent>
          </Card>
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
