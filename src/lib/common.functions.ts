import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getPricesAtDate } from "./data.server";

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, address, rt, avatar_url").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    // avatar_url menyimpan path bucket privat; buat signed URL untuk ditampilkan.
    let avatarUrl: string | null = null;
    if (profile?.avatar_url) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 60 * 60 * 24 * 7);
      avatarUrl = signed?.signedUrl ?? null;
    }
    return {
      id: userId,
      email: (context.claims?.email as string | undefined) ?? null,
      fullName: profile?.full_name ?? "Pengguna",
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      avatarUrl,
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

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Warga/petugas hanya boleh mengganti foto profil; data diri diubah Admin.
  .inputValidator((data) =>
    z
      .object({
        avatarUrl: z.string().trim().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: data.avatarUrl })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
