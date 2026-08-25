import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Home, Scale, Truck, ClipboardList } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/_authenticated/tim")({
  component: TimLayout,
});

function TimLayout() {
  return (
    <RoleGate role="tim">
      <MobileShell
        title="Tim Bank Sampah"
        subtitle="Petugas Lapangan"
        items={[
          { to: "/tim", label: "Beranda", icon: Home, exact: true },
          { to: "/tim/setor", label: "Setor", icon: Scale },
          { to: "/tim/pickup", label: "Jemput", icon: Truck },
          { to: "/tim/rekap", label: "Rekap", icon: ClipboardList },
        ]}
      >
        <Outlet />
      </MobileShell>
    </RoleGate>
  );
}
