import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import {
  LayoutDashboard, Users, Tag, ArrowLeftRight, Truck, ScrollText,
  MessageSquareWarning, Megaphone, Landmark, FileBarChart, BellRing, CalendarClock,
  ChevronDown, Database, ClipboardList, HeartHandshake, Settings2, Info, ShoppingBasket, PackageSearch,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { LandscapeGate } from "@/components/LandscapeGate";
import { RoleGate } from "@/components/RoleGate";
import { useMyAccount } from "@/lib/use-account";
import { LogoutButton } from "@/components/LogoutButton";
import { AppVersion } from "@/components/AppVersion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type MenuItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean };
type MenuGroup = { label: string; icon: ComponentType<{ className?: string }>; items: MenuItem[] };

const DASHBOARD: MenuItem = { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true };

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Data Master",
    icon: Database,
    items: [
      { to: "/admin/pengguna", label: "Pengguna", icon: Users },
      { to: "/admin/harga", label: "Harga Sampah", icon: Tag },
    ],
  },
  {
    label: "Operasional",
    icon: ClipboardList,
    items: [
      { to: "/admin/transaksi", label: "Transaksi", icon: ArrowLeftRight },
      { to: "/admin/pickup", label: "Penjemputan", icon: Truck },
      { to: "/admin/jadwal", label: "Jadwal Layanan", icon: CalendarClock },
    ],
  },
  {
    label: "Marketplace",
    icon: ShoppingBasket,
    items: [
      { to: "/admin/produk", label: "Produk Sembako", icon: ShoppingBasket },
      { to: "/admin/pesanan", label: "Pesanan Warga", icon: PackageSearch },
    ],
  },
  {
    label: "Layanan Warga",
    icon: HeartHandshake,
    items: [
      { to: "/admin/aduan", label: "Aduan", icon: MessageSquareWarning },
      { to: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
      { to: "/admin/kas", label: "Kas & Pencairan", icon: Landmark },
    ],
  },
  {
    label: "Sistem",
    icon: Settings2,
    items: [
      { to: "/admin/laporan", label: "Laporan", icon: FileBarChart },
      { to: "/admin/notifikasi", label: "Notifikasi WA", icon: BellRing },
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
      { to: "/admin/tentang", label: "Tentang Aplikasi", icon: Info },
    ],
  },
];

function isActivePath(pathname: string, item: MenuItem) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

function MenuLink({ item, active }: { item: MenuItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MenuGroupDropdown({ group, pathname }: { group: MenuGroup; pathname: string }) {
  const containsActive = group.items.some((item) => isActivePath(pathname, item));
  const [open, setOpen] = useState(containsActive);
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          containsActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <GroupIcon className="h-4 w-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-sidebar-border/70 pl-3 ml-5">
          {group.items.map((item) => (
            <MenuLink key={item.to} item={item} active={isActivePath(pathname, item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: account } = useMyAccount();

  return (
    <RoleGate role="admin">
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
            <BrandLogo className="h-10 w-10" />
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">LESTARI MAGETAN</p>
              <p className="text-xs text-muted-foreground">Panel Admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            <MenuLink item={DASHBOARD} active={isActivePath(pathname, DASHBOARD)} />
            {MENU_GROUPS.map((group) => (
              <MenuGroupDropdown key={group.label} group={group} pathname={pathname} />
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{account?.fullName}</p>
            <LogoutButton />
            <div className="mt-3">
              <AppVersion />
            </div>
          </div>
        </aside>
        <main className="ml-64 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </RoleGate>
  );
}
