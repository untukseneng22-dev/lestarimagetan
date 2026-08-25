import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Home, Scale, Truck, ClipboardList, User } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/_authenticated/tim")({
  component: TimLayout,
});

function TimLayout() {
  return (
    <RoleGate role="tim">
      <MobileShell
        title="LESTARI MAGETAN"
        subtitle="Tim Bank Sampah"
        items={[
          { to: "/tim", label: "Beranda", icon: Home, exact: true },
          { to: "/tim/setor", label: "Setor", icon: Scale },
          { to: "/tim/pickup", label: "Jemput", icon: Truck },
          { to: "/tim/rekap", label: "Rekap", icon: ClipboardList },
          { to: "/tim/profil", label: "Profil", icon: User },
        ]}
      >
        <Outlet />
      </MobileShell>
    </RoleGate>
  );
}
