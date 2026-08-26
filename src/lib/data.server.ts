import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  roles: string[],
): Promise<void> {
  for (const role of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data === true) return;
  }
  throw new Error("Akses ditolak: peran tidak sesuai");
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, address, rt")
    .eq("id", userId)
    .single();
  return data;
}

/** Status pesanan marketplace yang sudah memotong saldo warga. */
export const ORDER_CHARGED_STATUSES = ["dikonfirmasi", "diproses", "selesai"];

/**
 * Saldo = total setoran - pencairan yang disetujui/dicairkan
 *       - porsi saldo pada pesanan marketplace yang sudah dikonfirmasi.
 */
export async function getBalance(
  supabase: SupabaseClient,
  residentId: string,
): Promise<number> {
  const [{ data: tx }, { data: wd }, { data: orders }] = await Promise.all([
    supabase.from("transactions").select("total_amount").eq("resident_id", residentId),
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("resident_id", residentId)
      .in("status", ["disetujui", "dicairkan"]),
    supabase
      .from("market_orders")
      .select("paid_from_balance")
      .eq("resident_id", residentId)
      .in("status", ORDER_CHARGED_STATUSES),
  ]);
  const masuk = (tx ?? []).reduce((s, t) => s + Number(t.total_amount), 0);
  const keluar = (wd ?? []).reduce((s, w) => s + Number(w.amount), 0);
  const belanja = (orders ?? []).reduce((s, o) => s + Number(o.paid_from_balance), 0);
  return masuk - keluar - belanja;
}


export type LockedPrice = {
  category_id: string;
  name: string;
  unit: string;
  price_per_kg: number;
  effective_at: string;
};

/**
 * Harga yang berlaku pada tanggal tertentu (snapshot): untuk tiap kategori
 * diambil record histori terakhir dengan effective_at <= akhir tanggal itu.
 */
export async function getPricesAtDate(
  supabase: SupabaseClient,
  dateISO?: string,
): Promise<LockedPrice[]> {
  const { data: categories } = await supabase
    .from("waste_categories")
    .select("id, name, unit")
    .eq("is_active", true);

  let query = supabase
    .from("price_history")
    .select("category_id, price_per_kg, effective_at")
    .order("effective_at", { ascending: false });

  if (dateISO) {
    query = query.lte("effective_at", `${dateISO}T23:59:59.999+07:00`);
  }

  const { data: history } = await query;

  const latest = new Map<string, { price: number; effective_at: string }>();
  for (const row of history ?? []) {
    if (!latest.has(row.category_id)) {
      latest.set(row.category_id, {
        price: Number(row.price_per_kg),
        effective_at: row.effective_at,
      });
    }
  }

  return (categories ?? []).map((c) => ({
    category_id: c.id,
    name: c.name,
    unit: c.unit,
    price_per_kg: latest.get(c.id)?.price ?? 0,
    effective_at: latest.get(c.id)?.effective_at ?? "",
  }));
}
