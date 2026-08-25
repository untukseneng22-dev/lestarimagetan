import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBalance } from "./data.server";
import { buildMessage, sendWhatsappNotification, rupiah } from "./whatsapp.server";

export const getWargaDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [balance, { data: announcements }, { data: pickups }, { data: profile }] =
      await Promise.all([
        getBalance(supabase, userId),
        supabase
          .from("announcements")
          .select("id, title, body, published_at")
          .order("published_at", { ascending: false })
          .limit(5),
        supabase
          .from("pickup_tasks")
          .select("id, scheduled_date, status, address, notes")
          .eq("resident_id", userId)
          .in("status", ["menunggu", "dijadwalkan", "dalam_perjalanan"])
          .order("scheduled_date", { ascending: true }),
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
      ]);
    return {
      balance,
      announcements: announcements ?? [],
      pickups: pickups ?? [],
      fullName: profile?.full_name ?? "Warga",
    };
  });

export const getMySavings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [balance, { data: transactions }, { data: withdrawals }] = await Promise.all([
      getBalance(supabase, userId),
      supabase
        .from("transactions")
        .select("id, deposit_date, total_weight, total_amount, transaction_items(category_name, weight_kg, price_per_kg, subtotal)")
        .eq("resident_id", userId)
        .order("deposit_date", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("id, amount, status, note, processed_at, created_at")
        .eq("resident_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      balance,
      transactions: transactions ?? [],
      withdrawals: withdrawals ?? [],
    };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ amount: z.number().positive("Nominal harus lebih dari 0").max(100_000_000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const balance = await getBalance(supabase, userId);
    if (data.amount > balance) {
      throw new Error(`Saldo tidak mencukupi. Saldo Anda saat ini ${rupiah(balance)}.`);
    }
    const { error } = await supabase
      .from("withdrawals")
      .insert({ resident_id: userId, amount: data.amount });
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .single();
    await sendWhatsappNotification(supabase, {
      phone: profile?.phone ?? "-",
      name: profile?.full_name,
      event: "pengajuan_pencairan",
      message: buildMessage("pengajuan_pencairan", { jumlah: rupiah(data.amount) }),
    });
    return { ok: true };
  });

export const getMyComplaints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("complaints")
      .select("id, title, description, photo_url, status, response, created_at, updated_at")
      .eq("resident_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(5, "Judul minimal 5 karakter").max(120),
        description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(1000),
        photoUrl: z.string().url().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("complaints").insert({
      resident_id: context.userId,
      title: data.title,
      description: data.description,
      photo_url: data.photoUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        address: z.string().trim().min(5).max(255),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pickup_tasks").insert({
      resident_id: context.userId,
      address: data.address,
      scheduled_date: data.scheduledDate,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        phone: z.string().trim().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid"),
        address: z.string().trim().min(5).max(255),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ phone: data.phone, address: data.address })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
