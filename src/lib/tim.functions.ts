import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBalance, getPricesAtDate, requireRole } from "./data.server";
import { buildMessage, rupiah, sendWhatsappNotification } from "./whatsapp.server";

export const searchResidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ query: z.string().trim().max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["tim", "admin"]);

    const { data: wargaRoles } = await supabase.from("user_roles").select("user_id").eq("role", "warga");
    const wargaIds = (wargaRoles ?? []).map((r) => r.user_id);
    if (wargaIds.length === 0) return [];

    let query = supabase
      .from("profiles")
      .select("id, full_name, phone, address, rt")
      .in("id", wargaIds)
      .order("full_name")
      .limit(20);

    const q = data.query.trim();
    if (q) {
      query = supabase
        .from("profiles")
        .select("id, full_name, phone, address, rt")
        .in("id", wargaIds)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,id.eq.${q}`)
        .limit(20);
    }

    const { data: profiles } = await query;
    return profiles ?? [];
  });

export const createDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        residentId: z.string().uuid(),
        depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        items: z
          .array(
            z.object({
              categoryId: z.string().uuid(),
              weight: z.number().positive("Berat harus lebih dari 0").max(100_000),
            }),
          )
          .min(1, "Minimal satu jenis sampah"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["tim", "admin"]);

    const depositDate = data.depositDate ?? new Date().toISOString().slice(0, 10);

    // Kunci snapshot harga yang berlaku pada tanggal setoran
    const prices = await getPricesAtDate(supabase, depositDate);
    const priceMap = new Map(prices.map((p) => [p.category_id, p]));

    const items = data.items.map((item) => {
      const p = priceMap.get(item.categoryId);
      if (!p) throw new Error("Kategori sampah tidak ditemukan");
      const subtotal = Math.round(item.weight * p.price_per_kg);
      return {
        category_id: item.categoryId,
        category_name: p.name,
        weight_kg: item.weight,
        price_per_kg: p.price_per_kg,
        subtotal,
      };
    });

    const totalWeight = items.reduce((s, i) => s + i.weight_kg, 0);
    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        resident_id: data.residentId,
        recorded_by: userId,
        deposit_date: depositDate,
        total_weight: totalWeight,
        total_amount: totalAmount,
      })
      .select("id")
      .single();
    if (txError) throw new Error(txError.message);

    const { error: itemError } = await supabase
      .from("transaction_items")
      .insert(items.map((i) => ({ ...i, transaction_id: tx.id })));
    if (itemError) throw new Error(itemError.message);

    // Notifikasi WhatsApp ke warga
    const { data: resident } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.residentId)
      .single();
    const newBalance = await getBalance(supabase, data.residentId);
    const rincian = items
      .map((i) => `${i.category_name} ${i.weight_kg} kg x ${rupiah(i.price_per_kg)}`)
      .join(", ");
    await sendWhatsappNotification(supabase, {
      phone: resident?.phone ?? "-",
      name: resident?.full_name,
      event: "transaksi_setoran",
      message: buildMessage("transaksi_setoran", {
        tanggal: depositDate,
        rincian,
        total: rupiah(totalAmount),
        saldo: rupiah(newBalance),
      }),
    });

    return { ok: true, transactionId: tx.id as string, totalAmount, totalWeight, newBalance };
  });

export const listPickupTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["tim", "admin"]);
    const { data } = await supabase
      .from("pickup_tasks")
      .select("id, resident_id, address, scheduled_date, status, notes, assigned_to, created_at")
      .order("scheduled_date", { ascending: true });
    const rows = data ?? [];
    const ids = [...new Set(rows.flatMap((r) => [r.resident_id, r.assigned_to]).filter(Boolean))] as string[];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      resident_name: r.resident_id ? (nameMap.get(r.resident_id)?.full_name ?? "-") : "-",
      resident_phone: r.resident_id ? (nameMap.get(r.resident_id)?.phone ?? null) : null,
      assignee_name: r.assigned_to ? (nameMap.get(r.assigned_to)?.full_name ?? "-") : null,
    }));
  });

export const updatePickupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        taskId: z.string().uuid(),
        status: z.enum(["menunggu", "dijadwalkan", "dalam_perjalanan", "selesai", "dibatalkan"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["tim", "admin"]);

    const { data: task } = await supabase
      .from("pickup_tasks")
      .select("resident_id, scheduled_date, assigned_to")
      .eq("id", data.taskId)
      .single();

    const { error } = await supabase
      .from("pickup_tasks")
      .update({ status: data.status, assigned_to: task?.assigned_to ?? userId, updated_at: new Date().toISOString() })
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);

    if (task?.resident_id) {
      const [{ data: resident }, { data: petugas }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", task.resident_id).single(),
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
      ]);
      const statusLabels: Record<string, string> = {
        menunggu: "Menunggu",
        dijadwalkan: "Dijadwalkan",
        dalam_perjalanan: "Dalam Perjalanan",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan",
      };
      await sendWhatsappNotification(supabase, {
        phone: resident?.phone ?? "-",
        name: resident?.full_name,
        event: "status_penjemputan",
        message: buildMessage("status_penjemputan", {
          tanggal: task.scheduled_date,
          status: statusLabels[data.status],
          petugas: petugas?.full_name ?? "",
        }),
      });
    }
    return { ok: true };
  });

export const getDailyRecap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["tim", "admin"]);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, resident_id, recorded_by, total_weight, total_amount, created_at, transaction_items(category_name, weight_kg, price_per_kg, subtotal)")
      .eq("deposit_date", data.date)
      .order("created_at", { ascending: false });

    const rows = transactions ?? [];
    const ids = [...new Set(rows.flatMap((r) => [r.resident_id, r.recorded_by]).filter(Boolean))] as string[];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const perCategory = new Map<string, { weight: number; amount: number }>();
    for (const t of rows) {
      for (const item of (t as { transaction_items?: { category_name: string; weight_kg: number; subtotal: number }[] }).transaction_items ?? []) {
        const cur = perCategory.get(item.category_name) ?? { weight: 0, amount: 0 };
        cur.weight += Number(item.weight_kg);
        cur.amount += Number(item.subtotal);
        perCategory.set(item.category_name, cur);
      }
    }

    return {
      date: data.date,
      totalTransactions: rows.length,
      totalWeight: rows.reduce((s, r) => s + Number(r.total_weight), 0),
      totalAmount: rows.reduce((s, r) => s + Number(r.total_amount), 0),
      perCategory: [...perCategory.entries()].map(([name, v]) => ({ name, ...v })),
      transactions: rows.map((r) => ({
        id: r.id,
        residentName: nameMap.get(r.resident_id) ?? "-",
        recordedBy: nameMap.get(r.recorded_by) ?? "-",
        totalWeight: Number(r.total_weight),
        totalAmount: Number(r.total_amount),
        createdAt: r.created_at,
        items: (r as { transaction_items?: unknown[] }).transaction_items ?? [],
      })),
    };
  });
