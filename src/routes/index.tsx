import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/common.functions";
import { roleHome } from "@/lib/use-account";
import { LoadingScreen } from "@/components/RoleGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bank Sampah Digital — Setor Sampah, Pantau Saldo" },
      {
        name: "description",
        content:
          "Aplikasi Bank Sampah Digital untuk warga, tim lapangan, dan admin: setoran sampah, tabungan saldo, harga terkini, penjemputan, dan notifikasi WhatsApp.",
      },
      { property: "og:title", content: "Bank Sampah Digital" },
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
