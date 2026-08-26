import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Home, Wallet, ShoppingBasket, MessageSquareWarning, User } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/_authenticated/warga")({
  component: WargaLayout,
});

function WargaLayout() {
  return (
    <RoleGate role="warga">
      <MobileShell
        title="LESTARI MAGETAN"
        subtitle="Warga"
        items={[
          { to: "/warga", label: "Beranda", icon: Home, exact: true },
          { to: "/warga/tabungan", label: "Tabungan", icon: Wallet },
          { to: "/warga/marketplace", label: "Marketplace", icon: ShoppingBasket },
          { to: "/warga/aduan", label: "Aduan", icon: MessageSquareWarning },
          { to: "/warga/profil", label: "Profil", icon: User },
        ]}

      >
        <Outlet />
      </MobileShell>
    </RoleGate>
  );
}
