import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, Truck, Scale, Wallet, Landmark,
  MessageSquareWarning, ArrowLeftRight, UserRoundCheck, Trophy,
} from "lucide-react";
import { getAdminStats } from "@/lib/admin.functions";
import { getLeaderboard } from "@/lib/common.functions";
import { formatNumber, formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard Admin — LESTARI MAGETAN" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsFn = useServerFn(getAdminStats);
  const leaderboardFn = useServerFn(getLeaderboard);
  const { data: s, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });
  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: () => leaderboardFn() });

  if (isLoading || !s) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Warga Aktif", value: formatNumber(s.totalWarga), icon: Users, tone: "text-primary" },
    { label: "Petugas Tim", value: formatNumber(s.totalTim), icon: UserRoundCheck, tone: "text-primary" },
    { label: "Setoran Bulan Ini", value: formatNumber(s.setoranBulanIni), icon: ArrowLeftRight, tone: "text-primary" },
    { label: "Berat Bulan Ini", value: `${formatNumber(s.beratBulanIni)} kg`, icon: Scale, tone: "text-accent" },
    { label: "Nilai Setoran Bulan Ini", value: formatRupiah(s.nilaiBulanIni), icon: Wallet, tone: "text-accent" },
    { label: "Total Saldo Warga", value: formatRupiah(s.totalSaldoWarga), icon: Landmark, tone: "text-accent" },
    { label: "Penjemputan Aktif", value: formatNumber(s.activePickups), icon: Truck, tone: "text-primary" },
  ];

  const alerts = [
    { count: s.pendingWithdrawals, label: "pengajuan pencairan saldo menunggu diproses", to: "/admin/kas", icon: Landmark },
    { count: s.openComplaints, label: "aduan warga belum selesai", to: "/admin/aduan", icon: MessageSquareWarning },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional LESTARI MAGETAN.</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.to} to={a.to}>
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>
                    <b>{a.count}</b> {a.label}.
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <Card key={st.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{st.label}</CardTitle>
                <Icon className={`h-4 w-4 ${st.tone}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{st.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Trophy className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Warga Teladan Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((r, i) => (
              <div key={r.resident_id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  {r.full_name}
                </span>
                <span className="font-medium">
                  {formatNumber(Number(r.total_weight))} kg · {formatRupiah(Number(r.total_amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
