import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireRole } from "./data.server";

const requestSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(100),
  address: z.string().trim().min(5, "Alamat minimal 5 karakter").max(255),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid (contoh: 08123456789)"),
});

export const submitRegistrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => requestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["rt", "admin"]);
    const { data: profile } = await supabase
      .from("profiles")
      .select("rt")
      .eq("id", userId)
      .single();
    const { error } = await supabase.from("registration_requests").insert({
      rt_user_id: userId,
      full_name: data.fullName,
      address: data.address,
      whatsapp_number: data.whatsappNumber,
      rt: profile?.rt ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyRegistrationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("registration_requests")
      .select("id, full_name, address, whatsapp_number, status, reason, decided_at, created_at, account_created")
      .eq("rt_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
