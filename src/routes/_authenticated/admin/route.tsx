import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Tag, ArrowLeftRight, Truck,
  MessageSquareWarning, Megaphone, Landmark, FileBarChart, BellRing, Recycle, CalendarClock,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useMyAccount } from "@/lib/use-account";
import { LogoutButton } from "@/components/LogoutButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pengguna", label: "Pengguna", icon: Users },
  { to: "/admin/harga", label: "Harga Sampah", icon: Tag },
  { to: "/admin/transaksi", label: "Transaksi", icon: ArrowLeftRight },
  { to: "/admin/pickup", label: "Penjemputan", icon: Truck },
  { to: "/admin/jadwal", label: "Jadwal Layanan", icon: CalendarClock },
  { to: "/admin/aduan", label: "Aduan", icon: MessageSquareWarning },
  { to: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
  { to: "/admin/kas", label: "Kas & Pencairan", icon: Landmark },
  { to: "/admin/laporan", label: "Laporan", icon: FileBarChart },
  { to: "/admin/notifikasi", label: "Notifikasi WA", icon: BellRing },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: account } = useMyAccount();

  return (
    <RoleGate role="admin">
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
              <Recycle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">LESTARI MAGETAN</p>
              <p className="text-xs text-muted-foreground">Panel Admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
            {MENU.map((m) => {
              const active = m.exact ? pathname === m.to : pathname.startsWith(m.to);
              const Icon = m.icon;
              return (
                <Link
                  key={m.to}
                  to={m.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{account?.fullName}</p>
            <LogoutButton />
          </div>
        </aside>
        <main className="ml-64 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </RoleGate>
  );
}
