import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/common.functions";
import { roleHome } from "@/lib/use-account";
import { LoadingScreen } from "@/components/RoleGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LESTARI MAGETAN — Layanan Elektronik Sampah & Tabungan" },
      {
        name: "description",
        content:
          "LESTARI MAGETAN — Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan untuk warga, tim lapangan, dan admin.",
      },
      { property: "og:title", content: "LESTARI MAGETAN" },
      {
        property: "og:description",
        content: "Kelola bank sampah lingkungan Anda secara digital.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        const account = await getMyAccount();
        if (!cancelled) navigate({ to: roleHome(account.role) });
      } catch {
        if (!cancelled) navigate({ to: "/auth" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <LoadingScreen label="Menyiapkan aplikasi..." />;
}
