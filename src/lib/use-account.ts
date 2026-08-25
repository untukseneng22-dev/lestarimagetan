import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "./common.functions";

export function roleHome(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "tim":
      return "/tim";
    default:
      return "/warga";
  }
}

export function useMyAccount() {
  const fn = useServerFn(getMyAccount);
  return useQuery({
    queryKey: ["my-account"],
    queryFn: async () => {
      // Cek sesi dulu: tanpa sesi, server fn akan menolak (401) dan
      // melempar error hingga memicu error boundary (layar kosong).
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      return fn();
    },
    staleTime: 60_000,
    retry: false,
  });
}
