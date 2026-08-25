import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPricesAtDate } from "./data.server";

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, address, rt").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      id: userId,
      email: (context.claims?.email as string | undefined) ?? null,
      fullName: profile?.full_name ?? "Pengguna",
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      rt: profile?.rt ?? null,
      role: (roles?.[0]?.role as string | undefined) ?? null,
    };
  });

export const getCategoriesWithPrices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getPricesAtDate(context.supabase);
  });

export const getAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("announcements")
      .select("id, title, body, published_at")
      .order("published_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
