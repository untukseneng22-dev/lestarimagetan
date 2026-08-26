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
