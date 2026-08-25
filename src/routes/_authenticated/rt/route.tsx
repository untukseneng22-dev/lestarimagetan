import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { ClipboardList, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/rt")({
  component: RtLayout,
});

function RtLayout() {
  const navigate = useNavigate();
  return (
    <RoleGate role="rt">
      <MobileShell
        title="Bank Sampah"
        subtitle="Ketua RT"
        items={[{ to: "/rt", label: "Pengajuan", icon: ClipboardList, exact: true }]}
        headerRight={
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            aria-label="Keluar"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        }
      >
        <Outlet />
      </MobileShell>
    </RoleGate>
  );
}
