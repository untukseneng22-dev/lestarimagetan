import type { SupabaseClient } from "@supabase/supabase-js";

export { getBalance, ORDER_ACTIVE_STATUSES, ORDER_CHARGED_STATUSES, ORDER_FLOW } from "./data.server";

async function readSetting(supabase: SupabaseClient, key: string, fallback: number) {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  const raw = data?.value;
  const n = Number(typeof raw === "string" ? raw : String(raw ?? fallback));
  return Number.isFinite(n) ? n : fallback;
}

/** Tarif ongkir flat (rupiah) yang diatur Admin di app_settings. */
export async function getShippingFee(supabase: SupabaseClient): Promise<number> {
  return readSetting(supabase, "market_shipping_fee", 0);
}

/** Batas pembelian per warga agar stok tidak diborong satu orang. */
export async function getMarketLimits(supabase: SupabaseClient): Promise<{
  maxQtyPerProduct: number;
  maxActiveOrders: number;
}> {
  const [maxQtyPerProduct, maxActiveOrders] = await Promise.all([
    readSetting(supabase, "market_max_qty_per_product", 5),
    readSetting(supabase, "market_max_active_orders", 3),
  ]);
  return { maxQtyPerProduct, maxActiveOrders };
}

type ProductRow = { photo_url?: string | null } & Record<string, unknown>;

/** Bucket produk bersifat privat — buat signed URL untuk ditampilkan. */
export async function signProductPhotos<T extends ProductRow>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { photo_signed_url: string | null })[]> {
  return Promise.all(
    rows.map(async (r) => {
      if (!r.photo_url) return { ...r, photo_signed_url: null };
      const { data } = await supabase.storage
        .from("produk")
        .createSignedUrl(r.photo_url, 60 * 60 * 24);
      return { ...r, photo_signed_url: data?.signedUrl ?? null };
    }),
  );
}

/**
 * Penghitungan otomatis saat pesanan dibatalkan, mengikuti posisi status di
 * timeline: sebelum barang berangkat ongkir dibatalkan penuh; setelah status
 * "dikirim" ongkir tetap ditagih karena petugas sudah jalan.
 */
export function computeCancellation(order: {
  status: string;
  method: string;
  shipping_fee: number | string;
  paid_from_balance: number | string;
}): { shippingRetained: number; refundedBalance: number; reason: string } {
  const paid = Number(order.paid_from_balance) || 0;
  const fee = Number(order.shipping_fee) || 0;
  const shipped = order.status === "dikirim" && order.method === "antar";
  const shippingRetained = shipped ? Math.min(fee, paid) : 0;
  return {
    shippingRetained,
    refundedBalance: Math.max(0, paid - shippingRetained),
    reason: shipped
      ? "Ongkir tetap ditagih karena petugas sudah berangkat mengantar."
      : "Ongkir dibatalkan penuh karena barang belum dikirim.",
  };
}

/** Kembalikan stok produk yang sempat dikunci pesanan. */
export async function restoreStock(
  supabase: SupabaseClient,
  items: { product_id: string | null; qty: number }[],
): Promise<void> {
  for (const it of items) {
    if (!it.product_id) continue;
    const { data: p } = await supabase
      .from("market_products")
      .select("stock")
      .eq("id", it.product_id)
      .single();
    if (!p) continue;
    await supabase
      .from("market_products")
      .update({ stock: Number(p.stock) + it.qty })
      .eq("id", it.product_id);
  }
}

export const ADMIN_ORDER_SELECT =
  "id, resident_id, method, address, shipping_fee, items_total, total_amount, paid_from_balance, cash_due, status, admin_note, proof_url, received_at, locked, created_at, market_order_items(product_name, unit, price, qty, subtotal), market_order_events(status, note, created_at)";


export const ORDER_STATUS_TEXT: Record<string, string> = {
  menunggu: "Menunggu",
  dibayar: "Dibayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  diterima: "Diterima",
  dibatalkan: "Dibatalkan",
};

export async function withResidentInfo<T extends { resident_id: string }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { resident_name: string; resident_phone: string | null })[]> {
  const ids = [...new Set(rows.map((o) => o.resident_id))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
    : { data: [] as { id: string; full_name: string; phone: string | null }[] };
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((o) => ({
    ...o,
    resident_name: map.get(o.resident_id)?.full_name ?? "-",
    resident_phone: map.get(o.resident_id)?.phone ?? null,
  }));
}

